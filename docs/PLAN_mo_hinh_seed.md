# PLAN — Mô hình seed dùng chung (nick + page)

> **Trạng thái:** draft chờ duyệt · **Ngày:** 2026-08-01
> **Task type:** planning (Opus 5 · Medium). Chưa code — chờ user chốt plan.
> **Quyết định user (2026-08-01):** (1) bỏ S1 "chờ duyệt" — ORG đồng ý là ẩn disclaimer; tick xanh chỉ khi ORG tự điều hành. (2) dùng **enum**. (3) **1 mô hình chung** cho cả nick seeding lẫn page seeding.

---

## 1. Bối cảnh

Hiện có 2 khái niệm seed rời nhau:

- **Nick seeding** — 10 tài khoản người (anime) do CINs vận hành, đăng bài autopilot, có KPI ngày + "bàn giao artist". Nhận diện bằng **allowlist slug** (`lib/noi-bo/danh-sach-nick-seed.ts`), *chưa* có cột DB.
- **Page seeding (trường/tổ chức)** — trang org CINs clone từ nguồn công khai. Hiển thị hiện tại **nhị phân**: `daVerify` → tick xanh, ngược lại → disclaimer `TruongSeedDisclaimerModal` ("Trang do CINs vận hành").

`daVerify` suy ra từ `org_to_chuc.trang_thai_tin_cay = 'verified_official'` **hoặc** `org_truong_dai_hoc.da_verify = true` (`lib/truong/queries.ts` §resolveTruongDaVerify).

**Vấn đề:** nhị phân gộp mất trạng thái giữa (ORG đã đồng ý nhưng CINs vẫn vận hành → phải ẩn disclaimer mà *chưa* có tick).

---

## 2. Mô hình chốt — 3 trạng thái, 1 enum riêng

`trang_thai_tin_cay` là trục **kiểm duyệt** (`binh_thuong · dang_review · bi_canh_bao · bi_cam · verified_official`) — **không** nhồi seed vào đây. Thêm enum riêng cho trục **seed/vận hành**:

### Enum `trang_thai_seed` (nullable)

| Giá trị | Ý nghĩa | Đối tượng |
|---|---|---|
| `NULL` | Không phải seed — chủ thể tự tạo từ đầu | mặc định mọi org/user thật |
| `clone` | CINs seed/clone, **chưa** được đồng ý | page CINs clone · nick autopilot |
| `duoc_duyet` | Chủ thể **đã đồng ý**, CINs vẫn vận hành hộ | — |
| `ban_giao` | Đã bàn giao — chủ thể **tự điều hành** | — |

### Quy tắc hiển thị (suy diễn, không thêm cột hiển thị)

| `trang_thai_seed` | Disclaimer "do CINs vận hành" | Tick xanh |
|---|---|---|
| `clone` | ✅ hiện | ❌ |
| `duoc_duyet` | ❌ ẩn | ❌ |
| `ban_giao` | ❌ ẩn | ✅ |
| `NULL` | ❌ | theo `verified_official` sẵn có |

- **Tick xanh** vẫn = `trang_thai_tin_cay = 'verified_official'` (tái dùng nguyên hạ tầng verify). Bước `ban_giao` **set kèm** `verified_official` + chuyển quyền sở hữu.
- **Disclaimer** đổi điều kiện: từ `!daVerify` → `trang_thai_seed === 'clone'`. Đây là thay đổi hành vi duy nhất ở UI page.

### Ánh xạ sang nick seeding (dùng chung enum)

| Enum | Page (org) | Nick (user) |
|---|---|---|
| `clone` | disclaimer trên trang | nhãn "Tham khảo" trên bài + marker profile; autopilot bật được |
| `duoc_duyet` | ẩn disclaimer | (tùy) giảm nhãn, artist đã đồng ý cho mượn mặt |
| `ban_giao` | tick xanh + đổi owner | trả tài khoản cho artist thật, tắt autopilot |

Allowlist slug hiện tại (`danh-sach-nick-seed.ts`) → thay dần bằng truy vấn `trang_thai_seed IN ('clone','duoc_duyet')` (giữ allowlist làm fallback env cho tới khi backfill xong).

---

## 3. Database

> **Convention repo:** dùng **text + CHECK** cho enum (vd. `auto_tai_khoan.loai`, `trang_thai_xin_phep`), **không** `CREATE TYPE`. `trang_thai_seed` cũng theo mẫu này.

