# PLAN — Bộ giáo trình + module bài tập (MM, thuộc tính theo bộ)

> **Phase 6 (Giáo trình trong chat lớp + Quản lý học viên): xem §11 — đang chờ chốt §11.12.**
> **Trạng thái:** Phase 1–4 đã ship (2026-08-04) · Phase 5 dọn legacy còn lại
> **Phạm vi:** CSĐT `/co-so/[slug]/quan-ly/giao-trinh` + trang khóa công khai.
> **ALTER §7:** đã chạy `npm run migrate:bo-giao-trinh` (verify: 3 bộ · 35 gán · 3 khóa).
> **Chốt §10:** enum 8 value · 1 khóa ↔ 1 bộ · `mo_ta` + `yeu_cau` · mỗi CSĐT tự tạo · không ẩn/hiện.

---

## 1. Vấn đề & mục tiêu

**Hiện trạng.** Bài tập gắn cứng vào khóa: `org_bai_tap.id_khoa_hoc NOT NULL`. Tab Giáo trình = "chọn khóa → sửa list bài tập của khóa đó" (`GiaoTrinhQuanLyClient` + `PUT …/khoa-hoc/[khoaId]/bai-tap` xóa-rồi-insert lại toàn bộ). `org_giao_trinh` là bảng legacy (không còn feed UI khách). Muốn dùng cùng một bài ở 2 khóa → phải nhập lại 2 lần, và không có cách nói "bài này là lý thuyết ở khóa A nhưng tham khảo ở khóa B".

**Mục tiêu.**

1. **Module bài tập** là thực thể độc lập cấp org (thư viện dùng lại): Tên · Nội dung · Yêu cầu · Video YouTube (+ thumbnail đã có).
2. **Bộ giáo trình** là thực thể có tên riêng; gán N module vào.
3. **MM**: 1 module nằm trong nhiều bộ.
4. **Thuộc tính theo cặp (module × bộ)**: «Phối cảnh» = *bài tập* ở bộ Hình họa, *lý thuyết* ở bộ Bố cục màu, *tham khảo* ở bộ Trang trí màu.

---

## 2. Database

### 2.1 Bảng mới

**`org_bo_giao_trinh`** — bộ giáo trình cấp org (không thuộc khóa).

| column | type | null | default | ghi chú |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `id_to_chuc` | uuid | NO | | FK `org_to_chuc.id` ON DELETE CASCADE |
| `ten_bo` | text | NO | | «Hình họa», «Bố cục màu» |
| `mo_ta` | text | YES | | giới thiệu ngắn |
| `thu_tu` | int4 | NO | `0` | sort trong tab quản lý |
| `tao_luc` | timestamptz | NO | `now()` | |
| `cap_nhat_luc` | timestamptz | NO | `now()` | |

Index: `(id_to_chuc, thu_tu)`. Unique: `(id_to_chuc, lower(ten_bo))` — chặn trùng tên trong cùng org. **Không** cột `visible` — xóa bộ = hard delete.

**`org_giao_trinh_bai`** — junction MM + thuộc tính + thứ tự **theo bộ**.

| column | type | null | default | ghi chú |
|---|---|---|---|---|
| `id_bo` | uuid | NO | | FK `org_bo_giao_trinh.id` ON DELETE CASCADE |
| `id_bai_tap` | uuid | NO | | FK `org_bai_tap.id` ON DELETE CASCADE |
| `thuoc_tinh` | `loai_bai_giao_trinh_enum` | NO | `'bai_tap'` | thẻ theo cặp — điểm cốt lõi |
| `thu_tu` | int4 | NO | `0` | thứ tự trong bộ |
| `ghi_chu` | text | YES | | note riêng của bộ (tùy chọn) |

PK cặp `(id_bo, id_bai_tap)` → tự chặn gán trùng. Index `(id_bo, thu_tu)`, `(id_bai_tap)` (đếm "bài này đang dùng ở mấy bộ"). **Không** cột `visible` trên junction — muốn ẩn = bỏ gán khỏi bộ.

**Enum mới `loai_bai_giao_trinh_enum`** (cố định, không tự tạo thẻ):

| value | Label UI | Ý nghĩa |
|---|---|---|
| `bai_tap` | Bài tập | Học viên làm / nộp |
| `ly_thuyet` | Lý thuyết | Kiến thức / bài giảng |
| `tham_khao` | Tham khảo | Tài liệu phụ, không bắt buộc |
| `demo` | Demo | GV làm mẫu / clip hướng dẫn |
| `bai_mau` | Bài mẫu | Tác phẩm mẫu để xem |
| `kiem_tra` | Kiểm tra | Kiểm tra / thi |
| `du_an` | Dự án | Project cuối khóa |
| `on_tap` | Ôn tập | Ôn trước kiểm tra |

Enum **mới hoàn toàn** → không thuộc gate ALTER. Thêm value sau bằng `ALTER TYPE … ADD VALUE IF NOT EXISTS`.

### 2.2 ALTER trên bảng live (cần user xác nhận — §7)

`org_bai_tap` (thành thư viện module cấp org):

| thay đổi | lý do | ảnh hưởng dữ liệu cũ |
|---|---|---|
| **+ `id_to_chuc uuid`** (NULL → backfill → NOT NULL) | module thuộc org, không thuộc khóa | backfill từ `org_khoa_hoc.id_to_chuc` qua `id_khoa_hoc` |
| **`id_khoa_hoc` bỏ NOT NULL** | module mới không cần khóa | row cũ giữ nguyên giá trị (pointer legacy, ngừng ghi) |
| **+ `yeu_cau text NULL`** | field «Yêu cầu bài» | không ảnh hưởng |

`org_khoa_hoc`:

| thay đổi | lý do | ảnh hưởng |
|---|---|---|
| **+ `id_bo_giao_trinh uuid NULL`** FK `org_bo_giao_trinh.id` ON DELETE SET NULL | khóa chọn 1 bộ để hiện cho khách | backfill từ bộ sinh tự động (§2.4) |

Giữ nguyên (không rename, không drop trong Phase 1):
- `org_bai_tap.mo_ta` = **«Nội dung bài tập»** (chỉ đổi label UI). Thêm `yeu_cau` = «Yêu cầu bài».
- `org_bai_tap.thu_tu` → ngừng ghi mới; thứ tự hiển thị lấy từ junction. Cột `visible` trên `org_bai_tap` **giữ schema** (tránh ALTER DROP) nhưng UI/API mới **không** expose toggle ẩn/hiện — xóa module = hard delete (có guard §6).
- `org_khoa_hoc.bai_tap_hien_thi` (`an`/`mot_phan`/`day_du`) **giữ** — đây là chế độ section trang khóa (ẩn cả khối / hiện 2 bài / đầy đủ), không phải toggle từng bài.
- `org_bai_tap.id_giao_trinh`, toàn bộ `org_giao_trinh` → **legacy**, không đọc/ghi thêm. Dọn ở phase riêng.

### 2.3 Quan hệ tổng thể

