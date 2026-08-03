# PLAN — Học phí & Combo (nav CSĐT)

> Trạng thái: **BUILDING** — Phase 1 ship (nav + tab Học phí). Combo stub. Phase 2+ chờ.
> Thêm mục nav **"Học phí"** vào cụm *Tiền* của `OrgQuanLyShell` (CSĐT), 2 tab: **Học phí** (catalog gói, kế thừa từ gói gắn trên khóa) và **Combo** (giảm giá khi học nhiều môn).
> Chốt: hợp nhất gói về `org_goi_hoc_phi` · combo áp vào đơn thật · học viên nhìn thấy giảm giá · combo chọn được theo khóa **hoặc** theo gói cụ thể.

---

## 0. Vấn đề & mục tiêu

| Việc cần làm | Hiện trạng | Mục tiêu |
|---|---|---|
| Xem toàn bộ gói học phí của trung tâm ở một chỗ | Phải mở từng modal khóa học mới thấy gói | Tab **Học phí** liệt kê mọi gói, nhóm theo khóa |
| Gói học phí là "gốc" gắn trực tiếp vào khóa | Đúng về UX, nhưng lưu 2 nơi lệch nhau | 1 nguồn sự thật, khóa vẫn là nơi nhập |
| Quy ước thông tin cơ bản của một gói | Meta khóa thiếu `so_ngay` (entitlement) | Chuẩn hóa: tên · giá · số ngày · số buổi · phút/buổi |
| Giảm giá khi học A + B | Chưa có | Tab **Combo**: `-20%` tổng học phí hoặc `-200.000đ` |
| Combo trừ tiền thật trên đơn | Chưa có | Đơn học phí mang giá gốc / giảm / thành tiền |
| Học viên thấy được ưu đãi | Chưa có | Combo hiện trên trang khóa + breakdown trên card chat |

**Ngoài phạm vi:** trường ĐH / studio (nav CSĐT only), cổng thanh toán, hoàn tiền, tự ghi danh từ trang khóa.

---

## 1. Điểm khởi đầu (fact)

### Nav & shell

- Nav khai báo trong `lib/to-chuc/org-quan-ly-routes.ts` — `CO_SO_NAV_GROUPS` 3 cụm: `thiet-lap` · `hoc` · `tien` (dòng 51–69). Cụm `tien` hiện chỉ có `{ id: "doanh-thu", label: "Doanh thu" }`.
- Section là union type `OrgQuanLySection` (dòng 17–32) — thêm mục mới phải khai báo ở đây.
- Shell `components/to-chuc/quan-ly/OrgQuanLyShell.tsx` render nav từ config, không hardcode label.
- Route CSĐT: `app/co-so/[slug]/quan-ly/{section}/page.tsx` → `CoSoQuanLyPageGate` → client component fetch API.

### Hai hệ "gói học phí" đang song song

| | **Hệ A — meta trên khóa** | **Hệ B — bảng catalog** |
|---|---|---|
| UI | `components/co-so/KhoaHocGoiPhiEditor.tsx` trong `KhoaHocCreateModal` | `GoiVaThanhToanClient` (nằm trong tab Doanh thu) |
| Lưu | `org_khoa_hoc.noi_dung_blocks` → block `<!--cins-khoa-meta-->` JSON `goiHocPhi[]`; gói đầu sync ra cột legacy `hoc_phi` / `thoi_luong_buoi` / `thoi_luong_phut_moi_buoi` | Bảng `org_goi_hoc_phi` |
| Field | `id` (string client-gen), `tenGoi`, `hocPhi`, `soBuoi`, `phutMoiBuoi` — `lib/to-chuc/khoa-hoc-goi-phi.ts:4-10` | `id` uuid, `id_khoa_hoc`, `ten`, `so_ngay` (NOT NULL, >0), `gia_vnd`, `mo_ta`, `dang_ban`, `thu_tu` |
| Dùng để | Hiển thị giá trang khóa công khai (`resolveGoiHocPhiForDisplay` → `KhoaHocFeePicker`, `KhoaHocDetailView.tsx:633,749`) | Bán thật: `org_don_hoc_phi.id_goi`, entitlement `org_ky_hoc` |
| API | `POST /api/co-so/[id]/khoa-hoc`, `PATCH .../khoa-hoc/[khoaId]` | `GET/POST/PATCH /api/co-so/[id]/hoc-phi/goi` |

