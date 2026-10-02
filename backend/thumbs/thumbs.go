// Package thumbs renders single video frames as JPEG data URLs for the timeline.
package thumbs

import (
	"context"
	"encoding/base64"
	"fmt"
	"sync"
	"time"

	"video-ed-26/backend/ffbin"
	"video-ed-26/backend/ffrun"
)

const parallel = 4

type Thumbnail struct {
	Time    float64 `json:"time"`
	DataURL string  `json:"dataUrl"`
}

// Frame grabs one frame near time t, scaled to the given height.
func Frame(ctx context.Context, ffmpeg, path string, t float64, height int, format string) ([]byte, error) {
	codec := "mjpeg"
	if format == "png" {
		codec = "png"
	}
	args := []string{
		"-hide_banner", "-nostdin", "-loglevel", "error",
		"-ss", fmt.Sprintf("%.3f", max(0, t)),
		"-i", path,
		"-frames:v", "1",
	}
	if height > 0 {
		args = append(args, "-vf", fmt.Sprintf("scale=-2:%d", height))
	}
	args = append(args, "-f", "image2pipe", "-c:v", codec, "-q:v", "4", "pipe:1")
	return ffrun.Output(ctx, ffmpeg, args...)
}

// Service is bound to the frontend.
type Service struct {
	loc *ffbin.Locator
}

func NewService(loc *ffbin.Locator) *Service {
	return &Service{loc: loc}
}

// GetThumbnails renders frames at the given times; frames that fail are skipped.
func (s *Service) GetThumbnails(path string, times []float64, height int) ([]Thumbnail, error) {
	ffmpeg, err := s.loc.FFmpeg()
	if err != nil {
		return nil, err
	}
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	results := make([]Thumbnail, len(times))
	sem := make(chan struct{}, parallel)
	var wg sync.WaitGroup

	for i, t := range times {
		wg.Add(1)
		sem <- struct{}{}
		go func(i int, t float64) {
			defer wg.Done()
			defer func() { <-sem }()
			b, err := Frame(ctx, ffmpeg, path, t, height, "jpeg")
			if err != nil || len(b) == 0 {
				return
			}
			results[i] = Thumbnail{Time: t, DataURL: "data:image/jpeg;base64," + base64.StdEncoding.EncodeToString(b)}
		}(i, t)
	}
	wg.Wait()

	rv := make([]Thumbnail, 0, len(results))
	for _, r := range results {
		if r.DataURL != "" {
			rv = append(rv, r)
		}
	}
	return rv, nil
}
