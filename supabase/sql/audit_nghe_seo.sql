-- Audit SEO nghề (`loai_bai_viet = nghe`) — readonly.
-- Chạy qua: node scripts/audit-nghe-seo.mjs
-- hoặc Supabase SQL editor.

WITH nghe AS (
  SELECT
    b.id,
    b.slug,
    b.tieu_de,
    b.tieu_de_viet,
    b.trang_thai_noi_dung,
    b.meta_title,
    b.meta_description,
    b.tom_tat,
    b.noi_dung,
    b.thumbnail,
    b.cover_id,
    b.id_linh_vuc,
    b.cap_nhat_luc,
    length(coalesce(b.meta_description, '')) AS meta_desc_len,
    length(coalesce(b.tom_tat, '')) AS tom_tat_len,
    length(coalesce(b.noi_dung, '')) AS noi_dung_len,
    EXISTS (
      SELECT 1
      FROM article_gan_nhom g
      JOIN article_nhom n ON n.id = g.id_nhom
      WHERE g.id_bai_viet = b.id
        AND n.loai_nhom = 'bo_phan'
    ) AS has_bo_phan
  FROM article_bai_viet b
  WHERE b.loai_bai_viet = 'nghe'
)
SELECT
  id,
  slug,
  coalesce(nullif(trim(tieu_de_viet), ''), tieu_de) AS ten,
  trang_thai_noi_dung,
  (meta_title IS NOT NULL AND length(trim(meta_title)) > 0) AS has_meta_title,
  (meta_description IS NOT NULL AND length(trim(meta_description)) > 0) AS has_meta_description,
  meta_desc_len,
  (meta_desc_len > 160) AS meta_desc_too_long,
  (tom_tat IS NOT NULL AND length(trim(tom_tat)) > 0) AS has_tom_tat,
  tom_tat_len,
  (noi_dung IS NOT NULL AND length(trim(noi_dung)) > 200) AS has_noi_dung_substantive,
  noi_dung_len,
  has_bo_phan,
  (thumbnail IS NOT NULL AND length(trim(thumbnail)) > 0)
    OR (cover_id IS NOT NULL) AS has_cover_or_thumb,
  id_linh_vuc,
  cap_nhat_luc,
  CASE
    WHEN trang_thai_noi_dung <> 'published' THEN 'not_published'
    WHEN meta_title IS NULL OR length(trim(meta_title)) = 0 THEN 'missing_meta_title'
    WHEN meta_description IS NULL OR length(trim(meta_description)) = 0 THEN 'missing_meta_description'
    WHEN meta_desc_len > 160 THEN 'meta_desc_too_long'
    WHEN tom_tat IS NULL OR length(trim(tom_tat)) = 0 THEN 'missing_tom_tat'
    WHEN noi_dung IS NULL OR length(trim(noi_dung)) <= 200 THEN 'thin_noi_dung'
    WHEN NOT has_bo_phan THEN 'missing_bo_phan'
    ELSE 'ok'
  END AS priority_issue
FROM nghe
ORDER BY
  CASE
    WHEN trang_thai_noi_dung <> 'published' THEN 9
    WHEN meta_title IS NULL OR length(trim(meta_title)) = 0 THEN 1
    WHEN meta_description IS NULL OR length(trim(meta_description)) = 0 THEN 2
    WHEN meta_desc_len > 160 THEN 3
    WHEN tom_tat IS NULL OR length(trim(tom_tat)) = 0 THEN 4
    WHEN noi_dung IS NULL OR length(trim(noi_dung)) <= 200 THEN 5
    WHEN NOT has_bo_phan THEN 6
    ELSE 8
  END,
  slug;
