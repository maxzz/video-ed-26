import { FileInfoDialog } from "@/features/1-media-file";
import { TracksDialog } from "@/features/5-tracks";
import { ExportDialog } from "@/features/6-export";
import { CommandPalette, ShortcutsDialog } from "@/features/8-commands";
import { DetectDialog } from "@/features/b-detect";
import { MergeFilesDialog } from "@/features/c-tools";

/** Dialogs of the editor features; each one opens from its own atom. */
export function EditorDialogs() {
    return (<>
        <FileInfoDialog />
        <TracksDialog />
        <ExportDialog />
        <DetectDialog />
        <MergeFilesDialog />
        <CommandPalette />
        <ShortcutsDialog />
    </>);
}
