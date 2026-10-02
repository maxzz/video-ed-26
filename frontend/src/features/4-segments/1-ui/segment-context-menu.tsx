import { type ReactNode } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "@/ui/shadcn/context-menu";
import { zoomToRangeAtom } from "@/features/3-timeline/0-store";
import {
    duplicateSegmentAtom, moveSegmentAtom, removeSegmentAtom, segmentAtomFamily, selectOnlySegmentAtom, setActiveSegmentAtom, toggleSegmentSelectedAtom,
} from "../0-store";

export function SegmentContextMenu({ id, children }: { id: string; children: ReactNode; }) {
    const segment = useAtomValue(segmentAtomFamily(id));
    const remove = useSetAtom(removeSegmentAtom);
    const duplicate = useSetAtom(duplicateSegmentAtom);
    const toggleSelected = useSetAtom(toggleSegmentSelectedAtom);
    const selectOnly = useSetAtom(selectOnlySegmentAtom);
    const move = useSetAtom(moveSegmentAtom);
    const setActive = useSetAtom(setActiveSegmentAtom);
    const zoomToRange = useSetAtom(zoomToRangeAtom);

    return (
        <ContextMenu onOpenChange={(open) => open && setActive(id)}>
            <ContextMenuTrigger asChild>
                {children}
            </ContextMenuTrigger>

            <ContextMenuContent className="text-xs">
                <ContextMenuItem onSelect={() => setActive(id, true)}>Jump to start</ContextMenuItem>
                <ContextMenuItem onSelect={() => segment && zoomToRange(segment.start, segment.end)}>Zoom to segment</ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem onSelect={() => toggleSelected(id)}>{segment?.selected ? "Exclude from export" : "Include in export"}</ContextMenuItem>
                <ContextMenuItem onSelect={() => selectOnly(id)}>Export only this segment</ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem onSelect={() => duplicate(id)}>Duplicate</ContextMenuItem>
                <ContextMenuItem onSelect={() => move(id, -1)}>Move up</ContextMenuItem>
                <ContextMenuItem onSelect={() => move(id, 1)}>Move down</ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem variant="destructive" onSelect={() => remove(id)}>Remove</ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    );
}
