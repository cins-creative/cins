# Brief — CSĐT vận hành học (chat-first)

> **Trạng thái:** Plan cuối · **tách 2 giai đoạn**  
> **Neo:** `CINS_DECISIONS.md` **L34** · gate ALTER `CINS_DEV_RULES.md` §1  
> **Partner:** Sine Art (`co_so_dao_tao`)  
> **Cập nhật:** 2026-07-24

---

## Hai plan (không làm lẫn)

| | **Plan 1 — Vận hành học (NOW)** | **Plan 2 — LiveKit / WebRTC (LATER)** |
|---|---|---|
| Khi nào | Làm ngay | **Chỉ khi user báo `ready`** |
| Phạm vi | Tư vấn `1_org` · đơn HP · phòng lớp chat · freeze · VietQR · pedagogy · dashboard | LiveKit self-host Hetzner `sin` · in-chat call · share màn · FaceTime-like |
| Call / Meet / share màn | **Không** — không UI call, không provision Hetzner | **Có** — toàn bộ Track B cũ |
| Phụ thuộc | ALTER A1 (+ A2), schema `org_*` HP/kỳ | Plan 1 đã có `chat_phong` lớp + kỳ học (để gate token) |

**Chốt stack Plan 2 (giữ sẵn, không triển khai sớm):** LiveKit OSS · Hetzner Singapore (`sin`) · room = `chat_phong.id` · bill Hetzner only.

---

## Mục tiêu Plan 1 (sản phẩm)

Học viên: trang cơ sở → khóa → `1_org` (thẻ khóa) → TV gửi đơn HP → đóng tiền (QR/cash) → **vào phòng chat lớp** (tab Tổ chức) → chào mừng · ping lịch (text) · nộp bài trong chat · GV duyệt + gán tiến độ trên dashboard · popup Journey · gia hạn VietQR · **freeze 00:00** (không call).

Org: dashboard HV · thu tiền · lớp/bài · điểm danh · doanh thu · marketing · chi nhánh.

**Cố ý chưa có trong Plan 1:** chia sẻ màn hình, call, Meet/Zoom-as-product, LiveKit, máy Hetzner.

---

## Nguyên tắc (cả hai plan)

1. Chat = mặt vận hành; dashboard = control plane.
2. Nguồn “đang học” = `org_ky_hoc` (ngày lịch); freeze 00:00 hết ngày.
3. Visibility tin lớp = `tao_luc` ∈ khoảng đã trả; gap freeze không lộ.
4. ALTER cột cũ → báo cáo + duyệt L34 trước SQL.
5. Plan 2 không đụng schema HP; chỉ thêm media plane + token API + UI call.

---

# PLAN 1 — Vận hành học (làm trước)

## Gate

| Gate | Việc | Trạng thái |
|---|---|---|
| G1 | Duyệt ALTER **A1** `org_lop_hoc.id_chat_phong` | Chờ user |
| G2 | A3 `meeting_url` | **Hủy** (Plan 2 không dùng URL Meet) |
| G3 | Duyệt **A2** `id_chi_nhanh` sau bảng chi nhánh | Chờ |
| G4 | FOUNDATIONS §O → “LMS mỏng chat-first” (chưa call) | Chờ confirm doc |

## Phase P0 — ACL & shell (0.5–1 ngày)

- [ ] Curator: chỉ Bài đăng + comment-as-org
- [ ] Map vai trò admin / TV / GV / nội dung
- [ ] Shell dashboard CSĐT (path chốt: `/co-so/[slug]/quan-ly` hoặc tương đương)

## Phase P1 — Schema (1–2 ngày) — sau G1

**CREATE:** `org_chi_nhanh`, `org_goi_hoc_phi`, `org_don_hoc_phi`, `org_ky_hoc`, `org_tien_do_bai`, `org_nop_bai`, `org_diem_danh`  
**ALTER:** A1 · A2  
**Lib:** `lib/co-so/ky-hoc.ts`, `don-hoc-phi.ts`

## Phase P2 — Tư vấn + phòng lớp chat (1–2 ngày)

