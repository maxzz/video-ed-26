import { atom, getDefaultStore } from "jotai";
import { observe } from "jotai-effect";
import { editorSettingsAtom } from "@/store/3-editor-settings";
import { commandedTimeAtom, durationAtom, playingAtom } from "@/features/2-player/0-store";

export const MAX_ZOOM = 2000;

/** 1 fits the whole file in the visible width. */
export const zoomAtom = atom(1);

export const timelineScrollerAtom = atom<HTMLDivElement | null>(null);

export const viewportWidthAtom = atom(0);

export const scrollLeftAtom = atom(0);

export const contentWidthAtom = atom((get) => get(viewportWidthAtom) * get(zoomAtom));

/** Seconds per pixel of the timeline content. */
export const secondsPerPixelAtom = atom((get) => {
    const width = get(contentWidthAtom);
    return width > 0 ? get(durationAtom) / width : 0;
});

export const visibleRangeAtom = atom((get) => {
    const spp = get(secondsPerPixelAtom);
    const from = get(scrollLeftAtom) * spp;
    return { from, to: from + get(viewportWidthAtom) * spp };
});

//---------------------------------------------------------------------------

/** Keeps the time under anchorX (px from the viewport left) in place while zooming. */
export const setZoomAtom = atom(null, (get, set, zoom: number, anchorX?: number) => {
    const el = get(timelineScrollerAtom);
    const viewport = get(viewportWidthAtom);
    const oldWidth = get(contentWidthAtom);
    const next = Math.min(MAX_ZOOM, Math.max(1, zoom));
    if (!el || viewport <= 0 || next === get(zoomAtom)) {
        set(zoomAtom, next);
        return;
    }

    const duration = get(durationAtom);
    const anchor = anchorX ?? playheadAnchor(get(commandedTimeAtom), duration, oldWidth, get(scrollLeftAtom), viewport);
    const fraction = oldWidth > 0 ? (get(scrollLeftAtom) + anchor) / oldWidth : 0;

    set(zoomAtom, next);
    const newWidth = viewport * next;
    el.style.setProperty("--timeline-width", `${newWidth}px`);
    el.scrollLeft = fraction * newWidth - anchor;
    set(scrollLeftAtom, el.scrollLeft);
});

function playheadAnchor(time: number, duration: number, width: number, scrollLeft: number, viewport: number) {
    const x = duration > 0 ? (time / duration) * width - scrollLeft : 0;
    return x >= 0 && x <= viewport ? x : viewport / 2;
}

export const zoomByAtom = atom(null, (get, set, factor: number, anchorX?: number) => {
    set(setZoomAtom, get(zoomAtom) * factor, anchorX);
});

export const zoomToRangeAtom = atom(null, (get, set, from: number, to: number) => {
    const duration = get(durationAtom);
    if (to <= from || duration <= 0) {
        return;
    }
    set(setZoomAtom, (duration / (to - from)) * 0.9);
    const el = get(timelineScrollerAtom);
    if (el) {
        el.scrollLeft = (from / duration) * get(contentWidthAtom) - get(viewportWidthAtom) * 0.05;
    }
});

/**
 * Ref callback of the horizontal scroller: tracks its width and scroll position, and zooms on Ctrl+wheel.
 * The wheel listener is attached natively because React wheel listeners are passive and cannot preventDefault.
 */
export const bindTimelineScrollerAtom = atom(null, (_get, set, el: HTMLDivElement | null) => {
    if (!el) {
        return;
    }
    const store = getDefaultStore();
    set(timelineScrollerAtom, el);

    const observer = new ResizeObserver(([entry]) => set(viewportWidthAtom, entry.contentRect.width));
    observer.observe(el);

    const controller = new AbortController();
    el.addEventListener("scroll", () => set(scrollLeftAtom, el.scrollLeft), { signal: controller.signal, passive: true });
    el.addEventListener("wheel", (e) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const x = e.clientX - el.getBoundingClientRect().left;
            store.set(zoomByAtom, e.deltaY < 0 ? 1.25 : 0.8, x);
        } else if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && store.get(zoomAtom) > 1) {
            e.preventDefault();
            el.scrollLeft += e.deltaY;
        }
    }, { signal: controller.signal, passive: false });

    return () => {
        observer.disconnect();
        controller.abort();
        set(timelineScrollerAtom, null);
    };
});

export const resetViewportAtom = atom(null, (get, set) => {
    set(zoomAtom, 1);
    set(scrollLeftAtom, 0);
    const el = get(timelineScrollerAtom);
    if (el) {
        el.scrollLeft = 0;
    }
});

//---------------------------------------------------------------------------

/** While playing, scrolls the timeline so the playhead stays visible. */
observe((get) => {
    if (!get(playingAtom) || !get(editorSettingsAtom).followPlayhead || get(zoomAtom) <= 1) {
        return;
    }
    const el = get.peek(timelineScrollerAtom);
    const width = get.peek(contentWidthAtom);
    const viewport = get.peek(viewportWidthAtom);
    const duration = get.peek(durationAtom);
    if (!el || duration <= 0) {
        return;
    }
    const x = (get(commandedTimeAtom) / duration) * width;
    if (x < el.scrollLeft || x > el.scrollLeft + viewport * 0.95) {
        el.scrollLeft = x - viewport * 0.05;
    }
});

//---------------------------------------------------------------------------

const TICK_STEPS = [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600, 7200];
const MIN_TICK_SPACING_PX = 80;

/** Labeled ruler ticks for the visible part of the timeline. */
export const rulerTicksAtom = atom((get) => {
    const spp = get(secondsPerPixelAtom);
    const { from, to } = get(visibleRangeAtom);
    if (spp <= 0) {
        return { step: 1, ticks: [] as number[] };
    }
    const step = TICK_STEPS.find((s) => s / spp >= MIN_TICK_SPACING_PX) ?? TICK_STEPS[TICK_STEPS.length - 1];
    const ticks: number[] = [];
    for (let t = Math.floor(from / step) * step; t <= to + step; t += step) {
        ticks.push(Math.round(t * 1000) / 1000);
    }
    return { step, ticks };
});
