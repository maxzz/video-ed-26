import { observe } from "jotai-effect";
import { api } from "@/backend-api";
import { currentFileAtom, hasVideoAtom } from "@/features/1-media-file/0-store";

/**
 * Keyframe times for the open file, used so a drag can show a frame without decoding the GOP.
 * This file's keyframes are several seconds apart; an exact seek waits out that whole interval.
 */
let times: number[] = [];
let loadedPath = "";
let loadingPath = "";
let request = 0;

export function nearestScrubKeyframe(t: number): number | null {
    return times.length ? nearestKeyframeTime(times, t) : null;
}

export function nearestKeyframeTime(sorted: number[], t: number): number {
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

observe((get) => {
    const file = get(currentFileAtom);
    const video = get(hasVideoAtom);
    if (!file || !video) {
        request++;
        times = [];
        loadedPath = "";
        loadingPath = "";
        return;
    }
    if (file.path === loadedPath || file.path === loadingPath) {
        return;
    }

    const path = file.path;
    const id = ++request;
    loadingPath = path;
    times = [];
    api.keyframes.GetKeyframes(path, 0, 0).then((list) => {
        if (id !== request) {
            return;
        }
        times = list;
        loadedPath = path;
    }).catch((error) => {
        console.error("Failed to read keyframes for scrubbing", error);
        if (id === request) {
            loadingPath = "";
        }
    });
});
