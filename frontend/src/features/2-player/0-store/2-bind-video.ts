import { atom } from "jotai";
import { hasVideoAtom } from "@/features/1-media-file/0-store";
import {
    commandedTimeAtom, currentTimeAtom, mediaElementDurationAtom, mutedAtom, playbackErrorAtom, PlaybackError,
    playbackRateAtom, playingAtom, videoElementAtom, videoSizeAtom, volumeAtom,
} from "./1-player-atoms";
import { isSeekInFlight, onSmoothSeeked, resetSmoothSeek, smoothSeek } from "./5-smooth-seek";

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

    // While a scrub is decoding, `currentTime` already reads as the seek target, not the shown frame.
    // Only `seeked` publishes that displayed frame. While paused, the playhead stays where the user
    // put it; playback is what moves the playhead along with the video.
    const followPlayback = () => {
        if (isSeekInFlight()) {
            return;
        }
        const t = el.currentTime;
        set(currentTimeAtom, t);
        set(commandedTimeAtom, t);
    };

    const loop = () => {
        followPlayback();
        frame = el.paused ? 0 : requestAnimationFrame(loop);
    };

    el.addEventListener("play", () => {
        set(playingAtom, true);
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(loop);
    }, { signal });

    el.addEventListener("pause", () => {
        set(playingAtom, false);
        followPlayback();
    }, { signal });

    el.addEventListener("ended", () => set(playingAtom, false), { signal });
    el.addEventListener("seeked", () => {
        const displayed = onSmoothSeeked(el);
        if (displayed != null) {
            set(currentTimeAtom, displayed);
        }
    }, { signal });
    el.addEventListener("timeupdate", () => {
        if (el.paused && !isSeekInFlight()) {
            set(currentTimeAtom, el.currentTime);
        }
    }, { signal });
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

        const commanded = get(commandedTimeAtom);
        if (Math.abs(el.currentTime - commanded) > 0.001) {
            smoothSeek(el, commanded); // keeps the position when switching to a preview proxy
        }
    }, { signal });

    el.addEventListener("error", () => {
        if (el.getAttribute("src")) {
            set(playbackErrorAtom, PlaybackError.unsupportedFile);
        }
    }, { signal });

    return () => {
        controller.abort();
        cancelAnimationFrame(frame);
        resetSmoothSeek();
        set(videoElementAtom, null);
        set(playingAtom, false);
    };
});