```
org_to_chuc ─┬─< org_bai_tap            (thư viện module)
             └─< org_bo_giao_trinh      (bộ có tên)
                        │
        org_giao_trinh_bai (MM: id_bo × id_bai_tap + thuoc_tinh + thu_tu)
                        │
org_khoa_hoc.id_bo_giao_trinh ──> org_bo_giao_trinh   (1 khóa chọn 1 bộ)
```

### 2.4 Migration + backfill

File `supabase/sql/migration_org_bo_giao_trinh.sql` (idempotent, `IF NOT EXISTS` xuyên suốt) + runner `scripts/run-bo-giao-trinh-migration.mjs` (theo pattern `run-user-gallery-noi-bat-migration.mjs`).

Thứ tự trong 1 transaction:

1. `CREATE TYPE loai_bai_giao_trinh_enum` (guard `IF NOT EXISTS` qua `pg_type`).
2. `CREATE TABLE org_bo_giao_trinh`, `org_giao_trinh_bai` + index.
3. `ALTER org_bai_tap ADD COLUMN IF NOT EXISTS id_to_chuc`, `yeu_cau`.
4. Backfill `org_bai_tap.id_to_chuc` từ `org_khoa_hoc`; row mồ côi (khóa đã xóa) → xóa hoặc log rồi bỏ qua.
5. `ALTER org_bai_tap ALTER COLUMN id_to_chuc SET NOT NULL`, `ALTER COLUMN id_khoa_hoc DROP NOT NULL`.
6. `ALTER org_khoa_hoc ADD COLUMN IF NOT EXISTS id_bo_giao_trinh` + FK.
7. **Backfill bộ:** mỗi khóa đang có ≥1 `org_bai_tap` → tạo `org_bo_giao_trinh` (`ten_bo` = tên khóa, dedupe bằng suffix nếu trùng) → insert junction (`thuoc_tinh='bai_tap'`, `thu_tu` = `org_bai_tap.thu_tu`; bỏ qua row `visible=false` cũ — coi như đã xóa) → set `org_khoa_hoc.id_bo_giao_trinh`.
8. Verify: mọi bài `visible=true` cũ có đúng 1 junction; mọi khóa từng có bài đều trỏ tới 1 bộ.

Chạy lại lần 2 không sinh bộ trùng (guard: chỉ backfill khi `org_khoa_hoc.id_bo_giao_trinh IS NULL`).

---

## 3. Lib (server)

| File | Việc |
|---|---|
| `lib/to-chuc/bai-tap-module.ts` **mới** | CRUD thư viện module cấp org: `listBaiTapModule(orgId, {q, page})` (pagination `.range`, kèm `soBoDangDung` từ junction), `createBaiTapModule`, `updateBaiTapModule`, `deleteBaiTapModule` (guard §6) |
| `lib/to-chuc/bo-giao-trinh.ts` **mới** | `listBoGiaoTrinh(orgId)`, `createBoGiaoTrinh`, `updateBoGiaoTrinh`, `deleteBoGiaoTrinh`, `fetchBoGiaoTrinhChiTiet(boId)` (join junction + module trong **1** query embed), `syncBoGiaoTrinhBai(boId, items[])` (upsert + delete diff — **không** xóa sạch rồi insert như hiện tại) |
| `lib/to-chuc/giao-trinh-quan-ly.ts` | Giữ export cũ tạm cho compat; đánh dấu deprecated, chuyển dần sang 2 file trên |
| `lib/to-chuc/bai-tap-khoa.ts` | `fetchBaiTapKhoa(khoaId)` đọc qua `org_khoa_hoc.id_bo_giao_trinh` → junction (fallback `id_khoa_hoc` legacy nếu khóa chưa có bộ). Trả thêm `thuocTinh`. Không lọc `visible` junction (không còn cột). `syncBaiTapKhoa` (PUT cũ) → deprecate |
| `lib/to-chuc/khoa-hoc-types.ts` | `BaiTapKhoaData` + `thuocTinh: LoaiBaiGiaoTrinh`, `yeuCau: string \| null` (bỏ phụ thuộc UI vào `visible` trên card quản lý); types `BoGiaoTrinhData`, `BoGiaoTrinhBaiData`, `LOAI_BAI_GIAO_TRINH_LABEL` |
| `lib/to-chuc/khoa-lop-xoa.ts` | Cảnh báo xóa khóa: bài tập **không còn** thuộc khóa → đổi thành cảnh báo "khóa đang dùng bộ X" (không chặn, không xóa module) |

Quyền: dùng lại `getCoSoModuleQuyen(orgId, actorId, vaiTro, "khoa-lop")` như route giáo trình hiện tại (`an` → 403, `sua` mới được ghi).

---

## 4. API

| Route | Method | Việc |
|---|---|---|
| `/api/co-so/[id]/bai-tap` | GET | thư viện module (search + pagination + `soBoDangDung`) |
| | POST | tạo module (Tên · Nội dung · Yêu cầu · Video · thumbnail) |
| `/api/co-so/[id]/bai-tap/[baiId]` | PATCH | sửa module |
| | DELETE | xóa module — 409 + danh sách bộ nếu đang được dùng (`?force=1` để bỏ gán rồi xóa) |
| `/api/co-so/[id]/bo-giao-trinh` | GET | list bộ + số bài + khóa đang dùng |
| | POST | tạo bộ (`tenBo`) |
| `/api/co-so/[id]/bo-giao-trinh/[boId]` | GET | chi tiết bộ + bài đã gán (kèm `thuocTinh`, `thuTu`) |
| | PATCH | đổi tên / mô tả / `thuTu` |
| | DELETE | xóa bộ — cảnh báo nếu khóa đang trỏ (FK SET NULL) |
| `/api/co-so/[id]/bo-giao-trinh/[boId]/bai` | PUT | sync danh sách gán: `[{ baiTapId, thuocTinh, thuTu }]` |
| `/api/co-so/[id]/khoa-hoc/[khoaId]/bo-giao-trinh` | PATCH | gán bộ cho khóa (`{ boId \| null }`) |
| `/api/co-so/[id]/khoa-hoc/[khoaId]/bai-tap` | GET | **giữ** (public đọc, giờ resolve qua bộ) |
| | PUT | **deprecate** — 410 sau khi UI chuyển xong; PATCH `displayMode` giữ nguyên |

---

## 5. Frontend

### 5.1 Tab quản lý `/quan-ly/giao-trinh` — `GiaoTrinhQuanLyClient`

Bỏ select "chọn khóa" làm trục chính. Hai khối trong `cso-dt-stack` (giữ token/class `cso-*` sẵn có, không tạo hệ màu mới):

**A. Thư viện bài tập** — grid/list module toàn org: thumbnail · tên · badge "đang dùng ở N bộ" · nút Sửa / Xóa · search + phân trang. **Không** toggle Eye/ẩn. Nút «Thêm bài tập» mở lại `GiaoTrinhBaiTapPanel` với 4 field: Tên · **Nội dung bài tập** (`mo_ta`) · **Yêu cầu bài** (`yeu_cau`, mới) · Video YouTube (+ thumbnail như cũ).

