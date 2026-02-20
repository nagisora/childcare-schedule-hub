-- schedules テーブル作成
CREATE TABLE IF NOT EXISTS public.schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  instagram_post_url text,
  embed_html text,
  published_month date NOT NULL,
  status text DEFAULT 'published',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (facility_id, published_month)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_schedules_facility_month_desc ON public.schedules (facility_id, published_month DESC);
CREATE INDEX IF NOT EXISTS idx_schedules_created_at ON public.schedules (created_at DESC);

-- RLS（Row Level Security）を有効化（公開読み取り・管理者書き込み）
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;

-- 匿名ユーザーは読み取り可能
CREATE POLICY "Allow public read access" ON public.schedules
  FOR SELECT
  USING (true);;
