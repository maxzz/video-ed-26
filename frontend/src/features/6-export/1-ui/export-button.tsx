import { useAtomValue, useSetAtom } from "jotai";
import { useSnapshot } from "valtio";
import { LoaderCircleIcon, ScissorsLineDashedIcon } from "lucide-react";
import { editorSettings, ExportMode } from "@/store/3-editor-settings";
import { Button } from "@/ui/shadcn/button";
import { currentFileAtom } from "@/features/1-media-file/0-store";
import { exportSegmentsAtom } from "@/features/4-segments/0-store";
import { exportCommandAtom, isExportingAtom } from "../0-store";

export function ExportButton() {
    const file = useAtomValue(currentFileAtom);
    const segments = useAtomValue(exportSegmentsAtom);
    const isExporting = useAtomValue(isExportingAtom);
    const exportCommand = useSetAtom(exportCommandAtom);
    const { export: options } = useSnapshot(editorSettings);

    return (
        <Button size="sm" disabled={!file || isExporting} title="Export (E)" onClick={exportCommand}>
            {isExporting ? <LoaderCircleIcon className="animate-spin" /> : <ScissorsLineDashedIcon />}
            Export {segments.length > 1 && options.mode !== ExportMode.separate ? "merged" : `${segments.length || ""}`}
        </Button>
    );
}

/** Quick toggle for the cut mode, like LosslessCut's bottom bar. */
export function KeyframeCutToggle() {
    const { export: options } = useSnapshot(editorSettings);
    return (
        <Button
            className="text-xs"
            variant="ghost"
            size="sm"
            title={options.keyframeCut ? "Keyframe cut: fast, the cut starts at the previous keyframe" : "Normal cut: seeks after opening the input; may start with a frozen picture"}
            onClick={() => editorSettings.export.keyframeCut = !options.keyframeCut}
        >
            {options.keyframeCut ? "Keyframe cut" : "Normal cut"}
        </Button>
    );
}

export function ExportModeToggle() {
    const { export: options } = useSnapshot(editorSettings);
    const next = options.mode === ExportMode.separate ? ExportMode.merge : options.mode === ExportMode.merge ? ExportMode.mergeAndSeparate : ExportMode.separate;
    const label = options.mode === ExportMode.separate ? "Separate files" : options.mode === ExportMode.merge ? "Merge" : "Merge + separate";
    return (
        <Button className="text-xs" variant="ghost" size="sm" title="How segments are exported (click to change)" onClick={() => editorSettings.export.mode = next}>
            {label}
        </Button>
    );
}
