-- Founder Settings — ma trận phân quyền staff theo module (Cài đặt tối cao)
-- Idempotent. Bảng MỚI, không ALTER bảng cũ.
-- Founder tier (owner/admin) không cần row ở đây — luôn full quyền (app-level, xem lib/to-chuc/co-so-quan-ly-access.ts).
-- Vắng row = "an" (ẩn/không có quyền) cho staff còn lại.

CREATE TABLE IF NOT EXISTS public.org_thanh_vien_quyen (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_to_chuc     uuid NOT NULL
                   REFERENCES public.org_to_chuc(id) ON DELETE CASCADE,
  id_nguoi_dung  uuid NOT NULL
                   REFERENCES public.user_nguoi_dung(id) ON DELETE CASCADE,
  module         text NOT NULL CHECK (module IN (
                    'co-so', 'chi-nhanh', 'khoa-lop', 'hoc-vien',
                    'diem-danh', 'hoc-phi-goi', 'hoc-phi-doi-soat'
                  )),
  muc_quyen      text NOT NULL CHECK (muc_quyen IN ('xem', 'sua')),
  cap_nhat_boi   uuid
                   REFERENCES public.user_nguoi_dung(id) ON DELETE SET NULL,
  cap_nhat_luc   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_org_thanh_vien_quyen UNIQUE (id_to_chuc, id_nguoi_dung, module)
);

COMMENT ON TABLE public.org_thanh_vien_quyen IS
  'Founder Settings — quyền xem/sửa theo module cho staff dưới founder tier (owner/admin luôn full, không cần row).';

CREATE INDEX IF NOT EXISTS idx_org_thanh_vien_quyen_lookup
  ON public.org_thanh_vien_quyen (id_to_chuc, id_nguoi_dung);

-- ── RLS: chỉ service-role (API `/api/co-so/[id]/cai-dat/quyen`) đọc/ghi ────
ALTER TABLE public.org_thanh_vien_quyen ENABLE ROW LEVEL SECURITY;
-- Không tạo policy cho authenticated — mọi truy cập qua service role trong route handler,
-- gate app-level bằng isCoSoFounderTier (xem lib/to-chuc/co-so-quan-ly-access.ts).