**B. Bộ giáo trình** — list bộ (tên · số bài · khóa đang dùng). Chọn 1 bộ → panel gán bài:
- picker chọn từ thư viện (multi-select, ẩn bài đã có trong bộ),
- mỗi dòng đã gán: select **thuộc tính** (theo enum đã chốt) · kéo sắp thứ tự · bỏ gán,
- lưu = `PUT …/bo-giao-trinh/[boId]/bai` (optimistic + rollback theo pattern `persistBaiTapList` hiện tại).

**C. Gán bộ cho khóa** — mỗi khóa 1 select "Bộ giáo trình" + giữ control `displayMode` (`an` / `mot_phan` / `day_du`) — chế độ section trang khóa, không phải ẩn từng bài.

### 5.2 Trang khóa công khai — `KhoaHocDetailView` / `BaiTapVisitorSection`

- Nguồn = bộ của khóa (mọi bài đã gán đều hiện; không còn filter `visible` từng bài).
- Nhóm theo `thuocTinh` (thứ tự enum), trong nhóm sort `thu_tu`. Badge thuộc tính trên `BaiTapKhoaCard`.
- `displayMode` `mot_phan` giữ logic overlay sau `BAI_TAP_PARTIAL_VISIBLE_COUNT`.
- Inline add trên trang khóa (`GiaoTrinhBaiTapPanel` trong `KhoaHocDetailView`): tạo module **và** tự gán vào bộ của khóa (nếu khóa chưa có bộ → tạo bộ tên = tên khóa rồi gán).

---

## 6. Edge cases

| Case | Xử lý |
|---|---|
| Xóa module đang ở N bộ | 409 + danh sách bộ; `?force=1` → xóa junction rồi xóa module (confirm dialog rõ ràng) |
| Xóa bộ đang gắn khóa | Cảnh báo tên khóa; xóa → FK `SET NULL`, khóa về trạng thái "chưa có giáo trình" (khách thấy section rỗng, không 500) |
| Gán trùng module trong 1 bộ | PK cặp chặn; API dedupe trước upsert |
| Khóa chưa có bộ nhưng có bài legacy | `fetchBaiTapKhoa` fallback `id_khoa_hoc` (giữ đến khi verify backfill xong, rồi gỡ) |
| Đổi thuộc tính ở bộ A | Không ảnh hưởng bộ B — thuộc tính nằm trên junction, đây là yêu cầu gốc |
| `thu_tu` trùng sau kéo thả | Server chuẩn hóa lại `index + 1` khi sync (như `syncBaiTapKhoa` đang làm) |
| Enum thuộc tính cần thêm loại mới | `ALTER TYPE … ADD VALUE IF NOT EXISTS` + label map ở `khoa-hoc-types.ts` |
| Module mồ côi (khóa cũ đã xóa) | Migration bước 4 log + bỏ qua, không làm fail transaction |
| Row cũ `org_giao_trinh` | Không đọc; xóa ở phase dọn riêng sau khi bộ chạy ổn |

---

## 7. Inventory ALTER — **đã duyệt 2026-08-04** (user: «chốt, chạy build»)

| Bảng | Thay đổi | Rủi ro |
|---|---|---|
| `org_bai_tap` | `+ id_to_chuc uuid NOT NULL` (backfill), `+ yeu_cau text NULL`, `id_khoa_hoc` DROP NOT NULL | Thấp — thêm cột + nới constraint, không mất dữ liệu. Code cũ ghi `id_khoa_hoc` vẫn chạy |
| `org_khoa_hoc` | `+ id_bo_giao_trinh uuid NULL` FK SET NULL | Thấp — cột nullable |
| *(mới)* | `CREATE TYPE loai_bai_giao_trinh_enum`, `CREATE TABLE org_bo_giao_trinh`, `org_giao_trinh_bai` | Không gate |

Ghi vào `CINS_DECISIONS.md` LOG. Migration: `npm run migrate:bo-giao-trinh`.

---

## 8. Security & performance checklist

- Mọi route ghi: session → `getViewerCoSoVaiTro` → `getCoSoModuleQuyen(…, "khoa-lop")` phải `sua`; đọc thư viện cần ≥ `xem`. Public chỉ qua route khóa (đã public sẵn).
- Không `select('*')`; thư viện module dùng `.range()` + `count: 'exact'`.
- Chi tiết bộ lấy junction + module bằng **1** query embed (tránh N+1); trang khóa 1 query theo `id_bo`.
- Ghi nhiều bảng (tạo bộ + gán bài, force delete) → RPC/transaction, không chuỗi request rời.
- Migration idempotent, không sửa DB tay. Không log PII.
- `video_youtube_url`: validate host YouTube ở server (không nhúng URL tùy ý).
- UI: `next/link` cho link nội bộ, loading state + confirm cho action phá hủy, empty state có hướng dẫn.

---

## 9. Các bước (mỗi phase = 1 brief riêng)

| Phase | Nội dung | Model đề xuất |
|---|---|---|
| **0** | User chốt §10 + duyệt inventory ALTER §7 | — |
| **1** | SQL migration + runner + backfill + verify query | Grok 4.5 / Medium |
| **2** | Lib + API (module CRUD, bộ CRUD, sync gán, gán bộ cho khóa) | Grok 4.5 / Medium |
| **3** | UI tab quản lý (thư viện + bộ + gán) | Grok 4.5 / Medium |
| **4** | Trang khóa công khai (nhóm theo thuộc tính, badge, fallback) | Composer 2.5 / Low–Medium |
| **5** | Dọn legacy (`org_giao_trinh`, PUT cũ → 410, gỡ fallback) + cập nhật `CINS_IMPLEMENTATION.md` §API/§CSĐT + `CINS_DECISIONS.md` | Composer 2.5 / Low |

---

## 10. Quyết định đã chốt + còn treo

### Đã chốt (2026-08-04)

| # | Quyết định |
|---|---|
| 1 | Thuộc tính = **enum cố định** 8 value: `bai_tap` · `ly_thuyet` · `tham_khao` · `demo` · `bai_mau` · `kiem_tra` · `du_an` · `on_tap`. |
| 2 | **1 khóa học ↔ 1 bộ giáo trình** (`org_khoa_hoc.id_bo_giao_trinh`). |
| 3 | Gọn: reuse `mo_ta` = Nội dung + thêm `yeu_cau` = Yêu cầu. Không rename cột. |
| 4 | **Mỗi CSĐT tự tạo giáo trình riêng** (`id_to_chuc` bắt buộc). Không chia sẻ bộ giữa các org. |
| 5 | **Không** chức năng ẩn/hiện từng bài / từng bộ. Không cột `visible` trên junction / bộ. Xóa = hard delete (+ guard). Giữ `bai_tap_hien_thi` trên khóa (chế độ section). |

### Giải thích nhanh câu 4 (đã chốt = không chia sẻ)

«Bộ dùng chung nhiều org» = một bộ giáo trình dùng chung cho nhiều CSĐT. **Không làm** — mỗi CSĐT có thư viện bài + bộ riêng.

### Gate Phase 1

