# CINS — README (Project Instructions)

> **File router — điểm vào cho agent & developer.** Bản đầy đủ sống trong `docs/` (5 file bên dưới).
> **Phiên bản:** v12 MXH chuyên môn + đóng góp canonical 2026-07-10 · **L28 workspace nhóm chat 2026-07-13** · v11 phân quyền org 2026-07-01 · v10 theo dõi/phân bổ 2026-06-15 · **~72 bảng logic** sau L28 (đọc trực tiếp từ DB để xác nhận).

CINS = **mạng xã hội chuyên môn** cho ngành sáng tạo Việt Nam (Next.js + Supabase). Ba tầng: **Portfolio/Journey** (MXH + showcase) · **Entity lens** (khám phá) · **Canonical** (tri thức đã duyệt). Verify quan hệ là moat; curator thẩm định nội dung là trục riêng.

---

## Tài liệu — tra ở đâu

| Cần gì | File | Ghi chú |
|---|---|---|
| Triết lý, **32 quy tắc** kiến trúc, luồng verify, đóng góp canonical (§K), loại org, naming, quy ước làm việc | [`CINS_FOUNDATIONS.md`](./CINS_FOUNDATIONS.md) | Luật nền, đổi chậm |
| Bảng / cột / enum / FK cụ thể | **Đọc trực tiếp từ DB** | Prisma/Supabase MCP hoặc `information_schema` — **là sự thật cấu trúc** |
| API route, lib, file SQL, seed, env/infra, ghi chú site | [`CINS_IMPLEMENTATION.md`](./CINS_IMPLEMENTATION.md) | Đổi nhanh nhất |
| Đã quyết gì & vì sao · câu hỏi còn treo | [`CINS_DECISIONS.md`](./CINS_DECISIONS.md) | File chống quên |
| Code/security/performance/UI conventions | [`CINS_DEV_RULES.md`](./CINS_DEV_RULES.md) | Cách code |

Thứ tự ưu tiên khi xung đột: **DB thật (đọc trực tiếp) > CINS_FOUNDATIONS.md > các file khác**. Không bao giờ tin prose schema hơn DB.

**Map chuyên sâu:** [`cursor_map_truong.md`](./cursor_map_truong.md) · [`cursor_brief_truong_trang_data_map.md`](./cursor_brief_truong_trang_data_map.md) *(bulk SQL field→UI, không tab Bài đăng)* · [`cursor_map_admin.md`](./cursor_map_admin.md) · [`cursor_map_inline_edit.md`](./cursor_map_inline_edit.md) · [`cursor_brief_dong_gop_noi_dung.md`](./cursor_brief_dong_gop_noi_dung.md) *(đóng góp canonical — session plan)*

---

## Luật bắt buộc trong mọi chat

1. **Nhắc cập nhật tài liệu.** Nếu quyết định/thay đổi chạm FOUNDATIONS / IMPLEMENTATION / DECISIONS → trước khi kết thúc: chỉ rõ **file + mục**, tóm tắt 1–2 câu, **hỏi xác nhận** "cập nhật vào [file] chứ?". Đặc biệt: bảng/cột/enum → **đối chiếu DB trực tiếp** (không còn file schema chép tay); quy tắc kiến trúc → FOUNDATIONS; chốt câu OPEN → DECISIONS.

2. **Schema là source of truth.** Đọc trực tiếp từ DB (Prisma/Supabase MCP hoặc `information_schema`) trước khi generate SQL. Không assume field name từ trí nhớ hay instruction cũ.

3. **Làm việc bằng tiếng Việt.** English giữ cho technical terms, tên phần mềm, tên nghề.

4. **Quy ước hội thoại** (đầy đủ ở FOUNDATIONS §6): confirm từng bước với quyết định có hệ quả lớn · "sao cũng được" = tự quyết · "khoan sửa" = defer · review 1 sample trước bulk · push back có reasoning · trả lời ngắn gọn.

5. **Đọc DEV_RULES trước khi code** — security, performance, streaming, design tokens.

---

## Số liệu neo (cập nhật khi đổi)

- **DB hiện tại**: 67 bảng logic (66 thường + `social_luot_xem` partitioned; 2 partition con không tính). Sau `migration_filter_dong.sql` → **69** (`filter_nhan`, `filter_gan`). Sau `migration_chat_project_workspace.sql` (L28) → thêm `chat_the_tai_nguyen`, `chat_the_gan`, `chat_moc` (+ cột trên `chat_phong`). Xác nhận lại bằng schema DB thật mỗi khi nghi ngờ.
- **Org user tạo ngay**: `co_so_dao_tao` · `studio` · `cong_dong` (`doanh_nghiep` ẩn UI; `truong_dai_hoc` CINS duyệt).
- **Seed partner đầu**: Sine Art (`co_so_dao_tao`, ~520 học viên).

