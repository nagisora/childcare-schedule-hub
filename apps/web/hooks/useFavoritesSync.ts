'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { matchFavoritesWithFacilities } from '../lib/favorites';
import { getLatestSchedulesByFacilityIds, getSchedulesByFacilityIdsAndMonth } from '../lib/schedules';
import {
	readFavoritesFromStorage,
	updateFavoritesInStorage,
	removeFavorite,
	reorderFavorites,
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
	// 施設IDごとのローディング状態
	const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
	// 施設IDごとのエラー状態
	const [errors, setErrors] = useState<Record<string, Error | null>>({});
	const lastStorageRef = useRef<string>('');
	// レースコンディション対策: 選択月の最新値を保持
	const selectedMonthsRef = useRef<Record<string, string>>({});

	// 選択月をマージする純粋関数（既存の選択月を保持しつつ、新規施設のみ今月を設定）
	// @param facilityIds 最新のお気に入り施設IDの配列
	// @param prev 現在の選択月マップ
	// @returns 次の選択月マップと新規追加された施設IDの配列
	const mergeSelectedMonths = useCallback(
		(facilityIds: string[], prev: Record<string, string>): { next: Record<string, string>; newIds: string[] } => {
			const { year, month } = getCurrentYearMonth();
			const currentMonth = getMonthFirstDay(year, month);
			const next: Record<string, string> = {};
			const newIds: string[] = [];

			for (const id of facilityIds) {
				// 既存の選択月があれば維持、なければ今月を設定
				if (prev[id]) {
					next[id] = prev[id];
				} else {
					next[id] = currentMonth;
					newIds.push(id);
				}
			}

			return { next, newIds };
		},
		[]
	);

	// ヘルパー関数: 複数の施設IDに対してローディング状態を設定
	const setLoadingForIds = useCallback((facilityIds: string[], isLoading: boolean) => {
		setLoadingStates((prev) => {
			const updated = { ...prev };
			for (const id of facilityIds) {
				updated[id] = isLoading;
			}
			return updated;
		});
	}, []);

	// ヘルパー関数: 複数の施設IDに対してエラー状態をクリア
	const clearErrorsForIds = useCallback((facilityIds: string[]) => {
		setErrors((prev) => {
			const updated = { ...prev };
			for (const id of facilityIds) {
				updated[id] = null;
			}
			return updated;
		});
	}, []);

	// ヘルパー関数: 複数の施設IDに対してエラー状態を設定
	const setErrorsForIds = useCallback((facilityIds: string[], error: Error) => {
		setErrors((prev) => {
			const updated = { ...prev };
			for (const id of facilityIds) {
				updated[id] = error;
			}
			return updated;
		});
	}, []);

	// ヘルパー関数: スケジュールマップを更新（既存のスケジュールを保持しつつ、指定された施設IDのスケジュールのみを更新）
	const updateSchedulesForIds = useCallback((facilityIds: string[], scheduleMap: Record<string, Schedule>) => {
		setSchedules((prev) => {
			const updated = { ...prev };
			for (const id of facilityIds) {
				if (scheduleMap[id]) {
					updated[id] = scheduleMap[id];
				} else {
					// スケジュールが見つからない場合は削除（該当施設のみ）
					delete updated[id];
				}
			}
			return updated;
		});
	}, []);

	// ヘルパー関数: エラー時にスケジュールをクリア
	const clearSchedulesForIds = useCallback((facilityIds: string[]) => {
		setSchedules((prev) => {
			const updated = { ...prev };
		for (const id of facilityIds) {
				delete updated[id];
		}
			return updated;
		});
	}, []);

	// スケジュールデータを取得する関数
	// 既存のスケジュールを保持しつつ、指定された施設IDのスケジュールのみを更新する
	const fetchSchedules = useCallback(
		async (facilityIds: string[], targetMonth?: string) => {
		if (facilityIds.length === 0) {
			// 空配列の場合は何もしない（既存のスケジュールを保持）
			return;
		}

			// ローディング状態を開始
			setLoadingForIds(facilityIds, true);
			// エラー状態をクリア
			clearErrorsForIds(facilityIds);

		try {
			let scheduleMap: Record<string, Schedule>;
			if (targetMonth) {
				// 指定月のスケジュールを取得
				scheduleMap = await getSchedulesByFacilityIdsAndMonth(facilityIds, targetMonth);
			} else {
				// 最新のスケジュールを取得
				scheduleMap = await getLatestSchedulesByFacilityIds(facilityIds);
			}

			// 既存のスケジュールを保持しつつ、取得した施設IDのスケジュールのみを更新
			updateSchedulesForIds(facilityIds, scheduleMap);
		} catch (error) {
			console.error('Failed to fetch schedules:', error);
			// エラー状態を設定
			const errorObj = error instanceof Error ? error : new Error('スケジュールの取得に失敗しました');
			setErrorsForIds(facilityIds, errorObj);
			// エラー時も該当施設のスケジュールのみを削除（他の施設のスケジュールは保持）
			clearSchedulesForIds(facilityIds);
		} finally {
			// ローディング状態を終了
			setLoadingForIds(facilityIds, false);
		}
	},
		[setLoadingForIds, clearErrorsForIds, setErrorsForIds, updateSchedulesForIds, clearSchedulesForIds]
	);

	// ヘルパー関数: 新規追加された施設のスケジュールを取得（今月）
	const fetchSchedulesForNewFacilities = useCallback(
		(newIds: string[]) => {
			if (newIds.length > 0) {
				const { year, month } = getCurrentYearMonth();
				const currentMonth = getMonthFirstDay(year, month);
				fetchSchedules(newIds, currentMonth);
			}
		},
		[fetchSchedules]
	);

	// ヘルパー関数: 削除された施設のスケジュール・ローディング・エラー状態をクリア
	const clearStatesForRemovedFacilities = useCallback((currentFacilityIds: string[]) => {
		const currentIdsSet = new Set(currentFacilityIds);

		// スケジュールをクリア
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

		// ローディング状態をクリア
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

		// エラー状態をクリア
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

	// お気に入りとスケジュールを更新する共通処理
	// 既存の選択月を保持しつつ、新規施設のみ今月を設定
	const updateFavoritesAndSchedules = useCallback(
		(updatedFavorites: FavoriteFacility[]) => {
			setFavorites(updatedFavorites);
			const facilityIds = updatedFavorites.map((f) => f.facility.id);

			// 選択月をマージ（既存の選択月を保持しつつ、新規施設のみ今月を設定）
			setSelectedMonths((prev) => {
				const { next, newIds } = mergeSelectedMonths(facilityIds, prev);
				// 新規追加された施設のスケジュールを取得（今月）
				// 既存施設のスケジュールは schedules 状態に既に保持されているため、取得不要
				fetchSchedulesForNewFacilities(newIds);
				return next;
			});

			// 削除された施設のスケジュール・ローディング・エラー状態をクリア
			clearStatesForRemovedFacilities(facilityIds);
		},
		[mergeSelectedMonths, fetchSchedulesForNewFacilities, clearStatesForRemovedFacilities]
	);

	// selectedMonths の変更を selectedMonthsRef に反映
	useEffect(() => {
		selectedMonthsRef.current = selectedMonths;
	}, [selectedMonths]);

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

	// ヘルパー関数: localStorage の更新と状態の同期を行う共通処理
	// この関数は、localStorage を更新した後に状態を即座に反映し、他のコンポーネントに通知する
	const syncFavoritesFromStorage = useCallback(
		(updatedStorageItems: ReturnType<typeof readFavoritesFromStorage>) => {
			updateFavoritesInStorage(updatedStorageItems);
			const updatedFavorites = matchFavoritesWithFacilities(updatedStorageItems, allFacilities);
			updateFavoritesAndSchedules(updatedFavorites);
			// カスタムイベントを発火してFacilitiesTableに通知
			window.dispatchEvent(new CustomEvent(FAVORITES_UPDATED_EVENT));
		},
		[allFacilities, updateFavoritesAndSchedules]
	);

	// お気に入り削除ハンドラ
	const handleRemove = useCallback(
		(facilityId: string) => {
			const currentStorageItems = readFavoritesFromStorage();
			const updated = removeFavorite(facilityId, currentStorageItems);
			syncFavoritesFromStorage(updated);
		},
		[syncFavoritesFromStorage]
	);

	// お気に入り並び替えハンドラ
	const handleMove = useCallback(
		(facilityId: string, direction: 'up' | 'down') => {
			const currentStorageItems = readFavoritesFromStorage();
			const currentIds = currentStorageItems.map((f) => f.facilityId);
			const currentIndex = currentIds.indexOf(facilityId);

			// 移動できない場合は何もしない
			if (currentIndex === -1) {
				return;
			}
			if (direction === 'up' && currentIndex === 0) {
				return;
			}
			if (direction === 'down' && currentIndex === currentIds.length - 1) {
				return;
			}

			// 新しい順序を計算
			const newIds = [...currentIds];
			const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
			[newIds[currentIndex], newIds[targetIndex]] = [newIds[targetIndex], newIds[currentIndex]];

			// 並び順を更新
			const updated = reorderFavorites(newIds, currentStorageItems);
			
			// localStorage を更新し、状態を即座に反映
			syncFavoritesFromStorage(updated);
			
			// スナップショットを更新して、checkStorageChanges が再度実行されないようにする
			// getFavoritesFromStorageSnapshot はIDをソートして比較するため、
			// 順序変更を検知できない。そのため、スナップショットを手動で更新する
			// ソート済みのスナップショットを設定することで、checkStorageChanges が変更を検知しないようにする
			const newSnapshot = updated.map((f) => f.facilityId).sort().join(',');
			lastStorageRef.current = newSnapshot;
		},
		[syncFavoritesFromStorage]
	);

	// 月の切り替えハンドラ
	// レースコンディション対策: リクエスト完了時に選択月が変わっていない場合のみスケジュールを更新
	const handleMonthChange = useCallback(
		async (facilityId: string, year: number, month: number) => {
			const targetMonth = getMonthFirstDay(year, month);

			// 選択月を即座に更新
			setSelectedMonths((prev) => ({ ...prev, [facilityId]: targetMonth }));

		// ローディング状態を開始、エラー状態をクリア
		setLoadingForIds([facilityId], true);
		clearErrorsForIds([facilityId]);

			// 該当施設のスケジュールを取得
			try {
				const scheduleMap = await getSchedulesByFacilityIdsAndMonth([facilityId], targetMonth);

				// レースコンディション対策: リクエスト完了時に選択月が変わっていない場合のみ更新
				if (selectedMonthsRef.current[facilityId] !== targetMonth) {
					// ユーザーが別の月を選択していた場合は結果を破棄
					setLoadingForIds([facilityId], false);
					return;
				}

				// 該当施設のスケジュールを更新（見つからない場合は削除）
				updateSchedulesForIds([facilityId], scheduleMap);
			} catch (error) {
				console.error('Failed to fetch schedule for month:', error);
				// レースコンディション対策: エラー時も選択月が変わっていない場合のみクリア
				if (selectedMonthsRef.current[facilityId] !== targetMonth) {
					// ユーザーが別の月を選択していた場合は結果を破棄
					setLoadingForIds([facilityId], false);
					return;
				}
				// エラー状態を設定
				const errorObj = error instanceof Error ? error : new Error('スケジュールの取得に失敗しました');
				setErrorsForIds([facilityId], errorObj);
				// エラー時も該当施設のスケジュールをクリア
				clearSchedulesForIds([facilityId]);
			} finally {
				// ローディング状態を終了
				setLoadingForIds([facilityId], false);
			}
		},
		[setLoadingForIds, clearErrorsForIds, setErrorsForIds, updateSchedulesForIds, clearSchedulesForIds]
	);

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

