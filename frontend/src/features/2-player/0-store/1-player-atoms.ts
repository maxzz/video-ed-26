import { atom } from "jotai";
import { currentFileAtom, fileDurationAtom, mainVideoStreamAtom } from "@/features/1-media-file/0-store";

export const videoElementAtom = atom<HTMLVideoElement | null>(null);

/** Playhead position in seconds; updated every animation frame while playing. */
export const currentTimeAtom = atom(0);

export const playingAtom = atom(false);

export const playbackRateAtom = atom(1);

export const volumeAtom = atom(1);

export const mutedAtom = atom(false);

/** Duration reported by the <video> element; the probe duration is preferred when known. */
export const mediaElementDurationAtom = atom(0);

export const durationAtom = atom((get) => get(fileDurationAtom) || get(mediaElementDurationAtom));

export const videoSizeAtom = atom({ width: 0, height: 0 });

export const PlaybackError = {
    none: "",
    unsupportedFile: "unsupported-file",   // the webview cannot open the container
    unsupportedVideo: "unsupported-video", // the container opens but the video codec does not decode
} as const;

export type PlaybackError = typeof PlaybackError[keyof typeof PlaybackError];

export const playbackErrorAtom = atom<PlaybackError>(PlaybackError.none);

//---------------------------------------------------------------------------
// Preview proxy (html5ify)

export const PreviewMode = {
    remux: "remux",
    fastAudio: "fast-audio",
    fast: "fast",
    slow: "slow",
} as const;

export type PreviewMode = typeof PreviewMode[keyof typeof PreviewMode];

export const previewAtom = atom<{ url: string; mode: PreviewMode; } | null>(null);

export const isCreatingPreviewAtom = atom(false);

/** What the <video> element plays: the preview proxy when there is one, otherwise the file itself. */
export const mediaSrcAtom = atom((get) => get(previewAtom)?.url ?? get(currentFileAtom)?.url ?? "");

//---------------------------------------------------------------------------
// Rotation

/** Rotation chosen by the user (clockwise degrees); null keeps the file's own rotation. Also applied on export. */
export const rotationOverrideAtom = atom<number | null>(null);

export const fileRotationAtom = atom((get) => get(mainVideoStreamAtom)?.rotation ?? 0);

export const effectiveRotationAtom = atom((get) => get(rotationOverrideAtom) ?? get(fileRotationAtom));

/**
 * Extra CSS rotation for the preview. The webview already applies the file's own rotation,
 * so only the difference is added.
 */
export const previewRotationAtom = atom((get) => {
    const override = get(rotationOverrideAtom);
    return override === null ? 0 : (override - get(fileRotationAtom) + 360) % 360;
});
