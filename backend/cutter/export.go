// Package cutter performs the lossless cut of segments with ffmpeg.
//
// Output file names are computed by the frontend (name templates live there),
// so this package only validates and writes them.
package cutter

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"video-ed-26/backend/ffbin"
	"video-ed-26/backend/ffrun"
)

const (
	ModeSeparate         = "separate"
	ModeMerge            = "merge"
	ModeMergeAndSeparate = "merge+separate"
)

type Segment struct {
	Start      float64 `json:"start"`
	End        float64 `json:"end"`
	Name       string  `json:"name"`
	OutputName string  `json:"outputName"`
}

type TrackMeta struct {
	Index    int    `json:"index"` // input stream index
	Title    string `json:"title"`
	Language string `json:"language"`
}

type Request struct {
	InputPath          string      `json:"inputPath"`
	OutputDir          string      `json:"outputDir"` // empty means the input folder
	Segments           []Segment   `json:"segments"`
	Mode               string      `json:"mode"`
	MergedOutputName   string      `json:"mergedOutputName"`
	StreamIndexes      []int       `json:"streamIndexes"` // empty means all streams
	KeyframeCut        bool        `json:"keyframeCut"`
	SmartCut           bool        `json:"smartCut"`
	AvoidNegativeTs    string      `json:"avoidNegativeTs"` // make_zero, auto, make_non_negative, disabled
	PreserveMetadata   bool        `json:"preserveMetadata"`
	PreserveChapters   bool        `json:"preserveChapters"`
	SegmentsToChapters bool        `json:"segmentsToChapters"`
	MovFaststart       bool        `json:"movFaststart"`
	Rotation           int         `json:"rotation"` // clockwise degrees to set; -1 keeps the original
	TrackMeta          []TrackMeta `json:"trackMeta"`
	Overwrite          bool        `json:"overwrite"`
}

type Result struct {
	OutputPaths []string `json:"outputPaths"`
	OutputDir   string   `json:"outputDir"`
}

// Service is bound to the frontend.
type Service struct {
	loc  *ffbin.Locator
	jobs *ffrun.Jobs
}

func NewService(loc *ffbin.Locator, jobs *ffrun.Jobs) *Service {
	return &Service{loc: loc, jobs: jobs}
}

// Export validates the request and starts a job whose result is a Result.
func (s *Service) Export(req Request) (string, error) {
	ffmpeg, err := s.loc.FFmpeg()
	if err != nil {
		return "", err
	}
	ffprobe, err := s.loc.FFprobe()
	if err != nil {
		return "", err
	}
	if len(req.Segments) == 0 {
		return "", fmt.Errorf("no segments to export")
	}
	if req.OutputDir == "" {
		req.OutputDir = filepath.Dir(req.InputPath)
	}
	if err := os.MkdirAll(req.OutputDir, 0o755); err != nil {
		return "", err
	}
	if err := checkOutputs(&req); err != nil {
		return "", err
	}

	title := fmt.Sprintf("Export %d segment(s): %s", len(req.Segments), filepath.Base(req.InputPath))
	id := s.jobs.Start("export", title, func(ctx context.Context, report ffrun.Report) (interface{}, error) {
		e := &exporter{ffmpeg: ffmpeg, ffprobe: ffprobe, req: req, report: report}
		return e.run(ctx)
	})
	return id, nil
}

