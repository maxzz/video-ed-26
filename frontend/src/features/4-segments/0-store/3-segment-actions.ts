import { atom, type Getter } from "jotai";
import { uuid } from "@/utils/uuid";
import { notice } from "@/ui/local-ui/7-toaster";
import { chaptersAtom } from "@/features/1-media-file/0-store";
import { commandedTimeAtom, durationAtom, seekAtom, togglePlayAtom, videoElementAtom } from "@/features/2-player/0-store";
import { snapToKeyframeAtom } from "@/features/3-timeline/0-store";
import { type Segment, type TimeRange } from "../9-types";
import { activeSegmentAtom, activeSegmentIdAtom, activeSegmentIndexAtom, segmentsAtom } from "./1-segments-atoms";
import { commitSegmentsAtom } from "./2-history";

export function createSegment(start: number, end: number, colorIndex: number, name = ""): Segment {
    return { id: uuid(), start, end, name, tags: {}, selected: true, colorIndex };
}

function nextColorIndex(get: Getter) {
    const segments = get(segmentsAtom);
    return segments.length ? Math.max(...segments.map((s) => s.colorIndex)) + 1 : 0;
}

/** The segment under the playhead, preferring the active one. */
function segmentAtTime(get: Getter, t: number): Segment | undefined {
    const active = get(activeSegmentAtom);
    if (active && t > active.start && t < active.end) {
        return active;
    }
    return get(segmentsAtom).find((s) => t > s.start && t < s.end);
}

function cursorTime(get: Getter) {
    return get(snapToKeyframeAtom)(get(commandedTimeAtom));
}

//---------------------------------------------------------------------------

/** Full-file segment used for a newly opened file and after clearing. */
export function wholeFileSegment(duration: number): Segment {
    return createSegment(0, duration, 0);
}

/** Adds a segment from the playhead up to the next segment start or the end of the file. */
export const addSegmentAtom = atom(null, (get, set) => {
    const duration = get(durationAtom);
    const start = cursorTime(get);
    const segments = get(segmentsAtom);

    const nextStart = segments.map((s) => s.start).filter((s) => s > start + 0.01).sort((a, b) => a - b)[0];
    const end = Math.min(nextStart ?? duration, duration);
    if (end - start < 0.01) {
        notice.info("No room for a new segment at the end of the file.");
        return;
    }

    const segment = createSegment(start, end, nextColorIndex(get));
    const index = segments.findIndex((s) => s.start > start);
    const next = [...segments];
    next.splice(index < 0 ? next.length : index, 0, segment);
    set(commitSegmentsAtom, next, { activeId: segment.id });
});

export const updateSegmentAtom = atom(null, (_get, set, id: string, patch: Partial<Omit<Segment, "id">>, history: boolean = true) => {
    set(commitSegmentsAtom, (prev) => prev.map((s) => s.id === id ? { ...s, ...patch } : s), { history });
});

/** Sets the start of the active segment (I key); creates a segment if there is none. */
export const setCutStartAtom = atom(null, (get, set) => {
    const segment = get(activeSegmentAtom);
    const t = cursorTime(get);
    if (!segment) {
        set(addSegmentAtom);
        return;
    }
    if (t >= segment.end) {
        notice.warning("The start must be before the end of the segment.");
        return;
    }
    set(updateSegmentAtom, segment.id, { start: t });
});

/** Sets the end of the active segment (O key). */
export const setCutEndAtom = atom(null, (get, set) => {
    const segment = get(activeSegmentAtom);
    const t = cursorTime(get);
    if (!segment) {
        return;
    }
    if (t <= segment.start) {
        notice.warning("The end must be after the start of the segment.");
        return;
    }
    set(updateSegmentAtom, segment.id, { end: t });
});

/** Splits the segment under the playhead in two. */
export const splitSegmentAtom = atom(null, (get, set) => {
    const t = cursorTime(get);
    const segment = segmentAtTime(get, t);
    if (!segment) {
        notice.info("Move the playhead inside a segment to split it.");
        return;
    }
    const second = { ...createSegment(t, segment.end, nextColorIndex(get), segment.name), tags: { ...segment.tags }, selected: segment.selected };
    set(commitSegmentsAtom, (prev) => prev.flatMap((s) => s.id === segment.id ? [{ ...s, end: t }, second] : [s]), { activeId: second.id });
});

