import { useAtomValue, useSetAtom } from "jotai";
import { PauseIcon, PlayIcon, RotateCwIcon, SkipBackIcon, SkipForwardIcon, StepBackIcon, StepForwardIcon, Volume2Icon, VolumeXIcon } from "lucide-react";
import { Button } from "@/ui/shadcn/button";
import { Slider } from "@/ui/shadcn/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/select";
import {
    effectiveRotationAtom, mutedAtom, playbackRateAtom, playingAtom, rotateAtom, seekToEndAtom, seekToStartAtom,
    setPlaybackRateAtom, setVolumeAtom, stepFrameAtom, toggleMuteAtom, togglePlayAtom, volumeAtom,
} from "../0-store";
import { TimeDisplay } from "./time-display";

export function PlayerControls() {
    const playing = useAtomValue(playingAtom);
    const togglePlay = useSetAtom(togglePlayAtom);
    const stepFrame = useSetAtom(stepFrameAtom);
    const toStart = useSetAtom(seekToStartAtom);
    const toEnd = useSetAtom(seekToEndAtom);

    return (
        <div className="flex items-center gap-0.5">
            <Button variant="ghost" size="icon-sm" title="Jump to start (Home)" onClick={toStart}><SkipBackIcon /></Button>
            <Button variant="ghost" size="icon-sm" title="Previous frame (,)" onClick={() => stepFrame(-1)}><StepBackIcon /></Button>
            <Button variant="ghost" size="icon-sm" title="Play/pause (Space)" onClick={togglePlay}>
                {playing ? <PauseIcon /> : <PlayIcon />}
            </Button>
            <Button variant="ghost" size="icon-sm" title="Next frame (.)" onClick={() => stepFrame(1)}><StepForwardIcon /></Button>
            <Button variant="ghost" size="icon-sm" title="Jump to end (End)" onClick={toEnd}><SkipForwardIcon /></Button>

            <div className="ml-2">
                <TimeDisplay />
            </div>
        </div>
    );
}

export function PlaybackRateSelect() {
    const rate = useAtomValue(playbackRateAtom);
    const setRate = useSetAtom(setPlaybackRateAtom);
    const value = String(rate);

    return (
        <Select value={value} onValueChange={(v) => setRate(Number(v))}>
            <SelectTrigger className="w-18 h-7! text-xs" size="sm" title="Playback speed (J / L)">
                <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
                {[...new Set([...RATE_ITEMS, rate])].sort((a, b) => a - b).map((r) => (
                    <SelectItem value={String(r)} key={r}>{r}x</SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

const RATE_ITEMS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 4];

export function VolumeControl() {
    const volume = useAtomValue(volumeAtom);
    const muted = useAtomValue(mutedAtom);
    const setVolume = useSetAtom(setVolumeAtom);
    const toggleMute = useSetAtom(toggleMuteAtom);

    return (
        <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon-sm" title="Mute (M)" onClick={toggleMute}>
                {muted || volume === 0 ? <VolumeXIcon /> : <Volume2Icon />}
            </Button>
            <Slider className="w-20" min={0} max={1} step={0.01} value={[muted ? 0 : volume]} onValueChange={([v]) => setVolume(v)} />
        </div>
    );
}

export function RotateButton() {
    const rotation = useAtomValue(effectiveRotationAtom);
    const rotate = useSetAtom(rotateAtom);

    return (
        <Button className="text-xs" variant="ghost" size="sm" title="Rotate the preview and the exported file (lossless, metadata only)" onClick={rotate}>
            <RotateCwIcon />
            {rotation}°
        </Button>
    );
}
