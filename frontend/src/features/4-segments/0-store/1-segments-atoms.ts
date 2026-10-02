import { atom } from "jotai";
import { selectAtom } from "jotai/utils";
import { atomFamily } from "jotai-family";
import { MIN_SEGMENT_DURATION, type Segment } from "../9-types";

/** Segments in user order; this order is the merge order on export. Write through commitSegmentsAtom. */
export const segmentsAtom = atom<Segment[]>([]);

export const activeSegmentIdAtom = atom<string | null>(null);

/** Changes only when segments are added, removed or reordered, so the list does not re-render on edits. */
export const segmentIdsAtom = selectAtom(segmentsAtom, (segments) => segments.map((s) => s.id), arraysEqual);

/** One atom per segment so a row re-renders only when its own segment changes. */
export const segmentAtomFamily = atomFamily((id: string) => atom((get) => get(segmentsAtom).find((s) => s.id === id)));

export const activeSegmentAtom = atom((get) => {
    const id = get(activeSegmentIdAtom);
    return get(segmentsAtom).find((s) => s.id === id);
});

export const activeSegmentIndexAtom = atom((get) => {
    const id = get(activeSegmentIdAtom);
    return get(segmentsAtom).findIndex((s) => s.id === id);
});

/** Segments that will be exported, in order. */
export const exportSegmentsAtom = atom((get) => get(segmentsAtom).filter((s) => s.selected && s.end - s.start >= MIN_SEGMENT_DURATION));

export const segmentsTotalDurationAtom = atom((get) => get(exportSegmentsAtom).reduce((acc, s) => acc + s.end - s.start, 0));

function arraysEqual(a: string[], b: string[]) {
    return a.length === b.length && a.every((v, i) => v === b[i]);
}
