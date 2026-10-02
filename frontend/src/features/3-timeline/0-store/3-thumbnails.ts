import { atom, getDefaultStore } from "jotai";
import { observe } from "jotai-effect";
import { api } from "@/backend-api";
import { editorSettingsAtom } from "@/store/3-editor-settings";
import { currentFileAtom, hasVideoAtom } from "@/features/1-media-file/0-store";
import { secondsPerPixelAtom, visibleRangeAtom, viewportWidthAtom } from "./1-viewport";

export const THUMB_HEIGHT = 40;
const THUMB_WIDTH = Math.round(THUMB_HEIGHT * 16 / 9);

export type TimelineThumb = { time: number; url: string; };

/** Thumbnails for the visible part of the timeline, one per THUMB_WIDTH pixels. */
export const thumbnailsAtom = atom<TimelineThumb[]>([]);

export const thumbWidthAtom = atom(() => THUMB_WIDTH);

const cache = new Map<string, string>(); // `${path}|${time}` -> data URL
let debounce: ReturnType<typeof setTimeout> | undefined;
let generation = 0;

export const resetThumbnailsAtom = atom(null, (_get, set) => {
    cache.clear();
    generation++;
    set(thumbnailsAtom, []);
});

observe((get) => {
    const file = get(currentFileAtom);
    const enabled = get(editorSettingsAtom).showThumbnails && get(hasVideoAtom);
    const { from } = get(visibleRangeAtom);
    const width = get(viewportWidthAtom);
    const spp = get(secondsPerPixelAtom);

    clearTimeout(debounce);
    if (!file || !enabled || width <= 0 || spp <= 0) {
        return;
    }

    const step = THUMB_WIDTH * spp;
    const first = Math.floor(from / step);
    const count = Math.ceil(width / THUMB_WIDTH) + 1;
    const times = Array.from({ length: count }, (_, i) => round((first + i) * step))
        .filter((t) => t < file.info.duration);

    const store = getDefaultStore();
    const known = times.filter((t) => cache.has(key(file.path, t)));
    store.set(thumbnailsAtom, known.map((t) => ({ time: t, url: cache.get(key(file.path, t))! })));

    const missing = times.filter((t) => !cache.has(key(file.path, t)));
    if (!missing.length) {
        return;
    }

    const gen = ++generation;
    debounce = setTimeout(async () => {
        try {
            const result = await api.thumbs.GetThumbnails(file.path, missing.map((t) => t + step / 2), THUMB_HEIGHT * 2);
            result.forEach((r) => cache.set(key(file.path, round(r.time - step / 2)), r.dataUrl));
            if (gen === generation) {
                store.set(thumbnailsAtom, times.filter((t) => cache.has(key(file.path, t))).map((t) => ({ time: t, url: cache.get(key(file.path, t))! })));
            }
        } catch (error) {
            console.error("Failed to render thumbnails", error);
        }
    }, 300);
});

function key(path: string, t: number) {
    return `${path}|${t}`;
}

function round(t: number) {
    return Math.round(t * 1000) / 1000;
}
