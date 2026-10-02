export type Segment = {
    id: string;
    start: number;                  // seconds
    end: number;                    // seconds, > start
    name: string;
    tags: Record<string, string>;
    selected: boolean;              // included in export
    colorIndex: number;
};

export type TimeRange = { start: number; end: number; };

export const SEGMENT_COLORS = [
    "#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#a855f7",
    "#14b8a6", "#ec4899", "#84cc16", "#f97316", "#6366f1",
];

export function segmentColor(segment: Pick<Segment, "colorIndex">): string {
    return SEGMENT_COLORS[segment.colorIndex % SEGMENT_COLORS.length];
}

/** Segments shorter than this are ignored on export. */
export const MIN_SEGMENT_DURATION = 0.001;
