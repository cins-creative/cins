# PLAN — Chịu tải & lưu nhiều năm cho analytics (`social_luot_xem` + report)

> **Trạng thái:** P0–P3 đã implement + migrate (2026-08-13). P4–P5 chưa làm.
> **Nguồn chẩn đoán:** `supabase/sql/migration_social_su_kien.sql`, `migration_social_su_kien_breakdown.sql`, `lib/social/su-kien.ts`, `lib/social/social-cron.ts`, `workers/scheduled.ts`, `.github/workflows/social-cron.yml`, `app/api/social/su-kien/route.ts`, `app/api/shop/bao-cao/route.ts`.
> **Nguyên tắc xuyên suốt:** không endpoint phục vụ user nào được aggregate trên log thô. Log thô chỉ có 2 người dùng hợp lệ: cron rollup, và điều tra thủ công của admin.

---

## 1. Danh sách lỗ (10) và bước xử lý tương ứng

| # | Lỗ | Loại | Bước |
|---|---|---|---|
| 1 | Scrub 90 ngày NULL hoá `nguoi_xem`+`phien_id` → `count(DISTINCT coalesce(...))` bỏ NULL → **`tiep_can_unique` đọc realtime tụt dần về 0**; `social_insight_giai_doan` mất hẳn viewer cũ | **Sai số liệu** | P2 |
| 2 | Rollup "hôm nay" chỉ có data tới lúc cron chạy (08:00 VN, 1 lần/ngày) | Sai số liệu (nếu chuyển UI sang rollup mà không cộng delta) | P2 |
| 3 | 5 hàm cron + bảng đích **không có file SQL trong repo** (`social_ensure_partition_thang_sau`, `social_rollup_nguon`, `social_rollup_nhom`, `shop_rollup_san_pham`, `social_xoa_danh_tinh_cu`) | Vận hành | P0-c |
| 4 | Partition chỉ tạo trước 1 tháng, không có DEFAULT partition; workflow còn untracked; cron fail chỉ `console.error` | **Mất dữ liệu ghi** | P0-a |
| 5 | 2 nguồn trigger cron (Workers scheduled + GitHub Actions), không lock, chạy trong HTTP request | Vận hành | P0-b |
| 6 | `social_insight_doi_tuong` dùng `coalesce()` trong WHERE (không dùng được index) + không có điều kiện `tao_luc` (không prune partition) → seq scan **mọi partition mọi năm** mỗi lần mở modal | Tải (nặng #1) | P1-a |
| 7 | `social_rollup_su_kien` filter `(tao_luc AT TIME ZONE ...)::date = p_ngay` → expression trên partition key → không prune, full-scan toàn log × 4 hàm × 2 ngày/ngày | Tải | P1-b |
| 8 | `UPDATE ... da_xu_ly_hint = true` mỗi lần rollup: full-scan + rewrite heap + WAL + churn partial index, mà **không dùng làm watermark ở đâu** | Tải | P1-b |
| 9 | Rate limit ingest là `Map` in-memory (per-isolate trên Workers ⇒ gần như không có trần); không dedup impression | Tải + dung lượng | P1-c |
| 10 | `demLuotXemCuaViewer` / `demLuotXemToanCuc` filter `nguoi_xem`/`id_doi_tuong` nhưng index dẫn đầu bằng `loai_doi_tuong` (không filter) ⇒ **đường feed cũng seq scan mọi partition** | Tải (trên đường nóng nhất) | P1-a → P3 |
| — | Không có retention: row thô nằm lại vĩnh viễn | Lưu nhiều năm | P4 |

---

## 2. Bước 0 — Introspect trước khi viết migration (BẮT BUỘC)

Repo **không có** `CREATE TABLE social_luot_xem` gốc (các migration hiện có chỉ `ALTER`). Phải lấy sự thật từ DB trước, không đoán:

```sql
-- 0.1 Partition key + strategy của log thô
SELECT c.relname, pg_get_partkeydef(c.oid) AS partkey
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = 'social_luot_xem';

-- 0.2 Danh sách partition con + khoảng + kích thước
SELECT i.inhrelid::regclass AS partition,
       pg_get_expr(c.relpartbound, c.oid) AS bound,
       pg_size_pretty(pg_total_relation_size(i.inhrelid)) AS size,
       (SELECT reltuples::bigint FROM pg_class WHERE oid = i.inhrelid) AS uoc_row
FROM pg_inherits i JOIN pg_class c ON c.oid = i.inhrelid
WHERE i.inhparent = 'public.social_luot_xem'::regclass
ORDER BY 1;

-- 0.3 PK / unique constraint (partitioned table buộc PK phải chứa partition key)
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint WHERE conrelid = 'public.social_luot_xem'::regclass;

-- 0.4 Index hiện có
SELECT indexname, indexdef FROM pg_indexes
WHERE schemaname='public' AND tablename LIKE 'social_luot_xem%';

-- 0.5 5 hàm thiếu file SQL — dump định nghĩa thật để đưa vào repo
SELECT p.proname, pg_get_functiondef(p.oid)
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname='public' AND p.proname IN (
  'social_ensure_partition_thang_sau','social_rollup_nguon','social_rollup_nhom',
  'shop_rollup_san_pham','social_xoa_danh_tinh_cu'
);

-- 0.6 Bảng đích của rollup nguồn/nhóm + shop (kiểm tra tồn tại & cột)
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema='public' AND table_name IN (
  'social_thong_ke_nguon_ngay','social_thong_ke_nhom_ngay','shop_thong_ke_san_pham_ngay'
) ORDER BY 1, ordinal_position;

-- 0.7 Xác nhận chẩn đoán #6 và #10 bằng plan thật (thay UUID thật)
EXPLAIN (ANALYZE, BUFFERS)
SELECT count(*) FROM social_luot_xem
WHERE coalesce(id_boi_canh, id_doi_tuong) = '<uuid-cot-moc>';

EXPLAIN (ANALYZE, BUFFERS)
SELECT id_doi_tuong FROM social_luot_xem
WHERE nguoi_xem = '<uuid-user>' AND loai_su_kien='hien_thi'
  AND id_doi_tuong IN ('<uuid-1>','<uuid-2>') LIMIT 5000;
```

**Output bước 0 (2026-08-13, DB thật):**

- **0.1** `RANGE (tao_luc)` — confirmed.
- **0.2** 5 partition: `2026_05` … `2026_09`. Bound = **UTC midnight** (`'YYYY-MM-01 00:00:00+00'`), không phải lịch VN. Không có DEFAULT. Tháng 8 ≈ 1829 row / 816 kB (đang nhỏ).
- **0.3** Không PK trên parent — chỉ FK `nguoi_xem → user_nguoi_dung(id) ON DELETE SET NULL`.
- **0.4** Parent index đều `ON ONLY`: `idx_luot_xem_doi_tuong`, `idx_luot_xem_hint`, `idx_luot_xem_tao_luc`, `social_luot_xem_doi_tuong_idx`, `social_luot_xem_boi_canh_idx`, `social_luot_xem_chua_xu_ly_idx`. Con có index tương ứng (tên auto).
- **0.5** 5 hàm tồn tại trên DB; dump vào `migration_social_cron_functions.sql`. `social_xoa_danh_tinh_cu` **chỉ NULL `nguoi_xem`** (không đụng `phien_id`); trước P0 không có cận dưới.
- **0.6** Ba bảng đích đã có: `social_thong_ke_nguon_ngay`, `social_thong_ke_nhom_ngay`, `shop_thong_ke_san_pham_ngay`. `social_thong_ke_doi_tuong_ngay` có thêm cột live chưa có trong repo (`lot_man_hinh`, `luot_tuong_tac`, …).
- **0.7** **Xác nhận lỗ #6:** `coalesce(id_boi_canh, id_doi_tuong)` = Seq Scan **cả 5 partition**. **Lỗ #10 một phần:** viewer query không prune partition (Append 5 nhánh); một số nhánh Bitmap/Index Scan, tháng 6 Seq Scan.

→ P1 (index + rewrite RPC có `tao_luc`) vẫn là bước tải tiếp theo.

---

## 3. P0 — Chặn mất dữ liệu & ổn định vận hành (làm trước tiên)

### P0-a. Lưới an toàn partition — `supabase/sql/migration_social_partition_an_toan.sql`

Hai thay đổi: **DEFAULT partition** (không bao giờ INSERT fail) + **tạo trước nhiều tháng** (không phụ thuộc cron chạy đúng từng tháng).

```sql
-- 1) DEFAULT partition: hứng mọi row rơi ngoài khoảng đã khai báo.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_inherits i ON i.inhrelid = c.oid
    WHERE i.inhparent = 'public.social_luot_xem'::regclass
      AND pg_get_expr(c.relpartbound, c.oid) = 'DEFAULT'
  ) THEN
    EXECUTE 'CREATE TABLE public.social_luot_xem_default
             PARTITION OF public.social_luot_xem DEFAULT';
  END IF;
END $$;

-- 2) Tạo trước N tháng (mặc định 3) — idempotent, thay cho hàm chỉ tạo 1 tháng.
CREATE OR REPLACE FUNCTION public.social_ensure_partition(p_so_thang integer DEFAULT 3)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_i integer; v_tu date; v_den date; v_ten text; v_ket text := '';
BEGIN
  FOR v_i IN 0..greatest(p_so_thang, 1) LOOP
    v_tu  := date_trunc('month', (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)::date
             + (v_i || ' month')::interval;
    v_den := v_tu + interval '1 month';
    v_ten := format('social_luot_xem_%s', to_char(v_tu, 'YYYY_MM'));

    IF to_regclass('public.' || v_ten) IS NULL THEN
      -- Tạo rời rồi ATTACH: nếu DEFAULT đã chứa row thuộc khoảng này,
      -- ATTACH sẽ lỗi → phải di trú row (xem P0-a.3) trước khi thử lại.
      EXECUTE format(
        'CREATE TABLE public.%I (LIKE public.social_luot_xem INCLUDING DEFAULTS INCLUDING CONSTRAINTS)',
        v_ten);
      EXECUTE format(
        'ALTER TABLE public.social_luot_xem ATTACH PARTITION public.%I
         FOR VALUES FROM (%L) TO (%L)', v_ten, v_tu, v_den);
      v_ket := v_ket || v_ten || ' ';
    END IF;
  END LOOP;
  RETURN coalesce(nullif(v_ket, ''), 'khong-tao-moi');
END $$;

REVOKE ALL ON FUNCTION public.social_ensure_partition(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.social_ensure_partition(integer) TO service_role;
```

**Gotcha bắt buộc ghi vào docs:** khi DEFAULT partition đã có row thuộc khoảng của partition mới, `ATTACH PARTITION` **thất bại** (Postgres phải scan DEFAULT để kiểm tra). Quy trình dọn:

```sql
-- P0-a.3 Di trú row từ DEFAULT sang partition tháng đúng (chạy khi ATTACH lỗi)
BEGIN;
  CREATE TABLE public.social_luot_xem_2026_09
    (LIKE public.social_luot_xem INCLUDING DEFAULTS INCLUDING CONSTRAINTS);
  WITH moved AS (
    DELETE FROM public.social_luot_xem_default
    WHERE tao_luc >= '2026-09-01' AND tao_luc < '2026-10-01'
    RETURNING *
  )
  INSERT INTO public.social_luot_xem_2026_09 SELECT * FROM moved;
  ALTER TABLE public.social_luot_xem
    ATTACH PARTITION public.social_luot_xem_2026_09
    FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
COMMIT;
```

> Giả định cần kiểm ở bước 0.1: partition key là `tao_luc` (RANGE). Nếu khác → sửa `v_tu/v_den` và mệnh đề `FOR VALUES` cho khớp; **không** chạy khi chưa xác nhận.

**Kèm theo (không phải SQL):**
- `git add .github/workflows/social-cron.yml` — hiện đang untracked ⇒ cron GitHub **chưa hề chạy**.
- Đổi schedule `0 1 * * *` → `0 */6 * * *` (4 lần/ngày): giảm độ trễ rollup ngày hiện tại và tăng cơ hội self-heal partition.
- GitHub tự vô hiệu scheduled workflow sau 60 ngày repo không commit ⇒ **Workers `scheduled` là nguồn chính**, GitHub Actions là fallback (ghi rõ trong docs, hiện đang mô tả ngược).
- `runSocialCron` khi lỗi: ngoài `console.error`, ghi 1 row vào `cins_cron_log` (P0-b) để có chỗ soi. Cảnh báo: partition fail = **mất tracking**, phải là mức nghiêm trọng nhất.

### P0-b. Lease chống chạy chồng + log cron — `migration_cins_cron_lease.sql`

Không dùng `pg_advisory_lock` (session-level không an toàn qua pooler transaction mode). Dùng lease row, atomic bằng chính `UPDATE ... WHERE`:

```sql
CREATE TABLE IF NOT EXISTS public.cins_cron_lease (
  ten           text PRIMARY KEY,
  chay_luc      timestamptz NOT NULL DEFAULT now(),
  het_han_luc   timestamptz NOT NULL DEFAULT now(),
  nguon         text
);
ALTER TABLE public.cins_cron_lease ENABLE ROW LEVEL SECURITY;  -- chỉ service_role

CREATE TABLE IF NOT EXISTS public.cins_cron_log (
  id         bigserial PRIMARY KEY,
  ten        text NOT NULL,
  ok         boolean NOT NULL,
  chi_tiet   jsonb,
  tao_luc    timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cins_cron_log ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS cins_cron_log_ten_idx ON public.cins_cron_log (ten, tao_luc DESC);

-- Trả true nếu giành được lease (lease cũ đã hết hạn hoặc chưa tồn tại).
CREATE OR REPLACE FUNCTION public.cins_cron_giu_lease(
  p_ten text, p_giay integer DEFAULT 600, p_nguon text DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_ok boolean;
BEGIN
  INSERT INTO public.cins_cron_lease (ten, chay_luc, het_han_luc, nguon)
  VALUES (p_ten, now(), now() + make_interval(secs => p_giay), p_nguon)
  ON CONFLICT (ten) DO UPDATE
    SET chay_luc = now(),
        het_han_luc = now() + make_interval(secs => p_giay),
        nguon = p_nguon
    WHERE public.cins_cron_lease.het_han_luc < now()
  RETURNING true INTO v_ok;
  RETURN coalesce(v_ok, false);
END $$;

CREATE OR REPLACE FUNCTION public.cins_cron_tra_lease(p_ten text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.cins_cron_lease SET het_han_luc = now() - interval '1 second' WHERE ten = p_ten;
$$;

REVOKE ALL ON FUNCTION public.cins_cron_giu_lease(text,integer,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cins_cron_tra_lease(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cins_cron_giu_lease(text,integer,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.cins_cron_tra_lease(text) TO service_role;
```

Sửa `lib/social/social-cron.ts`: đầu `runSocialCron` gọi `cins_cron_giu_lease('social', 600, nguon)`; nếu `false` → trả `{ ok: true, skipped: 'lease' }` (không lỗi, vì đây là trạng thái bình thường khi 2 trigger trùng). Kết thúc (kể cả lỗi) → `cins_cron_tra_lease` + ghi `cins_cron_log`.

### P0-c. Đưa 5 hàm thiếu vào repo

Từ kết quả 0.5/0.6, tạo `supabase/sql/migration_social_cron_functions.sql` (dạng `CREATE OR REPLACE`, idempotent) + `migration_social_thong_ke_nguon_nhom.sql` + `migration_shop_thong_ke_san_pham_ngay.sql` cho các bảng đích còn thiếu. Kèm `scripts/run-*-migration.mjs` theo mẫu `scripts/run-su-kien-migration.mjs`.

Trong lúc đọc `social_xoa_danh_tinh_cu`, kiểm 1 câu hỏi cụ thể: nó có mệnh đề chặn phạm vi (kiểu `AND nguoi_xem IS NOT NULL` + khoảng ngày cận dưới) hay **mỗi ngày UPDATE lại toàn bộ dữ liệu > 90 ngày**? Nếu là trường hợp sau → thêm cận dưới (chỉ scrub cửa sổ `[-91, -90]` ngày) vì các ngày cũ hơn đã scrub xong.

---

## 4. P1 — Sửa hình dạng query (giảm tải một bậc, không đổi schema logic)

### P1-a. Index + rewrite RPC insight — `migration_social_su_kien_index_range.sql`

**Index.** Lưu ý: `CREATE INDEX CONCURRENTLY` **không dùng được** trên partitioned parent. Công thức an toàn cho bảng ghi nóng: tạo `ON ONLY` ở parent (invalid) → tạo concurrently từng partition → `ATTACH PARTITION` từng index → parent tự thành valid.

```sql
-- (i) Feed: viewer × đối tượng  (lỗ #10)
CREATE INDEX IF NOT EXISTS social_luot_xem_viewer_idx
  ON ONLY public.social_luot_xem (nguoi_xem, id_doi_tuong, loai_su_kien);

-- (ii) Đối tượng, không dẫn đầu bằng loai_doi_tuong (lỗ #6, #10)
CREATE INDEX IF NOT EXISTS social_luot_xem_id_doi_tuong_idx
  ON ONLY public.social_luot_xem (id_doi_tuong, loai_su_kien, tao_luc);

-- (iii) Bối cảnh + thời gian (index cũ thiếu tao_luc)
CREATE INDEX IF NOT EXISTS social_luot_xem_boi_canh_tao_luc_idx
  ON ONLY public.social_luot_xem (id_boi_canh, loai_su_kien, tao_luc);

-- Với TỪNG partition con (sinh động bằng DO loop hoặc chạy tay ngoài transaction):
--   CREATE INDEX CONCURRENTLY social_luot_xem_2026_08_viewer_idx
--     ON public.social_luot_xem_2026_08 (nguoi_xem, id_doi_tuong, loai_su_kien);
--   ALTER INDEX public.social_luot_xem_viewer_idx
--     ATTACH PARTITION public.social_luot_xem_2026_08_viewer_idx;
```

Sau khi (ii) hoạt động, **cân nhắc bỏ** `social_luot_xem_doi_tuong_idx` cũ nếu `pg_stat_user_indexes.idx_scan` ≈ 0 — mỗi index gỡ được là write nhanh hơn trên bảng nóng nhất hệ thống.

**Rewrite 3 RPC:** bỏ `coalesce()` khỏi WHERE (dùng OR hai nhánh, mỗi nhánh khớp index) + thêm khoảng `tao_luc` để prune partition. Giữ overload cũ làm wrapper để không phải sửa app cùng lúc.

```sql
CREATE OR REPLACE FUNCTION public.social_insight_doi_tuong(
  p_loai loai_doi_tuong_social_enum,
  p_id   uuid,
  p_tu   timestamptz,
  p_den  timestamptz
) RETURNS TABLE (
  luot_tiep_can bigint, tiep_can_unique bigint, luot_xem_noi_dung bigint,
  luot_mo_comment bigint, luot_click_profile bigint, luot_xem_media bigint,
  luot_click_lien_ket bigint
) LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  WITH ev AS (
    -- Nhánh 1: sự kiện quy gán qua bối cảnh
    SELECT loai_su_kien, nguoi_xem, phien_id
    FROM public.social_luot_xem
    WHERE tao_luc >= p_tu AND tao_luc < p_den
      AND loai_boi_canh = p_loai AND id_boi_canh = p_id
    UNION ALL
    -- Nhánh 2: sự kiện đo trực tiếp trên đối tượng
    SELECT loai_su_kien, nguoi_xem, phien_id
    FROM public.social_luot_xem
    WHERE tao_luc >= p_tu AND tao_luc < p_den
      AND id_boi_canh IS NULL
      AND loai_doi_tuong = p_loai AND id_doi_tuong = p_id
  )
  SELECT
    count(*) FILTER (WHERE loai_su_kien = 'hien_thi'),
    count(DISTINCT coalesce(nguoi_xem::text, phien_id)) FILTER (WHERE loai_su_kien = 'hien_thi'),
    count(*) FILTER (WHERE loai_su_kien = 'mo_card'),
    count(*) FILTER (WHERE loai_su_kien = 'xem_binh_luan'),
    count(*) FILTER (WHERE loai_su_kien IN ('mo_popover_nguoi','xem_profile_full')),
    count(*) FILTER (WHERE loai_su_kien = 'xem_media'),
    count(*) FILTER (WHERE loai_su_kien = 'click_lien_ket')
  FROM ev;
$$;
```

`social_insight_nguon` / `social_insight_giai_doan`: thêm `p_tu`/`p_den` tương tự (hai hàm này vốn chỉ filter trực tiếp `loai_doi_tuong`/`id_doi_tuong`, không có `coalesce` — chỉ thiếu khoảng thời gian).

**Chặn ở API** (`app/api/social/su-kien/route.ts` + `lib/social/su-kien.ts`):
- Nhận `?tu=&den=` tuỳ chọn, mặc định 90 ngày gần nhất (đúng cửa sổ log thô còn danh tính).
- Cửa sổ tối đa cho đường realtime: **90 ngày**. Muốn dài hơn → đọc rollup (P2).
- REVOKE/GRANT lại cho overload mới; giữ `REVOKE ... FROM PUBLIC, anon, authenticated` và `GRANT ... TO service_role`.

### P1-b. Rollup prunable + bỏ mass UPDATE — `migration_social_rollup_range.sql`

```sql
CREATE OR REPLACE FUNCTION public.social_rollup_su_kien(
  p_ngay date DEFAULT ((now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)
) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_tu  timestamptz := (p_ngay::timestamp        AT TIME ZONE 'Asia/Ho_Chi_Minh');
  v_den timestamptz := ((p_ngay + 1)::timestamp  AT TIME ZONE 'Asia/Ho_Chi_Minh');
  v_rows integer;
BEGIN
  WITH ev AS (
    SELECT coalesce(loai_boi_canh, loai_doi_tuong) AS s_loai,
           coalesce(id_boi_canh, id_doi_tuong)     AS s_id,
           loai_su_kien, nguoi_xem, phien_id
    FROM public.social_luot_xem
    WHERE tao_luc >= v_tu AND tao_luc < v_den   -- prunable: so sánh trực tiếp partition key
  ), agg AS (
    SELECT s_loai, s_id,
      count(*) FILTER (WHERE loai_su_kien='hien_thi')                                AS tiep_can,
      count(DISTINCT coalesce(nguoi_xem::text, phien_id))
        FILTER (WHERE loai_su_kien='hien_thi')                                       AS tiep_can_uniq,
      count(*) FILTER (WHERE loai_su_kien='mo_card')                                 AS xem_noi_dung,
      count(*) FILTER (WHERE loai_su_kien='xem_binh_luan')                           AS mo_comment,
      count(*) FILTER (WHERE loai_su_kien IN ('mo_popover_nguoi','xem_profile_full')) AS click_profile,
      count(*) FILTER (WHERE loai_su_kien='xem_media')                               AS xem_media,
      count(*) FILTER (WHERE loai_su_kien='click_lien_ket')                           AS click_lien_ket
    FROM ev GROUP BY s_loai, s_id
  )
  INSERT INTO public.social_thong_ke_doi_tuong_ngay AS t (
    loai_doi_tuong, id_doi_tuong, ngay,
    luot_tiep_can, tiep_can_unique, luot_xem_noi_dung,
    luot_mo_comment, luot_click_profile, luot_xem_media, luot_click_lien_ket)
  SELECT s_loai, s_id, p_ngay, tiep_can, tiep_can_uniq, xem_noi_dung,
         mo_comment, click_profile, xem_media, click_lien_ket
  FROM agg
  ON CONFLICT (loai_doi_tuong, id_doi_tuong, ngay) DO UPDATE SET
    luot_tiep_can=EXCLUDED.luot_tiep_can, tiep_can_unique=EXCLUDED.tiep_can_unique,
    luot_xem_noi_dung=EXCLUDED.luot_xem_noi_dung, luot_mo_comment=EXCLUDED.luot_mo_comment,
    luot_click_profile=EXCLUDED.luot_click_profile, luot_xem_media=EXCLUDED.luot_xem_media,
    luot_click_lien_ket=EXCLUDED.luot_click_lien_ket, cap_nhat_luc=now();

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  -- BỎ hẳn `UPDATE ... SET da_xu_ly_hint = true` (lỗ #8): rollup tính lại theo
  -- ngày nên không cần hint; mass UPDATE chỉ tạo dead tuple + WAL + churn index.
  RETURN v_rows;
END $$;
```

Áp cùng cách cho `social_rollup_nguon`, `social_rollup_nhom`, `shop_rollup_san_pham` (sau khi có định nghĩa thật từ P0-c).

**Câu hỏi treo:** `da_xu_ly_hint` được `CINS_IMPLEMENTATION.md` §7 mô tả là "batch AI viewer hint" — mục đích khác rollup. Nếu pipeline AI đó chưa tồn tại → bỏ luôn cột + `social_luot_xem_chua_xu_ly_idx`. Nếu còn dùng → giữ cột, chỉ bỏ mass UPDATE trong rollup. **Cần user chốt.**

### P1-c. Siết ingest — `lib/social/su-kien-rate-limit.ts` + `track-su-kien.ts`

1. **Dedup phía client (đòn lớn nhất, rẻ nhất):** trong `lib/social/track-su-kien.ts`, giữ `Set` khoá `${loai_su_kien}:${id_doi_tuong}:${nguon}` cho impression, chỉ gửi lại sau cửa sổ **10 phút**. Giảm số row impression một bậc độ lớn → giảm đồng thời dung lượng, chi phí rollup và chi phí retention.
2. **Dedup phía server:** trong `recordSuKien`, gộp trùng trong cùng batch trước khi `insert`.
3. **Rate limit thật:** `Map` in-memory là per-isolate trên Workers ⇒ vô nghĩa ở production. Chuyển sang Durable Object hoặc KV counter theo `phien_id`/user (Cloudflare đã có trong stack). Nếu chưa muốn thêm hạ tầng → tối thiểu hạ `MAX_BATCH` và ghi nhận đây là **hạn mềm**, không phải hàng rào.

---

## 5. P2 — Insight đọc rollup (đồng thời sửa lỗ #1)

### P2-a. Bảng cặp viewer × đối tượng — `migration_social_da_xem.sql`

Đây là mảnh ghép giải quyết cùng lúc: unique count **chính xác vĩnh viễn** (không cộng dồn được từ rollup ngày), feed dedup không cần scan log, và miễn nhiễm với scrub.

```sql
CREATE TABLE IF NOT EXISTS public.social_da_xem (
  viewer_key     text NOT NULL,            -- hash(salt : nguoi_xem|phien_id) — pseudonymous, giữ lâu dài
  loai_doi_tuong loai_doi_tuong_social_enum NOT NULL,
  id_doi_tuong   uuid NOT NULL,
  nguoi_xem      uuid,                     -- chỉ để feed dedup; scrub NULL sau 90 ngày
  so_lan         integer NOT NULL DEFAULT 1,
  lan_dau        timestamptz NOT NULL DEFAULT now(),
  lan_cuoi       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (viewer_key, id_doi_tuong)
);
ALTER TABLE public.social_da_xem ENABLE ROW LEVEL SECURITY;  -- chỉ service_role

-- Đếm unique theo đối tượng (thay count DISTINCT trên log thô)
CREATE INDEX IF NOT EXISTS social_da_xem_doi_tuong_idx
  ON public.social_da_xem (id_doi_tuong, loai_doi_tuong);
-- Feed dedup: viewer đã xem những gì (chỉ cần cửa sổ gần)
CREATE INDEX IF NOT EXISTS social_da_xem_nguoi_xem_idx
  ON public.social_da_xem (nguoi_xem, lan_cuoi DESC) WHERE nguoi_xem IS NOT NULL;
```

Cập nhật bằng cron rollup (cùng cửa sổ ngày) với `ON CONFLICT (viewer_key, id_doi_tuong) DO UPDATE SET so_lan = so_lan + EXCLUDED.so_lan, lan_cuoi = greatest(...)`. Không upsert ở đường ingest để giữ ingest mỏng.

**Ràng buộc quan trọng:** `viewer_key` phải hash bằng **salt cố định** (`SU_KIEN_SALT`). Đổi salt = mọi viewer thành người mới = unique count nhân đôi. Ghi rõ vào `CINS_DECISIONS.md` là giá trị không được rotate.

**Dung lượng:** số row = số cặp (người × nội dung đã tiếp cận) thật, nhỏ hơn log thô nhiều bậc vì đã dedup. Đây là bảng "sống nhiều năm", cùng hạng với rollup tháng.

### P2-b. Rollup tháng — `migration_social_thong_ke_thang.sql`

```sql
CREATE TABLE IF NOT EXISTS public.social_thong_ke_doi_tuong_thang (
  loai_doi_tuong loai_doi_tuong_social_enum NOT NULL,
  id_doi_tuong   uuid NOT NULL,
  thang          date NOT NULL,            -- ngày đầu tháng (VN)
  luot_tiep_can       integer NOT NULL DEFAULT 0,
  luot_xem_noi_dung   integer NOT NULL DEFAULT 0,
  luot_mo_comment     integer NOT NULL DEFAULT 0,
  luot_click_profile  integer NOT NULL DEFAULT 0,
  luot_xem_media      integer NOT NULL DEFAULT 0,
  luot_click_lien_ket integer NOT NULL DEFAULT 0,
  tiep_can_unique_ngay_tong integer NOT NULL DEFAULT 0,  -- TỔNG unique theo ngày (KHÔNG phải unique tháng)
  cap_nhat_luc timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (loai_doi_tuong, id_doi_tuong, thang)
);
ALTER TABLE public.social_thong_ke_doi_tuong_thang ENABLE ROW LEVEL SECURITY;
```

Hàm `social_rollup_thang(p_thang date)` cộng dồn từ `social_thong_ke_doi_tuong_ngay`. Tên cột `tiep_can_unique_ngay_tong` cố ý dài để **không ai dùng nhầm** như unique của tháng.

### P2-c. Đường đọc mới

`lib/social/su-kien.ts` → `readSubjectInsight` đổi thành 3 nguồn ghép:

| Chỉ số | Nguồn | Lý do |
|---|---|---|
| Các tổng `luot_*` (toàn thời gian) | `social_thong_ke_doi_tuong_ngay` (+ `_thang` cho phần đã nén) | Cộng được, chính xác, ~vài trăm row/bài |
| `tiepCanUnique` toàn thời gian | `COUNT(*) FROM social_da_xem WHERE id_doi_tuong = ?` | Chính xác vĩnh viễn, không bị scrub phá |
| Delta ngày hiện tại | RPC realtime P1-a với `p_tu = 00:00 VN hôm nay` | Sửa lỗ #2; chỉ quét partition tháng hiện tại, 1 ngày |
| `nguonBreakdown`, `giaiDoanBreakdown` | `social_thong_ke_nguon_ngay` / `_nhom_ngay` (P0-c) | Bỏ hẳn đường realtime lịch sử |

**Cache:** tách rõ hai việc — `canViewCotMocInsight` chạy per-request (không cache); phần số liệu bọc cache server-side **khoá theo `loai:id` + khoảng**, TTL 5–15 phút. Insight của một bài giống nhau với mọi người có quyền, nên nhiều đồng tác giả / nhiều admin org mở cùng bài chỉ tốn một lần tính. Tuyệt đối **không** đặt `s-maxage`/CDN cache cho endpoint này (dữ liệu riêng tư).

k-anonymity 5 vẫn áp lúc **hiển thị**, không đổi.

---

## 6. P3 — Feed ngừng đọc log thô

Thay `demLuotXemCuaViewer` / `demLuotXemToanCuc` (`lib/social/su-kien.ts:87-137`):

- **Viewer đã xem gì** → `social_da_xem` (P2-a): `WHERE nguoi_xem = ? AND id_doi_tuong IN (...)`, đọc `so_lan` — point lookup theo PK/index, không LIMIT giả, **không còn sai số do cắt ở 5.000 row**.
- **Reach toàn cục để cold-start rank** → counter denormalize:

```sql
CREATE TABLE IF NOT EXISTS public.social_dem_doi_tuong (
  loai_doi_tuong loai_doi_tuong_social_enum NOT NULL,
  id_doi_tuong   uuid PRIMARY KEY,
  luot_tiep_can  bigint NOT NULL DEFAULT 0,
  nguoi_tiep_can bigint NOT NULL DEFAULT 0,
  cap_nhat_luc   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.social_dem_doi_tuong ENABLE ROW LEVEL SECURITY;
```

Cron cập nhật incremental từ rollup ngày. Feed đọc `IN (...)` trên PK.

Sau bước này, log thô **không còn ai đọc trên đường phục vụ user** → mở đường cho P4 và cho việc gỡ index thừa.

---

## 7. P4 — Retention: lưu nhiều năm mà không vỡ

Thang giữ dữ liệu:

| Tầng | Giữ | Cách xoá |
|---|---|---|
| `social_luot_xem` (thô) | **90 ngày** (khớp mốc scrub danh tính) | `DETACH` + `DROP` partition tháng |
| `social_thong_ke_*_ngay` | 24–25 tháng | `DELETE WHERE ngay < ...` (bảng nhỏ, chấp nhận được) |
| `social_thong_ke_*_thang` | vĩnh viễn | — |
| `social_da_xem` | vĩnh viễn (`nguoi_xem` scrub sau 90 ngày, `viewer_key` giữ) | — |
| `social_dem_doi_tuong` | vĩnh viễn | — |

```sql
CREATE OR REPLACE FUNCTION public.social_drop_partition_cu(p_giu_ngay integer DEFAULT 90)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_moc date := ((now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - p_giu_ngay);
  v_rec record; v_ket text := '';
BEGIN
  FOR v_rec IN
    SELECT i.inhrelid::regclass AS part, pg_get_expr(c.relpartbound, c.oid) AS bound
    FROM pg_inherits i JOIN pg_class c ON c.oid = i.inhrelid
    WHERE i.inhparent = 'public.social_luot_xem'::regclass
      AND pg_get_expr(c.relpartbound, c.oid) <> 'DEFAULT'
  LOOP
    -- Chỉ drop khi cận TRÊN của partition đã cũ hơn mốc giữ.
    IF (substring(v_rec.bound from 'TO \(''([0-9-]+)''')::date) <= date_trunc('month', v_moc)::date THEN
      EXECUTE format('ALTER TABLE public.social_luot_xem DETACH PARTITION %s', v_rec.part);
      EXECUTE format('DROP TABLE %s', v_rec.part);
      v_ket := v_ket || v_rec.part::text || ' ';
    END IF;
  END LOOP;
  RETURN coalesce(nullif(v_ket, ''), 'khong-drop');
END $$;
```

**Điều kiện tiên quyết, không được bỏ:** chỉ bật hàm này **sau khi** P2 + P3 xong (không còn ai đọc lịch sử thô) và đã xác nhận rollup của mọi ngày trong partition đó tồn tại. Gợi ý an toàn: chạy `DETACH` trước, để bảng rời **một chu kỳ cron** rồi mới `DROP` ở lần sau — có cửa sổ hoàn tác.

**Tuỳ chọn lưu trữ lạnh:** trước khi drop, export partition ra Parquet/CSV lên R2 (`scripts/export-luot-xem-partition.mjs`). Rẻ, nằm ngoài đường query nóng, đủ cho audit.

---

## 8. P5 — Shop & admin theo cùng khuôn

| Nơi | Hiện tại | Đổi thành |
|---|---|---|
| `GET /api/shop/bao-cao` | Paginate **toàn bộ** đơn seller 1000/page + group trong JS | Bảng `shop_thong_ke_don_ngay` (`id_cua_hang` × `ngay` × `trang_thai`: `doanh_thu`, `so_don`, `so_sp`) do cron cập nhật; API đọc rollup + delta hôm nay |
| Danh sách đơn trong báo cáo | Kéo hết | **Cursor pagination** (`tao_luc, id`), không `offset` sâu |
| `GET /api/admin/nguoi-dung/growth` | Paginate `user_nguoi_dung` 1000/page, group theo ngày trong JS | Bảng `cins_thong_ke_ngay (ngay, chi_so, gia_tri)` — key/value cho signup, bài mới, verify… |
| `GET /api/admin/inbox-stats` | ~10 `COUNT head` song song | Một query đọc `cins_thong_ke_ngay` / counter + cache 60s |
| `GET /api/admin/world-boost?growth=1` | Group timestamp nhiều bảng theo ngày | Cùng `cins_thong_ke_ngay` |

Client cache: tiếp tục dùng `lib/shop/client-fetch-cache.ts` (45s) — đúng hướng, giữ nguyên.

---

## 9. Thứ tự thực thi & tiêu chí xong

| Bước | Nội dung | Rủi ro | Xong khi |
|---|---|---|---|
| 0 | Introspect + dump 5 hàm vào repo | Không | Có file SQL cho mọi hàm/bảng cron; inventory trong DECISIONS |
| P0-a | DEFAULT partition + tạo trước 3 tháng + commit workflow + schedule 6h | Thấp (chỉ thêm) | `INSERT` không thể fail vì thiếu partition; workflow đã tracked |
| P0-b | Lease + cron log | Thấp | 2 trigger trùng → 1 chạy, 1 skip; có log truy vết |
| P1-a | Index (ONLY + attach concurrently) + rewrite 3 RPC có `tao_luc` | Trung (tạo index trên bảng nóng) | `EXPLAIN` cho `Index Scan` + chỉ chạm partition trong khoảng |
| P1-b | Rollup prunable, bỏ mass UPDATE | Trung (đổi hàm đang chạy) | Thời gian cron giảm rõ; số liệu rollup không đổi so với trước |
| P1-c | Dedup + rate limit ingest | Thấp | Số row/ngày giảm ≥ 1 bậc; số liệu vẫn hợp lý |
| P2 | `social_da_xem` + rollup tháng + insight đọc rollup + cache | Cao (đổi nguồn số liệu UI) | Bài > 90 ngày vẫn hiển thị đúng unique (lỗ #1 hết) |
| P3 | Feed dùng `social_da_xem` + counter | Trung | Feed không còn query `social_luot_xem`; p95 feed giảm |
| P4 | Drop partition + rollup tháng + export lạnh | Cao (xoá dữ liệu) | Kích thước log thô đứng yên theo thời gian |
| P5 | Shop + admin rollup | Trung | `/api/shop/bao-cao` không còn kéo toàn bộ đơn |

**Nguyên tắc mỗi bước:** một migration + một script runner + một lần `EXPLAIN` đối chiếu trước/sau. Không gộp P1 với P2 trong cùng session.

---

## 10. Câu hỏi cần user chốt trước khi code

1. **Unique count:** dùng `social_da_xem` (chính xác vĩnh viễn, thêm 1 bảng lớn trung bình) — đề xuất — hay chỉ hiển thị "unique theo ngày" + "tổng lượt" (rẻ nhất, đổi nghĩa số liệu trên UI)?
2. **`da_xu_ly_hint`:** pipeline "batch AI viewer hint" (`CINS_IMPLEMENTATION.md` §7) còn dùng không? Nếu không → bỏ cột + partial index.
3. **Retention log thô 90 ngày** có đúng ý không? Nếu muốn giữ 180 ngày để điều tra thì dung lượng và chi phí rollup tăng tương ứng.
4. **Cửa sổ realtime cho insight:** mặc định 90 ngày (khớp mốc scrub) — hay muốn "toàn thời gian" ngay từ P1 (khi đó phải chờ P2 mới có số đúng)?
5. **Rate limit ingest:** được phép thêm Durable Object / KV cho counter không, hay giữ hạn mềm in-memory?
6. **Cron:** chốt Workers `scheduled` là nguồn chính, GitHub Actions là fallback (hiện docs ghi ngược) — đúng chứ?

---

*File này là plan; chưa có thay đổi code/DB nào được thực thi. Sau khi chốt §10, mỗi bước P sẽ được build riêng theo `CINS_DEV_RULES.md` §1 (báo trước mọi `ALTER` trên bảng live).*
