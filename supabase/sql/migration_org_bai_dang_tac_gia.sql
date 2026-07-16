-- Cộng sự trên bài đăng studio (`org_bai_dang`) — song song `content_tac_pham_tac_gia` (user Journey).

CREATE TABLE IF NOT EXISTS public.org_bai_dang_tac_gia (
  id_bai_dang uuid NOT NULL REFERENCES public.org_bai_dang (id) ON DELETE CASCADE,
  id_nguoi_dung uuid NOT NULL REFERENCES public.user_nguoi_dung (id) ON DELETE CASCADE,
  vai_tro text,
  tao_luc timestamptz NOT NULL DEFAULT now(),
  trang_thai text NOT NULL DEFAULT 'pending',
  thu_tu smallint,
  ghi_chu text,
  xu_ly_luc timestamptz,
  che_do_hien_thi_journey text NOT NULL DEFAULT 'public',
  PRIMARY KEY (id_bai_dang, id_nguoi_dung)
);

CREATE INDEX IF NOT EXISTS org_bai_dang_tac_gia_user_idx
  ON public.org_bai_dang_tac_gia (id_nguoi_dung, trang_thai);

COMMENT ON TABLE public.org_bai_dang_tac_gia IS
  'Cộng sự user trên bài org_bai_dang (studio). Org là chủ bài — không có row la_chu_so_huu.';

COMMENT ON COLUMN public.org_bai_dang_tac_gia.che_do_hien_thi_journey IS
  'feature | public | chi_minh — cách bài hiện trên Journey người được gắn.';
