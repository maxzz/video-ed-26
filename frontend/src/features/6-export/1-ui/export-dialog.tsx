import { Fragment, useId, type ReactNode } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useSnapshot } from "valtio";
import { api } from "@/backend-api";
import {
    DEFAULT_MERGED_NAME_TEMPLATE, DEFAULT_NAME_TEMPLATE, editorSettings, ExportMode, resetExportOptions, type AvoidNegativeTs,
} from "@/store/3-editor-settings";
import { formatTime } from "@/utils/time-format";
import { Button } from "@/ui/shadcn/button";
import { Checkbox } from "@/ui/shadcn/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/ui/shadcn/dialog";
import { Input } from "@/ui/shadcn/input";
import { Label } from "@/ui/shadcn/label";
import { RadioGroup, RadioGroupItem } from "@/ui/shadcn/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/select";
import { currentFileAtom } from "@/features/1-media-file/0-store";
import { exportSegmentsAtom, segmentsTotalDurationAtom } from "@/features/4-segments/0-store";
import { enabledTracksCountAtom, isTracksDialogOpenAtom } from "@/features/5-tracks/0-store";
import { isExportDialogOpenAtom, isExportingAtom, outputNamesAtom, runExportAtom, TEMPLATE_VARIABLES } from "../0-store";

export function ExportDialog() {
    const [isOpen, setIsOpen] = useAtom(isExportDialogOpenAtom);
    const file = useAtomValue(currentFileAtom);
    const segments = useAtomValue(exportSegmentsAtom);
    const total = useAtomValue(segmentsTotalDurationAtom);
    const tracks = useAtomValue(enabledTracksCountAtom);
    const isExporting = useAtomValue(isExportingAtom);
    const runExport = useSetAtom(runExportAtom);
    const openTracks = useSetAtom(isTracksDialogOpenAtom);
    const { export: options } = useSnapshot(editorSettings);

    if (!file) {
        return null;
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="max-w-2xl! gap-0! p-0!">
                <DialogHeader className="px-4 py-3 border-b">
                    <DialogTitle className="text-sm">Export</DialogTitle>
                    <DialogDescription className="text-xs">
                        {segments.length} segment(s), {formatTime(total)} total, {tracks} track(s){" "}
                        <button className="underline cursor-pointer" onClick={() => openTracks(true)} type="button">change tracks</button>
                    </DialogDescription>
                </DialogHeader>

                <div className="px-4 py-3 max-h-[65vh] text-xs overflow-y-auto flex flex-col gap-4">
                    <ModeSection />
                    <FormatAndFolderSection inputDir={file.dir} />
                    <CutOptionsSection />
                    <NamesSection />
                </div>

                <DialogFooter className="mx-0 mb-0 px-4 py-3 border-t items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <CheckboxRow
                            label="Show this dialog before every export"
                            checked={options.showDialogBeforeExport}
                            onChange={(v) => editorSettings.export.showDialogBeforeExport = v}
                        />
                        <Button variant="link" size="xs" onClick={resetExportOptions}>Reset to defaults</Button>
                    </div>
                    <Button size="sm" disabled={isExporting || !segments.length} onClick={runExport}>
                        Export
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function ModeSection() {
    const { export: options } = useSnapshot(editorSettings);
    return (
        <Section title="Output">
            <RadioGroup className="flex flex-wrap gap-4" value={options.mode} onValueChange={(v) => editorSettings.export.mode = v as ExportMode}>
                {MODES.map(([value, label]) => (
                    <label className="flex items-center gap-1.5 cursor-pointer" key={value}>
                        <RadioGroupItem value={value} />
                        {label}
                    </label>
                ))}
            </RadioGroup>
        </Section>
    );
}

const MODES: readonly (readonly [ExportMode, string])[] = [
    [ExportMode.separate, "Separate files"],
    [ExportMode.merge, "Merge segments into one file"],
    [ExportMode.mergeAndSeparate, "Merged and separate files"],
];

function FormatAndFolderSection({ inputDir }: { inputDir: string; }) {
    const { export: options } = useSnapshot(editorSettings);
    const id = useId();

    return (
        <Section title="Format and folder">
            <div className="grid grid-cols-[8rem_1fr] items-center gap-2">
                <Label htmlFor={id}>Container</Label>
                <Select value={options.outFormat || "same"} onValueChange={(v) => editorSettings.export.outFormat = v === "same" ? "" : v}>
                    <SelectTrigger id={id} className="w-56" size="sm"><SelectValue /></SelectTrigger>
                    <SelectContent position="popper">
                        <SelectItem value="same">Same as input</SelectItem>
                        {FORMATS.map(([ext, label]) => <SelectItem value={ext} key={ext}>{label}</SelectItem>)}
                    </SelectContent>
                </Select>

                <Label>Output folder</Label>
                <div className="flex gap-1">
                    <Input className="h-7 text-xs" readOnly value={options.outputDir || inputDir} title={options.outputDir ? "" : "Same folder as the input file"} />
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                            const dir = await api.dialogs.SelectDirectory("Output folder", options.outputDir || inputDir);
                            if (dir) {
                                editorSettings.export.outputDir = dir;
                            }
                        }}
                    >
                        Browse
                    </Button>
                    {options.outputDir && <Button variant="ghost" size="sm" onClick={() => editorSettings.export.outputDir = ""}>Same as input</Button>}
                </div>
            </div>
        </Section>
    );
}

