import { useAtomValue } from "jotai";
import { motion } from "motion/react";
import { commandedTimeAtom, currentTimeAtom, durationAtom, playingAtom } from "@/features/2-player/0-store";

/** Same spring LosslessCut uses for the decoded-frame line, so it glides instead of stepping. */
const CATCH_UP_SPRING = { type: "spring" as const, damping: 50, stiffness: 700 };

/**
 * The triangle marker follows the pointer immediately. The plain line is the frame the video
 * has actually presented. While paused it springs toward that frame; during playback it stays
 * on the playhead.
 */
export function Playhead() {
    const commanded = useAtomValue(commandedTimeAtom);
    const displayed = useAtomValue(currentTimeAtom);
    const duration = useAtomValue(durationAtom);
    const playing = useAtomValue(playingAtom);

    if (duration <= 0) {
        return null;
    }

    return (
        <>
            <motion.div
                className="absolute top-0 bottom-0 w-px bg-red-500 pointer-events-none z-10"
                initial={false}
                animate={{ left: `${(displayed / duration) * 100}%` }}
                transition={playing ? { duration: 0 } : CATCH_UP_SPRING}
            />
            <div className="absolute top-0 bottom-0 w-0 pointer-events-none z-20" style={{ left: `${(commanded / duration) * 100}%` }}>
                <div className="absolute -left-1 top-0 size-0 border-x-4 border-t-6 border-x-transparent border-t-red-500" />
                <div className="absolute -left-px top-0 bottom-0 w-0.5 bg-red-500" />
                <div className="absolute -left-1 bottom-0 size-0 border-x-4 border-b-6 border-x-transparent border-b-red-500" />
            </div>
        </>
    );
}
