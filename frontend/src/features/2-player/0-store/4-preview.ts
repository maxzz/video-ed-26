import { atom } from "jotai";
import { api } from "@/backend-api";
import { notice } from "@/ui/local-ui/7-toaster";
import { runJob, isJobCanceled } from "@/features/0-jobs/0-store";
import { currentFileAtom } from "@/features/1-media-file/0-store";
import { isCreatingPreviewAtom, playbackErrorAtom, PlaybackError, previewAtom, type PreviewMode } from "./1-player-atoms";

/** Converts the current file into a playable proxy; export still uses the original file. */
export const createPreviewAtom = atom(null, async (get, set, mode: PreviewMode) => {
    const file = get(currentFileAtom);
    if (!file || get(isCreatingPreviewAtom)) {
        return;
    }

    set(isCreatingPreviewAtom, true);
    try {
        const result = await runJob<{ url: string; path: string; mode: string; }>(() => api.preview.CreatePreview(file.path, mode, file.info.duration));
        if (get(currentFileAtom)?.path !== file.path) {
            return; // another file was opened meanwhile
        }
        set(previewAtom, { url: result.url, mode });
        set(playbackErrorAtom, PlaybackError.none);
    } catch (error) {
        if (!isJobCanceled(error)) {
            notice.error(`Could not create a preview: ${String(error instanceof Error ? error.message : error)}`);
        }
    } finally {
        set(isCreatingPreviewAtom, false);
    }
});

export const clearPreviewAtom = atom(null, (_get, set) => {
    set(previewAtom, null);
});