const FORMATS: readonly (readonly [string, string])[] = [
    ["mp4", "MP4"], ["mkv", "Matroska (MKV)"], ["mov", "QuickTime (MOV)"], ["webm", "WebM"], ["ts", "MPEG-TS"],
    ["avi", "AVI"], ["mka", "Matroska audio (MKA)"], ["m4a", "M4A"], ["mp3", "MP3"], ["flac", "FLAC"], ["ogg", "Ogg"], ["wav", "WAV"],
];

function CutOptionsSection() {
    const { export: options } = useSnapshot(editorSettings);
    const merge = options.mode !== ExportMode.separate;

    return (
        <Section title="Cutting">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                <CheckboxRow
                    label="Keyframe cut (fast; starts at the previous keyframe)"
                    checked={options.keyframeCut}
                    onChange={(v) => editorSettings.export.keyframeCut = v}
                />
                <CheckboxRow
                    label="Smart cut (experimental: re-encodes up to the first keyframe)"
                    checked={options.smartCut}
                    onChange={(v) => editorSettings.export.smartCut = v}
                />
                <CheckboxRow label="Preserve metadata" checked={options.preserveMetadata} onChange={(v) => editorSettings.export.preserveMetadata = v} />
                <CheckboxRow label="Preserve chapters (separate files)" checked={options.preserveChapters} onChange={(v) => editorSettings.export.preserveChapters = v} />
                <CheckboxRow label="Create chapters from segments (merge)" checked={options.segmentsToChapters} disabled={!merge} onChange={(v) => editorSettings.export.segmentsToChapters = v} />
                <CheckboxRow label="MP4/MOV fast start" checked={options.movFaststart} onChange={(v) => editorSettings.export.movFaststart = v} />
                <CheckboxRow label="Overwrite existing files" checked={options.overwrite} onChange={(v) => editorSettings.export.overwrite = v} />
            </div>

            <div className="mt-2 flex items-center gap-2">
                <Label>Shift timestamps (avoid_negative_ts)</Label>
                <Select value={options.avoidNegativeTs} onValueChange={(v) => editorSettings.export.avoidNegativeTs = v as AvoidNegativeTs}>
                    <SelectTrigger className="w-40" size="sm"><SelectValue /></SelectTrigger>
                    <SelectContent position="popper">
                        {["make_zero", "auto", "make_non_negative", "disabled"].map((v) => <SelectItem value={v} key={v}>{v}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
        </Section>
    );
}

function NamesSection() {
    const { export: options } = useSnapshot(editorSettings);
    const names = useAtomValue(outputNamesAtom);
    const showSeparate = options.mode !== ExportMode.merge;
    const showMerged = options.mode !== ExportMode.separate;

    return (
        <Section title="File names">
            {showSeparate && (
                <TemplateInput
                    label="Segment files"
                    value={options.nameTemplate}
                    defaultValue={DEFAULT_NAME_TEMPLATE}
                    onChange={(v) => editorSettings.export.nameTemplate = v}
                />
            )}
            {showMerged && (
                <TemplateInput
                    label="Merged file"
                    value={options.mergedNameTemplate}
                    defaultValue={DEFAULT_MERGED_NAME_TEMPLATE}
                    onChange={(v) => editorSettings.export.mergedNameTemplate = v}
                />
            )}

            <details className="text-[11px] text-muted-foreground">
                <summary className="cursor-pointer">Template variables</summary>
                <div className="mt-1 grid grid-cols-[8rem_1fr] gap-x-2">
                    {TEMPLATE_VARIABLES.map(([name, help]) => <Fragment key={name}><code>{name}</code><span>{help}</span></Fragment>)}
                </div>
            </details>

            <div className="p-2 max-h-32 font-mono text-[11px] bg-muted/50 rounded overflow-y-auto flex flex-col">
                {showSeparate && names.segments.map((n, i) => <span className="truncate" key={i}>{n}</span>)}
                {showMerged && <span className="font-semibold truncate">{names.merged}</span>}
            </div>
        </Section>
    );
}

function TemplateInput({ label, value, defaultValue, onChange }: { label: string; value: string; defaultValue: string; onChange: (v: string) => void; }) {
    return (
        <div className="grid grid-cols-[8rem_1fr_auto] items-center gap-2">
            <Label>{label}</Label>
            <Input className="h-7 font-mono text-xs" value={value} onChange={(e) => onChange(e.target.value)} spellCheck={false} />
            <Button variant="ghost" size="xs" disabled={value === defaultValue} onClick={() => onChange(defaultValue)}>Default</Button>
        </div>
    );
}

function Section({ title, children }: { title: string; children: ReactNode; }) {
    return (
        <div className="flex flex-col gap-2">
            <div className="font-semibold">{title}</div>
            {children}
        </div>
    );
}

function CheckboxRow({ label, checked, disabled, onChange }: { label: string; checked: boolean; disabled?: boolean; onChange: (v: boolean) => void; }) {
    const id = useId();
    return (
        <div className="flex items-center gap-1.5">
            <Checkbox id={id} checked={checked} disabled={disabled} onCheckedChange={(v) => onChange(v === true)} />
            <Label className="text-xs font-normal cursor-pointer" htmlFor={id}>{label}</Label>
        </div>
    );
}
