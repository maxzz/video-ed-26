import { formatTimeShort, parseTime } from "@/utils/time-format";
import { type Segment } from "@/features/4-segments/9-types";
import { parseLlc } from "@/features/7-project/0-store/1-llc-format";

export type ParsedSegment = { start: number; end: number; name?: string; tags?: Record<string, string>; };

export const SegmentsFormat = {
    csv: "csv",
    youtube: "youtube",
    edl: "edl",
    cue: "cue",
    llc: "llc",
} as const;

export type SegmentsFormat = typeof SegmentsFormat[keyof typeof SegmentsFormat];

export const FORMAT_INFO: Record<SegmentsFormat, { label: string; ext: string; canExport: boolean; }> = {
    csv: { label: "CSV (start,end,label)", ext: "csv", canExport: true },
    youtube: { label: "YouTube chapters (text)", ext: "txt", canExport: true },
    edl: { label: "MPlayer EDL", ext: "edl", canExport: true },
    cue: { label: "CUE sheet", ext: "cue", canExport: false },
    llc: { label: "LosslessCut project", ext: "llc", canExport: true },
};

//---------------------------------------------------------------------------
// CSV: start,end,label with seconds, like LosslessCut

export function toCsv(segments: Segment[]): string {
    return segments.map((s) => `${s.start.toFixed(6)},${s.end.toFixed(6)},${csvQuote(s.name)}`).join("\n") + "\n";
}

export function fromCsv(text: string, duration: number): ParsedSegment[] {
    return text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).flatMap((line) => {
        const [startText, endText, ...rest] = splitCsvLine(line);
        const start = startText === "" ? 0 : parseTime(startText);
        const end = endText === "" || endText === undefined ? duration : parseTime(endText);
        if (start === undefined || end === undefined) {
            return []; // header or invalid row
        }
        return [{ start, end, name: rest.join(",") }];
    });
}

function csvQuote(s: string) {
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function splitCsvLine(line: string): string[] {
    const out: string[] = [];
    let cur = "";
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (quoted) {
            if (c === '"' && line[i + 1] === '"') {
                cur += '"';
                i++;
            } else if (c === '"') {
                quoted = false;
            } else {
                cur += c;
            }
        } else if (c === '"') {
            quoted = true;
        } else if (c === ",") {
            out.push(cur.trim());
            cur = "";
        } else {
            cur += c;
        }
    }
    out.push(cur.trim());
    return out;
}

//---------------------------------------------------------------------------
// YouTube chapters: "0:00 Intro" per line; each chapter ends where the next starts

export function toYouTube(segments: Segment[]): string {
    const sorted = [...segments].sort((a, b) => a.start - b.start);
    const lines = sorted.map((s, i) => `${formatTimeShort(s.start)} ${s.name || `Chapter ${i + 1}`}`);
    if (sorted.length && sorted[0].start > 0) {
        lines.unshift("0:00 Start"); // YouTube requires the first chapter at 0:00
    }
    return lines.join("\n") + "\n";
}

export function fromYouTube(text: string, duration: number): ParsedSegment[] {
    const points = text.split(/\r?\n/).flatMap((line) => {
        const m = line.trim().match(/^(?:[-*•]\s*)?\(?(\d{1,2}(?::\d{1,2}){1,2}(?:\.\d+)?)\)?\s*[-–:]?\s*(.*)$/);
        const t = m ? parseTime(m[1]) : undefined;
        return t === undefined ? [] : [{ t, name: m![2] }];
    }).sort((a, b) => a.t - b.t);
    return points.map((p, i) => ({ start: p.t, end: points[i + 1]?.t ?? duration, name: p.name }));
}

//---------------------------------------------------------------------------
// MPlayer EDL: "start end action"; action 0 means skip. Exported segments are the parts to keep,
// so the EDL lists the gaps (to skip). Imported skip ranges are turned back into kept parts.

export function toEdl(segments: Segment[], duration: number): string {
    const sorted = [...segments].sort((a, b) => a.start - b.start);
    const lines: string[] = [];
    let at = 0;
    for (const s of sorted) {
        s.start > at && lines.push(`${at.toFixed(3)} ${s.start.toFixed(3)} 0`);
        at = Math.max(at, s.end);
    }
    duration > at && lines.push(`${at.toFixed(3)} ${duration.toFixed(3)} 0`);
    return lines.join("\n") + "\n";
}

export function fromEdl(text: string, duration: number): ParsedSegment[] {
    const skips = text.split(/\r?\n/).flatMap((line) => {
        const [a, b, action] = line.trim().split(/\s+/);
        const start = Number(a);
        const end = Number(b);
        return Number.isFinite(start) && Number.isFinite(end) && (action ?? "0") === "0" ? [{ start, end }] : [];
    }).sort((x, y) => x.start - y.start);

    const rv: ParsedSegment[] = [];
    let at = 0;
    for (const s of skips) {
        s.start > at && rv.push({ start: at, end: s.start });
        at = Math.max(at, s.end);
    }
    duration > at && rv.push({ start: at, end: duration });
    return rv;
}

//---------------------------------------------------------------------------
// CUE: TRACK / TITLE / INDEX 01 mm:ss:ff (75 frames per second)

export function fromCue(text: string, duration: number): ParsedSegment[] {
    const tracks: { t: number; name: string; }[] = [];
    let title = "";
    for (const raw of text.split(/\r?\n/)) {
        const line = raw.trim();
        const titleMatch = line.match(/^TITLE\s+"?(.*?)"?$/i);
        if (titleMatch) {
            title = titleMatch[1];
            continue;
        }
        const index = line.match(/^INDEX\s+01\s+(\d+):(\d+):(\d+)$/i);
        if (index) {
            tracks.push({ t: Number(index[1]) * 60 + Number(index[2]) + Number(index[3]) / 75, name: title });
        }
        if (/^TRACK\s/i.test(line)) {
            title = "";
        }
    }
    return tracks.map((tr, i) => ({ start: tr.t, end: tracks[i + 1]?.t ?? duration, name: tr.name }));
}

//---------------------------------------------------------------------------

export function detectFormat(fileName: string, text: string): SegmentsFormat {
    const lower = fileName.toLowerCase();
    if (lower.endsWith(".llc")) {
        return SegmentsFormat.llc;
    }
    if (lower.endsWith(".edl")) {
        return SegmentsFormat.edl;
    }
    if (lower.endsWith(".cue")) {
        return SegmentsFormat.cue;
    }
    if (lower.endsWith(".csv")) {
        return SegmentsFormat.csv;
    }
    return /^\s*\(?\d{1,2}:\d{2}/m.test(text) ? SegmentsFormat.youtube : SegmentsFormat.csv;
}

export function parseSegments(format: SegmentsFormat, text: string, duration: number): ParsedSegment[] {
    switch (format) {
        case SegmentsFormat.csv: return fromCsv(text, duration);
        case SegmentsFormat.youtube: return fromYouTube(text, duration);
        case SegmentsFormat.edl: return fromEdl(text, duration);
        case SegmentsFormat.cue: return fromCue(text, duration);
        case SegmentsFormat.llc: return parseLlc(text, duration);
    }
}
