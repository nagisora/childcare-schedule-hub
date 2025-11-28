'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { matchFavoritesWithFacilities } from '../lib/favorites';
import { getWardName } from '../lib/facilities-utils';
import { getLatestSchedulesByFacilityIds, getSchedulesByFacilityIdsAndMonth } from '../lib/schedules';
import { InstagramEmbed } from './InstagramEmbed';
import type { FavoriteFacility } from '../lib/favorites';
import type { Facility, Schedule } from '../lib/types';
import {
	readFavoritesFromStorage,
	updateFavoritesInStorage,
	removeFavorite,
	FAVORITES_UPDATED_EVENT,
} from '../lib/storage';

type FavoritesSectionProps = {
	initialFavorites: FavoriteFacility[];
	allFacilities: Facility[];
};

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
 * 月の1日を取得する（YYYY-MM-DD形式、ローカルタイムゾーン）
 */
function getMonthFirstDay(year: number, month: number): string {
	const date = new Date(year, month - 1, 1);
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, '0');
	const d = String(date.getDate()).padStart(2, '0');
	return `${y}-${m}-${d}`;
}

/**
 * 現在の年月を取得（ローカルタイムゾーン）
 */
function getCurrentYearMonth(): { year: number; month: number } {
	const now = new Date();
	return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

/**
 * YYYY-MM-DD形式の文字列から年月を取得（ローカルタイムゾーン）
 */
function parseMonthString(monthStr: string): { year: number; month: number } {
	// YYYY-MM-DD形式をパース（ローカルタイムゾーンで解釈）
	const [year, month] = monthStr.split('-').map(Number);
	return { year, month };
}

export function FavoritesSection({ initialFavorites, allFacilities }: FavoritesSectionProps) {
	// お気に入りをクライアント側の状態として管理（単一のソース・オブ・トゥルース）
	const [favorites, setFavorites] = useState<FavoriteFacility[]>(initialFavorites);
	// スケジュールデータを管理
	const [schedules, setSchedules] = useState<Record<string, Schedule>>({});
	// 選択中の月を管理（各施設ごと）
	const [selectedMonths, setSelectedMonths] = useState<Record<string, string>>({});

	// localStorageの変更を監視して状態を同期（FacilitiesTableからの変更を検知）
	const lastStorageRef = useRef<string>('');

	// スケジュールデータを取得する関数
	const fetchSchedules = async (facilityIds: string[], targetMonth?: string) => {
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
	};

	// 施設ごとの選択月を初期化（今月をデフォルト）
	const initializeSelectedMonths = (facilityIds: string[]) => {
		const { year, month } = getCurrentYearMonth();
		const currentMonth = getMonthFirstDay(year, month);
		const initial: Record<string, string> = {};
		for (const id of facilityIds) {
			initial[id] = currentMonth;
		}
		setSelectedMonths(initial);
		return currentMonth;
	};

	useEffect(() => {
		// 初期同期: localStorageから読み込んで状態を初期化
		const initialStorageItems = readFavoritesFromStorage();
		const initialIds = initialStorageItems.map((f) => f.facilityId).sort().join(',');
		lastStorageRef.current = initialIds;

		if (initialStorageItems.length > 0) {
			const loadedFavorites = matchFavoritesWithFacilities(initialStorageItems, allFacilities);
			setFavorites(loadedFavorites);
			const facilityIds = loadedFavorites.map((f) => f.facility.id);
			// 選択月を初期化（今月）
			const currentMonth = initializeSelectedMonths(facilityIds);
			// スケジュールデータを取得（今月）
			fetchSchedules(facilityIds, currentMonth);
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
					setFavorites(recalculated);
					const facilityIds = recalculated.map((f) => f.facility.id);
					// 選択月を初期化（今月）
					const currentMonth = initializeSelectedMonths(facilityIds);
					// スケジュールデータを取得（今月）
					fetchSchedules(facilityIds, currentMonth);
				} else {
					setFavorites(updatedFavorites);
					const facilityIds = updatedFavorites.map((f) => f.facility.id);
					// 選択月を初期化（今月）
					const currentMonth = initializeSelectedMonths(facilityIds);
					// スケジュールデータを取得（今月）
					fetchSchedules(facilityIds, currentMonth);
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
	}, [allFacilities]); // allFacilitiesが変更されたら再初期化

	const handleRemove = (facilityId: string) => {
		const currentStorageItems = readFavoritesFromStorage();
		const updated = removeFavorite(facilityId, currentStorageItems);
		updateFavoritesInStorage(updated);
		// 状態を即座に更新
		const updatedFavorites = matchFavoritesWithFacilities(updated, allFacilities);
		setFavorites(updatedFavorites);
		const facilityIds = updatedFavorites.map((f) => f.facility.id);
		// 選択月を更新（今月）
		const currentMonth = initializeSelectedMonths(facilityIds);
		// スケジュールデータを更新（今月）
		fetchSchedules(facilityIds, currentMonth);
		// カスタムイベントを発火してFacilitiesTableに通知
		window.dispatchEvent(new CustomEvent(FAVORITES_UPDATED_EVENT));
	};

	// 月の切り替えハンドラ
	const handleMonthChange = useCallback(async (facilityId: string, year: number, month: number) => {
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
	}, []);

	// 月の表示名を取得（ローカルタイムゾーン）
	const getMonthLabel = (monthStr: string): string => {
		const { year, month } = parseMonthString(monthStr);
		return `${year}年${month}月`;
	};

	if (favorites.length === 0) {
		return (
			<div className="rounded-xl border bg-slate-50 p-8 text-center">
				<p className="text-sm text-slate-600">
					お気に入り登録がまだありません。下部の拠点一覧から「+」ボタンを押してお気に入りに追加してください。
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{favorites.map((item) => {
				const { year: currentYear, month: currentMonth } = getCurrentYearMonth();
				const selectedMonth = selectedMonths[item.facility.id] || getMonthFirstDay(currentYear, currentMonth);
				const { year: selectedYear, month: selectedMonthNum } = parseMonthString(selectedMonth);

				// 前月・次月の計算
				const prevMonth = selectedMonthNum === 1 ? 12 : selectedMonthNum - 1;
				const prevYear = selectedMonthNum === 1 ? selectedYear - 1 : selectedYear;
				const nextMonth = selectedMonthNum === 12 ? 1 : selectedMonthNum + 1;
				const nextYear = selectedMonthNum === 12 ? selectedYear + 1 : selectedYear;

				return (
					<article key={item.facility.id} className="rounded-xl border border-primary-100 bg-white p-3 shadow-sm">
						<header className="flex items-center justify-between mb-3">
							<h3 className="text-sm font-medium text-slate-900">
								<a href={`/facilities/${item.facility.id}`} className="hover:text-blue-600 hover:underline">
									{item.facility.name} — {getWardName(item.facility.ward_name)}
								</a>
							</h3>
							<button
								aria-label={`お気に入りから${item.facility.name}を削除`}
								className="btn-remove"
								onClick={() => handleRemove(item.facility.id)}
							>
								解除
							</button>
						</header>
						
						{/* 月切り替えボタン */}
						<div className="mb-3 flex items-center justify-center gap-2">
							<button
								onClick={() => handleMonthChange(item.facility.id, prevYear, prevMonth)}
								className="px-3 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 text-slate-700"
								aria-label="前月"
							>
								← 前月
							</button>
							<span className="px-3 py-1 text-sm font-medium text-slate-700 min-w-[100px] text-center">
								{getMonthLabel(selectedMonth)}
							</span>
							<button
								onClick={() => handleMonthChange(item.facility.id, nextYear, nextMonth)}
								className="px-3 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 text-slate-700"
								aria-label="次月"
							>
								次月 →
							</button>
						</div>

						{/* スケジュール表示 */}
						<div className="mt-3">
							{schedules[item.facility.id]?.instagram_post_url ? (
								<InstagramEmbed
									postUrl={schedules[item.facility.id].instagram_post_url!}
									className="rounded-lg overflow-hidden"
								/>
							) : (
								<div className="h-64 rounded-lg bg-slate-50 flex items-center justify-center text-xs text-slate-400">
									<div className="text-center">
										<p className="mb-2">{getMonthLabel(selectedMonth)}のスケジュールが登録されていません</p>
										<a
											href={`/facilities/${item.facility.id}`}
											className="text-blue-600 hover:text-blue-800 underline"
										>
											詳細ページを見る
										</a>
									</div>
								</div>
							)}
						</div>
					</article>
				);
			})}
		</div>
	);
}

