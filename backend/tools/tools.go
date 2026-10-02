// Package tools holds the extra LosslessCut operations: frame capture, segment detection,
// track extraction and merging whole files.
package tools

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"

	"video-ed-26/backend/ffbin"
	"video-ed-26/backend/ffrun"
	"video-ed-26/backend/thumbs"
)

// Service is bound to the frontend.
type Service struct {
	loc  *ffbin.Locator
	jobs *ffrun.Jobs
}

func NewService(loc *ffbin.Locator, jobs *ffrun.Jobs) *Service {
	return &Service{loc: loc, jobs: jobs}
}

//---------------------------------------------------------------------------
// Frame capture

// CaptureFrame saves the frame at time t as a full-size jpeg or png and returns its path.
func (s *Service) CaptureFrame(path string, t float64, outPath string) (string, error) {
	ffmpeg, err := s.loc.FFmpeg()
	if err != nil {
		return "", err
	}
	format := "jpeg"
	if strings.EqualFold(filepath.Ext(outPath), ".png") {
		format = "png"
	}
	ctx, cancel := context.WithTimeout(context.Background(), time.Minute)
	defer cancel()
	b, err := thumbs.Frame(ctx, ffmpeg, path, t, 0, format)
	if err != nil {
		return "", err
	}
	if len(b) == 0 {
		return "", fmt.Errorf("no frame at %.3f s", t)
	}
	return outPath, os.WriteFile(outPath, b, 0o644)
}

//---------------------------------------------------------------------------
// Detection

const (
	DetectBlack   = "black"
	DetectSilence = "silence"
	DetectScene   = "scene"
)

type DetectRequest struct {
	Path     string  `json:"path"`
	Kind     string  `json:"kind"`
	From     float64 `json:"from"`
	To       float64 `json:"to"` // <= From means the whole file
	Duration float64 `json:"duration"`

	BlackMinDuration float64 `json:"blackMinDuration"` // seconds
	PictureThreshold float64 `json:"pictureThreshold"` // 0..1 ratio of black pixels
	PixelThreshold   float64 `json:"pixelThreshold"`   // 0..1 luminance

	SilenceNoiseDb     float64 `json:"silenceNoiseDb"` // e.g. -60
	SilenceMinDuration float64 `json:"silenceMinDuration"`

	SceneThreshold float64 `json:"sceneThreshold"` // 0..1
}

type Range struct {
	Start float64 `json:"start"`
	End   float64 `json:"end"`
}

// Detect starts a job whose result is []Range. Scene changes are returned as zero-length ranges.
func (s *Service) Detect(req DetectRequest) (string, error) {
	ffmpeg, err := s.loc.FFmpeg()
	if err != nil {
		return "", err
	}

	var filterArgs []string
	switch req.Kind {
	case DetectBlack:
		filterArgs = []string{"-an", "-sn", "-dn", "-vf", fmt.Sprintf("blackdetect=d=%g:pic_th=%g:pix_th=%g",
			orDefault(req.BlackMinDuration, 2), orDefault(req.PictureThreshold, 0.98), orDefault(req.PixelThreshold, 0.1))}
	case DetectSilence:
		filterArgs = []string{"-vn", "-sn", "-dn", "-af", fmt.Sprintf("silencedetect=n=%gdB:d=%g",
			orDefault(req.SilenceNoiseDb, -60), orDefault(req.SilenceMinDuration, 2))}
	case DetectScene:
		filterArgs = []string{"-an", "-sn", "-dn", "-vf", fmt.Sprintf("select='gt(scene,%g)',metadata=print", orDefault(req.SceneThreshold, 0.3))}
	default:
		return "", fmt.Errorf("unknown detection %q", req.Kind)
	}

	var input []string
	span := req.Duration
	if req.To > req.From {
		input = append(input, "-ss", ftoa(req.From), "-t", ftoa(req.To-req.From))
		span = req.To - req.From
	}
	input = append(input, "-i", req.Path)

	title := fmt.Sprintf("Detect %s: %s", req.Kind, filepath.Base(req.Path))
	id := s.jobs.Start("detect", title, func(ctx context.Context, report ffrun.Report) (interface{}, error) {
		args := append(append(input, filterArgs...), "-f", "null", "-")
		stderr, err := ffrun.FFmpeg(ctx, ffmpeg, args, span, report)
		if err != nil {
			return nil, err
		}
		offset := 0.0
		if req.To > req.From {
			offset = req.From
		}
		return parseDetect(req.Kind, stderr, offset, req.Duration), nil
	})
	return id, nil
}

