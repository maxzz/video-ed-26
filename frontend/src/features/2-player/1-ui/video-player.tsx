import { useAtomValue, useSetAtom } from "jotai";
import { MusicIcon } from "lucide-react";
import { classNames } from "@/utils";
import { currentFileAtom, hasVideoAtom } from "@/features/1-media-file";
import { bindVideoElementAtom, mediaSrcAtom, previewRotationAtom, togglePlayAtom } from "../0-store";
import { UnsupportedOverlay } from "./unsupported-overlay";

export function VideoPlayer({ className }: { className?: string; }) {
    const src = useAtomValue(mediaSrcAtom);
    const rotation = useAtomValue(previewRotationAtom);
    const hasVideo = useAtomValue(hasVideoAtom);
    const file = useAtomValue(currentFileAtom);
    const bindVideo = useSetAtom(bindVideoElementAtom);
    const togglePlay = useSetAtom(togglePlayAtom);

    const sideways = rotation === 90 || rotation === 270;

    return (
        <div className={classNames("relative size-full bg-black overflow-hidden grid place-items-center", className)}>
            <video
                className="max-w-full max-h-full object-contain"
                style={rotation ? { rotate: `${rotation}deg`, scale: sideways ? "0.75" : undefined } : undefined}
                ref={bindVideo}
                src={src || undefined}
                preload="auto"
                playsInline
                onClick={togglePlay}
            />

            {file && !hasVideo && (
                <div className="absolute inset-0 text-white/60 flex flex-col items-center justify-center gap-2 pointer-events-none">
                    <MusicIcon className="size-16" />
                    <span className="text-sm">{file.name}</span>
                </div>
            )}

            <UnsupportedOverlay />
        </div>
    );
}
