import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
	readFavoritesFromStorage,
	updateFavoritesInStorage,
	type FavoriteCookieItem,
} from '../lib/storage';

describe('readFavoritesFromStorage', () => {
	beforeEach(() => {
		// 各テスト前にlocalStorageをクリア
		localStorage.clear();
	});

	// Given: 正常なlocalStorage値（JSON配列）
	// When: readFavoritesFromStorage を実行
	// Then: パースされたお気に入り配列を返す
	it('TC-N-01: 正常なlocalStorage値（JSON配列）を読み取れる', () => {
		const favorites: FavoriteCookieItem[] = [
			{ facilityId: '1', sortOrder: 1 },
			{ facilityId: '2', sortOrder: 2 },
		];
		const storageData = {
			version: '1',
			favorites,
			savedAt: Date.now(),
		};
		localStorage.setItem('csh_favorites', JSON.stringify(storageData));

		const result = readFavoritesFromStorage();

		expect(result).toHaveLength(2);
		expect(result[0].facilityId).toBe('1');
		expect(result[0].sortOrder).toBe(1);
		expect(result[1].facilityId).toBe('2');
		expect(result[1].sortOrder).toBe(2);
	});

	// Given: localStorageが存在しない
	// When: readFavoritesFromStorage を実行
	// Then: 空配列を返す
	it('TC-N-02: localStorageが存在しない場合は空配列を返す', () => {
		const result = readFavoritesFromStorage();

		expect(result).toEqual([]);
	});

	// Given: 不正なJSON形式のlocalStorage
	// When: readFavoritesFromStorage を実行
	// Then: 空配列を返す（エラーハンドリング）
	it('TC-A-01: 不正なJSON形式のlocalStorageは空配列を返す', () => {
		localStorage.setItem('csh_favorites', 'invalid-json-{');

		const result = readFavoritesFromStorage();

		expect(result).toEqual([]);
	});

	// Given: 不正な構造のオブジェクト
	// When: readFavoritesFromStorage を実行
	// Then: 不正な要素はフィルタリングされ、有効なもののみ返す
	it('TC-A-02: 不正な構造のオブジェクトはフィルタリングされる', () => {
		const invalidData = {
			version: '1',
			favorites: [
				{ facilityId: '1', sortOrder: 1 }, // 有効
				{ facilityId: null, sortOrder: 2 }, // 無効: facilityId が null
				{ facilityId: '3', sortOrder: 'invalid' }, // 無効: sortOrder が数値でない
				{ name: '4', order: 4 }, // 無効: 構造が異なる
				{ facilityId: '5', sortOrder: 5 }, // 有効
			],
			savedAt: Date.now(),
		};
		localStorage.setItem('csh_favorites', JSON.stringify(invalidData));

		const result = readFavoritesFromStorage();

		expect(result).toHaveLength(2);
		expect(result[0].facilityId).toBe('1');
		expect(result[1].facilityId).toBe('5');
	});

	// Given: 最大件数（5件）を超えるlocalStorage
	// When: readFavoritesFromStorage を実行
	// Then: 最大5件までに制限される
	it('TC-A-03: 最大件数（5件）を超えるlocalStorageは5件までに制限される', () => {
		const storageData = {
			version: '1',
			favorites: [
				{ facilityId: '1', sortOrder: 1 },
				{ facilityId: '2', sortOrder: 2 },
				{ facilityId: '3', sortOrder: 3 },
				{ facilityId: '4', sortOrder: 4 },
				{ facilityId: '5', sortOrder: 5 },
				{ facilityId: '6', sortOrder: 6 }, // 6件目
				{ facilityId: '7', sortOrder: 7 }, // 7件目
			],
			savedAt: Date.now(),
		};
		localStorage.setItem('csh_favorites', JSON.stringify(storageData));

		const result = readFavoritesFromStorage();

		expect(result).toHaveLength(5);
		expect(result[0].facilityId).toBe('1');
		expect(result[4].facilityId).toBe('5');
		// 6件目以降は含まれないことを確認
		expect(result.find((f) => f.facilityId === '6')).toBeUndefined();
		expect(result.find((f) => f.facilityId === '7')).toBeUndefined();
	});

	// Given: 配列でないJSON
	// When: readFavoritesFromStorage を実行
	// Then: 空配列を返す
	it('配列でないJSONは空配列を返す', () => {
		const invalidData = { facilityId: '1', sortOrder: 1 }; // オブジェクト（配列ではない）
		localStorage.setItem('csh_favorites', JSON.stringify(invalidData));

		const result = readFavoritesFromStorage();

		expect(result).toEqual([]);
	});

	// Given: 有効期限が切れたlocalStorage
	// When: readFavoritesFromStorage を実行
	// Then: 空配列を返し、localStorageから削除される
	it('有効期限が切れたlocalStorageは空配列を返し、削除される', () => {
		const storageData = {
			version: '1',
			favorites: [{ facilityId: '1', sortOrder: 1 }],
			savedAt: Date.now() - 181 * 24 * 60 * 60 * 1000, // 181日前（有効期限180日を超過）
		};
		localStorage.setItem('csh_favorites', JSON.stringify(storageData));

		const result = readFavoritesFromStorage();

		expect(result).toEqual([]);
		expect(localStorage.getItem('csh_favorites')).toBeNull();
	});

	// Given: 未知のバージョンのlocalStorage
	// When: readFavoritesFromStorage を実行
	// Then: 空配列を返す
	it('未知のバージョンのlocalStorageは空配列を返す', () => {
		const storageData = {
			version: '2', // 未知のバージョン
			favorites: [{ facilityId: '1', sortOrder: 1 }],
			savedAt: Date.now(),
		};
		localStorage.setItem('csh_favorites', JSON.stringify(storageData));

		const result = readFavoritesFromStorage();

		expect(result).toEqual([]);
	});
});

