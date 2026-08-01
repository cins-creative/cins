-- Cho phép bàn giao mọi nick seeding (không chỉ loai=clone).
-- Idempotent REPLACE function.

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

  SELECT count(*) INTO v_cnt
  FROM public.user_quyen_he_thong
  WHERE id_nguoi_dung = v_dich.id
    AND vai_tro IN ('admin', 'super_admin', 'curator');
  IF v_cnt > 0 THEN RAISE EXCEPTION 'dich_la_admin_curator'; END IF;

  SELECT count(*) INTO v_so_cot_moc
  FROM public.content_cot_moc
  WHERE id_nguoi_dung = v_clone.id;

  INSERT INTO public.auto_ban_giao (
    slug_clone, id_nguoi_dung, email_dich, id_nguoi_dich,
    so_cot_moc, thuc_hien_boi, chi_tiet
  ) VALUES (
    v_tk.slug, v_clone.id, COALESCE(p_email_dich, ''), v_dich.id,
    v_so_cot_moc, p_thuc_hien_boi,
    jsonb_build_object(
      'auto_tai_khoan', to_jsonb(v_tk),
      'clone_slug', v_clone.slug,
      'dich_slug', v_dich.slug,
      'auth_clone', v_auth_clone,
      'auth_dich', v_auth_dich
    )
  );

  DELETE FROM public.user_nguoi_dung WHERE id = v_dich.id;

  UPDATE public.user_nguoi_dung
  SET auth_user_id = v_auth_dich
  WHERE id = v_clone.id;

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
