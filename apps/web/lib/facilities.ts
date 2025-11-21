import { supabase } from './supabase';
import type { Facility } from './types';
import { groupFacilitiesByWard as groupFacilitiesByWardUtil } from './facilities-utils';

/**
 * Supabase から拠点一覧を取得する
 * [03 API 仕様](../docs/03-api.md) 2.2.1節を参照
 */
export async function getFacilities(): Promise<Facility[]> {
	const { data, error } = await supabase
		.from('facilities')
		.select('id,name,ward_name,address_full_raw,phone,instagram_url,website_url,facility_type,detail_page_url')
		.order('ward_name', { ascending: true, nullsFirst: false })
		.order('name', { ascending: true });

	if (error) {
		throw new Error(`Failed to fetch facilities: ${error.message}`);
	}

	return data || [];
}

/**
 * 拠点一覧を区別にグルーピングする
 * @param facilities 拠点一覧
 * @returns 区名をキー、拠点配列を値とするオブジェクトと、区名の配列
 */
export { groupFacilitiesByWardUtil as groupFacilitiesByWard };

