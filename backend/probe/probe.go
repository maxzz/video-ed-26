// Package probe reads media information with ffprobe.
package probe

import (
	"context"
	"encoding/json"
	"math"
	"strconv"
	"strings"
	"time"

	"video-ed-26/backend/ffbin"
	"video-ed-26/backend/ffrun"
)

type Stream struct {
	Index          int               `json:"index"`
	CodecName      string            `json:"codec_name"`
	CodecLongName  string            `json:"codec_long_name"`
	CodecType      string            `json:"codec_type"` // video, audio, subtitle, data, attachment
	CodecTagString string            `json:"codec_tag_string"`
	Profile        string            `json:"profile"`
	Width          int               `json:"width"`
	Height         int               `json:"height"`
	PixFmt         string            `json:"pix_fmt"`
	SampleRate     string            `json:"sample_rate"`
	Channels       int               `json:"channels"`
	ChannelLayout  string            `json:"channel_layout"`
	RFrameRate     string            `json:"r_frame_rate"`
	AvgFrameRate   string            `json:"avg_frame_rate"`
	TimeBase       string            `json:"time_base"`
	StartTime      string            `json:"start_time"`
	Duration       string            `json:"duration"`
	BitRate        string            `json:"bit_rate"`
	NbFrames       string            `json:"nb_frames"`
	Disposition    map[string]int    `json:"disposition"`
	Tags           map[string]string `json:"tags"`
	SideDataList   []SideData        `json:"side_data_list,omitempty"`
	Rotation       int               `json:"rotation"` // clockwise degrees, from the display matrix or the rotate tag
	Fps            float64           `json:"fps"`
}

type SideData struct {
	SideDataType string  `json:"side_data_type"`
	Rotation     float64 `json:"rotation"`
}

type Format struct {
	Filename       string            `json:"filename"`
	FormatName     string            `json:"format_name"`
	FormatLongName string            `json:"format_long_name"`
	StartTime      string            `json:"start_time"`
	Duration       string            `json:"duration"`
	Size           string            `json:"size"`
	BitRate        string            `json:"bit_rate"`
	NbStreams      int               `json:"nb_streams"`
	Tags           map[string]string `json:"tags"`
}

type Chapter struct {
	ID        int64             `json:"id"`
	StartTime string            `json:"start_time"`
	EndTime   string            `json:"end_time"`
	Tags      map[string]string `json:"tags"`
}

type Info struct {
	Path     string    `json:"path"`
	Format   Format    `json:"format"`
	Streams  []Stream  `json:"streams"`
	Chapters []Chapter `json:"chapters"`
	Duration float64   `json:"duration"` // seconds
}

func Probe(ctx context.Context, ffprobe, path string) (*Info, error) {
	out, err := ffrun.Output(ctx, ffprobe,
		"-v", "error",
		"-show_format", "-show_streams", "-show_chapters",
		"-of", "json",
		path,
	)
	if err != nil {
		return nil, err
	}

	var info Info
	if err := json.Unmarshal(out, &info); err != nil {
		return nil, err
	}
	info.Path = path
	info.Duration = ParseSeconds(info.Format.Duration)

	for i := range info.Streams {
		s := &info.Streams[i]
		s.Rotation = rotation(s)
		s.Fps = parseRate(s.AvgFrameRate)
		if s.Fps == 0 {
			s.Fps = parseRate(s.RFrameRate)
		}
		if info.Duration == 0 {
			info.Duration = math.Max(info.Duration, ParseSeconds(s.Duration))
		}
	}
	return &info, nil
}

func rotation(s *Stream) int {
	for _, sd := range s.SideDataList {
		if sd.Rotation != 0 {
			return normalizeDegrees(int(math.Round(-sd.Rotation))) // display matrix is counter-clockwise
		}
	}
	if v, ok := s.Tags["rotate"]; ok {
		if n, err := strconv.Atoi(v); err == nil {
			return normalizeDegrees(n)
		}
	}
	return 0
}

func normalizeDegrees(d int) int {
	return ((d % 360) + 360) % 360
}

func parseRate(s string) float64 {
	num, den, ok := strings.Cut(s, "/")
	if !ok {
		return ParseSeconds(s)
	}
	n, err1 := strconv.ParseFloat(num, 64)
	d, err2 := strconv.ParseFloat(den, 64)
	if err1 != nil || err2 != nil || d == 0 {
		return 0
	}
	return n / d
}

func ParseSeconds(s string) float64 {
	v, err := strconv.ParseFloat(strings.TrimSpace(s), 64)
	if err != nil || math.IsNaN(v) {
		return 0
	}
	return v
}

//---------------------------------------------------------------------------

// Service is bound to the frontend.
type Service struct {
	loc *ffbin.Locator
}

func NewService(loc *ffbin.Locator) *Service {
	return &Service{loc: loc}
}

func (s *Service) ProbeFile(path string) (*Info, error) {
	ffprobe, err := s.loc.FFprobe()
	if err != nil {
		return nil, err
	}
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()
	return Probe(ctx, ffprobe, path)
}
