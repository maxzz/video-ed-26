import { atom } from "jotai";
import { api, dialogs, pathBasename, pathStem } from "@/backend-api";
import { notice } from "@/ui/local-ui/7-toaster";
import { currentFileAtom } from "@/features/1-media-file/0-store";
import { addSegmentsFromRangesAtom, segmentsAtom } from "@/features/4-segments/0-store";
import { serializeLlc } from "@/features/7-project/0-store/1-llc-format";
import { detectFormat, FORMAT_INFO, parseSegments, SegmentsFormat, toCsv, toEdl, toYouTube } from "./1-formats";

const importFilters = [
    dialogs.FileFilter.createFrom({ displayName: "Segment files", pattern: "*.csv;*.txt;*.edl;*.cue;*.llc" }),
    dialogs.FileFilter.createFrom({ displayName: "All files", pattern: "*.*" }),
];

export const importSegmentsAtom = atom(null, async (get, set) => {
    const file = get(currentFileAtom);
    if (!file) {
        return;
    }
    try {
        const path = await api.dialogs.OpenFile("Import segments", file.dir, importFilters);
        if (!path) {
            return;
        }
        const text = await api.dialogs.ReadTextFile(path);
        const format = detectFormat(path, text);
        const ranges = parseSegments(format, text, file.info.duration);
        set(addSegmentsFromRangesAtom, ranges, true);
        ranges.length && notice.info(`Imported ${ranges.length} segment(s) from ${pathBasename(path)} (${FORMAT_INFO[format].label}).`);
    } catch (error) {
        notice.error(`Import failed: ${error instanceof Error ? error.message : String(error)}`);
    }
});

export const exportSegmentsToFileAtom = atom(null, async (get, _set, format: SegmentsFormat) => {
    const file = get(currentFileAtom);
    if (!file) {
        return;
    }
    const segments = get(segmentsAtom);
    const info = FORMAT_INFO[format];
    const text =
        format === SegmentsFormat.csv ? toCsv(segments)
            : format === SegmentsFormat.youtube ? toYouTube(segments)
                : format === SegmentsFormat.edl ? toEdl(segments, file.info.duration)
                    : serializeLlc(file.name, segments);
    try {
        const suffix = format === SegmentsFormat.youtube ? "-chapters" : format === SegmentsFormat.llc ? "-segments" : "";
        const path = await api.dialogs.SaveFile(`Export segments as ${info.label}`, file.dir, `${pathStem(file.path)}${suffix}.${info.ext}`, [
            dialogs.FileFilter.createFrom({ displayName: info.label, pattern: `*.${info.ext}` }),
        ]);
        if (!path) {
            return;
        }
        await api.dialogs.WriteTextFile(path, text);
        notice.success(`Saved ${pathBasename(path)}`);
    } catch (error) {
        notice.error(`Could not save: ${error instanceof Error ? error.message : String(error)}`);
    }
});
