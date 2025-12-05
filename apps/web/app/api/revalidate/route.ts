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
 * - 本番環境では、認証トークンやシークレットの検証を追加すること
 * - 例: Authorization ヘッダーでトークンを検証
 */
export async function POST(request: NextRequest) {
	const searchParams = request.nextUrl.searchParams;
	const tag = searchParams.get('tag');
	const path = searchParams.get('path');

	// セキュリティチェック: 本番環境では認証を追加すること
	// const authHeader = request.headers.get('authorization');
	// if (authHeader !== `Bearer ${process.env.REVALIDATE_SECRET}`) {
	//   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	// }

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
		{ error: 'Missing tag or path parameter' },
		{ status: 400 }
	);
}
