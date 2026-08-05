# CINS — DECISIONS

> **File trong repo:** `docs/CINS_DECISIONS.md`
> **Decision log + câu hỏi treo.** File này chống quên: ghi *đã quyết gì, vì sao*, và *còn treo gì, đóng khi nào*.
> Quy tắc: mỗi câu treo phải có **điều kiện đóng** cụ thể, không để "[cần duyệt]" lửng lơ vô thời hạn.
> Khi một câu được chốt → chuyển từ phần OPEN xuống phần LOG kèm ngày.

---

## OPEN — câu hỏi đang treo

| # | Câu hỏi | Trạng thái tạm | Điều kiện đóng |
|---|---|---|---|
| O2 | Chat 1-1 có gate sau kết bạn không? | Chưa gate — giữ logic chat cũ | Khi có báo cáo spam/quấy rối từ user thật, hoặc trước khi mở chat cho user ngoài cohort Sine Art. |
| O3 | `studio` vs `doanh_nghiep` | ✅ **ĐÃ CHỐT — gộp** (xem L7). Còn lại: bao giờ `doanh_nghiep` cần tab/field riêng tách lại? | Khi có org doanh_nghiep yêu cầu tính năng studio không có. Hiện không. |
| O4 | Cap file video | 300MB (đang cân nhắc 500MB) | Khi đo được chi phí Bunny + hành vi upload thật của cohort đầu. Chốt 1 con số trước launch. |
| O5 | `verify_yeu_cau` Loại 2 — có cần vai trò `quan_ly_nhan_su` riêng để duyệt membership? | Không — admin duyệt tất (xem L9) | Khi có công ty lớn (>50 member) yêu cầu tách quyền duyệt nhân sự khỏi duyệt nội dung. |
| O6 | Phân nhóm tag `keyword`/`phan_mem` theo ngành nghề | Defer | Khi có đủ data tagging thật từ user (gợi ý ngưỡng: ≥200 tag active). |
| O8 | Bản đồ nghề cộng đồng — có cần thêm cấp bậc/chức danh (Junior/Senior/Lead) ngoài `giai_doan`? | ❌ Không — chỉ dùng `giai_doan` | Chức danh thay đổi liên tục + khó verify + mau cũ → bản đồ sẽ luôn sai. Chỉ làm khi có hệ chức danh chuẩn hoá gắn vào milestone công việc *đã verify*. Hiện không cần. |
| O9 | Reviews / đánh giá khóa học | **Defer** | Khi nhu cầu social proof vượt "tác phẩm verified + số học viên hoàn thành". Cân nhắc *pull external* (Google reviews) thay vì tự xây hệ sao. Phản vanity → thận trọng. |
| O10 | Gom nhiều khóa → "Chương trình học" (lộ trình 6–12 tháng, kiểu Keyframe CTH) | **Defer cứng** | Khi có org thật cần track dài hạn nhiều khóa nối tiếp. Sine Art không cần (dạy theo môn rời). |
| O11 | `org_giao_trinh.loai` (phân loại bài: bắt buộc / tùy chọn / project) | ✅ **Đóng** — thay bằng `org_giao_trinh_bai.thuoc_tinh` (enum 8 value, theo cặp bộ×bài). Xem LOG 2026-08-04 Bộ giáo trình MM. | — |
| O12 | Học phí theo gói tháng (1/2/3/6) cho mô hình liên tục | **Mở lại — thiết kế** (L34): catalog `org_goi_hoc_phi` (tháng/khóa); **bỏ gói theo buổi** phase này; entitlement = **ngày lịch** | Chốt cột bảng mới + ALTER (nếu có) trước migration; đóng khi seed gói Sine Art chạy được. |
| O15 | Tỉ lệ chèn bài org chưa-follow vào feed giữa + có nên chèn không? | **Tạm 1 org / 10 người, tối đa 1 bài/org, gắn nhãn "Gợi ý", không engagement-sort** (L21 #3) | Khi đo được feed thật: org-post có bị bỏ qua / báo phiền không. Có thể hạ về 0 (chỉ giữ kênh gợi ý + attribution) nếu chèn feed gây loãng. Chốt trước khi scale ngoài cohort đầu. |
| O16 | Dedupe phòng nhóm trùng tập thành viên | **Defer** — quản lý nhóm cơ bản + project workspace đã có (L25/L28) | Khi có báo cáo spam hoặc nhiều phòng trùng thành viên từ cohort thật. |
| O17 | Nhắc mốc chat (`chat_moc`) — tin system trong phòng khi tạo / tới lúc nhắc / đến hạn; tick client + `POST /api/chat/mocs/tick` | **Partial** — chưa push/email ngoài app | Mở rộng push/email khi có worker ổn định. |
| O19 | Bán vé sự kiện / tồn kho / gắn `id_loai_ve` vào `org_dang_ky_su_kien` / QR check-in? | **Defer** — phase 1 chỉ catalog loại vé (`org_su_kien_loai_ve`) | Khi chốt mô hình tiền (P2P như shop hoặc ngoài CINs) + nhu cầu cohort thật. Không mở payment trên CINs trước đó. |
| O20 | Tỷ lệ phí nền tảng (%) + giữ **trả sau** hay chuyển **trả trước / ký quỹ**? | Đề xuất **5% GMV, kỳ tháng, trả sau** (2026-07-30) | Chốt con số trước khi bật thu phí thật. Xem lại mô hình trả sau khi đo được tỉ lệ seller nợ phí thực tế — nếu thất thu cao thì chuyển trả trước (nạp credit). |
| O21 | Hạ tầng chạy job định kỳ (chốt kỳ phí tháng) — Cloudflare Workers `triggers` hay GitHub Actions? | **Chưa có cron trong repo**; ưu tiên Workers cron + route nội bộ `xacThucBearerSecret()` | Khi bật thu phí nền tảng thật. Đóng khi chạy thử được 1 kỳ chốt phí trên staging. |
| O22 | Giấy phép MXH (NĐ 147/2024) yêu cầu **≥1 máy chủ đặt tại VN** — hiện chạy Cloudflare Workers | **Treo** — chưa có phương án | Khi nộp hồ sơ MXH. Cần quyết: thuê VPS VN làm node phụ/log, hay mô hình khác. |

> O7 (lớp "uy tín/hữu ích" cho `content_thao_luan`) → **đã đóng / không còn áp dụng** (xem L12): `content_thao_luan` đã bỏ, thảo luận giờ là comment trên cột mốc.

> O1 (giữ `user_theo_doi` hay bỏ?) → **đã đóng / chốt GIỮ + MỞ RỘNG** (xem L17): theo dõi gồm cả `nguoi_dung` (không chỉ tag/org), nội dung được theo dõi phân bổ lên Gallery.

> O14 (escape hatch admin gán quyền org) → **đã đóng** (xem **L22**, 2026-07-01): panel `/admin/to-chuc` + mật khẩu ủy quyền env, chỉ `super_admin` — không mở lại god-mode inline trên trang org (giữ L20).

> O13 (mô hình rank Gallery follow-feed / feed: chronological vs engagement-weighted?) → **đã đóng** (xem **L30**, 2026-07-14): World Timeline = hybrid điểm (không chronological thuần, không engagement-rank thuần). Gallery follow-feed vẫn thời gian thực + L29 editorial.

---

## LOG — quyết định đã chốt

### Chat — hộp thư người lạ gom theo org, 5 hội thoại / org (2026-08-05)

- Sidebar «Tổ chức của tôi» chỉ còn **một** entry «Hộp thư người lạ» gom mọi org viewer quản trị (thay vì một entry / org).
- Pane convo thành **2 lớp**: lớp 1 = card từng org (số người lạ nhắn · chưa trả lời · chưa đọc), lớp 2 = danh sách hội thoại của org đó.
- Nút **«Mở trang quản lý»** chuyển từ header dùng chung xuống **từng card org**; lớp 2 có dòng «Xem tất cả N hội thoại» khi bị cắt.
- `listOrgStaffInboxThreadsForViewer` chỉ hydrate **`ORG_INBOX_MAX_THREADS_PER_ORG = 5`** thread / org (ưu tiên chưa trả lời → mới nhất). Query tách 2 pass: pass 1 nhẹ (`id_phong, id_nguoi_gui, tao_luc`) cho toàn bộ phòng để đếm tổng chính xác; pass 2 `MESSAGE_SELECT` chỉ cho phòng hiển thị.
- Tổng thật đi kèm thread qua `orgInboxTongHoiThoai` / `orgInboxTongChuaTraLoi` / `orgInboxTongChuaDoc` / `orgInboxDaCat` → gom vào `ToChucOrgNode.inbox.tong*` (không thêm round-trip API).

### CSĐT — Giáo trình trong chat lớp + đồng bộ tiến độ (2026-08-04)

- **Plan:** `docs/PLAN_giao_trinh_modules.md` §11 (Phase 6). Migration: `npm run migrate:tien-do-giao-trinh-chat`.
- **Schema:**
  - `CREATE TABLE org_tien_do_bai_mo` (lịch sử mở bài / HV; unique `(id_hoc_vien_lop, id_bai_tap)`).
  - `ALTER org_nop_bai`: `+ luu_luc`, `+ id_nguoi_luu`, `+ id_cot_moc`, `+ dang_journey_luc`.
  - `ALTER org_khoa_hoc`: `+ dong_bo_tien_do boolean NOT NULL DEFAULT false`.
- **Đồng bộ:** khóa `dong_bo_tien_do=true` → mở bài fan-out cả lớp; HV mới join **copy** bài đã mở (Q5). `false` → từng HV.
- **Tin «Chúc mừng» (Q4):** tin `system` `ngu_canh.loai=mo_bai` (+ nop/luu/journey) — chỉ HV đích + staff thấy; HV khác không thấy.
- **Thuộc tính:** mọi loại bài đều khóa tới khi GV mở; nộp chỉ `bai_tap`/`kiem_tra`/`du_an`/`on_tap`.
- **TVV (`quan_ly_tuyen_sinh`):** panel Quản lý HV read-only.
- **Lưu bài → Journey:** GV Lưu = duyệt; HV Đăng Journey → `verify_yeu_cau`/`verify_xac_nhan` auto `da_duyet`/`da_xac_nhan` (không duyệt tay lần 2). Phase 6 chỉ ảnh.
- **Bugfix kèm:** `ganTienDoBai` validate theo bộ giáo trình (không còn `id_khoa_hoc`); bỏ spam `org_bai_dang`.

### CSĐT — Bộ giáo trình MM + module bài tập (2026-08-04)

- **Plan:** `docs/PLAN_giao_trinh_modules.md`.
- **Mô hình:** thư viện module (`org_bai_tap` cấp org) + bộ (`org_bo_giao_trinh`) + junction MM `org_giao_trinh_bai` mang `thuoc_tinh` theo cặp. 1 khóa ↔ 1 bộ (`org_khoa_hoc.id_bo_giao_trinh`). Mỗi CSĐT tự tạo — không chia sẻ bộ giữa org.
- **Enum cố định `loai_bai_giao_trinh_enum`:** `bai_tap` · `ly_thuyet` · `tham_khao` · `demo` · `bai_mau` · `kiem_tra` · `du_an` · `on_tap`.
- **Không** ẩn/hiện từng bài/bộ (không `visible` trên junction/bộ). Giữ `bai_tap_hien_thi` trên khóa.
- **ALTER (đã duyệt):** `org_bai_tap` +`id_to_chuc` +`yeu_cau`, `id_khoa_hoc` DROP NOT NULL; `org_khoa_hoc` +`id_bo_giao_trinh`.
- **Migration:** `npm run migrate:bo-giao-trinh` (`supabase/sql/migration_org_bo_giao_trinh.sql`).
- **O11** (`org_giao_trinh.loai`) — thay bằng thuộc tính trên junction; legacy `org_giao_trinh` vẫn chưa xóa.

### CSĐT — Mã đơn học phí = mã khóa + mã lớp + 5 số (2026-08-04)

- **Chốt (variant A):** `{MÃKHÓA}{MÃLỚP}{5 số}` — uppercase, bỏ khoảng/ký tự lạ. Ví dụ `BCM` + `Onl 2` → `BCMONL248291`.
- **Fallback:** thiếu mã khóa → `KHOA`; thiếu mã lớp → `LOP`.
- **Phạm vi:** đơn mới (`createAndSendDonHocPhiChat`, `createDonTuGoi`). Đơn cũ `HP…` giữ nguyên. Nhóm combo: `ma_nhom` vẫn `HPN…` cho QR/CK; từng dòng đơn dùng mã A.
- **Lib:** `lib/co-so/ma-don-hoc-phi.ts` · retry 23505 trên `uq_org_don_hoc_phi_ma_don`.

### CSĐT — Hard delete khóa/lớp có guard (2026-08-04)

- **Tách hành động:** **Tạm dừng** = PATCH trạng thái (`tam_dung` / `huy`, vẫn thấy trong QL). **Xóa** = hard `DELETE` row.
- **Guard lớp:** chặn nếu có ghi danh / đơn `da_nhan_tien` / tin chat người dùng. Cảnh báo điểm danh + cột mốc.
- **Guard khóa:** chặn nếu có lớp thật (không scaffold) / ghi danh (kể cả `id_lop_hoc NULL`) / đơn đã trả / combo dùng khóa / cột mốc đã verify+public. Cảnh báo bài tập, giáo trình, gói.
- **Preflight:** `GET …/xoa-preflight` → Warning + link xử lý; `DELETE` re-check → 409 nếu còn blocker.
- **Plan:** `docs/PLAN_hard_delete_khoa_lop.md`. Lib: `lib/to-chuc/khoa-lop-xoa.ts`.

### CSĐT — Gỡ ghi danh có guard doanh thu (2026-08-04)

- **Vấn đề:** guard hard delete chặn khi còn ghi danh, nhưng không có API xóa ghi danh → khóa nháp lỡ có ghi danh test là kẹt vĩnh viễn, chỉ còn Tạm dừng.
- **Sự thật DB (đọc trực tiếp):** `org_don_hoc_phi.id_hoc_vien_lop`, `org_ky_hoc.id_hoc_vien_lop`, `org_nop_bai`, `org_tien_do_bai` đều `ON DELETE CASCADE` về `user_hoc_vien_lop`. Doanh thu cộng thẳng từ rows `org_don_hoc_phi` (không có sổ cái riêng) → xóa ghi danh trần = mất doanh thu.
- **Chốt:** thêm **Gỡ ghi danh** (`DELETE /api/co-so/[id]/hoc-vien/[hvlId]`, quyền module `hoc-vien = sua`). Blocker duy nhất: còn đơn `da_nhan_tien`. Cảnh báo (vẫn cho gỡ): đơn `cho_thanh_toan`, kỳ học, bài nộp, tiến độ.
- **Hệ quả:** khóa đã thu tiền dù một học viên vẫn không xóa được — chỉ Tạm dừng. Đúng chủ trương doanh thu bất khả xâm phạm.
- Lib: `lib/co-so/ghi-danh-xoa.ts`.

### CSĐT — Phí nền tảng (Sepay) · A-1 schema (2026-08-05)

- **Chốt:** free tier đầy đủ chức năng; phí = % doanh thu HP ghi nhận; kích hoạt khi phí lũy kế ≥ ngưỡng; sau đó chốt cuối tháng; quá hạn chỉ khóa thêm ghi danh. Plan: `docs/PLAN_csdt_phi_nen_tang_va_lead.md`.
- **A-1 (đã chạy):** 5 bảng mới, **không ALTER** bảng live — `cins_cau_hinh_tai_chinh` (admin tài chính: %/ngưỡng/STK/DN) · `org_phi_ky` (`dieu_chinh_vnd`, chỗ HĐĐT) · `org_phi_dong` (SET NULL khi gỡ đơn — giữ snapshot phí) · `org_phi_thanh_toan` · `org_phi_khieu_nai`.
- **RLS:** member SELECT kỳ/dòng/khiếu nại; `cins_cau_hinh_tai_chinh` + `org_phi_thanh_toan` = service-role only.
- **Seed:** 10% · 2.000.000₫ · 7 ngày · STK/DN trống · `xuat_hoa_don_bat=false`.
- File: `supabase/sql/migration_csdt_phi_nen_tang.sql` · `npm run migrate:csdt-phi`.
- **A-2:** `lib/co-so/phi.ts` · `phi-config.ts` — `ghiPhiDongKhiXacNhanDon` hook trong `xacNhanDonHocPhi` (sau flip `cho_thanh_toan→da_nhan_tien`). `loaiTruPhiDong` / `tinhPhiLuyKeChuaVaoKy` / `recalcKy` sẵn cho A-3.
- **A-3:** `lib/co-so/phi-ky.ts` · `phi-gate.ts` — lazy kích hoạt (≥ ngưỡng) + chốt tháng (mốc tháng kích hoạt + 1) + `getCsdtPhiGate` / `assertCoTheThemGhiDanh`.
- **A-4:** `GET /api/co-so/[id]/phi` · `/co-so/[slug]/quan-ly/phi` · nav «Phí CINs» (nhóm Tiền).
- **A-5:** Gate `createGhiDanh` → 402 · banner quan-ly · disable «Thêm ghi danh». `GET …/phi/gate` cho mọi staff quan-ly.
- **A-6:** `lib/co-so/phi-sepay.ts` · `POST /api/webhook/sepay` — auth `Authorization: Apikey|Bearer` vs env `SEPAY_WEBHOOK_SECRET`; UNIQUE `sepay_id`; parse mã CK → cộng `da_tra_vnd` / `da_tra`; unmatched giữ `id_ky=null` cho A-7.
- **A-7:** `lib/co-so/phi-khieu-nai.ts` · `phi-admin.ts` · founder `…/phi/khieu-nai` · `/admin/csdt-phi` (kỳ / GD gán tay / khiếu nại + `so_hoa_don`). `apDungSoTienVaoKy` dùng chung webhook + gán tay.
- **A-8:** `lib/co-so/phi-cron.ts` · `POST /api/noi-bo/csdt-phi/chot-ky` (Bearer `CSDT_PHI_CRON_SECRET`). Noti `csdt_phi_den_han` / `csdt_phi_qua_han`. Logic phí vẫn đúng khi lazy; cron đẩy thông báo. Workers cron **chưa** gắn (O21 còn mở).

### CSĐT — Hình thức học & địa điểm thuộc Lớp (2026-08-03)

- **Ranh giới:** Khóa = danh tính + giáo trình + gói HP + `loai_mo_hinh`. Lớp = `hinh_thuc` + địa điểm + lịch + GV + sĩ số.
- **DB:** `hinh_thuc` vốn chỉ trên `org_lop_hoc`. Thêm junction `org_lop_hoc_chi_nhanh` (N chi nhánh/lớp). Giữ `org_lop_hoc.id_chi_nhanh` = chi nhánh chính (`chiNhanhIds[0]`).
- **Tạo khóa:** không scaffold lớp đầu; CTA «Thêm lớp» sau tạo. Khóa trần (`hinhThucs=[]`) **ẩn** catalog công khai + 404 URL public; quản lý vẫn thấy + cảnh báo.
- **Catalog `/tim-khoa-hoc`:** filter hình thức = match-any trên `hinhThucs[]`.
- **Plan:** `docs/PLAN_hinh_thuc_ve_lop.md`. Migration: `npm run migrate:lop-chi-nhanh`.

### Studio / DN — tab Analytics trong quan-ly (2026-08-03)

- **Nav:** thêm section `analytics` (label **Analytics**) sau Sự kiện — studio + doanh_nghiep (`STUDIO_NAV_GROUPS`).
- **Route:** `/studio/[slug]/quan-ly/analytics`.
- **Mục đích:** tổng hợp hiệu quả tiếp cận nội dung org (tiếp cận / tương tác / nguồn / theo bài). Số liệu từng bài vẫn qua «Số liệu tiếp cận»; tab này là cấp org (UI scaffold trước, nối rollup sau).

### Org — «Quản lý bài học viên» gom tag + tường (2026-08-03)

- **Nav / sidebar:** nút cũ «Thông báo» (`TruongMilestoneTagNotify`) → **Quản lý bài học viên**.
- **Panel:** filter Tất cả · Chờ duyệt · **Đã duyệt** (= bảng `CoSoDoanSanPhamAdmin` khi CSĐT/ĐH) · Từ chối. Studio: Đã duyệt = list tag. Không tab «Hiển thị tường» riêng.
- **Public tab** sản phẩm/đồ án: bỏ nút mở quản lý trên trang; admin vào qua quan-ly / sidebar editing.

### Chat — Org node summary + thông báo dùng chung (2026-08-03)

- **Org node «Của tôi»:** không xổ inbox staff; chỉ hiện *Chưa đọc / Chưa trả lời* (chip → QL `?filter=`). Expand chỉ **hub + phòng lớp**.
- **Bubble:** `isOrgStaffInbox` không vào floating stack — ưu tiên Noti.
- **Noti click:** → `/quan-ly/tin-nhan?room=` (đảo chốt 2026-08-02 «Bell → overlay»).
- **Quản lý thông báo:** `org_to_chuc.cau_hinh.tinNhan.thongBaoChung` (0 migration). Mặc định off (hiển thị đầy đủ). On = watermark/noti dùng chung giữa admin. Chỉ `owner`/`admin` đổi. API `GET|PATCH /api/org/:orgId/chat/thong-bao`.
- Plan: `docs/PLAN_org_chat_node_summary.md`.

### Chat — hộp thư org trong overlay + notify + hint nội bộ (2026-08-02)

- **Identity as-org (C1):** không ALTER `chat_tin_nhan`. Tin staff vẫn `id_nguoi_gui` = staff; khách thấy branding org (mask UI + server redact). Formalize cột `id_to_chuc` chỉ khi cần as-org trong phòng nhóm/lớp.
- **Hint nội bộ:** member active bất kỳ vai trò của org thấy «Trả lời bởi {tên} · {vai trò}». Lọc **server-side** (`applyOrgAdvisoryPerspective`); realtime client redact nếu `!viewerIsOrgMember`.
- **Notify:** `loai_doi_tuong=org_tin_nhan_moi`, coalesce **1 row / admin / phòng** (`id_doi_tuong=roomId`). Fan-out `ORG_ADMIN_ROLES`. Mark read khi `markRoomRead`. Bell `JourneyNotifications` → **trang QL tin nhắn** (`?room=`), không mở overlay.
- **Tab «Tổ chức»:** sub-filter Tất cả / Của tôi / Tham gia. «Của tôi» = `isOrgStaffInbox` (+ hub/lớp org quản trị). Badge vai trò viewer trên thread staff.
- **Nút Tin nhắn sidebar:** mở overlay `tab=to_chuc` + `toChucFilter=cua_toi` (không còn modal `OrgInboxPanel`). Trang CSĐT `/quan-ly/tin-nhan` giữ nguyên.
- Plan: `docs/PLAN_org_inbox_notify_chat.md`. **0 migration.**

### Chat — tab «Mua bán» gom Mua hàng + Khách hàng (2026-08-02)

- **Chốt UX:** một tab cấp 1 **«Mua bán»** thay hai tab riêng; bên trong sub-tab **Mua hàng** (buyer) · **Khách hàng** (seller).
- **Kiến trúc:** `ChatThreadGroup` vẫn `ban_be|nguoi_la|to_chuc`. `ChatThreadView = … | "mua_ban"`. Sub: `ChatMuaBanSub = "mua_hang" | "khach_hang"`. Cờ chiều phụ: `thread.isMuaHang` / `thread.isKhachHang` (+ thẻ seller) — hội thoại vẫn nằm Bạn bè/Người lạ.
- **Hiện tab:** `banHangBat` **hoặc** có DM với seller đã mua (`listShopNguoiBanDaMua`). Sub Khách hàng chỉ seller; sub Mua hàng chỉ khi có thread `isMuaHang`.
- **Seller thẻ:** giữ `shop_the_khach` / API `/api/shop/khach-hang/**` — filter thẻ chỉ trên sub Khách hàng (không đổi schema).
- **Buyer map:** `listShopNguoiBanDaMua` trong `lib/shop/khach-hang.ts`; gắn cờ trong `listAllChatThreads` (`lib/chat/org-message.ts`). Không migration mới.
- Plan gốc seller: `docs/PLAN_chat_khach_hang_tag.md` (tab UI cấp 1 «Khách hàng» → superseded bởi entry này).

### Shop — link tracking tự dán trên đơn (2026-08-02)

- **Chốt:** Shop nhập **ĐVVC + mã vận đơn**; CINs **không** gọi API carrier. Buyer thấy «Theo dõi đơn hàng» (URL suy từ ĐVVC+mã).
- **ALTER:** `van_chuyen_link` (2026-08-02) · `van_chuyen_ma` + `van_chuyen_dvvc` (A16, cùng ngày). `npm run migrate:shop-don-van-chuyen-ma`.
- **API:** `PATCH /api/shop/don/:id` action `cap_nhat_van_chuyen` + `ma`/`dvvc`. Đủ cả hai từ `da_nhan_tien`/`cho_lay_hang` → auto `dang_giao`.
- Plan: `docs/PLAN_shop_don_van_chuyen.md`.

### Chat — tab «Khách hàng» + thẻ phân loại shop (2026-08-02)

- **Yêu cầu:** seller thấy badge «Khách hàng» trên DM của buyer đã mua; tab filter khách; thẻ phân loại (mặc định Đã/Chưa chuyển tiền · Ship) chỉ shop thấy; shop tự thêm thẻ + màu.
- **Kiến trúc (ban đầu):** `ChatThreadGroup` giữ `ban_be|nguoi_la|to_chuc`. Tab UI dùng `ChatThreadView = … | "khach_hang"` + cờ `thread.isKhachHang` / `khachHangTagIds` (chiều phụ — khách vẫn nằm tab Bạn bè/Người lạ).
- **Cập nhật cùng ngày:** tab cấp 1 «Khách hàng» **gom vào «Mua bán»** (sub-tab) — xem LOG *Chat — tab «Mua bán»…*. Schema/thẻ seller không đổi.
- **Không** reuse `chat_the_tai_nguyen` (RLS member phòng → lộ thẻ cho khách). Bảng mới `shop_the_khach` + `shop_the_khach_gan` khóa `id_nguoi_ban`; buyer không có SELECT policy.
- **Khách** = `DISTINCT id_nguoi_mua` từ `shop_don_hang` (`id_nguoi_ban = me`, loại `nhap`); đơn `huy` vẫn hiện (chip nhạt). Phase 1 chỉ khách đã có phòng DM.
- **Seed thẻ:** write path — migration backfill seller hiện có + `setBanHangEnabled(true)`. Read path **không** seed (cho phép xóa hết thẻ mặc định vĩnh viễn).
- **Chốt UX:** multi-select tự do; cho xóa thẻ mặc định; chỉ hiện trong chat (không `/cua-hang` phase này).
- Plan: `docs/PLAN_chat_khach_hang_tag.md`. Migration: `npm run migrate:shop-the-khach`.

### Bỏ chuyển đổi nhiều tài khoản / kho `cins-accounts` (2026-08-02)

- **Quyết định:** gỡ hoàn toàn UI «Chuyển tài khoản», cookie `cins-accounts` + `cins-restore-hint`, `SessionRestorer`, `POST /api/auth/restore`, `POST /api/auth/vault-sync`, và mọi chỗ ghi kho trên login/OAuth/onboarding/sign-out.
- **Vì sao:** OAuth callback chậm (chụp phiên cũ trước exchange), nháy khách→đăng nhập do restore, request nền vault-sync; chi phí bảo trì cao hơn giá trị.
- **Phiên sau khi gỡ:** chỉ cookie Supabase `sb-*-auth-token` (maxAge 400 ngày) + middleware `resolveSession()`. User **không** phải đăng nhập lại — hai cookie độc lập.
- **Giữ:** card «Tiếp tục với @nick» (`lib/auth/remembered-account.ts`, localStorage metadata).
- **Cấm regress:** không cho `/login` bypass middleware sync cookie (`isSessionSyncOnlyPath`). Nếu bypass lại → bug mất refresh token quay lại và **không còn lưới an toàn**.
- **Plan:** `docs/PLAN_go_multi_account.md`. Plan cũ kho: `docs/PLAN_auth_session_on_dinh.md` (archived; Bước 1 middleware vẫn hiệu lực).

### Tài khoản clone artist + KPI seeding + bàn giao (2026-08-01)

- **Bối cảnh:** coldstart — xin phép artist thật, đội ngũ up tay vào tài khoản clone; sau đó bàn giao cho tài khoản họ đăng ký.
- **Roster:** tái dùng `auto_tai_khoan` + cột `loai` (`ai` | `clone`). Autopilot chỉ chọn `loai='ai'`.
- **Bàn giao (đã chốt):** đổi `auth_user_id` trên profile clone (giữ slug + permalink), xóa profile đích trống + row `auto_tai_khoan`. RPC `ban_giao_tai_khoan_clone`. Không move ~70 bảng FK.
- **Mật khẩu (đã chốt):** vault AES-256-GCM app-layer (`mat_khau_ma_hoa`), key `CINS_CLONE_PASSWORD_KEY`. Audit `auto_nhat_ky_mat_khau`. Đánh đổi chấp nhận: tài khoản CINs sở hữu, không PII người thật, bị xóa khi bàn giao.
- **KPI (đã chốt):** mục tiêu ngày toàn roster (ai + clone). Đếm `content_cot_moc.tao_luc` ngày VN (`public`/`feature`). Phân bổ freeze trên `auto_han_muc.kpi_muc_tieu` (tách `han_muc` autopilot). Clamp KPI nick AI ≤ `han_muc_ngay`.
- **KPI ưu tiên clone (2026-08-01):** phân bổ ngày **ưu tiên `loai=clone`**; nick AI fake chỉ nhận phần dư / khi hết slot clone. Code: `lib/admin/kpi-seeding.ts`.
- **Extension clone portfolio (2026-08-01):** admin kéo Behance / ArtStation / Carrd → nick seeding. **Gộp 1 extension** `Clone portfolio` (icon CINs 4 khối, popup 3 tab + animation tiến trình). API `/api/admin/port-clone/*`. Bài `public`; ảnh >10MB **nén** (sharp) rồi upload — nguồn >40MB / nén thất bại vẫn bỏ; magic link mở bài dưới auth nick. Ba folder cũ giữ tham chiếu.
- **Admin sửa bài nick seeding (2026-08-01):** `canManageUsers` + profile trong `auto_tai_khoan` → **quản lý đầy đủ như chủ** (hồ sơ, avatar/cover, đăng/sửa/xoá bài, cột mốc, ghim, shop cửa hàng + bật bán hàng). Không redirect onboarding của admin. Helper `lib/admin/seeding-nick.ts` (`resolveActingOwner`).
- **Quyền:** giữ `canManageUsers` (admin + super_admin); curator không vào. Apply bàn giao bắt gõ đúng slug.
- **ALTER (đã duyệt user 2026-08-01):** `auto_tai_khoan` +12 cột; `auto_han_muc` + `kpi_muc_tieu`/`kpi_phan_bo_luc`; bảng mới `auto_ban_giao`, `auto_nhat_ky_mat_khau`, `auto_kpi_cau_hinh`. File `migration_tai_khoan_clone.sql` · `npm run migrate:tai-khoan-clone`.
- Plan: `docs/PLAN_tai_khoan_clone.md`.

### Shop — không liên kết ĐVVC; tự ship + copy/export/phiếu (2026-07-31)

- **Chốt:** CINs **không** kết nối API ĐVVC (SPX / Viettel Post / GHN). Shop tạo vận đơn trên web ĐVVC riêng; CINs giữ snapshot **họ tên · SĐT · địa chỉ** trên đơn.
- **Công cụ seller:** (1) copy nhanh thông tin nhận trên chi tiết đơn · (2) export **Excel mẫu ViettelPost** + **CSV chung** · (3) **phiếu đóng gói** in từ trình duyệt.
- **Schema:** `npm run migrate:shop-ship-reverse` — DROP `shop_van_chuyen_ket_noi` · `shop_dia_chi_lay` · `shop_van_don_log` + cột ship/consent trên `shop_don_hang` (giữ `hinh_thuc_giao`, snapshot địa chỉ).
- **Giữ:** phí nền tảng · khiếu nại · địa chỉ nhận buyer (`shop_dia_chi_nhan`).
- **Không** cần `CINS_SECRETS_MASTER_KEY` cho ĐVVC nữa (token carrier đã gỡ).

### Shop — khôi phục liên kết ĐVVC (Viettel + SPX shell) (2026-07-31) — **superseded** cùng ngày

- Đã restore rồi **gỡ lại** theo chốt «không ĐVVC trên CINs». SQL restore giữ làm audit.

### Shop — reverse liên kết ĐVVC → shop tự ship (2026-07-31)

- Reverse lần đầu rồi restore rồi reverse lại (chốt cuối: không ĐVVC). File `migration_shop_ship_reverse.sql` là script DROP hiện hành.

### Shop — gỡ GHN khỏi runtime (2026-07-31) — lịch sử

- GHN runtime đã gỡ; sau đó gỡ luôn shell Viettel/SPX. Checkout online không mở.

### Autopilot Giai đoạn 7 — tương tác ảo nick seeding (2026-07-27)

- **Chốt:** nick seeding "ghé" **4 phiên/ngày** (gap lệch theo nick+ngày), thả **emoji tích cực** (bỏ angry/dislike/sad) lên bài `content_cot_moc` `public` mới ≤48h — **cả bài người thật lẫn seed**, trừ bài của chính nick; **xác suất** theo độ hoạt bát + khớp niche (clamp 0.4–0.95, tránh 100% lộ bot); **~30%** bài đã react kèm 1 bình luận khen chung theo giọng nick.
- **Không bảng phụ:** idempotency dựa unique key `social_reaction` + dedup `social_binh_luan` (ghi service role). Quyết định react/skip ổn định (seeded RNG).
- **Bật/tắt per-nick** ở `/admin/tai-khoan-ai` (cột Tương tác); `CINS_SEED_TUONG_TAC=off` = kill-switch. Cron `autopilot-tuong-tac.yml` hourly.
- **ALTER (đã duyệt 2026-07-27):** `auto_tai_khoan` + cột `tuong_tac_bat boolean NOT NULL DEFAULT false`. File `migration_autopilot_tuong_tac.sql` · runner `npm run migrate:autopilot-tuong-tac`. Bảng `auto_*` là bảng nội bộ Autopilot (không phải bảng lõi user), thêm cột default an toàn.
- Code: `tools/autopilot/lib/nick-tuong-tac.mjs` · `lenh/tuong-tac.mjs` · `lib/admin/autopilot.ts` (`capNhatNick.tuongTacBat`, `lietKeNick`) · `AdminTaiKhoanAiScreen`.

### Gộp hub tổ chức về `/to-chuc` — theo pha (2026-07-27)

- **Chốt (Phase 1 — đã ship):** listing tổ chức gộp về **`/to-chuc`** (trước là `/co-so-dao-tao` gộp trường+cơ sở, và `/studio` riêng). Thêm tab **Studio** vào bộ lọc (Tất cả / Trường ĐH / Cơ sở đào tạo / Studio + chip "Tổ chức của tôi"). Redirect **308** exact: `/co-so-dao-tao`, `/studio`, `/truong-dai-hoc` → `/to-chuc` (không đụng `/:slug` detail).
- **Không đổi trang chi tiết ở Phase 1:** card vẫn trỏ URL cũ (`/co-so-dao-tao/{slug}`, `/co-so/{slug}`, `/studio/{slug}`). Tách constant `TO_CHUC_HUB_PATH` cho listing/nav; giữ `CO_SO_DAO_TAO_HUB_PATH` làm base của `truongRootPath`.
- **`doanh_nghiep` ẩn khỏi hub** (đúng luật ẩn UI) — chỉ hiện `studio`; vẫn vào được qua URL trực tiếp.
- **Phase 2 (chưa làm):** đổi trang chi tiết sang **`/to-chuc/{loại}/{slug}`** với quy ước ngắn `dai-hoc` / `co-so` / `studio` (doanh_nghiep gộp studio); khi đó mới sửa `truongRootPath`/`coSoRootPath`/`studioRootPath`, `orgPublicHref`, middleware tab-redirect, `orgSlugFromPromoHref` (parser 3 đoạn), OG/canonical/link-preview detail.

### Hẹn đăng bài cá nhân / cộng đồng — `tao_luc` tương lai, không ALTER (2026-07-27)

- **Chốt:** reuse nút compose org; lưu giờ hẹn bằng `content_cot_moc.tao_luc` (không thêm `trang_thai` như `org_bai_dang`).
- **Vì sao:** đủ để ẩn khỏi khách/World/Gallery đến giờ đăng; tránh migration cột cũ.
- **Khác org:** org vẫn `nhap` + lazy promote; cá nhân không flip status — đến giờ tự due.

### L36 — Bỏ giai đoạn `moi_bat_dau` ("Mới bắt đầu") (2026-07-26)

- **Chốt:** Không còn trạng thái Journey **Mới bắt đầu** trên toàn CINs (onboarding, sửa hồ sơ, CareerMap cộng đồng, admin filter, phân phối tin tuyển dụng, persona trang chủ).
- **Dữ liệu:** `user_nguoi_dung.giai_doan` `moi_bat_dau` → `dang_hoc` (73 user); scrub `org_tuyen_dung.giai_doan_muc_tieu` nếu có.
- **ALTER enum (đã duyệt + đã chạy):** recreate `giai_doan_enum` = `dang_hoc` / `dang_lam` / `tim_viec` / `freelance` / `dang_day`. File: `migration_drop_giai_doan_moi_bat_dau.sql` · runner `scripts/run-drop-giai-doan-moi-bat-dau-migration.mjs`.
- *Hệ quả file:* FOUNDATIONS §7; IMPLEMENTATION §3 SQL; type/label app (`lib/auth/session.ts`, `persona.ts`, onboarding, …).

### L35 — Fix chat Realtime "im lặng chết" — badge/tin không tự cập nhật (2026-07-25)

- **Triệu chứng báo cáo:** gửi tin cho người khác → người nhận không có báo hiệu gì (badge/âm thanh), phải tự bấm mở khung chat mới thấy tin mới; có case người dùng báo gửi tin nhưng người nhận không thấy dù đang mở sẵn hội thoại.
- **Đã kiểm tra và loại trừ phía DB/RLS** (script `scripts/check-chat-realtime.mjs`, read-only): `chat_tin_nhan` đã nằm trong publication `supabase_realtime`, `REPLICA IDENTITY FULL`, RLS + policy `is_chat_room_member`/`current_profile_id()` đúng thiết kế, 318/318 user có `auth_user_id`, **không có phòng 1-1 trùng lặp** giữa cùng một cặp user (loại kịch bản split-brain phòng).
- **Nguyên nhân thật (client):** `lib/chat/use-chat-realtime.ts` (và `use-chat-read-cursors-realtime.ts`) chỉ gọi `.subscribe()` một lần, không theo dõi trạng thái kênh. Khi socket "chết lâm sàng" (máy ngủ, tab bị hệ điều hành suspend trên mobile, mất mạng chớp nhoáng) mà không bắn lỗi rõ ràng, app không tự nối lại → mất hết `INSERT`/`UPDATE` real-time cho tới khi user thao tác thứ gì đó gọi lại REST (mở khung chat) mới đồng bộ.
- **Đã sửa:** cả hai hook theo dõi `.subscribe(status => ...)` — `CHANNEL_ERROR`/`TIMED_OUT` tự tạo lại kênh (backoff 1s→2s→…→tối đa 15s); thêm listener `visibilitychange` (tab về foreground) và `online` (có mạng lại) để chủ động dọn kênh cũ + mở kênh mới, phòng socket "treo" im lặng không báo lỗi. Không đổi logic nghiệp vụ (mapping tin, unread, âm thanh, watermark đã đọc).
- *Hệ quả file:* `lib/chat/use-chat-realtime.ts`, `lib/chat/use-chat-read-cursors-realtime.ts`, script chẩn đoán mới `scripts/check-chat-realtime.mjs` (giữ lại để tái sử dụng khi nghi ngờ lần sau).

### L34 — CSĐT vận hành học (chat-first) + gate ALTER cột cũ (2026-07-24)

- **Bối cảnh:** Hạ tầng học cho `co_so_dao_tao` (partner Sine Art): tư vấn `1_org` → đơn HP → phòng lớp cố định → freeze theo ngày → Journey verify sau đóng tiền; dashboard org (HV, thu tiền mặt/QR, điểm danh, doanh thu, chi nhánh). **Không** clone ERP Sine Art; **không** ghi học phí vào `shop_*`; **không** reuse `edu_*` (điểm xét tuyển ĐH).
- **Luật làm việc (user chốt):** Mọi thay đổi đụng **cột/bảng đã có** (`ALTER TABLE`, đổi kiểu, rename, drop cột, đổi enum dùng chung, đổi FK/CHECK) → agent/dev **báo cáo lại user trước** → ghi vào inventory dưới đây → **chỉ chạy migration sau khi user xác nhận**. Tạo bảng mới vẫn cần brief, nhưng gate riêng cho sửa cột cũ chặt hơn. Rule code: `CINS_DEV_RULES.md` §1; router: `CINS_INSTRUCTION.md` luật 6.
- **Chốt sản phẩm liên quan:** 1 phòng chat / lớp; kỳ = ngày lịch; freeze 00:00 hết ngày; HV freeze vẫn trong roster; VietQR + tiền mặt đều cộng ngày; verify “bắt đầu học” sau đóng tiền; Curator org = chỉ tab Bài đăng + comment-as-org (ACL app, không thêm enum bắt buộc); thông báo mở khóa = `org_bai_dang` + `loai=thong_bao`; bỏ gói theo buổi tạm thời.
- **Bảng mới (dự kiến — chưa migration):** `org_chi_nhanh`, `org_goi_hoc_phi`, `org_don_hoc_phi`, `org_ky_hoc`, `org_tien_do_bai`, `org_nop_bai`, `org_diem_danh`. (Chi tiết cột chốt khi soạn SQL.)
- **Không tính là ALTER cột:** ghi key vào `org_to_chuc.cau_hinh` jsonb hiện có (VD `thanh_toan`); quy ước dùng cột `chat_phong` đã có (`loai_phong='lop_hoc'`, `id_context` = id lớp).

#### Inventory ALTER đề xuất — **CHƯA CHẠY** (chờ user duyệt từng dòng)

| # | Bảng | Thay đổi | Kiểu / FK gợi ý | Nullable | Lý do | Ảnh hưởng dữ liệu cũ | Trạng thái |
|---|---|---|---|---|---|---|---|
| A1 | `org_lop_hoc` | Thêm `id_chat_phong` | `uuid` → `chat_phong.id` | YES | 1 lớp = 1 phòng chat cố định | Row cũ = NULL đến khi backfill / tạo phòng | **Đã chạy** 2026-07-25 · `migration_csdt_van_hanh_hoc.sql` |
| A2 | `org_lop_hoc` | Thêm `id_chi_nhanh` | `uuid` → `org_chi_nhanh.id` | YES | Lọc HV / doanh thu / lớp theo chi nhánh | Row cũ = NULL | **Đã chạy** 2026-07-25 · cùng migration |
| A3 | `org_lop_hoc` | ~~`meeting_url`~~ | — | **Hủy** — call = Cloudflare Realtime trước, sau cắt sang LiveKit/Hetzner (L34) | — | **Đã hủy** |
| A4 | `user_hoc_vien_lop` | *(không ALTER nếu dùng `org_tien_do_bai`)* | — | — | Tiến độ bài tách bảng mới | — | **Ưu tiên không ALTER**; chỉ đề xuất cột nếu sau này bỏ bảng tiến độ |
| A5 | Enum `loai_mo_hinh_khoa_enum` | **Không** thêm giá trị “theo buổi” | — | — | Phase này bỏ gói buổi | — | **Không đổi** |
| A6 | Enum `loai_tin_nhan_enum` / `vai_tro_to_chuc_enum` | **Không** bắt buộc đổi phase 1 | Card qua `ngu_canh` jsonb; Curator = ACL trên vai sẵn có | — | Tránh phá client cũ | — | **Không đổi** trừ khi user duyệt riêng |
| A7 | `org_su_kien` | Thêm `slug` + UNIQUE | `text NOT NULL` · unique index | NO (sau backfill) | URL công khai `/su-kien/{slug}` thay UUID | Backfill slugify(`ten`) (+ `-2`… nếu trùng); UUID cũ 301 → slug | **Đã chạy** 2026-07-26 · `migration_org_su_kien_slug.sql` |
| A8 | Enum `giai_doan_enum` | Bỏ value `moi_bat_dau` (recreate type) | còn `dang_hoc`/`dang_lam`/`tim_viec`/`freelance`/`dang_day` | — | Không còn “Mới bắt đầu” trên CINs | 73 user → `dang_hoc` trước ALTER | **Đã chạy** 2026-07-26 · `migration_drop_giai_doan_moi_bat_dau.sql` (L36) |
| A9 | `social_binh_luan` | Thêm `id_to_chuc` | `uuid` → `org_to_chuc.id` | YES | Comment dưới danh nghĩa org (owner/admin) | Row cũ = NULL (cá nhân) | **Đã chạy** 2026-07-27 · `migration_social_binh_luan_id_to_chuc.sql` |
| A10 | `shop_don_hang` | Thêm nhóm cột giao hàng: `hinh_thuc_giao`, `dvvc`, `ma_van_don`, `phi_ship`, `can_nang`, `van_chuyen_trang_thai` | enum mới `shop_hinh_thuc_giao_enum` / `shop_van_chuyen_trang_thai_enum` · `text` · `numeric(18,2) DEFAULT 0` · `integer` (gram) | YES (trừ `phi_ship` NOT NULL DEFAULT 0) | Ship GHN: 2 hình thức nhận + mã vận đơn + phí + trạng thái giao | Đơn cũ = NULL / `phi_ship`=0; **không** đụng `trang_thai` nghiệp vụ sẵn có | **Đã chạy** 2026-07-30 · **REVERSE DROP** cột ship (trừ `hinh_thuc_giao`) 2026-07-31 · `migration_shop_ship_reverse.sql` |
| A11 | `shop_don_hang` | Thêm snapshot địa chỉ **có cấu trúc** + consent PDPD: `mua_phuong_xa`, `mua_phuong_xa_code`, `mua_tinh_thanh`, `van_chuyen_dong_y_luc`, `van_chuyen_dong_y_van_ban`, `van_chuyen_dong_y_phien_ban` | `text` · `timestamptz` | YES | Snapshot địa chỉ có cấu trúc cho shop tự ship; consent ĐVVC đã DROP | Giữ `mua_phuong_xa*` / `mua_tinh_thanh`; DROP `van_chuyen_dong_y_*` | **Đã chạy** 2026-07-30 · consent **DROP** 2026-07-31 reverse |
| A12 | `shop_cua_hang` | Thêm `trang_thai_hoat_dong`, `ly_do_khoa`, `so_tranh_chap_mo` | enum mới `shop_trang_thai_hoat_dong_enum` NOT NULL DEFAULT `'hoat_dong'` · `text` · `integer NOT NULL DEFAULT 0` (cache, trigger) | NO (có DEFAULT) | Cổng gate **gộp** cho nợ phí + thua tranh chấp; nhãn cảnh báo dẫn xuất | Shop cũ = `hoat_dong`, đếm = 0 → an toàn; **tách biệt** `tam_dong` sẵn có | **Đã chạy** 2026-07-30 · cùng migration |
| A13 | `shop_bien_the` · `shop_dia_chi_nhan` | `shop_bien_the`: thêm `can_nang` (gram, seller nhập) · `shop_dia_chi_nhan`: thêm `phuong_xa_code` (mã GSO) | `integer` · `text` | YES | Cân nặng để GHN tính phí đúng; mã GSO map carrier chuẩn hơn tên trần (xã trùng tên sau sáp nhập) | Row cũ = NULL; backfill `phuong_xa_code` từ `lib/vn/phuong-xa-2025.ts` theo tên | **Đã chạy** 2026-07-30 · cùng migration |
| A14 | Enum `shop_trang_thai_don_enum` | Thêm `cho_lay_hang`, `dang_giao`, `hoan_tra` | `ALTER TYPE ... ADD VALUE` | — | Pipeline 5 bước seller (xác nhận → soạn → chờ lấy + GHN → đang giao → hoàn thành / hoàn trả) | Đơn cũ giữ value cũ; label UI mới | **Đã chạy** 2026-07-30 · `migration_shop_don_pipeline.sql` |
| A15 | `shop_don_hang` | Thêm `van_chuyen_link` | `TEXT` | YES | Link tracking do shop tự dán (không ĐVVC API) | Đơn cũ = NULL | **Đã chạy** 2026-08-02 · `migration_shop_don_van_chuyen.sql` |
| A16 | `shop_don_hang` | Thêm `van_chuyen_ma`, `van_chuyen_dvvc` | `TEXT` | YES | Mã vận đơn + tên ĐVVC; URL `van_chuyen_link` suy ra khi lưu | Backfill ĐVVC từ link cũ | **Đã chạy** 2026-08-02 · `migration_shop_don_van_chuyen_ma.sql` |
| A15 | `auto_tai_khoan` | +12 cột clone/KPI/vault/bàn giao | `ADD COLUMN IF NOT EXISTS` | default an toàn (`loai='ai'`) | Tài khoản clone artist + vault + KPI | Backfill không cần (default) | **Đã duyệt + chạy** 2026-08-01 · `migration_tai_khoan_clone.sql` |
| A16 | `auto_han_muc` | + `kpi_muc_tieu`, `kpi_phan_bo_luc` | `ADD COLUMN IF NOT EXISTS` | NULL | KPI vận hành tách hạn mức autopilot | — | **Đã duyệt + chạy** 2026-08-01 · `migration_tai_khoan_clone.sql` |
| A17 | `user_nguoi_dung` | Thêm `home_layout` | `jsonb NOT NULL DEFAULT '{}'` | NO (default `{}`) | Preference module sidebar trang chủ (ẩn/thêm/sắp xếp) | Row cũ = `{}` → layout mặc định theo persona | **Đã chạy** 2026-08-03 · `migration_user_home_layout.sql` · `npm run migrate:home-layout` |
| A18 | `org_goi_hoc_phi` | Thêm `so_buoi`, `phut_moi_buoi`, `ma_goi_meta` | `int4` · `int4` · `text` + unique `(id_khoa_hoc, ma_goi_meta)` WHERE not null | YES | Hợp nhất gói meta khóa → bảng bán; map id JSON khi backfill | Row cũ = NULL; backfill script | **Đã chạy** 2026-08-03 · `migration_hoc_phi_combo.sql` Phần A · `npm run migrate:hoc-phi-combo` |
| A19 | `org_don_hoc_phi` | Thêm `id_nhom`, `gia_goc_vnd`, `giam_vnd` | uuid → `org_nhom_don_hoc_phi` · `numeric(14,0)` · `numeric(14,0) DEFAULT 0` | YES (trừ `giam_vnd` DEFAULT 0) | Combo nhiều khóa = nhóm đơn; giữ `so_tien_vnd` = số phải trả | Backfill `gia_goc_vnd = so_tien_vnd` | **Đã chạy** 2026-08-03 · `migration_hoc_phi_combo.sql` · `npm run migrate:hoc-phi-combo` |
| A20 | *(bảng mới)* `org_goi_hoc_phi_khoa` | N–N gói ↔ khóa | `id_goi` → `org_goi_hoc_phi` · `id_khoa_hoc` → `org_khoa_hoc` · UNIQUE cặp | — | Một gói gắn nhiều khóa (VD 1 tháng Online × 3 môn) | Backfill từ `org_goi_hoc_phi.id_khoa_hoc` | **Đã duyệt + chạy** 2026-08-03 · `migration_goi_hoc_phi_nhieu_khoa.sql` · `npm run migrate:goi-nhieu-khoa` |

> Khi user duyệt một dòng → đổi **Trạng thái** thành `Đã duyệt YYYY-MM-DD` rồi mới viết/chạy file migration. Khi đã apply trên DB → `Đã chạy` + tên file SQL. Mọi ALTER phát sinh thêm ngoài bảng này → **thêm dòng mới vào inventory trước**, không lén vào migration khác.

- *Hệ quả file:* DEV_RULES §1 (gate ALTER); INSTRUCTION luật 6; brief build [`cursor_brief_csdt_van_hanh_hoc.md`](./cursor_brief_csdt_van_hanh_hoc.md); FOUNDATIONS §O “không LMS” sẽ cập nhật riêng khi chốt wording “LMS mỏng chat-first” (chưa sửa trong L34).

#### Bổ sung L34 — Call / phòng học = LiveKit self-host · Hetzner Singapore (2026-07-24)

- **Chốt stack gốc (giữ sẵn làm đích scale):** **LiveKit OSS self-host** trên **Hetzner Cloud `sin` (Singapore)**. Không Meet/Zoom đường chính; không LiveKit Cloud. Phòng học = A/V + share màn trong chat lớp. Cùng SFU sau → call 1-1 / nhóm.
- **Thanh toán (khi sang Hetzner):** bill Hetzner + domain/TLS/ops; license LiveKit = $0. SIN đắt máy hơn EU; traffic/overage cao → cap bitrate, HV tắt cam mặc định.
- **Tách giai đoạn (user 2026-07-24):**  
  • **Plan 1 (NOW):** tư vấn · đơn HP · phòng chat lớp · freeze · VietQR · pedagogy · dashboard — **không** call / share màn / Meet / provision Hetzner.  
  • **Plan 2 (LATER):** media plane — **chỉ khi user báo `ready`**.  
- Brief: [`cursor_brief_csdt_van_hanh_hoc.md`](./cursor_brief_csdt_van_hanh_hoc.md) (2 plan tách rõ). A3 `meeting_url` **hủy**.

#### Bổ sung L34 — Plan 2 media: Cloudflare Realtime trước → Hetzner/LiveKit khi gần hết free (2026-07-31)

- **Chốt đường đi:**  
  1. **Phase A — Cloudflare RealtimeKit** (trên Realtime SFU): ship call/share màn sớm; tận dụng **1.000 GB egress free/tháng**.  
  2. **Dashboard theo dõi băng thông** (admin/ops): tổng egress Realtime, % so với free tier, cảnh báo khi **gần ngưỡng** (70% / 85% / 95%).  
  3. **Phase B — cắt sang LiveKit OSS trên Hetzner `sin`:** khi sắp vượt free — **chuyển thủ công** (`MEDIA_PROVIDER` + env), không dual-SFU song song.  
- **Abstraction:** `lib/media` (`cloudflare` | `livekit`).  
- **User báo `ready` 2026-07-31 — Phase A đã scaffold:** `media_phong_hop` · `POST …/phong-hoc/token` · UI gọi video (header + menu +) · `/admin/bang-thong`.  
- **Mở rộng 2026-07-31:** call áp dụng **mọi `chat_phong`** (bạn bè / nhóm / lớp / org); lớp vẫn gate freeze kỳ. Không chỉ phòng lớp.  
- **Không đổi:** Meet/Zoom đường chính; LiveKit Cloud trả phút.  
- *Hệ quả file:* IMPLEMENTATION §4 env + khóa học notes; brief Plan 2.

#### Bổ sung L34 — Admin IA gộp vào `/quan-ly` (2026-07-25)

- **Chốt:** toàn bộ quản trị CSĐT trong `CoSoQuanLyShell` (`/co-so/[slug]/quan-ly/*`). Nav nhóm (IA A 2026-07-25): **Tổng quan** · **Thiết lập** (Cơ sở · Chi nhánh) · **Học** (Khóa & lớp · Học viên · Điểm danh) · **Tiền** (Doanh thu). Tab Marketing gộp vào Tổng quan; `/quan-ly/marketing` redirect.
- Trang public: toolbar → Quản trị / Thông tin cơ sở; «Sửa thông tin» sidebar → `/quan-ly/co-so` (không modal settings trên public).
- **Chi nhánh single source:** CRUD `org_chi_nhanh`; public + settings đọc bảng trước, fallback `cau_hinh.chi_nhanh`; sau create/update sync cột liên hệ org + mirror JSON.
- *Hệ quả file:* `lib/to-chuc/co-so-routes.ts`, `CoSoQuanLyShell`, `quan-ly/co-so` + `KhoaHocQuanLyClient`, `ops-dashboard` sync, `co-so-page-queries` / `co-so-settings`.

#### Bổ sung L34 — Founder Settings: "Cài đặt tối cao" + ma trận phân quyền staff (2026-07-25)

- **Founder tier** = `vai_tro` = `owner` (hệ thống CINs) hoặc `admin` (người sáng lập/được phong). Có thể có nhiều `admin` — tất cả đều founder tier, đều vào được "Cài đặt tối cao", không cần cột "founder" riêng.
- **Thay hẳn** `canThuHocPhi`/`canManageDiemDanh` (role cứng) bằng ma trận `org_thanh_vien_quyen` (bảng mới, chưa apply — chờ user xác nhận) cho staff dưới founder tier (`quan_ly_tuyen_sinh`, `quan_ly_noi_dung`, `giao_vien`, `nhan_vien`). Founder tier luôn `sua` mọi module, không qua bảng.
- **7 module ma trận:** `co-so` · `chi-nhanh` · `khoa-lop` (catalog khóa/lớp + duyệt bài nộp `nop-bai`) · `hoc-vien` (ghi danh + thu tiền mặt/CK) · `diem-danh` · `hoc-phi-goi` (gói học phí) · `hoc-phi-doi-soat` (KPI doanh thu + xác nhận đơn chờ). Mỗi ô 3 mức: `an`/`xem`/`sua`, vắng row = `an`.
- **Ngoài phạm vi ma trận** (giữ nguyên hardcode founder-only hoặc role cũ): quản lý thành viên/gán vai trò (`canManageCoSoMembers`), đổi slug (`canChangeCoSoSlug`), duyệt bài đăng nội dung công khai org (`canCurateCoSoBaiDang`), **CRUD khóa học** (`canViewerManageKhoaHoc`/`canManageKhoaHoc` — dùng chung public page inline-edit, không đổi để tránh ảnh hưởng ngoài dashboard).
- **STK nhận tiền:** chuyển hẳn ra khỏi tab Doanh thu (`GoiVaThanhToanClient`), sống trong "Cài đặt tối cao" (`CoSoCaiDatToiCaoClient`), route `hoc-phi/thanh-toan` siết founder-only (GET + PATCH), không nằm trong ma trận.
- **Entry point:** icon bánh răng trong header `CoSoQuanLyShell` (chỉ hiện founder tier) → `/co-so/[slug]/quan-ly/cai-dat`, route mới `cai-dat` trong `CoSoQuanLySection`, **ngoài** 4 cụm nav.
- *Hệ quả file:* `supabase/sql/migration_org_thanh_vien_quyen.sql` (bảng mới, chưa chạy) · `lib/to-chuc/co-so-quan-ly-access.ts` (viết lại: `CoSoModuleKey`, `isCoSoFounderTier`, `getCoSoQuyenMap`, `canAccessCoSoQuanLyAsync`) · `CoSoQuanLyPageGate` (+ `requireFounder`) · `CoSoQuanLyShell` (gear icon) · route `chi-nhanh`/`hoc-vien`/`hoc-phi/{thu-tien-mat,don-chat,goi,doanh-thu,thanh-toan,[donId]/xac-nhan}`/`diem-danh`/`nop-bai`/`marketing`/`hoc-phi/[donId]/xac-nhan` (root) · mới `app/co-so/[slug]/quan-ly/cai-dat/page.tsx` + `CoSoCaiDatToiCaoClient` + `api/co-so/[id]/cai-dat/quyen`.

### Shop — ship GHN + phí nền tảng + tranh chấp (2026-07-30) — lịch sử; **ĐVVC đã reverse 2026-07-31**

> **ĐVVC/kho API đã DROP** (`migration_shop_ship_reverse.sql`). Phí nền tảng + tranh chấp vẫn áp dụng theo mục dưới. File `migration_shop_ship_ghn.sql` giữ làm audit.

- **Nguyên tắc bất biến giữ nguyên:** **CINs không cầm tiền.** Tiền hàng người mua chuyển **thẳng** TK shop (VietQR + biên lai như hiện tại). Mọi thiết kế dưới đây không được phá nguyên tắc này.
- **Vận chuyển:** **GHN** trước, **mỗi shop tự đăng ký + cắm token riêng** (CINs không đứng tên vận đơn, không đối soát tiền ship). **Không COD.** Interface `lib/shop/carriers/` thiết kế đa carrier để cắm GHTK/ViettelPost sau.
- **3 hình thức nhận:** `truc_tiep` · `tai_su_kien` (gộp luồng `dat_truoc_nhan_su_kien` sẵn có) · `online` (qua GHN, **người mua trả phí ship**). Bật `online` cần: shop có ≥1 kho lấy hàng + token GHN hợp lệ + sản phẩm có cân nặng.
- **Tracking:** **Webhook GHN** (`POST /api/shop/webhook/ghn?token=` + env `SHOP_GHN_WEBHOOK_SECRET`) cập nhật `van_chuyen_trang_thai` + log; đồng bộ pipeline `cho_lay_hang`→`dang_giao` (ĐVVC lấy/đang giao), `da_giao`→`hoan_thanh` (+ ghi phí), `tra_hang`→`hoan_tra`. Shop chỉ quyết nhận tiền → soạn → chờ lấy. Polling on-demand khi mở đơn giữ làm fallback.
- **Địa chỉ GHN — rủi ro đã gỡ:** từ 01/07/2025 GHN hỗ trợ **song song địa chỉ 2 cấp và 3 cấp**, không phát sinh API mới, và **chấp nhận truyền TÊN** (`to_province_name` / `to_ward_name`) thay vì bắt buộc ID → **không cần bảng ánh xạ ID**; `master-data` chỉ làm fallback + cache.
- **Kho lấy hàng:** 1 shop **nhiều kho** → bảng mới `shop_dia_chi_lay` (mirror `shop_dia_chi_nhan`). **Cân nặng: seller tự nhập** ở mức biến thể.
- **Cân nặng KHÔNG bắt buộc (2026-08-01):** đã gỡ cột "Cân nặng" khỏi grid Kho (`ShopKhoClient`) và bỏ luật `WEIGHT_REQUIRED_FOR_SALE` (bật Đang bán không cần cân nặng). Cột DB `shop_bien_the.can_nang` + param `canNang` của API `upsertBienThe` **giữ nguyên** — sẽ nhập lại ở luồng bật giao `online` (GHN) sau này.
- **Phí nền tảng:** % GMV, **kỳ THÁNG, trả sau** (kỳ tháng giảm dư nợ tích lũy so với quý; CINs cần dòng tiền sớm). **2 tầng**: `shop_phi_dong` (phí theo **từng đơn**, có cờ `loai_tru`) → roll-up `shop_phi_ky` (tháng). Lý do 2 tầng: đơn `hoan_thanh` rồi **bị tranh chấp/hoàn tiền** phải loại khỏi GMV, `SUM(tong_tien)` thô sẽ tính sai.
- **Pháp lý phí:** phí là **doanh thu của chính CINs**, seller **trả ngược** → **không phải** thu hộ/chi hộ → **không cần** giấy phép trung gian thanh toán (NĐ 52/2024, vốn 50 tỷ). Nhưng cần **pháp nhân + hóa đơn điện tử + VAT/TNDN**. Sàn **không có chức năng thanh toán** ⇒ seller tự kê khai thuế (NĐ 117/2025), CINs chỉ **cung cấp thông tin doanh thu** khi cơ quan thuế yêu cầu.
- **Lằn ranh cấm:** nếu sau này để tiền hàng chảy qua tài khoản/ví CINs (giữ 5%, chuyển 95%) → thành **thu hộ/chi hộ** ⇒ bắt buộc giấy phép NHNN. Tracking/đo doanh thu thì hợp pháp; **giữ/luân chuyển tiền thì không**.
- **Tranh chấp = Cấp 1:** CINs làm **trọng tài phán xử**, **KHÔNG hoàn tiền** (không cầm tiền nên không ép được). Hoàn tiền do 2 bên tự thực hiện P2P, CINs **xác minh**. Chế tài: **nhãn cảnh báo** (dẫn xuất từ `so_tranh_chap_mo`, không nhập tay) + **khóa/đình chỉ shop**. Điều khoản phải ghi rõ **trọng tài ≠ bên bảo lãnh thanh toán**.
- **Gate GỘP:** nợ phí và thua tranh chấp cùng chảy vào **một** `shop_cua_hang.trang_thai_hoat_dong` (`hoat_dong`→`canh_bao`→`han_che`→`khoa`) + `ly_do_khoa`, tránh 2 cờ độc lập mâu thuẫn. Tách biệt với `tam_dong` (seller tự nghỉ).
- **Escrow:** **không tự làm.** Giữ tiền người mua = cần giấy phép. Nếu sau này muốn niềm tin cấp escrow → cắm **PSP đã có giấy phép** (PSP giữ tiền, CINs chỉ điều phối).
- **Hạ tầng phải xây mới (scan 2026-07-30):** ① **cron** — repo **chưa có** (`wrangler.jsonc` không `triggers`, không `vercel.json`, không pg_cron) → thêm Workers cron + route nội bộ bảo vệ bằng `xacThucBearerSecret()` (mẫu `/api/noi-bo/auto/muc`), dự phòng GitHub Actions; ② **mã hóa field** — chưa có (chỉ hash/`timingSafeEqual`) → `lib/crypto/field-encryption.ts` AES-256-GCM cho `token_enc`; ③ **retry/cache cho API ngoài** — chưa có.
- **Phát hiện phụ:** `buildVietQrImageUrl` **hỗ trợ `amountVnd` nhưng checkout không truyền** → QR hiện không có số tiền; sửa cùng lúc khi cộng phí ship vào tổng. `lib/vn/phuong-xa-2025.ts` **có mã GSO** nhưng `shop_dia_chi_nhan` chỉ lưu tên → nên lưu thêm `phuong_xa_code`.
- **Tái dùng hạ tầng sẵn có:** thông báo `insertSocialThongBao` (mẫu `lib/shop/quay-notify.ts`) + `notifySellerDonHangChat`; admin `renderAdminPage` + mẫu `AdminGiaoDichScreen`; upload bằng chứng `POST /api/post-image/upload`.
- **Bảng mới (dự kiến — chưa migration):** `shop_dia_chi_lay` · `shop_van_chuyen_ket_noi` (token GHN mã hóa) · `shop_van_don_log` · `shop_khieu_nai` · `shop_khieu_nai_bang_chung` · `shop_phi_dong` · `shop_phi_ky`. RLS: kho/kết nối = chủ sở hữu; log/khiếu nại = **cả buyer lẫn seller** của đơn (mẫu `shop_don_hang_doi_tac`); phí = seller đọc, admin qua service-role. **`token_enc` không bao giờ trả về client.**
- **Enum mới (CREATE TYPE, không đụng enum cũ):** `shop_hinh_thuc_giao_enum` · `shop_van_chuyen_trang_thai_enum` · `shop_trang_thai_hoat_dong_enum` · `shop_trang_thai_khieu_nai_enum` · `shop_ly_do_khieu_nai_enum` · `shop_trang_thai_phi_enum`. **Không** thêm value vào `shop_trang_thai_don_enum` — trạng thái giao tách riêng để không nổ tổ hợp với vòng đời nghiệp vụ.
- **ALTER liên quan:** A10–A13 trong inventory — **chưa duyệt, chưa chạy**.
- Brief đầy đủ: *(đã xóa `cursor_brief_shop_ship_ghn.md` khi gỡ GHN runtime — 2026-07-31)*.

### Shop — gộp về 1 bảng giá VND / shop (2026-07-28)

- **Bổ sung L33 (thu hẹp "bảng giá đa ngữ cảnh"):** UI chỉ còn **1 bảng giá / shop, chốt VND**. Bỏ dropdown tạo/đổi tên/xoá/chọn bảng giá + `ShopTienTeSelect` trên trang Kho và bỏ `<select>` bảng giá trong modal đính hàng. **Schema giữ nguyên** (`shop_bang_gia` + `shop_bang_gia_dong`, cột `id_bang_gia`) — không migration; đơn cũ tiền tệ khác VND vẫn hợp lệ.
  • **Bảng giá canonical:** `getOrCreateDefaultBangGia(ownerId)` (`lib/shop/bang-gia.ts`) trả bảng **cũ nhất** của owner (deterministic), tạo `"Bảng giá mặc định"` VND nếu chưa có. Mọi nơi cần "bảng giá" dùng helper này thay vì "newest-wins".
  • **Nguồn lỗi đã sửa:** Kho đọc `shop_nhom.gia_mac_dinh`, modal + checkout đọc `shop_bang_gia_dong.gia` → lệch. `syncNhomGiaMacDinhToMau` (`lib/shop/nhom.ts`) nay ghi vào bảng canonical + quét biến thể **cả theo `id_nhom` lẫn tên `phan_loai`** (bắt biến thể thêm sau / FK null).
  • **Lưới an toàn đọc giá:** `resolveGiaBienThe` fallback về `shop_nhom.gia_mac_dinh` (VND) khi thiếu dòng `shop_bang_gia_dong` → `setPostHang` hết ném `GIA_NOT_FOUND` khi loại đã có giá gốc. Modal preview cũng fallback `giaMacDinh` (fetch `/api/shop/nhom`) để khớp trang Kho.
  • **API:** `shop/bang-gia` (POST) + `shop/bang-gia/[id]` (PATCH) ép `tien_te = "VND"`, bỏ nhận `tienTe` từ client. `storefront`/giỏ/checkout/đơn giữ nguyên (đúng 1 bảng → "newest-wins" tự thành bảng duy nhất).
  • *Hệ quả file:* `lib/shop/bang-gia.ts` (`getOrCreateDefaultBangGia`, fallback resolve) · `lib/shop/nhom.ts` (sync) · `ShopKhoClient.tsx` · `ShopAttachHangModal.tsx` · `app/api/shop/bang-gia/*` · CSS `.shop-kho-bang-gia-*` gỡ.

### Shop — sửa "Không tạo được loại hàng" + cache `so_mau` (2026-07-28)

- **Triệu chứng:** một số seller bấm «Tạo loại» là nhận `500 "Không tạo được loại hàng."`, không có hàng nào vào `shop_nhom`. Ngẫu nhiên theo request, không theo user.
- **Gốc:** `migration_shop_nhom_so_mau.sql` **chưa từng chạy** (không có runner + không có npm script) nên DB thiếu `shop_nhom.so_mau`, trong khi `nhomCols()` select cột đó mặc định. `listNhom` / `getNhomById` có bước hạ cấp khi PostgREST trả `42703`, nhưng `ensureNhom` / `updateNhom` **không** — fallback re-select của `ensureNhom` vẫn dùng bộ cột lỗi → `ENSURE_NHOM_FAILED` → nhánh 500 chung.
- **Vì sao ngẫu nhiên:** `soMauSupported` là state **cấp module**. Trang Kho gọi `GET /api/shop/nhom` → lật cờ `false` → POST **cùng isolate** chạy được. Trên Cloudflare Workers mỗi isolate có bản sao riêng nên POST vào isolate "lạnh" là fail.
- **Chốt:** (1) đã apply migration (cột + trigger `trg_shop_san_pham_so_mau` + backfill 90 loại) — migration này là **bắt buộc**, không phải tuỳ chọn; (2) **mọi** truy vấn `shop_nhom` phải đi qua `withNhomCols()` để hạ cấp + retry, không được `select(nhomCols())` trực tiếp. PostgREST fail `42703` lúc plan nên INSERT/UPDATE chưa chạy → retry không ghi trùng (đã kiểm chứng).
- **Kèm theo:** ô giá loại hàng parse sai dấu phân cách nghìn VN — `Number("40.000")` = **40**. Gộp về `parseGiaInput()` dùng chung (`lib/shop/gia-input.ts`), trước đó chỉ `ShopKhoClient` parse đúng.
- *Hệ quả file:* `lib/shop/nhom.ts` (`withNhomCols`) · mới `lib/shop/gia-input.ts` · mới `scripts/run-shop-nhom-so-mau-migration.mjs` + `npm run migrate:shop-nhom-so-mau` · `ShopKhoLoaiHub.tsx` · `ShopKhoClient.tsx` (bỏ bản `parseGiaInput` cục bộ).

### Shop — hub directory `/cua-hang` (2026-07-25)

- **Bổ sung L33:** sidebar **Cửa hàng** → hub `/cua-hang` liệt kê mọi shop đang **Hiển thị shop** (`ban_hang_bat` ∧ `shop_hien_thi`, `shop_cua_hang.da_xoa=false`).
  • Sort: shop đang mở trước; shop đang tạm dừng (`isShopTamDongActive`) xếp sau; trong nhóm theo `ten` (vi).
  • Không API list riêng — SSR `lib/shop/cua-hang-listing.ts` (service role), pattern hub `/cong-dong` / `/tuyen-dung`.
  • Card → storefront canonical `/{ownerSlug}/shop/{shopSlug}`. MVP: không filter/search.
  • *Hệ quả file:* `MAIN_NAV` id `shops` · `app/cua-hang/` · `components/shop/CuaHangListing*` · IMPLEMENTATION §1 Shop + §2 lib + hub site.

### Shop — import Shopee vào kho (2026-07-22)

- **Bổ sung L33:** seller import loại hàng từ URL Shopee trên `/ban-hang/kho` (nút **AI · Shopee**).
  • Pipeline **riêng** `POST /api/shop/import-shopee` + `lib/shop/shopee/` — không reuse blog-import Sine Art (HTML blog ≠ SPA Shopee).
  • Claude key **dùng chung** Sine Art (`ANTHROPIC_API_KEY`) chỉ để rút tên ≤ 40 / mô tả ≤ 280; scrape chính = Worker `fetch-url` + crawler UA / optional JSON `get_pc`.
  • Shopee anti-bot (90309999) chặn `get_pc` từ server → mặc định lấy title + gallery ảnh (OG); đủ giá/mẫu khi seller dán `raw` JSON từ DevTools.
  • Ảnh re-upload Cloudflare CINs; map → `shop_nhom` (thumb + `anh_phu_ids` + `gia_mac_dinh`) + `shop_san_pham` theo mẫu.
  • Extension nội bộ (zip tải về, Load unpacked — không Chrome Web Store): lấy `get_pc` từ trình duyệt user rồi đưa vào `raw`. Không adopt mọi user.
  • **Cả shop (v1.1.0):** quét `search_items` ≤100 → chọn SP → batch `get_pc` → loop import; 1 SP ≈ 1 loại; trùng tên cập nhật.
  • *Hệ quả file:* IMPLEMENTATION §1 `shop/import-shopee` + env Anthropic/Worker + `extensions/cins-shopee-import/`.

### Catalog loại vé sự kiện (2026-07-22)

- **Chốt phase 1:** sự kiện «Tính phí» dùng bảng con `org_su_kien_loai_ve` (tên, mô tả, giá VND, `cover_id`, `thu_tu`) — **catalog hiển thị**, chưa bán/thanh toán/tồn kho trên CINs.
- `org_su_kien.gia_ve` = denormalize **min(gia)** các loại; card/label «Từ X đ» khi >1 loại. Miễn phí → xóa loại vé.
- UI: khối quản lý vé trong `SuKienCreateModal`; chi tiết sự kiện liệt kê loại vé. Migration `migration_org_su_kien_loai_ve.sql`.
- Phase 2 (O19): gắn đăng ký / bán vé / QR — treo.

### SEO chuẩn hóa articles + Khám phá nghề (2026-07-20)

- **Chốt:** lớp SEO dùng chung `lib/seo/` (`buildPublicPageMetadata`, JSON-LD typed); `app/robots.ts` + `app/sitemap.ts` trên App Router (host `cins.vn`).
- **Nghề:** URL canonical `/nghe-nghiep/[slug]`; schema `Article` + `Occupation` + `BreadcrumbList`; hub filter `?q=` → `noindex,follow` + canonical hub sạch; meta query gồm `merged` để 308 slug cũ.
- **Ngành:** `/nganh-hoc` dùng `meta_title`/`meta_description`; `/bai-viet/[slug]` 308 `nganh_dao_tao` → `/nganh-hoc/...` (cùng keyword/software/nghe).
- **Không** index Journey profile `/[slug]` trong sitemap đợt này (giữ `noindex` hiện có).
- *Hệ quả:* IMPLEMENTATION §2 `seo/` + §6 SEO public; audit `scripts/audit-nghe-seo.mjs`.

### Shop — giỏ chung (giỏ chờ mua) toàn buyer (2026-07-20)

- **Bổ sung L33:** ngoài giỏ post-kiosk / giỏ cửa hàng, thêm **giỏ chung** — một giỏ / buyer, gom hàng của **nhiều cửa hàng**, không gắn sự kiện / không gắn bài. Người mua "cứ bỏ vào giỏ", chờ xử lý sau.
  • **Schema:** `shop_gio` thêm scope thứ ba `id_cot_moc IS NULL AND id_cua_hang IS NULL` (nới `shop_gio_scope_chk`); unique partial `shop_gio_buyer_chung_uidx` (một giỏ chung / buyer). Migration `migration_shop_gio_chung.sql`. Dòng vẫn `shop_gio_dong` → `id_bien_the`; **seller suy từ biến thể** (product owner).
  • **Giá:** lấy **giá đang bán** (ưu tiên giá giảm — `gia_giam ?? gia` từ bảng giá mới nhất còn dòng), **không snapshot lúc thêm** — resolve realtime khi đọc giỏ / lúc gửi đơn.
  • **Checkout tách theo seller:** mỗi cửa hàng = một `shop_don_hang` (`createDonChungForSeller`). Trừ kho atomic như `createDonFromGio`; sau khi tạo chỉ xóa dòng của seller đó khỏi giỏ chung.
  • **Bắt buộc biên lai chuyển khoản:** checkout giỏ chung phải **đính kèm ảnh biên lai** (`/api/post-image/upload` → `{url, imageId}`) **và** tích xác nhận rủi ro mới gửi được đơn (`canSend`). Lưu trên đơn: `shop_don_hang.bien_lai_anh_url` + `bien_lai_anh_id` (migration `migration_shop_don_bien_lai.sql`); `createDonChungForSeller` ném `RECEIPT_REQUIRED` nếu thiếu / URL còn `blob:`. Hiện lại ở card "đã gửi" (buyer) và `ShopDonDetailModal` (seller + buyer).
  • **Lịch sử mua hàng (buyer):** nút icon lịch sử trên header panel giỏ chung mở `ShopMuaHistory` — liệt kê **toàn bộ đơn của buyer** (`GET /api/shop/don?role=buyer`), filter Tất cả / Chưa TT (`cho_xac_nhan`) / Đã TT (`da_nhan_tien`); mỗi đơn **xổ sẵn** dòng hàng của shop. **Multi-select** (checkbox từng đơn + chọn tất cả, UX như `ShopKhoClient`). **Chia sẻ** đơn đã chọn = gửi text tóm tắt qua chat tới hội thoại chọn từ picker (`/api/chat/threads` → `POST /api/chat/rooms/{roomId}/messages {noi_dung}`; chỉ hội thoại đã có). **Xuất PDF** = mở cửa sổ in tự chứa (`window.print`, giữ dấu tiếng Việt) cho các đơn đã chọn.
  • **Luồng buyer khác luồng cũ:** gửi đơn từ giỏ chung **không mở chat**, **không đóng panel** — row cửa hàng chuyển **xanh "đã gửi đơn"** + hiện STK/QR để chuyển khoản; buyer tiếp tục shop khác. (Luồng kiosk post cũ vẫn mở chat.) Seller nhận đơn qua danh sách đơn (`/ban-hang/don` + topbar), không cần tin chat.
  • **API:** `GET/PATCH/DELETE /api/shop/gio-chung` (PATCH `{idBienThe, soLuong}`) · `POST /api/shop/gio-chung/don` (`{sellerId, ghiChu, nguoiMuaChapNhanRuiRo}`). Lib `lib/shop/gio-chung.ts`.
  • **UI:** nút giỏ trên topbar (`ShopGioChungButton`, hiện mọi user đã đăng nhập) mở panel nhóm theo cửa hàng, checkout từng shop. **Storefront `/{slug}/shop`, search quầy sự kiện, và post-kiosk trên milestone (`ShopKioskBlock`) đều đã chuyển sang giỏ chung.** `ShopKioskBlock` giờ **catalog-only**: ticker + dialog "Hàng bán", "Thêm vào giỏ" đổ vào giỏ chung (`PATCH /api/shop/gio-chung`) + phát `GIO_CHUNG_CHANGED_EVENT`; **bỏ tab "Giỏ hàng" riêng, hóa đơn/thanh toán/chat checkout cũ** — buyer checkout ở panel giỏ chung trên topbar. Badge ticker = số dòng của seller này trong giỏ chung. Giữ nút "Nhắn người bán".

### Shop storefront — giỏ theo cửa hàng (2026-07-20, thay bằng giỏ chung phía trên)

- **Bổ sung L33:** mua thẳng từ `/{slug}/shop` không cần `shop_post_hang`. Post-kiosk vẫn gắn subset. Schema `shop_gio`: XOR `id_cot_moc` | `id_cua_hang`. API `shop/gio` · `shop/don` nhận một trong hai scope. UI: `JourneyShopStorefront` thêm giỏ + gửi đơn.

### Shop UGC — bán hàng / preorder (không payment gateway) (2026-07-18)

- **L33 — Module `shop_*` opt-in cho user; CINs không trung gian tiền.**
  • **Ngách:** artist bán goods tại hội chợ (COFI, Hoyofes…) + shop online / đặt trước nhận tại circle.
  • **Không** dùng prefix `payment_` (FOUNDATIONS §13 = cổng thanh toán org sau này). Bảng `shop_*`.
  • **Opt-in:** `user_nguoi_dung.ban_hang_bat` mặc định false; bật trong cài đặt account + chấp nhận điều khoản (`ban_hang_dieu_khoan_luc`). Copy: CINs không liên quan chuyển tiền; quyền quyết định thuộc hai bên user.
  • **Catalog:** `shop_san_pham` + `shop_bien_the` (tồn kho). **Bảng giá đa ngữ cảnh:** `shop_bang_gia` + `shop_bang_gia_dong` (nhiều bảng / tiền tệ — event A ≠ event B / quốc gia).
  • **Post = kiosk:** `shop_post_hang` gắn **subset** biến thể + bảng giá (snapshot `gia_hien_thi`) lên `content_cot_moc` — chỉ hàng liên quan bài đó. Giỏ **theo post** (`shop_gio.id_cot_moc`, unique buyer+cot_moc).
  • **Storefront shop:** `/{slug}/shop` bán **toàn catalog** đang bán — **không** bắt buộc gắn bài. Giỏ **theo cửa hàng** (`shop_gio.id_cua_hang`, unique buyer+cua_hang). XOR scope: đúng một trong `id_cot_moc` | `id_cua_hang`. Đơn từ storefront: `shop_don_hang.id_cot_moc` null.
  • **Đơn cứng:** `shop_don_hang` / `shop_don_hang_dong` — `loai_don` = `mua_ngay` | `dat_truoc_nhan_su_kien`. Trạng thái: `nhap` → `cho_xac_nhan` → `da_nhan_tien` | `da_giao_tai_su_kien` (giữ enum `huy` legacy, **không** expose hủy trên UI/API). Chat DM `1_1` gửi card `ngu_canh.loai=don_hang`. **Tồn kho:** `mua_ngay` trừ kho **atomic ngay khi tạo đơn** (`da_tru_kho=true`, RPC `shop_tru_kho_bien_the`) — chặn oversell khi nhiều buyer cùng lúc; `dat_truoc_nhan_su_kien` trừ kho lúc seller xác nhận (thương lượng giao hàng, không giữ chỗ). Seller xác nhận không trừ lại nếu đã `da_tru_kho`. **Không hủy đơn trên CINs** — chuyển khoản P2P, mất tiền tự chịu; CINs không phân xử. Không soft-hold TTL / không payment API.
  • **RSVP sự kiện** (`se_tham_gia`) **không** gate mua hàng. **Xin làm quầy:** `shop_quay_su_kien` + bằng chứng → owner sự kiện duyệt (vừa đủ, không scale sớm). Không nhồi vào `org_milestone_tag_v1`.
  • *Hệ quả file:* IMPLEMENTATION (SQL + API + UI `/ban-hang/*`); FOUNDATIONS §13 ghi chú shop≠payment; chat context `don_hang`.

### Cộng đồng — vai trò + cài đặt lên app topbar (2026-07-18)

- **L32 — Chrome quản trị cộng đồng đồng bộ trường/cơ sở (`CoSoAdminToolbar`).**
  • **Vai trò viewer** trên trang `/cong-dong/[slug]` luôn nằm trong `#app-topbar-page-slot` (`CongDongTopbarToolbar`), không còn nút “Bạn là … ▾” trong identity sidebar.
  • **Cài đặt / quản lý** (Settings2) cũng luôn trên topbar khi `canOpenManage` — bỏ `CongDongManageTriggerButton` khỏi cột trái.
  • **Màu cam priv** (`--cins-priv-*`): nút vai trò + nút cài đặt — cùng visual language với `tb-truong-admin` / admin trường·cơ sở. Không dùng brand blue cho chrome đặc quyền.
  • **Sidebar** (`CongDongRoleButton`) chỉ còn CTA tham gia / chờ duyệt / chia sẻ (khách); thành viên & CINs admin chỉ còn nút chia sẻ.
  • Menu portal (thông báo · quản lý · rời) gắn vào nút vai trò trên topbar — không đổi API membership.
  • *Vì sao:* identity card gọn = brand cộng đồng; quyền/vai trò là chrome trang (topbar), tránh lẫn CTA join với badge quản trị.

### Facebook OG cache-bust + short-link bất biến (2026-07-17)


- **Vấn đề:** publish lại PNG share card chỉ đổi `og:image`; Facebook vẫn cache metadata theo URL Journey/Portfolio cũ, phải vào Sharing Debugger để scrape lại.
- **Chốt:** mỗi lần chia sẻ card của chủ trang tạo row `content_share_link` với token mới + Cloudflare snapshot cụ thể; URL copy là `/s/[token]`. Route short trả HTTP 200 với `og:url` riêng để crawler đọc metadata, rồi soft-redirect người thật về URL canonical có `?s=token`.
- **Fallback:** nếu không tạo được short-link (khách xem hoặc API lỗi), copy URL canonical có nonce `?s=`; metadata giữ `s` trong identity trang nhưng không đưa token vào URL ảnh.
- **Không dùng:** hard 307/308 cho mọi request (crawler sẽ bỏ metadata short-link), token stateless chỉ encode slug/view (không đóng băng ảnh), hoặc tự động gọi Meta Graph API.
- **Vòng đời ảnh:** snapshot được short-link tham chiếu không bị prune khỏi Cloudflare Images. Bảng chỉ service role đọc/ghi; endpoint tạo kiểm tra chủ hồ sơ / admin org.

### Host production = cins.vn only · bỏ Vercel (2026-07-16)

- **Chốt:** Production site URL / OAuth / deploy chỉ **`https://cins.vn`** trên **Cloudflare Workers** (OpenNext). Không dùng Vercel; xóa Redirect URLs / Site URL `*.vercel.app` trên Supabase.
- **Vì sao:** Host lệch (Vercel vs `cins.vn` vs localhost) → cookie PKCE verifier không khớp lúc `/auth/callback` → lỗi «không tìm thấy mã xác minh PKCE».
- **Code/docs:** thông báo PKCE lấy origin request; gỡ fallback `VERCEL_URL` / copy Vercel trong notice env; `AGENTS.md` + `CINS_IMPLEMENTATION.md` §4/§6 auth.

### Auto thumbnail embed Gallery (2026-07-15)

- **Không screenshot iframe; resolve provider/OG + capture `.riv`.**
  • **Vấn đề:** bài embed không cover → Gallery hiện logo platform (Spline/…), kém discovery so với nền tảng lấy poster sẵn.
  • **Chốt:** (1) user `cover_id` luôn thắng; (2) gallery: YouTube sync + `config.thumbnailUrl` trước logo; (3) publish/edit: oEmbed (Vimeo/Sketchfab) / OG (Spline/PlayCanvas/…) → upload CF; (4) file `.riv` chụp canvas client lúc đăng; (5) **không** headless / đọc pixel iframe cross-origin.
  • *Hệ quả file:* IMPLEMENTATION § Media + Embed → Gallery thumbnail; không đổi FOUNDATIONS.

### Môn chuyên ngành trên đồ án trường (2026-07-14)

- **L31 — `mon_hoc` thuộc chương trình ngành trường; dual-write lens + filter đồ án.**
  • **Vấn đề:** tab đồ án trường chỉ lọc theo ngành → nhiều môn trong cùng ngành trộn chung. Cơ sở đã có 2 cấp (khóa → bài); trường thiếu cấp 2.
  • **Chốt mô hình:** môn chuyên ngành = entity `article_bai_viet` loại **`mon_hoc`** (không tạo tên nội bộ rời tag). Chương trình trường nối qua bảng **`org_truong_nganh_mon`** (`id_truong_nganh` → `id_mon_hoc`, `thu_tu`, unique cặp). Hub ngành (`article_lien_quan` + `cap_do` gồm `chuyen_nganh`) vẫn là gợi ý phổ quát — **không** phải source of truth filter đồ án.
  • **Gắn org (sinh viên):** form gắn chọn Ngành → Môn (bắt buộc nếu ngành đã cấu hình ≥1 môn; chưa có môn → vẫn gắn chỉ ngành). Payload `org_milestone_tag_v1`: `monHocId` / `monHocLabel`. Khi submit (+ lại lúc approve nếu thiếu): upsert `article_gan_cot_moc` (+ gắn `article_gan_tac_pham` nếu có tác phẩm) → lens trang môn thấy bài.
  • **Quản trị:** admin trường thêm/gỡ môn trong Sửa ngành; gõ tên mới → `createTag(mon_hoc)` (dedup exact alias) rồi gắn junction. Sinh viên không tạo môn lúc gắn đồ án.
  • **Filter UI:** Năm → Ngành → Môn trên tab đồ án; card hiện `Ngành · Môn · Năm`.
  • **Không nhầm** `edu_mon_thi` / `org_cau_hinh_mon` (môn *thi tuyển*).
  • *Hệ quả file:* IMPLEMENTATION (SQL + API + lib); UI `JourneyOrgAttachTrigger` · `TruongDoanToolbar` · `TruongNganhMonChuongTrinh`. Không đổi FOUNDATIONS (đã neo entity `mon_hoc` + quy tắc 25).

### Hệ thống điểm World Timeline + đóng O13 (2026-07-14)

- **L30 — Điểm feed World Timeline (`content_diem_feed`); đóng O13.**
  • **Chốt mô hình (đóng O13):** không chronological thuần, không engagement-rank thuần. Công thức = **base thời gian (decay) + verified weight + content quality + engagement log-scale + admin boost**. Điểm theo **bài**, không theo người / thâm niên.
  • **Phạm vi:** chỉ **World Feed Timeline** (trang chủ). **Không** áp entity lens, Gallery, Journey cá nhân, feed cộng đồng. `org_su_kien` chỉ L29 boost-old — **không** vào `content_diem_feed`.
  • **Thành phần (`FEED_SCORE`):** `diem_co_ban` 40 (đăng) / **100 khi admin đẩy**; `diem_noi_dung` 0–20 (+5 thumbnail · mô tả >50 ký tự · tag · embed sống); `diem_verify` 0|20 (Loại 2 `da_xac_nhan`, chỉ `cot_moc`); `diem_engagement` 0–20 = `min(20, round(8 * log10(n+1)))` với `n` = reaction×1 + comment×2 + lưu×3. `diem_hien_tai` = tổng × decay tuyến tính 7 ngày từ `bat_dau_luc` (không lưu cột — tính realtime).
  • **Pipeline rank:** pool (visibility) → sort `diem_hien_tai DESC` → **author echo** + **soft quota max 2/author** → merge transitional `withWorldBoostMilestones` (L29).
  • **Hooks:** publish → upsert điểm; reaction/comment/lưu → `engagement_can_tinh_lai=true`; verify approve → `diem_verify` theo config; sửa bài → recalc `diem_noi_dung`; admin đẩy ON → `diem_co_ban=BOOST_RESET_SCORE` + reset `bat_dau_luc` (giữ thành phần khác); OFF → khôi phục `BASE` + `bat_dau_luc=tao_luc` (giữ thành phần khác).
  • **Engagement recalc:** **lazy** khi load Timeline (`flushDirtyEngagementScores`, cap **40 dirty/request**) — **không** pg_cron ở tầng hiện tại (repo chưa có cron feed).
  • **Lộ trình scale (3 tầng, không làm sớm):** (1) WHERE `bat_dau_luc` cửa sổ decay + index — đủ ~100K DAU; (2) ~100K DAU: cột `diem_hien_tai` + pg_cron ~15 phút + `ORDER BY` index; (3) ~500K+ DAU: Redis top-N TTL ngắn + cursor pagination.
  • **Admin UI:** `/admin/noi-dung-dang` Grid + Listing — cột Điểm; nút **+** cạnh đẩy cộng `diem_uu_tien` (+10, trần 200, không hoàn lại, refresh `bat_dau_luc`); Dashboard; tab **Công thức**: Chỉnh sửa → Lưu phiên bản (lý do + lịch sử). Save trọng số không backfill hàng loạt. TTL/cap L29 vẫn code constants.
  • **Schema / code:** `content_diem_feed` · `content_feed_score_cau_hinh` · `content_feed_score_phien_ban` · migrations + `npm run migrate:feed-score-config` / `migrate:feed-score-phien-ban` · `lib/cins/feed-scoring*.ts` · `feed-scoring-config*.ts` · API `GET|PUT /api/admin/feed-score-config`.
  • *Hệ quả file:* FOUNDATIONS quy tắc 22; IMPLEMENTATION Engagement + phân bổ; đóng **O13**. L29 vẫn là lớp editorial (Gallery + cap rank + TTL boost).

### World editorial boost — đẩy nội dung sáng tạo (ẩn với user) (2026-07-14)

- **L29 — Admin highlight ẩn trên World (Timeline + Gallery); không đụng Journey cá nhân.**
  • **Mục đích:** định hướng MXH sang cộng đồng sáng tạo bằng *phân bổ editorial* — viewer không thấy badge / “Được chọn” / “Gợi ý”; chỉ thấy thứ tự khác. **Không** phải engagement-rank toàn cục (xem **L30** cho điểm Timeline). **Không** gộp với `che_do_hien_thi='feature'` (user tự chọn “Nổi bật”). **Không** chiếm đất `ad_` (nhãn trả phí sau).
  • **Phạm vi surface:** chỉ **World** (`WorldJourneyFeed` dòng thời gian + lưới `JourneyGalleryGridView` / `worldJourneyGalleryFetch`). Không apply lên Journey profile, entity lens, feed cộng đồng.
  • **Đối tượng boost:** mọi item **đã đủ điều kiện xuất hiện** trên World timeline / Gallery pool hiện tại (milestone user theo L18, `org_bai_dang`, showcase org, v.v. — cùng visibility gate sẵn có). Boost **không** nới visibility (không làm lộ `chi_minh` / `theo_nhom` / `cong_dong`).
  • **Ai:** `super_admin` + `admin` (cùng lớp `canManageUsers`). **`curator` không.** Toggle tắt = hết boost ngay.
  • **TTL:** chu kỳ **3 ngày**; hết hạn thì **tự gia hạn +3 ngày** khi vẫn `dang_bat=true`. Chỉ tắt thủ công mới dừng. Audit: ai bật/tắt, lần gia hạn gần nhất.
  • **Hai luồng quản lý (cùng nguồn truth):**
    1. **`/admin` — tab quản lý nội dung đăng (World):** dashboard số liệu nội dung mới + bộ lọc (loại đăng user/org, loại nội dung, đang boost / hết hạn sắp tới…) · **Grid** — toggle đẩy + điểm Timeline (L30) · **Listing** — bảng + điểm / còn lại.
    2. **Trên World feed** (Timeline và/hoặc Grid khi admin đang xem): toggle đẩy nhanh cùng API — chỉ hiện với `super_admin`/`admin`.
  • **Rank merge:** Timeline base sort theo **L30** (`diem_hien_tai`); bật đẩy → upsert `content_diem_feed` (base 100 + reset decay) + giữ merge `withWorldBoostMilestones` (cap `WORLD_BOOST_RANK_CAP=15`). Gallery vẫn thời gian thực + ưu tiên boost — **không** dùng `content_diem_feed`.
  • **Schema:** `content_world_boost` — `loai_doi_tuong` + `id_doi_tuong`, `dang_bat`, `bat_dau_luc`, `het_han_luc`, `gia_han_luc`, `cap_boi`, `tat_boi`. RLS/service-role theo gate admin. Lazy-renew khi đọc hết `het_han_luc`.
  • *Hệ quả file:* FOUNDATIONS quy tắc 22; IMPLEMENTATION World feed/gallery + `/admin` nav; `cursor_map_admin.md`. Điểm Timeline → **L30**.

### Workspace nhóm chat — project con + thẻ tài nguyên + mốc (2026-07-13)

- **L28 — Nhóm chat = phòng ban ổn định + project có vòng đời + tài nguyên/mốc làm việc.**
  • **Phòng project con:** `chat_phong.id_phong_cha` → nhóm gốc (`loai_phong='nhom'`). Chỉ **1 cấp** (trigger chặn lồng sâu). Owner/admin nhóm cha tạo; thành viên = subset ⊆ cha do admin **thêm tay** (mặc định chỉ creator — chưa thêm thì không thấy phòng). Cap: `MAX_PROJECT_ROOMS_PER_PARENT` (20).
  • **Ẩn / lịch sử:** `chat_phong.trang_thai` = `active` | `an`. `an` = ẩn khỏi list/FAB, còn trong lịch sử nhóm cha để khôi phục. Gợi ý UI khi im ≥ `PROJECT_IDLE_DAYS_HINT` (45 ngày) — chưa auto-notify.
  • **Thẻ tài nguyên:** `chat_the_tai_nguyen` + `chat_the_gan` — nhãn **cục bộ theo phòng**, member tự tạo; gắn lên tin có ảnh/URL. **Không** reuse `filter_nhan` / Journey (quy tắc 29 vẫn đúng cho Journey; chat dùng primitive riêng cùng mental model).
  • **Mốc phòng:** `chat_moc` — timeline + tin nhắc trong phòng (tạo / nhắc trước / đến hạn qua `loai_tin=system`); `loai_lap` một lần hoặc lặp ngày/tuần/tháng/năm (sau đến hạn nhảy kỳ kế); phòng lớp: mốc `nguon=lich_lop` nhắc 15' trước buổi từ `lich_hoc` (admin phòng bật/tắt); DM 1-1 mọi thành viên CRUD; nhóm/lớp owner/admin CRUD. Push/email ngoài app → **O17** còn mở.
  • **UI:** tab Project trong `ChatGroupManageModal`; list indent + pill `Project`; side panel thêm **Tài nguyên** / **Mốc**.
  • Migration: `migration_chat_project_workspace.sql`. Chi tiết → **FOUNDATIONS §C**, API → **IMPLEMENTATION**.
  • *Vì sao không `loai_phong='du_an'` ngay:* project vẫn scoped bạn bè trong nhóm cha; entity `du_an` để khi có object dự án trên CINs.

### Chế độ phòng cộng đồng — công khai / nội bộ / bí mật (2026-07-12)

- **L27 — `org_to_chuc.cau_hinh.che_do` = đúng 3 giá trị** (trục A, tách khỏi vai trò member):
  | Giá trị | Tìm thấy | Identity card | Feed | Vào nhóm |
  |---|---|---|---|---|
  | `cong_khai` | Có | Có + feed preview | Khách cũng xem | 1-click join |
  | `noi_bo` | Có | Có (không feed) | Chỉ member active | Xin tham gia (pending) hoặc invite |
  | `bi_mat` | Không | Chỉ member / invite token | Chỉ member | Chỉ invite |
- **Alias legacy:** `rieng_tu` (code cũ) đọc = `bi_mat` (hành vi listing/page trước đây đã là ẩn). Ghi mới dùng `bi_mat`.
- **Join gate suy từ chế độ** — không field riêng: open / request+invite / invite-only.
- **Request nội bộ:** `user_thanh_vien_to_chuc.trang_thai='pending'` → admin (`canManageMembers`) duyệt → `active`. Invite accept luôn `active`.
- **Trục B (vai trò)** giữ 4: `owner`/`admin`/`quan_ly_noi_dung`/`thanh_vien`. CTA join (`CongDongRoleButton` sidebar) trước khi member theo *chế độ phòng*; sau khi member badge vai trò + cài đặt trên **app topbar** (`CongDongTopbarToolbar`, L32) — cam priv.
- **Trục C (bài):** vẫn `che_do_hien_thi='cong_dong'` — không rò World Journey (L12/L21). Không thêm mức privacy kiểu Discord.
- *Vì sao 3 không 2:* `rieng_tu` cũ gộp “nội bộ discoverable” với “bí mật”; thiếu tầng tìm thấy được nhưng feed khóa — đúng nhu cầu nhóm nghề có cổng duyệt.

### Pivot MXH chuyên môn + đóng góp canonical (2026-07-10)

- **L26 — CINS chuyển định vị: mạng xã hội chuyên môn + tri thức canonical do cộng đồng đóng góp.**
  • **Ba tầng**: Portfolio/Journey (MXH + showcase) · Entity lens (khám phá) · Canonical (bài chính đã duyệt).
  • **Khác Behance**: có timeline, chat, follow, bình luận — hành vi MXH thật, không chỉ tham khảo.
  • **Đóng góp ≠ Wikipedia**: mỗi user soạn **bản riêng**; curator **promote** bản đủ chất lượng thành bài chính; bản không duyệt vẫn public (contributor có quyền ẩn); bình luận trên bản thảo được phép.
  • **Curator async**: thông báo khi có bản mới — không moderation hàng ngày. Giai đoạn đầu founder = curator; sau phân quyền qua admin.
  • **Đảo rule 25 cũ**: entity **có thể** có prose canonical (tab Nội dung); không còn `noi_dung=NULL` mãi mãi cho keyword/phan_mem.
  • **Curator thẩm định nội dung ≠ verify quan hệ** — giữ bất biến 2 trục (FOUNDATIONS §12).
  • **CINs = quy hoạch hạ tầng** domain (Game, Phim, sau Y tế/Khoa học); cộng đồng tự biến trong khung guardrail tối thiểu.
  • Triển khai theo session → `docs/cursor_brief_dong_gop_noi_dung.md`.

### Nhóm chat bạn bè (2026-07-10)

- **L25 — Mở nhóm chat scoped cho bạn bè; làm rõ "không group chat tự do".**
  • **Đảo/làm rõ nguyên tắc §2 cũ**: không còn cấm mọi dạng nhiều người — thay bằng **cấm inbox MXH tự do** (link join công khai, thêm người lạ, discovery không ràng buộc).
  • **`loai_phong='nhom'`** trên `chat_phong` + `ten_phong` tuỳ chọn; `loai_context='ban_be'`.
  • **Gate thành viên**: chỉ `user_ket_ban.trang_thai='accepted'`; tối thiểu 2 bạn được chọn (≥3 người gồm creator), tối đa 20.
  • **UI**: nút tạo nhóm trong overlay chat, tab Bạn bè; hiển thị tên người gửi trong bubble nhóm.
  • **Đã mở rộng (L28):** quản lý thành viên/vai trò/đổi tên/avatar/rời·xóa; project con + thẻ tài nguyên + mốc. Còn treo: dedupe (O16), push nhắc mốc (O17).
  • Migration: `migration_chat_nhom.sql`. Chi tiết luật → **FOUNDATIONS §C**.

### Chia sẻ profile Journey / Gallery (2026-07-06)

- **L24 — Modal chia sẻ trang cá nhân: 3 luồng + card export (phase 1).**
  • **Copy link**: URL Journey `/{slug}` — hoạt động ngay từ menu chính.
  • **Chia sẻ Journey**: thẻ giới thiệu hồ sơ — 4 layout MVP: **Hồ sơ** (dashboard) · **Glass** · **Hero** · **Tab**.
  • **Chia sẻ Gallery**: thẻ tác phẩm (name card mặt sau) — 3 layout MVP: Mosaic / Spotlight / Filmstrip; thumb lấy từ gallery panel cache khi có.
  • **Sau chọn layout**: Copy link (Journey hoặc Gallery tùy loại thẻ) + chia sẻ MXH (FB, X, LinkedIn, Zalo, WA, native share).
  • **Phase 2 (một phần)**: Copy ảnh PNG thẻ (`html-to-image`) + QR footer encode URL Journey/Gallery; clipboard hoặc fallback tải file.
  • **Phase 2 (còn lại)**: OG/Twitter card động khi paste URL (canvas preview trên MXH).
  • **Entry UI**: nút Chia sẻ sidebar owner + guest action row (`JourneyProfileShareTrigger`).
  • **Chưa làm**: chia sẻ view filter dropdown timeline (nút `j-dd-share` — brief riêng).

### Admin CINs vận hành trực tiếp trên trang org — L23 hẹp (2026-07-12)

- **L23 — Quyền admin CINs (trục 1: `super_admin`/`admin`) chỉ mở khoá vận hành trên trang `truong_dai_hoc`.** Siết lại bản L23 cũ (2026-07-03 mở mọi `loai_to_chuc`).
  • **Ai**: `super_admin` + `admin` (helper `getCurrentUserIsCinsAdmin`). `curator` KHÔNG. Membership org (trục 2) vẫn hoạt động song song.
  • **Phạm vi inline trên trang public**: **chỉ** `truong_dai_hoc` — inline-edit, cài đặt trang (kể cả đổi slug). **Không** mở khoá cơ sở đào tạo, studio/doanh_nghiệp, cộng đồng.
  • **Cơ sở / studio / cộng đồng**: chỉ owner/admin org (trục 2). Admin CINs can thiệp qua **`/admin`** (duyệt/verify/list) và **L22** (`/admin/to-chuc` + mật khẩu ủy quyền) — không god-mode toolbar trên trang public.
  • **"Quyền CINs" ≠ "quyền owner"**: trên trường ĐH, admin thao tác dưới danh nghĩa hệ thống, KHÔNG hiển thị như owner (badge toolbar = "Admin"/"Quản trị CINs"; `viewerVaiTro`/`viewerIsOwner` giữ nguyên `null`). Không giả mạo vai trò membership.
  • **Vẫn là user thường** trên mọi org: admin CINs KHÔNG bị coi là "org của mình" cho hành vi xã hội — vẫn theo dõi / nhắn tin / like như user bình thường. Chỉ **member org thật (trục 2)** mới bị khoá "theo dõi/nhắn tin chính mình" + thấy hộp thư org. Tín hiệu: `getOrgMemberStatus` (trục 2 thuần) vs `getOrgAdminStatus` (membership **hoặc** CINs trên `truong_dai_hoc`).
  • **Cơ chế**: `getOrgAdminStatus` / `isTruongOrgAdmin` short-circuit CINs **chỉ khi** `loai_to_chuc === 'truong_dai_hoc'`. Gate cơ sở / studio / cộng đồng / khóa học / sự kiện / bàn giao owner **không** gọi `getCurrentUserIsCinsAdmin`.
  • **Lý do siết**: tách rõ admin CINs (hạ tầng + trường ĐH do CINs quy hoạch) khỏi owner org user-created; tránh toolbar "Admin Đang sửa" lộ trên cơ sở/cộng đồng khi đăng nhập tài khoản CINs.
  • **Còn hiệu lực**: L22 (`/admin/to-chuc` + mật khẩu ủy quyền, chỉ super_admin) vẫn là kênh gán membership chính thức cho mọi loại org.
  • **RLS**: quyền thực thi qua service-role trong lib server-only (UI chỉ ẩn/hiện). Giữ nguyên nguyên tắc FOUNDATIONS §quyền.

### Admin CINs vận hành trực tiếp trên trang org — đảo L20 (2026-07-03) — ĐÃ SIẾT

> ⚠️ **ĐÃ SIẾT 2026-07-12:** bản dưới đây mở mọi `loai_to_chuc`. Hành vi hiện tại theo **L23 hẹp** (chỉ `truong_dai_hoc`) ở mục ngay trên.

- **L23 (bản 2026-07-03, lịch sử)** — Quyền admin CINs MỞ KHOÁ toàn quyền vận hành trên trang org công khai, mọi `loai_to_chuc`. Đảo ngược L20.
  • **Ai**: `super_admin` + `admin` (helper `getCurrentUserIsCinsAdmin`, gồm cả 2). `curator` KHÔNG. Membership org (trục 2) vẫn hoạt động song song.
  • **Phạm vi**: trường ĐH, cơ sở đào tạo, studio/doanh_nghiệp, cộng đồng. Toàn quyền: inline-edit nội dung, cài đặt trang (kể cả đổi slug), quản lý thành viên, bàn giao owner, quản lý khóa học / sự kiện.
  • **"Quyền CINs" ≠ "quyền owner"**: admin thao tác dưới danh nghĩa hệ thống, KHÔNG hiển thị như owner (badge toolbar = "Admin"/"Quản trị CINs"; `viewerVaiTro`/`viewerIsOwner` giữ nguyên `null`). Không giả mạo vai trò membership.
  • **Vẫn là user thường** (2026-07-03): admin CINs KHÔNG bị coi là "org của mình" cho các hành vi xã hội — vẫn theo dõi / nhắn tin / like org như user bình thường. Chỉ **member org thật (trục 2)** mới bị khoá "theo dõi/nhắn tin chính mình" + thấy hộp thư org. Tách tín hiệu: `getOrgMemberStatus` (trục 2 thuần, không tính admin CINs) đi cạnh `getOrgAdminStatus` (đã gồm override) — truyền `isOrgMember` xuống `TruongInlineEditProvider`; các sidebar (`CoSoSchoolSidebar`/`StudioSidebar`/`TruongSchoolSidebar`) dùng `isOrgMember` (không phải `canEdit`) để quyết định khoá nút theo dõi/nhắn tin và hiện hộp thư org, còn `canEdit` chỉ mở UI chỉnh sửa.
  • **Cơ chế**: re-add short-circuit `getCurrentUserIsCinsAdmin()` vào các gate đã gỡ ở L20 — `isTruongOrgAdmin`/`getOrgAdminStatus` (`org-admin.ts`), `isStudioOrgAdmin`/`assertCanManageMembers`/`transferStudioOwnership` (`studio-members.ts`), `isCoSoOrgAdmin` (`co-so-membership.ts`), `assertCanManageMembers`/`transferCoSoOwnership` (`co-so-members.ts`), `isCongDongAdmin` (`cong-dong/membership.ts`), `assertCanManageMembers`/`transferCongDongOwnership` (`cong-dong/members.ts`), `buildViewer` (`truong-settings.ts`/`co-so-settings.ts`), `canViewerManageKhoaHoc` (`khoa-hoc.ts`), `canViewerManageSuKien` (`su-kien.ts`). Cộng đồng thêm flag `isCinsAdmin` xuyên xuống `CongDongPageClient` + `CongDongRoleButton` để hiện menu quản trị dù chưa là member.
  • **Lý do đảo L20**: chủ dự án cần admin CINs can thiệp trực tiếp trên trang org (seed/cứu hộ/kiểm duyệt) mà không phải "đi vòng" qua `/admin` hay tự thêm mình vào membership. Đánh đổi: chấp nhận toolbar quản trị lộ trên trang org cho tài khoản admin — bù lại tách nhãn rõ "Admin/CINs" khác owner.
  • **Còn hiệu lực**: L22 (`/admin/to-chuc` + mật khẩu ủy quyền, chỉ super_admin) vẫn là kênh gán membership chính thức; L23 là quyền vận hành trực tiếp (không cần mật khẩu ủy quyền).
  • **RLS**: quyền thực thi qua service-role trong lib server-only (UI chỉ ẩn/hiện). Giữ nguyên nguyên tắc FOUNDATIONS §quyền.

### Phân quyền org từ admin — escape hatch trục 1 (2026-07-01)

- **L22 — Super admin gán membership org qua `/admin/to-chuc`; mật khẩu ủy quyền tách khỏi đăng nhập.**
  • **Phạm vi**: mọi `loai_to_chuc` (trường ĐH, cơ sở, studio, cộng đồng) — không inline-edit trên trang public (L20 giữ nguyên).
  • **Ai**: chỉ `super_admin` (`canGrantAdmin`) — `admin`/`curator` CINs không thấy nút / không gọi được API.
  • **Mật khẩu**: env `CINS_ORG_DELEGATION_PASSWORD` (server-only, timing-safe compare). Đăng nhập super admin **không đủ** — mọi mutation gán/đổi/gỡ/bàn giao owner cần `delegationPassword` đúng.
  • **UI**: `/admin/to-chuc` — cột **Chủ trang** (`user_thanh_vien_to_chuc.vai_tro=owner`) tách khỏi **Người tạo** (`org_to_chuc.nguoi_tao` metadata). Nút Shield → `AdminToChucMembersModal`.
  • **API** (service role): `GET/POST …/admin/to-chuc/[id]/members` · `PATCH/DELETE …/members/[membershipId]` · `POST …/transfer-owner`. Lib: `lib/admin/org-delegation.ts`, `lib/admin/org-members.ts`.
  • **Vai trò gán được**: staff org (`owner`, `admin`, `quan_ly_*`, `giao_vien`, `nhan_vien`) hoặc cộng đồng (`owner`, `admin`, `quan_ly_noi_dung`, `thanh_vien`) — một owner/org; bàn giao hạ owner cũ → `admin`.
  • **Đóng O14** — cứu hộ org bỏ hoang / seed trường chưa có staff không cần SQL tay.

### Phân bổ nội dung org ≠ phân bổ user (2026-06-30)

- **L21 — Org không "chen" vào trang chủ người lạ; reach hữu cơ qua 3 kênh, có rào chắn.**
  Bài *người* lan tỏa theo 3 lớp visibility (L18). Bài *org* (`org_bai_dang`, org tự kể — **không** verify) bất đối xứng: chỉ org **đã theo dõi** mới vào feed giữa đầy đủ. Org chưa theo dõi tiếp cận người lạ qua:
  1. **Gợi ý theo dõi org** (module `goi_y_theo_doi`): chấm điểm theo **bạn chung theo dõi org** (mạnh nhất) + **cùng tỉnh/thành** + **hợp `giai_doan`→`loai_to_chuc`** + **còn hoạt động** (có `org_bai_dang` gần đây). **Match theo ngành/nghề chỉ làm được với `truong_dai_hoc`** (`org_truong_nganh.id_nganh`); `co_so_dao_tao`/`studio` **chưa có** bảng nối org↔nghề → dùng tín hiệu còn lại.
  2. **Attribution tác phẩm verified member**: học viên hiện "học tại khóa X @ org", nhân viên studio hiện "làm tại dự án Z @ studio Y" (Verify Loại 2). User thấy tác phẩm đẹp → funnel sang trang org → follow. Kênh đẹp nhất (dùng moat verify, gần như 0 push).
  3. **Chèn feed tỉ lệ thấp** (xem O15): bài org *liên quan* (dùng lại bộ chấm điểm #1) chèn vào feed giữa với **hạn mức cứng** (~1 bài org / 10 bài người), **tối đa 1 bài/org/lần tải**, gắn nhãn **"Gợi ý"**, **không** xếp theo engagement. Né free-ads + giữ lằn ranh reach trả phí → `ad_` phase sau.
- **Cộng đồng (`cong_dong`) — bài KHÔNG rò ra feed; chỉ lan tỏa "căn phòng".**
  Bài `che_do_hien_thi='cong_dong'` giữ trong feed cộng đồng (đã loại trừ khỏi World Journey feed — quy tắc 26, L18). Lan tỏa cộng đồng = (a) gợi ý **"Tham gia cộng đồng X"** cho người hợp gu, (b) bài "tốt nghiệp" sang `public`/`theo_nhom` → chảy ra theo đường của *người*. Giữ tính phòng-riêng (chống spam).
- **Bất biến giữ nguyên**: số follower **ẩn** (L18); không engagement-rank toàn cục (quy tắc 22, L30 = hybrid theo bài trên Timeline); org reach hữu cơ **siết hơn** user `feature` (chừa đất `ad_`).
- *Thứ tự build*: gợi ý org (#1) → attribution studio (#2) → cộng đồng → chèn feed (#3, đụng luật feed, làm sau cùng).
- *Hệ quả file*: FOUNDATIONS quy tắc 22 (thêm bất đối xứng org); §13 (việc tương lai: bảng nối org↔nghề cho `co_so`/`studio`). Mở **O15**. IMPLEMENTATION: `lib/cins/home-adaptive/suggestions.ts` (gợi ý org), `lib/cins/worldJourneyFeedFetch.ts` (chèn tỉ lệ thấp — bước sau).

### Tách trục quyền: admin hệ thống ≠ sửa trang org (2026-06-30)

> ⚠️ **Lịch sử:** L20 → đảo bởi L23 (2026-07-03, mọi org) → **siết L23 hẹp (2026-07-12):** admin CINs chỉ mở khoá `truong_dai_hoc` trên trang public. Cơ sở/studio/cộng đồng lại theo L20 (membership thuần). Hành vi hiện tại: mục **L23 hẹp** ở trên.

- **L20 — Inline-edit / vận hành trang org = TRỤC 2 (membership) thuần; quyền admin hệ thống (trục 1) KHÔNG tự mở khoá.**
  • Bỏ short-circuit `getCurrentUserIsCinsAdmin()` ở: `getOrgAdminStatus` + `isTruongOrgAdmin` (`lib/truong/org-admin.ts`), `isStudioOrgAdmin` + `assertCanManageMembers` + `transferStudioOwnership` (`studio-members.ts`), `isCoSoOrgAdmin` (`co-so-membership.ts`), `assertCanManageMembers` + transfer (`co-so-members.ts`), transfer cộng đồng (`cong-dong/members.ts`), viewer settings (`truong-settings.ts` / `co-so-settings.ts`), `canViewerManageKhoaHoc` (`khoa-hoc.ts`), `canViewerManageSuKien` (`su-kien.ts`). Tất cả CHỈ còn dựa `user_thanh_vien_to_chuc.vai_tro`.
  • CINs admin (trục 1) can thiệp qua **trang `/admin`** — `app/api/admin/*` **giữ nguyên** gate `getCurrentUserIsCinsAdmin`. Admin KHÔNG "đi vào" trang org của người khác để inline-edit.
  • Lý do: 1 tài khoản (vd `CINs_Official` = super_admin `info.cins.vn@gmail.com`) vừa là admin vừa là user thường — không để god-mode toolbar lộ trên mọi trang.
  • Hệ quả: escape hatch gán membership → **L22** (`/admin/to-chuc`, không god-mode inline). Trước L22 xem **O14** (đã đóng).
  • Data: studio/cộng đồng/cơ sở legacy pattern cũ (system=owner + creator=admin) chuẩn hoá thủ công về creator=owner; `CINs_Official` gỡ khỏi mọi org không phải của mình.

### Trang chủ adaptive theo `giai_doan` (2026-06-28)

- **L19 — Trang chủ 3 cột: feed giữa chung, module hai bên theo persona.**
  • **Feed trung tâm** (`WorldJourneyFeed`) **không đổi theo `giai_doan`** — sort `tao_luc` desc; tab **Đang theo dõi** (milestone user + tag follow + `org_bai_dang` org follow) và **Khám phá** (bài `feature` từ tác giả chưa follow). Không inject tin tuyển dụng vào feed.
  • **Hai cột module** map từ `user_nguoi_dung.giai_doan` → persona `hoc` | `lam` | `day` (`lib/cins/home-adaptive/persona.ts`). `su_kien` + `goi_y_theo_doi` luôn có mọi persona.
  • **`tim_viec`** = modifier `seeking` trên cụm LÀM (banner Open-to-work + đẩy `co_hoi` lên đầu cột phải) — **không** dùng boolean `dang_tim_viec` riêng.
  • Module `co_hoi` + `scout_tai_nang` cần DB mới: `org_tuyen_dung`, `org_tuyen_dung_ung_tuyen`, `org_scout_luu` + 3 enum (`migration_org_tuyen_dung.sql`, runner `scripts/run-org-tuyen-dung-migration.mjs`).
  • Không hiển thị số follower công khai (giữ L18).

- **L19b — Default layout gọn theo giai đoạn (2026-08-03).**
  • User mới / `home_layout={}`: tối đa **3 khối** theo `MODULE_ORDER_BY_GIAI_DOAN` (Đang học · Freelance · Đang làm · Tìm việc · Đang dạy).
  • Auto-inject capability chỉ còn `cho_ban_duyet` + `don_can_xu_ly` — còn lại qua «Thêm khối».
  • Layout đã lưu (đã custom) không bị ghi đè; muốn về mặc định mới → DELETE `/api/user/home-layout` hoặc «Khôi phục mặc định».

### World Journey feed — lọc theo `che_do_hien_thi` (2026-06-19)

- **L18 — Trang chủ World Journey feed phân tầng 3 lớp (+ chỉ mình).**
  • `feature` (Nổi bật): portfolio/khoe — **mọi viewer** thấy, kể cả không bạn bè, không theo dõi.
  • `public` (Công khai): chỉ **bạn bè** hoặc **người đang theo dõi** tác giả.
  • `theo_nhom` (Bạn bè): chỉ **bạn bè** (2 chiều).
  • `chi_minh`: chỉ chủ bài — không lên feed người khác.
  • `cong_dong`: không thuộc World Journey feed.
  Helper: `lib/cins/worldJourneyFeedVisibility.ts` · feed UI `WorldJourneyFeed.tsx` (posts từ API, không mock).
  *Khác* timeline Journey profile visitor (`milestone-viewer-access.ts`): ở profile, `public` vẫn mở cho visitor; feed trang chủ siết `public` hơn để tránh viral/loãng.

### Session theo dõi + phân bổ nội dung (2026-06-15)

> Đảo 2 quyết định nền v6 (L5, L6). **Không có thay đổi DB** — enum `loai_theo_doi_enum` đã sẵn `nguoi_dung`/`the`/`to_chuc`.

- **L17 — Mở theo dõi người (follow-user) + phân bổ nội dung lên Gallery. ĐẢO L6.**
  Theo dõi 1 chiều, không cần đồng ý, không pending — áp cho **người** (`loai_doi_tuong='nguoi_dung'`) và **org** (`'to_chuc'`); kết bạn 2 chiều vẫn giữ song song (danh bạ nghề + bạn chung + điều kiện co-author). Nội dung public của đối tượng được theo dõi đẩy lên Gallery của người theo dõi (follow-feed). Org chỉ theo dõi được, không kết bạn.
  *Vì sao*: L6 bỏ follow-user vì "vô nghĩa khi không feed" — nay thêm feed nên follow có nghĩa. Muốn tăng trưởng cần kênh **phân bổ nội dung**; entity-discovery một mình không đủ reach. Schema sẵn sàng (0 migration).

- **L18 — Bỏ khung "anti-engagement". ĐẢO/làm rõ L5.**
  Gỡ các cấm tuyệt đối trong triết lý: bỏ "KHÔNG follower-user" và "KHÔNG feed (toàn cục)". Phân bổ nội dung = động cơ tăng trưởng, không phải thứ phải kìm hãm. **Giữ lại đúng 1 mảnh phản-vanity: số follower không hiển thị công khai** (theo dõi là kênh nhận nội dung, không phải bảng điểm đua số). Verify vẫn là moat — phân bổ không thay thế nó.
  *Hệ quả file*: FOUNDATIONS §1, §2 (2 bullet), quy tắc 22 + 23. IMPLEMENTATION mục Engagement + Follow. O1 đóng, mở O13 (mô hình rank feed).

### Session org-journey + filter động (2026-06-07)

> Schema áp dụng sau khi chạy `migration_filter_dong.sql` → đối chiếu DB trực tiếp (67 → 69 bảng).

- **Org Journey — gộp vào `org_bai_dang` (KHÔNG tạo `org_cot_moc`).**
  Áp cho **3 loại tổ chức thật** (`truong_dai_hoc`, `co_so_dao_tao`, `studio`); `cong_dong` KHÔNG (đã có feed cột mốc riêng). Thêm cột `org_bai_dang.thoi_diem` (ngày mốc lịch sử, khác `tao_luc`). Org journey **KHÔNG verify** — org tự kể về mình, khác milestone danh tính nghề của *người*.
  *Vì sao*: tái dùng `content_cot_moc` đắt (NOT NULL `id_nguoi_dung` + audit query); gộp `org_bai_dang` + 1 cột sạch nhất, đúng nếp `org_su_kien`/`org_hinh_anh`.

- **Filter cá nhân động (`filter_nhan` + `filter_gan`) — primitive nền tảng cho user & org.**
  Nhãn do chủ sở hữu tự tạo/sửa/xóa, gắn polymorphic lên `content_cot_moc` (user) / `org_bai_dang` (org). **Phân biệt cứng với tag toàn cục** — cục bộ, KHÔNG discovery xuyên người (quy tắc 29 FOUNDATIONS). Lọc áp **cả 2 view** (timeline + grid). Slug nhãn bất biến sau khi tạo. `loai_bai_dang_org_enum` deprecate nhưng GIỮ (còn code dùng).
  **Khách trên Journey người khác:** được thấy và lọc theo nhãn của chủ (chỉ nhãn gắn ≥1 cột mốc họ được xem) — không phải tính năng owner-only. Provider filter phải mount cho mọi viewer (`JourneyProfileShellClient`). Chi tiết code: `CINS_IMPLEMENTATION.md` §6 Journey & auth.

### v9 — Trang khóa học + gán tác phẩm cấp khóa (2026-06-10)

- **L14 — Tác phẩm gán CẤP KHÓA, không cấp lớp.**
  Học viên **tự đăng** tác phẩm (quy tắc 1), tự gắn "làm khi học [khóa] @ [org]" → org xác nhận (Verify Loại 2). `content_cot_moc.id_khoa_hoc` = trường khai báo bắt buộc khi khai "học ở đây"; `id_lop_hoc` **tự suy ra** từ `user_hoc_vien_lop` của học viên (để định tuyến yêu cầu verify tới đúng GV lớp), **KHÔNG bắt học viên chọn lớp**. Không có ghi danh → `id_lop_hoc` NULL, admin org duyệt.
  *Vì sao*: giá trị nghề = "học khóa X @ org" (mã lớp là chi tiết nội bộ, ra ngoài không ai tra); hợp mô hình liên tục (ranh giới lớp mờ); đơn giản cho học viên. **0 schema mới** — cả `id_khoa_hoc` và `id_lop_hoc` đã có sẵn trên `content_cot_moc`.

- **L15 — Mục "Sản phẩm học viên" trên trang khóa = lens** (theo L13).
  Lọc `content_cot_moc WHERE id_khoa_hoc = X AND verified AND public`. Org không sở hữu nội dung; tác phẩm sống ở Journey học viên. Mạnh hơn site tham chiếu (Keyframe/Sine Art): tác phẩm **đã verify** + link hồ sơ nghề thật, không phải link YouTube rời hay gallery phẳng.

- **L16 — Trang khóa ưu tiên mô hình LIÊN TỤC** (`lien_tuc_theo_thang`).
  Seed partner Sine Art chạy liên tục (khai giảng hàng tuần, học phí theo tháng, "khung lớp" thường trực). Cohort (`cohort_co_dinh`, kiểu Keyframe) = **biến thể render**: thay khung lớp thường trực bằng đợt có `ngay_khai_giang` cố định + một giá. Cùng một bộ section.

- **Cột mới** (migration `migration_khoa_hoc_v2.sql`, thay file `migration_giao_trinh_thu_tu.sql` đứng riêng):
  `org_giao_trinh.thu_tu` (thứ tự bài, backfill theo `cap_nhat_luc`), `org_giao_trinh.so_buoi` (số buổi/bài), `org_lop_hoc.lich_hoc` (lịch lặp + giờ, text), `org_lop_hoc.giao_vien_text` (GV chưa có tài khoản CINS), `org_khoa_hoc.noi_dung_blocks` (landing content dạng block, né đẻ N bảng marketing — `mo_ta` text giữ làm tóm tắt ngắn).

- **Cấu trúc trang khóa** (`/co-so/[slug]/khoa-hoc/[khoa-slug]`): Hero + facts · Giới thiệu (`noi_dung_blocks`) · Lộ trình bài (`org_giao_trinh` ORDER BY `thu_tu`, gating theo `visibility`: `public` xem thử / `chi_hoc_vien` khóa / `private` ẩn) · Khung lớp & lịch học (`org_lop_hoc`) · Giảng viên · Sản phẩm học viên (lens, L15). **Giữ tối giản, KHÔNG bê từ site tham chiếu**: bỏ reviews (O9), khối marketing dày + FAQ, chương-trình-nhiều-khóa (O10).

### v8 — Trang entity = lens (2026-06-08)

- **L13 — Mỗi trang entity (`keyword`/`phan_mem`/`nghe`/`mon_hoc`/`truong`...) là aggregation view, KHÔNG kho mới, KHÔNG có chủ.**
  Là *lens* chạy trên Journey cá nhân: filter mọi tác phẩm public mà cộng đồng đã gắn entity đó (`*_gan → content` ORDER BY ngày). Tác phẩm vẫn sống ở Journey người tạo (source of truth, quy tắc 1) — 0 schema mới, không clone nội dung.
  2 chế độ render cùng tập content: **Lưới** (visual, đang có) + **Dòng thời gian** (post-card, tái dùng card feed cộng đồng + album layout). Sort: mặc định **mới nhất**, thêm **A–Z** + **engagement** (user chọn).
  *Vì sao engagement-sort không phá luật chống-viral*: đây là tùy chọn thủ công, scoped trong context một entity — không có feed thuật toán toàn cục, không trending xuyên mạng (giữ nguyên L5 + quy tắc 22). Mỗi entity là một "bảng xếp hạng mini" chỉ khi user chủ động bật, mặc định vẫn chronological.
  **Lộ nguồn + tác giả là tính năng, không phải rò rỉ**: trang entity là phễu giúp user connect — bài public distribute hết, hiện rõ ai gắn tag; bài private (`che_do_hien_thi` không-public, gồm `cong_dong`/`chi_minh`) KHÔNG lộ. Lens chỉ kéo content public — gom vào helper visibility chung với query Journey public.
  **Naming**: hiển thị "Dòng thời gian" / "Hoạt động", KHÔNG gọi "Journey" — Journey = timeline cá nhân có chủ; trang entity là aggregation không chủ, tránh loãng khái niệm.
  *Chi phí*: route trang tag đã có; chỉ thêm tab + sort. Cần index `(entity_id, created_at)` cho tag/nghề phổ biến; engagement-sort dựa like count realtime (quy tắc 4) — cân nhắc cache nếu chậm.

### v6 — Cộng đồng v2: post = cột mốc (2026-06-08)

- **L12 — Bỏ `content_thao_luan` / `_media` / `_filter_gan`. Post cộng đồng = `content_cot_moc`.**
  Đăng bài vào cộng đồng = tạo cột mốc Journey với `id_to_chuc`=cộng đồng + `che_do_hien_thi='cong_dong'` (giá trị enum mới: ẩn khỏi Journey public của user, chỉ chính chủ thấy + hiện trong feed cộng đồng). Cộng đồng là **view tổng hợp cột mốc của thành viên** (như Gallery), KHÔNG sở hữu nội dung. Comment/reaction/lưu trỏ thẳng `content_cot_moc` → bền. Đổi thẻ từ `cong_dong` sang `public`/`theo_nhom` = "tốt nghiệp" bài thành milestone Journey, giữ nguyên comment.
  Nhãn cộng đồng: bảng `cong_dong_filter` (rename từ `content_thao_luan_filter`) + junction `cong_dong_filter_gan` nối `content_cot_moc` (hướng B — junction riêng, không nhồi vào `article_gan_cot_moc` vì nhãn thuộc về từng cộng đồng, khác tag toàn hệ).
  *Vì sao đảo L7b*: một source of truth duy nhất (`content_cot_moc`, quy tắc 1); cộng đồng làm cầu nối thay vì kho riêng; lưu = lưu cột mốc gốc của tác giả; bỏ được 3 bảng. Đây là bản trung thành nhất với "Journey là gốc, mọi nơi khác là view".
  *Rủi ro phải canh*: (1) `content_cot_moc` phình volume → bắt buộc index `(id_to_chuc, che_do_hien_thi)`; (2) `che_do_hien_thi='cong_dong'` là trường hợp đặc biệt — mọi query Journey public phải loại trừ, gom vào 1 helper, không rải rác.

### v6 — Layout & cấu trúc cộng đồng (2026-06-08)

- **L7b (đã đảo) — `cong_dong` = cộng đồng có thảo luận, theo model FB Group + lớp verified.**
  Member đăng bài tự do; mỗi post hiển thị kèm nghề + verified journey của người đăng (điểm khác FB). Post lưu dưới dạng `content_cot_moc` (xem L12), KHÔNG dùng `content_thao_luan`. *Vì sao*: connection/đóng góp là nhu cầu thật; FB tối ưu cho cộng đồng nhưng thiếu xác thực — CINS bù đúng chỗ đó. Discussion scoped vào context → không feed toàn cục → vẫn giữ luật chống-viral.
- **Loại org user tạo ngay = 3:** `co_so_dao_tao` · `studio` · `cong_dong`. Chỉ `truong_dai_hoc` cần CINS duyệt (đề xuất → review → seed); `doanh_nghiep` ẩn UI (gộp vào studio, L7).
- **Nhãn cộng đồng mặc định = 4** (seed sẵn + admin sửa/xoá/thêm, tutorial sau khi tạo): Khoe tác phẩm (violet) · Hỏi đáp (blue) · Tuyển người (orange) · Tài nguyên (mint). Hardcode template trong code, không bảng template.
- **Vai trò hợp lệ trong cộng đồng = 4** (trong 8 giá trị `vai_tro_to_chuc_enum`): `owner` (CINS) · `admin` · `quan_ly_noi_dung` (mod) · `thanh_vien`. Ẩn các vai trò của trường/đào tạo/doanh nghiệp khi gán trong cộng đồng.
- **Layout cộng đồng đồng bộ trang profile**: cột trái = group identity card (cover + avatar **vuông bo** để phân biệt user tròn + face pile "bạn ở đây" + bản đồ nghề theo `giai_doan` + nhịp cộng đồng), cột phải = toolbar (chips nhãn + sort + toggle) + feed. Mặc định view **Journey** (mốc tháng, không rail chấm), switch **Lưới** (Gallery). KHÔNG layout kiểu FB (composer khối to + sidebar gợi ý).
- **Nút vai trò**: một nút đổi nhãn theo `vai_tro` (Tham gia cộng đồng / Đang là thành viên / Quản trị viên / Admin), gộp menu Thông báo (Tất cả/Nổi bật/Tắt) + Rời. Bỏ nút Thông báo riêng.
- **Nhịp cộng đồng** chỉ hiển thị milestone nghề *đã verify* + member mới, cập nhật chậm — KHÔNG realtime mọi tương tác (tránh engagement-bait).

### Session verify (2026-06-07)

- **L8 — Uy tín nghề = badge danh tính verified, KHÔNG có lớp "verified hữu ích" riêng ở MVP.**
  *Vì sao*: badge "Vị trí @ Org" cạnh tên đã cho biết thẩm quyền người nói; thêm lớp endorse/accepted-answer là over-engineer khi forum chưa có traffic.
- **L9 — Luồng verify thống nhất: user-push + org-veto.**
  *Vì sao*: org-pull chết vì org không có động lực. Đảo chiều: user đẩy yêu cầu + bằng chứng, org chỉ bấm duyệt. Im lặng = trạng thái trung gian (tự khai, xám). 2 loại yêu cầu: (1) membership → `user_thanh_vien_to_chuc` → duyệt → sinh `content_cot_moc` `sinh_tu_org_assign`; (2) tác phẩm → org accept/reject. Người duyệt = admin (MVP). Fallback: `external_email`/`system_url`. Chi tiết: FOUNDATIONS §V.
- **L10 — Trạng thái trung gian hiển thị "tự khai" (xám, không badge), sáng lên khi verified.**
  *Vì sao*: user thấy ngay (đỡ nản) + áp lực mềm để org duyệt. Luôn phân biệt rõ xám/sáng, không bao giờ hiển thị tự khai như verified fact.
- **L11 — Peer tag vị trí (luồng 2) phải neo vào tác phẩm cụ thể**, không cho tag title chung chung trôi nổi.
  *Vì sao*: title-endorse kiểu LinkedIn dễ thổi phồng, làm loãng moat.

### v7 (tag system)

- **L1 — `keyword`/`phan_mem` là infrastructure, không phải content.** Chỉ trang aggregation + `tom_tat` AI gen, không prose, không vào navigation "Bài viết", `noi_dung=NULL`.
- **L2 — Tag tự do, không chặn upfront.** User gõ tag mới → tạo thẳng `article_bai_viet`, AI gen `tom_tat` ngay. `article_de_xuat` chỉ còn cho `nghe`/`nganh_dao_tao`.
- **L3 — `da_verify BOOLEAN` không phải gatekeeping.** Verified tag lên top autocomplete; chưa verify vẫn dùng. Admin verify sau khi tag tự nổi lên.
- **L4 — Alias dedup tự động.** Exact lowercase → `article_alias` map tự động. AI fuzzy → suggest confirm.

### v6 (engagement + social graph + org)

- **L19 — Phân quyền hệ thống CINs (2026-06-30):** 4 vai trò: `super_admin` (chỉ email `info.cins.vn@gmail.com`, bất biến, không lưu DB), `admin`, `curator`, `thanh_vien`. Bảng `user_quyen_he_thong` lưu admin/curator + audit `cap_boi`. Chỉ super_admin cấp/thu quyền admin; admin cấp curator/thành viên. Vào `/admin`: super_admin + admin + curator; tab quản lý user: super_admin + admin. Migration: `migration_user_quyen_he_thong.sql`.
- **L5 — "Anti-engagement" → "Engagement có context".** Like/reaction công khai mặc định (social proof thẩm mỹ). Viral triệt tiêu bằng *kiến trúc* (không feed toàn cục) chứ không bằng cấm like.
- **L6 — Bỏ follow-user → kết bạn 2 chiều (`user_ket_ban`).** Follow-user vô nghĩa khi không feed. Kết bạn phục vụ: danh bạ nghề + bạn chung + điều kiện tag co-author. `user_theo_doi` thu hẹp còn follow tag/org (xem O1).
- **L7 — Gộp `studio` + `doanh_nghiep`.** Giữ enum value, ẩn `doanh_nghiep` khỏi UI. Org user tạo ngay còn 3 loại. *Vì sao*: hai loại gần như giống hệt (cùng `project_du_an`, cùng tab) — không đáng 2 nhãn riêng.

---

## Drift đã phát hiện & sửa

### 2026-06-10
- **Migration `migration_giao_trinh_thu_tu.sql` đứng riêng đã được gộp** vào `migration_khoa_hoc_v2.sql` (thêm `so_buoi`, `lich_hoc`, `giao_vien_text`, `noi_dung_blocks`). Dùng file v2, bỏ file lẻ.
- **FOUNDATIONS §V Loại 2 ví dụ "khi học lớp Y"** đổi thành "khi học khóa Y" cho khớp L14 (gán cấp khóa).

### 2026-06-08
- **L7b cũ + 4 bảng `content_thao_luan*` đã bị đảo** (L12): post cộng đồng chuyển sang `content_cot_moc`. Drop `content_thao_luan` / `_media` / `_filter_gan`; rename `content_thao_luan_filter` → `cong_dong_filter`; thêm `cong_dong_filter_gan` + enum value `cong_dong`. Migration: `migration_cong_dong_v2_cot_moc.sql`.
- **Demo bản đồ nghề từng ghi "Art Director / Lead"** — không có field nguồn trong schema. Sửa: bản đồ nghề chỉ dùng `giai_doan` (đang học/đang làm/freelance/đang dạy/tìm việc). Xem O8.

### 2026-06-07
- **4 bảng `content_thao_luan*` có trong DB nhưng instruction cũ ghi "TBD".** → đã chính thức hoá rồi sau đó đảo (xem trên).
- **Header instruction nói "62 bảng", memory nói "~53"; DB thật = 67 bảng logic.** Sau v6 cộng đồng v2: ~65 bảng (bỏ 3 thao_luan*, thêm cong_dong_filter_gan, rename 1). → đọc trực tiếp từ DB để khỏi lệch.
- *Bài học*: prose schema chép tay luôn drift. **Bỏ file `CINS_SCHEMA.md` (2026-06-30)** — cấu trúc đọc trực tiếp từ DB (Prisma/Supabase MCP · `information_schema`), không duy trì bản chép tay nữa.
