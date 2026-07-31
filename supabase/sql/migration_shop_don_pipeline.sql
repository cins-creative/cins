-- Shop pipeline 5 bước + cấu hình tỷ lệ phí admin (A14 + bảng mới).
-- 2026-07-30

-- ── A14: thêm value enum trạng thái đơn ─────────────────────────
ALTER TYPE public.shop_trang_thai_don_enum ADD VALUE IF NOT EXISTS 'cho_lay_hang';
ALTER TYPE public.shop_trang_thai_don_enum ADD VALUE IF NOT EXISTS 'dang_giao';
ALTER TYPE public.shop_trang_thai_don_enum ADD VALUE IF NOT EXISTS 'hoan_tra';

COMMENT ON TYPE public.shop_trang_thai_don_enum IS
  'L33 đơn: nhap | cho_xac_nhan | da_nhan_tien | cho_lay_hang | dang_giao | da_giao_tai_su_kien | hoan_thanh | hoan_tra | huy';

-- ── Cấu hình tỷ lệ phí nền tảng (admin chỉnh) ───────────────────
CREATE TABLE IF NOT EXISTS public.shop_cau_hinh_phi (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ty_le         numeric(5, 4) NOT NULL DEFAULT 0.0500
                CHECK (ty_le >= 0 AND ty_le <= 1),
  cap_nhat_boi  uuid REFERENCES public.user_nguoi_dung(id) ON DELETE SET NULL,
  cap_nhat_luc  timestamptz NOT NULL DEFAULT now(),
  tao_luc       timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.shop_cau_hinh_phi IS
  'L33: tỷ lệ phí nền tảng (% GMV). Thường 1 dòng; admin PATCH. Dòng phí đã ghi giữ snapshot ty_le.';

-- Seed 1 dòng mặc định 5% nếu bảng trống.
INSERT INTO public.shop_cau_hinh_phi (ty_le)
SELECT 0.0500
WHERE NOT EXISTS (SELECT 1 FROM public.shop_cau_hinh_phi LIMIT 1);

ALTER TABLE public.shop_cau_hinh_phi ENABLE ROW LEVEL SECURITY;

-- Chỉ service-role / admin API đọc-ghi; không policy authenticated.
