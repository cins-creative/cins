-- =====================================================================
-- migration_shop_nhom_so_mau.sql — bộ đếm số mẫu (cache) trên shop_nhom
-- Thay cho việc GROUP BY đếm mỗi lần tải. Trigger tự đồng bộ khi
-- thêm / sửa (di chuyển loại) / xóa mềm / xóa cứng mẫu.
-- Idempotent. CINs ospzzzxcomrmhqrnkoiw.
-- =====================================================================

-- 1) Cột đếm (cache) — số mẫu (da_xoa=false) đang gắn nhóm này.
--    Với truc=1 đếm theo id_nhom; truc=2 đếm theo id_nhom_2.
ALTER TABLE public.shop_nhom
  ADD COLUMN IF NOT EXISTS so_mau integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.shop_nhom.so_mau IS
  'Cache số mẫu (shop_san_pham.da_xoa=false) gắn nhóm này — đồng bộ bằng trigger trg_shop_san_pham_so_mau. Không sửa tay.';

-- 2) Hàm trigger: điều chỉnh so_mau cho nhóm cũ/mới của một mẫu.
CREATE OR REPLACE FUNCTION public.shop_nhom_sync_so_mau()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Gỡ membership CŨ khi hàng cũ đang active (UPDATE / DELETE).
  IF (TG_OP = 'UPDATE' OR TG_OP = 'DELETE') AND OLD.da_xoa = false THEN
    IF OLD.id_nhom IS NOT NULL THEN
      UPDATE public.shop_nhom
        SET so_mau = GREATEST(so_mau - 1, 0)
        WHERE id = OLD.id_nhom;
    END IF;
    IF OLD.id_nhom_2 IS NOT NULL THEN
      UPDATE public.shop_nhom
        SET so_mau = GREATEST(so_mau - 1, 0)
        WHERE id = OLD.id_nhom_2;
    END IF;
  END IF;

  -- Thêm membership MỚI khi hàng mới active (INSERT / UPDATE).
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW.da_xoa = false THEN
    IF NEW.id_nhom IS NOT NULL THEN
      UPDATE public.shop_nhom
        SET so_mau = so_mau + 1
        WHERE id = NEW.id_nhom;
    END IF;
    IF NEW.id_nhom_2 IS NOT NULL THEN
      UPDATE public.shop_nhom
        SET so_mau = so_mau + 1
        WHERE id = NEW.id_nhom_2;
    END IF;
  END IF;

  RETURN NULL; -- AFTER trigger
END;
$$;

-- 3) Trigger: chỉ chạy UPDATE khi id_nhom / id_nhom_2 / da_xoa thay đổi.
DROP TRIGGER IF EXISTS trg_shop_san_pham_so_mau ON public.shop_san_pham;
CREATE TRIGGER trg_shop_san_pham_so_mau
AFTER INSERT OR DELETE OR UPDATE OF id_nhom, id_nhom_2, da_xoa
ON public.shop_san_pham
FOR EACH ROW
EXECUTE FUNCTION public.shop_nhom_sync_so_mau();

-- 4) Backfill (idempotent): reset rồi tính lại từ dữ liệu thật.
UPDATE public.shop_nhom SET so_mau = 0;

UPDATE public.shop_nhom n
SET so_mau = sub.cnt
FROM (
  SELECT nid AS id, count(*)::int AS cnt
  FROM (
    SELECT id_nhom AS nid
    FROM public.shop_san_pham
    WHERE da_xoa = false AND id_nhom IS NOT NULL
    UNION ALL
    SELECT id_nhom_2 AS nid
    FROM public.shop_san_pham
    WHERE da_xoa = false AND id_nhom_2 IS NOT NULL
  ) m
  GROUP BY nid
) sub
WHERE n.id = sub.id;
