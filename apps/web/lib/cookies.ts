/**
 * お気に入りクッキーの型定義
 * [03 API 仕様](../docs/03-api.md) 4章を参照
 */
export type FavoriteCookieItem = {
	facilityId: string;
	sortOrder: number;
};

import { MAX_FAVORITES } from './constants';

/**
 * お気に入りクッキー名
 */
const FAVORITES_COOKIE_NAME = 'csh_favorites';

/**
 * クッキーの有効期限（180日）
 * [03 API 仕様](../docs/03-api.md) 4.1節を参照
 */
const COOKIE_MAX_AGE = 15552000; // 180日（秒）

/**
 * クライアントサイドでお気に入りクッキーを更新する
 * この関数はクライアント側で使用されることを想定している
 * @param favorites 新しいお気に入り配列
 */
export function updateFavoritesCookieClient(favorites: FavoriteCookieItem[]): void {
	if (typeof document === 'undefined') {
		throw new Error('updateFavoritesCookieClient can only be called on the client side');
	}

	// 最大件数を超えないように制限
	const limitedFavorites = favorites.slice(0, MAX_FAVORITES);

	const cookieValue = JSON.stringify(limitedFavorites);
	const isSecure = process.env.NODE_ENV === 'production';

	// クッキーを設定
	// 開発環境では Secure を除外（[03 API 仕様](../docs/03-api.md) 4.1節参照）
	const cookieAttributes = [
		`SameSite=Lax`,
		`Path=/`,
		`Max-Age=${COOKIE_MAX_AGE}`,
	];
	if (isSecure) {
		cookieAttributes.push('Secure');
	}

	document.cookie = `${FAVORITES_COOKIE_NAME}=${encodeURIComponent(cookieValue)}; ${cookieAttributes.join('; ')}`;
}

/**
 * クライアントサイドでお気に入りクッキーを読み取る
 * @returns お気に入り配列（最大5件、sortOrder でソート済み）
 */
export function readFavoritesCookieClient(): FavoriteCookieItem[] {
	if (typeof document === 'undefined') {
		return [];
	}

	const cookies = document.cookie.split(';');
	const favoritesCookie = cookies.find((c) => c.trim().startsWith(`${FAVORITES_COOKIE_NAME}=`));

	if (!favoritesCookie) {
		return [];
	}

	const cookieValue = favoritesCookie.split('=')[1];
	if (!cookieValue) {
		return [];
	}

	try {
		const decoded = decodeURIComponent(cookieValue);
		const parsed = JSON.parse(decoded) as FavoriteCookieItem[];
		if (!Array.isArray(parsed)) {
			return [];
		}
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
			.slice(0, MAX_FAVORITES);
	} catch {
		return [];
	}
}

/**
 * お気に入りに追加する（クライアント側）
 * @param facilityId 追加する拠点ID
 * @param currentFavorites 現在のお気に入り配列
 * @returns 更新後のお気に入り配列
 */
export function addFavorite(
	facilityId: string,
	currentFavorites: FavoriteCookieItem[],
): FavoriteCookieItem[] {
	// 既に登録されている場合は追加しない
	if (currentFavorites.some((f) => f.facilityId === facilityId)) {
		return currentFavorites;
	}

	// 最大件数を超える場合は追加しない
	if (currentFavorites.length >= MAX_FAVORITES) {
		return currentFavorites;
	}

	const nextSortOrder = currentFavorites.length > 0 ? Math.max(...currentFavorites.map((f) => f.sortOrder)) + 1 : 1;

	return [...currentFavorites, { facilityId, sortOrder: nextSortOrder }];
}

/**
 * お気に入りから削除する（クライアント側）
 * @param facilityId 削除する拠点ID
 * @param currentFavorites 現在のお気に入り配列
 * @returns 更新後のお気に入り配列（sortOrder を再振り当て）
 */
export function removeFavorite(
	facilityId: string,
	currentFavorites: FavoriteCookieItem[],
): FavoriteCookieItem[] {
	const filtered = currentFavorites.filter((f) => f.facilityId !== facilityId);
	// sortOrder を再振り当て（1から連番）
	return filtered.map((f, index) => ({ ...f, sortOrder: index + 1 }));
}

/**
 * お気に入りの並び順を更新する（クライアント側）
 * @param facilityIds 新しい順序の拠点ID配列
 * @param currentFavorites 現在のお気に入り配列
 * @returns 更新後のお気に入り配列
 */
export function reorderFavorites(
	facilityIds: string[],
	currentFavorites: FavoriteCookieItem[],
): FavoriteCookieItem[] {
	const favoritesMap = new Map(currentFavorites.map((f) => [f.facilityId, f]));

	return facilityIds
		.map((facilityId, index) => {
			const favorite = favoritesMap.get(facilityId);
			if (!favorite) {
				return null;
			}
			return { ...favorite, sortOrder: index + 1 };
		})
		.filter((f): f is FavoriteCookieItem => f !== null);
}