describe('updateFavoritesInStorage', () => {
	beforeEach(() => {
		// 各テスト前にlocalStorageをクリア
		localStorage.clear();
	});

	// Given: 正常なお気に入り配列
	// When: updateFavoritesInStorage を実行
	// Then: localStorageが正しく設定される
	it('正常なお気に入り配列でlocalStorageを更新できる', () => {
		const favorites: FavoriteCookieItem[] = [
			{ facilityId: '1', sortOrder: 1 },
			{ facilityId: '2', sortOrder: 2 },
		];

		updateFavoritesInStorage(favorites);

		// localStorageが設定されていることを確認
		const stored = localStorage.getItem('csh_favorites');
		expect(stored).toBeTruthy();

		// 読み取って内容を確認
		const result = readFavoritesFromStorage();
		expect(result).toHaveLength(2);
		expect(result[0].facilityId).toBe('1');
		expect(result[1].facilityId).toBe('2');
	});

	// Given: 最大件数を超える配列
	// When: updateFavoritesInStorage を実行
	// Then: 最大5件までに制限される
	it('最大件数を超える配列は5件までに制限される', () => {
		const favorites: FavoriteCookieItem[] = [
			{ facilityId: '1', sortOrder: 1 },
			{ facilityId: '2', sortOrder: 2 },
			{ facilityId: '3', sortOrder: 3 },
			{ facilityId: '4', sortOrder: 4 },
			{ facilityId: '5', sortOrder: 5 },
			{ facilityId: '6', sortOrder: 6 },
			{ facilityId: '7', sortOrder: 7 },
		];

		updateFavoritesInStorage(favorites);

		const result = readFavoritesFromStorage();
		expect(result).toHaveLength(5);
		expect(result[4].facilityId).toBe('5');
	});

	// Given: 空配列
	// When: updateFavoritesInStorage を実行
	// Then: localStorageが空配列として設定される
	it('空配列でlocalStorageを更新できる', () => {
		updateFavoritesInStorage([]);

		const result = readFavoritesFromStorage();
		expect(result).toEqual([]);
	});

	// Given: サーバーサイド環境（window が undefined）
	// When: updateFavoritesInStorage を実行
	// Then: エラーが発生する
	it('サーバーサイド環境ではエラーが発生する', () => {
		const originalWindow = global.window;
		// @ts-expect-error - テスト用に window を undefined に設定
		global.window = undefined;

		const favorites: FavoriteCookieItem[] = [{ facilityId: '1', sortOrder: 1 }];

		expect(() => {
			updateFavoritesInStorage(favorites);
		}).toThrow('updateFavoritesInStorage can only be called on the client side');

		// クリーンアップ
		global.window = originalWindow;
	});

	// Given: localStorageに保存されたデータ構造
	// When: updateFavoritesInStorage を実行
	// Then: 適切な構造（version, favorites, savedAt）で保存される
	it('localStorageに適切な構造で保存される', () => {
		const favorites: FavoriteCookieItem[] = [{ facilityId: '1', sortOrder: 1 }];

		updateFavoritesInStorage(favorites);

		const stored = localStorage.getItem('csh_favorites');
		expect(stored).toBeTruthy();
		const parsed = JSON.parse(stored!);
		expect(parsed.version).toBe('1');
		expect(parsed.favorites).toEqual(favorites);
		expect(typeof parsed.savedAt).toBe('number');
	});
});

