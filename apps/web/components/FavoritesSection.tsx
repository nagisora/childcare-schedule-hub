'use client';

import { useOptimistic, useEffect, useRef } from 'react';
import { matchFavoritesWithFacilities } from '../lib/favorites';
import { getWardName } from '../lib/facilities-utils';
import type { FavoriteFacility } from '../lib/favorites';
import type { Facility } from '../lib/types';
import type { FavoriteCookieItem } from '../lib/cookies';
import {
	readFavoritesCookieClient,
	updateFavoritesCookieClient,
	addFavorite,
	removeFavorite,
	reorderFavorites,
} from '../lib/cookies';

type FavoritesSectionProps = {
	initialFavorites: FavoriteFacility[];
	allFacilities: Facility[];
};

export function FavoritesSection({ initialFavorites, allFacilities }: FavoritesSectionProps) {
	// FavoriteFacility[] から FavoriteCookieItem[] への変換ヘルパー
	const convertToCookieItems = (favorites: FavoriteFacility[]): FavoriteCookieItem[] =>
		favorites.map((f) => ({
			facilityId: f.facility.id,
			sortOrder: f.sortOrder,
		}));

	// お気に入りをクライアント側の状態として管理（useOptimistic で即時反映）
	const [favorites, setFavorites] = useOptimistic(
		initialFavorites,
		(state, action: { type: 'add' | 'remove' | 'reorder'; payload: { facilityId?: string; facilityIds?: string[] } }) => {
			const currentCookieItems = convertToCookieItems(state);

			if (action.type === 'add') {
				const { facilityId } = action.payload;
				if (!facilityId) return state;
				const updated = addFavorite(facilityId, currentCookieItems);
				return matchFavoritesWithFacilities(updated, allFacilities);
			}

			if (action.type === 'remove') {
				const { facilityId } = action.payload;
				if (!facilityId) return state;
				const updated = removeFavorite(facilityId, currentCookieItems);
				return matchFavoritesWithFacilities(updated, allFacilities);
			}
			
			if (action.type === 'reorder') {
				const { facilityIds } = action.payload;
				if (!facilityIds) return state;
				const updated = reorderFavorites(facilityIds, currentCookieItems);
				return matchFavoritesWithFacilities(updated, allFacilities);
			}
			
			return state;
		},
	);

	// クッキーの変更を監視して状態を同期（FacilitiesTableからの変更を検知）
	const lastCookieRef = useRef<string>('');
	const favoritesRef = useRef(favorites);
	
	// favoritesの最新値を常に保持
	useEffect(() => {
		favoritesRef.current = favorites;
	}, [favorites]);

	useEffect(() => {
		const checkCookieChanges = () => {
			const currentCookieItems = readFavoritesCookieClient();
			const currentIds = currentCookieItems.map((f) => f.facilityId).sort().join(',');
			
			// 前回のクッキー値と比較して変更があった場合のみ更新
			if (currentIds !== lastCookieRef.current) {
				lastCookieRef.current = currentIds;
				const stateIds = favoritesRef.current.map((f) => f.facility.id).sort().join(',');
				
				// クッキーと状態が一致しない場合は更新
				if (currentIds !== stateIds) {
					// reorderアクションを使って状態を更新（facilityIdsの順序に基づいてsortOrderを再割り当て）
					setFavorites({ type: 'reorder', payload: { facilityIds: currentCookieItems.map((f) => f.facilityId) } });
				}
			}
		};

		// 初回チェック
		const initialCookieItems = readFavoritesCookieClient();
		lastCookieRef.current = initialCookieItems.map((f) => f.facilityId).sort().join(',');

		// 定期的にチェック（FacilitiesTableからの変更を検知）
		const interval = setInterval(checkCookieChanges, 300);
		return () => clearInterval(interval);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []); // 初回のみ実行

	const handleRemove = (facilityId: string) => {
		setFavorites({ type: 'remove', payload: { facilityId } });
		const currentCookieItems = readFavoritesCookieClient();
		const updated = removeFavorite(facilityId, currentCookieItems);
		updateFavoritesCookieClient(updated);
		// ページリロードは削除（クライアント側の状態のみで管理）
		// 拠点一覧テーブルの更新は、次回ページ読み込み時に反映される
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

