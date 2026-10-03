import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { continueSmoothSeek, isSeekInFlight, onSmoothSeeked, resetSmoothSeek, smoothSeek, type Seekable } from "./5-smooth-seek";

class FakeVideo implements Seekable {
    assignments: number[] = [];
    private time: number;

    constructor(time = 0) {
        this.time = time;
    }

    get currentTime() {
        return this.time;
    }

    set currentTime(value: number) {
        this.time = value;
        this.assignments.push(value);
    }
}

function landed(el: Seekable) {
    const displayed = onSmoothSeeked(el);
    continueSmoothSeek(el);
    return displayed;
}

describe("smoothSeek", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        resetSmoothSeek();
    });

    afterEach(() => {
        resetSmoothSeek();
        vi.useRealTimers();
    });

    it("assigns the first exact target immediately and keeps only the latest while that seek is decoding", () => {
        const el = new FakeVideo();

        smoothSeek(el, 1);
        smoothSeek(el, 2);
        smoothSeek(el, 9);

        expect(el.assignments).toEqual([1]);
        expect(isSeekInFlight()).toBe(true);

        expect(landed(el)).toBe(1);
        expect(el.assignments).toEqual([1, 9]);
        expect(landed(el)).toBe(9);
        expect(el.assignments).toEqual([1, 9]);
        expect(isSeekInFlight()).toBe(false);
    });

    it("does not assign when the video is already at the requested time", () => {
        const el = new FakeVideo(4);

        smoothSeek(el, 4);

        expect(el.assignments).toEqual([]);
        expect(isSeekInFlight()).toBe(false);
    });

    it("does not seek again when the queued target is the frame that just displayed", () => {
        const el = new FakeVideo();

        smoothSeek(el, 1);
        smoothSeek(el, 1);
        expect(landed(el)).toBe(1);

        expect(el.assignments).toEqual([1]);
        expect(isSeekInFlight()).toBe(false);
    });

    it("still publishes a slow seek that finishes after the watchdog unlocks", () => {
        const el = new FakeVideo();

        smoothSeek(el, 10);
        vi.advanceTimersByTime(1000);

        expect(el.assignments).toEqual([10]);
        expect(isSeekInFlight()).toBe(false);
        expect(landed(el)).toBe(10);
    });

    it("replaces a seek that outlives the watchdog and ignores the stale seeked event", () => {
        const el = new FakeVideo();

        smoothSeek(el, 10);
        smoothSeek(el, 40);
        vi.advanceTimersByTime(1000);

        expect(el.assignments).toEqual([10, 40]);
        expect(onSmoothSeeked(el)).toBeNull();
        expect(landed(el)).toBe(40);
        expect(isSeekInFlight()).toBe(false);
    });

    it("lets a drag replace an exact seek that is still decoding", () => {
        const el = new FakeVideo();

        smoothSeek(el, 1);
        smoothSeek(el, 6, false);

        expect(el.assignments).toEqual([1, 6]);
        expect(onSmoothSeeked(el)).toBeNull();
        expect(landed(el)).toBe(6);
        expect(isSeekInFlight()).toBe(false);
    });

    it("finishes a drag on the exact frame after the keyframe seek lands", () => {
        const el = new FakeVideo();

        smoothSeek(el, 6, false);
        smoothSeek(el, 6.4, true);

        expect(el.assignments).toEqual([6]);
        expect(landed(el)).toBe(6);
        expect(el.assignments).toEqual([6, 6.4]);
    });
});
