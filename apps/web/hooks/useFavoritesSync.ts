'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { matchFavoritesWithFacilities } from '../lib/favorites';
import { getLatestSchedulesByFacilityIds, getSchedulesByFacilityIdsAndMonth } from '../lib/schedules';
import {
	readFavoritesFromStorage,
	updateFavoritesInStorage,
	removeFavorite,
	FAVORITES_UPDATED_EVENT,
} from '../lib/storage';
import { getMonthFirstDay, getCurrentYearMonth } from '../lib/date-utils';
import type { FavoriteFacility } from '../lib/favorites';
import type { Facility, Schedule } from '../lib/types';

/**
 * localStorage からお気に入りを読み込み、Facility データとマッチングする
 * @param lastSnapshot 前回のスナップショット（ID文字列のカンマ区切り）
 * @param allFacilities 全拠点一覧
 * @returns マッチングされたお気に入り配列と新しいスナップショット
 */
function getFavoritesFromStorageSnapshot(
	lastSnapshot: string,
	allFacilities: Facility[]
): { favorites: FavoriteFacility[]; snapshot: string } {
	const currentStorageItems = readFavoritesFromStorage();
	const currentIds = currentStorageItems.map((f) => f.facilityId).sort().join(',');

	// 前回のlocalStorage値と比較して変更があった場合のみ更新
	if (currentIds !== lastSnapshot) {
		const updatedFavorites = matchFavoritesWithFacilities(currentStorageItems, allFacilities);
		return { favorites: updatedFavorites, snapshot: currentIds };
	}

	// 変更がない場合は既存の状態を返す（呼び出し側で判定）
	return { favorites: [], snapshot: lastSnapshot };
}

/**
 * お気に入りとスケジュールの同期を管理するカスタムフック
 * localStorage の変更を監視し、お気に入り・スケジュール・選択月の状態を管理
 */
