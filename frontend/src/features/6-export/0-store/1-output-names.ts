import { atom } from "jotai";
import { pathExt, pathStem, sanitizeFileName } from "@/backend-api";
import { formatTimeForFileName } from "@/utils/time-format";
import { editorSettingsAtom } from "@/store/3-editor-settings";
import { currentFileAtom } from "@/features/1-media-file/0-store";
import { exportSegmentsAtom } from "@/features/4-segments/0-store";
import { type Segment } from "@/features/4-segments/9-types";

/** Variables available in file name templates, as in LosslessCut. */
export const TEMPLATE_VARIABLES = [
    ["${FILENAME}", "Input file name without extension"],
    ["${EXT}", "Output extension with the dot"],
    ["${CUT_FROM}", "Segment start, 00.01.23.400"],
    ["${CUT_TO}", "Segment end"],
    ["${SEG_NUM}", "Segment number"],
    ["${SEG_LABEL}", "Segment label"],
    ["${SEG_SUFFIX}", "-label, or -seg<number> when there is no label"],
    ["${EPOCH_MS}", "Current time in milliseconds"],
] as const;

type TemplateValues = Record<string, string>;

function applyTemplate(template: string, values: TemplateValues): string {
    return template.replace(/\$\{(\w+)\}/g, (match, name: string) => values[name] ?? match);
}

/** Output extension with the dot: the chosen format, or the input extension. */
export const outputExtAtom = atom((get) => {
    const format = get(editorSettingsAtom).export.outFormat;
    return format ? `.${format}` : pathExt(get(currentFileAtom)?.path ?? "") || ".mp4";
});

export function segmentOutputName(template: string, inputPath: string, ext: string, segment: Segment, index: number, total: number): string {
    const num = String(index + 1).padStart(String(total).length, "0");
    const label = sanitizeFileName(segment.name);
    const values: TemplateValues = {
        FILENAME: pathStem(inputPath),
        EXT: ext,
        CUT_FROM: formatTimeForFileName(segment.start),
        CUT_TO: formatTimeForFileName(segment.end),
        SEG_NUM: num,
        SEG_LABEL: label,
        SEG_SUFFIX: label ? `-${label}` : total > 1 ? `-seg${num}` : "",
        EPOCH_MS: String(Date.now()),
    };
    return ensureExt(sanitizeFileName(applyTemplate(template, values)), ext);
}

export function mergedOutputName(template: string, inputPath: string, ext: string): string {
    const values: TemplateValues = { FILENAME: pathStem(inputPath), EXT: ext, EPOCH_MS: String(Date.now()) };
    return ensureExt(sanitizeFileName(applyTemplate(template, values)), ext);
}

function ensureExt(name: string, ext: string) {
    return name.toLowerCase().endsWith(ext.toLowerCase()) ? name : name + ext;
}

/** Makes names unique by adding -2, -3... before the extension. */
export function uniqueNames(names: string[]): string[] {
    const seen = new Map<string, number>();
    return names.map((name) => {
        const key = name.toLowerCase();
        const n = (seen.get(key) ?? 0) + 1;
        seen.set(key, n);
        if (n === 1) {
            return name;
        }
        const dot = name.lastIndexOf(".");
        return dot > 0 ? `${name.slice(0, dot)}-${n}${name.slice(dot)}` : `${name}-${n}`;
    });
}

/** Preview of the output file names for the export dialog. */
export const outputNamesAtom = atom((get) => {
    const file = get(currentFileAtom);
    const segments = get(exportSegmentsAtom);
    const options = get(editorSettingsAtom).export;
    const ext = get(outputExtAtom);
    if (!file) {
        return { segments: [] as string[], merged: "" };
    }
    return {
        segments: uniqueNames(segments.map((s, i) => segmentOutputName(options.nameTemplate, file.path, ext, s, i, segments.length))),
        merged: mergedOutputName(options.mergedNameTemplate, file.path, ext),
    };
});