**Lệch cốt lõi:** hệ A có `soBuoi`/`phutMoiBuoi` nhưng **không có `so_ngay`**; hệ B bắt buộc `so_ngay` và **không có** số buổi/phút. Sửa giá trong modal khóa **không** đổi giá bán.

### Luồng đơn học phí

Chỉ 3 lib function INSERT `org_don_hoc_phi`:

| Function | File | Dùng cho |
|---|---|---|
| `createAndSendDonHocPhiChat` | `lib/co-so/don-hoc-phi-chat.ts:187` | Staff gửi VietQR/CK vào chat |
| `createDonTienMat` | `lib/co-so/don-hoc-phi.ts:245` | Staff thu tiền mặt |
| `createGiaHanVietQrForStudent` | `lib/co-so/don-hoc-phi-chat.ts:464` | HV tự gia hạn khi lớp freeze |

Xác nhận: `xacNhanDonHocPhi` (`lib/co-so/don-hoc-phi.ts:78`) — UPDATE có điều kiện `trang_thai = 'cho_thanh_toan'` làm ổ khóa, rồi `computeNextKyRange` + INSERT `org_ky_hoc`, chuyển `user_hoc_vien_lop` → `dang_hoc`. **Không có RPC Postgres** — toàn bộ bằng TypeScript + service role.

**⚠️ Lỗ hổng hiện tại (chặn combo):** với đường staff, server **tin số tiền client gửi lên** — `app/api/co-so/[id]/hoc-phi/don-chat/route.ts:36-48` và `thu-tien-mat/route.ts:38-49` chỉ validate `soTienVnd != null` rồi forward, không đối chiếu `org_goi_hoc_phi.gia_vnd`. Chỉ đường HV tự gia hạn mới đọc giá từ DB (`don-hoc-phi-chat.ts:417-448`). Combo sẽ vô nghĩa nếu giá vẫn do client quyết → **phải vá cùng Phase 4**.

**Ràng buộc cấu trúc:** `org_don_hoc_phi.id_hoc_vien_lop` NOT NULL → mỗi đơn gắn **một** enrollment. `user_hoc_vien_lop` UNIQUE `(id_nguoi_dung, id_khoa_hoc)` → học 2 khóa = 2 enrollment. Combo trải nhiều khóa ⇒ **nhiều đơn**, cần khái niệm "nhóm đơn".

**Phía học viên:** không có trang xem đơn. HV chỉ thấy card `don_hoc_phi` trong chat (`components/cins/ChatDonHocPhiCard.tsx`) và CTA gia hạn khi lớp freeze.

### Quyền

- Ma trận `org_thanh_vien_quyen` (`supabase/sql/migration_org_thanh_vien_quyen.sql` — **chưa apply lên Supabase**), 7 module, `an`/`xem`/`sua`, vắng row = `an`.
- Module `hoc-phi-goi` ("Gói học phí") **đã tồn tại** → mục nav mới dùng lại, **không thêm module key**.
- `lib/to-chuc/co-so-quan-ly-access.ts` — `getCoSoModuleQuyen`; founder tier (`owner`/`admin`) luôn `sua`.
- Pattern route: session → `getViewerCoSoVaiTro` → `getCoSoModuleQuyen` → `createServiceRoleClient()`.

### Quyết định đã chốt liên quan (DECISIONS)

- **O12:** gói HP theo tháng qua `org_goi_hoc_phi`, entitlement = **ngày lịch**, bỏ gói theo buổi phase này.
- **L34:** không ghi học phí vào `shop_*`, không reuse `edu_*`. CINs **không cầm tiền**, chỉ tracking.

---

## 2. Quyết định đã chốt (2026-08-03)