---

## Thay đổi lớn gần đây (tóm tắt — chi tiết ở DECISIONS)

**Auto thumbnail embed (2026-07-15):** Gallery / publish tự lấy poster YouTube·oEmbed·OG (hoặc capture `.riv`); user cover vẫn ưu tiên. Xem DECISIONS LOG + IMPLEMENTATION *Embed → Gallery thumbnail*.

**L31 — môn chuyên ngành đồ án trường (2026-07-14):** bảng `org_truong_nganh_mon` nối ngành trường ↔ entity `mon_hoc`; gắn org cascade môn + dual-write lens; filter Năm→Ngành→Môn. Xem DECISIONS L31, IMPLEMENTATION SQL/API truong mon.

**L29 — World editorial boost ẩn (2026-07-14):** `super_admin`/`admin` đẩy nội dung lên ưu tiên World Timeline + Gallery (không nhãn viewer); tab `/admin` quản lý đăng (grid/listing/dashboard) + toggle trên feed; TTL 3 ngày tự gia hạn; không đụng Journey cá nhân. Xem DECISIONS L29, FOUNDATIONS quy tắc 22, `cursor_map_admin.md`.

**L28 — workspace nhóm chat (2026-07-13):** phòng project con (`id_phong_cha` + ẩn/`an` + lịch sử) · thẻ tài nguyên theo phòng (`chat_the_*`) · mốc timeline phòng (`chat_moc`). Không reuse `filter_nhan`. Xem DECISIONS L28, FOUNDATIONS §C, IMPLEMENTATION chat routes.

**L27 — chế độ phòng cộng đồng (2026-07-12):** `cau_hinh.che_do` = `cong_khai` · `noi_bo` · `bi_mat` (alias `rieng_tu`→`bi_mat`). Join gate suy từ chế độ; xin tham gia nội bộ = `trang_thai=pending`. Xem DECISIONS L27, FOUNDATIONS §O.

**v12 — MXH chuyên môn + đóng góp canonical (2026-07-10):** Pivot từ "chống MXH" sang **mạng xã hội chuyên môn** (portfolio + timeline + chat + follow). Entity page 3 tab: Nội dung / Đóng góp / Thảo luận. Đóng góp = bản thảo song song, curator promote (không Wikipedia edit). Xem **L26**, FOUNDATIONS §1/§K, quy tắc 25/30–32. Brief triển khai: `cursor_brief_dong_gop_noi_dung.md`.

**v11 — phân quyền org từ admin (2026-07-01):** Super admin gán `user_thanh_vien_to_chuc` (owner, ban tuyển sinh, …) qua `/admin/to-chuc` + mật khẩu env `CINS_ORG_DELEGATION_PASSWORD`. Không mở god-mode inline (L20). Xem **L22**, đóng **O14**.

**v10 — theo dõi + phân bổ (2026-06-15):** Mở **theo dõi 1 chiều** cho người + tag + org (kết bạn 2 chiều vẫn giữ song song). Nội dung public của đối tượng được theo dõi phân bổ lên **Gallery** (follow-feed, sắp thời gian thực ở MVP). Bỏ khung anti-engagement (gỡ cấm follower-user / feed); giữ phản-vanity = số follower ẩn. **0 migration** (enum `loai_theo_doi_enum` đã có `nguoi_dung`). Xem DECISIONS L17/L18, O13.

**v9 — trang khóa học (2026-06-10):** Tác phẩm gán **cấp khóa** (`id_khoa_hoc`), lớp tự suy từ ghi danh. "Sản phẩm học viên" = lens verified trên Journey. Trang khóa ưu tiên mô hình liên tục (Sine Art). Migration: `migration_khoa_hoc_v2.sql`.

**v8 — trang entity = lens (2026-06-08):** Mọi trang tag/nghề/trường… là aggregation view trên Journey — Lưới + Dòng thời gian, sort mới nhất / A–Z / engagement (scoped, không feed toàn cục).

**v7 — tag system:** `keyword`/`phan_mem` = infrastructure + **có thể có prose canonical** (đảo L26). Tag tự do, `da_verify` không gatekeeping, alias dedup tự động.

**v6 — social graph:** Engagement có context (like công khai). Kết bạn 2 chiều `user_ket_ban` (**theo dõi người mở lại ở v10**). Gộp `studio` + `doanh_nghiep` (ẩn UI). Cộng đồng v2: post = `content_cot_moc` (`che_do_hien_thi='cong_dong'`).

**2026-06-07 — org Journey + filter động:** Org (`truong_dai_hoc` / `co_so_dao_tao` / `studio`) timeline qua `org_bai_dang` + `thoi_diem`. Filter cá nhân `filter_nhan` + `filter_gan` (quy tắc 29). Migration: `migration_filter_dong.sql`.
