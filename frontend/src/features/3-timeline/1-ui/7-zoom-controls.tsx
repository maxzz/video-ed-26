import { useAtomValue, useSetAtom } from "jotai";
import { useSnapshot } from "valtio";
import { ImageIcon, KeyRoundIcon, MagnetIcon, ZoomInIcon, ZoomOutIcon, AudioWaveformIcon, ScanIcon } from "lucide-react";
import { classNames } from "@/utils";
import { editorSettings } from "@/store/3-editor-settings";
import { Button } from "@/ui/shadcn/button";
import { setZoomAtom, zoomAtom, zoomByAtom } from "../0-store";

export function ZoomControls() {
    const zoom = useAtomValue(zoomAtom);
    const zoomBy = useSetAtom(zoomByAtom);
    const setZoom = useSetAtom(setZoomAtom);

    return (
        <div className="flex items-center gap-0.5">
            <Button variant="ghost" size="icon-sm" title="Zoom out (Ctrl+wheel, -)" onClick={() => zoomBy(0.5)}><ZoomOutIcon /></Button>
            <span className="w-12 text-[11px] text-center font-mono text-muted-foreground tabular-nums">{zoom < 10 ? zoom.toFixed(1) : Math.round(zoom)}x</span>
            <Button variant="ghost" size="icon-sm" title="Zoom in (Ctrl+wheel, =)" onClick={() => zoomBy(2)}><ZoomInIcon /></Button>
            <Button variant="ghost" size="icon-sm" title="Fit the whole file" onClick={() => setZoom(1)}><ScanIcon /></Button>
        </div>
    );
}

/** Toggles for what the timeline shows. */
export function TimelineToggles() {
    const { showThumbnails, showWaveform, showKeyframes, snapToKeyframes } = useSnapshot(editorSettings);

    return (
        <div className="flex items-center gap-0.5">
            <Toggle on={showThumbnails} title="Show thumbnails" onClick={() => editorSettings.showThumbnails = !showThumbnails}><ImageIcon /></Toggle>
            <Toggle on={showWaveform} title="Show audio waveform" onClick={() => editorSettings.showWaveform = !showWaveform}><AudioWaveformIcon /></Toggle>
            <Toggle on={showKeyframes} title="Show keyframes" onClick={() => editorSettings.showKeyframes = !showKeyframes}><KeyRoundIcon /></Toggle>
            <Toggle on={snapToKeyframes} title="Snap cut points to keyframes" onClick={() => editorSettings.snapToKeyframes = !snapToKeyframes}><MagnetIcon /></Toggle>
        </div>
    );
}

function Toggle({ on, title, onClick, children }: { on: boolean; title: string; onClick: () => void; children: React.ReactNode; }) {
    return (
        <Button className={classNames(on && "text-primary bg-primary/10")} variant="ghost" size="icon-sm" title={title} aria-pressed={on} onClick={onClick}>
            {children}
        </Button>
    );
}
