'use client';

import { useOptimistic } from 'react';
import { matchFavoritesWithFacilities } from '../lib/favorites';
import type { FavoriteFacility } from '../lib/favorites';
import type { Facility } from '../lib/types';
import type { FavoriteCookieItem } from '../lib/cookies';
import {
	readFavoritesCookieClient,
	updateFavoritesCookieClient,
	removeFavorite,
	reorderFavorites,
} from '../lib/cookies';

type FavoritesSectionProps = {
	initialFavorites: FavoriteFacility[];
	allFacilities: Facility[];
	limit: number; // 将来の最大件数制限用（現在は未使用）
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
		(state, action: { type: 'remove' | 'reorder'; payload: { facilityId?: string; facilityIds?: string[] } }) => {
			const currentCookieItems = convertToCookieItems(state);

			if (action.type === 'remove') {
				const { facilityId } = action.payload;
				if (!facilityId) {
					return state;
				}
				const updated = removeFavorite(facilityId, currentCookieItems);
				return matchFavoritesWithFacilities(updated, allFacilities);
			}
			if (action.type === 'reorder') {
				const { facilityIds } = action.payload;
				if (!facilityIds) {
					return state;
				}
				const updated = reorderFavorites(facilityIds, currentCookieItems);
				return matchFavoritesWithFacilities(updated, allFacilities);
			}
			return state;
		},
	);

	const handleRemove = (facilityId: string) => {
		setFavorites({ type: 'remove', payload: { facilityId } });
		const currentCookieItems = readFavoritesCookieClient();
		const updated = removeFavorite(facilityId, currentCookieItems);
		updateFavoritesCookieClient(updated);
		// クッキー更新後にページを再読み込み（簡易実装）
		// 将来的には Route Handler 経由で revalidateTag を呼び出す
		window.location.reload();
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
								{item.facility.name} — {item.facility.area}
							</a>
						</h3>
						<button
							aria-label={`お気に入りから${item.facility.name}を削除`}
							className="rounded-md border border-primary-200 px-2 py-1 text-xs text-primary-700 hover:bg-primary-50"
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

