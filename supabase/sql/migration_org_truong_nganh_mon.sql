-- Chương trình trường ↔ môn học (entity mon_hoc)
-- Chạy trên Supabase SQL Editor project CINs (ospzzzxcomrmhqrnkoiw) — idempotent.

CREATE TABLE IF NOT EXISTS public.org_truong_nganh_mon (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_truong_nganh uuid NOT NULL REFERENCES public.org_truong_nganh(id) ON DELETE CASCADE,
  id_mon_hoc uuid NOT NULL REFERENCES public.article_bai_viet(id) ON DELETE CASCADE,
  thu_tu integer NOT NULL DEFAULT 0,
  tao_luc timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id_truong_nganh, id_mon_hoc)
);

CREATE INDEX IF NOT EXISTS org_truong_nganh_mon_nganh_thu_tu_idx
  ON public.org_truong_nganh_mon (id_truong_nganh, thu_tu);

COMMENT ON TABLE public.org_truong_nganh_mon IS
  'Môn học (article mon_hoc) thuộc chương trình ngành của trường — filter đồ án + picker gắn org.';

ALTER TABLE public.org_truong_nganh_mon ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS org_truong_nganh_mon_select_public ON public.org_truong_nganh_mon;
CREATE POLICY org_truong_nganh_mon_select_public ON public.org_truong_nganh_mon
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.org_truong_nganh tn
      JOIN public.org_to_chuc o ON o.id = tn.id_to_chuc
      WHERE tn.id = org_truong_nganh_mon.id_truong_nganh
        AND o.loai_to_chuc = 'truong_dai_hoc'::public.loai_to_chuc_enum
    )
  );

DROP POLICY IF EXISTS org_truong_nganh_mon_write_admin ON public.org_truong_nganh_mon;
CREATE POLICY org_truong_nganh_mon_write_admin ON public.org_truong_nganh_mon
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.org_truong_nganh tn
      WHERE tn.id = org_truong_nganh_mon.id_truong_nganh
        AND public.is_admin_to_chuc(public.current_profile_id(), tn.id_to_chuc)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.org_truong_nganh tn
      WHERE tn.id = org_truong_nganh_mon.id_truong_nganh
        AND public.is_admin_to_chuc(public.current_profile_id(), tn.id_to_chuc)
    )
  );
