import { useAtomValue } from "jotai";
import { currentTimeAtom, durationAtom } from "@/features/2-player/0-store";

/** The only timeline part that re-renders on every frame while playing. */
export function Playhead() {
    const time = useAtomValue(currentTimeAtom);
    const duration = useAtomValue(durationAtom);

    if (duration <= 0) {
        return null;
    }

    return (
        <div className="absolute top-0 bottom-0 w-0 pointer-events-none z-10" style={{ left: `${(time / duration) * 100}%` }}>
            <div className="absolute -left-1 top-0 size-0 border-x-4 border-t-6 border-x-transparent border-t-red-500" />
            <div className="absolute -left-px top-0 bottom-0 w-0.5 bg-red-500" />
        </div>
    );
}
