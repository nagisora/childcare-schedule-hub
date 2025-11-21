import type { Facility } from '../lib/types';

/**
 * テスト用の Facility オブジェクトを作成するヘルパー関数
 * @param overrides 上書きするプロパティ
 * @returns Facility オブジェクト
 */
export function createTestFacility(overrides: Partial<Facility> = {}): Facility {
	return {
		id: '1',
		name: 'テスト拠点',
		ward_name: '中区',
		address_full_raw: 'テスト住所',
		phone: null,
		instagram_url: null,
		website_url: null,
		facility_type: null,
		detail_page_url: null,
		...overrides,
	};
}

