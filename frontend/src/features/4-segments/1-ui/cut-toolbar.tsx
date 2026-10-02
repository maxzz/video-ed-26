import { useAtomValue, useSetAtom } from "jotai";
import { BracketsIcon, PlusIcon, Redo2Icon, ScissorsIcon, Trash2Icon, Undo2Icon } from "lucide-react";
import { Button } from "@/ui/shadcn/button";
import {
    addSegmentAtom, canRedoAtom, canUndoAtom, redoAtom, removeSegmentAtom, setCutEndAtom, setCutStartAtom, splitSegmentAtom, undoAtom,
} from "../0-store";

/** Buttons for the cut points of the active segment. */
export function CutToolbar() {
    const setStart = useSetAtom(setCutStartAtom);
    const setEnd = useSetAtom(setCutEndAtom);
    const add = useSetAtom(addSegmentAtom);
    const split = useSetAtom(splitSegmentAtom);
    const remove = useSetAtom(removeSegmentAtom);
    const undo = useSetAtom(undoAtom);
    const redo = useSetAtom(redoAtom);
    const canUndo = useAtomValue(canUndoAtom);
    const canRedo = useAtomValue(canRedoAtom);

    return (
        <div className="flex items-center gap-0.5">
            <Button className="text-xs" variant="ghost" size="sm" title="Set segment start at the playhead (I)" onClick={setStart}>
                <BracketsIcon className="-scale-x-100" /> Start
            </Button>
            <Button className="text-xs" variant="ghost" size="sm" title="Set segment end at the playhead (O)" onClick={setEnd}>
                End <BracketsIcon />
            </Button>
            <Button variant="ghost" size="icon-sm" title="Add segment at the playhead (+)" onClick={add}><PlusIcon /></Button>
            <Button variant="ghost" size="icon-sm" title="Split segment at the playhead (S)" onClick={split}><ScissorsIcon /></Button>
            <Button variant="ghost" size="icon-sm" title="Remove segment (Backspace)" onClick={() => remove()}><Trash2Icon /></Button>
            <Button variant="ghost" size="icon-sm" title="Undo (Ctrl+Z)" disabled={!canUndo} onClick={undo}><Undo2Icon /></Button>
            <Button variant="ghost" size="icon-sm" title="Redo (Ctrl+Shift+Z)" disabled={!canRedo} onClick={redo}><Redo2Icon /></Button>
        </div>
    );
}