| # | Quyết định |
|---|---|
| **C1** | **Hợp nhất về `org_goi_hoc_phi`.** Bảng = nguồn sự thật. `KhoaHocGoiPhiEditor` trong modal khóa vẫn là **nơi nhập chính** nhưng ghi thẳng xuống bảng; meta JSON giữ lại làm **mirror đọc** cho trang khóa công khai (không phải nguồn sự thật). |
| **C2** | **Duyệt ALTER `org_goi_hoc_phi`** thêm `so_buoi`, `phut_moi_buoi`, `ma_goi_meta` → ghi inventory vào `CINS_DECISIONS.md`. |
| **C3** | Thêm ô **"Số ngày hiệu lực"** vào `KhoaHocGoiPhiEditor`; default gợi ý `lien_tuc_theo_thang` → 30, trọn khóa → 90. Backfill hàng cũ suy từ tên gói, không khớp → 30 + cờ "cần rà". |
| **C4** | Nhiều combo cùng khớp → **lấy combo giảm nhiều nhất, không cộng dồn**. |
| **C5** | **Combo áp vào đơn học phí thật** (không chỉ báo giá) — kéo theo ALTER `org_don_hoc_phi` (§3.5) và vá lỗ hổng giá client. |
| **C6** | **Học viên nhìn thấy**: combo hiện trên trang khóa công khai + card chat hiện breakdown giá gốc / giảm / thành tiền. |
| **C7** | Combo chọn được **cả hai cấp**: thành phần trỏ tới khóa (bất kỳ gói) **hoặc** một gói cụ thể — `org_combo_thanh_phan.id_goi` nullable. |

---

## 3. Database

### 3.1 ALTER `org_goi_hoc_phi` (C2 — đã duyệt)

```sql
ALTER TABLE public.org_goi_hoc_phi
  ADD COLUMN IF NOT EXISTS so_buoi       int4,
  ADD COLUMN IF NOT EXISTS phut_moi_buoi int4,
  ADD COLUMN IF NOT EXISTS ma_goi_meta   text;

CREATE UNIQUE INDEX IF NOT EXISTS uq_org_goi_hoc_phi_meta
  ON public.org_goi_hoc_phi (id_khoa_hoc, ma_goi_meta)
  WHERE ma_goi_meta IS NOT NULL;
```

`ma_goi_meta` giữ id gói trong meta JSON → round-trip: sửa lại gói trong modal khóa map đúng row, không tạo trùng.

### 3.2 Bảng mới — `org_combo_hoc_phi`

```sql
CREATE TABLE IF NOT EXISTS public.org_combo_hoc_phi (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_to_chuc       uuid NOT NULL REFERENCES public.org_to_chuc(id) ON DELETE CASCADE,
  ten              text NOT NULL,
  mo_ta            text,
  loai_giam        text NOT NULL CHECK (loai_giam IN ('phan_tram', 'so_tien')),
  gia_tri_giam     numeric(14, 0) NOT NULL CHECK (gia_tri_giam >= 0),
  giam_toi_da_vnd  numeric(14, 0),          -- trần khi loai_giam = 'phan_tram'
  ap_dung_tu       date,
  ap_dung_den      date,
  hien_trang_khoa  boolean NOT NULL DEFAULT true,   -- C6: hiện trên trang khóa công khai
  dang_ban         boolean NOT NULL DEFAULT true,
  thu_tu           int4 NOT NULL DEFAULT 0,
  da_xoa           boolean NOT NULL DEFAULT false,
  tao_luc          timestamptz NOT NULL DEFAULT now(),
  cap_nhat_luc     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT org_combo_phan_tram_chk
    CHECK (loai_giam <> 'phan_tram' OR gia_tri_giam <= 100),
  CONSTRAINT org_combo_ngay_chk
    CHECK (ap_dung_den IS NULL OR ap_dung_tu IS NULL OR ap_dung_den >= ap_dung_tu)
);

CREATE INDEX IF NOT EXISTS idx_org_combo_hoc_phi_org
  ON public.org_combo_hoc_phi (id_to_chuc, dang_ban, thu_tu)
  WHERE da_xoa = false;
```

### 3.3 Bảng mới — `org_combo_thanh_phan` (C7)

