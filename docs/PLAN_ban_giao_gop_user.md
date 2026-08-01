# PLAN — Bàn giao gộp vào user thật (supersede đổi auth)

> **Phase:** PLANNING — **chưa code** đến khi user xác nhận build.  
> **Ngày:** 2026-08-01 · **Parent:** [`PLAN_tai_khoan_clone.md`](./PLAN_tai_khoan_clone.md)  
> **Lý do:** User chốt «gộp user thật» — đích bàn giao **được phép đã có bài** (vd. `@basakila` 40 bài).

---

## 0. Đổi quyết định

| Trước (B) | Sau (C) — **chốt mới** |
|---|---|
| Đổi `auth_user_id` trên profile **clone** | Chuyển **nội dung seeding** từ clone → profile **user thật** |
| Đích phải **trống** | Đích **được có bài** |
| Giữ slug + permalink clone | Permalink bài đổi sang slug user thật |
| Xóa profile đích trống | **Giữ** profile user thật; **xóa** profile clone (+ auth `@cins.vn`) |

**Không** move ~70 bảng “đời sống” (chat, follow, shop buyer…). Chỉ whitelist **portfolio seeding**.

---

## 1. Phạm vi chuyển (whitelist — khảo sát DB 2026-08-01)

### 1.1 Bắt buộc (owner bài)

| Bảng / cột | Thao tác |
|---|---|
| `content_cot_moc.id_nguoi_dung` | `C → T` mọi moc của clone |
| `content_tac_pham.id_nguoi_dung` | `C → T` (nếu có) |
| `content_tac_pham_tac_gia` `(id_tac_pham, id_nguoi_dung)` | `C → T`; **conflict UNIQUE** → giữ row T, xóa/skip row C |
| `content_cot_moc_hien_thi_ngoai_le.id_nguoi_dung` | `C → T` (theo moc đã chuyển) |
| `user_journey_ghim` | ghim của C → T (conflict PK/unique → skip) |
| `user_gallery_noi_bat` | gallery clone → T (conflict → skip) |
| `content_share_link.id_nguoi_tao` | nếu link gắn moc của C: cập nhật creator → T **hoặc** để nguyên (prefer: update nếu `id_nguoi_tao = C`) |

FK con theo `id_cot_moc` (**không** cần đổi owner):  
`article_gan_cot_moc`, `cong_dong_filter_gan`, `content_tac_pham_thuoc_moc`, `shop_*` gắn moc, `verify_*` — đi theo moc đã đổi `id_nguoi_dung`.

### 1.2 Không chuyển (cố ý)

Chat, kết bạn, theo dõi, reaction/comment **của** clone-as-actor, quyền hệ thống, org membership, shop cửa hàng 1-1, emoji packs…  
Seeding clone **không** được dùng làm identity xã hội — nếu có rác, admin dọn tay trước hoặc RPC **fail** nếu phát hiện (tuỳ chọn cứng).

### 1.3 Chặn trước apply (clone “bẩn”)

Từ chối apply nếu clone còn bất kỳ:

- `shop_cua_hang` / `shop_san_pham` / đơn bán với `id_nguoi_ban = C`
- `user_quyen_he_thong`
- `user_thanh_vien_to_chuc` / `org_to_chuc.nguoi_tao = C`
- `chat_thanh_vien` (phòng không phải self-DM rác) — **optional soft**: warn + cho force nếu super_admin

User thật (T): **không** chặn vì đã có bài.

---

## 2. Luồng UI / API

### Gán (không phá hủy)

1. Admin chọn user thật (autocomplete) — **bỏ filter bắt buộc 0 bài**.
2. Preview: `N bài clone → @slugThật (đã có M bài)`. Cảnh báo rõ: *permalink đổi; slug clone sẽ mất*.
3. `trang_thai_ban_giao = cho_ban_giao`, lưu `id_nguoi_dung_dich`.

### Apply (RPC transaction)

```
1. Lock C (clone profile + auto_tai_khoan), T (user thật). Re-read.
2. Assert C chưa bẩn (§1.3). Assert T tồn tại + khác C.
3. INSERT auto_ban_giao (snapshot: slug_clone, id C/T, so_cot_moc, email đích, chiến lược='gop_noi_dung')
4. UPDATE whitelist §1.1  C → T
5. DELETE auto_tai_khoan (clone row)
6. DELETE user_nguoi_dung WHERE id = C
   → FK còn sót raise → ROLLBACK (fail-safe)
COMMIT
7. auth.admin.deleteUser(authC) ngoài TX
```

Kết quả: artist vào `@basakila` thấy bài cũ + toàn bộ bài seeding. Nick clone biến mất khỏi roster và URL.

### Hủy gán

Giữ như hiện tại — chỉ clear `id_nguoi_dung_dich` / status.

---

## 3. Schema / RPC

| Thay đổi | Chi tiết |
|---|---|
| RPC mới hoặc thay `ban_giao_tai_khoan_clone` | Đổi logic → gộp nội dung; **không** còn yêu cầu T trống; **không** hoán `auth_user_id` |
| `auto_ban_giao` | Thêm cột `chien_luoc text` (`doi_auth` \| `gop_noi_dung`) — default `gop_noi_dung` cho apply mới; row cũ = `doi_auth` |
| Grant | Giữ SECURITY DEFINER + revoke anon/authenticated |

Migration additive: `migration_ban_giao_gop_user.sql` + runner npm.

---

## 4. Frontend

- Gợi ý user: bỏ disable «có bài»; badge «có bài» → info (sẽ gộp), không cảnh báo lỗi.
- Modal apply: copy mới — *«Chuyển N bài từ @clone → @that. Permalink đổi. Xóa nick clone. Không hoàn tác.»* + gõ đúng slug **clone**.
- Roster: sau apply nick biến mất (như cũ).

---

## 5. Edge cases

| Case | Xử lý |
|---|---|
| Clone 0 bài | Vẫn cho apply (chỉ xóa nick ảo) |
| T = C | Forbidden |
| UNIQUE `content_tac_pham_tac_gia` trùng | Giữ T, drop C |
| Moc private/draft | Vẫn chuyển (cùng owner) |
| TOCTOU: thêm bài vào C giữa Gán→Apply | Apply lấy snapshot lúc apply (OK) |
| Artist muốn **giữ** slug clone | **Không** hỗ trợ trong C — dùng lại B (đích trống) nếu cần sau này; phase này chỉ C |
| Permalink đã share `/clone/...` | Chết — chấp nhận theo quyết định user |

---

## 6. Steps build (sau khi confirm)

1. Migration RPC `gop` + cột `chien_luoc` + runner  
2. Lib: `gan` không check trống; `apply` gọi RPC mới; deprecate path B  
3. UI: autocomplete + modal copy + bỏ chặn «có bài»  
4. Update `CINS_DECISIONS.md` + `CINS_IMPLEMENTATION.md`  
5. Verify: nick 3 bài → gộp vào user có bài; nick bẩn shop → fail rõ

---

## 7. Security

- Chỉ `canManageUsers`.
- Confirm slug clone.
- Audit `auto_ban_giao` bắt buộc trước DELETE.
- Không expose RPC ra client trực tiếp.

---

## 8. Câu treo (nhanh)

1. Có giữ **song song B** (đích trống → đổi auth, giữ slug) trong UI không? Mặc định plan này: **chỉ C**.  
2. `filter_nhan` / nhãn trên moc của C — chuyển theo moc hay bỏ?

---

**Chờ xác nhận:** cập nhật `CINS_DECISIONS.md` + build Phase RPC/UI theo plan này chứ?
