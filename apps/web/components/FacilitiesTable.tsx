'use client';

import { addFavorite, readFavoritesCookieClient, updateFavoritesCookieClient } from '../lib/cookies';
import type { FacilitiesByArea } from '../lib/types';

type FacilitiesTableProps = {
	areas: string[];
	facilitiesByArea: FacilitiesByArea;
};

export function FacilitiesTable({ areas, facilitiesByArea }: FacilitiesTableProps) {
	const handleAddFavorite = (facilityId: string) => {
		const currentFavorites = readFavoritesCookieClient();
		const updated = addFavorite(facilityId, currentFavorites);
		
		// 最大件数に達している場合は追加できない
		if (updated.length === currentFavorites.length) {
			alert('お気に入りは最大5件まで登録できます。');
			return;
		}

		updateFavoritesCookieClient(updated);
		// クッキー更新後にページを再読み込み（簡易実装）
		// 将来的には Route Handler 経由で revalidateTag を呼び出す
		window.location.reload();
	};

	// 現在のお気に入りを取得して、既に追加されているかチェック
	const currentFavorites = readFavoritesCookieClient();
	const favoriteIds = new Set(currentFavorites.map((f) => f.facilityId));

	return (
		<section aria-labelledby="facilities-heading" className="max-w-6xl mx-auto">
			<h2 id="facilities-heading" className="text-xl font-semibold mb-4 text-slate-900">
				拠点一覧
			</h2>
			<nav className="mb-3 flex flex-wrap gap-2 text-xs text-slate-600">
				{areas.map((area) => (
					<a key={area} className="rounded-full border px-2 py-0.5 hover:bg-slate-50" href={`#area-${area}`}>
						{area}へ
					</a>
				))}
			</nav>

			<div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
				<table className="w-full text-sm">
					<thead className="bg-slate-50 text-slate-600">
						<tr>
							<th className="text-left font-medium px-3 py-2">拠点名</th>
							<th className="text-left font-medium px-3 py-2">エリア</th>
							<th className="text-left font-medium px-3 py-2">住所</th>
							<th className="text-left font-medium px-3 py-2">電話</th>
							<th className="text-left font-medium px-3 py-2">お気に入り</th>
						</tr>
					</thead>
					<tbody>
						{areas.map((area) => (
							<>
								<tr key={`hdr-${area}`} className="bg-slate-50/70 border-t">
									<td colSpan={5} className="px-3 py-2 font-semibold text-slate-700" id={`area-${area}`}>
										{area}
									</td>
								</tr>
								{(facilitiesByArea[area] || []).map((f) => {
									const isFavorite = favoriteIds.has(f.id);
									return (
										<tr key={f.id} className="border-t">
										<td className="px-3 py-2 font-medium text-slate-900">{f.name}</td>
										<td className="px-3 py-2 text-slate-700 whitespace-nowrap">{f.area}</td>
										<td className="px-3 py-2 text-slate-700">{f.address}</td>
											<td className="px-3 py-2 text-slate-700 whitespace-nowrap">{f.phone || '-'}</td>
										<td className="px-3 py-2">
												{isFavorite ? (
													<span className="text-xs text-slate-400">追加済み</span>
												) : (
											<button
														aria-label={`${f.name}をお気に入りに追加`}
												className="rounded-md border px-2 py-1 text-xs hover:bg-slate-50"
														onClick={() => handleAddFavorite(f.id)}
											>
												＋
											</button>
												)}
										</td>
									</tr>
									);
								})}
							</>
						))}
					</tbody>
				</table>
			</div>
		</section>
	);
}


