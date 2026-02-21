'use client';

import { useEffect } from 'react';
import type { Facility } from '../lib/types';
import { useFacilitySchedules } from './useFacilitySchedules';
import { useFavoritesStorage } from './useFavoritesStorage';

/**
 * お気に入りとスケジュールの同期を管理するカスタムフック
 * localStorage の変更を監視し、お気に入り・スケジュール・選択月の状態を管理
 */
export function useFavoritesSync(allFacilities: Facility[]) {
	const { favorites, handleRemove, handleMove } = useFavoritesStorage(allFacilities);
	const { schedules, selectedMonths, loadingStates, errors, syncFacilities, handleMonthChange } =
		useFacilitySchedules();

	useEffect(() => {
		const facilityIds = favorites.map((favorite) => favorite.facility.id);
		syncFacilities(facilityIds);
	}, [favorites, syncFacilities]);

	return {
		favorites,
		schedules,
		selectedMonths,
		loadingStates,
		errors,
		handleRemove,
		handleMove,
		handleMonthChange,
	};
}

