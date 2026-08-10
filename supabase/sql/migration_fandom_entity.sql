-- =====================================================================
-- migration_fandom_entity.sql
-- Fandom = loai_bai_viet entity + shop_nhom_fandom (thay facet shop fandom).
-- Quyết định: CINS_DECISIONS.md · Fandom entity (2026-08-10).
-- Idempotent — chạy lại an toàn. CINs ospzzzxcomrmhqrnkoiw.
--
-- LƯU Ý Postgres: ALTER TYPE ... ADD VALUE không chạy trong transaction block.
-- Runner phải tách câu ADD VALUE nếu bọc BEGIN/COMMIT; script Node dùng unsafe
-- cả file — Postgres.js không auto-transaction toàn file trừ khi bạn bọc.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Enum loai_bai_viet — thêm 'fandom' (no-op nếu đã có)
-- Postgres 15+ / Supabase: IF NOT EXISTS + được phép trong transaction.
-- ---------------------------------------------------------------------
ALTER TYPE public.loai_bai_viet_enum ADD VALUE IF NOT EXISTS 'fandom';

-- ---------------------------------------------------------------------
-- 2. Junction shop_nhom ↔ article fandom
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shop_nhom_fandom (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_nhom       uuid NOT NULL REFERENCES public.shop_nhom(id) ON DELETE CASCADE,
  id_bai_viet   uuid NOT NULL REFERENCES public.article_bai_viet(id) ON DELETE CASCADE,
  tao_luc       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id_nhom, id_bai_viet)
);

CREATE INDEX IF NOT EXISTS idx_shop_nhom_fandom_bai_viet
  ON public.shop_nhom_fandom (id_bai_viet);

CREATE INDEX IF NOT EXISTS idx_shop_nhom_fandom_nhom
  ON public.shop_nhom_fandom (id_nhom);

COMMENT ON TABLE public.shop_nhom_fandom IS
  'Gắn fandom entity (article_bai_viet.loai=fandom) lên loại hàng shop_nhom. Thay facet shop_thuoc_tinh fandom.';

-- ---------------------------------------------------------------------
-- 3. RLS — đọc công khai; ghi chủ loại hàng
-- ---------------------------------------------------------------------
ALTER TABLE public.shop_nhom_fandom ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS shop_nhom_fandom_doc ON public.shop_nhom_fandom;
CREATE POLICY shop_nhom_fandom_doc ON public.shop_nhom_fandom
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS shop_nhom_fandom_owner ON public.shop_nhom_fandom;
CREATE POLICY shop_nhom_fandom_owner ON public.shop_nhom_fandom
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.shop_nhom n
      WHERE n.id = id_nhom
        AND n.id_nguoi_dung = public.current_profile_id()
        AND n.da_xoa = false
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.shop_nhom n
      WHERE n.id = id_nhom
        AND n.id_nguoi_dung = public.current_profile_id()
        AND n.da_xoa = false
    )
  );

-- ---------------------------------------------------------------------
-- 4. Ẩn facet fandom khỏi hub/API (giữ seed + junction lịch sử)
-- ---------------------------------------------------------------------
UPDATE public.shop_thuoc_tinh
SET trang_thai = 'an',
    cap_nhat_luc = now()
WHERE slug = 'fandom'
  AND trang_thai <> 'an';