ALTER §7 + enum §10.1 đã chốt → chạy `npm run migrate:bo-giao-trinh`.

---
---

# §11. Phase 6 — Giáo trình học viên trong chat lớp + Quản lý học viên + Lưu bài → Journey

> **Trạng thái:** BUILD đang ship (2026-08-04). Migration đã chạy. Q1–Q11 chốt. UI side panel + API + lib đã có; còn polish / wire lens trang khóa (§11.13 bước 6.7).
> **Tham chiếu:** `cursor_brief_csdt_van_hanh_hoc.md` (L34) · `CINS_FOUNDATIONS.md` §K/§V (verify) · §1–§10 ở trên (bộ giáo trình).

## 11.1 Mục tiêu

Biến **phòng chat lớp** thành nơi học: học viên (HV) thấy giáo trình của mình với trạng thái mở/khóa; giáo viên (GV) mở bài cho từng HV; HV nộp bài trong chat; GV **Lưu bài**; HV được mời **Đăng Journey** và bài đó **tự động mang xác thực của trung tâm**.

Vòng đời một bài, nhìn theo trạng thái dữ liệu:

```
GV mở bài            → org_tien_do_bai_mo (mo_luc)        → tin system «mo_bai»
HV nộp trong chat    → org_nop_bai (cho_duyet)            → tin chat gốc giữ media
GV duyệt             → org_nop_bai (dat | lam_lai)
GV Lưu bài           → org_nop_bai.luu_luc                → tin system «luu_bai»
HV Đăng Journey      → content_cot_moc + verify (da_duyet) → lens Sản phẩm học viên
```

Bốn hành động của GV (mở bài · duyệt · lưu bài · mở bài kế) đều đứng trong side panel «Quản lý học viên» hoặc trên chính bong bóng tin nhắn — không rời chat.

## 11.2 Hiện trạng đã có / còn thiếu

| Mảnh | Trạng thái |
|---|---|
| Phòng lớp (`chat_phong.loai_phong='lop_hoc'`, `org_lop_hoc.id_chat_phong`) | ✅ `lib/co-so/lop-chat-phong.ts` |
| Phân biệt staff vs HV trong phòng + freeze kỳ học | ✅ `lib/co-so/lop-room-access.ts` (`isStaff`, `frozen`, `canSend`) |
| Side panel theo thread (`pin` · `mocs` · `canvas`) | ✅ `CinsChatOverlay.tsx` — union `ChatSidePanel` (L319), `SIDE_PANEL_ORDER` (L369), pattern panel: `ChatRoomMocsPanel` (L5530) |
| Tin hệ thống trong phòng (`loai_tin='system'` + `ngu_canh`) | ✅ mẫu `chao_lop` (`lop-chat-phong.ts` L335), `moc`, `canvas_binh_luan` |
| Bộ giáo trình + module + thuộc tính | ✅ §1–§10 |
| Nộp bài (API) | ✅ `POST /api/chat/rooms/[roomId]/nop-bai` (nhận `tinNhanId`, tự lấy `id_dinh_kem` làm media) |
| Duyệt bài (API + lib) | ✅ `duyetNopBai`, `listNopBaiChoDuyet` |
| Đăng Journey không qua form | ✅ `dangBaiJourneyChoUser()` (`lib/editor/dang-bai-journey.ts`) |
| Verify org cho tác phẩm | ✅ `verify_yeu_cau` + `verify_xac_nhan` (`lib/journey/org-milestone-tag.ts`) |
| **UI nộp bài trong chat** | ❌ chưa có (grep `nop-bai` trong overlay = 0) |
| **UI giáo trình cho HV** | ❌ chưa có (HV chỉ thấy trang khóa công khai) |
| **UI quản lý HV trong chat** | ❌ `PedagogyQuanLyClient.tsx` tồn tại nhưng **orphan**, chưa mount route nào |
| **Lịch sử mở từng bài** | ❌ `org_tien_do_bai` `UNIQUE(id_hoc_vien_lop)` — chỉ 1 con trỏ, không biết bài nào đã mở trước đó |
| **Lưu bài → Journey** | ❌ chưa có khái niệm |

### Hai bug phải sửa trước khi build (không phải "nice to have")

1. **`ganTienDoBai` chặn mọi module mới.** Guard `bai.id_khoa_hoc !== khoa.id` (`nop-bai.ts` L226) — sau §2.2 thì `org_bai_tap.id_khoa_hoc` nullable, module thuộc org. Mọi bài tạo theo mô hình bộ → lỗi «Bài tập không thuộc khóa». Sửa: validate qua `id_to_chuc` **và** junction `org_giao_trinh_bai` với bộ của khóa.
2. **Mở bài đang spam timeline công khai.** `ganTienDoBai` insert `org_bai_dang` (`loai_bai_dang:'thong_bao'`, `trang_thai:'da_dang'`) — mỗi lần mở bài cho 1 HV là **một bài đăng công khai của tổ chức**. Phải bỏ, thay bằng tin `system` trong phòng lớp (§11.7).
3. Phụ: `listBaiTapCuaKhoa` (L265) vẫn đọc `id_khoa_hoc` + `visible` → thay bằng đọc theo bộ.

## 11.3 Vai trò & quyền

| Chủ thể | Nguồn | Trong phòng lớp thấy | Được làm |
|---|---|---|---|
| **Học viên** | `user_hoc_vien_lop` (theo `id_lop_hoc`) | Panel **Giáo trình** (của chính mình) | Xem bài đã mở · Nộp bài · Đăng Journey (khi bài đã lưu) |
| **Giáo viên phụ trách** | `org_lop_hoc.giao_vien_phu_trach` = viewer | Panel **Quản lý học viên** | Mở bài · Duyệt · Lưu bài · (mở panel Giáo trình ở chế độ xem theo HV) |
| **Giáo viên khác / nhân viên** | `vai_tro='giao_vien' \| 'nhan_vien'` | Quản lý học viên | Theo `getCoSoModuleQuyen(orgId, …, "hoc-vien")`: `sua` → làm được, `xem` → read-only |
| **Tư vấn viên** | `vai_tro='quan_ly_tuyen_sinh'` | Quản lý học viên | **Read-only** (đề xuất — câu Q6) |
| **owner / admin** | founder tier | Cả hai | Toàn quyền |

Nguyên tắc: **không** tạo hệ quyền mới. Mở rộng `getLopRoomAccess()` trả thêm cờ, overlay chỉ đọc cờ:

```ts
// lib/co-so/lop-room-access.ts — thêm vào LopRoomAccess
hocVienLopId: string | null;   // HV: enrollment của chính mình
isGiaoVienPhuTrach: boolean;
canQuanLyHocVien: boolean;     // mở panel Quản lý học viên
canGanTienDo: boolean;         // mở bài / duyệt / lưu bài (ghi)
```

Lý do gộp vào `lop-access`: overlay đã fetch route này khi mở phòng lớp (`CinsChatOverlay.tsx` L2684) → **0 request thêm** cho việc quyết định hiển thị tab nào.

## 11.4 Database

