import { createClient } from '@supabase/supabase-js';

/**
 * Supabase 管理者クライアント（Service Role）
 *
 * 注意:
 * - SUPABASE_SERVICE_ROLE_KEY はクライアントに公開してはいけない
 * - このファイルはサーバー側（Route Handler等）からのみ利用すること
 */
export function createSupabaseAdminClient() {
	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

	if (!supabaseUrl || !serviceRoleKey) {
		throw new Error(
			'Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set'
		);
	}

	return createClient(supabaseUrl, serviceRoleKey, {
		auth: {
			persistSession: false,
			autoRefreshToken: false,
		},
	});
}


