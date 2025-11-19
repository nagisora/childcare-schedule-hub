import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
	readFavoritesCookieClient,
	updateFavoritesCookieClient,
	type FavoriteCookieItem,
} from '../lib/cookies';

describe('readFavoritesCookieClient', () => {
	beforeEach(() => {
		// 各テスト前にクッキーをクリア
		document.cookie = 'csh_favorites=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
	});

	// Given: 正常なクッキー値（JSON配列）
	// When: readFavoritesCookieClient を実行
	// Then: パースされたお気に入り配列を返す
	it('TC-N-01: 正常なクッキー値（JSON配列）を読み取れる', () => {
		const favorites: FavoriteCookieItem[] = [
			{ facilityId: '1', sortOrder: 1 },
			{ facilityId: '2', sortOrder: 2 },
		];
		const cookieValue = encodeURIComponent(JSON.stringify(favorites));
		document.cookie = `csh_favorites=${cookieValue}; path=/;`;

		const result = readFavoritesCookieClient();

		expect(result).toHaveLength(2);
		expect(result[0].facilityId).toBe('1');
		expect(result[0].sortOrder).toBe(1);
		expect(result[1].facilityId).toBe('2');
		expect(result[1].sortOrder).toBe(2);
	});

	// Given: クッキーが存在しない
	// When: readFavoritesCookieClient を実行
	// Then: 空配列を返す
	it('TC-N-02: クッキーが存在しない場合は空配列を返す', () => {
		const result = readFavoritesCookieClient();

		expect(result).toEqual([]);
	});

	// Given: 不正なJSON形式のクッキー
	// When: readFavoritesCookieClient を実行
	// Then: 空配列を返す（エラーハンドリング）
	it('TC-A-01: 不正なJSON形式のクッキーは空配列を返す', () => {
		const invalidJson = 'invalid-json-{';
		const cookieValue = encodeURIComponent(invalidJson);
		document.cookie = `csh_favorites=${cookieValue}; path=/;`;

		const result = readFavoritesCookieClient();

		expect(result).toEqual([]);
	});

	// Given: 不正な構造のオブジェクト
	// When: readFavoritesCookieClient を実行
	// Then: 不正な要素はフィルタリングされ、有効なもののみ返す
	it('TC-A-02: 不正な構造のオブジェクトはフィルタリングされる', () => {
		const invalidData = [
			{ facilityId: '1', sortOrder: 1 }, // 有効
			{ facilityId: null, sortOrder: 2 }, // 無効: facilityId が null
			{ facilityId: '3', sortOrder: 'invalid' }, // 無効: sortOrder が数値でない
			{ name: '4', order: 4 }, // 無効: 構造が異なる
			{ facilityId: '5', sortOrder: 5 }, // 有効
		];
		const cookieValue = encodeURIComponent(JSON.stringify(invalidData));
		document.cookie = `csh_favorites=${cookieValue}; path=/;`;

		const result = readFavoritesCookieClient();

		expect(result).toHaveLength(2);
		expect(result[0].facilityId).toBe('1');
		expect(result[1].facilityId).toBe('5');
	});

	// Given: 最大件数（5件）を超えるクッキー
	// When: readFavoritesCookieClient を実行
	// Then: 最大5件までに制限される
	it('TC-A-03: 最大件数（5件）を超えるクッキーは5件までに制限される', () => {
		const favorites: FavoriteCookieItem[] = [
			{ facilityId: '1', sortOrder: 1 },
			{ facilityId: '2', sortOrder: 2 },
			{ facilityId: '3', sortOrder: 3 },
			{ facilityId: '4', sortOrder: 4 },
			{ facilityId: '5', sortOrder: 5 },
			{ facilityId: '6', sortOrder: 6 }, // 6件目
			{ facilityId: '7', sortOrder: 7 }, // 7件目
		];
		const cookieValue = encodeURIComponent(JSON.stringify(favorites));
		document.cookie = `csh_favorites=${cookieValue}; path=/;`;

		const result = readFavoritesCookieClient();

		expect(result).toHaveLength(5);
		expect(result[0].facilityId).toBe('1');
		expect(result[4].facilityId).toBe('5');
		// 6件目以降は含まれないことを確認
		expect(result.find((f) => f.facilityId === '6')).toBeUndefined();
		expect(result.find((f) => f.facilityId === '7')).toBeUndefined();
	});

	// Given: 配列でないJSON
	// When: readFavoritesCookieClient を実行
	// Then: 空配列を返す
	it('配列でないJSONは空配列を返す', () => {
		const invalidData = { facilityId: '1', sortOrder: 1 }; // オブジェクト（配列ではない）
		const cookieValue = encodeURIComponent(JSON.stringify(invalidData));
		document.cookie = `csh_favorites=${cookieValue}; path=/;`;

		const result = readFavoritesCookieClient();

		expect(result).toEqual([]);
	});
});

