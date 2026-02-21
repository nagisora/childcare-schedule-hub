import type { FacilitySchedule } from "../lib/types";

export type WeekdayKey =
	| "monday"
	| "tuesday"
	| "wednesday"
	| "thursday"
	| "friday"
	| "saturday"
	| "sunday"
	| "holiday";

export const WEEKDAY_COLUMNS: Array<{ label: string; key: WeekdayKey }> = [
	{ label: "月", key: "monday" },
	{ label: "火", key: "tuesday" },
	{ label: "水", key: "wednesday" },
	{ label: "木", key: "thursday" },
	{ label: "金", key: "friday" },
	{ label: "土", key: "saturday" },
	{ label: "日", key: "sunday" },
	{ label: "祝", key: "holiday" },
];

export type FacilityFilters = {
	saturdayOnly: boolean;
	sundayOnly: boolean;
	holidayOnly: boolean;
};

function formatTimeValue(value: string): string {
	const [hour = "00", minute = "00"] = value.split(":");
	return `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
}

export function formatTimeRangeLabel(
	openTime: string,
	closeTime: string,
): string {
	return `${formatTimeValue(openTime)} ～ ${formatTimeValue(closeTime)}`;
}

export function sortSchedulesByTime(
	schedules: FacilitySchedule[],
): FacilitySchedule[] {
	return [...schedules].sort((a, b) => {
		if (a.open_time === b.open_time) {
			return a.close_time.localeCompare(b.close_time);
		}
		return a.open_time.localeCompare(b.open_time);
	});
}

export function matchesFacilityFilters(
	schedules: FacilitySchedule[],
	{ saturdayOnly, sundayOnly, holidayOnly }: FacilityFilters,
): boolean {
	if (schedules.length === 0) {
		return false;
	}

	if (saturdayOnly && !schedules.some((schedule) => schedule.saturday)) {
		return false;
	}

	if (sundayOnly && !schedules.some((schedule) => schedule.sunday)) {
		return false;
	}

	if (holidayOnly && !schedules.some((schedule) => schedule.holiday)) {
		return false;
	}

	return true;
}