### 11.4.1 Bảng mới `org_tien_do_bai_mo` — lịch sử mở từng bài

Lý do không dùng con trỏ đơn: giáo trình có nhiều `thuoc_tinh` và thứ tự theo bộ; GV cần mở **tập hợp** bài (mở bài 5 khi bài 4 còn làm lại), cần biết **mở lúc nào / ai mở** để render timeline và chống gửi trùng tin chúc mừng. Suy "đã mở = `thu_tu` ≤ con trỏ" chỉ đúng nếu lộ trình tuyệt đối tuyến tính — không phải giả định an toàn.

| column | type | null | default | ghi chú |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `id_hoc_vien_lop` | uuid | NO | | FK `user_hoc_vien_lop.id` ON DELETE CASCADE |
| `id_bai_tap` | uuid | NO | | FK `org_bai_tap.id` ON DELETE CASCADE |
| `id_nguoi_gan` | uuid | YES | | FK `user_nguoi_dung.id` ON DELETE SET NULL |
| `mo_luc` | timestamptz | NO | `now()` | |
| `id_tin_nhan` | uuid | YES | | FK `chat_tin_nhan.id` ON DELETE SET NULL — tin `system` đã gửi (chống gửi trùng) |

Unique `(id_hoc_vien_lop, id_bai_tap)` · index `(id_hoc_vien_lop, mo_luc DESC)`.

**`org_tien_do_bai` giữ nguyên** làm con trỏ "bài hiện tại" (`nopBaiHienTai` đang phụ thuộc, `UNIQUE(id_hoc_vien_lop)`) → **không ALTER bảng live**. Mở bài = insert vào bảng mới **+** upsert con trỏ. Về sau nếu muốn nộp bài chỉ định bài cụ thể thì đổi ở Phase riêng.

### 11.4.2 ALTER `org_khoa_hoc` — toggle đồng bộ tiến độ (chốt Q3)

| thay đổi | lý do | rủi ro |
|---|---|---|
| `+ dong_bo_tien_do boolean NOT NULL DEFAULT false` | Khóa học theo buổi chung vs mỗi HV một tiến độ | Thấp — default `false` = từng người |

**Hành vi khi `dong_bo_tien_do = true`:**

1. GV mở bài → fan-out `org_tien_do_bai_mo` (+ con trỏ) cho **mọi** enrollment đang `id_lop_hoc` của lớp (không chỉ 1 HV).
2. HV mới ghi danh vào lớp → **copy** mọi `id_bai_tap` đã mở trong lớp (union từ `org_tien_do_bai_mo` của các HV cùng lớp) → thấy đúng «bài hiện tại mọi người đang theo» (Q5).
3. Panel HV vẫn đọc `org_tien_do_bai_mo` của chính mình — sau copy thì trùng lớp.

Khi `false`: mở bài theo từng HV (hoặc bulk chọn tay), không auto-copy khi join.

Bản chất: **1 khóa ↔ 1 bộ giáo trình**; toggle chỉ đổi *ai cùng tiến độ*, không đổi bộ.

### 11.4.3 ALTER `org_nop_bai` — đã duyệt (§11.12 Q1)

| thay đổi | lý do | rủi ro |
|---|---|---|
| `+ luu_luc timestamptz NULL` | GV bấm «Lưu bài» | Thấp — cột nullable |
| `+ id_nguoi_luu uuid NULL` FK `user_nguoi_dung.id` SET NULL | ai lưu | Thấp |
| `+ id_cot_moc uuid NULL` FK `content_cot_moc.id` SET NULL | Journey đã tạo từ bài này | Thấp |
| `+ dang_journey_luc timestamptz NULL` | thời điểm HV đăng | Thấp |

Index partial `(id_hoc_vien_lop) WHERE luu_luc IS NOT NULL AND id_cot_moc IS NULL` → query "bài chờ HV đăng Journey" rẻ.

**Không** thêm value vào `org_trang_thai_nop_bai_enum`. «Lưu bài» **trực giao** với duyệt: `dat` = đạt yêu cầu học; `luu_luc` = đủ chất lượng làm portfolio. Một bài có thể `dat` mà không lưu.

### 11.4.4 Không cần bảng mới cho verify

Tái dùng đúng luồng đang chạy: `verify_yeu_cau` (`trang_thai='da_duyet'`, `noi_dung` = payload `org_milestone_tag_v1` có `khoaHocId`) + `verify_xac_nhan` (`trang_thai='da_xac_nhan'`, `loai_nguoi_xac_nhan='to_chuc'`). Lens «Sản phẩm học viên» (`listApprovedOrgDoanProjects`) đọc `verify_yeu_cau` → bài HV tự động lên lens, **0 code lens mới**.

Đồng thời **sửa gap** đã ghi ở khảo sát: ghi cả `content_cot_moc.id_khoa_hoc` + `id_lop_hoc` (FOUNDATIONS K1 yêu cầu, code org-tag hiện bỏ trống).

## 11.5 Lib (server)

| File | Việc |
|---|---|
| `lib/co-so/tien-do-bai.ts` **mới** | `listGiaoTrinhChoHocVien(hocVienLopId)` → bài của bộ (khóa của ghi danh) + `daMo` / `moLuc` / `nopBai` gần nhất, **1–2 query** (bộ→junction→module embed, rồi map tiến độ + nộp bài). `moBaiChoHocVien({orgId, hocVienLopId, baiTapIds[], actorId})` (idempotent, bulk, trả bài nào thực sự mới mở). `moBaiChoLop({lopId, baiTapIds[]})` (fan-out theo enrollment). `listTienDoLop(lopId)` → ma trận HV × bài cho panel GV (1 query theo `in(id_hoc_vien_lop)`). |
| `lib/co-so/nop-bai.ts` | **Sửa bug** guard §11.2. `luuBaiNop({orgId, nopId, actorId})` → set `luu_luc` + `id_nguoi_luu` + tin system `luu_bai`. `boLuuBaiNop` (undo, chặn khi đã có `id_cot_moc`). Bỏ insert `org_bai_dang`. |
| `lib/co-so/nop-bai-journey.ts` **mới** | `dangJourneyTuBaiNop({nopId, viewerId, cheDo})` — §11.8. Ghi nhiều bảng → **RPC/transaction**, không chuỗi request. |
| `lib/co-so/lop-room-access.ts` | Thêm 4 cờ §11.3 (`hocVienLopId`, `isGiaoVienPhuTrach`, `canQuanLyHocVien`, `canGanTienDo`) — dùng lại `getCoSoModuleQuyen(…, "hoc-vien")` |
| `lib/co-so/lop-chat-phong.ts` | Thêm helper `guiTinHeThongLop({roomId, actorId, nguCanh, noiDung})` — gom pattern insert tin `system` (đang lặp ở `chao_lop`, `moc`) |
| `lib/chat/types.ts` | `ngu_canh` types mới: `mo_bai`, `nop_bai`, `luu_bai`, `journey_da_dang` (§11.7) |

## 11.6 API

