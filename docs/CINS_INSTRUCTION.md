# CINS — README (Project Instructions)

> **File router — điểm vào cho agent & developer.** Bản đầy đủ sống trong `docs/` (5 file bên dưới).
> **Phiên bản:** v9 khóa học + entity lens 2026-06-10 · org-journey/filter 2026-06-07 · **67 bảng logic hiện tại** (69 sau `migration_filter_dong.sql` — xem SCHEMA.md).

CINS = creative hub cho ngành sáng tạo Việt Nam (Next.js + Supabase). Hai tầng core: **Journey** (blog cá nhân tích lũy, source of truth) + **Gallery** (feed khám phá visual). Verify là moat.

---

## Tài liệu — tra ở đâu

| Cần gì | File | Ghi chú |
|---|---|---|
| Triết lý, **28 quy tắc** kiến trúc, luồng verify, loại org, naming, quy ước làm việc | [`CINS_FOUNDATIONS.md`](./CINS_FOUNDATIONS.md) | Luật nền, đổi chậm |
| Bảng / cột / enum / FK cụ thể | [`CINS_SCHEMA.md`](./CINS_SCHEMA.md) | **Sinh từ DB — là sự thật cấu trúc** |
| API route, lib, file SQL, seed, env/infra, ghi chú site | [`CINS_IMPLEMENTATION.md`](./CINS_IMPLEMENTATION.md) | Đổi nhanh nhất |
| Đã quyết gì & vì sao · câu hỏi còn treo | [`CINS_DECISIONS.md`](./CINS_DECISIONS.md) | File chống quên |
| Code/security/performance/UI conventions | [`CINS_DEV_RULES.md`](./CINS_DEV_RULES.md) | Cách code |

Thứ tự ưu tiên khi xung đột: **DB thật > CINS_SCHEMA.md > CINS_FOUNDATIONS.md > các file khác**. Không bao giờ tin prose schema hơn DB.

**Map chuyên sâu:** [`cursor_map_truong.md`](./cursor_map_truong.md) · [`cursor_brief_truong_trang_data_map.md`](./cursor_brief_truong_trang_data_map.md) *(bulk SQL field→UI, không tab Bài đăng)* · [`cursor_map_admin.md`](./cursor_map_admin.md) · [`cursor_map_inline_edit.md`](./cursor_map_inline_edit.md)

---

## Luật bắt buộc trong mọi chat

1. **Nhắc cập nhật tài liệu.** Nếu quyết định/thay đổi chạm FOUNDATIONS / SCHEMA / IMPLEMENTATION / DECISIONS → trước khi kết thúc: chỉ rõ **file + mục**, tóm tắt 1–2 câu, **hỏi xác nhận** "cập nhật vào [file] chứ?". Đặc biệt: bảng/cột/enum → SCHEMA; quy tắc kiến trúc → FOUNDATIONS; chốt câu OPEN → DECISIONS.

2. **Schema là source of truth.** Query `information_schema` trước khi generate SQL. Không assume field name từ trí nhớ hay instruction cũ.

3. **Làm việc bằng tiếng Việt.** English giữ cho technical terms, tên phần mềm, tên nghề.

4. **Quy ước hội thoại** (đầy đủ ở FOUNDATIONS §6): confirm từng bước với quyết định có hệ quả lớn · "sao cũng được" = tự quyết · "khoan sửa" = defer · review 1 sample trước bulk · push back có reasoning · trả lời ngắn gọn.

5. **Đọc DEV_RULES trước khi code** — security, performance, streaming, design tokens.

---

## Số liệu neo (cập nhật khi đổi)

- **DB hiện tại**: 67 bảng logic (66 thường + `social_luot_xem` partitioned; 2 partition con không tính). Sau khi chạy `migration_filter_dong.sql` → **69 bảng** (`filter_nhan`, `filter_gan`). Xác nhận lại bằng `CINS_SCHEMA.md` mỗi lần regenerate.
- **Org user tạo ngay**: `co_so_dao_tao` · `studio` · `cong_dong` (`doanh_nghiep` ẩn UI; `truong_dai_hoc` CINS duyệt).
- **Seed partner đầu**: Sine Art (`co_so_dao_tao`, ~520 học viên).

---

## Thay đổi lớn gần đây (tóm tắt — chi tiết ở DECISIONS)

**v9 — trang khóa học (2026-06-10):** Tác phẩm gán **cấp khóa** (`id_khoa_hoc`), lớp tự suy từ ghi danh. "Sản phẩm học viên" = lens verified trên Journey. Trang khóa ưu tiên mô hình liên tục (Sine Art). Migration: `migration_khoa_hoc_v2.sql`.

**v8 — trang entity = lens (2026-06-08):** Mọi trang tag/nghề/trường… là aggregation view trên Journey — Lưới + Dòng thời gian, sort mới nhất / A–Z / engagement (scoped, không feed toàn cục).

**v7 — tag system:** `keyword`/`phan_mem` = infrastructure (aggregation + `tom_tat` AI, không prose). Tag tự do, `da_verify` không gatekeeping, alias dedup tự động.

**v6 — social graph:** Engagement có context (like công khai, không feed toàn cục). Bỏ follow-user → `user_ket_ban`. `user_theo_doi` thu hẹp follow tag/org. Gộp `studio` + `doanh_nghiep` (ẩn UI). Cộng đồng v2: post = `content_cot_moc` (`che_do_hien_thi='cong_dong'`).

**2026-06-07 — org Journey + filter động:** Org (`truong_dai_hoc` / `co_so_dao_tao` / `studio`) timeline qua `org_bai_dang` + `thoi_diem`. Filter cá nhân `filter_nhan` + `filter_gan` (quy tắc 29). Migration: `migration_filter_dong.sql`.
