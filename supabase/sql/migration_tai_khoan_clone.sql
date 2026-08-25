-- Tài khoản clone artist + KPI seeding + bàn giao auth_user_id.
-- ALTER additive trên auto_tai_khoan / auto_han_muc + bảng mới + RPC.
-- Idempotent. Chạy: npm run migrate:tai-khoan-clone
-- Plan: docs/PLAN_tai_khoan_clone.md · DECISIONS 2026-08-01

-- ── 1. auto_tai_khoan — cột clone / KPI / vault / bàn giao ───────────

ALTER TABLE public.auto_tai_khoan
  ADD COLUMN IF NOT EXISTS loai text NOT NULL DEFAULT 'ai';

ALTER TABLE public.auto_tai_khoan
  ADD COLUMN IF NOT EXISTS ten_that text;

ALTER TABLE public.auto_tai_khoan
  ADD COLUMN IF NOT EXISTS lien_ket_nguon text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.auto_tai_khoan
  ADD COLUMN IF NOT EXISTS lien_he text;

ALTER TABLE public.auto_tai_khoan
  ADD COLUMN IF NOT EXISTS trang_thai_xin_phep text NOT NULL DEFAULT 'chua_lien_he';

ALTER TABLE public.auto_tai_khoan
  ADD COLUMN IF NOT EXISTS bang_chung_dong_y text;

ALTER TABLE public.auto_tai_khoan
  ADD COLUMN IF NOT EXISTS kpi_ngay integer;

ALTER TABLE public.auto_tai_khoan
  ADD COLUMN IF NOT EXISTS tam_dung boolean NOT NULL DEFAULT false;

ALTER TABLE public.auto_tai_khoan
  ADD COLUMN IF NOT EXISTS trang_thai_ban_giao text NOT NULL DEFAULT 'dang_van_hanh';

ALTER TABLE public.auto_tai_khoan
  ADD COLUMN IF NOT EXISTS id_nguoi_dung_dich uuid
    REFERENCES public.user_nguoi_dung(id) ON DELETE SET NULL;

ALTER TABLE public.auto_tai_khoan
  ADD COLUMN IF NOT EXISTS mat_khau_ma_hoa text;

