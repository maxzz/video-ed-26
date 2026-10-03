/**
 * One video seek is in flight at a time. While it decodes, later requests keep only the latest
 * target. A drag is allowed to replace an exact seek so a long GOP decode cannot pin the preview
 * after the pointer has already moved on.
 */

const SEEK_GAP_SEC = 0.0001;
const WATCHDOG_MS = 1000;

export type Seekable = { currentTime: number; };

type Pending = { time: number; exact: boolean; };

let seekInFlight = false;
let inFlightExact = false;
let awaitingSeeked = false;
let ignoreSeeked = 0;
let pending: Pending | null = null;
let watchdog: ReturnType<typeof setTimeout> | undefined;

export function isSeekInFlight() {
    return seekInFlight;
}

export function resetSmoothSeek() {
    seekInFlight = false;
    inFlightExact = false;
    awaitingSeeked = false;
    ignoreSeeked = 0;
    pending = null;
    clearTimeout(watchdog);
    watchdog = undefined;
}

/**
 * `exact` decodes the requested frame. Pass false for a drag so this seek can replace an exact
 * one that is still decoding.
 */
export function smoothSeek(el: Seekable, time: number, exact = true) {
    if (seekInFlight) {
        pending = { time, exact };
        if (!exact && inFlightExact) {
            const next = pending;
            pending = null;
            assignSeek(el, next.time, false);
        }
        return;
    }
    if (Math.abs(el.currentTime - time) <= SEEK_GAP_SEC) {
        return;
    }
    assignSeek(el, time, exact);
}

/**
 * Call from the video `seeked` listener before starting the queued seek.
 * Returns the time that was just displayed, or null when this event belongs to a seek we replaced.
 */
export function onSmoothSeeked(el: Seekable): number | null {
    if (ignoreSeeked > 0) {
        ignoreSeeked--;
        return null;
    }
    clearTimeout(watchdog);
    const displayed = el.currentTime;
    awaitingSeeked = false;
    if (pending == null) {
        seekInFlight = false;
    }
    return displayed;
}

/** Starts the seek queued while the previous one was decoding. Call after publishing `onSmoothSeeked`. */
export function continueSmoothSeek(el: Seekable) {
    if (awaitingSeeked || pending == null) {
        return;
    }
    const next = pending;
    pending = null;
    if (Math.abs(el.currentTime - next.time) <= SEEK_GAP_SEC) {
        seekInFlight = false;
        return;
    }
    assignSeek(el, next.time, next.exact);
}

function assignSeek(el: Seekable, time: number, exact: boolean) {
    if (awaitingSeeked) {
        ignoreSeeked++;
    }
    awaitingSeeked = true;
    seekInFlight = true;
    inFlightExact = exact;
    armWatchdog(el);
    el.currentTime = time;
}

function armWatchdog(el: Seekable) {
    clearTimeout(watchdog);
    watchdog = setTimeout(() => {
        if (!seekInFlight) {
            return;
        }
        if (pending != null) {
            const next = pending;
            pending = null;
            assignSeek(el, next.time, next.exact);
            return;
        }
        // Still decoding the only requested frame. Accept its seeked when it arrives,
        // but let a newer request start instead of waiting on it.
        seekInFlight = false;
    }, WATCHDOG_MS);
}
