import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CommonTimeRanges, TimeUtils } from "../src/time-utils";

describe("TimeUtils", () => {
	const mockNow = 1640000000000; // 2021-12-20 13:33:20 UTC

	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(mockNow);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe("time calculations", () => {
		it("should calculate days ago correctly", () => {
			expect(TimeUtils.daysAgo(1)).toBe(mockNow - 24 * 60 * 60 * 1000);
			expect(TimeUtils.daysAgo(7)).toBe(mockNow - 7 * 24 * 60 * 60 * 1000);
		});

		it("should calculate hours ago correctly", () => {
			expect(TimeUtils.hoursAgo(1)).toBe(mockNow - 60 * 60 * 1000);
			expect(TimeUtils.hoursAgo(24)).toBe(mockNow - 24 * 60 * 60 * 1000);
		});

		it("should calculate minutes ago correctly", () => {
			expect(TimeUtils.minutesAgo(30)).toBe(mockNow - 30 * 60 * 1000);
		});

		it("should calculate weeks ago correctly", () => {
			expect(TimeUtils.weeksAgo(1)).toBe(mockNow - 7 * 24 * 60 * 60 * 1000);
		});
	});

	describe("time range creation", () => {
		it("should create time ranges correctly", () => {
			expect(TimeUtils.lastDays(7)).toEqual({
				start: mockNow - 7 * 24 * 60 * 60 * 1000,
			});

			expect(TimeUtils.lastHours(24)).toEqual({
				start: mockNow - 24 * 60 * 60 * 1000,
			});

			expect(TimeUtils.between(100, 200)).toEqual({
				start: 100,
				end: 200,
			});
		});
	});

	describe("common time ranges", () => {
		it("should provide common presets", () => {
			expect(CommonTimeRanges.LAST_HOUR).toEqual({
				start: mockNow - 60 * 60 * 1000,
			});

			expect(CommonTimeRanges.LAST_DAY).toEqual({
				start: mockNow - 24 * 60 * 60 * 1000,
			});

			expect(CommonTimeRanges.LAST_WEEK).toEqual({
				start: mockNow - 7 * 24 * 60 * 60 * 1000,
			});
		});
	});

	describe("day boundaries", () => {
		it("should calculate start of today correctly", () => {
			const startOfDay = TimeUtils.startOfToday();
			const expected = new Date(2021, 11, 20, 0, 0, 0, 0).getTime(); // Dec 20, 2021
			expect(startOfDay).toBe(expected);
		});

		it("should calculate TODAY range correctly", () => {
			const today = CommonTimeRanges.TODAY;
			expect(today.start).toBe(new Date(2021, 11, 20, 0, 0, 0, 0).getTime());
			expect(today.end).toBe(new Date(2021, 11, 20, 23, 59, 59, 999).getTime());
		});
	});
});
