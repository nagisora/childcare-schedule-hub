import { supabase } from './supabase';
import type { Facility } from './types';
import { createSupabaseErrorMessage } from './supabase-errors';
import { unstable_cache } from 'next/cache';

/**
 * 施設データ取得時に選択するフィールド（共通定義）
 * Facility 型の主要フィールドに対応
 */
const FACILITY_FIELDS_FOR_LIST = 'id,name,ward_name,address_full_raw,phone,instagram_url,website_url,facility_type,detail_page_url';

/**
 * Supabase から拠点一覧を取得する（内部実装）
 * [03 API 仕様](../docs/03-api.md) 2.2.1節を参照
 */
async function getFacilitiesInternal(): Promise<Facility[]> {
	const { data, error } = await supabase
		.from('facilities')
		.select(FACILITY_FIELDS_FOR_LIST)
		.order('ward_name', { ascending: true, nullsFirst: false })
		.order('name', { ascending: true });

	if (error) {
		throw new Error(createSupabaseErrorMessage('facility', 'LIST', error));
	}

	return data || [];
}

/**
 * Supabase から拠点一覧を取得する（キャッシュ付き）
 * ISR により60分間キャッシュされる。On-Demand Revalidation で `revalidateTag('facilities')` を呼び出すことで
 * キャッシュを無効化できる。
 * [02 設計資料](../docs/02-design.md) 2.3節参照
 */
export const getFacilities = unstable_cache(
	async () => getFacilitiesInternal(),
	['facilities'],
	{
		tags: ['facilities'],
		revalidate: 3600, // 60分
	}
);

/**
 * IDで拠点を1件取得する
 * @param id 拠点ID
 * @returns 拠点データ（見つからない場合は null）
 */
export async function getFacilityById(id: string): Promise<Facility | null> {
	const { data, error } = await supabase
		.from('facilities')
		.select(FACILITY_FIELDS_FOR_LIST)
		.eq('id', id)
		.single();

	if (error) {
		if (error.code === 'PGRST116') {
			// レコードが見つからない場合
			return null;
		}
		throw new Error(createSupabaseErrorMessage('facility', 'GET_BY_ID', error));
	}

	return data;
}

