import { describe, expect, it } from "vitest";
import { nearestKeyframeTime } from "./6-scrub-keyframes";

describe("nearestKeyframeTime", () => {
    const keys = [0, 6, 12, 18, 24];

    it("picks the closer keyframe", () => {
        expect(nearestKeyframeTime(keys, 8)).toBe(6);
        expect(nearestKeyframeTime(keys, 10)).toBe(12);
        expect(nearestKeyframeTime(keys, 0)).toBe(0);
        expect(nearestKeyframeTime(keys, 30)).toBe(24);
    });
});