var (
	reBlack        = regexp.MustCompile(`black_start:\s*([\d.]+)\s+black_end:\s*([\d.]+)`)
	reSilenceStart = regexp.MustCompile(`silence_start:\s*(-?[\d.]+)`)
	reSilenceEnd   = regexp.MustCompile(`silence_end:\s*([\d.]+)`)
	rePtsTime      = regexp.MustCompile(`pts_time:\s*([\d.]+)`)
)

func parseDetect(kind, stderr string, offset, duration float64) []Range {
	rv := []Range{}
	switch kind {
	case DetectBlack:
		for _, m := range reBlack.FindAllStringSubmatch(stderr, -1) {
			rv = append(rv, Range{Start: atof(m[1]) + offset, End: atof(m[2]) + offset})
		}
	case DetectSilence:
		start := -1.0
		for _, line := range strings.Split(stderr, "\n") {
			if m := reSilenceStart.FindStringSubmatch(line); m != nil {
				start = max(0, atof(m[1]))
			} else if m := reSilenceEnd.FindStringSubmatch(line); m != nil && start >= 0 {
				rv = append(rv, Range{Start: start + offset, End: atof(m[1]) + offset})
				start = -1
			}
		}
		if start >= 0 && duration > 0 {
			rv = append(rv, Range{Start: start + offset, End: duration})
		}
	case DetectScene:
		for _, line := range strings.Split(stderr, "\n") {
			if !strings.Contains(line, "frame:") {
				continue
			}
			if m := rePtsTime.FindStringSubmatch(line); m != nil {
				t := atof(m[1]) + offset
				rv = append(rv, Range{Start: t, End: t})
			}
		}
	}
	return rv
}

//---------------------------------------------------------------------------
// Track extraction

type ExtractStream struct {
	Index     int    `json:"index"`
	CodecType string `json:"codecType"`
	CodecName string `json:"codecName"`
	Language  string `json:"language"`
}

var subtitleExt = map[string]string{"subrip": ".srt", "ass": ".ass", "ssa": ".ssa", "webvtt": ".vtt"}

func extractExt(st ExtractStream) string {
	switch st.CodecType {
	case "video":
		return ".mkv"
	case "audio":
		return ".mka"
	case "subtitle":
		if ext, ok := subtitleExt[st.CodecName]; ok {
			return ext
		}
		return ".mks"
	}
	return ".bin"
}

// ExtractTracks writes each stream to its own file and starts a job whose result is the list of paths.
func (s *Service) ExtractTracks(path string, streams []ExtractStream, outDir string, duration float64) (string, error) {
	ffmpeg, err := s.loc.FFmpeg()
	if err != nil {
		return "", err
	}
	if outDir == "" {
		outDir = filepath.Dir(path)
	}
	base := strings.TrimSuffix(filepath.Base(path), filepath.Ext(path))

	title := fmt.Sprintf("Extract %d track(s): %s", len(streams), filepath.Base(path))
	id := s.jobs.Start("extract", title, func(ctx context.Context, report ffrun.Report) (interface{}, error) {
		args := []string{"-y", "-i", path}
		var outputs []string
		for _, st := range streams {
			if st.CodecType == "attachment" || st.CodecType == "data" {
				continue
			}
			name := fmt.Sprintf("%s-stream-%d-%s", base, st.Index, st.CodecType)
			if st.Language != "" {
				name += "-" + st.Language
			}
			out := filepath.Join(outDir, name+extractExt(st))
			args = append(args, "-map", fmt.Sprintf("0:%d", st.Index), "-c", "copy", "-map_metadata", "0", out)
			outputs = append(outputs, out)
		}
		if len(outputs) == 0 {
			return nil, fmt.Errorf("no extractable tracks")
		}
		if _, err := ffrun.FFmpeg(ctx, ffmpeg, args, duration, report); err != nil {
			return nil, err
		}
		return outputs, nil
	})
	return id, nil
}

