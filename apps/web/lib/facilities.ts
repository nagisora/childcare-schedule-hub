import { supabase } from './supabase';
import type { Facility } from './types';

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
 * IDで拠点を1件取得する
 * @param id 拠点ID
 * @returns 拠点データ（見つからない場合は null）
 */
export async function getFacilityById(id: string): Promise<Facility | null> {
	const { data, error } = await supabase
		.from('facilities')
		.select('id,name,ward_name,address_full_raw,phone,instagram_url,website_url,facility_type,detail_page_url')
		.eq('id', id)
		.single();

	if (error) {
		if (error.code === 'PGRST116') {
			// レコードが見つからない場合
			return null;
		}
		throw new Error(`Failed to fetch facility: ${error.message}`);
	}

	return data;
}

