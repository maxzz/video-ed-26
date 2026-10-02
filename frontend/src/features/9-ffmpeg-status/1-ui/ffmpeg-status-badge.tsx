import { useAtomValue, useSetAtom } from "jotai";
import { CircleAlertIcon, CircleCheckIcon } from "lucide-react";
import { isOpenOptionsDialogAtom } from "@/components/4-dialogs/8-3-options/9-types-options";
import { ffStatusAtom, isFfReadyAtom } from "../0-store";

export function FfmpegStatusBadge() {
    const status = useAtomValue(ffStatusAtom);
    const ready = useAtomValue(isFfReadyAtom);
    const openOptions = useSetAtom(isOpenOptionsDialogAtom);

    if (!status) {
        return null;
    }

    const title = ready
        ? `ffmpeg ${status.ffmpegVersion}\n${status.ffmpegPath}\n${status.ffprobePath}`
        : `${status.error}\nClick to set the ffmpeg folder in Options.`;

    return (
        <button
            className="px-1.5 py-0.5 text-[11px] text-muted-foreground hover:bg-muted rounded flex items-center gap-1 cursor-pointer"
            title={title}
            onClick={() => openOptions(true)}
            type="button"
        >
            {ready
                ? <CircleCheckIcon className="size-3 text-green-600" />
                : <CircleAlertIcon className="size-3 text-destructive" />
            }
            {ready ? `ffmpeg ${status.ffmpegVersion}` : "ffmpeg not found"}
        </button>
    );
}