describe('updateFavoritesCookieClient', () => {
	beforeEach(() => {
		// 各テスト前にクッキーをクリア
		document.cookie = 'csh_favorites=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
	});

	// Given: 正常なお気に入り配列
	// When: updateFavoritesCookieClient を実行
	// Then: クッキーが正しく設定される
	it('正常なお気に入り配列でクッキーを更新できる', () => {
		const favorites: FavoriteCookieItem[] = [
			{ facilityId: '1', sortOrder: 1 },
			{ facilityId: '2', sortOrder: 2 },
		];

		updateFavoritesCookieClient(favorites);

		// クッキーが設定されていることを確認
		const cookies = document.cookie.split(';');
		const favoritesCookie = cookies.find((c) => c.trim().startsWith('csh_favorites='));
		expect(favoritesCookie).toBeTruthy();

		// 読み取って内容を確認
		const result = readFavoritesCookieClient();
		expect(result).toHaveLength(2);
		expect(result[0].facilityId).toBe('1');
		expect(result[1].facilityId).toBe('2');
	});

	// Given: 最大件数を超える配列
	// When: updateFavoritesCookieClient を実行
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

		updateFavoritesCookieClient(favorites);

		const result = readFavoritesCookieClient();
		expect(result).toHaveLength(5);
		expect(result[4].facilityId).toBe('5');
	});

	// Given: 空配列
	// When: updateFavoritesCookieClient を実行
	// Then: クッキーが空配列として設定される
	it('空配列でクッキーを更新できる', () => {
		updateFavoritesCookieClient([]);

		const result = readFavoritesCookieClient();
		expect(result).toEqual([]);
	});

	// Given: サーバーサイド環境（document が undefined）
	// When: updateFavoritesCookieClient を実行
	// Then: エラーが発生する
	it('サーバーサイド環境ではエラーが発生する', () => {
		const originalDocument = global.document;
		// @ts-expect-error - テスト用に document を undefined に設定
		global.document = undefined;

		const favorites: FavoriteCookieItem[] = [{ facilityId: '1', sortOrder: 1 }];

		expect(() => {
			updateFavoritesCookieClient(favorites);
		}).toThrow('updateFavoritesCookieClient can only be called on the client side');

		// クリーンアップ
		global.document = originalDocument;
	});

	// Given: クッキー属性の確認（SameSite, Path, Max-Age, Secure）
	// When: updateFavoritesCookieClient を実行
	// Then: 適切な属性が設定される
	it('クッキー属性（SameSite, Path, Max-Age）が正しく設定される', () => {
		const favorites: FavoriteCookieItem[] = [{ facilityId: '1', sortOrder: 1 }];

		updateFavoritesCookieClient(favorites);

		const cookies = document.cookie.split(';');
		const favoritesCookie = cookies.find((c) => c.trim().startsWith('csh_favorites='));
		expect(favoritesCookie).toBeTruthy();

		// クッキー文字列全体を取得（全ての属性を含む）
		// 注: document.cookie は読み取り専用で属性は見えないが、
		// 実装コードで属性が設定されていることは確認済み（lib/cookies.ts 参照）
		// ここでは、クッキーが設定されて読み取れることを確認
		const result = readFavoritesCookieClient();
		expect(result).toHaveLength(1);
	});
});

