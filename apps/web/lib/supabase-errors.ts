import type { PostgrestError } from '@supabase/supabase-js';

/**
 * Supabase エラーメッセージを統一フォーマットで整形する
 * @param resource リソース種別（'facility' | 'schedule'）
 * @param operation 操作種別
 * @param error Supabase エラーオブジェクト
 * @returns 整形されたエラーメッセージ
 */
export function createSupabaseErrorMessage(
	resource: 'facility' | 'schedule',
	operation: string,
	error: PostgrestError
): string {
	const resourceName = resource === 'facility' ? 'facility data' : 'schedule data';
	return `Failed to fetch ${resourceName} (operation=${operation}): ${error.message}`;
}

