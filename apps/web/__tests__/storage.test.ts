import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
	addFavorite,
	removeFavorite,
	reorderFavorites,
	type FavoriteCookieItem,
} from '../lib/storage';

describe('addFavorite', () => {
	// Given: 空のお気に入り配列
	// When: お気に入りを1件追加
	// Then: 1件のお気に入りが追加され、sortOrder=1
	it('TC-N-01: 空のお気に入り配列に追加できる', () => {
		const currentFavorites: FavoriteCookieItem[] = [];
		const facilityId = 'facility-1';

		const result = addFavorite(facilityId, currentFavorites);

		expect(result).toHaveLength(1);
		expect(result[0].facilityId).toBe(facilityId);
		expect(result[0].sortOrder).toBe(1);
	});

	// Given: 既存のお気に入り（4件）
	// When: 5件目を追加
	// Then: 5件目が追加され、sortOrder=5
	it('TC-N-02: 既存のお気に入り（4件）に追加できる', () => {
		const currentFavorites: FavoriteCookieItem[] = [
			{ facilityId: '1', sortOrder: 1 },
			{ facilityId: '2', sortOrder: 2 },
			{ facilityId: '3', sortOrder: 3 },
			{ facilityId: '4', sortOrder: 4 },
		];

		const result = addFavorite('5', currentFavorites);

		expect(result).toHaveLength(5);
		expect(result[4].facilityId).toBe('5');
		expect(result[4].sortOrder).toBe(5);
	});

	// Given: 既に登録されている facilityId
	// When: 同じIDを追加しようとする
	// Then: 変更されず、元の配列を返す
	it('TC-A-01: 既に登録されている facilityId は追加されない', () => {
		const currentFavorites: FavoriteCookieItem[] = [
			{ facilityId: '1', sortOrder: 1 },
			{ facilityId: '2', sortOrder: 2 },
		];

		const result = addFavorite('1', currentFavorites);

		expect(result).toHaveLength(2);
		expect(result).toEqual(currentFavorites);
	});

	// Given: 最大件数（5件）に達している
	// When: 6件目を追加しようとする
	// Then: 追加されず、元の配列を返す
	it('TC-A-02: 最大件数（5件）に達している場合は追加されない', () => {
		const currentFavorites: FavoriteCookieItem[] = [
			{ facilityId: '1', sortOrder: 1 },
			{ facilityId: '2', sortOrder: 2 },
			{ facilityId: '3', sortOrder: 3 },
			{ facilityId: '4', sortOrder: 4 },
			{ facilityId: '5', sortOrder: 5 },
		];

		const result = addFavorite('6', currentFavorites);

		expect(result).toHaveLength(5);
		expect(result).toEqual(currentFavorites);
	});

	// Given: 最大件数を超える（6件目を追加しようとする）
	// When: 追加しようとする
	// Then: 追加されず、元の配列を返す
	it('TC-A-03: 最大件数を超える場合は追加されない', () => {
		const currentFavorites: FavoriteCookieItem[] = [
			{ facilityId: '1', sortOrder: 1 },
			{ facilityId: '2', sortOrder: 2 },
			{ facilityId: '3', sortOrder: 3 },
			{ facilityId: '4', sortOrder: 4 },
			{ facilityId: '5', sortOrder: 5 },
		];

		const result = addFavorite('6', currentFavorites);

		expect(result).toHaveLength(5);
	});
});

