import { type PointerEvent as ReactPointerEvent } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { useSnapshot } from "valtio";
import { classNames } from "@/utils";
import { editorSettings } from "@/store/3-editor-settings";
import { hasAudioAtom, hasVideoAtom } from "@/features/1-media-file/0-store";
import { durationAtom, seekAtom } from "@/features/2-player/0-store";
import { bindTimelineScrollerAtom, contentWidthAtom } from "../0-store";
import { TimelineRuler } from "./1-ruler";
import { ThumbnailsStrip } from "./2-thumbnails-strip";
import { WaveformStrip } from "./3-waveform-strip";
import { KeyframeMarkers } from "./4-keyframe-markers";
import { Playhead } from "./5-playhead";
import { SegmentsTrack } from "./6-segments-track";

/**
 * Timeline content x position -> time. The content element is the one marked with data-timeline-content.
 */
export function timeFromPointer(e: { clientX: number; }, content: Element, duration: number) {
    const rect = content.getBoundingClientRect();
    return rect.width > 0 ? Math.min(duration, Math.max(0, ((e.clientX - rect.left) / rect.width) * duration)) : 0;
}

export function Timeline({ className }: { className?: string; }) {
    const { showThumbnails, showWaveform } = useSnapshot(editorSettings);
    const hasVideo = useAtomValue(hasVideoAtom);
    const hasAudio = useAtomValue(hasAudioAtom);
    const duration = useAtomValue(durationAtom);
    const contentWidth = useAtomValue(contentWidthAtom);
    const bindScroller = useSetAtom(bindTimelineScrollerAtom);
    const seek = useSetAtom(seekAtom);

    function seekFromPointer(e: ReactPointerEvent<HTMLDivElement>, exact: boolean) {
        seek(timeFromPointer(e, e.currentTarget, duration), exact);
    }

    return (
        <div
            className={classNames("relative bg-muted/40 select-none overflow-x-auto overflow-y-hidden", className)}
            style={{ "--timeline-width": contentWidth ? `${contentWidth}px` : "100%" } as React.CSSProperties}
            ref={bindScroller}
        >
            <div
                className="relative min-w-full h-full flex flex-col cursor-text"
                style={{ width: "var(--timeline-width)" }}
                data-timeline-content
                onPointerDown={(e) => {
                    if (e.button !== 0) {
                        return;
                    }
                    e.currentTarget.setPointerCapture(e.pointerId);
                    seekFromPointer(e, false);
                }}
                onPointerMove={(e) => e.currentTarget.hasPointerCapture(e.pointerId) && seekFromPointer(e, false)}
                onPointerUp={(e) => e.currentTarget.hasPointerCapture(e.pointerId) && seekFromPointer(e, true)}
                onPointerCancel={(e) => e.currentTarget.hasPointerCapture(e.pointerId) && seekFromPointer(e, true)}
            >
                <TimelineRuler />
                {showThumbnails && hasVideo && <ThumbnailsStrip />}
                {showWaveform && hasAudio && <WaveformStrip />}

                <div className="relative flex-1 min-h-7">
                    <SegmentsTrack />
                    <KeyframeMarkers />
                </div>

                <Playhead />
            </div>
        </div>
    );
}
