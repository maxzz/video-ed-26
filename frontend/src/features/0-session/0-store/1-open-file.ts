import { atom } from "jotai";
import { api, pathBasename, pathDirname, pathExt } from "@/backend-api";
import { editorSettings } from "@/store/3-editor-settings";
import { notice } from "@/ui/local-ui/7-toaster";
import { currentFileAtom, isOpeningFileAtom } from "@/features/1-media-file/0-store";
import { type MediaFile } from "@/features/1-media-file/9-types";
import { resetPlayerAtom } from "@/features/2-player/0-store";
import { resetTimelineAtom } from "@/features/3-timeline/0-store";
import { resetSegmentsAtom, wholeFileSegment } from "@/features/4-segments/0-store";
import { initTracksAtom } from "@/features/5-tracks/0-store";
import { flushAutosaveAtom, loadProjectSegments } from "@/features/7-project/0-store";
import { addToBatchAtom } from "@/features/d-batch/0-store";

/**
 * Opening and closing files touches every feature; this is the one place that coordinates it.
 * A new feature with per-file state adds its reset here.
 */
export const openFileAtom = atom(null, async (get, set, path: string) => {
    if (get(isOpeningFileAtom) || get(currentFileAtom)?.path === path) {
        return;
    }
    if (pathExt(path) === ".llc") {
        notice.info("Open the media file; its project file next to it is loaded automatically.");
        return;
    }

    set(isOpeningFileAtom, true);
    try {
        await set(flushAutosaveAtom);

        const [info, url] = await Promise.all([api.probe.ProbeFile(path), api.media.RegisterFile(path)]);
        const file: MediaFile = { path, name: pathBasename(path), dir: pathDirname(path), ext: pathExt(path), url, info };

        set(resetPlayerAtom);
        set(resetTimelineAtom);
        set(initTracksAtom, info);
        set(currentFileAtom, file);

        const saved = await loadProjectSegments(file);
        set(resetSegmentsAtom, saved ?? [wholeFileSegment(info.duration)]);

        set(addToBatchAtom, [path]);
        editorSettings.lastOpenDir = file.dir;
        saved && notice.info(`Loaded ${saved.length} segment(s) from the project file.`, { duration: 2500 });
    } catch (error) {
        notice.error(`Could not open ${pathBasename(path)}: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
        set(isOpeningFileAtom, false);
    }
});

/** Opens the first file and adds the others to the batch list. */
export const openFilesAtom = atom(null, async (get, set, paths: string[]) => {
    const media = paths.filter((p) => pathExt(p) !== ".llc");
    if (!media.length) {
        return;
    }
    set(addToBatchAtom, media);
    await set(openFileAtom, media[0]);
});

export const openFileDialogAtom = atom(null, async (_get, set) => {
    try {
        const paths = await api.dialogs.OpenMediaFiles(editorSettings.lastOpenDir);
        paths?.length && await set(openFilesAtom, paths);
    } catch (error) {
        notice.error(String(error));
    }
});

export const closeFileAtom = atom(null, async (_get, set) => {
    await set(flushAutosaveAtom);
    set(resetPlayerAtom);
    set(resetTimelineAtom);
    set(initTracksAtom, null);
    set(resetSegmentsAtom, []);
    set(currentFileAtom, null);
});
