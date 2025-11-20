import { cookies } from 'next/headers';
import type { FavoriteCookieItem } from './cookies';

/**
 * お気に入りクッキー名
 */
const FAVORITES_COOKIE_NAME = 'csh_favorites';

/**
 * お気に入りの最大件数（MVP）
 * [01 要件定義](../docs/01-requirements.md) / [02 設計資料](../docs/02-design.md) 4.1節を参照
 */
const MAX_FAVORITES = 5;

/**
 * サーバーサイドでお気に入りクッキーを読み取る
 * この関数はサーバーコンポーネントでのみ使用可能
 * @returns お気に入り配列（最大5件、sortOrder でソート済み）
 */
export async function readFavoritesCookie(): Promise<FavoriteCookieItem[]> {
	const cookieStore = await cookies();
	const favoritesCookie = cookieStore.get(FAVORITES_COOKIE_NAME);

	if (!favoritesCookie?.value) {
		return [];
	}

	try {
		const parsed = JSON.parse(favoritesCookie.value) as FavoriteCookieItem[];
		// 型チェック: 配列で、各要素が facilityId と sortOrder を持つか
		if (!Array.isArray(parsed)) {
			return [];
		}
		// sortOrder でソートして返す
		return parsed
			.filter((item): item is FavoriteCookieItem => {
				return (
					typeof item === 'object' &&
					item !== null &&
					typeof item.facilityId === 'string' &&
					typeof item.sortOrder === 'number'
				);
			})
			.sort((a, b) => a.sortOrder - b.sortOrder)
			.slice(0, MAX_FAVORITES); // 最大件数を超えないように制限
	} catch {
		// JSON パースエラー時は空配列を返す
		return [];
	}
}

