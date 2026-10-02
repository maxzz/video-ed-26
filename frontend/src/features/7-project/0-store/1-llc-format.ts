import JSON5 from "json5";
import { type Segment, type TimeRange } from "@/features/4-segments/9-types";

/** LosslessCut project file (<name>-proj.llc), JSON5. */
export type LlcProject = {
    version: number;
    mediaFileName?: string;
    cutSegments: LlcSegment[];
};

export type LlcSegment = {
    start?: number;
    end?: number;
    name?: string;
    tags?: Record<string, string>;
    selected?: boolean;
};

export type ImportedSegment = TimeRange & { name: string; tags: Record<string, string>; selected: boolean; };

export function serializeLlc(mediaFileName: string, segments: Segment[]): string {
    const project: LlcProject = {
        version: 1,
        mediaFileName,
        cutSegments: segments.map((s) => ({
            start: round(s.start),
            end: round(s.end),
            name: s.name,
            ...(Object.keys(s.tags).length ? { tags: s.tags } : {}),
            ...(s.selected ? {} : { selected: false }),
        })),
    };
    return JSON5.stringify(project, null, 2) + "\n";
}

/** Missing start or end (allowed in LosslessCut) become the file start or end. */
export function parseLlc(text: string, duration: number): ImportedSegment[] {
    const project = JSON5.parse(text) as Partial<LlcProject>;
    if (!Array.isArray(project.cutSegments)) {
        throw new Error("Not a LosslessCut project: cutSegments is missing");
    }
    return project.cutSegments
        .map((s) => ({
            start: typeof s.start === "number" ? s.start : 0,
            end: typeof s.end === "number" ? s.end : duration,
            name: s.name ?? "",
            tags: s.tags ?? {},
            selected: s.selected !== false,
        }))
        .filter((s) => s.end > s.start);
}

function round(t: number) {
    return Math.round(t * 1e6) / 1e6;
}
