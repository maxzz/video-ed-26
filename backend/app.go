package backend

import (
	"context"

	"video-ed-26/backend/appctx"
)

// App struct
type App struct {
	ctx  context.Context
	hold *appctx.Holder
}

// NewApp creates a new App application struct
func NewApp(hold *appctx.Holder) *App {
	return &App{hold: hold}
}

// Startup is called at application startup
func (a *App) Startup(ctx context.Context) {
	a.ctx = ctx
	a.hold.Set(ctx)
}

// DomReady is called after front-end resources have been loaded
func (a *App) DomReady(ctx context.Context) {
	a.restoreWindowOptions(ctx)
}

// BeforeClose is called when the application is about to quit,
// either by clicking the window close button or calling runtime.Quit.
// Returning true will cause the application to continue, false will continue shutdown as normal.
func (a *App) BeforeClose(ctx context.Context) (prevent bool) {
	a.saveWindowOptions(ctx)
	return false
}

// SetDevToolsState sets DevTools state explicitly and persists it to the ini file.
func (a *App) SetDevToolsState(open bool) {
	a.saveDevToolsState(open)
}

// ToggleDevTools flips DevTools visibility and persists the new state to the ini file.
func (a *App) ToggleDevTools() {
	if a.platformIsDevToolsOpen() {
		a.platformCloseDevTools()
		a.SetDevToolsState(false)
		return
	}

	a.SetDevToolsState(true)
}

func (a *App) saveDevToolsState(open bool) {
	opts, err := LoadIniFileOptions()
	if err != nil {
		opts = &IniOptions{}
	}
	opts.DevTools = open
	saveIniFileOptions(opts)
}
