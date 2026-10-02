package cutter

import (
	"context"
	"math"
	"os"
	"path/filepath"
	"testing"

	"video-ed-26/backend/ffbin"
	"video-ed-26/backend/ffrun"
	"video-ed-26/backend/probe"
)

func makeClip(t *testing.T, ffmpeg, dir string) string {
	t.Helper()
	src := filepath.Join(dir, "src.mp4")
	_, err := ffrun.Output(context.Background(), ffmpeg, "-hide_banner", "-y",
		"-f", "lavfi", "-i", "testsrc=size=160x120:rate=25:duration=6",
		"-f", "lavfi", "-i", "sine=frequency=440:duration=6",
		"-c:v", "libx264", "-g", "25", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", src)
	if err != nil {
		t.Skipf("cannot create test clip: %v", err)
	}
	return src
}

func TestExportSeparateMergeAndSmartCut(t *testing.T) {
	loc := ffbin.NewLocator()
	ffmpeg, err1 := loc.FFmpeg()
	ffprobe, err2 := loc.FFprobe()
	if err1 != nil || err2 != nil {
		t.Skip("ffmpeg/ffprobe not available")
	}
	dir := t.TempDir()
	src := makeClip(t, ffmpeg, dir)

	for _, tc := range []struct {
		name  string
		mode  string
		smart bool
	}{
		{"separate", ModeSeparate, false},
		{"merge", ModeMerge, false},
		{"smart", ModeSeparate, true},
	} {
		t.Run(tc.name, func(t *testing.T) {
			out := filepath.Join(dir, tc.name)
			if err := os.MkdirAll(out, 0o755); err != nil {
				t.Fatal(err)
			}
			req := Request{
				InputPath:          src,
				OutputDir:          out,
				Mode:               tc.mode,
				Segments:           []Segment{{Start: 1.5, End: 3, Name: "a", OutputName: "a.mp4"}, {Start: 4, End: 5.5, Name: "b", OutputName: "b.mp4"}},
				MergedOutputName:   "merged.mp4",
				KeyframeCut:        true,
				SmartCut:           tc.smart,
				AvoidNegativeTs:    "make_zero",
				PreserveMetadata:   true,
				SegmentsToChapters: true,
				Rotation:           -1,
			}
			e := &exporter{ffmpeg: ffmpeg, ffprobe: ffprobe, req: req, report: func(float64) {}}
			res, err := e.run(context.Background())
			if err != nil {
				t.Fatal(err)
			}
			paths := res.(Result).OutputPaths
			wantCount := 2
			if tc.mode == ModeMerge {
				wantCount = 1
			}
			if len(paths) != wantCount {
				t.Fatalf("outputs = %v", paths)
			}
			for _, p := range paths {
				info, err := probe.Probe(context.Background(), ffprobe, p)
				if err != nil {
					t.Fatal(err)
				}
				if info.Duration <= 0.5 {
					t.Fatalf("%s duration = %v", p, info.Duration)
				}
				if tc.smart && math.Abs(info.Duration-1.5) > 0.2 {
					t.Fatalf("smart cut %s duration = %v, want ~1.5", p, info.Duration)
				}
			}
			entries, _ := os.ReadDir(out)
			if len(entries) != wantCount {
				t.Fatalf("temp files left behind: %v", entries)
			}
		})
	}
}
