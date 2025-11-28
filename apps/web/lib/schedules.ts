import { supabase } from './supabase';
import type { Schedule } from './types';
import type { PostgrestError } from '@supabase/supabase-js';

/**
 * Supabase エラーメッセージを統一フォーマットで整形する
 * @param operation 操作種別
 * @param error Supabase エラーオブジェクト
 * @returns 整形されたエラーメッセージ
 */
function formatSupabaseError(operation: string, error: PostgrestError): string {
	return `Failed to fetch schedule data (operation=${operation}): ${error.message}`;
}

/**
 * 施設IDで最新のスケジュールを取得する
 * @param facilityId 施設ID
 * @returns 最新のスケジュール（見つからない場合は null）
 */
export async function getLatestScheduleByFacilityId(facilityId: string): Promise<Schedule | null> {
	const { data, error } = await supabase
		.from('schedules')
		.select('*')
		.eq('facility_id', facilityId)
		.eq('status', 'published')
		.order('published_month', { ascending: false })
		.limit(1)
		.single();

	if (error) {
		if (error.code === 'PGRST116') {
			// レコードが見つからない場合
			return null;
		}
		throw new Error(formatSupabaseError('GET_LATEST_BY_FACILITY_ID', error));
	}

	return data;
}

/**
 * 複数の施設IDで最新のスケジュールを一括取得する
 * @param facilityIds 施設IDの配列
 * @returns 施設IDをキーとしたスケジュールのマップ（見つからない場合は含まれない）
 */
export async function getLatestSchedulesByFacilityIds(
	facilityIds: string[]
): Promise<Record<string, Schedule>> {
	if (facilityIds.length === 0) {
		return {};
	}

	const { data, error } = await supabase
		.from('schedules')
		.select('*')
		.in('facility_id', facilityIds)
		.eq('status', 'published')
		.order('published_month', { ascending: false });

	if (error) {
		throw new Error(formatSupabaseError('GET_LATEST_BY_FACILITY_IDS', error));
	}

	if (!data || data.length === 0) {
		return {};
	}

	// 各施設IDごとに最新のスケジュールを1つだけ取得（published_monthが最新のもの）
	const scheduleMap: Record<string, Schedule> = {};
	for (const schedule of data) {
		const existing = scheduleMap[schedule.facility_id];
		if (!existing || schedule.published_month > existing.published_month) {
			scheduleMap[schedule.facility_id] = schedule;
		}
	}

	return scheduleMap;
}

/**
 * 施設IDと対象月でスケジュールを取得する
 * @param facilityId 施設ID
 * @param targetMonth 対象月（YYYY-MM-DD形式、月の1日）
 * @returns スケジュール（見つからない場合は null）
 */
export async function getScheduleByFacilityIdAndMonth(
	facilityId: string,
	targetMonth: string
): Promise<Schedule | null> {
	const { data, error } = await supabase
		.from('schedules')
		.select('*')
		.eq('facility_id', facilityId)
		.eq('published_month', targetMonth)
		.eq('status', 'published')
		.single();

	if (error) {
		if (error.code === 'PGRST116') {
			// レコードが見つからない場合
			return null;
		}
		throw new Error(formatSupabaseError('GET_BY_FACILITY_ID_AND_MONTH', error));
	}

	return data;
}

/**
 * 複数の施設IDと対象月でスケジュールを一括取得する
 * @param facilityIds 施設IDの配列
 * @param targetMonth 対象月（YYYY-MM-DD形式、月の1日）
 * @returns 施設IDをキーとしたスケジュールのマップ（見つからない場合は含まれない）
 */
export async function getSchedulesByFacilityIdsAndMonth(
	facilityIds: string[],
	targetMonth: string
): Promise<Record<string, Schedule>> {
	if (facilityIds.length === 0) {
		return {};
	}

	const { data, error } = await supabase
		.from('schedules')
		.select('*')
		.in('facility_id', facilityIds)
		.eq('published_month', targetMonth)
		.eq('status', 'published');

	if (error) {
		throw new Error(formatSupabaseError('GET_BY_FACILITY_IDS_AND_MONTH', error));
	}

	if (!data || data.length === 0) {
		return {};
	}

	const scheduleMap: Record<string, Schedule> = {};
	for (const schedule of data) {
		scheduleMap[schedule.facility_id] = schedule;
	}

	return scheduleMap;
}

