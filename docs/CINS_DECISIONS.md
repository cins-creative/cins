# CINS — DECISIONS

> **File trong repo:** `docs/CINS_DECISIONS.md`
> **Decision log + câu hỏi treo.** File này chống quên: ghi *đã quyết gì, vì sao*, và *còn treo gì, đóng khi nào*.
> Quy tắc: mỗi câu treo phải có **điều kiện đóng** cụ thể, không để "[cần duyệt]" lửng lơ vô thời hạn.
> Khi một câu được chốt → chuyển từ phần OPEN xuống phần LOG kèm ngày.

---

## OPEN — câu hỏi đang treo

| # | Câu hỏi | Trạng thái tạm | Điều kiện đóng |
|---|---|---|---|
| O1 | Giữ `user_theo_doi` (follow tag/org) hay bỏ hẳn? | Tạm giữ — follow `bai_viet`/`org` để nhận `social_thong_bao` | Khi có ≥1 tính năng thật cần subscribe nội dung mới (vd. notification tag). Nếu sau 1 mùa launch không dùng → DROP. |
| O2 | Chat 1-1 có gate sau kết bạn không? | Chưa gate — giữ logic chat cũ | Khi có báo cáo spam/quấy rối từ user thật, hoặc trước khi mở chat cho user ngoài cohort Sine Art. |
| O3 | `studio` vs `doanh_nghiep` | ✅ **ĐÃ CHỐT — gộp** (xem L7). Còn lại: bao giờ `doanh_nghiep` cần tab/field riêng tách lại? | Khi có org doanh_nghiep yêu cầu tính năng studio không có. Hiện không. |
| O4 | Cap file video | 300MB (đang cân nhắc 500MB) | Khi đo được chi phí Bunny + hành vi upload thật của cohort đầu. Chốt 1 con số trước launch. |
| O5 | `verify_yeu_cau` Loại 2 — có cần vai trò `quan_ly_nhan_su` riêng để duyệt membership? | Không — admin duyệt tất (xem L9) | Khi có công ty lớn (>50 member) yêu cầu tách quyền duyệt nhân sự khỏi duyệt nội dung. |
| O6 | Phân nhóm tag `keyword`/`phan_mem` theo ngành nghề | Defer | Khi có đủ data tagging thật từ user (gợi ý ngưỡng: ≥200 tag active). |
| O7 | `content_thao_luan` — có cần lớp "uy tín/hữu ích" (accepted answer / endorse) ngoài badge danh tính? | ✅ **ĐÓNG** — bảng `content_thao_luan` đã bỏ (L14); thảo luận = comment trên `content_cot_moc` | — |

---

## LOG — quyết định đã chốt

### Session org-journey + filter động (2026-06-07)

> Schema áp dụng sau khi chạy `migration_filter_dong.sql` → regenerate SCHEMA.md (67 → 69 bảng).

- **L12 — Org có Journey riêng, gộp vào `org_bai_dang` (KHÔNG tạo `org_cot_moc`).**
  Áp cho **3 loại tổ chức thật** (`truong_dai_hoc`, `co_so_dao_tao`, `studio`); `cong_dong` KHÔNG (đã có thảo luận). Thêm cột `org_bai_dang.thoi_diem` (ngày mốc lịch sử, khác `tao_luc`). Org journey **KHÔNG verify** — org tự kể về mình, khác hẳn milestone danh tính nghề của *người* (cái đó mới là moat verify).
  *Vì sao loại 2 phương án khác*: `org_cot_moc` riêng → trùng việc với `org_bai_dang`. Tái dùng `content_cot_moc` → phải bỏ NOT NULL `id_nguoi_dung` + audit mọi query milestone hiện có → đắt hơn lợi DRY. Gộp `org_bai_dang` + 1 cột là sạch nhất, đúng nếp `org_su_kien`/`org_hinh_anh` (1 bảng dùng chung mọi loại org).

- **L13 — Filter cá nhân động (`filter_nhan` + `filter_gan`) — primitive nền tảng cho user & org.**
  Nhãn do chủ sở hữu tự tạo/sửa/xóa, gắn polymorphic lên `content_cot_moc` (user) / `org_bai_dang` (org). **Phân biệt cứng với tag toàn cục**: nhãn cá nhân cục bộ, KHÔNG kéo discovery xuyên người dùng → không phá luật chống-viral. Cho phép user tự mở rộng cách dùng (vd dòng merch của artist) mà KHÔNG thêm nghiệp vụ thương mại. Lọc áp cho **cả 2 view** (timeline + grid). Seed nhãn mặc định theo `loai_to_chuc` ở **app layer** (không seed trong migration).
  *Mở rộng tương lai*: `user_nhom_boi_canh.id_nguoi_dung` đã nullable → nếu org cần "nhóm bối cảnh" thật, tái dùng được, không bảng mới.
  *Quyết định phụ*: slug nhãn bất biến sau khi tạo (đổi `ten` không đổi slug) để không vỡ URL `?filter=` đã share. `loai_bai_dang_org_enum` deprecate nhưng GIỮ (còn code dùng), dọn sau.

### Session verify (2026-06-07)

- **L8 — Uy tín nghề = badge danh tính verified, KHÔNG có lớp "verified hữu ích" riêng ở MVP.**
  *Vì sao*: badge "Vị trí @ Org" cạnh tên đã cho biết thẩm quyền người nói; thêm lớp endorse/accepted-answer là over-engineer khi forum chưa có traffic. Gỡ ý "ghi nhận bằng verified hữu ích" khỏi mô tả §12 cũ.
