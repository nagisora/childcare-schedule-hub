import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
	readFavoritesFromStorage,
	updateFavoritesInStorage,
	seedDefaultFavoritesInStorageIfNeeded,
	type FavoriteCookieItem,
} from '../lib/storage';
import type { Facility } from '../lib/types';

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

describe('seedDefaultFavoritesInStorageIfNeeded', () => {
	beforeEach(() => {
		// 各テスト前にlocalStorageをクリア
		localStorage.clear();
	});

	// Given: localStorageにキーが存在せず、対象施設（昭和区 こころと）が施設一覧に存在する
	// When: seedDefaultFavoritesInStorageIfNeeded を実行
	// Then: デフォルトお気に入りがseedされ、readFavoritesFromStorageで取得できる
	it('TC-N-01: 初回起動時はデフォルトお気に入りがseedされる', () => {
		const facilities: Facility[] = [
			{
				id: 'facility-kokoroto',
				name: 'こころと',
				ward_name: '昭和区',
				address_full_raw: '',
				phone: null,
				instagram_url: null,
				website_url: null,
				facility_type: null,
				detail_page_url: null,
			},
		];

		// When
		const seeded = seedDefaultFavoritesInStorageIfNeeded(facilities);

		// Then
		expect(seeded).toEqual([{ facilityId: 'facility-kokoroto', sortOrder: 1 }]);
		expect(readFavoritesFromStorage()).toEqual([{ facilityId: 'facility-kokoroto', sortOrder: 1 }]);
	});

	// Given: localStorageにキーが既に存在する（空配列でもOK）
	// When: seedDefaultFavoritesInStorageIfNeeded を実行
	// Then: 既存データは上書きされない
	it('TC-N-02: 既にキーが存在する場合はseedしない', () => {
		const storageData = {
			version: '1',
			favorites: [] as FavoriteCookieItem[],
			savedAt: Date.now(),
		};
		localStorage.setItem('csh_favorites', JSON.stringify(storageData));

		const facilities: Facility[] = [
			{
				id: 'facility-kokoroto',
				name: 'こころと',
				ward_name: '昭和区',
				address_full_raw: '',
				phone: null,
				instagram_url: null,
				website_url: null,
				facility_type: null,
				detail_page_url: null,
			},
		];

		// When
		const seeded = seedDefaultFavoritesInStorageIfNeeded(facilities);

		// Then
		expect(seeded).toBeNull();
		expect(readFavoritesFromStorage()).toEqual([]);
	});

	// Given: localStorageにキーが存在せず、対象施設が施設一覧に存在しない
	// When: seedDefaultFavoritesInStorageIfNeeded を実行
	// Then: seedされず、キーも作られない
	it('TC-A-01: 対象施設が存在しない場合はseedしない', () => {
		const facilities: Facility[] = [
			{
				id: 'facility-1',
				name: '別の拠点',
				ward_name: '昭和区',
				address_full_raw: '',
				phone: null,
				instagram_url: null,
				website_url: null,
				facility_type: null,
				detail_page_url: null,
			},
		];

		// When
		const seeded = seedDefaultFavoritesInStorageIfNeeded(facilities);

		// Then
		expect(seeded).toBeNull();
		expect(localStorage.getItem('csh_favorites')).toBeNull();
	});

	// Given: localStorageにキーが存在せず、施設一覧が空
	// When: seedDefaultFavoritesInStorageIfNeeded を実行
	// Then: seedされない
	it('TC-B-01: 施設一覧が空の場合はseedしない', () => {
		// When
		const seeded = seedDefaultFavoritesInStorageIfNeeded([]);

		// Then
		expect(seeded).toBeNull();
		expect(localStorage.getItem('csh_favorites')).toBeNull();
	});

	// Given: localStorageにキーが存在せず、ward_nameがNULLの施設のみ存在する
	// When: seedDefaultFavoritesInStorageIfNeeded を実行
	// Then: ward条件を満たさないためseedされない
	it('TC-A-02: ward_nameがNULLの場合はseedしない', () => {
		const facilities: Facility[] = [
			{
				id: 'facility-kokoroto',
				name: 'こころと',
				ward_name: null,
				address_full_raw: '',
				phone: null,
				instagram_url: null,
				website_url: null,
				facility_type: null,
				detail_page_url: null,
			},
		];

		// When
		const seeded = seedDefaultFavoritesInStorageIfNeeded(facilities);

		// Then
		expect(seeded).toBeNull();
		expect(localStorage.getItem('csh_favorites')).toBeNull();
	});

	// Given: localStorage.getItemが例外を投げる（ストレージ利用不可想定）
	// When: seedDefaultFavoritesInStorageIfNeeded を実行
	// Then: 例外を握りつぶしてseedしない
	it('TC-A-03: localStorageが利用できない場合はseedしない', () => {
		const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
			throw new Error('localStorage blocked');
		});
		const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

		const facilities: Facility[] = [
			{
				id: 'facility-kokoroto',
				name: 'こころと',
				ward_name: '昭和区',
				address_full_raw: '',
				phone: null,
				instagram_url: null,
				website_url: null,
				facility_type: null,
				detail_page_url: null,
			},
		];

		// When
		const seeded = seedDefaultFavoritesInStorageIfNeeded(facilities);

		// Then
		expect(seeded).toBeNull();
		expect(setItemSpy).not.toHaveBeenCalled();

		// Cleanup: spyを解除して元の実装に戻す（念のため）
		getItemSpy.mockRestore();
		setItemSpy.mockRestore();
	});
});