| Route | Method | Việc |
|---|---|---|
| `/api/chat/rooms/[roomId]/giao-trinh` | GET | HV: giáo trình của mình. Staff: `?hocVienLopId=` để xem theo HV |
| `/api/chat/rooms/[roomId]/tien-do` | GET | Staff: ma trận HV × bài + số bài chờ duyệt |
| | POST | Staff mở bài: `{ hocVienLopId \| "all", baiTapIds[] }` → cần `canGanTienDo` |
| `/api/chat/rooms/[roomId]/nop-bai` | POST | **giữ** (đã có). Thêm: trả `nopId` + bắn tin system `nop_bai` |
| | PATCH | Staff duyệt / lưu bài: `{ nopId, action: "duyet" \| "luu" \| "bo_luu", trangThai?, diem?, ghiChu?, baiTiepId? }` |
| `/api/chat/rooms/[roomId]/nop-bai/[nopId]/journey` | POST | **HV** đăng Journey: `{ cheDo?: "public" \| "chi_minh", tieuDe?, moTa? }` → §11.8 |

Đặt route dưới `/api/chat/rooms/[roomId]/…` (không `/api/co-so/[id]/…`) vì ngữ cảnh là phòng — `roomId` → lớp → org được resolve server-side, client không cần biết `orgId`, và mọi route đã đi qua cùng một gate `getLopRoomAccess`. Route `/api/co-so/[id]/nop-bai` **giữ** cho dashboard staff (`PedagogyQuanLyClient`).

## 11.7 Tin hệ thống + realtime

Tin `system` mới (`chat_tin_nhan.loai_tin='system'`, payload `ngu_canh`):

| `ngu_canh.loai` | Bắn khi | `ngu_canh` | Nội dung fallback (DB) |
|---|---|---|---|
| `mo_bai` | GV mở bài | `{ loai:"mo_bai", idHocVienLop, idNguoiDung, idBaiTap, tenBai }` | «Đã mở bài «X» cho {tên HV}.» |
| `nop_bai` | HV nộp | `{ loai:"nop_bai", idNopBai, idBaiTap, tenBai }` | «{tên HV} đã nộp bài «X».» |
| `luu_bai` | GV lưu bài | `{ loai:"luu_bai", idNopBai, idBaiTap, tenBai }` | «Bài «X» của {tên HV} đã được lưu.» |
| `journey_da_dang` | HV đăng Journey | `{ loai:"journey_da_dang", idCotMoc, slug }` | «{tên HV} đã đăng bài lên Journey.» |

### Tin riêng cho một học viên trong phòng chung — **chốt Q4 = chỉ HV đó thấy**

Phòng lớp là phòng chung, một `chat_tin_nhan` mặc định thuộc cả phòng. Quy ước mới:

> Tin `system` có `ngu_canh.idNguoiDung` = **tin cá nhân hóa**: chỉ chính người đó **và staff** thấy. Học viên khác không thấy.

Ba chỗ phải thực thi (thiếu một chỗ là lộ):

| Điểm | Việc |
|---|---|
| **Load lịch sử tin** (server, `lib/chat/*` đọc phòng lớp) | Loại tin `system` có `ngu_canh.idNguoiDung` khác viewer, **trừ khi** `isStaff` |
| **Realtime** (client, `CinsChatOverlay.tsx`) | Drop tin thay vì chỉ redact — mở rộng ngay cạnh `redactOrgAdvisoryRealtimeMessage` (L326) |
| **Preview thread + unread count** | Không để tin ẩn làm preview / +1 unread cho HV khác |

**Đây là lọc hiển thị, không phải bảo mật.** Dòng dữ liệu vẫn nằm trong phòng; an toàn phụ thuộc việc client **chỉ** đọc tin qua API server-side (service role + gate `getLopRoomAccess`), không query `chat_tin_nhan` trực tiếp. Xác nhận điều này trước khi build bước 6.3 — nếu HV có đường đọc trực tiếp thì phải bổ sung RLS hoặc chuyển tin sang phòng 1-1 với tổ chức.

Nội dung theo viewer:

- HV đó → «🎉 Chúc mừng bạn được mở bài tập «Phối cảnh khối hộp vuông» — mở Giáo trình để xem yêu cầu.» + CTA mở panel Giáo trình.
- Staff → «Đã mở bài «…» cho {tên HV}.» (dấu vết ai mở bài cho ai)
- HV khác → không thấy gì.

Realtime: tin system đi qua đường realtime chat sẵn có → overlay nhận được thì **invalidate panel Giáo trình** (refetch nếu panel đang mở). Không cần channel riêng.

Mở bài cho cả lớp: `moBaiChoLop` sinh **1 tin cá nhân hóa / HV** (không gộp) — vì Q4 đã chốt HV khác không thấy, nên gộp 1 tin chung sẽ mâu thuẫn. Lớp 30 HV = 30 tin `system` ẩn lẫn nhau; staff thấy đủ 30 (cân nhắc gộp riêng cho view staff nếu nhiễu).

`nop_bai` / `luu_bai` / `journey_da_dang` cũng gắn `ngu_canh.idNguoiDung` → cùng quy tắc ẩn. Nghĩa là **thành tích của HV không bị đem ra trước lớp** — nhất quán với phản-vanity của CINS.

## 11.8 «Lưu bài» → «Đăng Journey» + tự động xác thực

### Luồng

1. GV thấy bong bóng tin có media của HV → menu tin nhắn có **«Lưu bài»** (chỉ hiện khi `canGanTienDo` && tin đó gắn `org_nop_bai`).
2. Server: `luu_luc = now()`, `id_nguoi_luu = actorId` → tin system `luu_bai`.
3. HV thấy trên chính bong bóng đó (và trong panel Giáo trình ở bài tương ứng) nút **«Đăng Journey»**.
4. HV bấm → modal nhỏ: tiêu đề (prefill «{Tên bài} — {Tên khóa}») · mô tả (prefill `org_nop_bai.ghi_chu`) · chế độ hiển thị. Xác nhận → `POST …/journey`.
5. Server (một transaction):
   - `dangBaiJourneyChoUser({ idNguoiDung: hvUserId, … })` → `content_cot_moc` + `content_tac_pham` (`loai_tac_pham='bai_viet'`) + `content_tac_pham_thuoc_moc`.
   - Trên `content_cot_moc`: `loai_moc='hoc'`, `nguon_goc='sinh_tu_hoc_vien_lop'`, `id_to_chuc=orgId`, `id_khoa_hoc`, `id_lop_hoc`.
   - `verify_yeu_cau` insert: `trang_thai='da_duyet'`, `nguoi_yeu_cau=hvUserId`, `nguoi_xu_ly=id_nguoi_luu` (GV đã lưu = ý chí của trung tâm), `noi_dung` = payload `org_milestone_tag_v1` (`khoaHocId`, `hienThiSanPham`, evidence trỏ `nopId`).
   - `verify_xac_nhan` insert: `trang_thai='da_xac_nhan'`, `loai_nguoi_xac_nhan='to_chuc'`, `id_nguoi_xac_nhan=orgId`, `bang_chung` = `{ nguon:"nop_bai", nopId, tinNhanId }`.
   - `setDiemVerifyChoCotMoc(cotMocId)`.
   - `org_nop_bai.id_cot_moc`, `dang_journey_luc`.
   - Tin system `journey_da_dang`.

