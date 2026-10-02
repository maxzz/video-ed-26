import { useAtomValue } from "jotai";
import { formatTime } from "@/utils/time-format";
import { durationAtom } from "@/features/2-player/0-store";
import { rulerTicksAtom } from "../0-store";

export function TimelineRuler() {
    const { step, ticks } = useAtomValue(rulerTicksAtom);
    const duration = useAtomValue(durationAtom);

    if (duration <= 0) {
        return <div className="shrink-0 h-4 border-b" />;
    }

    return (
        <div className="relative shrink-0 h-4 border-b border-border overflow-hidden">
            {ticks.map((t) => (
                <div
                    className="absolute top-0 bottom-0 pl-1 text-[9px] font-mono text-muted-foreground border-l border-muted-foreground/40 tabular-nums whitespace-nowrap"
                    style={{ left: `${(t / duration) * 100}%` }}
                    key={t}
                >
                    {formatTick(t, step)}
                </div>
            ))}
        </div>
    );
}

function formatTick(t: number, step: number) {
    const text = formatTime(t, { ms: step < 1, hours: false });
    return step < 1 ? text.replace(/0+$/, "").replace(/\.$/, "") : text;
}
