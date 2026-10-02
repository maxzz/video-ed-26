// Package media serves local files to the webview through the Wails AssetServer.
//
// Only files registered from the backend are served, so the page cannot read arbitrary paths.
// URLs look like /media/<id>/<name>.<ext>. They are intercepted by Middleware before the
// assets (or, in wails dev, the Vite proxy that would answer with index.html) see them.
package media

import (
	"fmt"
	"mime"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"sync"
)

const URLPrefix = "/media/"

type Registry struct {
	mu     sync.RWMutex
	byID   map[string]string
	byPath map[string]string
	next   int
}

func NewRegistry() *Registry {
	return &Registry{byID: map[string]string{}, byPath: map[string]string{}}
}

// Register makes the file available and returns its URL.
func (r *Registry) Register(path string) (string, error) {
	abs, err := filepath.Abs(path)
	if err != nil {
		return "", err
	}
	st, err := os.Stat(abs)
	if err != nil {
		return "", err
	}
	if st.IsDir() {
		return "", fmt.Errorf("%q is a folder", abs)
	}

	r.mu.Lock()
	defer r.mu.Unlock()

	id, ok := r.byPath[abs]
	if !ok {
		r.next++
		id = fmt.Sprintf("f%d", r.next)
		r.byID[id] = abs
		r.byPath[abs] = id
	}
	return URLPrefix + id + "/" + urlName(abs), nil
}

func (r *Registry) lookup(id string) (string, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	p, ok := r.byID[id]
	return p, ok
}

func urlName(path string) string {
	ext := filepath.Ext(path)
	if ext == "" {
		ext = ".bin"
	}
	return "file" + strings.ToLower(ext)
}

//---------------------------------------------------------------------------

// Handler serves registered files with Range support via http.ServeContent.
type Handler struct {
	reg *Registry
}

func NewHandler(reg *Registry) *Handler {
	return &Handler{reg: reg}
}

// Middleware serves /media/ requests and passes everything else to the assets.
func Middleware(reg *Registry) func(next http.Handler) http.Handler {
	h := NewHandler(reg)
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
			if strings.HasPrefix(req.URL.Path, URLPrefix) {
				h.ServeHTTP(w, req)
				return
			}
			next.ServeHTTP(w, req)
		})
	}
}

func (h *Handler) ServeHTTP(w http.ResponseWriter, req *http.Request) {
	if !strings.HasPrefix(req.URL.Path, URLPrefix) {
		http.NotFound(w, req)
		return
	}
	rest := strings.TrimPrefix(req.URL.Path, URLPrefix)
	id, _, _ := strings.Cut(rest, "/")
	id, _ = url.PathUnescape(id)

	path, ok := h.reg.lookup(id)
	if !ok {
		http.NotFound(w, req)
		return
	}

	f, err := os.Open(path)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}
	defer f.Close()

	st, err := f.Stat()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", contentType(path))
	w.Header().Set("Cache-Control", "no-cache")
	http.ServeContent(w, req, filepath.Base(path), st.ModTime(), f)
}

var mediaTypes = map[string]string{
	".mp4":  "video/mp4",
	".m4v":  "video/mp4",
	".mov":  "video/mp4",
	".webm": "video/webm",
	".mkv":  "video/webm", // Chromium plays Matroska when it is labeled as WebM
	".ogv":  "video/ogg",
	".mp3":  "audio/mpeg",
	".m4a":  "audio/mp4",
	".aac":  "audio/aac",
	".wav":  "audio/wav",
	".flac": "audio/flac",
	".ogg":  "audio/ogg",
	".opus": "audio/ogg",
	".png":  "image/png",
	".jpg":  "image/jpeg",
	".jpeg": "image/jpeg",
}

func contentType(path string) string {
	ext := strings.ToLower(filepath.Ext(path))
	if t, ok := mediaTypes[ext]; ok {
		return t
	}
	if t := mime.TypeByExtension(ext); t != "" {
		return t
	}
	return "application/octet-stream"
}

//---------------------------------------------------------------------------

// Service is bound to the frontend.
type Service struct {
	reg *Registry
}

func NewService(reg *Registry) *Service {
	return &Service{reg: reg}
}

// RegisterFile returns the URL to load the file in a <video>, <audio> or <img> element.
func (s *Service) RegisterFile(path string) (string, error) {
	return s.reg.Register(path)
}
