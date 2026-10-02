// Package ffbin locates the ffmpeg and ffprobe executables.
//
// Lookup order matches LosslessCut: the custom directory from settings,
// then the ffmpeg folder next to the executable, then PATH.
package ffbin

import (
	"context"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"time"

	"video-ed-26/backend/ffrun"
)

type Locator struct {
	mu        sync.RWMutex
	customDir string
}

func NewLocator() *Locator {
	return &Locator{}
}

func (l *Locator) SetCustomDir(dir string) {
	l.mu.Lock()
	defer l.mu.Unlock()
	l.customDir = strings.TrimSpace(dir)
}

func (l *Locator) CustomDir() string {
	l.mu.RLock()
	defer l.mu.RUnlock()
	return l.customDir
}

func (l *Locator) FFmpeg() (string, error) {
	return l.find("ffmpeg")
}

func (l *Locator) FFprobe() (string, error) {
	return l.find("ffprobe")
}

func exeName(name string) string {
	if runtime.GOOS == "windows" {
		return name + ".exe"
	}
	return name
}

func (l *Locator) find(name string) (string, error) {
	file := exeName(name)

	if dir := l.CustomDir(); dir != "" {
		p := filepath.Join(dir, file)
		if isFile(p) {
			return p, nil
		}
		return "", fmt.Errorf("%s not found in custom folder %q", file, dir)
	}

	for _, dir := range bundledDirs() {
		p := filepath.Join(dir, file)
		if isFile(p) {
			return p, nil
		}
	}

	p, err := exec.LookPath(file)
	if err != nil {
		return "", fmt.Errorf("%s not found next to the app or in PATH", file)
	}
	return p, nil
}

func bundledDirs() []string {
	exe, err := os.Executable()
	if err != nil {
		return nil
	}
	dir := filepath.Dir(exe)
	return []string{
		filepath.Join(dir, "ffmpeg"),
		filepath.Join(dir, "ffmpeg", runtime.GOOS+"-"+runtime.GOARCH),
		dir,
	}
}

func isFile(p string) bool {
	st, err := os.Stat(p)
	return err == nil && !st.IsDir()
}

//---------------------------------------------------------------------------

type Status struct {
	FfmpegPath    string `json:"ffmpegPath"`
	FfprobePath   string `json:"ffprobePath"`
	FfmpegVersion string `json:"ffmpegVersion"`
	CustomDir     string `json:"customDir"`
	Error         string `json:"error"`
}

// Service is bound to the frontend.
type Service struct {
	loc *Locator
}

func NewService(loc *Locator) *Service {
	return &Service{loc: loc}
}

func (s *Service) GetStatus() Status {
	st := Status{CustomDir: s.loc.CustomDir()}
	var errs []string

	ffmpeg, err := s.loc.FFmpeg()
	if err != nil {
		errs = append(errs, err.Error())
	} else {
		st.FfmpegPath = ffmpeg
		st.FfmpegVersion = version(ffmpeg)
	}

	ffprobe, err := s.loc.FFprobe()
	if err != nil {
		errs = append(errs, err.Error())
	} else {
		st.FfprobePath = ffprobe
	}

	st.Error = strings.Join(errs, "; ")
	return st
}

// SetCustomDir sets the folder with ffmpeg and ffprobe; an empty string restores the default lookup.
func (s *Service) SetCustomDir(dir string) Status {
	s.loc.SetCustomDir(dir)
	return s.GetStatus()
}

func version(ffmpeg string) string {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	out, err := ffrun.Output(ctx, ffmpeg, "-hide_banner", "-version")
	if err != nil {
		var ee *exec.ExitError
		if !errors.As(err, &ee) {
			return ""
		}
	}
	line, _, _ := strings.Cut(string(out), "\n")
	line = strings.TrimPrefix(strings.TrimSpace(line), "ffmpeg version ")
	ver, _, _ := strings.Cut(line, " ")
	return ver
}
