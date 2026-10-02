import { useSnapshot } from "valtio";
import { editorSettings, type CaptureFormat } from "@/store/3-editor-settings";
import { Label } from "@/ui/shadcn/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/select";
import { Switch } from "@/ui/shadcn/switch";
import { EDITOR_LAYOUTS } from "@/components/2-main/editor-layouts";

type BoolSetting = "autosaveProject" | "followPlayhead" | "snapToKeyframes";

const SWITCHES: { key: BoolSetting; label: string; }[] = [
    { key: "autosaveProject", label: "Auto-save project file (<name>-proj.llc) next to the media" },
    { key: "followPlayhead", label: "Timeline follows the playhead" },
    { key: "snapToKeyframes", label: "Snap cut points to keyframes" },
];

export function EditorOptions() {
    const snap = useSnapshot(editorSettings);

    return (
        <div className="flex flex-col gap-2">
            <div className="text-xs font-semibold">Editor</div>

            {SWITCHES.map(({ key, label }) => (
                <Label className="text-xs font-normal flex items-center gap-2" key={key}>
                    <Switch checked={snap[key]} onCheckedChange={(v) => { editorSettings[key] = v; }} />
                    {label}
                </Label>
            ))}

            <div className="grid grid-cols-[auto_1fr] items-center gap-2">
                <Label className="text-xs font-normal">Snapshot format</Label>
                <Select value={snap.captureFormat} onValueChange={(v) => { editorSettings.captureFormat = v as CaptureFormat; }}>
                    <SelectTrigger className="w-28 h-7 text-xs" size="sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem className="text-xs" value="jpg">JPEG</SelectItem>
                        <SelectItem className="text-xs" value="png">PNG</SelectItem>
                    </SelectContent>
                </Select>

                <Label className="text-xs font-normal">Layout</Label>
                <Select value={snap.layoutId} onValueChange={(v) => { editorSettings.layoutId = v; }}>
                    <SelectTrigger className="w-28 h-7 text-xs" size="sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {Object.entries(EDITOR_LAYOUTS).map(([id, layout]) => (
                            <SelectItem className="text-xs" value={id} key={id}>{layout.title}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
}