**Tại sao không cần bước GV duyệt lần hai:** «Lưu bài» chính là hành vi duyệt. Bỏ bước duyệt lại là điểm khác biệt so với luồng `JourneyOrgAttachTrigger` (HV tự xin gắn org → org duyệt). Ở đây thứ tự đảo: org đồng ý trước, HV quyết định có đăng hay không. Verify vẫn ghi đủ 2 bảng nên **lens và điểm feed không cần biết sự khác biệt**.

### Media: reuse, không upload lại

Ảnh/video trong chat đã nằm ở `content_media.cloudflare_id` (CF Images id với ảnh, R2 key với video), gắn `content_tac_pham` stub (`che_do_hien_thi='chi_minh'`, tiêu đề "Tin nhắn ảnh").

Cách làm: tạo tác phẩm Journey **mới** và **copy `cloudflare_id`** vào block ảnh + `cover_id`. Không relink `content_media.id_tac_pham` (sẽ làm hỏng tin nhắn cũ), không re-upload (cùng CF asset). Stub chat giữ nguyên `chi_minh`.

Video R2 trong Journey block: cần xác nhận editor block hỗ trợ (câu Q9).

### Chống lạm dụng / trùng lặp

- 1 `org_nop_bai` → tối đa 1 `content_cot_moc` (guard `id_cot_moc IS NULL`, unique partial index).
- HV có quyền **không** đăng — không auto-post. Đây là Journey cá nhân, tổ chức không được tự đăng hộ (FOUNDATIONS: Journey là của user).
- HV xóa bài Journey sau đó → `id_cot_moc` FK SET NULL → nút «Đăng Journey» hiện lại (chấp nhận, hoặc chặn bằng `dang_journey_luc` — câu Q10).
- `che_do_hien_thi='chi_minh'` → verify vẫn ghi nhưng lens không hiện (lens lọc public). Không mất verify khi HV đổi sang public sau.

## 11.9 Frontend

### 11.9.1 Side panel — 2 tab mới

`ChatSidePanel` (`CinsChatOverlay.tsx` L319) thêm `"giao_trinh"` và `"hoc_vien"`; `SIDE_PANEL_ORDER` cần **lọc theo ngữ cảnh** (hiện là mảng hằng, render vô điều kiện tại L5453):

```ts
type ChatSidePanel = "pin" | "mocs" | "canvas" | "giao_trinh" | "hoc_vien";

// thay SIDE_PANEL_ORDER cố định bằng danh sách tính theo thread
const panels = useMemo(() => {
  const base: ChatSidePanel[] = ["pin", "mocs", "canvas"];
  if (!lopRoomAccess?.isLopRoom) return base;
  if (lopRoomAccess.canQuanLyHocVien) return [...base, "hoc_vien", "giao_trinh"];
  if (lopRoomAccess.hocVienLopId) return [...base, "giao_trinh"];
  return base;
}, [lopRoomAccess]);
```

Icon: `giao_trinh` → `BookOpen`; `hoc_vien` → `Users` (lucide, đã dùng trong repo). Nhớ guard `writeChatSidePanel`: panel đã lưu mà phòng mới không có → fallback `pin` (nếu không sẽ trắng panel khi HV mở phòng thường).

### 11.9.2 `ChatGiaoTrinhPanel` (HV) — mới

Tham chiếu UX Sine Art `task-curr-list`: danh sách bài theo thứ tự bộ, mỗi dòng thu gọn, bấm mở rộng (`▾`).

- Dòng bài: badge `thuoc_tinh` (label từ `LOAI_BAI_GIAO_TRINH_LABEL`) · tên bài · trạng thái.
- Trạng thái: **Đã mở** (mở rộng được: nội dung `mo_ta`, «Yêu cầu» `yeu_cau`, video YouTube, nút **Nộp bài**) · **Chờ mở** (khóa, chỉ tên + badge — cho HV thấy lộ trình, tạo động lực, giống Sine Art) · **Đã nộp / chờ duyệt** · **Đạt** (+ điểm) · **Làm lại** (+ ghi chú GV) · **Đã lưu** → nút **Đăng Journey** · **Đã đăng Journey** → link tới bài.
- **Mọi thuộc tính đều phải được gán mới xem được** (chốt Q3) — kể cả `ly_thuyet` / `tham_khao` / `bai_mau` / `demo`. Panel GV: bulk + preset «mở tới bài N». Khi khóa bật `dong_bo_tien_do`, mở bài = mở cho cả lớp (+ copy khi HV mới join). Nút **Nộp bài** chỉ hiện với `bai_tap` / `kiem_tra` / `du_an` / `on_tap`.
- Frozen (hết hạn học phí): xem bài đã mở, **không** nộp được — dùng lại banner + `canSend` đã có (câu Q7).

### 11.9.3 `ChatQuanLyHocVienPanel` (GV / tư vấn viên) — mới

Tham chiếu Sine Art `lop-wrap-scroll`: list HV, chọn 1 HV → panel tiến độ.

- List HV trong lớp: avatar · tên · badge «chờ duyệt N» · bài hiện tại · ngày còn lại của kỳ học (đã có `daysRemaining`).
- Chọn HV → ma trận bài: checkbox mở/khóa · nút **Mở bài** (bulk chọn nhiều bài) · bài nộp chờ duyệt (Đạt / Làm lại + điểm + ghi chú) · **Lưu bài**.
- Nút **Mở bài cho cả lớp** (bulk theo bài, không theo HV).
- Read-only mode khi chỉ có quyền `xem` (tư vấn viên): ẩn mọi nút ghi, giữ hiển thị — để trả lời phụ huynh mà không sửa được.

### 11.9.4 Trên bong bóng tin nhắn

| Nút | Ai thấy | Điều kiện |
|---|---|---|
| **Nộp bài này** | HV | tin của chính mình, có `id_dinh_kem`, có bài đang mở, chưa nộp, không frozen |
| **Lưu bài** | GV (`canGanTienDo`) | tin đã gắn `org_nop_bai`, chưa `luu_luc` |
| **Đăng Journey** | HV | `luu_luc != null` && `id_cot_moc == null` |

Đặt trong menu hành động tin nhắn sẵn có (chỗ Ghim / Trả lời) — không thêm hàng nút mới vào bubble, tránh phá layout mobile.

### 11.9.5 Mobile

Panel side trên mobile đang là lớp phủ toàn màn (`is-visible-mobile`). Giáo trình và Quản lý học viên đều là list dọc → dùng lại `cins-chat-side-body` scroll, không cần layout riêng. Theo `.agents/skills/responsive-craft`: kiểm tra ở 360px, target tap ≥ 44px cho checkbox mở bài.

## 11.10 Edge cases

