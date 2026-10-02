import * as App from "../../wailsjs/go/backend/App";
import * as Cutter from "../../wailsjs/go/cutter/Service";
import * as Dialogs from "../../wailsjs/go/dialogs/Service";
import * as Ffbin from "../../wailsjs/go/ffbin/Service";
import * as Jobs from "../../wailsjs/go/ffrun/JobsService";
import * as Keyframes from "../../wailsjs/go/keyframes/Service";
import * as Media from "../../wailsjs/go/media/Service";
import * as Preview from "../../wailsjs/go/preview/Service";
import * as Probe from "../../wailsjs/go/probe/Service";
import * as Project from "../../wailsjs/go/project/Service";
import * as Thumbs from "../../wailsjs/go/thumbs/Service";
import * as Tools from "../../wailsjs/go/tools/Service";
import * as Waveform from "../../wailsjs/go/waveform/Service";

export { cutter, dialogs, ffbin, ffrun, probe, thumbs, tools } from "../../wailsjs/go/models";

/**
 * All Go services bound by main.go. Each service is a Go package under backend/;
 * after adding one, run `wails generate module` and add it here.
 */
export const api = {
    app: App,
    cutter: Cutter,
    dialogs: Dialogs,
    ffbin: Ffbin,
    jobs: Jobs,
    keyframes: Keyframes,
    media: Media,
    preview: Preview,
    probe: Probe,
    project: Project,
    thumbs: Thumbs,
    tools: Tools,
    waveform: Waveform,
};

export * from "./1-is-wails";
export * from "./2-events";
export * from "./3-paths";
