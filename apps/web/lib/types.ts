/**
 * 拠点（Facility）の型定義
 * [02 設計資料](../docs/02-design.md) 3.3節、[03 API 仕様](../docs/03-api.md) 2.3節を参照
 */
export type Facility = {
	id: string;
	name: string;
	ward_name: string | null;
	address_full_raw: string;
	phone: string | null;
	instagram_url: string | null;
	website_url: string | null;
	facility_type: string | null;
	detail_page_url: string | null;
	created_at?: string;
	updated_at?: string;
};

/**
 * 区別にグルーピングされた拠点一覧
 */
export type FacilitiesByWard = Record<string, Facility[]>;

/**
 * スケジュール（Schedule）の型定義
 * [02 設計資料](../docs/02-design.md) 3.3節を参照
 */
export type Schedule = {
	id: string;
	facility_id: string;
	image_url: string;
	instagram_post_url: string | null;
	embed_html: string | null;
	published_month: string; // date形式（YYYY-MM-DD）
	status: string;
	notes: string | null;
	created_at?: string;
	updated_at?: string;
};