export const removeSegmentAtom = atom(null, (get, set, id?: string) => {
    const targetId = id ?? get(activeSegmentIdAtom);
    const segments = get(segmentsAtom);
    const index = segments.findIndex((s) => s.id === targetId);
    if (index < 0) {
        return;
    }
    const next = segments.filter((s) => s.id !== targetId);
    if (!next.length) {
        next.push(wholeFileSegment(get(durationAtom)));
    }
    set(commitSegmentsAtom, next, { activeId: next[Math.min(index, next.length - 1)].id });
});

export const duplicateSegmentAtom = atom(null, (get, set, id?: string) => {
    const segments = get(segmentsAtom);
    const index = segments.findIndex((s) => s.id === (id ?? get(activeSegmentIdAtom)));
    if (index < 0) {
        return;
    }
    const copy = { ...segments[index], id: uuid(), colorIndex: nextColorIndex(get) };
    const next = [...segments];
    next.splice(index + 1, 0, copy);
    set(commitSegmentsAtom, next, { activeId: copy.id });
});

/** Moves a segment up or down in the list (changes the merge order). */
export const moveSegmentAtom = atom(null, (get, set, id: string, delta: number) => {
    const segments = [...get(segmentsAtom)];
    const from = segments.findIndex((s) => s.id === id);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= segments.length) {
        return;
    }
    const [moved] = segments.splice(from, 1);
    segments.splice(to, 0, moved);
    set(commitSegmentsAtom, segments);
});

export const reorderSegmentAtom = atom(null, (get, set, id: string, toIndex: number) => {
    const from = get(segmentsAtom).findIndex((s) => s.id === id);
    set(moveSegmentAtom, id, toIndex - from);
});

export const sortSegmentsAtom = atom(null, (_get, set) => {
    set(commitSegmentsAtom, (prev) => [...prev].sort((a, b) => a.start - b.start));
});

/** Replaces the segments with the gaps between them (keep what was marked for removal, and vice versa). */
export const invertSegmentsAtom = atom(null, (get, set) => {
    const duration = get(durationAtom);
    const sorted = [...get(segmentsAtom)].sort((a, b) => a.start - b.start);
    const gaps: TimeRange[] = [];
    let at = 0;
    for (const s of sorted) {
        if (s.start - at > 0.001) {
            gaps.push({ start: at, end: s.start });
        }
        at = Math.max(at, s.end);
    }
    if (duration - at > 0.001) {
        gaps.push({ start: at, end: duration });
    }
    if (!gaps.length) {
        notice.info("The segments cover the whole file; there is nothing to invert.");
        return;
    }
    set(commitSegmentsAtom, gaps.map((g, i) => createSegment(g.start, g.end, i)));
});

export const clearSegmentsAtom = atom(null, (get, set) => {
    set(commitSegmentsAtom, [wholeFileSegment(get(durationAtom))]);
});

export const selectAllSegmentsAtom = atom(null, (_get, set, selected: boolean) => {
    set(commitSegmentsAtom, (prev) => prev.map((s) => s.selected === selected ? s : { ...s, selected }));
});

export const toggleSegmentSelectedAtom = atom(null, (get, set, id?: string) => {
    const targetId = id ?? get(activeSegmentIdAtom);
    set(commitSegmentsAtom, (prev) => prev.map((s) => s.id === targetId ? { ...s, selected: !s.selected } : s));
});

export const selectOnlySegmentAtom = atom(null, (get, set, id?: string) => {
    const targetId = id ?? get(activeSegmentIdAtom);
    set(commitSegmentsAtom, (prev) => prev.map((s) => ({ ...s, selected: s.id === targetId })));
});

export const removeUnselectedSegmentsAtom = atom(null, (get, set) => {
    const kept = get(segmentsAtom).filter((s) => s.selected);
    set(commitSegmentsAtom, kept.length ? kept : [wholeFileSegment(get(durationAtom))]);
});

