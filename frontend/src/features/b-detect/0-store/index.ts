import { atom } from "jotai";
import { api, tools } from "@/backend-api";
import { notice } from "@/ui/local-ui/7-toaster";
import { isJobCanceled, runJob } from "@/features/0-jobs/0-store";
import { currentFileAtom } from "@/features/1-media-file/0-store";
import { addSegmentsFromRangesAtom, segmentsFromBoundariesAtom } from "@/features/4-segments/0-store";
import { type TimeRange } from "@/features/4-segments/9-types";

export const DetectKind = {
    black: "black",
    silence: "silence",
    scene: "scene",
} as const;

export type DetectKind = typeof DetectKind[keyof typeof DetectKind];

export type DetectParams = {
    blackMinDuration: number;
    pictureThreshold: number;
    pixelThreshold: number;
    silenceNoiseDb: number;
    silenceMinDuration: number;
    sceneThreshold: number;
    /** What to do with black/silent parts: mark them as segments, or keep everything else. */
    keep: "detected" | "rest";
};

export const DEFAULT_DETECT_PARAMS: DetectParams = {
    blackMinDuration: 2,
    pictureThreshold: 0.98,
    pixelThreshold: 0.1,
    silenceNoiseDb: -60,
    silenceMinDuration: 2,
    sceneThreshold: 0.3,
    keep: "detected",
};

export const detectDialogKindAtom = atom<DetectKind | null>(null);

export const detectParamsAtom = atom<DetectParams>(DEFAULT_DETECT_PARAMS);

export const isDetectingAtom = atom(false);

export const runDetectAtom = atom(null, async (get, set, kind: DetectKind) => {
    const file = get(currentFileAtom);
    if (!file || get(isDetectingAtom)) {
        return;
    }
    const params = get(detectParamsAtom);
    const request = tools.DetectRequest.createFrom({
        path: file.path,
        kind,
        from: 0,
        to: 0,
        duration: file.info.duration,
        ...params,
    });

    set(isDetectingAtom, true);
    set(detectDialogKindAtom, null);
    try {
        const ranges = await runJob<TimeRange[]>(() => api.tools.Detect(request));
        if (!ranges.length) {
            notice.info(`Nothing detected; segments were not changed.`);
            return;
        }
        if (kind === DetectKind.scene) {
            set(segmentsFromBoundariesAtom, ranges.map((r) => r.start));
        } else if (params.keep === "rest") {
            set(addSegmentsFromRangesAtom, complement(ranges, file.info.duration), true);
        } else {
            set(addSegmentsFromRangesAtom, ranges.map((r) => ({ ...r, name: kind })), true);
        }
        notice.info(`Detected ${ranges.length} ${kind === DetectKind.scene ? "scene change(s)" : `${kind} part(s)`}.`);
    } catch (error) {
        !isJobCanceled(error) && notice.error(`Detection failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
        set(isDetectingAtom, false);
    }
});

function complement(ranges: TimeRange[], duration: number): TimeRange[] {
    const rv: TimeRange[] = [];
    let at = 0;
    for (const r of [...ranges].sort((a, b) => a.start - b.start)) {
        r.start > at && rv.push({ start: at, end: r.start });
        at = Math.max(at, r.end);
    }
    duration > at && rv.push({ start: at, end: duration });
    return rv;
}
