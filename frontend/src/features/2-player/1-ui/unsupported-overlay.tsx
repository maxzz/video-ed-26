import { useAtomValue, useSetAtom } from "jotai";
import { LoaderCircleIcon } from "lucide-react";
import { Button } from "@/ui/shadcn/button";
import { createPreviewAtom, isCreatingPreviewAtom, playbackErrorAtom, PlaybackError, PreviewMode } from "../0-store";

/** Shown when the webview cannot play the file; offers the preview proxy modes. */
export function UnsupportedOverlay() {
    const error = useAtomValue(playbackErrorAtom);
    const isCreating = useAtomValue(isCreatingPreviewAtom);
    const createPreview = useSetAtom(createPreviewAtom);

    if (error === PlaybackError.none) {
        return null;
    }

    const message = error === PlaybackError.unsupportedVideo
        ? "The video codec of this file cannot be played in the preview."
        : "This file format cannot be played in the preview.";

    return (
        <div className="absolute inset-0 p-4 text-white bg-black/80 flex flex-col items-center justify-center gap-3">
            <div className="text-sm font-semibold">{message}</div>
            <div className="max-w-md text-xs text-white/70 text-center">
                Cutting still works on the original file. Create a temporary preview to see the picture while you edit.
            </div>

            {isCreating
                ? (
                    <div className="text-xs flex items-center gap-2">
                        <LoaderCircleIcon className="size-4 animate-spin" />
                        Creating preview... (progress is in Background tasks)
                    </div>
                ) : (
                    <div className="flex flex-wrap justify-center gap-2">
                        {PREVIEW_CHOICES.map(([mode, label, title]) => (
                            <Button size="sm" variant="secondary" title={title} onClick={() => createPreview(mode)} key={mode}>
                                {label}
                            </Button>
                        ))}
                    </div>
                )}
        </div>
    );
}

const PREVIEW_CHOICES: readonly (readonly [PreviewMode, string, string])[] = [
    [PreviewMode.remux, "Fastest: remux", "Copy streams into MP4. Instant, works when only the container is unsupported."],
    [PreviewMode.fastAudio, "Fast: convert audio", "Copy the video and convert the audio to AAC."],
    [PreviewMode.fast, "Fast: low quality", "Quick H.264 conversion, up to 720p."],
    [PreviewMode.slow, "Slow: good quality", "Full-quality H.264 conversion."],
];
