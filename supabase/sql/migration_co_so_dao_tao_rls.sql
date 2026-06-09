-- RLS: đọc công khai cơ sở đào tạo (hub /truong-dai-hoc + trang /co-so/[slug])
-- Phụ thuộc helper từ migration_cong_dong.sql: current_profile_id, is_admin_to_chuc, is_thanh_vien_to_chuc
-- Chạy trên Supabase SQL Editor (idempotent).

-- ── org_to_chuc ─────────────────────────────────────────────────────────────

ALTER TABLE public.org_to_chuc ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS org_to_chuc_select_co_so_public ON public.org_to_chuc;
CREATE POLICY org_to_chuc_select_co_so_public ON public.org_to_chuc
  FOR SELECT
  TO anon, authenticated
  USING (loai_to_chuc = 'co_so_dao_tao'::public.loai_to_chuc_enum);

DROP POLICY IF EXISTS org_to_chuc_update_co_so_admin ON public.org_to_chuc;
CREATE POLICY org_to_chuc_update_co_so_admin ON public.org_to_chuc
  FOR UPDATE
  TO authenticated
  USING (
    loai_to_chuc = 'co_so_dao_tao'::public.loai_to_chuc_enum
    AND is_admin_to_chuc(public.current_profile_id(), id)
  )
  WITH CHECK (
    loai_to_chuc = 'co_so_dao_tao'::public.loai_to_chuc_enum
    AND is_admin_to_chuc(public.current_profile_id(), id)
  );

-- ── org_co_so_dao_tao ───────────────────────────────────────────────────────

ALTER TABLE public.org_co_so_dao_tao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS org_co_so_dao_tao_select_public ON public.org_co_so_dao_tao;
CREATE POLICY org_co_so_dao_tao_select_public ON public.org_co_so_dao_tao
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.org_to_chuc o
      WHERE o.id = org_co_so_dao_tao.id_to_chuc
        AND o.loai_to_chuc = 'co_so_dao_tao'::public.loai_to_chuc_enum
    )
  );

DROP POLICY IF EXISTS org_co_so_dao_tao_update_admin ON public.org_co_so_dao_tao;
CREATE POLICY org_co_so_dao_tao_update_admin ON public.org_co_so_dao_tao
  FOR UPDATE
  TO authenticated
  USING (
    is_admin_to_chuc(public.current_profile_id(), id_to_chuc)
  )
  WITH CHECK (
    is_admin_to_chuc(public.current_profile_id(), id_to_chuc)
  );

-- ── filter_nhan (nhãn Journey org) — bỏ qua nếu bảng chưa có ───────────────

DO $$
BEGIN
  IF to_regclass('public.filter_nhan') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.filter_nhan ENABLE ROW LEVEL SECURITY';

    EXECUTE 'DROP POLICY IF EXISTS filter_nhan_select_org_co_so_public ON public.filter_nhan';
    EXECUTE $p$
      CREATE POLICY filter_nhan_select_org_co_so_public ON public.filter_nhan
        FOR SELECT
        TO anon, authenticated
        USING (
          id_to_chuc IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM public.org_to_chuc o
            WHERE o.id = filter_nhan.id_to_chuc
              AND o.loai_to_chuc = 'co_so_dao_tao'::public.loai_to_chuc_enum
          )
        )
    $p$;

    EXECUTE 'DROP POLICY IF EXISTS filter_nhan_write_org_co_so_admin ON public.filter_nhan';
    EXECUTE $p$
      CREATE POLICY filter_nhan_write_org_co_so_admin ON public.filter_nhan
        FOR ALL
        TO authenticated
        USING (
          id_to_chuc IS NOT NULL
          AND is_admin_to_chuc(public.current_profile_id(), id_to_chuc)
        )
        WITH CHECK (
          id_to_chuc IS NOT NULL
          AND is_admin_to_chuc(public.current_profile_id(), id_to_chuc)
        )
    $p$;
  END IF;
END $$;

COMMENT ON POLICY org_to_chuc_select_co_so_public ON public.org_to_chuc IS
  'Hub trường + trang /co-so — anon đọc org loai co_so_dao_tao';
