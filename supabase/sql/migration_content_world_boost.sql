-- L29 — Editorial boost ẩn trên World (Timeline + Gallery).
-- Idempotent. Chạy: node scripts/run-content-world-boost-migration.mjs

CREATE TABLE IF NOT EXISTS public.content_world_boost (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 'cot_moc' | 'org_bai_dang' | 'org_su_kien'
  loai_doi_tuong  text NOT NULL,
  id_doi_tuong    uuid NOT NULL,
  dang_bat        boolean NOT NULL DEFAULT true,
  bat_dau_luc     timestamptz NOT NULL DEFAULT now(),
  het_han_luc     timestamptz NOT NULL,
  gia_han_luc     timestamptz,
  cap_boi         uuid REFERENCES public.user_nguoi_dung(id) ON DELETE SET NULL,
  tat_boi         uuid REFERENCES public.user_nguoi_dung(id) ON DELETE SET NULL,
  tao_luc         timestamptz NOT NULL DEFAULT now(),
  cap_nhat_luc    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_world_boost_doi_tuong UNIQUE (loai_doi_tuong, id_doi_tuong),
  CONSTRAINT chk_world_boost_loai CHECK (
    loai_doi_tuong IN ('cot_moc', 'org_bai_dang', 'org_su_kien')
  )
);

COMMENT ON TABLE public.content_world_boost IS
  'L29 — admin đẩy nội dung lên ưu tiên World Timeline/Gallery (ẩn với viewer). TTL 3 ngày tự gia hạn khi dang_bat.';

CREATE INDEX IF NOT EXISTS idx_world_boost_active_het_han
  ON public.content_world_boost (het_han_luc)
  WHERE dang_bat = true;

CREATE INDEX IF NOT EXISTS idx_world_boost_doi_tuong
  ON public.content_world_boost (loai_doi_tuong, id_doi_tuong);

-- Chỉ service-role / API admin ghi. RLS: không mở cho client thường.
ALTER TABLE public.content_world_boost ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS world_boost_deny_all ON public.content_world_boost;
CREATE POLICY world_boost_deny_all ON public.content_world_boost
  FOR ALL
  USING (false)
  WITH CHECK (false);
