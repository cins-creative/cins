-- L33: trừ kho atomic cho mua_ngay (tránh oversell khi nhiều buyer cùng lúc).
-- Đặt trước vẫn trừ lúc seller xác nhận — dùng chung hàm này.

CREATE OR REPLACE FUNCTION public.shop_tru_kho_bien_the(
  p_id_bien_the uuid,
  p_so_luong integer
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_id_bien_the IS NULL OR p_so_luong IS NULL OR p_so_luong <= 0 THEN
    RETURN false;
  END IF;

  UPDATE public.shop_bien_the
  SET
    so_luong_ton = so_luong_ton - p_so_luong,
    cap_nhat_luc = now()
  WHERE id = p_id_bien_the
    AND da_xoa = false
    AND so_luong_ton >= p_so_luong;

  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.shop_hoan_kho_bien_the(
  p_id_bien_the uuid,
  p_so_luong integer
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_id_bien_the IS NULL OR p_so_luong IS NULL OR p_so_luong <= 0 THEN
    RETURN false;
  END IF;

  UPDATE public.shop_bien_the
  SET
    so_luong_ton = so_luong_ton + p_so_luong,
    cap_nhat_luc = now()
  WHERE id = p_id_bien_the
    AND da_xoa = false;

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.shop_tru_kho_bien_the(uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.shop_hoan_kho_bien_the(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.shop_tru_kho_bien_the(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.shop_hoan_kho_bien_the(uuid, integer) TO service_role;

COMMENT ON FUNCTION public.shop_tru_kho_bien_the(uuid, integer) IS
  'Trừ tồn biến thể atomic; false nếu không đủ hàng.';
COMMENT ON FUNCTION public.shop_hoan_kho_bien_the(uuid, integer) IS
  'Hoàn tồn biến thể (rollback khi tạo đơn mua_ngay lỗi giữa chừng).';
