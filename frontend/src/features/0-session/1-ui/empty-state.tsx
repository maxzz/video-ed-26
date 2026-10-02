import { useAtomValue, useSetAtom } from "jotai";
import { FilmIcon, LoaderCircleIcon } from "lucide-react";
import { isWails } from "@/backend-api";
import { Button } from "@/ui/shadcn/button";
import { isOpeningFileAtom } from "@/features/1-media-file/0-store";
import { isFfReadyAtom, ffStatusAtom } from "@/features/9-ffmpeg-status/0-store";
import { openFileDialogAtom } from "../0-store/1-open-file";

/** Shown instead of the editor while no file is open; files can be dropped anywhere on the window. */
export function EmptyState() {
    const openDialog = useSetAtom(openFileDialogAtom);
    const isOpening = useAtomValue(isOpeningFileAtom);
    const ffReady = useAtomValue(isFfReadyAtom);
    const ffStatus = useAtomValue(ffStatusAtom);

    return (
        <div className="m-4 h-[calc(100%-2rem)] text-muted-foreground border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-4">
            {isOpening
                ? <LoaderCircleIcon className="size-12 animate-spin" />
                : <FilmIcon className="size-12" />
            }
            <div className="text-sm">Drop a video or audio file here</div>
            <Button onClick={openDialog} disabled={isOpening || !isWails()}>Open file...</Button>

            {!isWails() && <div className="text-xs text-destructive">Run inside the app (wails dev) to open files.</div>}
            {ffStatus && !ffReady && (
                <div className="max-w-md text-xs text-center text-destructive">
                    {ffStatus.error}. Install ffmpeg, put it next to the app in an ffmpeg folder, or set the folder in Options.
                </div>
            )}
        </div>
    );
}