- **L9 — Luồng verify thống nhất: user-push + org-veto.**
  *Vì sao*: org-pull (org chủ động xác nhận từng người) chết vì org không có động lực. Đảo chiều: user đẩy yêu cầu + bằng chứng, org chỉ bấm duyệt một cú. Im lặng = trạng thái trung gian (tự khai, xám), org chỉ can thiệp để bác cái sai. 2 loại yêu cầu: (1) membership → `user_thanh_vien_to_chuc` → duyệt → sinh `content_cot_moc` `sinh_tu_org_assign`; (2) tác phẩm → org accept/reject, tách khỏi co-author. Người duyệt = admin (duyệt tất, MVP). Fallback ngoài nền tảng: `external_email`/`system_url`. Chi tiết: FOUNDATIONS §V.
- **L10 — Trạng thái trung gian hiển thị "tự khai" (xám, không badge), sáng lên khi verified.**
  *Vì sao*: user thấy ngay (đỡ nản) + tạo áp lực mềm để org duyệt. Đổi lại chấp nhận title tự khai trôi nổi — không phá moat vì luôn phân biệt rõ xám/sáng, không bao giờ hiển thị tự khai như verified fact.
- **L11 — Peer tag vị trí (luồng 2) phải neo vào tác phẩm cụ thể**, không cho tag title chung chung trôi nổi.
  *Vì sao*: title-endorse kiểu LinkedIn dễ thổi phồng, làm loãng moat. Co-author đã neo vào tác phẩm cụ thể — title cũng phải vậy.

### v7 (tag system)

- **L1 — `keyword`/`phan_mem` là infrastructure, không phải content.** Chỉ trang aggregation + `tom_tat` AI gen, không prose, không vào navigation "Bài viết", `noi_dung=NULL`.
- **L2 — Tag tự do, không chặn upfront.** User gõ tag mới → tạo thẳng `article_bai_viet`, AI gen `tom_tat` ngay. `article_de_xuat` chỉ còn cho `nghe`/`nganh_dao_tao`.
- **L3 — `da_verify BOOLEAN` không phải gatekeeping.** Verified tag lên top autocomplete; chưa verify vẫn dùng. Admin verify sau khi tag tự nổi lên.
- **L4 — Alias dedup tự động.** Exact lowercase → `article_alias` map tự động. AI fuzzy → suggest confirm.

### v6 (engagement + social graph + org)

- **L5 — "Anti-engagement" → "Engagement có context".** Like/reaction công khai mặc định (social proof thẩm mỹ). Viral triệt tiêu bằng *kiến trúc* (không feed toàn cục) chứ không bằng cấm like.
- **L6 — Bỏ follow-user → kết bạn 2 chiều (`user_ket_ban`).** Follow-user vô nghĩa khi không feed. Kết bạn phục vụ: danh bạ nghề + bạn chung + điều kiện tag co-author. `user_theo_doi` thu hẹp còn follow tag/org (xem O1).
- **L7 — Gộp `studio` + `doanh_nghiep`.** Giữ enum value, ẩn `doanh_nghiep` khỏi UI. Org user tạo ngay còn 3 loại. *Vì sao*: hai loại gần như giống hệt (cùng `project_du_an`, cùng tab) — không đáng 2 nhãn riêng.
- **L7b — `cong_dong` = cộng đồng có thảo luận, post = `content_cot_moc` (KHÔNG dùng `content_thao_luan`).**
  Đăng bài vào cộng đồng = tạo cột mốc Journey với `id_to_chuc`=cộng đồng + `che_do_hien_thi='cong_dong'` (ẩn Journey public, hiện feed cộng đồng). Cộng đồng là **view tổng hợp cột mốc của thành viên** (như Gallery), không sở hữu nội dung. Comment/reaction trỏ cột mốc → bền. Đổi thẻ sang public = "tốt nghiệp" thành milestone Journey, giữ nguyên comment.
  *Vì sao đảo*: một source of truth duy nhất (`content_cot_moc`, quy tắc 1); cộng đồng làm cầu nối thay vì kho riêng; lưu = lưu cột mốc gốc của tác giả; bỏ được 3 bảng. Bản chất trung thành nhất với "Journey là gốc".

### Session cộng đồng v2 — post = cột mốc (2026-06-07)

- **L14 — Bỏ `content_thao_luan` / `_media` / `_filter_gan`.** Nhãn cộng đồng: bảng `cong_dong_filter` (rename) + junction `cong_dong_filter_gan` nối `content_cot_moc`. Thêm enum `che_do_hien_thi_moc_enum` giá trị `cong_dong`. Migration: `migration_cong_dong_v2_cot_moc.sql`.
  *Rủi ro canh*: index `(id_to_chuc, che_do_hien_thi)`; mọi query Journey public phải loại `cong_dong` qua helper `journey-visible-clause.ts`.

---

## Drift đã phát hiện & sửa (2026-06-07)

Đối chiếu DB thật vs instruction cũ — ghi lại để không lặp:

- **4 bảng `content_thao_luan*` đã thay bằng mô hình cột mốc (L14).** Code + migration v2.
- **Instruction §17 cũ ghi "cong_dong KHÔNG phải FB Group, không feed thảo luận"** — mâu thuẫn trực tiếp với L7b đã chốt ở chat v6. → đã sửa.
- **Header instruction nói "62 bảng", memory nói "~53"; DB thật = 67 bảng logic** (66 thường + 1 partitioned `social_luot_xem`; 2 partition con không tính logic). → SCHEMA.md sinh từ DB để khỏi lệch lần nữa.
- *Bài học*: prose schema chép tay luôn drift. SCHEMA.md phải generate từ `information_schema`, không sửa tay.
