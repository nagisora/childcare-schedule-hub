import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useFavoritesSync } from '../hooks/useFavoritesSync';
import { createTestFacility } from './test-helpers';
import type { Facility } from '../lib/types';
import type { FavoriteCookieItem } from '../lib/storage';
import * as schedulesLib from '../lib/schedules';
import * as storageLib from '../lib/storage';
import * as favoritesLib from '../lib/favorites';

// モック設定
vi.mock('../lib/schedules');
vi.mock('../lib/storage');
vi.mock('../lib/favorites');

describe('useFavoritesSync', () => {
	let mockFacilities: Facility[];
	let mockSchedules: Record<string, any>;
	let mockStorageItems: FavoriteCookieItem[];

	beforeEach(() => {
		// テストデータの準備
		mockFacilities = [
			createTestFacility({ id: 'facility-1', name: '拠点1' }),
			createTestFacility({ id: 'facility-2', name: '拠点2' }),
			createTestFacility({ id: 'facility-3', name: '拠点3' }),
		];

		mockSchedules = {
			'facility-1': {
				id: 'schedule-1',
				facility_id: 'facility-1',
				image_url: 'https://example.com/image1.jpg',
				instagram_post_url: null,
				embed_html: null,
				published_month: '2024-01-01',
				status: 'published',
				notes: null,
			},
			'facility-2': {
				id: 'schedule-2',
				facility_id: 'facility-2',
				image_url: 'https://example.com/image2.jpg',
				instagram_post_url: null,
				embed_html: null,
				published_month: '2024-01-01',
				status: 'published',
				notes: null,
			},
		};

		mockStorageItems = [
			{ facilityId: 'facility-1', sortOrder: 1 },
			{ facilityId: 'facility-2', sortOrder: 2 },
		];

		// localStorage のモック
		Object.defineProperty(window, 'localStorage', {
			value: {
				getItem: vi.fn(() => JSON.stringify(mockStorageItems)),
				setItem: vi.fn(),
				removeItem: vi.fn(),
				clear: vi.fn(),
			},
			writable: true,
		});

		// モック関数のデフォルト実装
		vi.mocked(storageLib.readFavoritesFromStorage).mockReturnValue(mockStorageItems);
		vi.mocked(favoritesLib.matchFavoritesWithFacilities).mockImplementation((items, facilities) => {
			const facilityMap = new Map(facilities.map((f) => [f.id, f]));
			return items
				.map((item) => {
					const facility = facilityMap.get(item.facilityId);
					if (!facility) return null;
					return { facility, sortOrder: item.sortOrder };
				})
				.filter((item): item is { facility: Facility; sortOrder: number } => item !== null)
				.sort((a, b) => a.sortOrder - b.sortOrder);
		});
		vi.mocked(schedulesLib.getLatestSchedulesByFacilityIds).mockResolvedValue(mockSchedules);
		vi.mocked(schedulesLib.getSchedulesByFacilityIdsAndMonth).mockResolvedValue({});
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	// Given: 初期ロード時にお気に入りが存在する
	// When: useFavoritesSync フックを初期化
	// Then: 全お気に入りのスケジュールが読み込まれ、選択月が今月に設定される
	it('TC-N-01: 初期ロード時にお気に入りのスケジュールが読み込まれる', async () => {
		const { result } = renderHook(() => useFavoritesSync(mockFacilities));

		await waitFor(() => {
			expect(result.current.favorites).toHaveLength(2);
			expect(result.current.favorites[0].facility.id).toBe('facility-1');
			expect(result.current.favorites[1].facility.id).toBe('facility-2');
		});

		await waitFor(() => {
			expect(result.current.schedules).toHaveProperty('facility-1');
			expect(result.current.schedules).toHaveProperty('facility-2');
		});

		expect(schedulesLib.getLatestSchedulesByFacilityIds).toHaveBeenCalledWith(['facility-1', 'facility-2']);
	});

	// Given: 既存のお気に入りが1件存在し、スケジュールが読み込まれている状態
	// When: 新規施設を1件追加する
	// Then: 既存施設のスケジュールが維持され、新規施設のスケジュールのみ追加される
	it('TC-N-02: 既存のお気に入りに1件追加したとき、既存施設のスケジュールが維持される', async () => {
		const { result } = renderHook(() => useFavoritesSync(mockFacilities));

		await waitFor(() => {
			expect(result.current.favorites).toHaveLength(2);
			expect(result.current.schedules).toHaveProperty('facility-1');
		});

		const existingSchedule = result.current.schedules['facility-1'];

		// 新規施設を追加
		const newStorageItems: FavoriteCookieItem[] = [
			{ facilityId: 'facility-1', sortOrder: 1 },
			{ facilityId: 'facility-2', sortOrder: 2 },
			{ facilityId: 'facility-3', sortOrder: 3 },
		];
		vi.mocked(storageLib.readFavoritesFromStorage).mockReturnValue(newStorageItems);
		vi.mocked(schedulesLib.getLatestSchedulesByFacilityIds).mockResolvedValue({
			'facility-3': {
				id: 'schedule-3',
				facility_id: 'facility-3',
				image_url: 'https://example.com/image3.jpg',
				instagram_post_url: null,
				embed_html: null,
				published_month: '2024-01-01',
				status: 'published',
				notes: null,
			},
		});

		// ストレージイベントを発火（シミュレーション）
		window.dispatchEvent(new StorageEvent('storage', { key: 'csh_favorites' }));

		await waitFor(() => {
			expect(result.current.favorites).toHaveLength(3);
		});

		await waitFor(() => {
			// 既存のスケジュールが維持されている
			expect(result.current.schedules['facility-1']).toEqual(existingSchedule);
			// 新規施設のスケジュールが追加されている
			expect(result.current.schedules).toHaveProperty('facility-3');
		});
	});

	// Given: お気に入りが複数存在する状態
	// When: お気に入りから1件削除する
	// Then: 削除された施設のスケジュールがクリアされ、残りの施設のスケジュールは維持される
	it('TC-N-03: お気に入りから1件削除したとき、削除された施設のスケジュールがクリアされる', async () => {
		const { result } = renderHook(() => useFavoritesSync(mockFacilities));

		await waitFor(() => {
			expect(result.current.favorites).toHaveLength(2);
			expect(result.current.schedules).toHaveProperty('facility-1');
			expect(result.current.schedules).toHaveProperty('facility-2');
		});

		const remainingSchedule = result.current.schedules['facility-1'];

		// 1件削除
		const updatedStorageItems: FavoriteCookieItem[] = [{ facilityId: 'facility-1', sortOrder: 1 }];
		vi.mocked(storageLib.readFavoritesFromStorage).mockReturnValue(updatedStorageItems);

		// ストレージイベントを発火（シミュレーション）
		window.dispatchEvent(new StorageEvent('storage', { key: 'csh_favorites' }));

		await waitFor(() => {
			expect(result.current.favorites).toHaveLength(1);
		});

		await waitFor(() => {
			// 削除された施設のスケジュールがクリアされている
			expect(result.current.schedules).not.toHaveProperty('facility-2');
			// 残りの施設のスケジュールは維持されている
			expect(result.current.schedules['facility-1']).toEqual(remainingSchedule);
		});
	});

	// Given: 空のお気に入りリストから開始
	// When: useFavoritesSync フックを初期化
	// Then: お気に入り・スケジュール・選択月がすべて空の状態になる
	it('TC-B-01: 空のお気に入りリストから開始できる', async () => {
		vi.mocked(storageLib.readFavoritesFromStorage).mockReturnValue([]);

		const { result } = renderHook(() => useFavoritesSync(mockFacilities));

		await waitFor(() => {
			expect(result.current.favorites).toHaveLength(0);
			expect(result.current.schedules).toEqual({});
			expect(Object.keys(result.current.selectedMonths)).toHaveLength(0);
		});
	});

	// Given: スケジュール取得APIが失敗する（初期ロード時）
	// When: useFavoritesSync フックを初期化
	// Then: エラーログが出力され、スケジュールは空の状態になる
	it('TC-A-01: スケジュール取得APIが失敗する（初期ロード時）', async () => {
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		vi.mocked(schedulesLib.getLatestSchedulesByFacilityIds).mockRejectedValue(new Error('API Error'));

		const { result } = renderHook(() => useFavoritesSync(mockFacilities));

		await waitFor(() => {
			expect(result.current.favorites).toHaveLength(2);
		});

		await waitFor(() => {
			expect(result.current.schedules).toEqual({});
		});

		expect(consoleErrorSpy).toHaveBeenCalled();
		consoleErrorSpy.mockRestore();
	});

	// Given: スケジュール取得APIが失敗する（お気に入り追加時）
	// When: 新規施設を追加する
	// Then: 既存施設のスケジュールは維持され、新規施設のみスケジュールが取得されない
	it('TC-A-02: スケジュール取得APIが失敗する（お気に入り追加時）', async () => {
		const { result } = renderHook(() => useFavoritesSync(mockFacilities));
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		await waitFor(() => {
			expect(result.current.favorites).toHaveLength(2);
			expect(result.current.schedules).toHaveProperty('facility-1');
		});

		const existingSchedule = result.current.schedules['facility-1'];

		// 新規施設を追加（APIが失敗する）
		const newStorageItems: FavoriteCookieItem[] = [
			{ facilityId: 'facility-1', sortOrder: 1 },
			{ facilityId: 'facility-2', sortOrder: 2 },
			{ facilityId: 'facility-3', sortOrder: 3 },
		];
		vi.mocked(storageLib.readFavoritesFromStorage).mockReturnValue(newStorageItems);
		vi.mocked(schedulesLib.getLatestSchedulesByFacilityIds).mockRejectedValue(new Error('API Error'));

		// ストレージイベントを発火
		window.dispatchEvent(new StorageEvent('storage', { key: 'csh_favorites' }));

		await waitFor(() => {
			expect(result.current.favorites).toHaveLength(3);
		});

		await waitFor(() => {
			// 既存のスケジュールが維持されている
			expect(result.current.schedules['facility-1']).toEqual(existingSchedule);
			// 新規施設のスケジュールは取得されていない
			expect(result.current.schedules).not.toHaveProperty('facility-3');
		});

		consoleErrorSpy.mockRestore();
	});

	// Given: 月切り替えボタンを1回クリックする
	// When: handleMonthChange を呼び出す
	// Then: 選択月が更新され、該当月のスケジュールが表示される
	it('TC-N-04: 月切り替えボタンを1回クリックすると、選択月とスケジュールが更新される', async () => {
		const { result } = renderHook(() => useFavoritesSync(mockFacilities));

		await waitFor(() => {
			expect(result.current.favorites).toHaveLength(2);
			expect(result.current.schedules).toHaveProperty('facility-1');
		});

		const targetMonthSchedule = {
			id: 'schedule-2024-02',
			facility_id: 'facility-1',
			image_url: 'https://example.com/image-2024-02.jpg',
			instagram_post_url: null,
			embed_html: null,
			published_month: '2024-02-01',
			status: 'published',
			notes: null,
		};

		vi.mocked(schedulesLib.getSchedulesByFacilityIdsAndMonth).mockResolvedValue({
			'facility-1': targetMonthSchedule,
		});

		// 2024年2月に切り替え
		await result.current.handleMonthChange('facility-1', 2024, 2);

		await waitFor(() => {
			expect(result.current.selectedMonths['facility-1']).toBe('2024-02-01');
			expect(result.current.schedules['facility-1']).toEqual(targetMonthSchedule);
		});
	});

	// Given: 同一施設で月切り替えを連続で2回実行（古いリクエストが後から完了）
	// When: 2回目の月切り替えを実行する
	// Then: 最終的に選択されている月のスケジュールだけが表示される（レースコンディション対策）
	it('TC-R-01: 同一施設で月切り替えを連続で2回実行すると、最終的な月のスケジュールだけが表示される', async () => {
		const { result } = renderHook(() => useFavoritesSync(mockFacilities));

		await waitFor(() => {
			expect(result.current.favorites).toHaveLength(2);
		});

		// 最初の月切り替え（2024年2月）- 遅延して完了する
		let firstResolve: (value: any) => void;
		const firstPromise = new Promise((resolve) => {
			firstResolve = resolve;
		});
		vi.mocked(schedulesLib.getSchedulesByFacilityIdsAndMonth).mockImplementationOnce(async (ids, month) => {
			await firstPromise;
			if (month === '2024-02-01') {
				return {
					'facility-1': {
						id: 'schedule-2024-02',
						facility_id: 'facility-1',
						image_url: 'https://example.com/image-2024-02.jpg',
						instagram_post_url: null,
						embed_html: null,
						published_month: '2024-02-01',
						status: 'published',
						notes: null,
					} as any,
				};
			}
			return {} as Record<string, any>;
		});

		const firstPromiseResult = result.current.handleMonthChange('facility-1', 2024, 2);

		// すぐに2回目の月切り替え（2024年3月）- 先に完了する
		vi.mocked(schedulesLib.getSchedulesByFacilityIdsAndMonth).mockResolvedValueOnce({
			'facility-1': {
				id: 'schedule-2024-03',
				facility_id: 'facility-1',
				image_url: 'https://example.com/image-2024-03.jpg',
				instagram_post_url: null,
				embed_html: null,
				published_month: '2024-03-01',
				status: 'published',
				notes: null,
			},
		});

		await result.current.handleMonthChange('facility-1', 2024, 3);

		await waitFor(() => {
			expect(result.current.selectedMonths['facility-1']).toBe('2024-03-01');
			expect(result.current.schedules['facility-1'].published_month).toBe('2024-03-01');
		});

		// 最初のリクエストを完了させる（遅れて完了）
		firstResolve!({});

		await firstPromiseResult;

		// 最終的に3月のスケジュールが表示されている（レースコンディション対策）
		await waitFor(() => {
			expect(result.current.selectedMonths['facility-1']).toBe('2024-03-01');
			expect(result.current.schedules['facility-1'].published_month).toBe('2024-03-01');
		});
	});

	// Given: 月切り替え中にスケジュール取得APIが失敗し、その後別の月に切り替えられる
	// When: 別の月に切り替える
	// Then: 最新の選択月のリクエストのみが処理され、古い月のエラー処理は無視される
	it('TC-R-02: 月切り替え中にAPIが失敗し、その後別の月に切り替えられると、最新の月のみ処理される', async () => {
		const { result } = renderHook(() => useFavoritesSync(mockFacilities));
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		await waitFor(() => {
			expect(result.current.favorites).toHaveLength(2);
		});

		// 最初の月切り替え（2024年2月）- 失敗する
		let firstReject: (error: Error) => void;
		const firstPromise = new Promise((_, reject) => {
			firstReject = reject;
		});
		vi.mocked(schedulesLib.getSchedulesByFacilityIdsAndMonth).mockImplementationOnce(async () => {
			await firstPromise;
			throw new Error('API Error');
		});

		const firstPromiseResult = result.current.handleMonthChange('facility-1', 2024, 2);

		// すぐに2回目の月切り替え（2024年3月）- 成功する
		vi.mocked(schedulesLib.getSchedulesByFacilityIdsAndMonth).mockResolvedValueOnce({
			'facility-1': {
				id: 'schedule-2024-03',
				facility_id: 'facility-1',
				image_url: 'https://example.com/image-2024-03.jpg',
				instagram_post_url: null,
				embed_html: null,
				published_month: '2024-03-01',
				status: 'published',
				notes: null,
			},
		});

		await result.current.handleMonthChange('facility-1', 2024, 3);

		await waitFor(() => {
			expect(result.current.selectedMonths['facility-1']).toBe('2024-03-01');
			expect(result.current.schedules['facility-1'].published_month).toBe('2024-03-01');
		});

		// 最初のリクエストを失敗させる（遅れて完了）
		firstReject!(new Error('API Error'));

		try {
			await firstPromiseResult;
		} catch {
			// エラーは無視（レースコンディション対策で処理されない）
		}

		// 最終的に3月のスケジュールが表示されている
		await waitFor(() => {
			expect(result.current.selectedMonths['facility-1']).toBe('2024-03-01');
			expect(result.current.schedules['facility-1'].published_month).toBe('2024-03-01');
		});

		consoleErrorSpy.mockRestore();
	});
});