> **Nick đã có sẵn lifecycle** trên `auto_tai_khoan`: `loai` (ai/clone), `trang_thai_xin_phep` (chua_lien_he/dang_cho/dong_y/tu_choi), `trang_thai_ban_giao` (dang_van_hanh/cho_ban_giao/da_ban_giao). → **Không thêm cột mới cho nick**; shared lib map 3 giá trị này về cùng 3 trạng thái hiển thị.

Chỉ **page (org)** cần cột mới:

```sql
ALTER TABLE public.org_to_chuc
  ADD COLUMN IF NOT EXISTS trang_thai_seed text;   -- NULL = không seed

ALTER TABLE public.org_to_chuc
  ADD CONSTRAINT org_to_chuc_trang_thai_seed_chk
  CHECK (trang_thai_seed IS NULL OR trang_thai_seed IN ('clone','duoc_duyet','ban_giao'));

CREATE INDEX IF NOT EXISTS idx_org_to_chuc_trang_thai_seed
  ON public.org_to_chuc (trang_thai_seed) WHERE trang_thai_seed IS NOT NULL;
```

**Ánh xạ nick → 3 trạng thái (shared lib, không cột mới):**

| Nick (`auto_tai_khoan`) | → `TrangThaiSeed` |
|---|---|
| `trang_thai_ban_giao = 'da_ban_giao'` | `ban_giao` |
| `trang_thai_xin_phep = 'dong_y'` (chưa bàn giao) | `duoc_duyet` |
| còn lại (đang vận hành) | `clone` |

**Backfill (page):** `trang_thai_seed = 'clone'` cho org có **`nguoi_tao` là tài khoản seeding** — creator có row `auto_tai_khoan` chưa bàn giao.

```sql
UPDATE public.org_to_chuc o SET trang_thai_seed = 'clone'
WHERE o.trang_thai_seed IS NULL
  AND EXISTS (
    SELECT 1 FROM public.auto_tai_khoan a
    WHERE a.id_nguoi_dung = o.nguoi_tao
      AND a.trang_thai_ban_giao <> 'da_ban_giao'
  );
```

**Quy tắc tạo mới (forward):** khi 1 org được tạo bởi tài khoản seeding → set `trang_thai_seed = 'clone'` ngay tại `lib/cong-dong/org-create.ts` / `lib/to-chuc/*-create.ts` (kiểm `nguoi_tao` có `auto_tai_khoan`). Không phụ thuộc backfill về sau. Helper: `laTaiKhoanSeed(db, userId)`.

**Metadata bàn giao (khuyến nghị, không bắt buộc MVP):** `seed_duoc_duyet_luc`, `seed_ban_giao_luc`, `seed_ghi_chu` để audit. Có thể để `cau_hinh` JSON nếu không muốn thêm cột.

File: `supabase/sql/migration_trang_thai_seed.sql` + runner `npm run migrate:trang-thai-seed`.

---

## 4. API / lib

Chuyển trạng thái đi qua **admin** (gate admin, service role) + tái dùng chat/inbox đã có cho phần "xin phép".

| Hành động | Từ → đến | Ai làm | Ghi chú |
|---|---|---|---|
| Đánh dấu seed | NULL → `clone` | admin / autopilot khi clone | |
| ORG đồng ý | `clone` → `duoc_duyet` | admin (sau khi org đồng ý qua chat) | ẩn disclaimer |
| Bàn giao | `duoc_duyet`/`clone` → `ban_giao` | admin | set kèm `verified_official` + gán owner + (nick) tắt autopilot |
| Thu hồi | `ban_giao` → `clone` | admin | gỡ `verified_official` |

- Lib dùng chung: `lib/seed/trang-thai-seed.ts` — helpers `laSeed()`, `hienDisclaimer()`, `hienTickXanh()`, `chuyenTrangThaiSeed()`. Cả page & nick import chung.
- Tái dùng `lib/admin/to-chuc-crud.ts` (đã có capVerified/goVerified) → mở rộng set `trang_thai_seed`.
- "Xin phép" giữ nguyên luồng chat CINs Official trong `TruongSeedDisclaimerModal` (không dựng endpoint mới cho MVP).

---

## 5. Frontend

1. **Truyền state xuống UI:** thêm `trangThaiSeed` vào `SchoolData`/`CongDongOrg` (thay vì chỉ `daVerify`). `resolveTruongDaVerify` giữ nguyên cho tick.
2. **Đổi gate disclaimer:** `components/truong/TruongSchoolSidebar.tsx` L84 `!daVerify` → `trangThaiSeed === 'clone'`.
3. **Generalize component:** đổi tên/di chuyển `TruongSeedDisclaimerModal` → `components/seed/SeedDisclaimerModal.tsx` nhận prop `kind: 'page' | 'nick'` để dùng cho cả trang org (`/to-chuc`, `/co-so-dao-tao`) lẫn profile nick. Giữ copy hiện tại cho page.
4. **Nick profile:** hiện marker nhỏ khi `clone` (đối xứng disclaimer page).

