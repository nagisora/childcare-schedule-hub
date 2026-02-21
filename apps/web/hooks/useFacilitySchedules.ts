'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getCurrentYearMonth, getMonthFirstDay } from '../lib/date-utils';
import { getSchedulesByFacilityIdsAndMonth } from '../lib/schedules';
import type { Schedule } from '../lib/types';

function mergeSelectedMonths(
	facilityIds: string[],
	prev: Record<string, string>
): { next: Record<string, string>; newIds: string[] } {
	const { year, month } = getCurrentYearMonth();
	const currentMonth = getMonthFirstDay(year, month);
	const next: Record<string, string> = {};
	const newIds: string[] = [];

	for (const id of facilityIds) {
		if (prev[id]) {
			next[id] = prev[id];
			continue;
		}
		next[id] = currentMonth;
		newIds.push(id);
	}

	return { next, newIds };
}

export function useFacilitySchedules() {
	const [schedules, setSchedules] = useState<Record<string, Schedule>>({});
	const [selectedMonths, setSelectedMonths] = useState<Record<string, string>>({});
	const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
	const [errors, setErrors] = useState<Record<string, Error | null>>({});
	const selectedMonthsRef = useRef<Record<string, string>>({});

	useEffect(() => {
		selectedMonthsRef.current = selectedMonths;
	}, [selectedMonths]);

	const setLoadingForIds = useCallback((facilityIds: string[], isLoading: boolean) => {
		setLoadingStates((prev) => {
			const updated = { ...prev };
			for (const id of facilityIds) {
				updated[id] = isLoading;
			}
			return updated;
		});
	}, []);

	const clearErrorsForIds = useCallback((facilityIds: string[]) => {
		setErrors((prev) => {
			const updated = { ...prev };
			for (const id of facilityIds) {
				updated[id] = null;
			}
			return updated;
		});
	}, []);

	const setErrorsForIds = useCallback((facilityIds: string[], error: Error) => {
		setErrors((prev) => {
			const updated = { ...prev };
			for (const id of facilityIds) {
				updated[id] = error;
			}
			return updated;
		});
	}, []);

	const updateSchedulesForIds = useCallback((facilityIds: string[], scheduleMap: Record<string, Schedule>) => {
		setSchedules((prev) => {
			const updated = { ...prev };
			for (const id of facilityIds) {
				if (scheduleMap[id]) {
					updated[id] = scheduleMap[id];
				} else {
					delete updated[id];
				}
			}
			return updated;
		});
	}, []);

	const clearSchedulesForIds = useCallback((facilityIds: string[]) => {
		setSchedules((prev) => {
			const updated = { ...prev };
			for (const id of facilityIds) {
				delete updated[id];
			}
			return updated;
		});
	}, []);

	const clearStatesForRemovedFacilities = useCallback((currentFacilityIds: string[]) => {
		const currentIdsSet = new Set(currentFacilityIds);

		setSchedules((prev) => {
			const updated = { ...prev };
			let hasChanges = false;
			for (const id of Object.keys(updated)) {
				if (!currentIdsSet.has(id)) {
					delete updated[id];
					hasChanges = true;
				}
			}
			return hasChanges ? updated : prev;
		});

		setLoadingStates((prev) => {
			const updated = { ...prev };
			let hasChanges = false;
			for (const id of Object.keys(updated)) {
				if (!currentIdsSet.has(id)) {
					delete updated[id];
					hasChanges = true;
				}
			}
			return hasChanges ? updated : prev;
		});

		setErrors((prev) => {
			const updated = { ...prev };
			let hasChanges = false;
			for (const id of Object.keys(updated)) {
				if (!currentIdsSet.has(id)) {
					delete updated[id];
					hasChanges = true;
				}
			}
			return hasChanges ? updated : prev;
		});
	}, []);

	const fetchSchedulesForMonth = useCallback(
		async (facilityIds: string[], targetMonth: string) => {
			if (facilityIds.length === 0) {
				return;
			}

			setLoadingForIds(facilityIds, true);
			clearErrorsForIds(facilityIds);

			try {
				const scheduleMap = await getSchedulesByFacilityIdsAndMonth(facilityIds, targetMonth);
				updateSchedulesForIds(facilityIds, scheduleMap);
			} catch (error) {
				console.error('Failed to fetch schedules:', error);
				const errorObj = error instanceof Error ? error : new Error('スケジュールの取得に失敗しました');
				setErrorsForIds(facilityIds, errorObj);
				clearSchedulesForIds(facilityIds);
			} finally {
				setLoadingForIds(facilityIds, false);
			}
		},
		[setLoadingForIds, clearErrorsForIds, setErrorsForIds, updateSchedulesForIds, clearSchedulesForIds]
	);

	const syncFacilities = useCallback(
		(facilityIds: string[]) => {
			setSelectedMonths((prev) => {
				const { next, newIds } = mergeSelectedMonths(facilityIds, prev);
				if (newIds.length > 0) {
					const { year, month } = getCurrentYearMonth();
					const currentMonth = getMonthFirstDay(year, month);
					void fetchSchedulesForMonth(newIds, currentMonth);
				}
				return next;
			});
			clearStatesForRemovedFacilities(facilityIds);
		},
		[fetchSchedulesForMonth, clearStatesForRemovedFacilities]
	);

	const handleMonthChange = useCallback(
		async (facilityId: string, year: number, month: number) => {
			const targetMonth = getMonthFirstDay(year, month);
			setSelectedMonths((prev) => ({ ...prev, [facilityId]: targetMonth }));
			selectedMonthsRef.current = { ...selectedMonthsRef.current, [facilityId]: targetMonth };

			setLoadingForIds([facilityId], true);
			clearErrorsForIds([facilityId]);

			try {
				const scheduleMap = await getSchedulesByFacilityIdsAndMonth([facilityId], targetMonth);
				if (selectedMonthsRef.current[facilityId] !== targetMonth) {
					return;
				}
				updateSchedulesForIds([facilityId], scheduleMap);
			} catch (error) {
				console.error('Failed to fetch schedule for month:', error);
				if (selectedMonthsRef.current[facilityId] !== targetMonth) {
					return;
				}
				const errorObj = error instanceof Error ? error : new Error('スケジュールの取得に失敗しました');
				setErrorsForIds([facilityId], errorObj);
				clearSchedulesForIds([facilityId]);
			} finally {
				if (selectedMonthsRef.current[facilityId] === targetMonth) {
					setLoadingForIds([facilityId], false);
				}
			}
		},
		[setLoadingForIds, clearErrorsForIds, setErrorsForIds, updateSchedulesForIds, clearSchedulesForIds]
	);

	return {
		schedules,
		selectedMonths,
		loadingStates,
		errors,
		syncFacilities,
		handleMonthChange,
	};
}
