import { describe, it, expect } from 'vitest';
import { groupFacilitiesByArea } from '../lib/facilities-utils';
import type { Facility } from '../lib/types';

describe('groupFacilitiesByArea', () => {
	// Given: 正常な拠点配列（複数エリア）
	// When: groupFacilitiesByArea を実行
	// Then: エリア別にグルーピングされ、エリア名でソートされた配列を返す
	it('TC-N-01: 正常な拠点配列（複数エリア）をグルーピングできる', () => {
		const facilities: Facility[] = [
			{ id: '1', name: '拠点A', area: '中区', address: '住所1', phone: null, instagram_url: null, website_url: null },
			{ id: '2', name: '拠点B', area: '西区', address: '住所2', phone: null, instagram_url: null, website_url: null },
			{ id: '3', name: '拠点C', area: '中区', address: '住所3', phone: null, instagram_url: null, website_url: null },
		];

		const result = groupFacilitiesByArea(facilities);

		expect(result.areas).toEqual(['中区', '西区']);
		expect(result.facilitiesByArea['中区']).toHaveLength(2);
		expect(result.facilitiesByArea['西区']).toHaveLength(1);
		expect(result.facilitiesByArea['中区'][0].id).toBe('1');
		expect(result.facilitiesByArea['中区'][1].id).toBe('3');
	});

	// Given: 空の拠点配列
	// When: groupFacilitiesByArea を実行
	// Then: { areas: [], facilitiesByArea: {} } を返す
	it('TC-N-02: 空の拠点配列を処理できる', () => {
		const facilities: Facility[] = [];

		const result = groupFacilitiesByArea(facilities);

		expect(result.areas).toEqual([]);
		expect(result.facilitiesByArea).toEqual({});
	});

	// Given: 1件の拠点のみ
	// When: groupFacilitiesByArea を実行
	// Then: 1つのエリアに1件の拠点を含むオブジェクトを返す
	it('TC-N-03: 1件の拠点のみを処理できる', () => {
		const facilities: Facility[] = [
			{ id: '1', name: '拠点A', area: '中区', address: '住所1', phone: null, instagram_url: null, website_url: null },
		];

		const result = groupFacilitiesByArea(facilities);

		expect(result.areas).toEqual(['中区']);
		expect(result.facilitiesByArea['中区']).toHaveLength(1);
		expect(result.facilitiesByArea['中区'][0].id).toBe('1');
	});

	// Given: 同一エリアに複数拠点
	// When: groupFacilitiesByArea を実行
	// Then: 同一エリア内に複数の拠点が含まれる
	it('TC-N-04: 同一エリアに複数拠点を処理できる', () => {
		const facilities: Facility[] = [
			{ id: '1', name: '拠点A', area: '中区', address: '住所1', phone: null, instagram_url: null, website_url: null },
			{ id: '2', name: '拠点B', area: '中区', address: '住所2', phone: null, instagram_url: null, website_url: null },
			{ id: '3', name: '拠点C', area: '中区', address: '住所3', phone: null, instagram_url: null, website_url: null },
		];

		const result = groupFacilitiesByArea(facilities);

		expect(result.areas).toEqual(['中区']);
		expect(result.facilitiesByArea['中区']).toHaveLength(3);
	});

	// Given: エリア名が異なる拠点
	// When: groupFacilitiesByArea を実行
	// Then: エリア別に正しく分離される
	it('TC-N-05: エリア名が異なる拠点を正しく分離できる', () => {
		const facilities: Facility[] = [
			{ id: '1', name: '拠点A', area: '中区', address: '住所1', phone: null, instagram_url: null, website_url: null },
			{ id: '2', name: '拠点B', area: '西区', address: '住所2', phone: null, instagram_url: null, website_url: null },
			{ id: '3', name: '拠点C', area: '東区', address: '住所3', phone: null, instagram_url: null, website_url: null },
		];

		const result = groupFacilitiesByArea(facilities);

		expect(result.areas).toEqual(['中区', '東区', '西区']); // ソート順
		expect(result.facilitiesByArea['中区']).toHaveLength(1);
		expect(result.facilitiesByArea['西区']).toHaveLength(1);
		expect(result.facilitiesByArea['東区']).toHaveLength(1);
	});
});


