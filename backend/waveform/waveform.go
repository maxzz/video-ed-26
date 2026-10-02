// Package waveform renders the audio waveform of a time range as a PNG data URL.
package waveform

import (
	"context"
	"encoding/base64"
	"fmt"
	"time"

	"video-ed-26/backend/ffbin"
	"video-ed-26/backend/ffrun"
)

// Service is bound to the frontend.
type Service struct {
	loc *ffbin.Locator
}

func NewService(loc *ffbin.Locator) *Service {
	return &Service{loc: loc}
}

// GetWaveform draws the first audio stream between from and to; color is an ffmpeg color like "0x3b82f6".
func (s *Service) GetWaveform(path string, from, to float64, width, height int, color string) (string, error) {
	ffmpeg, err := s.loc.FFmpeg()
	if err != nil {
		return "", err
	}
	if to <= from || width <= 0 || height <= 0 {
		return "", fmt.Errorf("invalid waveform range")
	}
	if color == "" {
		color = "0x3b82f6"
	}

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	filter := fmt.Sprintf("[0:a:0]aformat=channel_layouts=mono,showwavespic=s=%dx%d:colors=%s:scale=sqrt", width, height, color)
	out, err := ffrun.Output(ctx, ffmpeg,
		"-hide_banner", "-nostdin", "-loglevel", "error",
		"-ss", fmt.Sprintf("%.3f", from),
		"-t", fmt.Sprintf("%.3f", to-from),
		"-i", path,
		"-filter_complex", filter,
		"-frames:v", "1",
		"-f", "image2pipe", "-c:v", "png", "pipe:1",
	)
	if err != nil {
		return "", err
	}
	return "data:image/png;base64," + base64.StdEncoding.EncodeToString(out), nil
}
