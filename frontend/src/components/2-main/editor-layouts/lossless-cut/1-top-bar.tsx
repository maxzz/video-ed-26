import { useAtomValue, useSetAtom } from "jotai";
import { FolderOpenIcon, InfoIcon, LayersIcon, XIcon } from "lucide-react";
import { Button } from "@/ui/shadcn/button";
import { currentFileAtom, isFileInfoDialogOpenAtom } from "@/features/1-media-file/0-store";
import { previewAtom, clearPreviewAtom } from "@/features/2-player/0-store";
import { closeFileAtom, openFileDialogAtom } from "@/features/0-session/0-store";
import { enabledTracksCountAtom, isTracksDialogOpenAtom } from "@/features/5-tracks/0-store";

export function TopBar() {
    const file = useAtomValue(currentFileAtom);
    const preview = useAtomValue(previewAtom);
    const tracks = useAtomValue(enabledTracksCountAtom);
    const openDialog = useSetAtom(openFileDialogAtom);
    const close = useSetAtom(closeFileAtom);
    const openInfo = useSetAtom(isFileInfoDialogOpenAtom);
    const openTracks = useSetAtom(isTracksDialogOpenAtom);
    const clearPreview = useSetAtom(clearPreviewAtom);

    return (
        <div className="px-2 h-9 bg-background border-b flex items-center gap-1">
            <Button variant="ghost" size="icon-sm" title="Open file (Ctrl+O)" onClick={openDialog}><FolderOpenIcon /></Button>

            {file && <>
                <span className="px-1 text-xs font-medium truncate" title={file.path}>{file.name}</span>
                <Button variant="ghost" size="icon-xs" title="Close file (Ctrl+W)" onClick={close}><XIcon /></Button>

                {preview && (
                    <button
                        className="px-1.5 py-0.5 text-[10px] text-amber-700 dark:text-amber-400 bg-amber-500/15 rounded cursor-pointer"
                        title="Playing a converted preview; export uses the original file. Click to play the original."
                        onClick={clearPreview}
                        type="button"
                    >
                        Preview: {preview.mode}
                    </button>
                )}

                <div className="flex-1" />

                <Button className="text-xs" variant="ghost" size="sm" title="Tracks (T)" onClick={() => openTracks(true)}>
                    <LayersIcon /> {tracks} of {file.info.streams.length} tracks
                </Button>
                <Button variant="ghost" size="icon-sm" title="File info (Ctrl+I)" onClick={() => openInfo(true)}><InfoIcon /></Button>
            </>}
        </div>
    );
}
