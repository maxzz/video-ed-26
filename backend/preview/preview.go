// Package preview converts files the webview cannot play into a playable proxy,
// like LosslessCut's "Convert to supported format" (html5ify).
package preview

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"video-ed-26/backend/ffbin"
	"video-ed-26/backend/ffrun"
	"video-ed-26/backend/media"
)

const (
	ModeRemux     = "remux"      // copy streams into MP4; fastest, works when codecs are supported
	ModeFastAudio = "fast-audio" // copy video, re-encode audio to AAC
	ModeFast      = "fast"       // fast low-quality H.264 + AAC, capped to 720p
	ModeSlow      = "slow"       // good quality H.264 + AAC
)

type Result struct {
	URL  string `json:"url"`
	Path string `json:"path"`
	Mode string `json:"mode"`
}

// Service is bound to the frontend.
type Service struct {
	loc  *ffbin.Locator
	jobs *ffrun.Jobs
	reg  *media.Registry
	dir  string
}

func NewService(loc *ffbin.Locator, jobs *ffrun.Jobs, reg *media.Registry) *Service {
	dir := filepath.Join(os.TempDir(), "video-ed-26", "previews")
	_ = os.RemoveAll(dir)
	return &Service{loc: loc, jobs: jobs, reg: reg, dir: dir}
}

// CreatePreview starts a job whose result is a Result.
func (s *Service) CreatePreview(path, mode string, duration float64) (string, error) {
	ffmpeg, err := s.loc.FFmpeg()
	if err != nil {
		return "", err
	}
	codecArgs, err := modeArgs(mode)
	if err != nil {
		return "", err
	}
	if err := os.MkdirAll(s.dir, 0o755); err != nil {
		return "", err
	}

	base := strings.TrimSuffix(filepath.Base(path), filepath.Ext(path))
	out := filepath.Join(s.dir, fmt.Sprintf("%s-%s-%d.mp4", base, mode, time.Now().UnixMilli()))

	title := fmt.Sprintf("Preview (%s): %s", mode, filepath.Base(path))
	id := s.jobs.Start("preview", title, func(ctx context.Context, report ffrun.Report) (interface{}, error) {
		args := []string{"-y", "-i", path, "-map", "0:v:0?", "-map", "0:a:0?", "-sn", "-dn"}
		args = append(args, codecArgs...)
		args = append(args, "-movflags", "+faststart", out)

		if _, err := ffrun.FFmpeg(ctx, ffmpeg, args, duration, report); err != nil {
			_ = os.Remove(out)
			return nil, err
		}
		u, err := s.reg.Register(out)
		if err != nil {
			return nil, err
		}
		return Result{URL: u, Path: out, Mode: mode}, nil
	})
	return id, nil
}

func modeArgs(mode string) ([]string, error) {
	switch mode {
	case ModeRemux:
		return []string{"-c", "copy"}, nil
	case ModeFastAudio:
		return []string{"-c:v", "copy", "-c:a", "aac", "-b:a", "192k"}, nil
	case ModeFast:
		return []string{"-c:v", "libx264", "-preset", "ultrafast", "-crf", "30", "-vf", "scale=-2:'min(720,ih)'", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k"}, nil
	case ModeSlow:
		return []string{"-c:v", "libx264", "-preset", "medium", "-crf", "22", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k"}, nil
	}
	return nil, fmt.Errorf("unknown preview mode %q", mode)
}
