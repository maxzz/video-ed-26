import { useAtomValue } from "jotai";
import { commandedTimeAtom, currentTimeAtom, durationAtom } from "@/features/2-player/0-store";

/** Once the decoded frame is this close to the playhead, the catch-up line is no longer drawn. */
const CAUGHT_UP_SEC = 0.05;

/**
 * The triangle marker follows the pointer immediately. The plain line is the frame the video
 * element has actually decoded, and it only shows while that frame is still catching up.
 */
export function Playhead() {
    const commanded = useAtomValue(commandedTimeAtom);
    const displayed = useAtomValue(currentTimeAtom);
    const duration = useAtomValue(durationAtom);

    if (duration <= 0) {
        return null;
    }

    const showCatchUp = Math.abs(displayed - commanded) > CAUGHT_UP_SEC;

    return (
        <>
            {showCatchUp && (
                <div
                    className="absolute top-0 bottom-0 w-px bg-red-500 pointer-events-none z-10"
                    style={{ left: `${(displayed / duration) * 100}%` }}
                />
            )}
            <div className="absolute top-0 bottom-0 w-0 pointer-events-none z-20" style={{ left: `${(commanded / duration) * 100}%` }}>
                <div className="absolute -left-1 top-0 size-0 border-x-4 border-t-6 border-x-transparent border-t-red-500" />
                <div className="absolute -left-px top-0 bottom-0 w-0.5 bg-red-500" />
                <div className="absolute -left-1 bottom-0 size-0 border-x-4 border-b-6 border-x-transparent border-b-red-500" />
            </div>
        </>
    );
}
