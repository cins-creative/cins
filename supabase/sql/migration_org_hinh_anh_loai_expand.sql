-- Mở rộng loại ảnh org gallery (tab Hình ảnh trường / cơ sở).
-- Trước: khuon_vien, xuong, trien_lam, khac
-- Thêm: ngoai_khoa, su_kien, hop_tac (+ alias cũ co_so_vat_chat nếu có dữ liệu legacy)

ALTER TABLE public.org_hinh_anh
  DROP CONSTRAINT IF EXISTS org_hinh_anh_loai_check;

ALTER TABLE public.org_hinh_anh
  ADD CONSTRAINT org_hinh_anh_loai_check
  CHECK (
    loai = ANY (
      ARRAY[
        'khuon_vien'::text,
        'co_so_vat_chat'::text,
        'ngoai_khoa'::text,
        'su_kien'::text,
        'hop_tac'::text,
        'xuong'::text,
        'trien_lam'::text,
        'khac'::text
      ]
    )
  );
