import { atom, getDefaultStore } from "jotai";
import { observe } from "jotai-effect";
import { api } from "@/backend-api";
import { editorSettingsAtom } from "@/store/3-editor-settings";
import { currentFileAtom, hasVideoAtom } from "@/features/1-media-file/0-store";
import { commandedTimeAtom, durationAtom, seekAtom } from "@/features/2-player/0-store";
import { visibleRangeAtom } from "./1-viewport";

/** Keyframes are read lazily in chunks of this many seconds around what is visible. */
const CHUNK = 60;
const MAX_VISIBLE_CHUNKS = 10;

/** Sorted keyframe times of the main video stream, for the chunks loaded so far. */
export const keyframesAtom = atom<number[]>([]);

const loadedChunks = new Set<number>();
const loadingChunks = new Set<number>();
let loadedForPath = "";

export const resetKeyframesAtom = atom(null, (_get, set) => {
    loadedChunks.clear();
    loadingChunks.clear();
    loadedForPath = "";
    set(keyframesAtom, []);
});

/** Loads the keyframe chunks covering [from, to]. */
export const ensureKeyframesAtom = atom(null, async (get, set, from: number, to: number) => {
    const file = get(currentFileAtom);
    if (!file || !get(hasVideoAtom)) {
        return;
    }
    if (loadedForPath !== file.path) {
        set(resetKeyframesAtom);
        loadedForPath = file.path;
    }

    const first = Math.max(0, Math.floor(from / CHUNK));
    const last = Math.floor(Math.min(to, get(durationAtom)) / CHUNK);
    const wanted: number[] = [];
    for (let c = first; c <= last; c++) {
        !loadedChunks.has(c) && !loadingChunks.has(c) && wanted.push(c);
    }

    await Promise.all(wanted.map(async (c) => {
        loadingChunks.add(c);
        try {
            const times = await api.keyframes.GetKeyframes(file.path, c * CHUNK, (c + 1) * CHUNK);
            if (loadedForPath !== file.path) {
                return;
            }
            loadedChunks.add(c);
            set(keyframesAtom, (prev) => [...new Set([...prev, ...times])].sort((a, b) => a - b));
        } catch (error) {
            console.error("Failed to read keyframes", error);
        } finally {
            loadingChunks.delete(c);
        }
    }));
});

let debounce: ReturnType<typeof setTimeout> | undefined;

/** Loads keyframes for the visible range when the view is zoomed in enough to show them. */
observe((get) => {
    const { from, to } = get(visibleRangeAtom);
    const settings = get(editorSettingsAtom);
    const file = get(currentFileAtom);
    if (!file || (!settings.showKeyframes && !settings.snapToKeyframes) || to <= from || to - from > CHUNK * MAX_VISIBLE_CHUNKS) {
        return;
    }
    clearTimeout(debounce);
    debounce = setTimeout(() => getDefaultStore().set(ensureKeyframesAtom, from, to), 250);
});

//---------------------------------------------------------------------------

/** Returns a function that snaps a time to the nearest loaded keyframe when snapping is on. */
export const snapToKeyframeAtom = atom((get) => {
    const enabled = get(editorSettingsAtom).snapToKeyframes;
    const keyframes = get(keyframesAtom);
    return (t: number) => enabled && keyframes.length ? nearest(keyframes, t) : t;
});

export function nearest(sorted: number[], t: number): number {
    let lo = 0;
    let hi = sorted.length - 1;
    while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (sorted[mid] < t) {
            lo = mid + 1;
        } else {
            hi = mid;
        }
    }
    const after = sorted[lo];
    const before = sorted[Math.max(0, lo - 1)];
    return Math.abs(after - t) < Math.abs(t - before) ? after : before;
}

/** Seeks to the previous or next keyframe, loading keyframes around the playhead first. */
export const seekToKeyframeAtom = atom(null, async (get, set, direction: 1 | -1) => {
    const t = get(commandedTimeAtom);
    await set(ensureKeyframesAtom, t - CHUNK, t + CHUNK);
    const keyframes = get(keyframesAtom);
    const target = direction > 0
        ? keyframes.find((k) => k > t + 0.001)
        : [...keyframes].reverse().find((k) => k < t - 0.001);
    target !== undefined && set(seekAtom, target);
});
