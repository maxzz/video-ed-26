/**
 * At most one `video.currentTime` assignment is in flight.
 * Further scrubs remember only the latest target and apply it after `seeked`,
 * so a fast drag does not make the decoder render every intermediate frame.
 * Same approach as LosslessCut (`useVideo.smoothSeek`).
 * https://kitchen.vibbio.com/blog/optimizing-html5-video-scrubbing/
 */

const SEEK_GAP_SEC = 0.0001;
const WATCHDOG_MS = 1000;

export type Seekable = { currentTime: number; };

let seekInFlight = false;
let awaitingSeeked = false;
let ignoreSeeked = 0;
let pendingSeek: number | null = null;
let watchdog: ReturnType<typeof setTimeout> | undefined;
let chain: ReturnType<typeof setTimeout> | undefined;

export function isSeekInFlight() {
    return seekInFlight;
}

export function resetSmoothSeek() {
    seekInFlight = false;
    awaitingSeeked = false;
    ignoreSeeked = 0;
    pendingSeek = null;
    clearTimeout(watchdog);
    clearTimeout(chain);
    watchdog = undefined;
    chain = undefined;
}

/** Moves the video element to `time`, skipping targets that arrive while a seek is still decoding. */
export function smoothSeek(el: Seekable, time: number) {
    if (seekInFlight) {
        pendingSeek = time;
        return;
    }
    if (Math.abs(el.currentTime - time) <= SEEK_GAP_SEC) {
        return;
    }
    assignSeek(el, time);
}

/**
 * Call from the video element's `seeked` listener.
 * Returns the time that was just displayed, or null when this event belongs to a seek we already replaced.
 */
export function onSmoothSeeked(el: Seekable): number | null {
    if (ignoreSeeked > 0) {
        ignoreSeeked--;
        return null;
    }

    clearTimeout(watchdog);
    const displayed = el.currentTime;
    const next = pendingSeek;
    pendingSeek = null;
    awaitingSeeked = false;

    if (next != null && Math.abs(next - displayed) > SEEK_GAP_SEC) {
        // Stay locked so pointer moves keep coalescing until the next seek actually starts.
        // Yield first so the playhead can paint the frame that just landed.
        seekInFlight = true;
        clearTimeout(chain);
        chain = setTimeout(() => {
            const latest = pendingSeek ?? next;
            pendingSeek = null;
            if (Math.abs(el.currentTime - latest) <= SEEK_GAP_SEC) {
                seekInFlight = false;
                return;
            }
            assignSeek(el, latest);
        }, 0);
    } else {
        seekInFlight = false;
    }

    return displayed;
}

function assignSeek(el: Seekable, time: number) {
    if (awaitingSeeked) {
        ignoreSeeked++;
    }
    awaitingSeeked = true;
    seekInFlight = true;
    armWatchdog(el);
    el.currentTime = time;
}

function armWatchdog(el: Seekable) {
    clearTimeout(watchdog);
    watchdog = setTimeout(() => {
        if (!seekInFlight) {
            return;
        }
        if (pendingSeek != null) {
            const next = pendingSeek;
            pendingSeek = null;
            assignSeek(el, next);
            return;
        }
        // The single frame is still decoding. Accept its seeked when it arrives,
        // but let a newer scrub start instead of waiting on it.
        seekInFlight = false;
    }, WATCHDOG_MS);
}
