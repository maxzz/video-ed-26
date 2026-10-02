import { useAtomValue } from "jotai";
import { durationAtom } from "@/features/2-player/0-store";
import { THUMB_HEIGHT, thumbnailsAtom, thumbWidthAtom } from "../0-store";

export function ThumbnailsStrip() {
    const thumbs = useAtomValue(thumbnailsAtom);
    const width = useAtomValue(thumbWidthAtom);
    const duration = useAtomValue(durationAtom);

    return (
        <div className="relative shrink-0 bg-black/80 border-b overflow-hidden pointer-events-none" style={{ height: THUMB_HEIGHT }}>
            {duration > 0 && thumbs.map((thumb) => (
                <img
                    className="absolute top-0 h-full object-cover"
                    style={{ left: `${(thumb.time / duration) * 100}%`, width }}
                    src={thumb.url}
                    alt=""
                    draggable={false}
                    key={thumb.time}
                />
            ))}
        </div>
    );
}
