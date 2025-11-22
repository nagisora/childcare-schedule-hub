'use client';

import React, { useState, useEffect } from 'react';
import { addFavorite, readFavoritesFromStorage, updateFavoritesInStorage } from '../lib/storage';
import { getWardName } from '../lib/facilities-utils';
import type { FacilitiesByWard } from '../lib/types';

type FacilitiesTableProps = {
	wards: string[];
	facilitiesByWard: FacilitiesByWard;
	initialFavoriteIds?: string[]; // サーバーサイドで取得したお気に入りID（Hydrationエラー回避）
};

export function FacilitiesTable({ wards, facilitiesByWard, initialFavoriteIds = [] }: FacilitiesTableProps) {
	// サーバーサイドの初期値とクライアントサイドの状態を同期
	const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set(initialFavoriteIds));

	useEffect(() => {
		// クライアントサイドでマウント後にlocalStorageから最新の状態を取得
		const updateFavoriteIds = () => {
			const currentFavorites = readFavoritesFromStorage();
			setFavoriteIds(new Set(currentFavorites.map((f) => f.facilityId)));
		};
		
		// 初回読み込み
		updateFavoriteIds();
		
		// カスタムイベントでお気に入りの変更を検知
		const handleFavoritesUpdated = () => {
			updateFavoriteIds();
		};
		window.addEventListener('favoritesUpdated', handleFavoritesUpdated);
		
		return () => {
			window.removeEventListener('favoritesUpdated', handleFavoritesUpdated);
		};
	}, []);

	const handleAddFavorite = (facilityId: string) => {
		const currentFavorites = readFavoritesFromStorage();
		const updated = addFavorite(facilityId, currentFavorites);
		
		// 最大件数に達している場合は追加できない
		if (updated.length === currentFavorites.length) {
			alert('お気に入りは最大5件まで登録できます。');
			return;
		}

		updateFavoritesInStorage(updated);
		// クライアント側の状態も即時更新して「追加済み」を反映
		setFavoriteIds(new Set(updated.map((f) => f.facilityId)));
		// カスタムイベントを発火してFavoritesSectionに通知
		window.dispatchEvent(new CustomEvent('favoritesUpdated'));
	};

	return (
		<section aria-labelledby="facilities-heading" className="max-w-6xl mx-auto bg-white rounded-2xl px-4 py-4">
			<h2 id="facilities-heading" className="text-xl font-semibold mb-4 text-slate-900">
				拠点一覧
			</h2>
			<nav className="mb-3 flex flex-wrap gap-2 text-xs text-slate-600">
				{wards.map((ward) => (
					<a key={ward} className="rounded-full border border-primary-200 bg-white px-2 py-0.5 text-primary-700 hover:bg-primary-50" href={`#ward-${ward}`}>
						{ward}へ
					</a>
				))}
			</nav>

			<div className="overflow-x-auto rounded-xl border border-primary-100 bg-white shadow-sm">
				<table className="w-full text-sm">
					<thead className="bg-slate-50 text-slate-600">
						<tr>
							<th className="text-left font-medium px-3 py-2">拠点名</th>
							<th className="text-left font-medium px-3 py-2">区</th>
							<th className="text-left font-medium px-3 py-2">住所</th>
							<th className="text-left font-medium px-3 py-2">電話</th>
							<th className="text-left font-medium px-3 py-2">お気に入り</th>
						</tr>
					</thead>
					<tbody>
						{wards.map((ward) => (
							<React.Fragment key={ward}>
								<tr className="bg-slate-50/70 border-t">
									<td colSpan={5} className="px-3 py-2 font-semibold text-slate-700" id={`ward-${ward}`}>
										{ward}
									</td>
								</tr>
								{(facilitiesByWard[ward] ?? []).map((f) => {
									const isFavorite = favoriteIds.has(f.id);
									return (
										<tr key={f.id} className="border-t">
										<td className="px-3 py-2 font-medium text-slate-900">{f.name}</td>
										<td className="px-3 py-2 text-slate-700 whitespace-nowrap">{getWardName(f.ward_name)}</td>
										<td className="px-3 py-2 text-slate-700">{f.address_full_raw}</td>
											<td className="px-3 py-2 text-slate-700 whitespace-nowrap">{f.phone || '-'}</td>
										<td className="px-3 py-2">
												{isFavorite ? (
													<span className="text-xs text-slate-400">追加済み</span>
												) : (
											<button
														aria-label={`${f.name}をお気に入りに追加`}
												className="btn-add"
														onClick={() => handleAddFavorite(f.id)}
											>
												＋
											</button>
												)}
										</td>
									</tr>
									);
								})}
							</React.Fragment>
						))}
					</tbody>
				</table>
			</div>
		</section>
	);
}


