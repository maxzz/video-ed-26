// Package ffrun runs ffmpeg/ffprobe processes and tracks long-running jobs.
package ffrun

import (
	"bufio"
	"bytes"
	"context"
	"fmt"
	"io"
	"os/exec"
	"strconv"
	"strings"
	"sync"
)

// Command creates a process that never shows a console window.
func Command(ctx context.Context, bin string, args ...string) *exec.Cmd {
	cmd := exec.CommandContext(ctx, bin, args...)
	hideWindow(cmd)
	return cmd
}

// Output runs the command and returns stdout; on failure the error includes the stderr tail.
func Output(ctx context.Context, bin string, args ...string) ([]byte, error) {
	cmd := Command(ctx, bin, args...)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		if ctx.Err() != nil {
			return stdout.Bytes(), ctx.Err()
		}
		return stdout.Bytes(), fmt.Errorf("%w: %s", err, tail(stderr.String(), 1200))
	}
	return stdout.Bytes(), nil
}

// FFmpeg runs ffmpeg with progress reporting.
// duration is the expected output duration in seconds, used to turn out_time into a 0..1 fraction.
// The full stderr is returned because detection filters print their results there.
func FFmpeg(ctx context.Context, bin string, args []string, duration float64, onProgress func(float64)) (string, error) {
	full := append([]string{"-hide_banner", "-nostdin", "-progress", "pipe:1", "-nostats"}, args...)
	cmd := Command(ctx, bin, full...)

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return "", err
	}
	var stderr syncBuffer
	cmd.Stderr = &stderr

	if err := cmd.Start(); err != nil {
		return "", err
	}

	readProgress(stdout, duration, onProgress)

	err = cmd.Wait()
	if err != nil {
		if ctx.Err() != nil {
			return stderr.String(), ctx.Err()
		}
		return stderr.String(), fmt.Errorf("ffmpeg failed: %s", tail(stderr.String(), 1500))
	}
	if onProgress != nil {
		onProgress(1)
	}
	return stderr.String(), nil
}

func readProgress(r io.Reader, duration float64, onProgress func(float64)) {
	sc := bufio.NewScanner(r)
	for sc.Scan() {
		key, value, ok := strings.Cut(sc.Text(), "=")
		if !ok || onProgress == nil || duration <= 0 {
			continue
		}
		if key == "out_time_us" || key == "out_time_ms" { // both are microseconds
			us, err := strconv.ParseFloat(strings.TrimSpace(value), 64)
			if err == nil && us >= 0 {
				onProgress(min(1, us/1e6/duration))
			}
		}
	}
}

func tail(s string, n int) string {
	s = strings.TrimSpace(s)
	if len(s) <= n {
		return s
	}
	return "..." + s[len(s)-n:]
}

type syncBuffer struct {
	mu  sync.Mutex
	buf bytes.Buffer
}

func (b *syncBuffer) Write(p []byte) (int, error) {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.buf.Write(p)
}

func (b *syncBuffer) String() string {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.buf.String()
}
