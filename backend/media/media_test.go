package media

import (
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
)

func TestHandlerServesRegisteredFileWithRange(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "clip.mp4")
	if err := os.WriteFile(path, []byte("0123456789"), 0o644); err != nil {
		t.Fatal(err)
	}

	reg := NewRegistry()
	u, err := reg.Register(path)
	if err != nil {
		t.Fatal(err)
	}

	req := httptest.NewRequest(http.MethodGet, u, nil)
	req.Header.Set("Range", "bytes=2-5")
	rec := httptest.NewRecorder()
	NewHandler(reg).ServeHTTP(rec, req)

	if rec.Code != http.StatusPartialContent {
		t.Fatalf("status = %d, want 206", rec.Code)
	}
	body, _ := io.ReadAll(rec.Body)
	if string(body) != "2345" {
		t.Fatalf("body = %q", body)
	}
	if ct := rec.Header().Get("Content-Type"); ct != "video/mp4" {
		t.Fatalf("content type = %q", ct)
	}
}

func TestHandlerRejectsUnknownID(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/media/f99/file.mp4", nil)
	rec := httptest.NewRecorder()
	NewHandler(NewRegistry()).ServeHTTP(rec, req)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want 404", rec.Code)
	}
}