func checkOutputs(req *Request) error {
	var names []string
	if req.Mode != ModeMerge {
		for _, seg := range req.Segments {
			names = append(names, seg.OutputName)
		}
	}
	if req.Mode == ModeMerge || req.Mode == ModeMergeAndSeparate {
		names = append(names, req.MergedOutputName)
	}

	seen := map[string]bool{}
	in, _ := filepath.Abs(req.InputPath)
	for _, n := range names {
		if n == "" || strings.ContainsAny(n, `/\`) {
			return fmt.Errorf("invalid output file name %q", n)
		}
		p := filepath.Join(req.OutputDir, n)
		abs, _ := filepath.Abs(p)
		if strings.EqualFold(abs, in) {
			return fmt.Errorf("output %q would overwrite the input file", n)
		}
		if seen[strings.ToLower(abs)] {
			return fmt.Errorf("duplicate output file name %q", n)
		}
		seen[strings.ToLower(abs)] = true
		if !req.Overwrite {
			if _, err := os.Stat(p); err == nil {
				return fmt.Errorf("output file already exists: %s", p)
			}
		}
	}
	return nil
}

//---------------------------------------------------------------------------

type exporter struct {
	ffmpeg  string
	ffprobe string
	req     Request
	report  ffrun.Report

	total float64 // seconds of output to write, for progress
	done  float64
}

func (e *exporter) run(ctx context.Context) (interface{}, error) {
	req := e.req
	merge := req.Mode == ModeMerge || req.Mode == ModeMergeAndSeparate

	for _, seg := range req.Segments {
		e.total += seg.End - seg.Start
	}
	if merge {
		e.total *= 2
	}

	var parts []string
	var outputs []string
	var temps []string
	defer func() {
		for _, t := range temps {
			_ = os.Remove(t)
		}
	}()

	for i, seg := range req.Segments {
		var out string
		if req.Mode == ModeMerge {
			out = filepath.Join(req.OutputDir, fmt.Sprintf(".video-ed-tmp-%d-%s", i, seg.OutputName))
			temps = append(temps, out)
		} else {
			out = filepath.Join(req.OutputDir, seg.OutputName)
			outputs = append(outputs, out)
		}

		if err := e.cutSegment(ctx, seg, out, &temps); err != nil {
			return nil, err
		}
		parts = append(parts, out)
	}

	if merge {
		out := filepath.Join(req.OutputDir, req.MergedOutputName)
		if err := e.merge(ctx, parts, out, &temps); err != nil {
			return nil, err
		}
		outputs = append(outputs, out)
	}

	return Result{OutputPaths: outputs, OutputDir: req.OutputDir}, nil
}

func (e *exporter) progressFor(duration float64) ffrun.Report {
	base := e.done
	return func(p float64) {
		if e.total > 0 {
			e.report(min(1, (base+p*duration)/e.total))
		}
	}
}

func (e *exporter) cutSegment(ctx context.Context, seg Segment, out string, temps *[]string) error {
	if e.req.SmartCut {
		ok, err := e.smartCut(ctx, seg, out, temps)
		if err != nil || ok {
			e.done += seg.End - seg.Start
			return err
		}
	}

	dur := seg.End - seg.Start
	args := []string{"-y"}
	args = append(args, e.inputArgs(seg.Start, dur, e.req.KeyframeCut)...)
	args = append(args, e.mapArgs()...)
	args = append(args, "-c", "copy")
	args = append(args, e.metadataArgs(0, true)...)
	args = append(args, e.outputArgs(out, true)...)

	_, err := ffrun.FFmpeg(ctx, e.ffmpeg, args, dur, e.progressFor(dur))
	e.done += dur
	return err
}

// inputArgs seeks before the input for a keyframe cut (fast, starts on the previous keyframe),
// or after the input for a normal cut.
func (e *exporter) inputArgs(start, dur float64, keyframeCut bool) []string {
	var rv []string
	ss := []string{}
	if start > 0 {
		ss = []string{"-ss", ftoa(start)}
	}
	if keyframeCut {
		rv = append(rv, ss...)
	}
	if e.req.Rotation >= 0 {
		rv = append(rv, "-display_rotation:v:0", strconv.Itoa((360-e.req.Rotation)%360))
	}
	rv = append(rv, "-i", e.req.InputPath)
	if !keyframeCut {
		rv = append(rv, ss...)
	}
	rv = append(rv, "-t", ftoa(dur))
	return rv
}

func (e *exporter) mapArgs() []string {
	if len(e.req.StreamIndexes) == 0 {
		return []string{"-map", "0"}
	}
	var rv []string
	for _, idx := range e.req.StreamIndexes {
		rv = append(rv, "-map", fmt.Sprintf("0:%d", idx))
	}
	return rv
}

// metadataArgs maps global metadata and chapters from input metaInput, and applies track metadata edits.
func (e *exporter) metadataArgs(metaInput int, withTracks bool) []string {
	var rv []string
	if e.req.PreserveMetadata {
		rv = append(rv, "-map_metadata", strconv.Itoa(metaInput))
	} else {
		rv = append(rv, "-map_metadata", "-1")
	}
	if e.req.PreserveChapters {
		rv = append(rv, "-map_chapters", strconv.Itoa(metaInput))
	} else {
		rv = append(rv, "-map_chapters", "-1")
	}
	if withTracks {
		rv = append(rv, e.trackMetaArgs()...)
	}
	return rv
}

func (e *exporter) trackMetaArgs() []string {
	outIndex := map[int]int{}
	for i, idx := range e.req.StreamIndexes {
		outIndex[idx] = i
	}
	var rv []string
	for _, tm := range e.req.TrackMeta {
		o, ok := outIndex[tm.Index]
		if !ok {
			if len(e.req.StreamIndexes) > 0 {
				continue
			}
			o = tm.Index
		}
		if tm.Title != "" {
			rv = append(rv, fmt.Sprintf("-metadata:s:%d", o), "title="+tm.Title)
		}
		if tm.Language != "" {
			rv = append(rv, fmt.Sprintf("-metadata:s:%d", o), "language="+tm.Language)
		}
	}
	return rv
}

func (e *exporter) outputArgs(out string, shiftTs bool) []string {
	rv := []string{"-ignore_unknown"}
	if ts := e.req.AvoidNegativeTs; shiftTs && ts != "" && ts != "disabled" {
		rv = append(rv, "-avoid_negative_ts", ts)
	}
	ext := strings.ToLower(filepath.Ext(strings.TrimPrefix(filepath.Base(out), ".video-ed-tmp-")))
	if e.req.MovFaststart && (ext == ".mp4" || ext == ".mov" || ext == ".m4a" || ext == ".m4v") {
		rv = append(rv, "-movflags", "+faststart")
	}
	if ext == ".mp4" || ext == ".mov" || ext == ".m4v" {
		rv = append(rv, "-strict", "experimental")
	}
	return append(rv, out)
}

//---------------------------------------------------------------------------

func (e *exporter) merge(ctx context.Context, parts []string, out string, temps *[]string) error {
	list := out + ".concat.txt"
	*temps = append(*temps, list)
	if err := writeConcatList(list, parts); err != nil {
		return err
	}

	args := []string{"-y", "-f", "concat", "-safe", "0", "-i", list}
	metaInput := -1

	if e.req.SegmentsToChapters {
		meta := out + ".chapters.txt"
		*temps = append(*temps, meta)
		if err := writeChapters(meta, e.req.Segments); err != nil {
			return err
		}
		args = append(args, "-f", "ffmetadata", "-i", meta)
	}
	if e.req.PreserveMetadata {
		args = append(args, "-i", e.req.InputPath)
		metaInput = 1
		if e.req.SegmentsToChapters {
			metaInput = 2
		}
	}

	args = append(args, "-map", "0", "-c", "copy")
	if metaInput >= 0 {
		args = append(args, "-map_metadata", strconv.Itoa(metaInput))
	} else {
		args = append(args, "-map_metadata", "-1")
	}
	if e.req.SegmentsToChapters {
		args = append(args, "-map_chapters", "1")
	} else {
		args = append(args, "-map_chapters", "-1")
	}
	args = append(args, e.outputArgs(out, true)...)

	total := e.total / 2
	_, err := ffrun.FFmpeg(ctx, e.ffmpeg, args, total, e.progressFor(total))
	e.done += total
	return err
}

func writeConcatList(path string, files []string) error {
	var b strings.Builder
	b.WriteString("ffconcat version 1.0\n")
	for _, f := range files {
		abs, _ := filepath.Abs(f)
		b.WriteString("file '" + strings.ReplaceAll(filepath.ToSlash(abs), "'", `'\''`) + "'\n")
	}
	return os.WriteFile(path, []byte(b.String()), 0o644)
}

func writeChapters(path string, segs []Segment) error {
	var b strings.Builder
	b.WriteString(";FFMETADATA1\n")
	at := 0.0
	for i, seg := range segs {
		dur := seg.End - seg.Start
		name := seg.Name
		if name == "" {
			name = fmt.Sprintf("Segment %d", i+1)
		}
		fmt.Fprintf(&b, "\n[CHAPTER]\nTIMEBASE=1/1000\nSTART=%d\nEND=%d\ntitle=%s\n", int64(at*1000), int64((at+dur)*1000), escapeMeta(name))
		at += dur
	}
	return os.WriteFile(path, []byte(b.String()), 0o644)
}

func escapeMeta(s string) string {
	r := strings.NewReplacer(`\`, `\\`, "=", `\=`, ";", `\;`, "#", `\#`, "\n", `\`+"\n")
	return r.Replace(s)
}

func ftoa(f float64) string {
	return strconv.FormatFloat(f, 'f', 6, 64)
}
