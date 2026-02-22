-- facilities テーブル作成
CREATE TABLE IF NOT EXISTS public.facilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  area text NOT NULL,
  address text NOT NULL,
  phone text,
  instagram_url text,
  website_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- エリア別検索向けのインデックス
CREATE INDEX IF NOT EXISTS idx_facilities_area ON public.facilities (area);

-- RLS（Row Level Security）を有効化（公開読み取り・管理者書き込み）
ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;

-- 匿名ユーザーは読み取り可能
CREATE POLICY "Allow public read access" ON public.facilities
  FOR SELECT
  USING (true);;