//---------------------------------------------------------------------------
// Merging whole files

type MergeRequest struct {
	Paths            []string  `json:"paths"`
	OutputPath       string    `json:"outputPath"`
	TotalDuration    float64   `json:"totalDuration"`
	PreserveMetadata bool      `json:"preserveMetadata"`
	FilesToChapters  bool      `json:"filesToChapters"`
	Durations        []float64 `json:"durations"` // per file, used for chapters
}

// MergeFiles concatenates files with identical codecs and starts a job whose result is the output path.
func (s *Service) MergeFiles(req MergeRequest) (string, error) {
	ffmpeg, err := s.loc.FFmpeg()
	if err != nil {
		return "", err
	}
	if len(req.Paths) < 2 {
		return "", fmt.Errorf("select at least two files to merge")
	}

	title := fmt.Sprintf("Merge %d files", len(req.Paths))
	id := s.jobs.Start("merge", title, func(ctx context.Context, report ffrun.Report) (interface{}, error) {
		list := req.OutputPath + ".concat.txt"
		defer os.Remove(list)

		var b strings.Builder
		b.WriteString("ffconcat version 1.0\n")
		for _, p := range req.Paths {
			b.WriteString("file '" + strings.ReplaceAll(filepath.ToSlash(p), "'", `'\''`) + "'\n")
		}
		if err := os.WriteFile(list, []byte(b.String()), 0o644); err != nil {
			return nil, err
		}

		args := []string{"-y", "-f", "concat", "-safe", "0", "-i", list}
		if req.FilesToChapters && len(req.Durations) == len(req.Paths) {
			meta := req.OutputPath + ".chapters.txt"
			defer os.Remove(meta)
			if err := writeFileChapters(meta, req.Paths, req.Durations); err != nil {
				return nil, err
			}
			args = append(args, "-f", "ffmetadata", "-i", meta, "-map_chapters", "1")
		}
		args = append(args, "-map", "0", "-c", "copy")
		if !req.PreserveMetadata {
			args = append(args, "-map_metadata", "-1")
		}
		args = append(args, "-ignore_unknown", req.OutputPath)

		if _, err := ffrun.FFmpeg(ctx, ffmpeg, args, req.TotalDuration, report); err != nil {
			return nil, err
		}
		return req.OutputPath, nil
	})
	return id, nil
}

func writeFileChapters(path string, files []string, durations []float64) error {
	var b strings.Builder
	b.WriteString(";FFMETADATA1\n")
	at := 0.0
	for i, f := range files {
		name := strings.TrimSuffix(filepath.Base(f), filepath.Ext(f))
		fmt.Fprintf(&b, "\n[CHAPTER]\nTIMEBASE=1/1000\nSTART=%d\nEND=%d\ntitle=%s\n", int64(at*1000), int64((at+durations[i])*1000), name)
		at += durations[i]
	}
	return os.WriteFile(path, []byte(b.String()), 0o644)
}

//---------------------------------------------------------------------------

func orDefault(v, def float64) float64 {
	if v == 0 {
		return def
	}
	return v
}

func atof(s string) float64 {
	v, _ := strconv.ParseFloat(s, 64)
	return v
}

func ftoa(f float64) string {
	return strconv.FormatFloat(f, 'f', 6, 64)
}
