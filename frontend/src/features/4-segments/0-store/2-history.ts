import { atom } from "jotai";
import { type Segment } from "../9-types";
import { activeSegmentIdAtom, segmentsAtom } from "./1-segments-atoms";

const HISTORY_LIMIT = 200;

const pastAtom = atom<Segment[][]>([]);
const futureAtom = atom<Segment[][]>([]);

export const canUndoAtom = atom((get) => get(pastAtom).length > 0);
export const canRedoAtom = atom((get) => get(futureAtom).length > 0);

type CommitOptions = {
    history?: boolean; // default true; false for continuous edits like dragging, after pushHistoryAtom
    activeId?: string | null;
};

/** The single write path for segments, so every change can be undone. */
export const commitSegmentsAtom = atom(null, (get, set, update: Segment[] | ((prev: Segment[]) => Segment[]), options: CommitOptions = {}) => {
    const prev = get(segmentsAtom);
    const next = typeof update === "function" ? update(prev) : update;
    if (next === prev) {
        return;
    }
    if (options.history !== false) {
        set(pastAtom, [...get(pastAtom), prev].slice(-HISTORY_LIMIT));
        set(futureAtom, []);
    }
    set(segmentsAtom, next);

    if (options.activeId !== undefined) {
        set(activeSegmentIdAtom, options.activeId);
    } else if (!next.some((s) => s.id === get(activeSegmentIdAtom))) {
        set(activeSegmentIdAtom, next[0]?.id ?? null);
    }
});

/** Records the current state once before a series of history:false commits (e.g. on drag start). */
export const pushHistoryAtom = atom(null, (get, set) => {
    set(pastAtom, [...get(pastAtom), get(segmentsAtom)].slice(-HISTORY_LIMIT));
    set(futureAtom, []);
});

export const undoAtom = atom(null, (get, set) => {
    const past = get(pastAtom);
    if (!past.length) {
        return;
    }
    set(futureAtom, [get(segmentsAtom), ...get(futureAtom)]);
    set(pastAtom, past.slice(0, -1));
    set(commitSegmentsAtom, past[past.length - 1], { history: false });
});

export const redoAtom = atom(null, (get, set) => {
    const [next, ...rest] = get(futureAtom);
    if (!next) {
        return;
    }
    set(pastAtom, [...get(pastAtom), get(segmentsAtom)]);
    set(futureAtom, rest);
    set(commitSegmentsAtom, next, { history: false });
});

/** Replaces segments without an undo step, e.g. when a file is opened. */
export const resetSegmentsAtom = atom(null, (_get, set, segments: Segment[]) => {
    set(pastAtom, []);
    set(futureAtom, []);
    set(segmentsAtom, segments);
    set(activeSegmentIdAtom, segments[0]?.id ?? null);
});