describe('removeFavorite', () => {
	// Given: 存在する facilityId
	// When: 削除する
	// Then: 該当するお気に入りが削除され、残りの sortOrder が再振り当てされる
	it('TC-N-01: 存在する facilityId を削除できる', () => {
		const currentFavorites: FavoriteCookieItem[] = [
			{ facilityId: '1', sortOrder: 1 },
			{ facilityId: '2', sortOrder: 2 },
			{ facilityId: '3', sortOrder: 3 },
		];

		const result = removeFavorite('2', currentFavorites);

		expect(result).toHaveLength(2);
		expect(result[0].facilityId).toBe('1');
		expect(result[0].sortOrder).toBe(1);
		expect(result[1].facilityId).toBe('3');
		expect(result[1].sortOrder).toBe(2); // 再振り当て
	});

	// Given: 1件のみのお気に入り
	// When: 削除する
	// Then: 空配列を返す
	it('TC-N-02: 1件のみのお気に入りから削除できる', () => {
		const currentFavorites: FavoriteCookieItem[] = [{ facilityId: '1', sortOrder: 1 }];

		const result = removeFavorite('1', currentFavorites);

		expect(result).toEqual([]);
	});

	// Given: 存在しない facilityId
	// When: 削除しようとする
	// Then: 変更されず、元の配列を返す
	it('TC-A-01: 存在しない facilityId は削除されない', () => {
		const currentFavorites: FavoriteCookieItem[] = [
			{ facilityId: '1', sortOrder: 1 },
			{ facilityId: '2', sortOrder: 2 },
		];

		const result = removeFavorite('3', currentFavorites);

		expect(result).toEqual(currentFavorites);
	});

	// Given: 空配列
	// When: 削除しようとする
	// Then: 空配列を返す
	it('TC-A-02: 空配列から削除しても空配列を返す', () => {
		const currentFavorites: FavoriteCookieItem[] = [];

		const result = removeFavorite('1', currentFavorites);

		expect(result).toEqual([]);
	});
});

describe('reorderFavorites', () => {
	// Given: 正常な facilityIds 配列（順序変更）
	// When: 並び替えを実行
	// Then: 指定された順序で sortOrder が更新される
	it('TC-N-01: 正常な facilityIds 配列で並び替えできる', () => {
		const currentFavorites: FavoriteCookieItem[] = [
			{ facilityId: '1', sortOrder: 1 },
			{ facilityId: '2', sortOrder: 2 },
			{ facilityId: '3', sortOrder: 3 },
		];

		const result = reorderFavorites(['3', '1', '2'], currentFavorites);

		expect(result).toHaveLength(3);
		expect(result[0].facilityId).toBe('3');
		expect(result[0].sortOrder).toBe(1);
		expect(result[1].facilityId).toBe('1');
		expect(result[1].sortOrder).toBe(2);
		expect(result[2].facilityId).toBe('2');
		expect(result[2].sortOrder).toBe(3);
	});

	// Given: 1件のみの並び替え
	// When: 並び替えを実行
	// Then: sortOrder=1 のまま
	it('TC-N-02: 1件のみの並び替えができる', () => {
		const currentFavorites: FavoriteCookieItem[] = [{ facilityId: '1', sortOrder: 1 }];

		const result = reorderFavorites(['1'], currentFavorites);

		expect(result).toHaveLength(1);
		expect(result[0].sortOrder).toBe(1);
	});

	// Given: 存在しない facilityId を含む配列
	// When: 並び替えを実行
	// Then: 存在しないIDは無視され、存在するもののみ処理される
	it('TC-A-01: 存在しない facilityId を含む配列を処理できる', () => {
		const currentFavorites: FavoriteCookieItem[] = [
			{ facilityId: '1', sortOrder: 1 },
			{ facilityId: '2', sortOrder: 2 },
		];

		const result = reorderFavorites(['2', '999', '1'], currentFavorites);

		expect(result).toHaveLength(2);
		expect(result[0].facilityId).toBe('2');
		expect(result[1].facilityId).toBe('1');
	});

	// Given: 空の facilityIds 配列
	// When: 並び替えを実行
	// Then: 空配列を返す
	it('TC-A-02: 空の facilityIds 配列を処理できる', () => {
		const currentFavorites: FavoriteCookieItem[] = [
			{ facilityId: '1', sortOrder: 1 },
			{ facilityId: '2', sortOrder: 2 },
		];

		const result = reorderFavorites([], currentFavorites);

		expect(result).toEqual([]);
	});
});

