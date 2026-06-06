-- Cộng đồng v6 — content_thao_luan + media junction + RLS.
-- Chạy trên Supabase SQL Editor (idempotent). Canonical file theo brief.

CREATE TABLE IF NOT EXISTS public.content_thao_luan (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nguoi_dang   uuid NOT NULL REFERENCES public.user_nguoi_dung(id) ON DELETE CASCADE,
  loai_context text NOT NULL DEFAULT 'cong_dong',
  id_context   uuid NOT NULL,
  tieu_de      text,
  noi_dung     text NOT NULL,
  loai_post    text NOT NULL DEFAULT 'thao_luan',
  ghim         boolean NOT NULL DEFAULT false,
  da_xoa       boolean NOT NULL DEFAULT false,
  tao_luc      timestamptz NOT NULL DEFAULT now(),
  cap_nhat_luc timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_thao_luan_context
  ON public.content_thao_luan (loai_context, id_context, tao_luc DESC)
  WHERE da_xoa = false;

CREATE INDEX IF NOT EXISTS idx_thao_luan_nguoi_dang
  ON public.content_thao_luan (nguoi_dang);

CREATE TABLE IF NOT EXISTS public.content_thao_luan_media (
  id_thao_luan uuid NOT NULL REFERENCES public.content_thao_luan(id) ON DELETE CASCADE,
  id_media     uuid NOT NULL REFERENCES public.content_media(id) ON DELETE CASCADE,
  thu_tu       smallint NOT NULL DEFAULT 0,
  PRIMARY KEY (id_thao_luan, id_media)
);

COMMENT ON TABLE public.content_thao_luan IS
  'Discussion layer đa context — v1: cong_dong (FB-style group posts)';

ALTER TABLE public.org_to_chuc
  ADD COLUMN IF NOT EXISTS cau_hinh jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id
  FROM public.user_nguoi_dung u
  WHERE u.auth_user_id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_thanh_vien_to_chuc(p_user uuid, p_org uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_thanh_vien_to_chuc m
    WHERE m.id_nguoi_dung = p_user
      AND m.id_to_chuc = p_org
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_to_chuc(p_user uuid, p_org uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_thanh_vien_to_chuc m
    WHERE m.id_nguoi_dung = p_user
      AND m.id_to_chuc = p_org
      AND m.vai_tro IN ('owner', 'admin', 'quan_ly_noi_dung')
  );
$$;

CREATE OR REPLACE FUNCTION public.cong_dong_cong_khai(p_org uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT (o.cau_hinh ->> 'che_do') IS DISTINCT FROM 'rieng_tu'
      FROM public.org_to_chuc o
      WHERE o.id = p_org
        AND o.loai_to_chuc = 'cong_dong'
    ),
    true
  );
$$;

ALTER TABLE public.content_thao_luan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_thao_luan_media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS thao_luan_select ON public.content_thao_luan;
CREATE POLICY thao_luan_select ON public.content_thao_luan
  FOR SELECT
  USING (
    da_xoa = false
    AND (
      loai_context <> 'cong_dong'
      OR cong_dong_cong_khai(id_context)
      OR is_thanh_vien_to_chuc(current_profile_id(), id_context)
    )
  );

DROP POLICY IF EXISTS thao_luan_insert ON public.content_thao_luan;
CREATE POLICY thao_luan_insert ON public.content_thao_luan
  FOR INSERT
  WITH CHECK (
    nguoi_dang = current_profile_id()
    AND (
      loai_context <> 'cong_dong'
      OR is_thanh_vien_to_chuc(current_profile_id(), id_context)
    )
  );

DROP POLICY IF EXISTS thao_luan_update ON public.content_thao_luan;
CREATE POLICY thao_luan_update ON public.content_thao_luan
  FOR UPDATE
  USING (
    nguoi_dang = current_profile_id()
    OR (
      loai_context = 'cong_dong'
      AND is_admin_to_chuc(current_profile_id(), id_context)
    )
  )
  WITH CHECK (
    nguoi_dang = current_profile_id()
    OR (
      loai_context = 'cong_dong'
      AND is_admin_to_chuc(current_profile_id(), id_context)
    )
  );

DROP POLICY IF EXISTS thao_luan_media_select ON public.content_thao_luan_media;
CREATE POLICY thao_luan_media_select ON public.content_thao_luan_media
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.content_thao_luan t
      WHERE t.id = id_thao_luan
        AND t.da_xoa = false
        AND (
          t.loai_context <> 'cong_dong'
          OR cong_dong_cong_khai(t.id_context)
          OR is_thanh_vien_to_chuc(current_profile_id(), t.id_context)
        )
    )
  );

DROP POLICY IF EXISTS thao_luan_media_insert ON public.content_thao_luan_media;
CREATE POLICY thao_luan_media_insert ON public.content_thao_luan_media
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.content_thao_luan t
      WHERE t.id = id_thao_luan
        AND t.nguoi_dang = current_profile_id()
    )
  );

-- social_* dùng enum loai_doi_tuong_social_enum — thêm giá trị thao_luan.
ALTER TYPE public.loai_doi_tuong_social_enum ADD VALUE IF NOT EXISTS 'thao_luan';

-- Kiểm tra loai_doi_tuong (chạy sau ALTER ở trên).
SELECT table_name, column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'loai_doi_tuong'
  AND table_name IN ('social_reaction', 'social_binh_luan', 'social_thong_bao')
ORDER BY table_name;
