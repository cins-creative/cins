-- Trang chủ adaptive — module `co_hoi` (tuyển dụng) + `scout_tai_nang`.
-- Demand-side / B2B (brief §8). Idempotent — chạy trên Supabase SQL Editor.
-- ⚠️ ĐỀ XUẤT: chốt với Tú trước khi chạy; sau khi chạy → cập nhật CINS_SCHEMA.md.

-- ── Enums ──────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE public.loai_hinh_lam_viec_enum AS ENUM (
    'toan_thoi_gian', 'ban_thoi_gian', 'remote', 'freelance', 'thuc_tap'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.trang_thai_tuyen_dung_enum AS ENUM (
    'nhap', 'dang_mo', 'da_dong'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.trang_thai_ung_tuyen_enum AS ENUM (
    'moi', 'dang_xem', 'phu_hop', 'tu_choi', 'da_nhan'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── org_tuyen_dung: tin tuyển dụng do org đăng ───────────────────
CREATE TABLE IF NOT EXISTS public.org_tuyen_dung (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_to_chuc    uuid NOT NULL REFERENCES public.org_to_chuc(id) ON DELETE CASCADE,
  tieu_de       text NOT NULL,
  mo_ta         text,
  loai_hinh     public.loai_hinh_lam_viec_enum NOT NULL DEFAULT 'toan_thoi_gian',
  cap_do        text,                       -- junior/mid/senior/lead (tự do, về công việc không phải người)
  tinh_thanh    public.tinh_thanh_vn_enum,  -- địa điểm; null + lam_tu_xa=true = remote
  lam_tu_xa     boolean NOT NULL DEFAULT false,
  id_linh_vuc   uuid REFERENCES public.linh_vuc(id) ON DELETE SET NULL, -- để match user
  muc_luong_tu  integer,
  muc_luong_den integer,
  hien_thi_luong boolean NOT NULL DEFAULT false,
  han_nop       date,
  trang_thai    public.trang_thai_tuyen_dung_enum NOT NULL DEFAULT 'dang_mo',
  da_xoa        boolean NOT NULL DEFAULT false,
  tao_luc       timestamptz NOT NULL DEFAULT now(),
  cap_nhat_luc  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tuyen_dung_mo
  ON public.org_tuyen_dung (trang_thai, tao_luc DESC)
  WHERE da_xoa = false AND trang_thai = 'dang_mo';

CREATE INDEX IF NOT EXISTS idx_tuyen_dung_org
  ON public.org_tuyen_dung (id_to_chuc)
  WHERE da_xoa = false;

CREATE INDEX IF NOT EXISTS idx_tuyen_dung_linh_vuc
  ON public.org_tuyen_dung (id_linh_vuc)
  WHERE da_xoa = false AND trang_thai = 'dang_mo';

COMMENT ON TABLE public.org_tuyen_dung IS
  'Tin tuyển dụng do org đăng — feed module co_hoi trang chủ (cụm LÀM).';

-- ── org_tuyen_dung_ung_tuyen: ứng tuyển của user ─────────────────
CREATE TABLE IF NOT EXISTS public.org_tuyen_dung_ung_tuyen (
  id_tuyen_dung uuid NOT NULL REFERENCES public.org_tuyen_dung(id) ON DELETE CASCADE,
  id_nguoi_dung uuid NOT NULL REFERENCES public.user_nguoi_dung(id) ON DELETE CASCADE,
  thu_ngo       text,
  trang_thai    public.trang_thai_ung_tuyen_enum NOT NULL DEFAULT 'moi',
  tao_luc       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id_tuyen_dung, id_nguoi_dung)
);

CREATE INDEX IF NOT EXISTS idx_ung_tuyen_nguoi
  ON public.org_tuyen_dung_ung_tuyen (id_nguoi_dung, tao_luc DESC);

COMMENT ON TABLE public.org_tuyen_dung_ung_tuyen IS
  'Ứng tuyển của user vào 1 tin org_tuyen_dung.';

-- ── org_scout_luu: org/giảng viên lưu tài năng vào shortlist ─────
-- Module scout_tai_nang (cụm DẠY). Gợi ý tài năng = query verified journey
-- theo lĩnh vực (không cần bảng); bảng này lưu danh sách quan tâm.
CREATE TABLE IF NOT EXISTS public.org_scout_luu (
  id_to_chuc    uuid NOT NULL REFERENCES public.org_to_chuc(id) ON DELETE CASCADE,
  id_nguoi_dung uuid NOT NULL REFERENCES public.user_nguoi_dung(id) ON DELETE CASCADE,
  ghi_chu       text,
  tao_luc       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id_to_chuc, id_nguoi_dung)
);

CREATE INDEX IF NOT EXISTS idx_scout_org
  ON public.org_scout_luu (id_to_chuc, tao_luc DESC);

COMMENT ON TABLE public.org_scout_luu IS
  'Shortlist tài năng org/giảng viên quan tâm — module scout_tai_nang.';

-- ── RLS ──────────────────────────────────────────────────────────
ALTER TABLE public.org_tuyen_dung ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_tuyen_dung_ung_tuyen ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_scout_luu ENABLE ROW LEVEL SECURITY;

-- Tin đang mở: ai cũng đọc.
DROP POLICY IF EXISTS tuyen_dung_doc_cong_khai ON public.org_tuyen_dung;
CREATE POLICY tuyen_dung_doc_cong_khai ON public.org_tuyen_dung
  FOR SELECT USING (da_xoa = false AND trang_thai = 'dang_mo');

-- Admin org quản lý tin của org mình (dùng helper is_admin_to_chuc).
DROP POLICY IF EXISTS tuyen_dung_admin_org ON public.org_tuyen_dung;
CREATE POLICY tuyen_dung_admin_org ON public.org_tuyen_dung
  FOR ALL USING (public.is_admin_to_chuc(public.current_profile_id(), id_to_chuc))
  WITH CHECK (public.is_admin_to_chuc(public.current_profile_id(), id_to_chuc));

-- Ứng tuyển: user xem/sửa của chính mình; admin org xem tin của org.
DROP POLICY IF EXISTS ung_tuyen_chu_so_huu ON public.org_tuyen_dung_ung_tuyen;
CREATE POLICY ung_tuyen_chu_so_huu ON public.org_tuyen_dung_ung_tuyen
  FOR ALL USING (id_nguoi_dung = public.current_profile_id())
  WITH CHECK (id_nguoi_dung = public.current_profile_id());

DROP POLICY IF EXISTS ung_tuyen_admin_org ON public.org_tuyen_dung_ung_tuyen;
CREATE POLICY ung_tuyen_admin_org ON public.org_tuyen_dung_ung_tuyen
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.org_tuyen_dung t
      WHERE t.id = id_tuyen_dung
        AND public.is_admin_to_chuc(public.current_profile_id(), t.id_to_chuc)
    )
  );

-- Scout shortlist: chỉ admin org đó.
DROP POLICY IF EXISTS scout_admin_org ON public.org_scout_luu;
CREATE POLICY scout_admin_org ON public.org_scout_luu
  FOR ALL USING (public.is_admin_to_chuc(public.current_profile_id(), id_to_chuc))
  WITH CHECK (public.is_admin_to_chuc(public.current_profile_id(), id_to_chuc));
