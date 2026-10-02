import { useId, useState } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, XIcon } from "lucide-react";
import { api, pathBasename, pathDirname, pathExt, pathJoin, pathStem } from "@/backend-api";
import { editorSettings } from "@/store/3-editor-settings";
import { Button } from "@/ui/shadcn/button";
import { Checkbox } from "@/ui/shadcn/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/ui/shadcn/dialog";
import { Input } from "@/ui/shadcn/input";
import { Label } from "@/ui/shadcn/label";
import { isMergeFilesDialogOpenAtom, isMergingFilesAtom, mergeFilesAtom, mergeFilesListAtom } from "../0-store";

/** Concatenates whole files that share the same codecs (LosslessCut "Merge/concatenate files"). */
export function MergeFilesDialog() {
    const [isOpen, setIsOpen] = useAtom(isMergeFilesDialogOpenAtom);
    const [paths, setPaths] = useAtom(mergeFilesListAtom);
    const isMerging = useAtomValue(isMergingFilesAtom);
    const merge = useSetAtom(mergeFilesAtom);
    const [chapters, setChapters] = useState(true);
    const id = useId();

    const first = paths[0] ?? "";
    const outputPath = first ? pathJoin(editorSettings.export.outputDir || pathDirname(first), `${pathStem(first)}-merged${pathExt(first)}`) : "";

    function move(index: number, delta: number) {
        const next = [...paths];
        const [item] = next.splice(index, 1);
        next.splice(index + delta, 0, item);
        setPaths(next);
    }

    async function addFiles() {
        const added = await api.dialogs.OpenMediaFiles(editorSettings.lastOpenDir);
        added?.length && setPaths([...paths, ...added.filter((p) => !paths.includes(p))]);
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="max-w-xl! gap-0! p-0!">
                <DialogHeader className="px-4 py-3 border-b">
                    <DialogTitle className="text-sm">Merge files</DialogTitle>
                    <DialogDescription className="text-xs">
                        Joins whole files losslessly. All files must have the same codecs, resolution and stream layout.
                    </DialogDescription>
                </DialogHeader>

                <div className="px-4 py-3 text-xs flex flex-col gap-2">
                    <div className="max-h-64 border rounded overflow-y-auto">
                        {paths.map((p, i) => (
                            <div className="px-2 py-1 border-b last:border-b-0 flex items-center gap-1" key={p}>
                                <span className="w-5 text-muted-foreground tabular-nums">{i + 1}</span>
                                <span className="flex-1 truncate" title={p}>{pathBasename(p)}</span>
                                <Button variant="ghost" size="icon-xs" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUpIcon /></Button>
                                <Button variant="ghost" size="icon-xs" disabled={i === paths.length - 1} onClick={() => move(i, 1)}><ArrowDownIcon /></Button>
                                <Button variant="ghost" size="icon-xs" onClick={() => setPaths(paths.filter((x) => x !== p))}><XIcon /></Button>
                            </div>
                        ))}
                        {!paths.length && <div className="px-2 py-4 text-center text-muted-foreground">No files</div>}
                    </div>

                    <Button className="w-fit" variant="outline" size="xs" onClick={addFiles}><PlusIcon /> Add files</Button>

                    <div className="flex items-center gap-1.5">
                        <Checkbox id={id} checked={chapters} onCheckedChange={(v) => setChapters(v === true)} />
                        <Label className="text-xs font-normal" htmlFor={id}>Create a chapter for each file</Label>
                    </div>

                    <Input className="h-7 text-xs" readOnly value={outputPath} title="Output file" />
                </div>

                <DialogFooter className="mx-0 mb-0 px-4 py-3 border-t">
                    <Button size="sm" disabled={paths.length < 2 || isMerging} onClick={() => merge({ outputPath, filesToChapters: chapters })}>
                        Merge {paths.length} files
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
