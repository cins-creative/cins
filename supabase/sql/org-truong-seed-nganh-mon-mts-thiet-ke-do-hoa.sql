-- Seed môn chuyên ngành cho MTS — ngành Thiết kế đồ họa
-- Chạy SAU migration_org_truong_nganh_mon.sql trên project CINs.
-- org_truong_nganh.id = dc1f5d04-d98a-4dcd-abba-5ae5e8be0e9b (7210403)

-- Tạo / cập nhật bài mon_hoc (id cố định để seed idempotent)
INSERT INTO public.article_bai_viet (
  id, slug, tieu_de, tieu_de_viet, loai_bai_viet, da_verify,
  trang_thai_noi_dung, tao_luc, cap_nhat_luc
) VALUES
  (
    'a1000001-0000-4000-8000-000000000001',
    'thiet-ke-tuong-tac',
    'Thiết kế tương tác',
    'Thiết kế tương tác',
    'mon_hoc',
    false,
    'published',
    now(),
    now()
  ),
  (
    'a1000001-0000-4000-8000-000000000002',
    'do-hoa-da-phuong-tien',
    'Đồ họa đa phương tiện',
    'Đồ họa đa phương tiện',
    'mon_hoc',
    false,
    'published',
    now(),
    now()
  ),
  (
    'a1000001-0000-4000-8000-000000000003',
    'thiet-ke-bao-bi',
    'Thiết kế bao bì',
    'Thiết kế bao bì',
    'mon_hoc',
    false,
    'published',
    now(),
    now()
  )
ON CONFLICT (id) DO UPDATE SET
  tieu_de = EXCLUDED.tieu_de,
  tieu_de_viet = EXCLUDED.tieu_de_viet,
  loai_bai_viet = EXCLUDED.loai_bai_viet,
  trang_thai_noi_dung = EXCLUDED.trang_thai_noi_dung,
  cap_nhat_luc = now();

INSERT INTO public.org_truong_nganh_mon (id_truong_nganh, id_mon_hoc, thu_tu)
VALUES
  (
    'dc1f5d04-d98a-4dcd-abba-5ae5e8be0e9b',
    'a1000001-0000-4000-8000-000000000001',
    0
  ),
  (
    'dc1f5d04-d98a-4dcd-abba-5ae5e8be0e9b',
    'a1000001-0000-4000-8000-000000000002',
    1
  ),
  (
    'dc1f5d04-d98a-4dcd-abba-5ae5e8be0e9b',
    'a1000001-0000-4000-8000-000000000003',
    2
  )
ON CONFLICT (id_truong_nganh, id_mon_hoc) DO UPDATE SET
  thu_tu = EXCLUDED.thu_tu;
