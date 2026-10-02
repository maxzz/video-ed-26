package main

import (
	"embed"

	"video-ed-26/backend"
	"video-ed-26/backend/appctx"
	"video-ed-26/backend/cutter"
	"video-ed-26/backend/dialogs"
	"video-ed-26/backend/ffbin"
	"video-ed-26/backend/ffrun"
	"video-ed-26/backend/keyframes"
	"video-ed-26/backend/media"
	"video-ed-26/backend/preview"
	"video-ed-26/backend/probe"
	"video-ed-26/backend/project"
	"video-ed-26/backend/thumbs"
	"video-ed-26/backend/tools"
	"video-ed-26/backend/waveform"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
)

//go:embed all:frontend/dist
var assets embed.FS

//go:embed build/appicon.png
var icon []byte

func main() {
	hold := appctx.New()
	app := backend.NewApp(hold)

	loc := ffbin.NewLocator()
	jobs := ffrun.NewJobs(hold)
	registry := media.NewRegistry()

	// Every service is bound; a new feature adds its service here.
	services := []interface{}{
		app,
		ffbin.NewService(loc),
		ffrun.NewJobsService(jobs),
		media.NewService(registry),
		probe.NewService(loc),
		preview.NewService(loc, jobs, registry),
		keyframes.NewService(loc),
		thumbs.NewService(loc),
		waveform.NewService(loc),
		cutter.NewService(loc, jobs),
		project.NewService(),
		dialogs.NewService(hold),
		tools.NewService(loc, jobs),
	}

	// Load options on startup to get initial width/height
	initialWidth := 1280
	initialHeight := 820

	opts, err := backend.LoadIniFileOptions()
	if err == nil && opts != nil && opts.Bounds != nil {
		bounds := backend.FixBounds(opts.Bounds)
		if bounds != nil {
			initialWidth = bounds.Width
			initialHeight = bounds.Height
		}
	}

	// Create application with options
	openInspector := false
	if err == nil && opts != nil {
		openInspector = opts.DevTools
	}

	err = wails.Run(&options.App{
		Title:     "Video Ed",
		Width:     initialWidth,
		Height:    initialHeight,
		MinWidth:  800,
		MinHeight: 560,
		AssetServer: &assetserver.Options{
			Assets:     assets,
			Middleware: media.Middleware(registry),
		},
		DragAndDrop: &options.DragAndDrop{
			EnableFileDrop:     true,
			DisableWebViewDrop: true,
		},
		BackgroundColour: &options.RGBA{R: 27, G: 38, B: 54, A: 1},
		OnStartup:        app.Startup,
		OnDomReady:       app.DomReady,
		OnBeforeClose:    app.BeforeClose,
		StartHidden:      true,
		Debug: options.Debug{
			OpenInspectorOnStartup: openInspector,
		},
		Bind: services,
	})

	if err != nil {
		println("Error:", err.Error())
	}
}
