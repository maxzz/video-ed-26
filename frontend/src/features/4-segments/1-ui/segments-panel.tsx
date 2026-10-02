import { useAtomValue, useSetAtom } from "jotai";
import { ArrowDownUpIcon, FlipHorizontal2Icon, ListChecksIcon, ListXIcon, Trash2Icon } from "lucide-react";
import { classNames } from "@/utils";
import { formatTime } from "@/utils/time-format";
import { Button } from "@/ui/shadcn/button";
import { Checkbox } from "@/ui/shadcn/checkbox";
import { TimeInput } from "@/ui/local-ui/9-time-input";
import { doAsyncExecuteConfirmDialogAtom } from "@/components/4-dialogs/8-1-confirmation/9-types-confirmation";
import {
    activeSegmentIdAtom, clearSegmentsAtom, exportSegmentsAtom, invertSegmentsAtom, segmentAtomFamily, segmentIdsAtom,
    segmentsTotalDurationAtom, selectAllSegmentsAtom, setActiveSegmentAtom, sortSegmentsAtom, toggleSegmentSelectedAtom, updateSegmentAtom,
} from "../0-store";
import { segmentColor } from "../9-types";
import { SegmentContextMenu } from "./segment-context-menu";

export function SegmentsPanel() {
    const ids = useAtomValue(segmentIdsAtom);

    return (
        <div className="h-full flex flex-col">
            <SegmentsPanelToolbar />

            <div className="flex-1 min-h-0 overflow-y-auto">
                {ids.map((id, index) => <SegmentRow id={id} index={index} key={id} />)}
            </div>

            <SegmentsSummary />
        </div>
    );
}

function SegmentsPanelToolbar() {
    const selectAll = useSetAtom(selectAllSegmentsAtom);
    const sort = useSetAtom(sortSegmentsAtom);
    const invert = useSetAtom(invertSegmentsAtom);
    const clear = useSetAtom(clearSegmentsAtom);
    const confirm = useSetAtom(doAsyncExecuteConfirmDialogAtom);

    return (
        <div className="px-1 py-0.5 border-b flex items-center gap-0.5">
            <Button variant="ghost" size="icon-sm" title="Include all segments in export" onClick={() => selectAll(true)}><ListChecksIcon /></Button>
            <Button variant="ghost" size="icon-sm" title="Exclude all segments from export" onClick={() => selectAll(false)}><ListXIcon /></Button>
            <Button variant="ghost" size="icon-sm" title="Sort segments by start time" onClick={sort}><ArrowDownUpIcon /></Button>
            <Button variant="ghost" size="icon-sm" title="Invert: make the gaps between segments the new segments" onClick={invert}><FlipHorizontal2Icon /></Button>
            <div className="flex-1" />
            <Button
                variant="ghost"
                size="icon-sm"
                title="Remove all segments"
                onClick={async () => {
                    const ok = await confirm({ title: "Remove all segments", message: "Replace all segments with one segment covering the whole file?", buttonOk: "Remove", buttonCancel: "Cancel" });
                    ok && clear();
                }}
            >
                <Trash2Icon />
            </Button>
        </div>
    );
}

function SegmentRow({ id, index }: { id: string; index: number; }) {
    const segment = useAtomValue(segmentAtomFamily(id));
    const isActive = useAtomValue(activeSegmentIdAtom) === id;
    const setActive = useSetAtom(setActiveSegmentAtom);
    const update = useSetAtom(updateSegmentAtom);
    const toggleSelected = useSetAtom(toggleSegmentSelectedAtom);

    if (!segment) {
        return null;
    }

    return (
        <SegmentContextMenu id={id}>
            <div
                className={classNames(
                    "px-1.5 py-1 text-xs border-b border-l-4 grid grid-cols-[auto_1fr_auto] items-center gap-x-1.5 gap-y-0.5 cursor-default",
                    isActive ? "bg-primary/10" : "hover:bg-muted/60",
                    !segment.selected && "opacity-60",
                )}
                style={{ borderLeftColor: segmentColor(segment) }}
                onClick={() => setActive(id)}
                onDoubleClick={() => setActive(id, true)}
            >
                <span className="w-5 text-[10px] text-right text-muted-foreground tabular-nums">{index + 1}</span>

                <input
                    className="px-1 h-6 bg-transparent hover:bg-muted focus:bg-muted border border-transparent focus:border-border rounded outline-none"
                    placeholder="Label"
                    defaultValue={segment.name}
                    key={segment.name}
                    onBlur={(e) => e.target.value !== segment.name && update(id, { name: e.target.value })}
                    onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                    spellCheck={false}
                />

                <Checkbox
                    checked={segment.selected}
                    title="Include in export"
                    onClick={(e) => e.stopPropagation()}
                    onCheckedChange={() => toggleSelected(id)}
                />

                <span />
                <div className="flex items-center gap-1">
                    <TimeInput className="w-22" value={segment.start} onCommit={(t) => t < segment.end && update(id, { start: Math.max(0, t) })} />
                    <span className="text-muted-foreground">-</span>
                    <TimeInput className="w-22" value={segment.end} onCommit={(t) => t > segment.start && update(id, { end: t })} />
                </div>
                <span className="text-[10px] font-mono text-muted-foreground tabular-nums">{formatTime(segment.end - segment.start, { hours: false })}</span>
            </div>
        </SegmentContextMenu>
    );
}

function SegmentsSummary() {
    const segments = useAtomValue(exportSegmentsAtom);
    const total = useAtomValue(segmentsTotalDurationAtom);
    const count = useAtomValue(segmentIdsAtom).length;

    return (
        <div className="px-2 py-1 text-[11px] text-muted-foreground border-t">
            {segments.length} of {count} segments selected, total {formatTime(total)}
        </div>
    );
}