---

## 6. Các bước triển khai — TRẠNG THÁI (2026-08-01)

- **P1 — DB + lib nền** ✅ `supabase/sql/migration_trang_thai_seed.sql` (cột `org_to_chuc.trang_thai_seed` text+CHECK + backfill) · runner `npm run migrate:trang-thai-seed` · `lib/seed/trang-thai-seed.shared.ts` (display + map nick) · `lib/seed/trang-thai-seed.ts` (`laTaiKhoanSeed`) · forward rule trong 3 create (co-so/studio/cong-dong).
- **P2 — Page UI** ✅ `TruongSchoolSidebar` gate disclaimer bằng `trangThaiSeed === 'clone'` (thay `!daVerify`); `trangThaiSeed` xuyên qua `lib/truong/queries.ts` + `types.ts` (list + detail).
- **P3 — Admin transitions** ✅ select «Trạng thái seed» trong `AdminToChucEditModal` → `updateAdminToChuc` (couple `ban_giao` ⟺ `verified_official` + `da_verify`; thu hồi gỡ tick). Route PATCH `/api/admin/to-chuc/[id]` nhận `trangThaiSeed`. **Wire:** `AdminToChucEditModal` trước đây chưa được render ở đâu → đã gắn nút «Sửa» vào `AdminToChucScreen`.
- **Nav «Seeding»** ✅ Sidebar admin thêm mục **Seeding** = *Nick seeding* (`/admin/tai-khoan-ai`) + *Trang seeding* (`/admin/trang-seeding`). Trang seeding = `AdminToChucScreen seedOnly` (lọc `trang_thai_seed != null`, stats clone/được duyệt/bàn giao, badge trạng thái, sửa để chuyển state).
- **P4 — Nick** ✅ (qua shared lib) — `mapNickSangTrangThaiSeed` bắc cầu lifecycle `auto_tai_khoan` về cùng 3 trạng thái.
  **Chỉnh hướng có chủ đích:** **KHÔNG** thêm marker công khai «do CINs vận hành» trên profile nick. Nick seeding là persona artist giả để mồi nội dung — lộ ra sẽ phá vỏ bọc. Minh bạch nick vẫn qua nhãn bài **«Tham khảo»** (đã có). Allowlist slug là quyền-đăng (orthogonal) → giữ nguyên. Bàn giao nick vẫn dùng RPC `ban_giao_tai_khoan_clone` (xóa row roster → hết autopilot tự nhiên).

---

## 7. Edge cases / quyết định

1. **Tiêu chí page `clone`** ✅ *(chốt 2026-08-01):* page được tạo từ **tài khoản seeding** → tính là clone. Xác định qua `org_to_chuc.nguoi_tao` là seed. Không cần cột riêng "CINs clone".
2. **ORG từ chối / đòi gỡ trang** ✅ *(chốt 2026-08-01):* **soft delete** org (dùng `trang_thai_hoat_dong` lifecycle sẵn có) — **không** thêm state enum thứ 4. `trang_thai_seed` giữ đúng 3 giá trị.
3. **Tranh chấp (nhiều đơn vị đòi 1 trường):** ai được bàn giao? → quy trình admin thủ công, ngoài scope MVP.
4. **`duoc_duyet` mà không có dấu hiệu gì** → visitor không phân biệt với org thật. User đã chốt "ẩn" — chấp nhận đánh đổi minh bạch.
5. **enum type vs text+CHECK:** khớp convention `trang_thai_tin_cay` thật trong DB (đọc trực tiếp khi build P1).

---

## 8. Security

- Đổi `trang_thai_seed` chỉ qua **admin/service role** — không cho client tự set (nếu không sẽ tự gỡ disclaimer/giả tick).
- RLS: cột đọc công khai (để render), ghi chỉ service role — theo mẫu `trang_thai_tin_cay` hiện có.
- Bàn giao phải kiểm tra owner mới hợp lệ trước khi set `verified_official`.

---

## 9. Ghi chú tài liệu

Sau khi duyệt plan: chốt quyết định vào `docs/CINS_DECISIONS.md` (mô hình seed 3-state, enum dùng chung), cập nhật router nếu cần (`docs/CINS_INSTRUCTION.md`).
