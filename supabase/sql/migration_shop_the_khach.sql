-- =====================================================================
-- migration_shop_the_khach.sql
-- Thẻ phân loại khách hàng của shop (chỉ seller thấy).
-- Idempotent — chạy lại an toàn.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.shop_the_khach (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_nguoi_ban  uuid NOT NULL REFERENCES public.user_nguoi_dung(id) ON DELETE CASCADE,
  ten           text NOT NULL,
  slug          text NOT NULL,
  mau           text,
  thu_tu        integer NOT NULL DEFAULT 0,
  mac_dinh      boolean NOT NULL DEFAULT false,
  tao_luc       timestamptz NOT NULL DEFAULT now(),
  cap_nhat_luc  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id_nguoi_ban, slug)
);

CREATE INDEX IF NOT EXISTS shop_the_khach_ban_idx
  ON public.shop_the_khach (id_nguoi_ban, thu_tu);

CREATE TABLE IF NOT EXISTS public.shop_the_khach_gan (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_the        uuid NOT NULL REFERENCES public.shop_the_khach(id) ON DELETE CASCADE,
  id_nguoi_ban  uuid NOT NULL REFERENCES public.user_nguoi_dung(id) ON DELETE CASCADE,
  id_nguoi_mua  uuid NOT NULL REFERENCES public.user_nguoi_dung(id) ON DELETE CASCADE,
  tao_luc       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id_the, id_nguoi_mua)
);

CREATE INDEX IF NOT EXISTS shop_the_khach_gan_ban_mua_idx
  ON public.shop_the_khach_gan (id_nguoi_ban, id_nguoi_mua);

COMMENT ON TABLE public.shop_the_khach IS
  'Thẻ phân loại khách hàng do seller tự định nghĩa — chỉ seller đọc/ghi.';
COMMENT ON TABLE public.shop_the_khach_gan IS
  'Gán thẻ lên buyer (theo cặp seller-buyer). Buyer KHÔNG được đọc.';
COMMENT ON COLUMN public.shop_the_khach.mac_dinh IS
  'Thẻ seed mặc định (Đã/Chưa chuyển tiền, Ship) — thông tin, không chặn xóa/sửa.';

ALTER TABLE public.shop_the_khach ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_the_khach_gan ENABLE ROW LEVEL SECURITY;

-- Chỉ chủ shop — buyer KHÔNG có policy nào (mặc định deny).
DROP POLICY IF EXISTS shop_the_khach_owner ON public.shop_the_khach;
CREATE POLICY shop_the_khach_owner ON public.shop_the_khach
  FOR ALL
  USING (id_nguoi_ban = public.current_profile_id())
  WITH CHECK (id_nguoi_ban = public.current_profile_id());

DROP POLICY IF EXISTS shop_the_khach_gan_owner ON public.shop_the_khach_gan;
CREATE POLICY shop_the_khach_gan_owner ON public.shop_the_khach_gan
  FOR ALL
  USING (id_nguoi_ban = public.current_profile_id())
  WITH CHECK (id_nguoi_ban = public.current_profile_id());

-- --- Backfill 3 thẻ mặc định cho seller hiện có --------------------------
-- Chỉ seller chưa có thẻ nào. Read path KHÔNG seed (xem PLAN §1.5).
INSERT INTO public.shop_the_khach (id_nguoi_ban, ten, slug, mau, thu_tu, mac_dinh)
SELECT u.id, d.ten, d.slug, d.mau, d.thu_tu, true
FROM public.user_nguoi_dung u
CROSS JOIN (VALUES
  ('Đã chuyển tiền',   'da-chuyen-tien',   '#15803d', 0),
  ('Chưa chuyển tiền', 'chua-chuyen-tien', '#b45309', 1),
  ('Ship',             'ship',             '#1f74c9', 2)
) AS d(ten, slug, mau, thu_tu)
WHERE u.ban_hang_bat = true
  AND NOT EXISTS (
    SELECT 1 FROM public.shop_the_khach t WHERE t.id_nguoi_ban = u.id
  );
