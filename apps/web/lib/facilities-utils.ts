import type { Facility, FacilitiesByWard } from './types';

/**
 * 区名がnullの場合のデフォルト値
 */
export const UNKNOWN_WARD_NAME = 'エリア不明';

/**
 * 拠点一覧を区別にグルーピングする（ユーティリティ関数）
 * Supabase に依存しない純粋な関数として分離
 * @param facilities 拠点一覧
 * @returns 区名をキー、拠点配列を値とするオブジェクトと、区名の配列
 */
export function groupFacilitiesByWard(facilities: Facility[]): {
	wards: string[];
	facilitiesByWard: FacilitiesByWard;
} {
	const facilitiesByWard = facilities.reduce<FacilitiesByWard>((acc, facility) => {
		const ward = facility.ward_name ?? UNKNOWN_WARD_NAME;
		if (!acc[ward]) {
			acc[ward] = [];
		}
		acc[ward].push(facility);
		return acc;
	}, {});

	const wards = Object.keys(facilitiesByWard).sort();

	return { wards, facilitiesByWard };
}

