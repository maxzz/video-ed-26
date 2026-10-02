/** 83.4 -> "00:01:23.400" (hours are omitted when hours=false and the value is under an hour) */
export function formatTime(seconds: number, { ms = true, hours = true }: { ms?: boolean; hours?: boolean; } = {}): string {
    if (!Number.isFinite(seconds)) {
        return "--:--";
    }
    const sign = seconds < 0 ? "-" : "";
    const totalMs = Math.round(Math.abs(seconds) * 1000);
    const h = Math.floor(totalMs / 3_600_000);
    const m = Math.floor((totalMs % 3_600_000) / 60_000);
    const s = Math.floor((totalMs % 60_000) / 1000);
    const milli = totalMs % 1000;

    const hh = hours || h > 0 ? `${pad(h)}:` : "";
    const frac = ms ? `.${String(milli).padStart(3, "0")}` : "";
    return `${sign}${hh}${pad(m)}:${pad(s)}${frac}`;
}

/** Time for file names: "00.01.23.400" */
export function formatTimeForFileName(seconds: number): string {
    return formatTime(seconds).replace(/:/g, ".");
}

/** YouTube chapter style: "1:23" or "1:02:03" */
export function formatTimeShort(seconds: number): string {
    const total = Math.floor(Math.max(0, seconds));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** Accepts "83.4", "1:23.4", "00:01:23.400", "1:02:03"; returns undefined when the text is not a time. */
export function parseTime(text: string): number | undefined {
    const trimmed = text.trim().replace(",", ".");
    if (!trimmed) {
        return undefined;
    }
    const negative = trimmed.startsWith("-");
    const parts = (negative ? trimmed.slice(1) : trimmed).split(":");
    if (parts.length > 3 || parts.some((p) => !/^\d+(\.\d*)?$/.test(p))) {
        return undefined;
    }
    const value = parts.reduce((acc, p) => acc * 60 + parseFloat(p), 0);
    return negative ? -value : value;
}

function pad(n: number): string {
    return String(n).padStart(2, "0");
}
