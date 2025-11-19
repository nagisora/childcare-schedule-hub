/**
 * 拠点（Facility）の型定義
 * [02 設計資料](../docs/02-design.md) 3.3節、[03 API 仕様](../docs/03-api.md) 2.3節を参照
 */
export type Facility = {
	id: string;
	name: string;
	area: string;
	address: string;
	phone: string | null;
	instagram_url: string | null;
	website_url: string | null;
	created_at?: string;
	updated_at?: string;
};

/**
 * エリア別にグルーピングされた拠点一覧
 */
export type FacilitiesByArea = Record<string, Facility[]>;

