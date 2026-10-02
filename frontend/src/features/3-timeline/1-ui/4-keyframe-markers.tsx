import { atom, useAtomValue } from "jotai";
import { editorSettingsAtom } from "@/store/3-editor-settings";
import { durationAtom } from "@/features/2-player/0-store";
import { keyframesAtom, secondsPerPixelAtom, visibleRangeAtom } from "../0-store";

/** Markers are hidden when they would be closer than this many pixels on average. */
const MIN_MARKER_SPACING_PX = 3;

const visibleKeyframesAtom = atom((get) => {
    if (!get(editorSettingsAtom).showKeyframes) {
        return [];
    }
    const { from, to } = get(visibleRangeAtom);
    const visible = get(keyframesAtom).filter((k) => k >= from && k <= to);
    const spp = get(secondsPerPixelAtom);
    const tooDense = visible.length > 1 && (to - from) / spp / visible.length < MIN_MARKER_SPACING_PX;
    return tooDense ? [] : visible;
});

export function KeyframeMarkers() {
    const keyframes = useAtomValue(visibleKeyframesAtom);
    const duration = useAtomValue(durationAtom);

    if (duration <= 0) {
        return null;
    }

    return (
        <div className="absolute inset-x-0 bottom-0 h-2 pointer-events-none">
            {keyframes.map((k) => (
                <div className="absolute bottom-0 w-px h-full bg-foreground/50" style={{ left: `${(k / duration) * 100}%` }} key={k} />
            ))}
        </div>
    );
}
