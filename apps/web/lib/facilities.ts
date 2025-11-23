import { supabase } from './supabase';
import type { Facility } from './types';
import type { PostgrestError } from '@supabase/supabase-js';

/**
 * 施設データ取得時に選択するフィールド（共通定義）
 */
const FACILITY_FIELDS_FOR_LIST = 'id,name,ward_name,address_full_raw,phone,instagram_url,website_url,facility_type,detail_page_url';

/**
 * Supabase エラーメッセージを統一フォーマットで整形する
 * @param operation 操作種別（'LIST' | 'GET_BY_ID'）
 * @param error Supabase エラーオブジェクト
 * @returns 整形されたエラーメッセージ
 */
function formatSupabaseError(operation: 'LIST' | 'GET_BY_ID', error: PostgrestError): string {
	return `Failed to fetch facility data (operation=${operation}): ${error.message}`;
}

/**
 * Supabase から拠点一覧を取得する
 * [03 API 仕様](../docs/03-api.md) 2.2.1節を参照
 */
export async function getFacilities(): Promise<Facility[]> {
	const { data, error } = await supabase
		.from('facilities')
		.select(FACILITY_FIELDS_FOR_LIST)
		.order('ward_name', { ascending: true, nullsFirst: false })
		.order('name', { ascending: true });

	if (error) {
		throw new Error(formatSupabaseError('LIST', error));
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
		.select(FACILITY_FIELDS_FOR_LIST)
		.eq('id', id)
		.single();

	if (error) {
		if (error.code === 'PGRST116') {
			// レコードが見つからない場合
			return null;
		}
		throw new Error(formatSupabaseError('GET_BY_ID', error));
	}

	return data;
}

