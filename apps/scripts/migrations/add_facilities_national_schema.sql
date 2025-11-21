-- フェーズ5: facilities テーブルを全国対応スキーマに拡張するマイグレーション
-- 既存のカラム（area, address）は後方互換性のためそのまま保持

-- 施設種別カラム
ALTER TABLE public.facilities ADD COLUMN IF NOT EXISTS facility_type text;

-- 詳細ページURL
ALTER TABLE public.facilities ADD COLUMN IF NOT EXISTS detail_page_url text;

-- 住所関連（全国対応）: コード系
ALTER TABLE public.facilities ADD COLUMN IF NOT EXISTS prefecture_code text;
ALTER TABLE public.facilities ADD COLUMN IF NOT EXISTS municipality_code text;
ALTER TABLE public.facilities ADD COLUMN IF NOT EXISTS ward_code text;
ALTER TABLE public.facilities ADD COLUMN IF NOT EXISTS postal_code text;

-- 住所関連（全国対応）: 表示名・生文字列
ALTER TABLE public.facilities ADD COLUMN IF NOT EXISTS prefecture_name text;
ALTER TABLE public.facilities ADD COLUMN IF NOT EXISTS city_name text;
ALTER TABLE public.facilities ADD COLUMN IF NOT EXISTS ward_name text;
ALTER TABLE public.facilities ADD COLUMN IF NOT EXISTS address_rest text;
ALTER TABLE public.facilities ADD COLUMN IF NOT EXISTS address_full_raw text;

-- 位置情報（将来拡張用）
ALTER TABLE public.facilities ADD COLUMN IF NOT EXISTS latitude numeric;
ALTER TABLE public.facilities ADD COLUMN IF NOT EXISTS longitude numeric;

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_facilities_facility_type ON public.facilities (facility_type);
CREATE INDEX IF NOT EXISTS idx_facilities_prefecture_code ON public.facilities (prefecture_code);
CREATE INDEX IF NOT EXISTS idx_facilities_municipality_code ON public.facilities (municipality_code);

