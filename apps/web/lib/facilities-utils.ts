import type { Facility, FacilitiesByArea } from './types';

/**
 * 拠点一覧をエリア別にグルーピングする（ユーティリティ関数）
 * Supabase に依存しない純粋な関数として分離
 * @param facilities 拠点一覧
 * @returns エリアをキー、拠点配列を値とするオブジェクトと、エリア名の配列
 */
export function groupFacilitiesByArea(facilities: Facility[]): {
	areas: string[];
	facilitiesByArea: FacilitiesByArea;
} {
	const facilitiesByArea: FacilitiesByArea = {};

	for (const facility of facilities) {
		const area = facility.area;
		if (!facilitiesByArea[area]) {
			facilitiesByArea[area] = [];
		}
		facilitiesByArea[area].push(facility);
	}

	const areas = Object.keys(facilitiesByArea).sort();

	return { areas, facilitiesByArea };
}

