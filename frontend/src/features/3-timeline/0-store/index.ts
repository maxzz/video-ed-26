import { atom } from "jotai";
import { resetKeyframesAtom } from "./2-keyframes";
import { resetThumbnailsAtom } from "./3-thumbnails";
import { resetViewportAtom } from "./1-viewport";
import { resetWaveformAtom } from "./4-waveform";

export * from "./1-viewport";
export * from "./2-keyframes";
export * from "./3-thumbnails";
export * from "./4-waveform";

/** Called by the session when a file is opened or closed. */
export const resetTimelineAtom = atom(null, (_get, set) => {
    set(resetViewportAtom);
    set(resetKeyframesAtom);
    set(resetThumbnailsAtom);
    set(resetWaveformAtom);
});
