-- Báo cáo (report) nội dung — social_bao_cao + 2 enum + RLS.
-- Idempotent. Chạy: node scripts/run-bao-cao-migration.mjs

-- 1. Enums --------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'loai_bao_cao_enum') THEN
    CREATE TYPE public.loai_bao_cao_enum AS ENUM (
      'spam',       -- Spam / quảng cáo
      'phan_cam',   -- Nội dung phản cảm / người lớn
      'quay_roi',   -- Quấy rối / bắt nạt
      'sai_lech',   -- Thông tin sai / lừa đảo
      'ban_quyen',  -- Vi phạm bản quyền
      'mao_danh',   -- Mạo danh
      'khac'        -- Khác
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'trang_thai_bao_cao_enum') THEN
    CREATE TYPE public.trang_thai_bao_cao_enum AS ENUM (
      'moi',         -- Mới gửi, chưa xem
      'dang_xu_ly',  -- Đang xử lý
      'da_xu_ly',    -- Đã xử lý (gỡ / cảnh cáo)
      'bo_qua'       -- Bỏ qua (không vi phạm)
    );
  END IF;
END $$;

-- 2. Bảng ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.social_bao_cao (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nguoi_bao_cao  uuid NOT NULL REFERENCES public.user_nguoi_dung(id) ON DELETE CASCADE,
  -- Nội dung bị báo cáo. v1: 'cot_moc'; mở rộng sau: 'tac_pham'/'org_bai_dang'/'binh_luan'.
  loai_doi_tuong text NOT NULL DEFAULT 'cot_moc',
  id_doi_tuong   uuid NOT NULL,
  id_chu_so_huu  uuid REFERENCES public.user_nguoi_dung(id) ON DELETE SET NULL,
  loai_bao_cao   public.loai_bao_cao_enum NOT NULL,
  tieu_de        text,
  noi_dung       text,
  -- Danh sách bằng chứng: [{ "loai": "url" | "anh", "value": "…" }]
  bang_chung     jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- Kênh xử lý: 'admin' (trang chủ / cá nhân) | 'cong_dong' (owner cộng đồng xử lý).
  kenh           text NOT NULL DEFAULT 'admin',
  id_cong_dong   uuid REFERENCES public.org_to_chuc(id) ON DELETE SET NULL,
  trang_thai     public.trang_thai_bao_cao_enum NOT NULL DEFAULT 'moi',
  ket_qua_xu_ly  text,
  nguoi_xu_ly    uuid REFERENCES public.user_nguoi_dung(id) ON DELETE SET NULL,
  tao_luc        timestamptz NOT NULL DEFAULT now(),
  xu_ly_luc      timestamptz,
  -- Mỗi người chỉ báo cáo 1 nội dung 1 lần (chống spam report).
  CONSTRAINT uq_bao_cao_nguoi_doi_tuong
    UNIQUE (nguoi_bao_cao, loai_doi_tuong, id_doi_tuong)
);

COMMENT ON TABLE public.social_bao_cao IS
  'Báo cáo nội dung — kênh admin (home/cá nhân) hoặc cộng đồng (owner xử lý). Group theo (loai_doi_tuong, id_doi_tuong).';

-- 3. Indexes ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_bao_cao_doi_tuong
  ON public.social_bao_cao (loai_doi_tuong, id_doi_tuong);

CREATE INDEX IF NOT EXISTS idx_bao_cao_kenh_trangthai
  ON public.social_bao_cao (kenh, trang_thai, tao_luc DESC);

CREATE INDEX IF NOT EXISTS idx_bao_cao_nguoi
  ON public.social_bao_cao (nguoi_bao_cao);

CREATE INDEX IF NOT EXISTS idx_bao_cao_cong_dong
  ON public.social_bao_cao (id_cong_dong)
  WHERE kenh = 'cong_dong';

-- 4. RLS ----------------------------------------------------------------
-- Thao tác admin / list group đi qua service role (bypass RLS). RLS chỉ phục vụ
-- client trực tiếp: user tự gửi & xem báo cáo của mình.
ALTER TABLE public.social_bao_cao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bao_cao_insert_self ON public.social_bao_cao;
CREATE POLICY bao_cao_insert_self ON public.social_bao_cao
  FOR INSERT
  WITH CHECK (nguoi_bao_cao = public.current_profile_id());

DROP POLICY IF EXISTS bao_cao_select_self ON public.social_bao_cao;
CREATE POLICY bao_cao_select_self ON public.social_bao_cao
  FOR SELECT
  USING (nguoi_bao_cao = public.current_profile_id());
