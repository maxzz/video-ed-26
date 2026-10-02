import { atom } from "jotai";
import { fpsAtom } from "@/features/1-media-file/0-store";
import {
    currentTimeAtom, durationAtom, mediaElementDurationAtom, mutedAtom, playbackErrorAtom, PlaybackError,
    playbackRateAtom, playingAtom, previewAtom, rotationOverrideAtom, effectiveRotationAtom, videoElementAtom, videoSizeAtom,
} from "./1-player-atoms";

export const togglePlayAtom = atom(null, (get) => {
    const el = get(videoElementAtom);
    if (!el || !el.getAttribute("src")) {
        return;
    }
    if (el.paused) {
        el.play().catch(console.error);
    } else {
        el.pause();
    }
});

export const pauseAtom = atom(null, (get) => {
    get(videoElementAtom)?.pause();
});

export const seekAtom = atom(null, (get, set, time: number) => {
    const duration = get(durationAtom);
    const t = Math.max(0, duration > 0 ? Math.min(time, duration) : time);
    const el = get(videoElementAtom);
    if (el) {
        el.currentTime = t;
    }
    set(currentTimeAtom, t);
});

export const seekRelativeAtom = atom(null, (get, set, delta: number) => {
    set(seekAtom, get(currentTimeAtom) + delta);
});

export const stepFrameAtom = atom(null, (get, set, direction: 1 | -1) => {
    get(videoElementAtom)?.pause();
    set(seekRelativeAtom, direction / get(fpsAtom));
});

export const seekToStartAtom = atom(null, (_get, set) => set(seekAtom, 0));

export const seekToEndAtom = atom(null, (get, set) => set(seekAtom, get(durationAtom)));

//---------------------------------------------------------------------------

const RATES = [0.1, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4, 8, 16];

export const setPlaybackRateAtom = atom(null, (get, set, rate: number) => {
    const r = Math.min(16, Math.max(0.1, rate));
    const el = get(videoElementAtom);
    if (el) {
        el.playbackRate = r;
    }
    set(playbackRateAtom, r);
});

/** J/L keys: step the playback speed down or up; L also starts playback when paused. */
export const changePlaybackRateAtom = atom(null, (get, set, direction: 1 | -1) => {
    const current = get(playbackRateAtom);
    const next = direction > 0 ? RATES.find((r) => r > current + 1e-6) : [...RATES].reverse().find((r) => r < current - 1e-6);
    set(setPlaybackRateAtom, next ?? current);

    const el = get(videoElementAtom);
    if (direction > 0 && el?.paused && el.getAttribute("src")) {
        el.play().catch(console.error);
    }
});

export const setVolumeAtom = atom(null, (get, set, volume: number) => {
    const el = get(videoElementAtom);
    const v = Math.min(1, Math.max(0, volume));
    if (el) {
        el.volume = v;
        el.muted = v === 0;
    }
});

export const toggleMuteAtom = atom(null, (get, set) => {
    const el = get(videoElementAtom);
    if (el) {
        el.muted = !el.muted;
    } else {
        set(mutedAtom, !get(mutedAtom));
    }
});

/** Rotates the preview and the exported file by 90° clockwise. */
export const rotateAtom = atom(null, (get, set) => {
    set(rotationOverrideAtom, (get(effectiveRotationAtom) + 90) % 360);
});

/** Called by the session when a file is opened or closed. */
export const resetPlayerAtom = atom(null, (get, set) => {
    get(videoElementAtom)?.pause();
    set(currentTimeAtom, 0);
    set(playingAtom, false);
    set(mediaElementDurationAtom, 0);
    set(videoSizeAtom, { width: 0, height: 0 });
    set(playbackErrorAtom, PlaybackError.none);
    set(previewAtom, null);
    set(rotationOverrideAtom, null);
});
