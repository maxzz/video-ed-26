import { atom } from "jotai";
import { api, cutter, pathDirname } from "@/backend-api";
import { editorSettings, editorSettingsAtom, ExportMode } from "@/store/3-editor-settings";
import { notice } from "@/ui/local-ui/7-toaster";
import { isJobCanceled, runJob } from "@/features/0-jobs/0-store";
import { currentFileAtom } from "@/features/1-media-file/0-store";
import { effectiveRotationAtom, fileRotationAtom, pauseAtom, rotationOverrideAtom } from "@/features/2-player/0-store";
import { exportSegmentsAtom } from "@/features/4-segments/0-store";
import { enabledStreamIndexesAtom, trackEditsAtom } from "@/features/5-tracks/0-store";
import { outputNamesAtom } from "./1-output-names";

export const isExportDialogOpenAtom = atom(false);

export const isExportingAtom = atom(false);

export type ExportResult = { outputPaths: string[]; outputDir: string; };

export const lastExportResultAtom = atom<ExportResult | null>(null);

/** Export command: opens the dialog first unless the user turned that off. */
export const exportCommandAtom = atom(null, (get, set) => {
    if (!get(currentFileAtom)) {
        return;
    }
    set(pauseAtom);
    if (get(editorSettingsAtom).export.showDialogBeforeExport) {
        set(isExportDialogOpenAtom, true);
    } else {
        set(runExportAtom);
    }
});

export const runExportAtom = atom(null, async (get, set) => {
    const file = get(currentFileAtom);
    const segments = get(exportSegmentsAtom);
    if (!file || get(isExportingAtom)) {
        return;
    }
    if (!segments.length) {
        notice.warning("No segments are selected for export.");
        return;
    }
    const streamIndexes = get(enabledStreamIndexesAtom);
    if (!streamIndexes.length) {
        notice.warning("All tracks are discarded; enable at least one track.");
        return;
    }

    const options = editorSettings.export;
    const names = get(outputNamesAtom);
    const edits = get(trackEditsAtom);
    const rotationChanged = get(rotationOverrideAtom) !== null && get(effectiveRotationAtom) !== get(fileRotationAtom);

    const request = cutter.Request.createFrom({
        inputPath: file.path,
        outputDir: options.outputDir,
        segments: segments.map((s, i) => ({ start: s.start, end: s.end, name: s.name, outputName: names.segments[i] })),
        mode: options.mode,
        mergedOutputName: names.merged,
        streamIndexes,
        keyframeCut: options.keyframeCut,
        smartCut: options.smartCut,
        avoidNegativeTs: options.avoidNegativeTs,
        preserveMetadata: options.preserveMetadata,
        preserveChapters: options.preserveChapters && options.mode === ExportMode.separate,
        segmentsToChapters: options.segmentsToChapters,
        movFaststart: options.movFaststart,
        rotation: rotationChanged ? get(effectiveRotationAtom) : -1,
        trackMeta: Object.entries(edits).map(([index, e]) => ({ index: Number(index), title: e.title ?? "", language: e.language ?? "" })),
        overwrite: options.overwrite,
    });

    set(isExportingAtom, true);
    set(isExportDialogOpenAtom, false);
    try {
        const result = await runJob<ExportResult>(() => api.cutter.Export(request));
        set(lastExportResultAtom, result);
        notice.success(<ExportDoneMessage result={result} />, { duration: 10000 });
    } catch (error) {
        if (!isJobCanceled(error)) {
            notice.error(`Export failed: ${error instanceof Error ? error.message : String(error)}`, { duration: 15000 });
        }
    } finally {
        set(isExportingAtom, false);
    }
});

function ExportDoneMessage({ result }: { result: ExportResult; }) {
    const first = result.outputPaths[0] ?? "";
    return (
        <div className="flex flex-col gap-1">
            <span>Exported {result.outputPaths.length} file(s) to {result.outputDir || pathDirname(first)}</span>
            {first && (
                <button className="w-fit underline cursor-pointer" onClick={() => api.dialogs.RevealInExplorer(first)} type="button">
                    Show in folder
                </button>
            )}
        </div>
    );
}
