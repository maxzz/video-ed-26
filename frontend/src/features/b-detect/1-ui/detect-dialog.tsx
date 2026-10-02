import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { Button } from "@/ui/shadcn/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/ui/shadcn/dialog";
import { Input } from "@/ui/shadcn/input";
import { Label } from "@/ui/shadcn/label";
import { RadioGroup, RadioGroupItem } from "@/ui/shadcn/radio-group";
import { DEFAULT_DETECT_PARAMS, detectDialogKindAtom, detectParamsAtom, DetectKind, isDetectingAtom, runDetectAtom, type DetectParams } from "../0-store";

const TITLES: Record<DetectKind, [string, string]> = {
    black: ["Detect black scenes", "Finds parts where the picture is black (ffmpeg blackdetect)."],
    silence: ["Detect silent parts", "Finds parts where the audio is silent (ffmpeg silencedetect)."],
    scene: ["Detect scene changes", "Splits the file into segments at scene changes. Detection reads the whole file."],
};

export function DetectDialog() {
    const [kind, setKind] = useAtom(detectDialogKindAtom);
    const [params, setParams] = useAtom(detectParamsAtom);
    const isDetecting = useAtomValue(isDetectingAtom);
    const run = useSetAtom(runDetectAtom);

    if (!kind) {
        return null;
    }
    const [title, description] = TITLES[kind];

    function field(key: keyof DetectParams, label: string, step: number) {
        return (
            <div className="grid grid-cols-[12rem_1fr] items-center gap-2" key={key}>
                <Label>{label}</Label>
                <Input
                    className="w-28 h-7 text-xs"
                    type="number"
                    step={step}
                    value={params[key] as number}
                    onChange={(e) => setParams({ ...params, [key]: Number(e.target.value) || DEFAULT_DETECT_PARAMS[key] })}
                />
            </div>
        );
    }

    return (
        <Dialog open onOpenChange={(open) => !open && setKind(null)}>
            <DialogContent className="max-w-md! gap-0! p-0!">
                <DialogHeader className="px-4 py-3 border-b">
                    <DialogTitle className="text-sm">{title}</DialogTitle>
                    <DialogDescription className="text-xs">{description} Existing segments are replaced.</DialogDescription>
                </DialogHeader>

                <div className="px-4 py-3 text-xs flex flex-col gap-2">
                    {kind === DetectKind.black && [
                        field("blackMinDuration", "Minimum duration (s)", 0.1),
                        field("pictureThreshold", "Black picture ratio (0-1)", 0.01),
                        field("pixelThreshold", "Black pixel level (0-1)", 0.01),
                    ]}
                    {kind === DetectKind.silence && [
                        field("silenceNoiseDb", "Noise level (dB)", 1),
                        field("silenceMinDuration", "Minimum duration (s)", 0.1),
                    ]}
                    {kind === DetectKind.scene && field("sceneThreshold", "Scene change threshold (0-1)", 0.05)}

                    {kind !== DetectKind.scene && (
                        <RadioGroup className="mt-1 flex flex-col gap-1" value={params.keep} onValueChange={(v) => setParams({ ...params, keep: v as DetectParams["keep"] })}>
                            <label className="flex items-center gap-1.5 cursor-pointer"><RadioGroupItem value="detected" /> Make segments of the detected parts</label>
                            <label className="flex items-center gap-1.5 cursor-pointer"><RadioGroupItem value="rest" /> Make segments of everything else (remove them)</label>
                        </RadioGroup>
                    )}
                </div>

                <DialogFooter className="mx-0 mb-0 px-4 py-3 border-t">
                    <Button variant="ghost" size="sm" onClick={() => setParams(DEFAULT_DETECT_PARAMS)}>Defaults</Button>
                    <Button size="sm" disabled={isDetecting} onClick={() => run(kind)}>Detect</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
