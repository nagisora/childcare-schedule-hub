import { describe, it, expect } from 'vitest';
import { matchFavoritesWithFacilities } from '../lib/favorites';
import type { Facility } from '../lib/types';
import type { FavoriteCookieItem } from '../lib/cookies';

describe('matchFavoritesWithFacilities', () => {
	// Given: 正常なお気に入りクッキーアイテムと拠点一覧（すべてマッチ）
	// When: matchFavoritesWithFacilities を実行
	// Then: すべてのお気に入りが Facility データと結合され、sortOrder 順にソートされる
	it('TC-N-01: 正常なお気に入りクッキーアイテムと拠点一覧（すべてマッチ）を結合できる', () => {
		const facilities: Facility[] = [
			{ id: '1', name: '拠点A', area: '中区', address: '住所1', phone: null, instagram_url: null, website_url: null },
			{ id: '2', name: '拠点B', area: '西区', address: '住所2', phone: null, instagram_url: null, website_url: null },
			{ id: '3', name: '拠点C', area: '中区', address: '住所3', phone: null, instagram_url: null, website_url: null },
		];
		const favoriteItems: FavoriteCookieItem[] = [
			{ facilityId: '2', sortOrder: 1 },
			{ facilityId: '1', sortOrder: 2 },
		];

		const result = matchFavoritesWithFacilities(favoriteItems, facilities);

		expect(result).toHaveLength(2);
		expect(result[0].facility.id).toBe('2');
		expect(result[0].sortOrder).toBe(1);
		expect(result[1].facility.id).toBe('1');
		expect(result[1].sortOrder).toBe(2);
	});

	// Given: お気に入りに登録されている facilityId が、現在の拠点一覧に存在しない
	// When: matchFavoritesWithFacilities を実行
	// Then: 該当するお気に入りは除外され、存在するもののみ返される
	it('TC-FV-04: お気に入りに登録されている facilityId が拠点一覧に存在しない場合は除外される', () => {
		const facilities: Facility[] = [
			{ id: '1', name: '拠点A', area: '中区', address: '住所1', phone: null, instagram_url: null, website_url: null },
			{ id: '2', name: '拠点B', area: '西区', address: '住所2', phone: null, instagram_url: null, website_url: null },
		];
		const favoriteItems: FavoriteCookieItem[] = [
			{ facilityId: '1', sortOrder: 1 },
			{ facilityId: '999', sortOrder: 2 }, // 存在しないID
			{ facilityId: '2', sortOrder: 3 },
		];

		const result = matchFavoritesWithFacilities(favoriteItems, facilities);

		expect(result).toHaveLength(2);
		expect(result[0].facility.id).toBe('1');
		expect(result[1].facility.id).toBe('2');
		// 存在しないID（'999'）は除外される
		expect(result.find((f) => f.facility.id === '999')).toBeUndefined();
	});

	// Given: 空のお気に入り配列
	// When: matchFavoritesWithFacilities を実行
	// Then: 空配列を返す
	it('TC-N-02: 空のお気に入り配列を処理できる', () => {
		const facilities: Facility[] = [
			{ id: '1', name: '拠点A', area: '中区', address: '住所1', phone: null, instagram_url: null, website_url: null },
		];
		const favoriteItems: FavoriteCookieItem[] = [];

		const result = matchFavoritesWithFacilities(favoriteItems, facilities);

		expect(result).toEqual([]);
	});

	// Given: 空の拠点一覧
	// When: matchFavoritesWithFacilities を実行
	// Then: 空配列を返す
	it('TC-N-03: 空の拠点一覧を処理できる', () => {
		const facilities: Facility[] = [];
		const favoriteItems: FavoriteCookieItem[] = [
			{ facilityId: '1', sortOrder: 1 },
		];

		const result = matchFavoritesWithFacilities(favoriteItems, facilities);

		expect(result).toEqual([]);
	});

	// Given: お気に入りが sortOrder 順にソートされていない
	// When: matchFavoritesWithFacilities を実行
	// Then: sortOrder 順にソートされた結果を返す
	it('TC-FV-05: お気に入りが sortOrder 順にソートされる', () => {
		const facilities: Facility[] = [
			{ id: '1', name: '拠点A', area: '中区', address: '住所1', phone: null, instagram_url: null, website_url: null },
			{ id: '2', name: '拠点B', area: '西区', address: '住所2', phone: null, instagram_url: null, website_url: null },
			{ id: '3', name: '拠点C', area: '東区', address: '住所3', phone: null, instagram_url: null, website_url: null },
		];
		const favoriteItems: FavoriteCookieItem[] = [
			{ facilityId: '3', sortOrder: 3 },
			{ facilityId: '1', sortOrder: 1 },
			{ facilityId: '2', sortOrder: 2 },
		];

		const result = matchFavoritesWithFacilities(favoriteItems, facilities);

		expect(result).toHaveLength(3);
		expect(result[0].facility.id).toBe('1');
		expect(result[0].sortOrder).toBe(1);
		expect(result[1].facility.id).toBe('2');
		expect(result[1].sortOrder).toBe(2);
		expect(result[2].facility.id).toBe('3');
		expect(result[2].sortOrder).toBe(3);
	});

	// Given: すべてのお気に入りIDが拠点一覧に存在しない
	// When: matchFavoritesWithFacilities を実行
	// Then: 空配列を返す
	it('TC-A-01: すべてのお気に入りIDが拠点一覧に存在しない場合は空配列を返す', () => {
		const facilities: Facility[] = [
			{ id: '1', name: '拠点A', area: '中区', address: '住所1', phone: null, instagram_url: null, website_url: null },
		];
		const favoriteItems: FavoriteCookieItem[] = [
			{ facilityId: '999', sortOrder: 1 },
			{ facilityId: '998', sortOrder: 2 },
		];

		const result = matchFavoritesWithFacilities(favoriteItems, facilities);

		expect(result).toEqual([]);
	});
});