| Case | Xử lý |
|---|---|
| Khóa chưa gán bộ giáo trình | Panel HV: empty state «Trung tâm chưa thiết lập giáo trình». Panel GV: CTA link `/co-so/[slug]/quan-ly/giao-trinh` |
| Mở bài đã mở | Idempotent — unique `(id_hoc_vien_lop, id_bai_tap)`, **không** gửi lại tin chúc mừng |
| Module bị xóa khỏi bộ sau khi đã mở | Row `org_tien_do_bai_mo` còn (FK trỏ `org_bai_tap`, không phải junction) → panel hiện bài đó ở nhóm «Ngoài giáo trình hiện tại», không mất bài nộp |
| Module bị hard delete | CASCADE xóa tiến độ + nộp bài. Guard §6 nên chặn xóa module đang có bài nộp (**bổ sung vào guard hiện tại**) |
| HV thuộc nhiều lớp cùng khóa | `hocVienLopId` resolve theo `id_lop_hoc` của phòng → mỗi phòng 1 ghi danh, không nhập nhằng |
| HV bị gỡ ghi danh | CASCADE xóa tiến độ/nộp bài; `content_cot_moc` đã đăng **không** bị xóa (verify đã cấp thì không thu hồi tự động) |
| GV nộp bài | Chặn — chỉ `hocVienLopId != null` mới nộp được |
| Nộp bài không kèm media | Cho phép (ghi chú text), nhưng «Lưu bài» → Journey yêu cầu có media (câu Q8) |
| Nộp lại nhiều lần 1 bài | Cho phép nhiều row `org_nop_bai`; panel hiện lần nộp mới nhất, lịch sử thu gọn |
| Lưu bài rồi HV không đăng | Không nhắc lại quá 1 lần; nút vẫn ở panel Giáo trình (không hết hạn) |
| Bỏ lưu sau khi HV đã đăng | Chặn (409) — verify đã cấp, phải xử lý ở luồng thu hồi verify riêng |
| Tin nhắn ngoài kỳ học (freeze) | `filterMessagesForKyVisibility` đã lọc → tin system `mo_bai` cũ có thể bị ẩn; panel Giáo trình là **nguồn sự thật**, không phụ thuộc tin chat |
| Phòng lớp chưa tồn tại | `ensureLopChatPhong` đã lo |

## 11.11 Security & performance

- Mọi route mới: session → `getLopRoomAccess(roomId, viewerId)` → gate bằng cờ (`hocVienLopId` cho HV, `canGanTienDo` cho ghi). **Không** tin `hocVienLopId` client gửi lên khi viewer là HV — resolve server-side.
- Staff đọc theo `?hocVienLopId=` → verify enrollment đó **thuộc đúng lớp của phòng** (chống IDOR sang lớp khác cùng org).
- Không `select('*')`. Panel GV: 1 query enrollment + 1 query tiến độ + 1 query nộp bài `in(...)` — **không N+1 theo HV**. Lớp > 60 HV → paginate `.range()`.
- Ghi nhiều bảng (mở bài + tin system; đăng Journey + 2 bảng verify + nộp bài) → **RPC/transaction**, không chuỗi request rời (DEV_RULES).
- Tin system không chứa PII ngoài tên hiển thị; log không ghi email HV.
- `dangJourneyTuBaiNop` chỉ nhận `nopId` — mọi giá trị `id_khoa_hoc`/`id_to_chuc`/media lấy từ DB, không từ client (chống gắn org tùy ý → giả xác thực). **Đây là bề mặt tấn công nhạy cảm nhất của phase này**: nó cấp verify tổ chức mà không có bước duyệt thủ công.
- Rate limit `POST …/journey`: 1 lần / `nopId`; thêm giới hạn N bài/ngày/HV nếu cần.
- Migration idempotent + runner theo pattern `run-bo-giao-trinh-migration.mjs`.

## 11.12 Quyết định

### Đã chốt (2026-08-04)

| # | Câu | **Chốt** |
|---|---|---|
| Q1 | Schema: bảng mới + ALTER | **Duyệt** — `org_tien_do_bai_mo` + 4 cột `org_nop_bai` + `org_khoa_hoc.dong_bo_tien_do` |
| Q2 | Mở bài: từng HV / cả lớp | **Cả hai** — khi `dong_bo_tien_do` thì mở = cả lớp; khi tắt thì từng HV (+ bulk chọn tay) |
| Q3 | Khóa / mở thuộc tính + đồng bộ | **Tất cả thuộc tính đều khóa** tới khi GV mở. Thêm toggle **`dong_bo_tien_do`** trên khóa: bật = cả lớp cùng tiến độ; tắt = mỗi HV một tiến độ. 1 khóa/lớp = 1 giáo trình (bộ). |
| Q4 | Tin «Chúc mừng» ai thấy? | **Chỉ HV đó** (+ staff). HV khác không thấy. Lọc 3 điểm — §11.7. **OK.** |
| Q5 | HV mới / bài chưa mở | Panel hiện dạng khóa. **Nếu khóa `dong_bo_tien_do`:** HV mới vào **copy** bài đã mở của lớp → thấy bài hiện tại mọi người đang theo. |
| Q6 | Tư vấn viên | **Read-only** |
| Q7 | HV frozen | Nhận mở, **không nộp** |
| Q8 | Lưu bài cần media? | **Có** |
| Q9 | Video → Journey | Phase 6 **chỉ ảnh**; video sau |
| Q10 | Xóa Journey → đăng lại? | **Cho** (`id_cot_moc IS NULL`) |
| Q11 | Pedagogy orphan | **Dồn vào chat** + rút gọn `/quan-ly/hoc-vien` |

## 11.13 Các bước (mỗi phase = 1 brief riêng)

| Bước | Nội dung | Model đề xuất |
|---|---|---|
| **6.0** | User chốt §11.12 | — |
| **6.1** | **Fix bug** `ganTienDoBai` (guard theo bộ) + bỏ insert `org_bai_dang` + `listBaiTapCuaKhoa` theo bộ | Grok 4.5 / Medium |
| **6.2** | Migration `org_tien_do_bai_mo` + ALTER `org_nop_bai` + runner + verify query | Grok 4.5 / Medium |
| **6.3** | Lib + API: `tien-do-bai.ts`, cờ `lop-room-access`, tin system, routes `giao-trinh` / `tien-do` / `nop-bai PATCH` | Grok 4.5 / Medium |
| **6.4** | UI `ChatGiaoTrinhPanel` (HV) + nút Nộp bài trên tin nhắn | Grok 4.5 / Medium |
| **6.5** | UI `ChatQuanLyHocVienPanel` (GV) + mở bài bulk + duyệt | Grok 4.5 / Medium |
| **6.6** | «Lưu bài» → «Đăng Journey» + auto-verify (`nop-bai-journey.ts` + modal) — **cẩn thận nhất, cấp verify** | Grok 4.5 / **High** |
| **6.7** | Wire lens «Sản phẩm học viên» vào trang khóa (`KhoaHocDetailView` đang là placeholder tĩnh) + cập nhật `CINS_IMPLEMENTATION.md` / `CINS_DECISIONS.md` | Composer 2.5 / Low–Medium |