```sql
CREATE TABLE IF NOT EXISTS public.org_combo_thanh_phan (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_combo     uuid NOT NULL REFERENCES public.org_combo_hoc_phi(id) ON DELETE CASCADE,
  id_khoa_hoc  uuid NOT NULL REFERENCES public.org_khoa_hoc(id)      ON DELETE CASCADE,
  id_goi       uuid REFERENCES public.org_goi_hoc_phi(id) ON DELETE CASCADE,  -- NULL = bất kỳ gói của khóa
  tao_luc      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_org_combo_thanh_phan
    UNIQUE NULLS NOT DISTINCT (id_combo, id_khoa_hoc, id_goi)
);

CREATE INDEX IF NOT EXISTS idx_org_combo_thanh_phan_combo
  ON public.org_combo_thanh_phan (id_combo);
CREATE INDEX IF NOT EXISTS idx_org_combo_thanh_phan_khoa
  ON public.org_combo_thanh_phan (id_khoa_hoc);
```

`UNIQUE NULLS NOT DISTINCT` (PG15+) chặn thêm "cả khóa" hai lần. Ràng buộc **≥ 2 thành phần khác khóa** validate ở app layer.

### 3.4 Bảng mới — `org_nhom_don_hoc_phi` (C5)

Combo trải nhiều khóa ⇒ nhiều đơn. Nhóm đơn là thực thể mang combo + tổng tiền + một mã QR duy nhất.

```sql
CREATE TABLE IF NOT EXISTS public.org_nhom_don_hoc_phi (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_to_chuc       uuid NOT NULL REFERENCES public.org_to_chuc(id) ON DELETE CASCADE,
  id_nguoi_dung    uuid NOT NULL REFERENCES public.user_nguoi_dung(id) ON DELETE CASCADE,
  id_combo         uuid REFERENCES public.org_combo_hoc_phi(id) ON DELETE SET NULL,
  ma_nhom          text,
  ten_combo_luu    text,          -- snapshot tên combo tại thời điểm chốt
  loai_giam_luu    text,          -- snapshot: combo đổi sau này không sửa lịch sử
  gia_tri_giam_luu numeric(14, 0),
  gia_goc_vnd      numeric(14, 0) NOT NULL DEFAULT 0 CHECK (gia_goc_vnd >= 0),
  giam_vnd         numeric(14, 0) NOT NULL DEFAULT 0 CHECK (giam_vnd >= 0),
  tong_vnd         numeric(14, 0) NOT NULL DEFAULT 0 CHECK (tong_vnd >= 0),
  tao_luc          timestamptz NOT NULL DEFAULT now(),
  cap_nhat_luc     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT org_nhom_don_tong_chk CHECK (tong_vnd = gia_goc_vnd - giam_vnd)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_org_nhom_don_ma
  ON public.org_nhom_don_hoc_phi (ma_nhom)
  WHERE ma_nhom IS NOT NULL AND ma_nhom <> '';
CREATE INDEX IF NOT EXISTS idx_org_nhom_don_org
  ON public.org_nhom_don_hoc_phi (id_to_chuc, tao_luc DESC);
```

**Snapshot là bắt buộc:** sửa combo từ −20% xuống −10% không được làm đổi số tiền của đơn đã phát hành.

### 3.5 ALTER `org_don_hoc_phi` (⚠️ cần user duyệt lần 2 trước khi chạy)

```sql
ALTER TABLE public.org_don_hoc_phi
  ADD COLUMN IF NOT EXISTS id_nhom     uuid REFERENCES public.org_nhom_don_hoc_phi(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS gia_goc_vnd numeric(14, 0),
  ADD COLUMN IF NOT EXISTS giam_vnd    numeric(14, 0) NOT NULL DEFAULT 0 CHECK (giam_vnd >= 0);

CREATE INDEX IF NOT EXISTS idx_org_don_hoc_phi_nhom
  ON public.org_don_hoc_phi (id_nhom) WHERE id_nhom IS NOT NULL;

UPDATE public.org_don_hoc_phi
   SET gia_goc_vnd = so_tien_vnd
 WHERE gia_goc_vnd IS NULL;
```

