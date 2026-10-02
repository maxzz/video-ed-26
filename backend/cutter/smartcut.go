package cutter

import (
	"context"
	"fmt"
	"os"
	"strconv"

	"video-ed-26/backend/ffrun"
	"video-ed-26/backend/keyframes"
	"video-ed-26/backend/probe"
)

// Experimental: re-encodes only the video from the cut start to the next keyframe,
// copies the rest, and muxes the other streams copied from the original.
// smartCut returns false when a plain copy cut should be used instead.

var smartEncoders = map[string]string{
	"h264":  "libx264",
	"hevc":  "libx265",
	"vp9":   "libvpx-vp9",
	"mpeg4": "mpeg4",
}

func (e *exporter) smartCut(ctx context.Context, seg Segment, out string, temps *[]string) (bool, error) {
	info, err := probe.Probe(ctx, e.ffprobe, e.req.InputPath)
	if err != nil {
		return false, err
	}

	var video *probe.Stream
	selected := map[int]bool{}
	for _, idx := range e.req.StreamIndexes {
		selected[idx] = true
	}
	for i := range info.Streams {
		s := &info.Streams[i]
		if s.CodecType == "video" && s.Disposition["attached_pic"] == 0 && (len(selected) == 0 || selected[s.Index]) {
			video = s
			break
		}
	}
	if video == nil {
		return false, nil
	}
	encoder, ok := smartEncoders[video.CodecName]
	if !ok {
		return false, nil
	}

	kfs, err := keyframes.Read(ctx, e.ffprobe, e.req.InputPath, seg.Start, seg.End)
	if err != nil {
		return false, err
	}
	next := -1.0
	for _, k := range kfs {
		if k >= seg.Start-0.001 {
			next = k
			break
		}
	}
	if next < 0 || next-seg.Start < 0.01 || next >= seg.End {
		return false, nil
	}

	bitrate := video.BitRate
	if bitrate == "" {
		bitrate = info.Format.BitRate
	}

	base := out + ".smart"
	head := base + "-head.mkv"
	rest := base + "-rest.mkv"
	joined := base + "-video.mkv"
	list := base + "-list.txt"
	*temps = append(*temps, head, rest, joined, list)

	vmap := fmt.Sprintf("0:%d", video.Index)
	headDur := next - seg.Start
	restDur := seg.End - next

	encode := []string{"-y", "-ss", ftoa(seg.Start), "-i", e.req.InputPath, "-t", ftoa(headDur), "-map", vmap, "-c:v", encoder}
	if bitrate != "" {
		encode = append(encode, "-b:v", bitrate)
	}
	if video.PixFmt != "" {
		encode = append(encode, "-pix_fmt", video.PixFmt)
	}
	encode = append(encode, "-an", "-sn", "-dn", head)
	if _, err := ffrun.FFmpeg(ctx, e.ffmpeg, encode, headDur, nil); err != nil {
		return false, err
	}

	copyRest := []string{"-y", "-ss", ftoa(next), "-i", e.req.InputPath, "-t", ftoa(restDur), "-map", vmap, "-c", "copy", "-an", "-sn", "-dn", rest}
	if _, err := ffrun.FFmpeg(ctx, e.ffmpeg, copyRest, restDur, nil); err != nil {
		return false, err
	}

	if err := writeConcatList(list, []string{head, rest}); err != nil {
		return false, err
	}
	concat := []string{"-y", "-f", "concat", "-safe", "0", "-i", list, "-map", "0", "-c", "copy", joined}
	if _, err := ffrun.FFmpeg(ctx, e.ffmpeg, concat, seg.End-seg.Start, nil); err != nil {
		return false, err
	}

	final := []string{"-y"}
	if e.req.Rotation >= 0 {
		final = append(final, "-display_rotation:v:0", strconv.Itoa((360-e.req.Rotation)%360))
	}
	final = append(final, "-i", joined, "-ss", ftoa(seg.Start), "-i", e.req.InputPath, "-t", ftoa(seg.End-seg.Start), "-map", "0:v:0")
	for i := range info.Streams {
		s := info.Streams[i]
		if s.Index == video.Index || (len(selected) > 0 && !selected[s.Index]) {
			continue
		}
		final = append(final, "-map", fmt.Sprintf("1:%d", s.Index))
	}
	final = append(final, "-c", "copy")
	final = append(final, e.metadataArgs(1, false)...)
	final = append(final, e.outputArgs(out, false)...) // -avoid_negative_ts would shift the re-encoded video against the copied audio

	dur := seg.End - seg.Start
	if _, err := ffrun.FFmpeg(ctx, e.ffmpeg, final, dur, e.progressFor(dur)); err != nil {
		_ = os.Remove(out)
		return false, err
	}
	return true, nil
}
