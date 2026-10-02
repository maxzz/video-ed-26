import { EventsOn, OnFileDrop } from "../../wailsjs/runtime/runtime";
import type { ffrun } from "../../wailsjs/go/models";
import { isWails } from "./1-is-wails";

/** Must match ffrun.EventJobUpdate in backend/ffrun/jobs.go */
const EVENT_JOB_UPDATE = "job:update";

export type Job = ffrun.Job;

export function onJobUpdate(callback: (job: Job) => void): () => void {
    if (!isWails()) {
        return () => { };
    }
    return EventsOn(EVENT_JOB_UPDATE, callback);
}

/** Files dropped anywhere on the window (main.go enables DragAndDrop.EnableFileDrop). */
export function onFilesDropped(callback: (paths: string[]) => void): void {
    if (!isWails()) {
        return;
    }
    OnFileDrop((_x, _y, paths) => callback(paths), false);
}
