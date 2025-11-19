import { supabase } from './supabase';
import type { Facility } from './types';
import { groupFacilitiesByArea as groupFacilitiesByAreaUtil } from './facilities-utils';

/**
 * Supabase から拠点一覧を取得する
 * [03 API 仕様](../docs/03-api.md) 2.2.1節を参照
 */
export async function getFacilities(): Promise<Facility[]> {
	const { data, error } = await supabase
		.from('facilities')
		.select('id,name,area,address,phone,instagram_url,website_url')
		.order('area', { ascending: true })
		.order('name', { ascending: true });

	if (error) {
		throw new Error(`Failed to fetch facilities: ${error.message}`);
	}

	return data || [];
}

/**
 * 拠点一覧をエリア別にグルーピングする
 * @param facilities 拠点一覧
 * @returns エリアをキー、拠点配列を値とするオブジェクトと、エリア名の配列
 */
export { groupFacilitiesByAreaUtil as groupFacilitiesByArea };

