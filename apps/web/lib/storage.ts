/**
 * お気に入り保存用の型定義
 * 互換性のため FavoriteCookieItem という名前を維持（将来的に FavoriteItem への変更は別タスク）
 * [03 API 仕様](../docs/03-api.md) 4章を参照
 */
export type FavoriteCookieItem = {
	facilityId: string;
	sortOrder: number;
};

import { MAX_FAVORITES } from './constants';
import type { Facility } from './types';

/**
 * localStorage のキー名
 */
const STORAGE_KEY = 'csh_favorites';

/**
 * 初回起動時のデフォルトお気に入り（要件: 「昭和区 こころと」）
 */
const DEFAULT_FAVORITE_WARD_NAME = '昭和区';
const DEFAULT_FAVORITE_NAME_KEYWORD = 'こころと';

/**
 * お気に入り更新を通知するカスタムイベント名
 * ペイロードを持たない合図用イベント（将来的なペイロード拡張の余地を残す）
 */
export const FAVORITES_UPDATED_EVENT = 'favoritesUpdated';

/**
 * 有効期限（180日、ミリ秒）
 * [03 API 仕様](../docs/03-api.md) 4.1節を参照
 */
const STORAGE_MAX_AGE = 180 * 24 * 60 * 60 * 1000; // 180日（ミリ秒）

/**
 * localStorage に保存するデータ構造
 */
type StorageData = {
	version: string;
	favorites: FavoriteCookieItem[];
	savedAt: number; // タイムスタンプ（ミリ秒）
};

/**
 * クライアントサイドでお気に入りをlocalStorageに保存する
 * この関数はクライアント側で使用されることを想定している
 * @param favorites 新しいお気に入り配列
 */
export function updateFavoritesInStorage(favorites: FavoriteCookieItem[]): void {
	if (typeof window === 'undefined') {
		throw new Error('updateFavoritesInStorage can only be called on the client side');
	}

	// 最大件数を超えないように制限
	const limitedFavorites = favorites.slice(0, MAX_FAVORITES);

	const data: StorageData = {
		version: '1',
		favorites: limitedFavorites,
		savedAt: Date.now(),
	};

	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
	} catch (error) {
		// localStorage が使用できない場合（プライベートモードなど）はエラーを無視
		console.warn('Failed to save favorites to localStorage:', error);
	}
}

/**
 * 初回起動（localStorageキー未作成）の場合のみ、デフォルトお気に入りをlocalStorageへ保存する。
 *
 * - 既にキーが存在する場合（空配列でも）は上書きしない
 * - 対象拠点が見つからない場合は何もしない
 *
 * @param facilities 全拠点一覧（クライアント側で利用できるもの）
 * @returns 追加したお気に入り（追加しなかった場合は null）
 */
export function seedDefaultFavoritesInStorageIfNeeded(facilities: Facility[]): FavoriteCookieItem[] | null {
	if (typeof window === 'undefined') {
		return null;
	}

	let hasKey = false;
	try {
		hasKey = localStorage.getItem(STORAGE_KEY) !== null;
	} catch {
		// localStorage が使用できない場合（プライベートモードなど）は何もしない
		return null;
	}

	if (hasKey) {
		return null;
	}

	const target = facilities.find((f) => {
		const ward = f.ward_name ?? '';
		return ward.includes(DEFAULT_FAVORITE_WARD_NAME) && f.name.includes(DEFAULT_FAVORITE_NAME_KEYWORD);
	});

	if (!target) {
		return null;
	}

	const seeded: FavoriteCookieItem[] = [{ facilityId: target.id, sortOrder: 1 }];
	updateFavoritesInStorage(seeded);
	return seeded;
}

/**
 * クライアントサイドでお気に入りをlocalStorageから読み取る
 * @returns お気に入り配列（最大5件、sortOrder でソート済み）
 */
export function readFavoritesFromStorage(): FavoriteCookieItem[] {
	if (typeof window === 'undefined') {
		return [];
	}

	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (!stored) {
			return [];
		}

		const data = JSON.parse(stored) as StorageData;

		// 有効期限チェック（180日経過している場合は削除）
		if (data.savedAt && Date.now() - data.savedAt > STORAGE_MAX_AGE) {
			localStorage.removeItem(STORAGE_KEY);
			return [];
		}

		// バージョンチェック（将来のスキーマ変更に対応）
		if (data.version !== '1') {
			// 未知のバージョンの場合は空配列を返す
			return [];
		}

		if (!Array.isArray(data.favorites)) {
			return [];
		}

		return data.favorites
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
		// JSON パースエラー時は空配列を返す
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

