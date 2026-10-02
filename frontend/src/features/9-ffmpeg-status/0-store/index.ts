import { atom } from "jotai";
import { api, isWails, type ffbin } from "@/backend-api";
import { editorSettings } from "@/store/3-editor-settings";

export type FfStatus = ffbin.Status;

export const ffStatusAtom = atom<FfStatus | null>(null);

export const isFfReadyAtom = atom((get) => {
    const status = get(ffStatusAtom);
    return !!status && !!status.ffmpegPath && !!status.ffprobePath;
});

/** Sends the custom ffmpeg folder from settings to the backend and refreshes the status. */
export const initFfStatusAtom = atom(null, async (_get, set) => {
    if (!isWails()) {
        return;
    }
    set(ffStatusAtom, await api.ffbin.SetCustomDir(editorSettings.customFfPath));
});

export const setCustomFfPathAtom = atom(null, async (_get, set, dir: string) => {
    editorSettings.customFfPath = dir.trim();
    set(ffStatusAtom, await api.ffbin.SetCustomDir(editorSettings.customFfPath));
});

export const browseCustomFfPathAtom = atom(null, async (_get, set) => {
    const dir = await api.dialogs.SelectDirectory("Folder with ffmpeg and ffprobe", editorSettings.customFfPath);
    if (dir) {
        await set(setCustomFfPathAtom, dir);
    }
});
