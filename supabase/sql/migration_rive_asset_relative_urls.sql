-- Chuẩn hoá URL file .riv: bỏ host (localhost / cins.vn) → path tương đối /api/rive-asset/...
-- Chạy một lần sau khi upload dev từng lưu http://localhost:3001/...

UPDATE content_tac_pham
SET
  noi_dung_blocks = regexp_replace(
    noi_dung_blocks::text,
    'https?://[^"/]+(/api/rive-asset/)',
    '\1',
    'g'
  )::jsonb,
  noi_dung_html = regexp_replace(
    coalesce(noi_dung_html, ''),
    'https?://[^"/]+(/api/rive-asset/)',
    '\1',
    'g'
  )
WHERE noi_dung_blocks::text LIKE '%/api/rive-asset/rive/%'
   OR coalesce(noi_dung_html, '') LIKE '%/api/rive-asset/rive/%';

UPDATE org_bai_dang
SET
  noi_dung_blocks = regexp_replace(
    noi_dung_blocks::text,
    'https?://[^"/]+(/api/rive-asset/)',
    '\1',
    'g'
  )::jsonb,
  noi_dung = regexp_replace(
    coalesce(noi_dung, ''),
    'https?://[^"/]+(/api/rive-asset/)',
    '\1',
    'g'
  )
WHERE noi_dung_blocks::text LIKE '%/api/rive-asset/rive/%'
   OR coalesce(noi_dung, '') LIKE '%/api/rive-asset/rive/%';
