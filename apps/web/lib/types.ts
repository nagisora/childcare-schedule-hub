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
	/** InstagramアカウントのURL（外部SNSリンク） */
	instagram_url: string | null;
	/** 公式サイトのURL（外部リンク） */
	website_url: string | null;
	facility_type: string | null;
	/** 事業者独自の詳細ページURL（外部リンク） */
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
	/** Instagram投稿のURL（Phase6では主にこちらを使用して埋め込み表示） */
	instagram_post_url: string | null;
	/** 埋め込み用HTML（将来の拡張用、現時点では未使用） */
	embed_html: string | null;
	/** 公開月（YYYY-MM-DD形式、月の1日として扱う。date-utils.ts の関数と連携） */
	published_month: string;
	status: string;
	notes: string | null;
	created_at?: string;
	updated_at?: string;
};

