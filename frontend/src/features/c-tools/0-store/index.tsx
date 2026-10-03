import { atom } from "jotai";
import { api, pathJoin, pathStem, tools } from "@/backend-api";
import { editorSettings } from "@/store/3-editor-settings";
import { formatTimeForFileName } from "@/utils/time-format";
import { notice } from "@/ui/local-ui/7-toaster";
import { isJobCanceled, runJob } from "@/features/0-jobs/0-store";
import { currentFileAtom } from "@/features/1-media-file/0-store";
import { type ProbeStream } from "@/features/1-media-file/9-types";
import { commandedTimeAtom, pauseAtom } from "@/features/2-player/0-store";

function errorText(error: unknown) {
    return error instanceof Error ? error.message : String(error);
}

function outputDir(inputDir: string) {
    return editorSettings.export.outputDir || inputDir;
}

/** Saves the frame at the playhead as an image next to the file (or in the export folder). */
export const captureSnapshotAtom = atom(null, async (get, set) => {
    const file = get(currentFileAtom);
    if (!file) {
        return;
    }
    set(pauseAtom);
    const t = get(commandedTimeAtom);
    const name = `${pathStem(file.path)}-${formatTimeForFileName(t)}.${editorSettings.captureFormat}`;
    try {
        const saved = await api.tools.CaptureFrame(file.path, t, pathJoin(outputDir(file.dir), name));
        notice.success(<RevealMessage text={`Saved ${name}`} path={saved} />);
    } catch (error) {
        notice.error(`Could not capture the frame: ${errorText(error)}`);
    }
});

/** Writes each stream to its own file. */
export const extractTracksAtom = atom(null, async (get, _set, streams: ProbeStream[]) => {
    const file = get(currentFileAtom);
    if (!file || !streams.length) {
        return;
    }
    const list = streams.map((s) => tools.ExtractStream.createFrom({ index: s.index, codecType: s.codec_type, codecName: s.codec_name, language: s.tags?.language ?? "" }));
    try {
        const paths = await runJob<string[]>(() => api.tools.ExtractTracks(file.path, list, outputDir(file.dir), file.info.duration));
        notice.success(<RevealMessage text={`Extracted ${paths.length} track(s)`} path={paths[0]} />);
    } catch (error) {
        !isJobCanceled(error) && notice.error(`Extraction failed: ${errorText(error)}`);
    }
});

//---------------------------------------------------------------------------
// Merge whole files

export const isMergeFilesDialogOpenAtom = atom(false);

/** Files to concatenate, in order. */
export const mergeFilesListAtom = atom<string[]>([]);

export const isMergingFilesAtom = atom(false);

export const openMergeFilesDialogAtom = atom(null, (_get, set, paths: string[]) => {
    set(mergeFilesListAtom, paths);
    set(isMergeFilesDialogOpenAtom, true);
});

export const mergeFilesAtom = atom(null, async (get, set, options: { outputPath: string; filesToChapters: boolean; }) => {
    const paths = get(mergeFilesListAtom);
    if (paths.length < 2 || get(isMergingFilesAtom)) {
        return;
    }
    set(isMergingFilesAtom, true);
    try {
        const infos = await Promise.all(paths.map((p) => api.probe.ProbeFile(p)));
        const durations = infos.map((i) => i.duration);
        const request = tools.MergeRequest.createFrom({
            paths,
            outputPath: options.outputPath,
            totalDuration: durations.reduce((a, b) => a + b, 0),
            preserveMetadata: editorSettings.export.preserveMetadata,
            filesToChapters: options.filesToChapters,
            durations,
        });
        set(isMergeFilesDialogOpenAtom, false);
        const out = await runJob<string>(() => api.tools.MergeFiles(request));
        notice.success(<RevealMessage text="Files merged" path={out} />);
    } catch (error) {
        !isJobCanceled(error) && notice.error(`Merge failed: ${errorText(error)}`);
    } finally {
        set(isMergingFilesAtom, false);
    }
});

function RevealMessage({ text, path }: { text: string; path?: string; }) {
    return (
        <div className="flex flex-col gap-1">
            <span>{text}</span>
            {path && (
                <button className="w-fit underline cursor-pointer" onClick={() => api.dialogs.RevealInExplorer(path)} type="button">
                    Show in folder
                </button>
            )}
        </div>
    );
}
