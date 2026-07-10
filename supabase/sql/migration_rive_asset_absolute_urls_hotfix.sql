-- Hotfix: production (chưa deploy code đọc path tương đối) cần URL tuyệt đối https://cins.vn/...
-- Chạy sau migration_rive_asset_relative_urls.sql nếu feed hiện card chữ (chi chú) thay vì embed Rive.
-- Sau khi deploy code mới, có thể chạy lại migration_rive_asset_relative_urls.sql để về path tương đối.

UPDATE content_tac_pham
SET
  noi_dung_blocks = regexp_replace(
    noi_dung_blocks::text,
    '"/api/rive-asset/',
    '"https://cins.vn/api/rive-asset/',
    'g'
  )::jsonb,
  noi_dung_html = regexp_replace(
    coalesce(noi_dung_html, ''),
    '"/api/rive-asset/',
    '"https://cins.vn/api/rive-asset/',
    'g'
  )
WHERE noi_dung_blocks::text LIKE '%"/api/rive-asset/rive/%'
   OR coalesce(noi_dung_html, '') LIKE '%"/api/rive-asset/rive/%';

UPDATE org_bai_dang
SET
  noi_dung_blocks = regexp_replace(
    noi_dung_blocks::text,
    '"/api/rive-asset/',
    '"https://cins.vn/api/rive-asset/',
    'g'
  )::jsonb,
  noi_dung = regexp_replace(
    coalesce(noi_dung, ''),
    '"/api/rive-asset/',
    '"https://cins.vn/api/rive-asset/',
    'g'
  )
WHERE noi_dung_blocks::text LIKE '%"/api/rive-asset/rive/%'
   OR coalesce(noi_dung, '') LIKE '%"/api/rive-asset/rive/%';
