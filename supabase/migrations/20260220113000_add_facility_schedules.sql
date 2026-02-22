-- 拠点ごとの開所曜日・開所時間を管理するテーブル
CREATE TABLE IF NOT EXISTS public.facility_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  open_time time NOT NULL,
  close_time time NOT NULL,
  monday boolean NOT NULL DEFAULT false,
  tuesday boolean NOT NULL DEFAULT false,
  wednesday boolean NOT NULL DEFAULT false,
  thursday boolean NOT NULL DEFAULT false,
  friday boolean NOT NULL DEFAULT false,
  saturday boolean NOT NULL DEFAULT false,
  sunday boolean NOT NULL DEFAULT false,
  holiday boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CHECK (open_time < close_time)
);

-- 絞り込み検索で使う想定のインデックス
CREATE INDEX IF NOT EXISTS idx_facility_schedules_facility_id ON public.facility_schedules (facility_id);
CREATE INDEX IF NOT EXISTS idx_facility_schedules_sunday ON public.facility_schedules (sunday);
CREATE INDEX IF NOT EXISTS idx_facility_schedules_holiday ON public.facility_schedules (holiday);
CREATE INDEX IF NOT EXISTS idx_facility_schedules_close_time ON public.facility_schedules (close_time);

-- 公開読み取り + 管理者書き込み
ALTER TABLE public.facility_schedules ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'facility_schedules'
      AND policyname = 'facility_schedules_public_read'
  ) THEN
    CREATE POLICY "facility_schedules_public_read"
      ON public.facility_schedules
      FOR SELECT
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'facility_schedules'
      AND policyname = 'facility_schedules_admin_write'
  ) THEN
    CREATE POLICY "facility_schedules_admin_write"
      ON public.facility_schedules
      FOR ALL
      USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
      WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
  END IF;
END $$;
