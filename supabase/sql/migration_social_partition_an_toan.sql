-- =====================================================================
-- migration_social_partition_an_toan.sql
-- P0-a PLAN_analytics_scale: DEFAULT partition + tạo trước N tháng.
--
-- Sự thật DB (2026-08-13):
--   • social_luot_xem RANGE (tao_luc)
--   • Bound hiện có = UTC midnight ('YYYY-MM-01 00:00:00+00')
--   • Chưa có DEFAULT → INSERT fail cứng nếu cron quên tạo tháng mới
--
-- Giữ bound UTC (không đổi sang VN) để khớp partition đã attach.
-- An toàn chạy lại nhiều lần (idempotent).
-- =====================================================================

-- 1) DEFAULT partition: hứng row rơi ngoài khoảng đã khai báo.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_inherits i
    JOIN pg_class c ON c.oid = i.inhrelid
    WHERE i.inhparent = 'public.social_luot_xem'::regclass
      AND pg_get_expr(c.relpartbound, c.oid) = 'DEFAULT'
  ) THEN
    EXECUTE 'CREATE TABLE public.social_luot_xem_default
             PARTITION OF public.social_luot_xem DEFAULT';
  END IF;
END $$;

-- 2) Tạo trước N tháng (mặc định 3) + tháng trước (event đến muộn).
--    Bound = date literal → timestamptz UTC midnight, khớp partition sẵn có.
CREATE OR REPLACE FUNCTION public.social_ensure_partition(
  p_so_thang integer DEFAULT 3
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parent regclass;
  v_i integer;
  v_tu date;
  v_den date;
  v_ten text;
  v_ket text := '';
  v_toi integer;
BEGIN
  SELECT c.oid::regclass INTO v_parent
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'social_luot_xem'
    AND c.relkind = 'p';

  IF v_parent IS NULL THEN
    RETURN 'khong-phai-partition';
  END IF;

  v_toi := greatest(coalesce(p_so_thang, 3), 1);

  -- i = -1 (tháng trước) … +N (tháng sau).
  FOR v_i IN -1..v_toi LOOP
    v_tu := (
      date_trunc('month', timezone('UTC', now()))
      + make_interval(months => v_i)
    )::date;
    v_den := (v_tu + interval '1 month')::date;
    v_ten := format('social_luot_xem_%s', to_char(v_tu, 'YYYY_MM'));

    IF to_regclass('public.' || v_ten) IS NULL THEN
      BEGIN
        EXECUTE format(
          'CREATE TABLE public.%I PARTITION OF public.social_luot_xem
           FOR VALUES FROM (%L) TO (%L)',
          v_ten, v_tu, v_den
        );
        v_ket := v_ket || v_ten || ' ';
      EXCEPTION WHEN OTHERS THEN
        -- Thường gặp: DEFAULT đã chứa row thuộc khoảng này → cần di trú
        -- (xem comment P0-a.3 trong PLAN_analytics_scale.md) rồi chạy lại.
        v_ket := v_ket || format('LOI:%s:%s ', v_ten, SQLERRM);
      END;
    END IF;
  END LOOP;

  RETURN coalesce(nullif(btrim(v_ket), ''), 'khong-tao-moi');
END $$;

REVOKE ALL ON FUNCTION public.social_ensure_partition(integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.social_ensure_partition(integer)
  TO service_role;

-- 3) Wrapper tên cũ — cron/worker chưa redeploy vẫn gọi được.
CREATE OR REPLACE FUNCTION public.social_ensure_partition_thang_sau()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.social_ensure_partition(3);
END $$;

REVOKE ALL ON FUNCTION public.social_ensure_partition_thang_sau()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.social_ensure_partition_thang_sau()
  TO service_role;
