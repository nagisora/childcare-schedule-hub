-- クエリパラメータとフラグメントが残っている instagram_post_url を正規化
-- SQL(5)で検出された5件を対象に、? 以降と # 以降を除去

UPDATE schedules
SET instagram_post_url = CASE 
  WHEN instagram_post_url LIKE '%?%' THEN 
    regexp_replace(split_part(instagram_post_url, '?', 1), '#.*$', '')
  WHEN instagram_post_url LIKE '%#%' THEN 
    regexp_replace(instagram_post_url, '#.*$', '')
  ELSE instagram_post_url
END,
updated_at = now()
WHERE instagram_post_url IS NOT NULL
  AND (instagram_post_url LIKE '%?%' OR instagram_post_url LIKE '%#%');;
