import type { Facility } from './types';
import type { FavoriteCookieItem } from './storage';

/**
 * お気に入りクッキーアイテムと Facility を結合した型
 */
export type FavoriteFacility = {
	facility: Facility;
	sortOrder: number;
};

/**
 * お気に入りクッキーアイテムを Facility データとマッチングする
 * @param favoriteItems お気に入りクッキーアイテム配列
 * @param facilities 全拠点一覧
 * @returns お気に入り拠点配列（Facility データを含む）
 */
export function matchFavoritesWithFacilities(
	favoriteItems: FavoriteCookieItem[],
	facilities: Facility[],
): FavoriteFacility[] {
	const facilityMap = new Map(facilities.map((f) => [f.id, f]));

	return favoriteItems
		.map((item) => {
			const facility = facilityMap.get(item.facilityId);
			if (!facility) {
				return null;
			}
			return {
				facility,
				sortOrder: item.sortOrder,
			};
		})
		.filter((item): item is FavoriteFacility => item !== null)
		.sort((a, b) => a.sortOrder - b.sortOrder);
}