- [ ] `1_org` giữ thẻ khóa (đã có) · mở rộng card đơn HP (P3)
- [ ] Tạo lớp trên trang khóa → `chat_phong` `loai_phong='lop_hoc'` + `id_chat_phong`
- [ ] Tab Tổ chức: list phòng lớp
- [ ] Sau đóng tiền lần đầu: join phòng + tin chào mừng
- [ ] Mở khóa → `org_bai_dang` `thong_bao`
- [ ] **Không** nút call / share màn

## Phase P3 — Thu học phí (2–3 ngày)

- [ ] Catalog gói (tháng/khóa — không buổi)
- [ ] Card `don_hoc_phi` trong `1_org` (TV tạo lần đầu)
- [ ] Dashboard HV: thu **tiền mặt** / CK thủ công → cộng ngày
- [ ] `xacNhanDonHocPhi()` → kỳ + join + Journey verify “bắt đầu học”
- [ ] `cau_hinh.thanh_toan` (STK) — không ALTER cột

## Phase P4 — Freeze + visibility (1–2 ngày)

- [ ] Hết ngày → phòng xám 00:00; vẫn trong roster
- [ ] Filter tin theo `org_ky_hoc`; cấm gửi tin khi freeze
- [ ] CTA Gia hạn luôn hiện khi freeze
- [ ] Gap tin trong freeze: mãi không thấy sau khi mở lại

## Phase P5 — Gia hạn VietQR (2 ngày)

- [ ] Banner gia hạn · `ma_don` · đối soát → cộng ngày / unfreeze

## Phase P6 — Pedagogy trong chat (không WebRTC) (2 ngày)

- [ ] Ping trước giờ 15’ (**tin system / `chat_moc`** — không mở call)
- [ ] Nộp bài trong chat → `org_nop_bai`
- [ ] Dashboard: duyệt + gán `org_tien_do_bai`
- [ ] Popup đăng Journey + chế độ hiển thị
- [ ] Unlock `org_bai_tap` trên trang khóa

## Phase P7 — Dashboard ops (2 ngày)

- [ ] Điểm danh · doanh thu · marketing queries · CRUD chi nhánh

## Phase P8 — Partner Sine Art (sau P1–P7 ổn)

- [ ] ETL / seed gói–lớp · đo funnel

### Done Plan 1 khi

Luồng tư vấn → tiền → phòng lớp chat → freeze/gia hạn → nộp/duyệt/tiến độ → dashboard chạy end-to-end **không** cần LiveKit.

---

# PLAN 2 — LiveKit WebRTC (chỉ khi user báo `ready`)

> Không provision Hetzner, không merge UI call, không env LiveKit prod cho đến tín hiệu **ready**.

## Nhắc lại chốt (khi tới lúc)

- LiveKit OSS self-host · Hetzner **`sin`**
- Phòng học = share màn + A/V **trong** chat lớp
- Token: membership + kỳ active; freeze → 403
- HV tắt cam mặc định; monitor traffic SIN (overage đắt)

## Phase L0–L5 (khi ready)

| Phase | Việc |
|---|---|
| L0 | Provision Hetzner `sin` |
| L1 | LiveKit + coturn + TLS + secrets |
| L2 | API token CINs (`chat_phong` + kỳ) |
| L3 | UI in-chat: Vào phòng học / share màn |
| L4 | Harden ~200 concurrent nhiều lớp |
| L5 | Call 1-1 / nhóm (FaceTime-like) cùng SFU |

Chi tiết ops/cost giữ trong L34 DECISIONS; mở rộng checklist khi bắt đầu Plan 2.

---

## Ngoài scope (cả hai plan hiện tại)

- Meet/Zoom đường chính · LiveKit Cloud trả phút · gói theo buổi · lương/BCTC/họa cụ · guest chưa login · O9/O10

---

## Checkpoint

- Mỗi phase Plan 1: demo + cập nhật L34 ALTER + IMPLEMENTATION.
- **Không** bắt đầu Plan 2 trừ khi user viết rõ **ready** (hoặc tương đương).
- Không gộp P3+P4+P5 một PR; không ALTER lén ngoài inventory.
