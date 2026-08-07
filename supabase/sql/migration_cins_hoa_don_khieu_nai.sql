-- Khiếu nại đối soát hoá đơn hợp nhất (PLAN_thanh_toan_hub_theo_dich_vu.md §5)
-- Bảng mới: cins_hoa_don_khieu_nai (shop + CSĐT + ads). Không ALTER bảng live.
-- Target: CINS ospzzzxcomrmhqrnkoiw
-- Chạy: npm run migrate:cins-hoa-don-khieu-nai
-- Idempotent.

CREATE TABLE IF NOT EXISTS public.cins_hoa_don_khieu_nai (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_tk           uuid NOT NULL
                    REFERENCES public.cins_tk_thanh_toan(id) ON DELETE CASCADE,
  id_hoa_don      uuid
                    REFERENCES public.cins_hoa_don(id) ON DELETE SET NULL,
  id_dich_vu      uuid
                    REFERENCES public.cins_dich_vu(id) ON DELETE SET NULL,
  loai            text NOT NULL DEFAULT 'khong_ghi_nhan'
                    CHECK (loai IN (
                      'khong_ghi_nhan', 'sai_so_tien', 'trung_lap', 'khac'
                    )),
  noi_dung        text NOT NULL,
  ma_giao_dich    text,
  so_tien_khai    bigint
                    CHECK (so_tien_khai IS NULL OR so_tien_khai >= 0),
  ck_luc          timestamptz,
  anh_ids         text[] NOT NULL DEFAULT '{}',
  trang_thai      text NOT NULL DEFAULT 'mo'
                    CHECK (trang_thai IN (
                      'mo', 'dang_xu_ly', 'da_xu_ly', 'tu_choi'
                    )),
  phan_hoi_admin  text,
  nguoi_tao       uuid NOT NULL
                    REFERENCES public.user_nguoi_dung(id) ON DELETE CASCADE,
  xu_ly_boi       uuid
                    REFERENCES public.user_nguoi_dung(id) ON DELETE SET NULL,
  tao_luc         timestamptz NOT NULL DEFAULT now(),
  cap_nhat_luc    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cins_hoa_don_khieu_nai_anh_chk
    CHECK (cardinality(anh_ids) >= 1 AND cardinality(anh_ids) <= 3)
);

COMMENT ON TABLE public.cins_hoa_don_khieu_nai IS
  'Khiếu nại đối soát phí nền tảng (hub). Bắt buộc 1–3 ảnh Cloudflare. org_phi_khieu_nai giữ nguyên lịch sử CSĐT.';

CREATE INDEX IF NOT EXISTS idx_cins_hd_kn_tk_tt
  ON public.cins_hoa_don_khieu_nai (id_tk, trang_thai, tao_luc DESC);

CREATE INDEX IF NOT EXISTS idx_cins_hd_kn_mo
  ON public.cins_hoa_don_khieu_nai (trang_thai, tao_luc DESC)
  WHERE trang_thai IN ('mo', 'dang_xu_ly');

CREATE INDEX IF NOT EXISTS idx_cins_hd_kn_hoa_don
  ON public.cins_hoa_don_khieu_nai (id_hoa_don)
  WHERE id_hoa_don IS NOT NULL;

/* Tối đa 1 khiếu nại đang mở / hoá đơn */
CREATE UNIQUE INDEX IF NOT EXISTS uq_cins_hd_kn_mo_hoa_don
  ON public.cins_hoa_don_khieu_nai (id_hoa_don)
  WHERE id_hoa_don IS NOT NULL AND trang_thai IN ('mo', 'dang_xu_ly');

ALTER TABLE public.cins_hoa_don_khieu_nai ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cins_hoa_don_khieu_nai_select ON public.cins_hoa_don_khieu_nai;
CREATE POLICY cins_hoa_don_khieu_nai_select ON public.cins_hoa_don_khieu_nai
  FOR SELECT TO authenticated
  USING (public.can_doc_cins_tk(id_tk));

GRANT SELECT ON TABLE public.cins_hoa_don_khieu_nai TO authenticated;
GRANT ALL ON TABLE public.cins_hoa_don_khieu_nai TO service_role;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.cins_hoa_don_khieu_nai FROM authenticated;
REVOKE ALL ON TABLE public.cins_hoa_don_khieu_nai FROM anon;
