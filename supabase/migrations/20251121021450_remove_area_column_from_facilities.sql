-- フェーズ5フォローアップ: areaカラムを削除し、ward_nameベースに統一
ALTER TABLE public.facilities DROP COLUMN IF EXISTS area;;