**Bảo toàn ngữ nghĩa:** `so_tien_vnd` giữ nguyên là **số tiền phải trả** (sau giảm) — mọi code doanh thu/đối soát hiện có không phải sửa. `gia_goc_vnd` là trước giảm, invariant `so_tien_vnd = gia_goc_vnd − giam_vnd`. Đơn lẻ không combo: `giam_vnd = 0`, `gia_goc_vnd = so_tien_vnd`.

Không đặt CHECK invariant trên bảng đơn ở migration này vì hàng cũ có thể lệch do làm tròn — enforce ở lib, cân nhắc thêm CHECK sau khi backfill sạch.

### 3.6 RLS

```sql
ALTER TABLE public.org_combo_hoc_phi     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_combo_thanh_phan  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_nhom_don_hoc_phi  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS org_combo_doc_dang_ban ON public.org_combo_hoc_phi;
CREATE POLICY org_combo_doc_dang_ban ON public.org_combo_hoc_phi
  FOR SELECT TO authenticated
  USING (dang_ban = true AND da_xoa = false AND hien_trang_khoa = true);

DROP POLICY IF EXISTS org_combo_tp_doc ON public.org_combo_thanh_phan;
CREATE POLICY org_combo_tp_doc ON public.org_combo_thanh_phan
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.org_combo_hoc_phi c
    WHERE c.id = id_combo
      AND c.dang_ban = true AND c.da_xoa = false AND c.hien_trang_khoa = true
  ));

DROP POLICY IF EXISTS org_nhom_don_doc_chu_don ON public.org_nhom_don_hoc_phi;
CREATE POLICY org_nhom_don_doc_chu_don ON public.org_nhom_don_hoc_phi
  FOR SELECT TO authenticated
  USING (id_nguoi_dung = (select auth.uid()));
```

Không policy INSERT/UPDATE/DELETE cho `authenticated` — mutation chỉ qua service role trong API.

### 3.7 File migration

`supabase/sql/migration_hoc_phi_combo.sql`, idempotent, chia 3 phần chạy độc lập:

| Phần | Nội dung | Gate |
|---|---|---|
| **A** | ALTER `org_goi_hoc_phi` (§3.1) | ✅ đã duyệt (C2) |
| **B** | 2 bảng combo + RLS (§3.2, §3.3) | ✅ bảng mới |
| **C** | `org_nhom_don_hoc_phi` + ALTER `org_don_hoc_phi` (§3.4, §3.5) | ⚠️ chờ duyệt trước Phase 4 |

Backfill meta → rows bằng `scripts/backfill-goi-hoc-phi.mjs` (phải parse block JSON, không nhét vào SQL). Script chạy dry-run mặc định, in bảng diff, chỉ ghi khi có `--apply`.

---

## 4. API

Pattern chuẩn: session → `getViewerCoSoVaiTro` → `getCoSoModuleQuyen(orgId, actorId, vaiTro, "hoc-phi-goi")` → service role. Lỗi `{ error: { code, message } }`.

### 4.1 Gói

| Route | Method | Quyền | Việc |
|---|---|---|---|
| `/api/co-so/[id]/hoc-phi/goi` | GET | ≠ `an` | **Mở rộng**: trả kèm `so_buoi`, `phut_moi_buoi`, tên khóa (join `org_khoa_hoc`), `includeHidden` |
| `/api/co-so/[id]/hoc-phi/goi` | POST · PATCH | `= sua` | Đã có — thêm validate 2 field mới |
| `/api/co-so/[id]/hoc-phi/goi/[goiId]` | DELETE | `= sua` | **Mới** — soft: `dang_ban = false` (đơn cũ còn FK) |

### 4.2 Combo

| Route | Method | Quyền | Việc |
|---|---|---|---|
| `/api/co-so/[id]/hoc-phi/combo` | GET | ≠ `an` | Combo + thành phần (2 query, không N+1) |
| `/api/co-so/[id]/hoc-phi/combo` | POST | `= sua` | Tạo combo + thành phần |
| `/api/co-so/[id]/hoc-phi/combo/[comboId]` | PATCH | `= sua` | Sửa + replace thành phần |
| `/api/co-so/[id]/hoc-phi/combo/[comboId]` | DELETE | `= sua` | Soft `da_xoa = true` |
| `/api/co-so/[id]/hoc-phi/bao-gia` | POST | ≠ `an` | Nhận `[{ khoaId, goiId }]` → trả gói khớp, combo tốt nhất, giá gốc / giảm / thành tiền |

