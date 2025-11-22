'use client';

import { useEffect, useRef, useState } from 'react';
import { matchFavoritesWithFacilities } from '../lib/favorites';
import { getWardName } from '../lib/facilities-utils';
import type { FavoriteFacility } from '../lib/favorites';
import type { Facility } from '../lib/types';
import type { FavoriteCookieItem } from '../lib/storage';
import {
	readFavoritesFromStorage,
	updateFavoritesInStorage,
	addFavorite,
	removeFavorite,
	reorderFavorites,
} from '../lib/storage';

type FavoritesSectionProps = {
	initialFavorites: FavoriteFacility[];
	allFacilities: Facility[];
};

export function FavoritesSection({ initialFavorites, allFacilities }: FavoritesSectionProps) {
	// 初回マウント時にlocalStorageからお気に入りを読み込む
	const [initialState, setInitialState] = useState<FavoriteFacility[]>(initialFavorites);

	// FavoriteFacility[] から FavoriteCookieItem[] への変換ヘルパー
	const convertToCookieItems = (favorites: FavoriteFacility[]): FavoriteCookieItem[] =>
		favorites.map((f) => ({
			facilityId: f.facility.id,
			sortOrder: f.sortOrder,
		}));

	// お気に入りをクライアント側の状態として管理
	const [favorites, setFavorites] = useState<FavoriteFacility[]>(initialState);

	// localStorageの変更を監視して状態を同期（FacilitiesTableからの変更を検知）
	const lastStorageRef = useRef<string>('');
	const favoritesRef = useRef(favorites);
	
	// favoritesの最新値を常に保持
	useEffect(() => {
		favoritesRef.current = favorites;
	}, [favorites]);

	useEffect(() => {
		const checkStorageChanges = () => {
			const currentStorageItems = readFavoritesFromStorage();
			const currentIds = currentStorageItems.map((f) => f.facilityId).sort().join(',');
			
			// 前回のlocalStorage値と比較して変更があった場合のみ更新
			if (currentIds !== lastStorageRef.current) {
				lastStorageRef.current = currentIds;
				const stateIds = favoritesRef.current.map((f) => f.facility.id).sort().join(',');
				
				// localStorageと状態が一致しない場合は更新
				if (currentIds !== stateIds) {
					// localStorageから読み込んだデータで状態を更新
					const updatedFavorites = matchFavoritesWithFacilities(currentStorageItems, allFacilities);
					setFavorites(updatedFavorites);
				}
			}
		};

		// 初回チェックと状態の初期化
		const initialStorageItems = readFavoritesFromStorage();
		lastStorageRef.current = initialStorageItems.map((f) => f.facilityId).sort().join(',');
		
		// 初回読み込み時に状態を更新
		if (initialStorageItems.length > 0) {
			const loadedFavorites = matchFavoritesWithFacilities(initialStorageItems, allFacilities);
			setInitialState(loadedFavorites);
			setFavorites(loadedFavorites);
		} else {
			// localStorageが空の場合は初期状態をクリア
			setInitialState([]);
			setFavorites([]);
		}

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
		window.addEventListener('favoritesUpdated', handleFavoritesUpdated);

		// 定期的にチェック（フォールバック）
		const interval = setInterval(checkStorageChanges, 500);
		
		return () => {
			clearInterval(interval);
			window.removeEventListener('storage', handleStorageEvent);
			window.removeEventListener('favoritesUpdated', handleFavoritesUpdated);
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
		// カスタムイベントを発火してFacilitiesTableに通知
		window.dispatchEvent(new CustomEvent('favoritesUpdated'));
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
			{favorites.map((item) => (
				<article key={item.facility.id} className="rounded-xl border border-primary-100 bg-white p-3 shadow-sm">
					<header className="flex items-center justify-between">
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
					<div className="mt-3 h-64 rounded-lg bg-slate-50 flex items-center justify-center text-xs text-slate-400">
						<div className="text-center">
							<p className="mb-2">Instagram 埋め込み（プレースホルダー）</p>
							<a
								href={`/facilities/${item.facility.id}`}
								className="text-blue-600 hover:text-blue-800 underline"
							>
								スケジュール詳細を見る
							</a>
						</div>
					</div>
				</article>
			))}
		</div>
	);
}

