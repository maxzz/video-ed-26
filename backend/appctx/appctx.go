// Package appctx shares the Wails runtime context with services that are created before startup.
package appctx

import (
	"context"
	"sync"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type Holder struct {
	mu  sync.RWMutex
	ctx context.Context
}

func New() *Holder {
	return &Holder{}
}

func (h *Holder) Set(ctx context.Context) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.ctx = ctx
}

// Ctx returns the Wails runtime context, or context.Background before startup.
func (h *Holder) Ctx() context.Context {
	h.mu.RLock()
	defer h.mu.RUnlock()
	if h.ctx == nil {
		return context.Background()
	}
	return h.ctx
}

func (h *Holder) Ready() bool {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return h.ctx != nil
}

// Emit sends an event to the frontend; it is a no-op before startup.
func (h *Holder) Emit(name string, data ...interface{}) {
	if !h.Ready() {
		return
	}
	runtime.EventsEmit(h.Ctx(), name, data...)
}