export function useFavoritesSync(allFacilities: Facility[]) {
	const [favorites, setFavorites] = useState<FavoriteFacility[]>([]);
	const [schedules, setSchedules] = useState<Record<string, Schedule>>({});
	const [selectedMonths, setSelectedMonths] = useState<Record<string, string>>({});
	const lastStorageRef = useRef<string>('');

	// 施設ごとの選択月を初期化（今月をデフォルト）
	const initializeSelectedMonths = useCallback((facilityIds: string[]) => {
		const { year, month } = getCurrentYearMonth();
		const currentMonth = getMonthFirstDay(year, month);
		const initial: Record<string, string> = {};
		for (const id of facilityIds) {
			initial[id] = currentMonth;
		}
		setSelectedMonths(initial);
		return currentMonth;
	}, []);

	// スケジュールデータを取得する関数
	const fetchSchedules = useCallback(async (facilityIds: string[], targetMonth?: string) => {
		if (facilityIds.length === 0) {
			setSchedules({});
			return;
		}

		try {
			let scheduleMap: Record<string, Schedule>;
			if (targetMonth) {
				// 指定月のスケジュールを取得
				scheduleMap = await getSchedulesByFacilityIdsAndMonth(facilityIds, targetMonth);
			} else {
				// 最新のスケジュールを取得
				scheduleMap = await getLatestSchedulesByFacilityIds(facilityIds);
			}
			setSchedules(scheduleMap);
		} catch (error) {
			console.error('Failed to fetch schedules:', error);
			setSchedules({});
		}
	}, []);

	// お気に入りとスケジュールを更新する共通処理
	const updateFavoritesAndSchedules = useCallback(
		(updatedFavorites: FavoriteFacility[]) => {
			setFavorites(updatedFavorites);
			const facilityIds = updatedFavorites.map((f) => f.facility.id);
			const currentMonth = initializeSelectedMonths(facilityIds);
			fetchSchedules(facilityIds, currentMonth);
		},
		[initializeSelectedMonths, fetchSchedules]
	);

	useEffect(() => {
		// 初期同期: localStorageから読み込んで状態を初期化
		const initialStorageItems = readFavoritesFromStorage();
		const initialIds = initialStorageItems.map((f) => f.facilityId).sort().join(',');
		lastStorageRef.current = initialIds;

		if (initialStorageItems.length > 0) {
			const loadedFavorites = matchFavoritesWithFacilities(initialStorageItems, allFacilities);
			updateFavoritesAndSchedules(loadedFavorites);
		} else {
			setFavorites([]);
			setSchedules({});
			setSelectedMonths({});
		}

		// 変更検知ロジック: localStorageの変更を検知して状態を更新
		const checkStorageChanges = () => {
			const { favorites: updatedFavorites, snapshot: newSnapshot } = getFavoritesFromStorageSnapshot(
				lastStorageRef.current,
				allFacilities
			);

			// localStorageのスナップショットが変わった場合は状態を更新
			if (newSnapshot !== lastStorageRef.current) {
				lastStorageRef.current = newSnapshot;
				// マッチング結果が空の場合は再計算（allFacilities が更新された可能性）
				if (updatedFavorites.length === 0 && newSnapshot !== '') {
					const currentStorageItems = readFavoritesFromStorage();
					const recalculated = matchFavoritesWithFacilities(currentStorageItems, allFacilities);
					updateFavoritesAndSchedules(recalculated);
				} else {
					updateFavoritesAndSchedules(updatedFavorites);
				}
			}
		};

		// storageイベントで他のタブからの変更を検知
		const handleStorageEvent = (e: StorageEvent) => {
			if (e.key === 'csh_favorites') {
				checkStorageChanges();
			}
		};
		window.addEventListener('storage', handleStorageEvent);

		// カスタムイベントで同一タブ内の変更を検知（FacilitiesTableからの通知）
		const handleFavoritesUpdated = () => {
			checkStorageChanges();
		};
		window.addEventListener(FAVORITES_UPDATED_EVENT, handleFavoritesUpdated);

		// 定期的にチェック（フォールバック）
		const interval = setInterval(checkStorageChanges, 500);

		return () => {
			clearInterval(interval);
			window.removeEventListener('storage', handleStorageEvent);
			window.removeEventListener(FAVORITES_UPDATED_EVENT, handleFavoritesUpdated);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [allFacilities, updateFavoritesAndSchedules]);

	// お気に入り削除ハンドラ
	const handleRemove = useCallback(
		(facilityId: string) => {
			const currentStorageItems = readFavoritesFromStorage();
			const updated = removeFavorite(facilityId, currentStorageItems);
			updateFavoritesInStorage(updated);
			// 状態を即座に更新
			const updatedFavorites = matchFavoritesWithFacilities(updated, allFacilities);
			updateFavoritesAndSchedules(updatedFavorites);
			// カスタムイベントを発火してFacilitiesTableに通知
			window.dispatchEvent(new CustomEvent(FAVORITES_UPDATED_EVENT));
		},
		[allFacilities, updateFavoritesAndSchedules]
	);

	// 月の切り替えハンドラ
	const handleMonthChange = useCallback(
		async (facilityId: string, year: number, month: number) => {
			const targetMonth = getMonthFirstDay(year, month);

			// 選択月を即座に更新
			setSelectedMonths((prev) => ({ ...prev, [facilityId]: targetMonth }));

			// 該当施設のスケジュールを取得
			try {
				const scheduleMap = await getSchedulesByFacilityIdsAndMonth([facilityId], targetMonth);

				// 該当施設のスケジュールを更新（見つからない場合は削除）
				setSchedules((prev) => {
					const updated = { ...prev };
					if (scheduleMap[facilityId]) {
						updated[facilityId] = scheduleMap[facilityId];
					} else {
						// スケジュールが見つからない場合は削除
						delete updated[facilityId];
					}
					return updated;
				});
			} catch (error) {
				console.error('Failed to fetch schedule for month:', error);
				// エラー時も該当施設のスケジュールをクリア
				setSchedules((prev) => {
					const updated = { ...prev };
					delete updated[facilityId];
					return updated;
				});
			}
		},
		[]
	);

	return {
		favorites,
		schedules,
		selectedMonths,
		handleRemove,
		handleMonthChange,
	};
}