Tạo/sửa combo + thành phần phải nguyên tử → **RPC Postgres** `cins_luu_combo_hoc_phi(p_org, p_combo jsonb, p_thanh_phan jsonb)` thay vì nhiều round-trip (theo DEV_RULES).

**Validate server (POST/PATCH combo):**
- `ten` không rỗng; `loai_giam ∈ {phan_tram, so_tien}`; `phan_tram` → `0 < gia_tri_giam ≤ 100`; `so_tien` → `≥ 0`.
- Thành phần ≥ 2 dòng, ≥ 2 **khóa khác nhau**.
- Mọi `id_khoa_hoc` / `id_goi` phải thuộc `id_to_chuc` — chặn cross-org.
- `id_goi` (nếu có) phải thuộc đúng `id_khoa_hoc` cùng dòng.

### 4.3 Đơn (Phase 4)

| Route | Method | Thay đổi |
|---|---|---|
| `/api/co-so/[id]/hoc-phi/don-chat` | POST | **Đổi contract**: nhận `items: [{ hocVienLopId, goiId }]` thay vì một `soTienVnd`. Server tự tra giá + combo. Bỏ tin `soTienVnd` từ client |
| `/api/co-so/[id]/hoc-phi/thu-tien-mat` | POST | Như trên |
| `/api/hoc-phi/nhom/[nhomId]/xac-nhan` | POST | **Mới** — xác nhận cả nhóm, tạo `org_ky_hoc` cho từng enrollment |
| `/api/hoc-phi/[donId]/xac-nhan` | POST | Giữ cho đơn lẻ; nếu đơn có `id_nhom` → redirect logic sang xác nhận nhóm |

**Vá lỗ hổng giá (bắt buộc cùng Phase 4):** server tính `gia_goc_vnd` từ `org_goi_hoc_phi.gia_vnd` và `so_ngay_cong` từ `so_ngay`. Client chỉ gửi `goiId`. Giảm tay ngoài combo đi qua field riêng `giamThemVnd` — cần `hoc-phi-doi-soat = sua` và bắt buộc `ghi_chu`, không trộn vào `so_tien_vnd`.

**Lib mới:**
- `lib/co-so/combo-hoc-phi.ts` — `listCombo`, `luuCombo`, `softDeleteCombo`, `timComboKhopNhat(gioHang, combos)`, `tinhGiamCombo`.
- `lib/co-so/don-nhom.ts` — `createNhomDon`, `xacNhanNhomDon`.
- Hàm tính giảm **thuần, không I/O**, dùng chung server (chốt đơn) và client (xem trước) → một nguồn công thức duy nhất.

**Phân bổ giảm giá:** chia `giam_vnd` theo tỉ lệ `gia_goc_vnd` từng đơn, làm tròn xuống, **phần dư dồn vào đơn đầu** để `Σ so_tien_vnd = tong_vnd` tuyệt đối (tránh lệch 1đ trong đối soát).

---

## 5. Frontend

### 5.1 Nav

`lib/to-chuc/org-quan-ly-routes.ts`:
- Thêm `"hoc-phi"` vào union `OrgQuanLySection`.
- Cụm `tien`: `[{ id: "hoc-phi", label: "Học phí" }, { id: "doanh-thu", label: "Doanh thu" }]`.

### 5.2 Trang & component

| File | Loại | Việc |
|---|---|---|
| `app/co-so/[slug]/quan-ly/hoc-phi/page.tsx` | RSC | `getCoSoMetaBySlugCached` → `CoSoQuanLyPageGate section="hoc-phi"` → client |
| `components/co-so/quan-ly/HocPhiQuanLyClient.tsx` | client | Khung 2 tab; tab state qua `?tab=combo` để F5 giữ tab |
| `components/co-so/quan-ly/HocPhiGoiTab.tsx` | client | Bảng gói nhóm theo khóa, sửa inline |
| `components/co-so/quan-ly/HocPhiComboTab.tsx` | client | Danh sách combo + nút tạo |
| `components/co-so/quan-ly/ComboEditorModal.tsx` | client | `TruongInlineModal` — chọn khóa/gói, kiểu giảm, xem trước |
| `app/co-so/cso-quan-ly.css` | css | Prefix `cso-hp-*`, token CINs, icon Lucide |

