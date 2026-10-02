import { useAtomValue, useSetAtom } from "jotai";
import { formatTime } from "@/utils/time-format";
import { TimeInput } from "@/ui/local-ui/9-time-input";
import { currentTimeAtom, durationAtom, seekAtom } from "../0-store";

/** Current time / duration; the current time is editable to jump to a position. */
export function TimeDisplay() {
    const time = useAtomValue(currentTimeAtom);
    const duration = useAtomValue(durationAtom);
    const seek = useSetAtom(seekAtom);

    return (
        <div className="text-xs flex items-center gap-1">
            <TimeInput className="w-24" value={time} onCommit={seek} title="Type a time and press Enter to jump to it" />
            <span className="font-mono text-muted-foreground tabular-nums">/ {formatTime(duration)}</span>
        </div>
    );
}
