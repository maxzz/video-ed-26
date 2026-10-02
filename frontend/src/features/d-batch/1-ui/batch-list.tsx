import { useAtomValue, useSetAtom } from "jotai";
import { ArrowDownIcon, ArrowUpIcon, CombineIcon, PlusIcon, XIcon } from "lucide-react";
import { pathBasename } from "@/backend-api";
import { classNames } from "@/utils";
import { Button } from "@/ui/shadcn/button";
import { currentFileAtom, isOpeningFileAtom } from "@/features/1-media-file/0-store";
import { openFileAtom, openFileDialogAtom } from "@/features/0-session/0-store/1-open-file";
import { openMergeFilesDialogAtom } from "@/features/c-tools/0-store";
import { batchFilesAtom, clearBatchAtom, moveInBatchAtom, removeFromBatchAtom } from "../0-store";

/** Files opened in this session; click one to edit it (its segments are saved in its project file). */
export function BatchList() {
    const files = useAtomValue(batchFilesAtom);
    const current = useAtomValue(currentFileAtom)?.path;
    const isOpening = useAtomValue(isOpeningFileAtom);
    const open = useSetAtom(openFileAtom);
    const openDialog = useSetAtom(openFileDialogAtom);
    const remove = useSetAtom(removeFromBatchAtom);
    const move = useSetAtom(moveInBatchAtom);
    const clear = useSetAtom(clearBatchAtom);
    const openMerge = useSetAtom(openMergeFilesDialogAtom);

    return (
        <div className="h-full flex flex-col">
            <div className="px-1 py-0.5 border-b flex items-center gap-0.5">
                <Button variant="ghost" size="icon-sm" title="Add files" onClick={openDialog}><PlusIcon /></Button>
                <Button variant="ghost" size="icon-sm" title="Merge these files into one" disabled={files.length < 2} onClick={() => openMerge(files)}><CombineIcon /></Button>
                <div className="flex-1" />
                <Button variant="ghost" size="xs" disabled={files.length < 2} onClick={() => clear(current)}>Clear others</Button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto">
                {files.map((path, i) => (
                    <div
                        className={classNames("px-2 py-1 text-xs border-b flex items-center gap-1 cursor-default", path === current ? "bg-primary/10" : "hover:bg-muted/60")}
                        onClick={() => !isOpening && open(path)}
                        title={path}
                        key={path}
                    >
                        <span className="flex-1 truncate">{pathBasename(path)}</span>
                        <Button variant="ghost" size="icon-xs" disabled={i === 0} onClick={(e) => { e.stopPropagation(); move(path, -1); }}><ArrowUpIcon /></Button>
                        <Button variant="ghost" size="icon-xs" disabled={i === files.length - 1} onClick={(e) => { e.stopPropagation(); move(path, 1); }}><ArrowDownIcon /></Button>
                        <Button variant="ghost" size="icon-xs" disabled={path === current} onClick={(e) => { e.stopPropagation(); remove(path); }}><XIcon /></Button>
                    </div>
                ))}
                {!files.length && <div className="p-4 text-xs text-center text-muted-foreground">Drop files here or click + to add them.</div>}
            </div>
        </div>
    );
}
