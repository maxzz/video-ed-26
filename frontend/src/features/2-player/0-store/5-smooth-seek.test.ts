import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isSeekInFlight, onSmoothSeeked, resetSmoothSeek, smoothSeek, type Seekable } from "./5-smooth-seek";

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

describe("smoothSeek", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        resetSmoothSeek();
    });

    afterEach(() => {
        resetSmoothSeek();
        vi.useRealTimers();
    });

    it("assigns the first target immediately and keeps only the latest while that seek is decoding", () => {
        const el = new FakeVideo();

        smoothSeek(el, 1);
        smoothSeek(el, 2);
        smoothSeek(el, 9);

        expect(el.assignments).toEqual([1]);
        expect(isSeekInFlight()).toBe(true);

        expect(onSmoothSeeked(el)).toBe(1);
        vi.advanceTimersByTime(0);

        expect(el.assignments).toEqual([1, 9]);
        expect(onSmoothSeeked(el)).toBe(9);
        expect(el.assignments).toEqual([1, 9]);
        expect(isSeekInFlight()).toBe(false);
    });

    it("uses a newer target that arrives in the gap before the queued seek starts", () => {
        const el = new FakeVideo();

        smoothSeek(el, 1);
        smoothSeek(el, 3);
        onSmoothSeeked(el);
        smoothSeek(el, 8);
        vi.advanceTimersByTime(0);

        expect(el.assignments).toEqual([1, 8]);
    });

    it("does not seek again when the pointer returns to the frame already displayed", () => {
        const el = new FakeVideo();

        smoothSeek(el, 1);
        smoothSeek(el, 5);
        onSmoothSeeked(el);
        smoothSeek(el, 1);
        vi.advanceTimersByTime(0);

        expect(el.assignments).toEqual([1]);
        expect(isSeekInFlight()).toBe(false);
    });

    it("does not assign when the video is already at the requested time", () => {
        const el = new FakeVideo(4);

        smoothSeek(el, 4);

        expect(el.assignments).toEqual([]);
        expect(isSeekInFlight()).toBe(false);
    });

    it("still publishes a slow seek that finishes after the watchdog unlocks", () => {
        const el = new FakeVideo();

        smoothSeek(el, 10);
        vi.advanceTimersByTime(1000);

        expect(el.assignments).toEqual([10]);
        expect(isSeekInFlight()).toBe(false);
        expect(onSmoothSeeked(el)).toBe(10);
    });

    it("replaces a seek that outlives the watchdog and ignores the stale seeked event", () => {
        const el = new FakeVideo();

        smoothSeek(el, 10);
        smoothSeek(el, 40);
        vi.advanceTimersByTime(1000);

        expect(el.assignments).toEqual([10, 40]);
        expect(onSmoothSeeked(el)).toBeNull();
        expect(onSmoothSeeked(el)).toBe(40);
        expect(isSeekInFlight()).toBe(false);
    });
});
