# Brief — CSĐT vận hành học (chat-first)

> **Trạng thái:** Plan build · chưa migration  
> **Neo quyết định:** `CINS_DECISIONS.md` **L34** · gate ALTER `CINS_DEV_RULES.md` §1  
> **Partner:** Sine Art (`co_so_dao_tao`)  
> **Cập nhật:** 2026-07-24

---

## Mục tiêu sản phẩm

Học viên: trang cơ sở → khóa → `1_org` (thẻ khóa) → đóng học phí → vào phòng lớp (tab Tổ chức) → học / Meet / nộp bài → gia hạn VietQR · freeze 00:00 nếu hết ngày.

Org: dashboard (HV đa lớp, thu tiền mặt/QR cộng ngày, lớp–bài tập, điểm danh, doanh thu, marketing, chi nhánh).

**Không:** clone ERP Sine Art · ghi HP vào `shop_*` · reuse `edu_*` ĐH · gói theo buổi (phase này).

---

## Nguyên tắc kỹ thuật

1. Chat = mặt vận hành; dashboard = control plane.
2. Nguồn “đang học” = `org_ky_hoc` (khoảng ngày), không dual status.
3. Visibility tin phòng lớp: `chat_tin_nhan.tao_luc` ∈ các khoảng đã trả của member; gap freeze = không thấy mãi.
4. Mọi ALTER bảng cũ → báo cáo + duyệt inventory L34 trước khi SQL.
5. Đối chiếu DB thật trước mỗi migration.

---

## Gate trước Phase 1 (bắt buộc)

| Gate | Việc | Ai |
|---|---|---|
| G1 | Duyệt ALTER **A1** (`org_lop_hoc.id_chat_phong`) | User |
| G2 | Duyệt / bỏ **A3** (`meeting_url`) — khuyến nghị **bỏ** (link chỉ trong tin Meet) | User |
| G3 | Duyệt **A2** sau khi chốt cột `org_chi_nhanh` | User |
| G4 | Cập nhật FOUNDATIONS §O: “LMS mỏng chat-first” (thay “không LMS”) | User confirm doc |
| G5 | Chốt tên file migration + RLS outline | Dev sau G1 |

---

## Phase build

### Phase 0 — Doc & ACL product (0.5–1 ngày)

- [ ] Curator = ACL app: `quan_ly_noi_dung` / nhãn Curator chỉ Bài đăng + comment-as-org trên CSĐT.
- [ ] Map vai trò dashboard: `admin` full · `quan_ly_tuyen_sinh` tư vấn+đơn · `giao_vien` lớp/tiến độ/điểm danh · `quan_ly_noi_dung` bài tập+bài đăng.
- [ ] Shell route dashboard org CSĐT (path đề xuất: `/co-so/[slug]/quan-ly` hoặc `/ban-hang`-style `/dao-tao/...` — chốt 1 trước code).

**Done khi:** Nav + gate vai trò trống chạy được trên 1 org seed.

---

### Phase 1 — Schema xương sống (1–2 ngày)

**Bảng mới** (CREATE — không ALTER):

| Bảng | Việc |
|---|---|
| `org_chi_nhanh` | Chi nhánh |
| `org_goi_hoc_phi` | Gói tháng/khóa → `so_ngay` + giá |
| `org_don_hoc_phi` | Đơn thu (vietqr \| tien_mat \| ck_thu_cong) |
| `org_ky_hoc` | `ngay_dau` / `ngay_cuoi` per `user_hoc_vien_lop` |
| `org_tien_do_bai` | Con trỏ bài hiện tại |
| `org_nop_bai` | Nộp / duyệt |
| `org_diem_danh` | Điểm danh |

**ALTER (chỉ sau duyệt L34):**

- A1 `org_lop_hoc.id_chat_phong`
- A2 `org_lop_hoc.id_chi_nhanh` (sau `org_chi_nhanh`)

**Lib:** `lib/co-so/ky-hoc.ts` (active? freeze? còn N ngày) · `lib/co-so/don-hoc-phi.ts`.

**Done khi:** Migration idempotent chạy trên DB staging/dev; helper kỳ học có unit-smoke.

---

### Phase 2 — Lớp ↔ phòng chat cố định (1–2 ngày)

- [ ] Tạo/ cập nhật lớp trên trang khóa → đảm bảo `chat_phong` `loai_phong='lop_hoc'`, `id_context=lop.id`, `id_org_dai_dien`, ghi `id_chat_phong`.
- [ ] Tab Tổ chức: list phòng lớp user là member (và staff org).
- [ ] Sau đóng tiền lần đầu: insert `chat_thanh_vien` + tin system chào mừng.
- [ ] Mở khóa → tạo `org_bai_dang` `loai=thong_bao` (optional hook).

