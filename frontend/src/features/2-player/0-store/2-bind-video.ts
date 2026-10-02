import { atom } from "jotai";
import { hasVideoAtom } from "@/features/1-media-file/0-store";
import {
    currentTimeAtom, mediaElementDurationAtom, mutedAtom, playbackErrorAtom, PlaybackError,
    playbackRateAtom, playingAtom, videoElementAtom, videoSizeAtom, volumeAtom,
} from "./1-player-atoms";

/**
 * Use as the ref callback of the <video> element: `ref={useSetAtom(bindVideoElementAtom)}`.
 * Returns the cleanup that React 19 calls when the element unmounts.
 */
export const bindVideoElementAtom = atom(null, (get, set, el: HTMLVideoElement | null) => {
    if (!el) {
        return;
    }
    set(videoElementAtom, el);

    el.playbackRate = get(playbackRateAtom);
    el.volume = get(volumeAtom);
    el.muted = get(mutedAtom);

    const controller = new AbortController();
    const signal = controller.signal;
    let frame = 0;

    const syncTime = () => set(currentTimeAtom, el.currentTime);

    const loop = () => {
        syncTime();
        frame = el.paused ? 0 : requestAnimationFrame(loop);
    };

    el.addEventListener("play", () => {
        set(playingAtom, true);
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(loop);
    }, { signal });

    el.addEventListener("pause", () => {
        set(playingAtom, false);
        syncTime();
    }, { signal });

    el.addEventListener("ended", () => set(playingAtom, false), { signal });
    el.addEventListener("seeked", syncTime, { signal });
    el.addEventListener("timeupdate", () => el.paused && syncTime(), { signal });
    el.addEventListener("ratechange", () => set(playbackRateAtom, el.playbackRate), { signal });
    el.addEventListener("volumechange", () => {
        set(volumeAtom, el.volume);
        set(mutedAtom, el.muted);
    }, { signal });

    el.addEventListener("loadedmetadata", () => {
        set(mediaElementDurationAtom, Number.isFinite(el.duration) ? el.duration : 0);
        set(videoSizeAtom, { width: el.videoWidth, height: el.videoHeight });

        const videoDoesNotDecode = get(hasVideoAtom) && el.videoWidth === 0;
        set(playbackErrorAtom, videoDoesNotDecode ? PlaybackError.unsupportedVideo : PlaybackError.none);

        el.currentTime = get(currentTimeAtom); // keeps the position when switching to a preview proxy
    }, { signal });

    el.addEventListener("error", () => {
        if (el.getAttribute("src")) {
            set(playbackErrorAtom, PlaybackError.unsupportedFile);
        }
    }, { signal });

    return () => {
        controller.abort();
        cancelAnimationFrame(frame);
        set(videoElementAtom, null);
        set(playingAtom, false);
    };
});