### 5.3 Tab Học phí

Nhóm theo khóa, mỗi khóa một card chứa bảng gói:

| Cột | Nguồn |
|---|---|
| Tên gói | `ten` |
| Học phí | `gia_vnd` |
| Số ngày | `so_ngay` |
| Số buổi · phút/buổi | `so_buoi`, `phut_moi_buoi` |
| Đang bán | `dang_ban` toggle |
| Thao tác | Sửa · Ẩn |

Hàng "Chưa gắn khóa" cho `id_khoa_hoc IS NULL`. Empty state dẫn sang Khóa & lớp.

### 5.4 Tab Combo

Mỗi combo một card: tên · chip thành phần (khóa, hoặc "khóa → gói cụ thể" theo C7) · badge mức giảm (`−20%` / `−200.000đ`) · khoảng ngày · toggle đang bán · toggle hiện trên trang khóa.
Modal hiển thị **xem trước**: tổng học phí thành phần → số giảm → thành tiền, tính bằng đúng hàm dùng ở server.

### 5.5 Phía học viên (C6)

| Nơi | Thay đổi |
|---|---|
| Trang khóa công khai (`KhoaHocDetailView.tsx`, client) | Dưới `KhoaHocFeePicker` thêm khối "Ưu đãi combo": "Học kèm *Guitar* — giảm 20%". Data từ `GET /api/co-so/[id]/khoa-hoc/[khoaId]/combo` (chỉ combo `dang_ban && hien_trang_khoa`) |
| Card chat `ChatDonHocPhiCard.tsx` | Khi `id_nhom` có combo: hiện breakdown giá gốc → giảm (kèm tên combo) → thành tiền; liệt kê các khóa trong nhóm; một QR cho cả nhóm |

### 5.6 Dọn trùng lặp

`GoiVaThanhToanClient` đang render phần gói trong tab **Doanh thu** → bỏ phần gói, giữ phần thanh toán/đối soát. Doanh thu quay về đúng vai trò KPI + đơn chờ.

---

## 6. Các bước (phase)

| Phase | Nội dung | Ship? |
|---|---|---|
| **1** | Nav + route + tab **Học phí** đọc/sửa trên `org_goi_hoc_phi` hiện có (chưa cần ALTER). Verify: founder thấy mục Học phí, sửa giá lưu được, staff `an` bị 403 | ✅ |
| **2** | Migration **Phần A** + backfill meta → rows; `KhoaHocGoiPhiEditor` thêm ô Số ngày, ghi xuống bảng, meta thành mirror. Verify: sửa gói trong modal khóa → tab Học phí đổi theo; trang khóa công khai không vỡ giá | ✅ |
| **3** | Migration **Phần B** + CRUD combo + tab **Combo** + endpoint báo giá. Verify: tạo combo A+B −20%, xem trước đúng, staff `xem` không tạo được | ✅ |
| **4** | Migration **Phần C** + nhóm đơn + **vá lỗ hổng giá client** + xác nhận theo nhóm. Verify: gửi đơn combo 2 khóa → 1 QR, xác nhận → 2 `org_ky_hoc`, tổng khớp đến từng đồng | ✅ |
| **5** | Hiển thị phía HV: combo trên trang khóa + breakdown card chat | ✅ |

Một phase / một brief. Phase 1 chạy được ngay. Phase 4 cần duyệt §3.5 trước.

---

## 7. Edge cases

