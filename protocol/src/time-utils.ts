/**
 * Time utilities for Memory Protocol
 * Provides clean APIs for common time range operations
 */

const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = MS_PER_SECOND * 60;
const MS_PER_HOUR = MS_PER_MINUTE * 60;
const MS_PER_DAY = MS_PER_HOUR * 24;
const MS_PER_WEEK = MS_PER_DAY * 7;

export interface TimeRange {
	start?: number;
	end?: number;
}

/**
 * Time range utilities for Memory Protocol
 */
export const TimeUtils = {
	/**
	 * Get timestamp for N days ago
	 */
	daysAgo: (days: number): number => Date.now() - days * MS_PER_DAY,

	/**
	 * Get timestamp for N hours ago
	 */
	hoursAgo: (hours: number): number => Date.now() - hours * MS_PER_HOUR,

	/**
	 * Get timestamp for N minutes ago
	 */
	minutesAgo: (minutes: number): number => Date.now() - minutes * MS_PER_MINUTE,

	/**
	 * Get timestamp for N weeks ago
	 */
	weeksAgo: (weeks: number): number => Date.now() - weeks * MS_PER_WEEK,

	/**
	 * Create a time range from start to now
	 */
	since: (start: number): TimeRange => ({ start }),

	/**
	 * Create a time range between two timestamps
	 */
	between: (start: number, end: number): TimeRange => ({ start, end }),

	/**
	 * Create a time range for the last N days
	 */
	lastDays: (days: number): TimeRange => ({
		start: TimeUtils.daysAgo(days),
	}),

	/**
	 * Create a time range for the last N hours
	 */
	lastHours: (hours: number): TimeRange => ({
		start: TimeUtils.hoursAgo(hours),
	}),

	/**
	 * Create a time range for the last N minutes
	 */
	lastMinutes: (minutes: number): TimeRange => ({
		start: TimeUtils.minutesAgo(minutes),
	}),

	/**
	 * Create a time range for the last N weeks
	 */
	lastWeeks: (weeks: number): TimeRange => ({
		start: TimeUtils.weeksAgo(weeks),
	}),

	/**
	 * Get start of current day
	 */
	startOfToday: (): number => {
		const now = new Date();
		return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
	},

	/**
	 * Get start of yesterday
	 */
	startOfYesterday: (): number => {
		const now = new Date();
		return new Date(
			now.getFullYear(),
			now.getMonth(),
			now.getDate() - 1,
		).getTime();
	},

	/**
	 * Get end of today
	 */
	endOfToday: (): number => {
		const now = new Date();
		return new Date(
			now.getFullYear(),
			now.getMonth(),
			now.getDate(),
			23,
			59,
			59,
			999,
		).getTime();
	},
} as const;

/**
 * Common time range presets (functions to ensure current time)
 */
export const CommonTimeRanges = {
	get LAST_HOUR() {
		return TimeUtils.lastHours(1);
	},
	get LAST_DAY() {
		return TimeUtils.lastHours(24);
	},
	get LAST_WEEK() {
		return TimeUtils.lastDays(7);
	},
	get LAST_MONTH() {
		return TimeUtils.lastDays(30);
	},
	get TODAY() {
		return {
			start: TimeUtils.startOfToday(),
			end: TimeUtils.endOfToday(),
		};
	},
	get YESTERDAY() {
		return {
			start: TimeUtils.startOfYesterday(),
			end: TimeUtils.startOfToday(),
		};
	},
} as const;

export default TimeUtils;
