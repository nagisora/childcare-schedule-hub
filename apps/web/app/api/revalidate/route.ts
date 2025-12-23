import { revalidateTag, revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

/**
 * On-Demand Revalidation API ルート
 * 
 * データ更新時にキャッシュを無効化するためのエンドポイント
 * [02 設計資料](../../../docs/02-design.md) 2.3節、[04 開発ガイド](../../../docs/04-development.md) 9節参照
 * 
 * 使用方法:
 * - POST /api/revalidate?tag=facilities
 * - POST /api/revalidate?tag=schedules
 * - POST /api/revalidate?path=/
 * 
 * セキュリティ:
 * - `x-admin-token`（`ADMIN_API_TOKEN`）で保護する（内部API / クエリ枠・負荷の悪用防止）
 */
export async function POST(request: NextRequest) {
	const adminToken = request.headers.get('x-admin-token');
	const expectedToken = process.env.ADMIN_API_TOKEN;

	if (!expectedToken) {
		return NextResponse.json(
			{ error: { code: 'CONFIG_ERROR', message: 'ADMIN_API_TOKEN is not configured' } },
			{ status: 500 }
		);
	}

	if (!adminToken || adminToken !== expectedToken) {
		return NextResponse.json(
			{ error: { code: 'UNAUTHORIZED', message: 'Invalid or missing x-admin-token header' } },
			{ status: 401 }
		);
	}

	const searchParams = request.nextUrl.searchParams;
	const tag = searchParams.get('tag');
	const path = searchParams.get('path');

	if (tag) {
		revalidateTag(tag);
		return NextResponse.json({
			revalidated: true,
			tag,
			now: Date.now(),
		});
	}

	if (path) {
		revalidatePath(path);
		return NextResponse.json({
			revalidated: true,
			path,
			now: Date.now(),
		});
	}

	return NextResponse.json(
		{ error: { code: 'BAD_REQUEST', message: 'Missing tag or path parameter' } },
		{ status: 400 }
	);
}