| Tình huống | Xử lý |
|---|---|
| Khóa bị xóa còn combo trỏ tới | CASCADE xóa thành phần → combo còn < 2 thành phần → tự `dang_ban = false` + cảnh báo trên card |
| Gói bị ẩn nằm trong combo | Combo tồn tại nhưng không khớp giỏ; UI gắn nhãn "có gói đã ẩn" |
| Combo `phan_tram` 100% | Cho phép, cảnh báo "miễn phí hoàn toàn"; thành tiền clamp ≥ 0 |
| `so_tien` giảm > tổng học phí | Clamp về tổng; thành tiền = 0 |
| Nhiều combo cùng khớp | Combo giảm nhiều nhất (C4) |
| Combo hết hạn | Lọc ở query; dashboard hiện badge "Hết hạn" |
| Combo bị sửa sau khi đã phát hành đơn | Đơn dùng snapshot `*_luu` trong `org_nhom_don_hoc_phi` — không đổi |
| Học viên đã ghi danh khóa A, giờ mua thêm B | Combo vẫn áp: giỏ gồm gia hạn A + đăng ký mới B. Enrollment A tái sử dụng (UNIQUE `(id_nguoi_dung, id_khoa_hoc)`) |
| Xác nhận nhóm bị gián đoạn giữa chừng | `xacNhanNhomDon` khóa từng đơn bằng UPDATE có điều kiện `trang_thai = 'cho_thanh_toan'` (như `xacNhanDonHocPhi`); chạy lại bỏ qua đơn đã xác nhận (idempotent) |
| Hủy một đơn trong nhóm combo | Hủy cả nhóm — không cho hủy lẻ, vì giảm giá phụ thuộc trọn bộ |
| Chia giảm giá lẻ đồng | Phần dư dồn đơn đầu, `Σ so_tien_vnd = tong_vnd` |
| Gói không gắn khóa (`id_khoa_hoc IS NULL`) | Nhóm riêng, không dùng được trong combo |
| Trung tâm chưa có khóa | Tab Combo empty state, chặn nút tạo |

---

## 8. Security

- **Không** policy ghi cho `authenticated` trên bảng mới — mutation chỉ qua service role, gate module `hoc-phi-goi`: `an` → 403, `xem` → chỉ GET, `sua` → mutation. Founder tier bypass ma trận.
- **Giá do server quyết (Phase 4).** Hiện `don-chat/route.ts:36-48` và `thu-tien-mat/route.ts:38-49` tin `soTienVnd` từ client — staff (hoặc bất kỳ ai giả request) tự đặt số tiền. Phải chuyển sang tra `org_goi_hoc_phi.gia_vnd` server-side; giảm tay tách field riêng, cần quyền `hoc-phi-doi-soat = sua` + bắt buộc ghi chú (audit).
- **Cross-org:** mọi `id_goi` / `id_khoa_hoc` / `hocVienLopId` client gửi phải verify `id_to_chuc` khớp org trong URL trước khi ghi — lỗi dễ mắc nhất của feature này.
- Mọi UPDATE/DELETE `.eq("id_to_chuc", orgId)` cùng `.eq("id", ...)` (như `updateGoiHocPhi` đang làm).
- Endpoint combo phía học viên chỉ trả combo `dang_ban && hien_trang_khoa`, không lộ combo nháp/nội bộ.
- HV chỉ đọc được nhóm đơn của chính mình (policy `id_nguoi_dung = auth.uid()`).
- Không `select('*')`; ẩn gói bằng `dang_ban`, không xóa cứng (`org_don_hoc_phi.id_goi` tham chiếu lịch sử).
- Staff `xem` vẫn nhận đủ payload GET nhưng nút sửa ẩn **và** server chặn.

---

## 9. Câu treo (OPEN)

1. **Trang lịch sử học phí cho học viên?** Hiện HV chỉ thấy đơn qua card chat, không có nơi xem lại. Phase 5 có làm trang `/{...}/hoc-phi` cho HV không, hay để card chat là đủ?
2. **Nút "Đăng ký học" trên trang khóa chưa wired** (`KhoaHocDetailView.tsx:771-774` không có `onClick`). Có nối vào luồng chat tư vấn kèm gói + combo đã chọn không, hay giữ nguyên?
3. **VietQR cho nhóm đơn:** một mã cho cả nhóm (đề xuất, `ma_nhom`) hay giữ mã riêng từng đơn? Ảnh hưởng cách đối soát sao kê.
4. **Combo cho gia hạn:** combo áp cho lần mua đầu, hay mỗi lần gia hạn cả hai môn đều được giảm? Đề xuất: mỗi lần mua trọn bộ đều áp.
