'use client';

import React, { useState, useEffect } from 'react';
import { addFavorite, removeFavorite, readFavoritesFromStorage, updateFavoritesInStorage, FAVORITES_UPDATED_EVENT } from '../lib/storage';
import { getWardName } from '../lib/facilities-utils';
import type { FacilitiesByWard } from '../lib/types';

type FacilitiesTableProps = {
	wards: string[];
	facilitiesByWard: FacilitiesByWard;
	/**
	 * サーバーサイドで取得したお気に入りID（Hydrationエラー回避用）
	 * SSR とクライアントサイドの初期状態を一致させるために使用
	 */
	initialFavoriteIds?: string[];
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
		window.addEventListener(FAVORITES_UPDATED_EVENT, handleFavoritesUpdated);
		
		return () => {
			window.removeEventListener(FAVORITES_UPDATED_EVENT, handleFavoritesUpdated);
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
		window.dispatchEvent(new CustomEvent(FAVORITES_UPDATED_EVENT));
	};

	const handleRemoveFavorite = (facilityId: string) => {
		const currentFavorites = readFavoritesFromStorage();
		const updated = removeFavorite(facilityId, currentFavorites);

		updateFavoritesInStorage(updated);
		// クライアント側の状態も即時更新
		setFavoriteIds(new Set(updated.map((f) => f.facilityId)));
		// カスタムイベントを発火してFavoritesSectionに通知
		window.dispatchEvent(new CustomEvent(FAVORITES_UPDATED_EVENT));
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

			<p className="mb-2 text-xs text-slate-600">
				※ 各区の一番上は「応援」、それ以外は「支援」拠点です
			</p>

			<div className="overflow-x-auto rounded-xl border border-primary-100 bg-white shadow-sm">
				<table className="w-full text-sm">
					<thead className="bg-slate-50 text-slate-600">
						<tr>
							{/* お気に入り列はアイコンのみ表示して列幅を抑える。ラベルはスクリーンリーダー向けに保持 */}
							<th scope="col" className="px-2 py-2 text-center font-medium">
								<span className="sr-only">お気に入り</span>
								<span aria-hidden="true">★</span>
							</th>
							{/* 区名は各行の上にあるグルーピング行（bg-primary-50）で表示されているため、区名の列は不要 */}
							<th className="text-left font-medium px-3 py-2">拠点名</th>
						</tr>
					</thead>
					<tbody>
						{wards.map((ward) => (
							<React.Fragment key={ward}>
								{/* 区名のグルーピング行: お気に入り列は空セルにして、拠点名列の位置に区名を表示 */}
								<tr className="bg-primary-50 border-t border-l-4 border-primary-300">
									<td className="px-3 py-3" aria-hidden="true" />
									<td
										className="px-3 py-3 text-sm font-bold text-primary-900 tracking-wide"
										id={`ward-${ward}`}
									>
										{ward}
									</td>
								</tr>
								{(() => {
									const facilities = facilitiesByWard[ward] ?? [];
									const ouen = facilities.filter(f => f.facility_type === 'childcare_ouen_base');
									const others = facilities.filter(f => f.facility_type !== 'childcare_ouen_base');
									const orderedFacilities = [...ouen, ...others];
									return orderedFacilities.map((f) => {
										const isFavorite = favoriteIds.has(f.id);
										const isOuenBase = f.facility_type === 'childcare_ouen_base';
										return (
											<tr key={f.id} className={`border-t ${isOuenBase ? 'bg-primary-50/60' : ''}`}>
												{/* 区名・住所・電話の列を削除: 区名は上記のグルーピング行で表示、住所・電話は詳細ページで確認可能 */}
												<td className="px-2 py-2 text-center">
													{isFavorite ? (
														<button
															aria-label={`${f.name}をお気に入りから削除`}
															className="btn-remove"
															onClick={() => handleRemoveFavorite(f.id)}
														>
															−
														</button>
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
												<td className="px-3 py-2 font-medium text-slate-900">
													{f.name}
												</td>
											</tr>
										);
									});
								})()}
							</React.Fragment>
						))}
					</tbody>
				</table>
			</div>
		</section>
	);
}


