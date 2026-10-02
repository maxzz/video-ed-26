import { atom, getDefaultStore } from "jotai";
import { observe } from "jotai-effect";
import { api } from "@/backend-api";
import { editorSettingsAtom } from "@/store/3-editor-settings";
import { notice } from "@/ui/local-ui/7-toaster";
import { currentFileAtom } from "@/features/1-media-file/0-store";
import { type MediaFile } from "@/features/1-media-file/9-types";
import { segmentsAtom } from "@/features/4-segments/0-store";
import { createSegment } from "@/features/4-segments/0-store/3-segment-actions";
import { type Segment } from "@/features/4-segments/9-types";
import { parseLlc, serializeLlc } from "./1-llc-format";

const AUTOSAVE_DELAY_MS = 1000;

/** Text last written to (or read from) the project file of the current file. */
let lastSaved: { path: string; text: string; } | null = null;

/** Reads <name>-proj.llc next to the file; returns null when there is none or it cannot be read. */
export async function loadProjectSegments(file: MediaFile): Promise<Segment[] | null> {
    try {
        const text = await api.project.ReadProject(file.path);
        if (!text) {
            lastSaved = { path: file.path, text: "" };
            return null;
        }
        const segments = parseLlc(text, file.info.duration).map((s, i) => ({ ...createSegment(s.start, s.end, i, s.name), tags: s.tags, selected: s.selected }));
        lastSaved = { path: file.path, text: serializeLlc(file.name, segments) };
        return segments.length ? segments : null;
    } catch (error) {
        notice.warning(`Could not read the project file: ${error instanceof Error ? error.message : String(error)}`);
        return null;
    }
}

function isUntouched(file: MediaFile, segments: Segment[]) {
    const [s] = segments;
    return segments.length === 1 && s.start === 0 && Math.abs(s.end - file.info.duration) < 0.001 && !s.name && s.selected;
}

async function save(file: MediaFile, segments: Segment[], force: boolean) {
    const text = serializeLlc(file.name, segments);
    const known = lastSaved?.path === file.path ? lastSaved.text : null;
    if (text === known) {
        return;
    }
    if (!force && !known && isUntouched(file, segments)) {
        return; // do not create project files for files that were only opened
    }
    try {
        await api.project.WriteProject(file.path, text);
        lastSaved = { path: file.path, text };
    } catch (error) {
        console.error("Failed to save the project", error);
    }
}

/** Saves now (Ctrl+S, before switching files). */
export const saveProjectAtom = atom(null, async (get, _set, force: boolean = true) => {
    const file = get(currentFileAtom);
    if (file) {
        await save(file, get(segmentsAtom), force);
    }
});

let timer: ReturnType<typeof setTimeout> | undefined;

export const flushAutosaveAtom = atom(null, async (get, set) => {
    if (timer) {
        clearTimeout(timer);
        timer = undefined;
        if (get(editorSettingsAtom).autosaveProject) {
            await set(saveProjectAtom, false);
        }
    }
});

observe((get) => {
    const file = get(currentFileAtom);
    const segments = get(segmentsAtom);
    if (!file || !get(editorSettingsAtom).autosaveProject) {
        return;
    }
    clearTimeout(timer);
    timer = setTimeout(() => {
        timer = undefined;
        if (getDefaultStore().get(currentFileAtom)?.path === file.path) {
            save(file, segments, false);
        }
    }, AUTOSAVE_DELAY_MS);
});
