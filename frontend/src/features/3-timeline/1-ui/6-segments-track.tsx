import { type PointerEvent as ReactPointerEvent } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { classNames } from "@/utils";
import { formatTime } from "@/utils/time-format";
import { durationAtom, seekAtom } from "@/features/2-player/0-store";
import {
    activeSegmentIdAtom, pushHistoryAtom, segmentAtomFamily, segmentIdsAtom, setActiveSegmentAtom, updateSegmentAtom,
} from "@/features/4-segments/0-store";
import { segmentColor } from "@/features/4-segments/9-types";
import { SegmentContextMenu } from "@/features/4-segments/1-ui/segment-context-menu";
import { snapToKeyframeAtom } from "../0-store";
import { timeFromPointer } from "./0-timeline";

const MIN_LENGTH = 0.01;

export function SegmentsTrack() {
    const ids = useAtomValue(segmentIdsAtom);
    return (
        <div className="absolute inset-x-0 top-1 bottom-2">
            {ids.map((id) => <SegmentBar id={id} key={id} />)}
        </div>
    );
}

function SegmentBar({ id }: { id: string; }) {
    const segment = useAtomValue(segmentAtomFamily(id));
    const activeId = useAtomValue(activeSegmentIdAtom);
    const duration = useAtomValue(durationAtom);
    const setActive = useSetAtom(setActiveSegmentAtom);

    if (!segment || duration <= 0) {
        return null;
    }

    const isActive = activeId === id;
    const color = segmentColor(segment);

    return (
        <SegmentContextMenu id={id}>
            <div
                className={classNames(
                    "absolute top-0 bottom-0 border rounded-sm overflow-hidden",
                    isActive ? "border-foreground z-1" : "border-transparent",
                    !segment.selected && "opacity-40",
                )}
                style={{
                    left: `${(segment.start / duration) * 100}%`,
                    width: `${((segment.end - segment.start) / duration) * 100}%`,
                    background: segment.selected ? `${color}99` : `repeating-linear-gradient(45deg, ${color}55 0 4px, transparent 4px 8px)`,
                }}
                title={`${segment.name || "Segment"}: ${formatTime(segment.start)} - ${formatTime(segment.end)}`}
                onPointerDown={(e) => e.button === 0 && setActive(id)}
            >
                {segment.name && (
                    <span className="absolute left-1 top-0 text-[10px] text-white whitespace-nowrap pointer-events-none drop-shadow">
                        {segment.name}
                    </span>
                )}

                {isActive && <>
                    <EdgeHandle id={id} edge="start" />
                    <EdgeHandle id={id} edge="end" />
                </>}
            </div>
        </SegmentContextMenu>
    );
}

/** Drag handle to move a segment edge; one undo step per drag. */
function EdgeHandle({ id, edge }: { id: string; edge: "start" | "end"; }) {
    const segment = useAtomValue(segmentAtomFamily(id));
    const duration = useAtomValue(durationAtom);
    const snap = useAtomValue(snapToKeyframeAtom);
    const pushHistory = useSetAtom(pushHistoryAtom);
    const update = useSetAtom(updateSegmentAtom);
    const seek = useSetAtom(seekAtom);

    function onMove(e: ReactPointerEvent<HTMLDivElement>) {
        const content = e.currentTarget.closest("[data-timeline-content]");
        if (!segment || !content || !e.currentTarget.hasPointerCapture(e.pointerId)) {
            return;
        }
        const t = snap(timeFromPointer(e, content, duration));
        const value = edge === "start"
            ? Math.min(t, segment.end - MIN_LENGTH)
            : Math.max(t, segment.start + MIN_LENGTH);
        update(id, { [edge]: value }, false);
        seek(value);
    }

    return (
        <div
            className={classNames("absolute top-0 bottom-0 w-2 bg-foreground/70 hover:bg-foreground cursor-ew-resize", edge === "start" ? "left-0" : "right-0")}
            title={edge === "start" ? "Drag to move the start" : "Drag to move the end"}
            onPointerDown={(e) => {
                e.stopPropagation();
                e.currentTarget.setPointerCapture(e.pointerId);
                pushHistory();
            }}
            onPointerMove={onMove}
        />
    );
}