**Done khi:** TV/admin tạo lớp → phòng xuất hiện; HV chưa trả không vào được phòng.

---

### Phase 3 — Thu học phí (cash + đơn trong `1_org`) (2–3 ngày)

- [ ] Catalog gói trên dashboard / gắn khóa.
- [ ] Card `ngu_canh.loai=don_hoc_phi` trong `1_org` (TV tạo đơn lần đầu).
- [ ] Dashboard **Quản lý học viên**: 1 HV nhiều lớp; form **Thu tiền mặt** → tạo `org_don_hoc_phi` + kéo dài `org_ky_hoc`.
- [ ] Pipeline chung `xacNhanDonHocPhi()`: cộng ngày · join phòng nếu lần đầu · tạo Journey `sinh_tu_hoc_vien_lop` + verify org.
- [ ] `cau_hinh.thanh_toan` (STK/NH) — không ALTER cột.

**Done khi:** Cash trên dashboard và đơn chat cùng cộng ngày + verify bắt đầu học.

---

### Phase 4 — Freeze 00:00 + visibility (1–2 ngày)

- [ ] Cron/edge hoặc lazy-check: hết `ngay_cuoi` (ngày VN) → UI phòng xám.
- [ ] Query tin: filter theo khoảng `org_ky_hoc` của viewer (staff org thấy full).
- [ ] Freeze: không gửi tin / không Meet; **vẫn hiện CTA Gia hạn**.
- [ ] Sau gia hạn: thấy tin mới sau `ngay_dau` kỳ mới; gap freeze không lộ.

**Done khi:** Test 2 kỳ cách nhau 3 ngày — HV không đọc được tin trong gap.

---

### Phase 5 — Gia hạn VietQR tự động (2 ngày)

- [ ] UI “Gia hạn học phí” (banner phòng xám + optional `1_org`).
- [ ] Sinh `ma_don` + VietQR (reuse `lib/shop/vietqr` pattern).
- [ ] Webhook/đối soát (SePay hoặc polling) → `xacNhanDonHocPhi`.
- [ ] Nhắc sắp hết hạn (system msg / `chat_moc` style) trước N ngày.

**Done khi:** Quét đúng mã → auto cộng ngày, unfreeze, không cần TV bấm.

---

### Phase 6 — Buổi học trong chat (2–3 ngày)

- [ ] Ping trước giờ 15’ (`chat_moc` + tick; chỉ member kỳ active).
- [ ] Card Meet trong phòng (GV tạo; không host WebRTC phase này).
- [ ] Nộp bài trong chat → `org_nop_bai` + `ngu_canh`.
- [ ] Dashboard: duyệt đạt/làm lại + gán `org_tien_do_bai` (một thao tác “Đạt + mở bài tiếp”).
- [ ] Popup HV: đăng Journey? + `che_do_hien_thi`.
- [ ] Trang khóa: unlock `org_bai_tap` theo tiến độ (đã có bảng bài tập).

**Done khi:** Vòng họp → nộp → duyệt → mở bài → popup Journey chạy end-to-end trên 1 lớp seed.

---

### Phase 7 — Ops còn lại dashboard (2 ngày)

- [ ] Lịch điểm danh (`org_diem_danh`).
- [ ] Doanh thu: aggregate `org_don_hoc_phi` theo chi nhánh / kỳ.
- [ ] Marketing số liệu: lead `1_org` → đóng tiền → gia hạn / churn freeze (query layer).
- [ ] CRUD chi nhánh + gắn lớp.

**Done khi:** Admin CSĐT dùng được 6 mục nav đã mô tả (HV, điểm danh, doanh thu, marketing, khóa/lớp, chi nhánh).

---

### Phase 8 — Partner Sine Art (sau ổn định)

- [ ] ETL/sync HV–kỳ từ DB Sine Art → CINs (không embed admin Sine Art).
- [ ] Seed gói + lớp mẫu trên org Sine Art đã verify.
- [ ] Đo funnel thật → chỉnh O12 gói tháng.

---

## Thứ tự dependency (tóm tắt)

```text
G1–G3 duyệt ALTER
  → P1 schema
  → P2 phòng lớp
  → P3 thu tiền + verify
  → P4 freeze
  → P5 VietQR gia hạn
  → P6 buổi học / bài tập / Journey
  → P7 dashboard ops
  → P8 sync Sine Art
```

---

## Ngoài scope (cố ý)

- Lương GV, BCTC đầy đủ, họa cụ, LiveKit native, guest chat chưa login, gói theo buổi, reviews khóa (O9), chương trình đa khóa (O10).

---

## Checkpoint với user mỗi phase

Trước khi sang phase sau: demo 1 luồng trên org seed + cập nhật L34 (ALTER đã chạy) + IMPLEMENTATION (route/SQL). Không gộp P3+P4+P5 trong một PR lớn.