ALTER TABLE public.auto_tai_khoan
  ADD COLUMN IF NOT EXISTS mat_khau_doi_luc timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'auto_tai_khoan_loai_chk'
  ) THEN
    ALTER TABLE public.auto_tai_khoan
      ADD CONSTRAINT auto_tai_khoan_loai_chk
      CHECK (loai IN ('ai', 'clone'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'auto_tai_khoan_xin_phep_chk'
  ) THEN
    ALTER TABLE public.auto_tai_khoan
      ADD CONSTRAINT auto_tai_khoan_xin_phep_chk
      CHECK (trang_thai_xin_phep IN (
        'chua_lien_he', 'dang_cho', 'dong_y', 'tu_choi'
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'auto_tai_khoan_ban_giao_chk'
  ) THEN
    ALTER TABLE public.auto_tai_khoan
      ADD CONSTRAINT auto_tai_khoan_ban_giao_chk
      CHECK (trang_thai_ban_giao IN (
        'dang_van_hanh', 'cho_ban_giao', 'da_ban_giao'
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'auto_tai_khoan_kpi_ngay_chk'
  ) THEN
    ALTER TABLE public.auto_tai_khoan
      ADD CONSTRAINT auto_tai_khoan_kpi_ngay_chk
      CHECK (kpi_ngay IS NULL OR (kpi_ngay >= 0 AND kpi_ngay <= 50));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_auto_tai_khoan_loai_tam_dung
  ON public.auto_tai_khoan (loai, tam_dung);

COMMENT ON COLUMN public.auto_tai_khoan.loai IS
  'ai = nick Autopilot; clone = mirror artist thật (xin phép, up tay, bàn giao).';
COMMENT ON COLUMN public.auto_tai_khoan.lien_ket_nguon IS
  'URL portfolio nội bộ (FB/Behance/Vimeo/web…) — curator check nhanh.';
COMMENT ON COLUMN public.auto_tai_khoan.mat_khau_ma_hoa IS
  'Vault AES-256-GCM (app-layer). Format iv:tag:ciphertext base64. Không plaintext.';

-- ── 2. auto_han_muc — KPI vận hành (tách khỏi han_muc autopilot) ─────

ALTER TABLE public.auto_han_muc
  ADD COLUMN IF NOT EXISTS kpi_muc_tieu integer;

ALTER TABLE public.auto_han_muc
  ADD COLUMN IF NOT EXISTS kpi_phan_bo_luc timestamptz;

COMMENT ON COLUMN public.auto_han_muc.kpi_muc_tieu IS
  'Số bài KPI phân bổ hôm nay. NULL=chưa phân bổ; 0=hôm nay nghỉ. Độc lập han_muc.';
COMMENT ON COLUMN public.auto_han_muc.kpi_phan_bo_luc IS
  'Freeze phân bổ KPI — đã set thì không tính lại khi refresh.';

-- ── 3. auto_ban_giao — audit bàn giao (sống sau khi xóa auto_tai_khoan) ─

CREATE TABLE IF NOT EXISTS public.auto_ban_giao (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug_clone        text NOT NULL,
  id_nguoi_dung     uuid,
  email_dich        text,
  id_nguoi_dich     uuid,
  so_cot_moc        integer NOT NULL DEFAULT 0,
  thuc_hien_boi     uuid REFERENCES public.user_nguoi_dung(id) ON DELETE SET NULL,
  chi_tiet          jsonb NOT NULL DEFAULT '{}'::jsonb,
  tao_luc           timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.auto_ban_giao IS
  'Audit bàn giao tài khoản clone → user thật (đổi auth_user_id). Không hoàn tác.';

CREATE INDEX IF NOT EXISTS idx_auto_ban_giao_tao
  ON public.auto_ban_giao (tao_luc DESC);

-- ── 4. auto_nhat_ky_mat_khau — audit xem / đặt lại mật khẩu ──────────

CREATE TABLE IF NOT EXISTS public.auto_nhat_ky_mat_khau (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_tai_khoan    uuid NOT NULL REFERENCES public.auto_tai_khoan(id) ON DELETE CASCADE,
  hanh_dong       text NOT NULL
                    CHECK (hanh_dong IN ('xem', 'dat_lai', 'tao_moi')),
  thuc_hien_boi   uuid REFERENCES public.user_nguoi_dung(id) ON DELETE SET NULL,
  tao_luc         timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.auto_nhat_ky_mat_khau IS
  'Audit metadata vault mật khẩu seeding (không lưu giá trị mật khẩu).';

CREATE INDEX IF NOT EXISTS idx_auto_nhat_ky_mk_tk
  ON public.auto_nhat_ky_mat_khau (id_tai_khoan, tao_luc DESC);

-- ── 5. auto_kpi_cau_hinh — singleton mục tiêu ngày ───────────────────

CREATE TABLE IF NOT EXISTS public.auto_kpi_cau_hinh (
  id              smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  muc_tieu_ngay   integer NOT NULL DEFAULT 20
                    CHECK (muc_tieu_ngay >= 0 AND muc_tieu_ngay <= 500),
  bai_moi_luot    integer NOT NULL DEFAULT 1
                    CHECK (bai_moi_luot >= 1 AND bai_moi_luot <= 20),
  ap_dung_loai    text[] NOT NULL DEFAULT '{ai,clone}',
  cap_nhat_boi    uuid REFERENCES public.user_nguoi_dung(id) ON DELETE SET NULL,
  cap_nhat_luc    timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.auto_kpi_cau_hinh (id, muc_tieu_ngay, bai_moi_luot, ap_dung_loai)
VALUES (1, 20, 1, '{ai,clone}')
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE public.auto_kpi_cau_hinh IS
  'Singleton KPI seeding: mục tiêu bài/ngày toàn roster (ai + clone).';

-- ── 6. RLS bảng mới ──────────────────────────────────────────────────

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'auto_ban_giao',
    'auto_nhat_ky_mat_khau',
    'auto_kpi_cau_hinh'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated', t);
    EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role', t);
  END LOOP;
END $$;

-- ── 7. RPC bàn giao (đổi auth_user_id) ───────────────────────────────
-- Caller: service_role only. Trả auth_user_id cũ của clone để JS deleteUser.

CREATE OR REPLACE FUNCTION public.ban_giao_tai_khoan_clone(
  p_id_tai_khoan uuid,
  p_thuc_hien_boi uuid,
  p_email_dich text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tk              public.auto_tai_khoan%ROWTYPE;
  v_clone           public.user_nguoi_dung%ROWTYPE;
  v_dich            public.user_nguoi_dung%ROWTYPE;
  v_auth_clone      uuid;
  v_auth_dich       uuid;
  v_so_cot_moc      integer := 0;
  v_cnt             integer;
BEGIN
  SELECT * INTO v_tk
  FROM public.auto_tai_khoan
  WHERE id = p_id_tai_khoan
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'tai_khoan_khong_tim_thay';
  END IF;

  IF v_tk.loai IS DISTINCT FROM 'clone' THEN
    RAISE EXCEPTION 'chi_ban_giao_clone';
  END IF;

  IF v_tk.trang_thai_ban_giao IS DISTINCT FROM 'cho_ban_giao' THEN
    RAISE EXCEPTION 'chua_gan_dich';
  END IF;

  IF v_tk.id_nguoi_dung IS NULL OR v_tk.id_nguoi_dung_dich IS NULL THEN
    RAISE EXCEPTION 'thieu_profile';
  END IF;

  IF v_tk.id_nguoi_dung = v_tk.id_nguoi_dung_dich THEN
    RAISE EXCEPTION 'dich_trung_clone';
  END IF;

  SELECT * INTO v_clone
  FROM public.user_nguoi_dung
  WHERE id = v_tk.id_nguoi_dung
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'clone_profile_khong_tim_thay';
  END IF;

  SELECT * INTO v_dich
  FROM public.user_nguoi_dung
  WHERE id = v_tk.id_nguoi_dung_dich
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'dich_profile_khong_tim_thay';
  END IF;

  v_auth_clone := v_clone.auth_user_id;
  v_auth_dich := v_dich.auth_user_id;

  IF v_auth_dich IS NULL THEN
    RAISE EXCEPTION 'dich_thieu_auth';
  END IF;

  -- TOCTOU: đích phải trống
  SELECT count(*) INTO v_cnt FROM public.content_cot_moc WHERE id_nguoi_dung = v_dich.id;
  IF v_cnt > 0 THEN RAISE EXCEPTION 'dich_co_content_cot_moc:%', v_cnt; END IF;

  SELECT count(*) INTO v_cnt FROM public.content_tac_pham WHERE id_nguoi_dung = v_dich.id;
  IF v_cnt > 0 THEN RAISE EXCEPTION 'dich_co_content_tac_pham:%', v_cnt; END IF;

  SELECT count(*) INTO v_cnt FROM public.shop_cua_hang WHERE id_nguoi_dung = v_dich.id;
  IF v_cnt > 0 THEN RAISE EXCEPTION 'dich_co_shop'; END IF;

  SELECT count(*) INTO v_cnt FROM public.user_thanh_vien_to_chuc WHERE id_nguoi_dung = v_dich.id;
  IF v_cnt > 0 THEN RAISE EXCEPTION 'dich_co_thanh_vien_to_chuc'; END IF;

  SELECT count(*) INTO v_cnt FROM public.org_to_chuc WHERE nguoi_tao = v_dich.id;
  IF v_cnt > 0 THEN RAISE EXCEPTION 'dich_la_nguoi_tao_org'; END IF;

  -- Enum vai_tro_he_thong_enum chỉ có admin/curator (super_admin = email app, không lưu DB).
  SELECT count(*) INTO v_cnt
  FROM public.user_quyen_he_thong
  WHERE id_nguoi_dung = v_dich.id;
  IF v_cnt > 0 THEN RAISE EXCEPTION 'dich_la_admin_curator'; END IF;

  IF lower(trim(COALESCE(p_email_dich, ''))) = 'info.cins.vn@gmail.com' THEN
    RAISE EXCEPTION 'dich_la_admin_curator';
  END IF;

  SELECT count(*) INTO v_so_cot_moc
  FROM public.content_cot_moc
  WHERE id_nguoi_dung = v_clone.id;

  INSERT INTO public.auto_ban_giao (
    slug_clone,
    id_nguoi_dung,
    email_dich,
    id_nguoi_dich,
    so_cot_moc,
    thuc_hien_boi,
    chi_tiet
  ) VALUES (
    v_tk.slug,
    v_clone.id,
    COALESCE(p_email_dich, ''),
    v_dich.id,
    v_so_cot_moc,
    p_thuc_hien_boi,
    jsonb_build_object(
      'auto_tai_khoan', to_jsonb(v_tk),
      'clone_slug', v_clone.slug,
      'dich_slug', v_dich.slug,
      'auth_clone', v_auth_clone,
      'auth_dich', v_auth_dich
    )
  );

  -- Giải phóng auth link + slug của profile đích trống
  DELETE FROM public.user_nguoi_dung WHERE id = v_dich.id;

  -- Gắn auth của artist vào profile clone (giữ slug + nội dung)
  UPDATE public.user_nguoi_dung
  SET auth_user_id = v_auth_dich
  WHERE id = v_clone.id;

  -- Biến mất khỏi roster
  DELETE FROM public.auto_tai_khoan WHERE id = v_tk.id;

  RETURN jsonb_build_object(
    'ok', true,
    'slug', v_tk.slug,
    'idNguoiDung', v_clone.id,
    'soCotMoc', v_so_cot_moc,
    'authCloneCu', v_auth_clone,
    'authDich', v_auth_dich
  );
END;
$$;

REVOKE ALL ON FUNCTION public.ban_giao_tai_khoan_clone(uuid, uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ban_giao_tai_khoan_clone(uuid, uuid, text)
  TO service_role;

COMMENT ON FUNCTION public.ban_giao_tai_khoan_clone(uuid, uuid, text) IS
  'Bàn giao clone: đổi auth_user_id, xóa profile đích trống + row auto_tai_khoan. Không hoàn tác.';
