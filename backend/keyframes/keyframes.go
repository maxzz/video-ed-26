// Package keyframes lists video keyframe timestamps from packet flags, which needs no decoding.
package keyframes

import (
	"context"
	"fmt"
	"sort"
	"strconv"
	"strings"
	"time"

	"video-ed-26/backend/ffbin"
	"video-ed-26/backend/ffrun"
)

// Read returns keyframe times (seconds) of the first video stream in [from, to].
func Read(ctx context.Context, ffprobe, path string, from, to float64) ([]float64, error) {
	args := []string{"-v", "error", "-select_streams", "v:0", "-show_entries", "packet=pts_time,flags", "-of", "csv=p=0"}
	if to > from {
		args = append(args, "-read_intervals", fmt.Sprintf("%.3f%%%.3f", max(0, from), to))
	}
	args = append(args, path)

	out, err := ffrun.Output(ctx, ffprobe, args...)
	if err != nil {
		return nil, err
	}

	var rv []float64
	for _, line := range strings.Split(string(out), "\n") {
		ts, flags, ok := strings.Cut(strings.TrimSpace(line), ",")
		if !ok || !strings.Contains(flags, "K") {
			continue
		}
		t, err := strconv.ParseFloat(ts, 64)
		if err != nil {
			continue
		}
		if to > from && (t < from || t > to) {
			continue
		}
		rv = append(rv, t)
	}
	sort.Float64s(rv)
	return rv, nil
}

// Service is bound to the frontend.
type Service struct {
	loc *ffbin.Locator
}

func NewService(loc *ffbin.Locator) *Service {
	return &Service{loc: loc}
}

// GetKeyframes returns keyframe times in [from, to]; pass to <= from for the whole file.
func (s *Service) GetKeyframes(path string, from, to float64) ([]float64, error) {
	ffprobe, err := s.loc.FFprobe()
	if err != nil {
		return nil, err
	}
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()
	rv, err := Read(ctx, ffprobe, path, from, to)
	if rv == nil {
		rv = []float64{}
	}
	return rv, err
}
