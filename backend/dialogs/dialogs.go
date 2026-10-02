// Package dialogs wraps native file dialogs and small file-system helpers for the frontend.
package dialogs

import (
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"

	wruntime "github.com/wailsapp/wails/v2/pkg/runtime"

	"video-ed-26/backend/appctx"
)

const mediaPattern = "*.mp4;*.m4v;*.mov;*.mkv;*.webm;*.avi;*.wmv;*.flv;*.ts;*.mts;*.m2ts;*.mpg;*.mpeg;*.3gp;*.ogv;*.mp3;*.m4a;*.aac;*.wav;*.flac;*.ogg;*.opus;*.wma"

type FileFilter struct {
	DisplayName string `json:"displayName"`
	Pattern     string `json:"pattern"`
}

// Service is bound to the frontend.
type Service struct {
	hold *appctx.Holder
}

func NewService(hold *appctx.Holder) *Service {
	return &Service{hold: hold}
}

func toWails(filters []FileFilter) []wruntime.FileFilter {
	rv := make([]wruntime.FileFilter, 0, len(filters))
	for _, f := range filters {
		rv = append(rv, wruntime.FileFilter{DisplayName: f.DisplayName, Pattern: f.Pattern})
	}
	return rv
}

func mediaFilters() []wruntime.FileFilter {
	return []wruntime.FileFilter{
		{DisplayName: "Media files", Pattern: mediaPattern},
		{DisplayName: "All files", Pattern: "*.*"},
	}
}

func (s *Service) OpenMediaFiles(defaultDir string) ([]string, error) {
	return wruntime.OpenMultipleFilesDialog(s.hold.Ctx(), wruntime.OpenDialogOptions{
		Title:            "Open media files",
		DefaultDirectory: existingDir(defaultDir),
		Filters:          mediaFilters(),
	})
}

func (s *Service) OpenFile(title, defaultDir string, filters []FileFilter) (string, error) {
	return wruntime.OpenFileDialog(s.hold.Ctx(), wruntime.OpenDialogOptions{
		Title:            title,
		DefaultDirectory: existingDir(defaultDir),
		Filters:          toWails(filters),
	})
}

func (s *Service) SelectDirectory(title, defaultDir string) (string, error) {
	return wruntime.OpenDirectoryDialog(s.hold.Ctx(), wruntime.OpenDialogOptions{
		Title:                title,
		DefaultDirectory:     existingDir(defaultDir),
		CanCreateDirectories: true,
	})
}

func (s *Service) SaveFile(title, defaultDir, defaultName string, filters []FileFilter) (string, error) {
	return wruntime.SaveFileDialog(s.hold.Ctx(), wruntime.SaveDialogOptions{
		Title:                title,
		DefaultDirectory:     existingDir(defaultDir),
		DefaultFilename:      defaultName,
		Filters:              toWails(filters),
		CanCreateDirectories: true,
	})
}

// RevealInExplorer opens the file manager with the file selected.
func (s *Service) RevealInExplorer(path string) error {
	switch runtime.GOOS {
	case "windows":
		return exec.Command("explorer", "/select,", filepath.Clean(path)).Start()
	case "darwin":
		return exec.Command("open", "-R", path).Start()
	default:
		return exec.Command("xdg-open", filepath.Dir(path)).Start()
	}
}

// OpenPath opens a file or folder with the default application.
func (s *Service) OpenPath(path string) error {
	switch runtime.GOOS {
	case "windows":
		return exec.Command("explorer", filepath.Clean(path)).Start()
	case "darwin":
		return exec.Command("open", path).Start()
	default:
		return exec.Command("xdg-open", path).Start()
	}
}

func (s *Service) ReadTextFile(path string) (string, error) {
	b, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}
	return strings.TrimPrefix(string(b), "\uFEFF"), nil
}

func (s *Service) WriteTextFile(path, text string) error {
	return os.WriteFile(path, []byte(text), 0o644)
}

func (s *Service) FileExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}

func existingDir(dir string) string {
	if dir == "" {
		return ""
	}
	if st, err := os.Stat(dir); err == nil && st.IsDir() {
		return dir
	}
	return ""
}
