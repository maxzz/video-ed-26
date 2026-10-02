import { useAtomValue } from "jotai";
import { durationAtom } from "@/features/2-player/0-store";
import { isWaveformTooWideAtom, WAVEFORM_HEIGHT, waveformAtom } from "../0-store";

export function WaveformStrip() {
    const waveform = useAtomValue(waveformAtom);
    const tooWide = useAtomValue(isWaveformTooWideAtom);
    const duration = useAtomValue(durationAtom);

    return (
        <div className="relative shrink-0 bg-background/60 border-b overflow-hidden pointer-events-none" style={{ height: WAVEFORM_HEIGHT }}>
            {tooWide && (
                <div className="sticky left-0 px-2 w-fit h-full text-[10px] text-muted-foreground flex items-center">
                    Zoom in to see the waveform
                </div>
            )}

            {!tooWide && waveform && duration > 0 && (
                <img
                    className="absolute top-0 h-full"
                    style={{ left: `${(waveform.from / duration) * 100}%`, width: `${((waveform.to - waveform.from) / duration) * 100}%` }}
                    src={waveform.url}
                    alt=""
                    draggable={false}
                />
            )}
        </div>
    );
}
