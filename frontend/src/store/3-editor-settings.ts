import { proxy, subscribe } from "valtio";
import { atomWithProxy } from "jotai-valtio";
import { type Layout } from "react-resizable-panels";

/**
 * Persisted editor settings. Components read them with useSnapshot(editorSettings);
 * Jotai atoms read them through editorSettingsAtom so derived atoms update when a setting changes.
 */

const STORAGE_ID = "video-ed-26__editor__v1";

export const ExportMode = {
    separate: "separate",
    merge: "merge",
    mergeAndSeparate: "merge+separate",
} as const;

export type ExportMode = typeof ExportMode[keyof typeof ExportMode];

export type AvoidNegativeTs = "make_zero" | "auto" | "make_non_negative" | "disabled";

export interface ExportOptions {
    mode: ExportMode;
    keyframeCut: boolean;          // seek before the input: fast, starts at the previous keyframe
    smartCut: boolean;             // experimental: re-encode up to the first keyframe
    avoidNegativeTs: AvoidNegativeTs;
    preserveMetadata: boolean;
    preserveChapters: boolean;
    segmentsToChapters: boolean;   // merged output gets a chapter per segment
    movFaststart: boolean;
    outFormat: string;             // output extension without the dot; empty keeps the input extension
    outputDir: string;             // empty means the folder of the input file
    nameTemplate: string;
    mergedNameTemplate: string;
    overwrite: boolean;
    showDialogBeforeExport: boolean;
}

export type CaptureFormat = "jpg" | "png";

export interface EditorSettings {
    customFfPath: string;          // folder with ffmpeg and ffprobe; empty means bundled or PATH
    autosaveProject: boolean;      // write <name>-proj.llc next to the media file
    keyBindings: Record<string, string[]>; // command id -> keys, overrides the defaults
    export: ExportOptions;
    editorLayout: Layout;          // player | side panel sizes
    sideTab: string;
    showThumbnails: boolean;
    showWaveform: boolean;
    showKeyframes: boolean;
    snapToKeyframes: boolean;
    followPlayhead: boolean;
    timelineHeight: number;
    captureFormat: CaptureFormat;
    lastOpenDir: string;
    layoutId: string;              // which editor layout to render; see components/2-main
}

export const DEFAULT_NAME_TEMPLATE = "${FILENAME}-${CUT_FROM}-${CUT_TO}${SEG_SUFFIX}${EXT}";
export const DEFAULT_MERGED_NAME_TEMPLATE = "${FILENAME}-cut-merged-${EPOCH_MS}${EXT}";

const DEFAULT_EXPORT: ExportOptions = {
    mode: ExportMode.separate,
    keyframeCut: true,
    smartCut: false,
    avoidNegativeTs: "make_zero",
    preserveMetadata: true,
    preserveChapters: true,
    segmentsToChapters: false,
    movFaststart: true,
    outFormat: "",
    outputDir: "",
    nameTemplate: DEFAULT_NAME_TEMPLATE,
    mergedNameTemplate: DEFAULT_MERGED_NAME_TEMPLATE,
    overwrite: false,
    showDialogBeforeExport: true,
};

const DEFAULT_SETTINGS: EditorSettings = {
    customFfPath: "",
    autosaveProject: true,
    keyBindings: {},
    export: DEFAULT_EXPORT,
    editorLayout: { player: 72, side: 28 },
    sideTab: "segments",
    showThumbnails: true,
    showWaveform: false,
    showKeyframes: true,
    snapToKeyframes: false,
    followPlayhead: true,
    timelineHeight: 96,
    captureFormat: "jpg",
    lastOpenDir: "",
    layoutId: "lossless-cut",
};

function loadSettings(): EditorSettings {
    try {
        const stored = localStorage.getItem(STORAGE_ID);
        if (stored) {
            const parsed = JSON.parse(stored) as Partial<EditorSettings>;
            return {
                ...DEFAULT_SETTINGS,
                ...parsed,
                export: { ...DEFAULT_EXPORT, ...parsed.export },
                keyBindings: { ...parsed.keyBindings },
            };
        }
    } catch (e) {
        console.error("Failed to load editor settings", e);
    }
    return structuredClone(DEFAULT_SETTINGS);
}

export const editorSettings = proxy<EditorSettings>(loadSettings());

export const editorSettingsAtom = atomWithProxy(editorSettings);

export function resetExportOptions() {
    editorSettings.export = structuredClone(DEFAULT_EXPORT);
}

subscribe(editorSettings, () => {
    try {
        localStorage.setItem(STORAGE_ID, JSON.stringify(editorSettings));
    } catch (e) {
        console.error("Failed to save editor settings", e);
    }
});
