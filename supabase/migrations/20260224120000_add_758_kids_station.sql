-- 758キッズステーションを中区の子育て支援拠点として追加
-- 出典: https://www.kosodate.city.nagoya.jp/kids/kids_park.html, https://www.kosodate.city.nagoya.jp/kids/outline.html
-- 既に同一施設が存在する場合はスキップ（冪等）

WITH target AS (
  SELECT id FROM public.facilities
  WHERE name = '758キッズステーション' AND facility_type = 'childcare_support_base'
  LIMIT 1
),
ins_facility AS (
  INSERT INTO public.facilities (
    name,
    facility_type,
    ward_name,
    city_name,
    prefecture_name,
    postal_code,
    address,
    address_full_raw,
    phone,
    website_url,
    detail_page_url,
    created_at,
    updated_at
  )
  SELECT
    '758キッズステーション',
    'childcare_support_base',
    '中区',
    '名古屋市',
    '愛知県',
    '460-0008',
    '名古屋市中区栄三丁目18番1号ナディアパーク ビジネスセンタービル6階',
    '名古屋市中区栄三丁目18番1号ナディアパーク ビジネスセンタービル6階',
    '052-262-2372',
    'https://www.kosodate.city.nagoya.jp/kids/outline.html',
    'https://www.kosodate.city.nagoya.jp/kids/outline.html',
    now(),
    now()
  WHERE NOT EXISTS (SELECT 1 FROM target)
  RETURNING id
),
facility_id AS (
  SELECT id FROM ins_facility
  UNION ALL
  SELECT id FROM target
  LIMIT 1
)
INSERT INTO public.facility_schedules (
  facility_id,
  open_time,
  close_time,
  monday,
  tuesday,
  wednesday,
  thursday,
  friday,
  saturday,
  sunday,
  holiday,
  created_at,
  updated_at
)
SELECT
  f.id,
  '10:30:00'::time,
  '17:30:00'::time,
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  false,
  now(),
  now()
FROM facility_id f
WHERE EXISTS (SELECT 1 FROM facility_id)
  AND NOT EXISTS (
    SELECT 1 FROM public.facility_schedules fs
    WHERE fs.facility_id = f.id
      AND fs.open_time = '10:30:00'::time
      AND fs.close_time = '17:30:00'::time
  );
