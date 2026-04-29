/*
  CINs — RLS + GRANT cho đọc nghề nghiệp (anon key / site Next.js)
  Chạy trong Supabase → SQL Editor (một lần hoặc chỉnh sửa theo schema thật).

  Vai trò Supabase:
  - anon          → khách (NEXT_PUBLIC_SUPABASE_ANON_KEY)
  - authenticated → user đăng nhập Supabase Auth
  - service_role  → bypass RLS (chỉ server, không để lộ ra client)

  "Xem trước" ở đây = đọc dữ liệu published qua API public + có thể mở rộng draft cho editor.
*/

-- ─── Bật RLS ───────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS public.nn_nghe_nghiep ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.nn_bo_phan ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.kn_ky_nang ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.lv_linh_vuc ENABLE ROW LEVEL SECURITY;

-- ─── Xóa policy cùng tên nếu chạy lại (đổi tên nếu bạn đã custom) ─────
DROP POLICY IF EXISTS "Career: đọc bản đã xuất bản (anon + authenticated)"
  ON public.nn_nghe_nghiep;

DROP POLICY IF EXISTS "Kỹ năng: đọc công khai (anon + authenticated)"
  ON public.kn_ky_nang;

DROP POLICY IF EXISTS "Lĩnh vực: đọc công khai (anon + authenticated)"
  ON public.lv_linh_vuc;

DROP POLICY IF EXISTS "Bộ phận nghề: đọc công khai (anon + authenticated)"
  ON public.nn_bo_phan;

-- ─── Policy SELECT ─────────────────────────────────────────────────────

-- Chỉ cho xem nghề đã publish (đúng query app: .eq('trang_thai','published'))
CREATE POLICY "Career: đọc bản đã xuất bản (anon + authenticated)"
  ON public.nn_nghe_nghiep
  FOR SELECT
  TO anon, authenticated
  USING (trang_thai = 'published');

-- Bảng tham chiếu: cho đọc toàn bộ (chỉnh lại nếu có cột ẩn / draft)
CREATE POLICY "Kỹ năng: đọc công khai (anon + authenticated)"
  ON public.kn_ky_nang
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Lĩnh vực: đọc công khai (anon + authenticated)"
  ON public.lv_linh_vuc
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Bộ phận nghề: đọc công khai (anon + authenticated)"
  ON public.nn_bo_phan
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- ─── GRANT (Supabase thường đã có; khai báo rõ để tránh thiếu) ─────────
GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT ON TABLE public.nn_nghe_nghiep TO anon, authenticated;
GRANT SELECT ON TABLE public.kn_ky_nang TO anon, authenticated;
GRANT SELECT ON TABLE public.lv_linh_vuc TO anon, authenticated;
GRANT SELECT ON TABLE public.nn_bo_phan TO anon, authenticated;

/*
  ─── Gợi ý: “xem trước” bản nháp (chỉ staff đã đăng nhập) ────────────────
  Cần thêm cột hoặc bảng phân quyền (vd. profiles.role = 'editor').
  Ví dụ policy bổ sung (comment — bật khi đã có auth + điều kiện thật):

  CREATE POLICY "Career: editor xem mọi trạng thái"
    ON public.nn_nghe_nghiep
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role IN ('admin','editor')
      )
    );

  Hoặc đơn giản hơn (ít an toàn): chỉ user đã login đọc draft:
  USING (auth.role() = 'authenticated' AND trang_thai <> 'published');
*/
