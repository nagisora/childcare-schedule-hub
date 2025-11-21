import { describe, it, expect } from 'vitest';
import { groupFacilitiesByWard } from '../lib/facilities-utils';
import type { Facility } from '../lib/types';
import { createTestFacility } from './test-helpers';

describe('groupFacilitiesByWard', () => {
	// Given: 正常な拠点配列（複数区）
	// When: groupFacilitiesByWard を実行
	// Then: 区別にグルーピングされ、区名でソートされた配列を返す
	it('TC-N-01: 正常な拠点配列（複数区）をグルーピングできる', () => {
		const facilities: Facility[] = [
			createTestFacility({ id: '1', name: '拠点A', ward_name: '中区', address_full_raw: '住所1' }),
			createTestFacility({ id: '2', name: '拠点B', ward_name: '西区', address_full_raw: '住所2' }),
			createTestFacility({ id: '3', name: '拠点C', ward_name: '中区', address_full_raw: '住所3' }),
		];

		const result = groupFacilitiesByWard(facilities);

		expect(result.wards).toEqual(['中区', '西区']);
		expect(result.facilitiesByWard['中区']).toHaveLength(2);
		expect(result.facilitiesByWard['西区']).toHaveLength(1);
		expect(result.facilitiesByWard['中区'][0].id).toBe('1');
		expect(result.facilitiesByWard['中区'][1].id).toBe('3');
	});

	// Given: 空の拠点配列
	// When: groupFacilitiesByWard を実行
	// Then: { wards: [], facilitiesByWard: {} } を返す
	it('TC-N-02: 空の拠点配列を処理できる', () => {
		const facilities: Facility[] = [];

		const result = groupFacilitiesByWard(facilities);

		expect(result.wards).toEqual([]);
		expect(result.facilitiesByWard).toEqual({});
	});

	// Given: 1件の拠点のみ
	// When: groupFacilitiesByWard を実行
	// Then: 1つの区に1件の拠点を含むオブジェクトを返す
	it('TC-N-03: 1件の拠点のみを処理できる', () => {
		const facilities: Facility[] = [
			createTestFacility({ id: '1', name: '拠点A', ward_name: '中区', address_full_raw: '住所1' }),
		];

		const result = groupFacilitiesByWard(facilities);

		expect(result.wards).toEqual(['中区']);
		expect(result.facilitiesByWard['中区']).toHaveLength(1);
		expect(result.facilitiesByWard['中区'][0].id).toBe('1');
	});

	// Given: 同一区に複数拠点
	// When: groupFacilitiesByWard を実行
	// Then: 同一区内に複数の拠点が含まれる
	it('TC-N-04: 同一区に複数拠点を処理できる', () => {
		const facilities: Facility[] = [
			createTestFacility({ id: '1', name: '拠点A', ward_name: '中区', address_full_raw: '住所1' }),
			createTestFacility({ id: '2', name: '拠点B', ward_name: '中区', address_full_raw: '住所2' }),
			createTestFacility({ id: '3', name: '拠点C', ward_name: '中区', address_full_raw: '住所3' }),
		];

		const result = groupFacilitiesByWard(facilities);

		expect(result.wards).toEqual(['中区']);
		expect(result.facilitiesByWard['中区']).toHaveLength(3);
	});

	// Given: 区名が異なる拠点
	// When: groupFacilitiesByWard を実行
	// Then: 区別に正しく分離される
	it('TC-N-05: 区名が異なる拠点を正しく分離できる', () => {
		const facilities: Facility[] = [
			createTestFacility({ id: '1', name: '拠点A', ward_name: '中区', address_full_raw: '住所1' }),
			createTestFacility({ id: '2', name: '拠点B', ward_name: '西区', address_full_raw: '住所2' }),
			createTestFacility({ id: '3', name: '拠点C', ward_name: '東区', address_full_raw: '住所3' }),
		];

		const result = groupFacilitiesByWard(facilities);

		expect(result.wards).toEqual(['中区', '東区', '西区']); // ソート順
		expect(result.facilitiesByWard['中区']).toHaveLength(1);
		expect(result.facilitiesByWard['西区']).toHaveLength(1);
		expect(result.facilitiesByWard['東区']).toHaveLength(1);
	});

	// Given: ward_name が null の拠点
	// When: groupFacilitiesByWard を実行
	// Then: 「エリア不明」としてグルーピングされる
	it('TC-N-06: ward_name が null の拠点を「エリア不明」として処理できる', () => {
		const facilities: Facility[] = [
			createTestFacility({ id: '1', name: '拠点A', ward_name: null, address_full_raw: '住所1' }),
			createTestFacility({ id: '2', name: '拠点B', ward_name: '中区', address_full_raw: '住所2' }),
		];

		const result = groupFacilitiesByWard(facilities);

		expect(result.wards).toEqual(['エリア不明', '中区']);
		expect(result.facilitiesByWard['エリア不明']).toHaveLength(1);
		expect(result.facilitiesByWard['エリア不明'][0].id).toBe('1');
	});
});


