import { atom } from "jotai";
import { isCoverArt, StreamType, type MediaFile } from "../9-types";

/** The file being edited. Opening and closing files is orchestrated by features/0-session. */
export const currentFileAtom = atom<MediaFile | null>(null);

export const isOpeningFileAtom = atom(false);

export const isFileInfoDialogOpenAtom = atom(false);

export const fileDurationAtom = atom((get) => get(currentFileAtom)?.info.duration ?? 0);

export const streamsAtom = atom((get) => get(currentFileAtom)?.info.streams ?? []);

export const mainVideoStreamAtom = atom((get) => get(streamsAtom).find((s) => s.codec_type === StreamType.video && !isCoverArt(s)));

export const hasVideoAtom = atom((get) => !!get(mainVideoStreamAtom));

export const hasAudioAtom = atom((get) => get(streamsAtom).some((s) => s.codec_type === StreamType.audio));

/** Frames per second of the main video stream; 25 when unknown (used for frame stepping). */
export const fpsAtom = atom((get) => {
    const fps = get(mainVideoStreamAtom)?.fps ?? 0;
    return fps > 0 && fps < 1000 ? fps : 25;
});

export const chaptersAtom = atom((get) => get(currentFileAtom)?.info.chapters ?? []);
