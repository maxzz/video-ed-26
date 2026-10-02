// Package project stores the per-file project next to the media file, like LosslessCut's <name>-proj.llc.
//
// The content is JSON5 text produced and parsed by the frontend, so the format stays
// compatible with LosslessCut projects.
package project

import (
	"errors"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
)

const Suffix = "-proj.llc"

func PathFor(mediaPath string) string {
	dir := filepath.Dir(mediaPath)
	base := strings.TrimSuffix(filepath.Base(mediaPath), filepath.Ext(mediaPath))
	return filepath.Join(dir, base+Suffix)
}

// Service is bound to the frontend.
type Service struct{}

func NewService() *Service {
	return &Service{}
}

func (s *Service) ProjectPath(mediaPath string) string {
	return PathFor(mediaPath)
}

// ReadProject returns the project text, or an empty string if there is no project file.
func (s *Service) ReadProject(mediaPath string) (string, error) {
	b, err := os.ReadFile(PathFor(mediaPath))
	if errors.Is(err, fs.ErrNotExist) {
		return "", nil
	}
	if err != nil {
		return "", err
	}
	return strings.TrimPrefix(string(b), "\uFEFF"), nil
}

func (s *Service) WriteProject(mediaPath, text string) error {
	p := PathFor(mediaPath)
	tmp := p + ".tmp"
	if err := os.WriteFile(tmp, []byte(text), 0o644); err != nil {
		return err
	}
	return os.Rename(tmp, p)
}

func (s *Service) DeleteProject(mediaPath string) error {
	err := os.Remove(PathFor(mediaPath))
	if errors.Is(err, fs.ErrNotExist) {
		return nil
	}
	return err
}