//---------------------------------------------------------------------------
// Navigation

export const setActiveSegmentAtom = atom(null, (get, set, id: string, seekToStart = false) => {
    set(activeSegmentIdAtom, id);
    if (seekToStart) {
        const segment = get(segmentsAtom).find((s) => s.id === id);
        segment && set(seekAtom, segment.start);
    }
});

export const selectAdjacentSegmentAtom = atom(null, (get, set, delta: 1 | -1) => {
    const segments = get(segmentsAtom);
    if (!segments.length) {
        return;
    }
    const index = get(activeSegmentIndexAtom);
    const next = segments[Math.min(segments.length - 1, Math.max(0, index + delta))];
    set(setActiveSegmentAtom, next.id, true);
});

export const jumpToSegmentStartAtom = atom(null, (get, set) => {
    const segment = get(activeSegmentAtom);
    segment && set(seekAtom, segment.start);
});

export const jumpToSegmentEndAtom = atom(null, (get, set) => {
    const segment = get(activeSegmentAtom);
    segment && set(seekAtom, segment.end);
});

/** Seeks to the start of the active segment and plays it. */
export const playActiveSegmentAtom = atom(null, (get, set) => {
    const segment = get(activeSegmentAtom);
    if (!segment) {
        return;
    }
    set(seekAtom, segment.start);
    if (get(videoElementAtom)?.paused) {
        set(togglePlayAtom);
    }
});

//---------------------------------------------------------------------------
// Bulk creation (detection, import, chapters)

export const addSegmentsFromRangesAtom = atom(null, (get, set, ranges: (TimeRange & { name?: string; tags?: Record<string, string>; })[], replace: boolean) => {
    const duration = get(durationAtom);
    const valid = ranges
        .map((r) => ({ ...r, start: Math.max(0, r.start), end: Math.min(duration || r.end, r.end) }))
        .filter((r) => r.end - r.start > 0.001);
    if (!valid.length) {
        notice.info("No segments found.");
        return;
    }
    const base = replace ? 0 : nextColorIndex(get);
    const created = valid.map((r, i) => ({ ...createSegment(r.start, r.end, base + i, r.name ?? ""), tags: r.tags ?? {} }));
    set(commitSegmentsAtom, replace ? created : [...get(segmentsAtom), ...created], { activeId: created[0].id });
});

/** Splits the whole file into equal parts. */
export const splitIntoEqualPartsAtom = atom(null, (get, set, count: number) => {
    const duration = get(durationAtom);
    const n = Math.max(1, Math.floor(count));
    const len = duration / n;
    set(addSegmentsFromRangesAtom, Array.from({ length: n }, (_, i) => ({ start: i * len, end: i === n - 1 ? duration : (i + 1) * len })), true);
});

/** Splits the whole file into parts of the given length in seconds. */
export const splitByDurationAtom = atom(null, (get, set, seconds: number) => {
    const duration = get(durationAtom);
    if (seconds <= 0) {
        return;
    }
    const ranges: TimeRange[] = [];
    for (let t = 0; t < duration - 0.001; t += seconds) {
        ranges.push({ start: t, end: Math.min(duration, t + seconds) });
    }
    set(addSegmentsFromRangesAtom, ranges, true);
});

/** Creates segments at boundaries (e.g. scene changes): one segment between each pair of consecutive times. */
export const segmentsFromBoundariesAtom = atom(null, (get, set, times: number[]) => {
    const duration = get(durationAtom);
    const points = [...new Set([0, ...times.filter((t) => t > 0 && t < duration), duration])].sort((a, b) => a - b);
    const ranges = points.slice(0, -1).map((start, i) => ({ start, end: points[i + 1] }));
    set(addSegmentsFromRangesAtom, ranges, true);
});

export const segmentsFromChaptersAtom = atom(null, (get, set) => {
    const chapters = get(chaptersAtom);
    if (!chapters.length) {
        notice.info("This file has no chapters.");
        return;
    }
    set(addSegmentsFromRangesAtom, chapters.map((c) => ({ start: Number(c.start_time), end: Number(c.end_time), name: c.tags?.title ?? "" })), true);
});
