# CINS — Creative Hub Vietnam

> **Canonical instruction for agents & developers** — file trong repo: `docs/CINS_INSTRUCTION.md`
> **Current version:** Schema **v7** (nguồn gốc: v6 + tag system mới) — **da_verify + keyword/phan_mem aggregation-only + tag tự do**
> **Cập nhật:** Khi có v8/v9/…, thay hoặc merge vào file này và đổi dòng *Current version* ở trên. Giữ § Implementation / ghi chú site nếu vẫn đúng.

# Project Instructions (Schema v7 — migration v2+v3+v4+co_author+ket_ban applied + tag system v7)

> Blog cá nhân tối ưu cho hình ảnh — với verified context mà không platform nào trong ngành creative VN có.

---

## ⚠️ Thay đổi lớn ở v7 (đọc trước)

1. **Tag system mới — keyword/phan_mem không còn là "bài viết để đọc".** `nghe` và `nganh_dao_tao` giữ nguyên trang prose đầy đủ. `keyword` và `phan_mem` chỉ có trang **aggregation** (danh sách người + tác phẩm) + `tom_tat` AI gen — không có nội dung dài, không xuất hiện trong navigation "Bài viết".
2. **Tag tự do — không chặn upfront.** User gõ tag mới → tạo thẳng `article_bai_viet` ngay (không qua `article_de_xuat`). AI gen `tom_tat` ngay lập tức từ tên tag. `article_de_xuat` chỉ còn áp dụng cho `nghe` và `nganh_dao_tao`.
3. **`da_verify BOOLEAN DEFAULT false` — field mới trên `article_bai_viet`.** Verified tag lên top autocomplete, chưa verified vẫn dùng được. Admin verify sau khi tag tự nhiên nổi lên — không classify upfront, không chặn.
4. **Alias dedup tự động.** Exact match (lowercase) → tra `article_alias` map về tag chính. AI fuzzy match → suggest confirm. Không cần admin duyệt dedup.
5. **Phân nhóm tag theo ngành nghề → defer.** Khi có đủ data mới làm.

---

## ⚠️ Thay đổi lớn ở v6 (giữ lại để tham khảo)

1. **Bỏ "anti-engagement" → "Engagement có context".** Like/reaction công khai, hiển thị mặc định (social proof thẩm mỹ). Cấu trúc xoay quanh entity (tag/nghề/trường/Gallery) **tự triệt tiêu viral** vì không có feed thuật toán toàn cục — không cần cấm like để chống viral.
2. **Bỏ follow-user hoàn toàn → thay bằng kết bạn (`user_ket_ban`).** Follow-user vô nghĩa khi không có feed. Kết bạn là quan hệ 2 chiều, phục vụ: danh sách bạn, bạn chung, tag co-author/dự án.
3. **`user_theo_doi` giữ lại** nhưng **chỉ cho follow tag/org** (subscribe nhận `social_thong_bao` khi có nội dung mới) — KHÔNG còn dùng cho user và KHÔNG còn là điều kiện tag co-author. *[cần duyệt: có giữ follow tag/org không?]*
4. **Loại tổ chức:** chỉ `truong_dai_hoc` cần CINS duyệt; `co_so_dao_tao` / `studio` / `doanh_nghiep` / `cong_dong` user tự tạo (CINS vẫn giữ `owner`, user được cấp `admin`). Xem §17.

---

## 1. Bản chất sản phẩm

CINS là creative hub cho ngành sáng tạo Việt Nam. Không phải job board, portfolio site, MXH viral, hay LMS.

Hai tầng core:
- **Journey** — blog cá nhân theo thời gian. Text / ảnh / video / link. Tích lũy suốt hành trình nghề nghiệp.
- **Gallery** — aggregated feed tối ưu visual. Tất cả tác phẩm public. Cửa ngõ vào Journey của người tạo ra.

**Journey là nơi tích lũy. Gallery là nơi khám phá.**

Kết nối giữa người dùng có chuyên môn là một giá trị cốt lõi (không phải thứ phải kìm hãm) — nhưng kết nối đi qua **entity và quan hệ thật** (tag / nghề / trường / kết bạn), không qua social graph kiểu follower hay feed thuật toán.

---

## 2. Triết lý sản phẩm

- **Engagement có context**: like/reaction tồn tại và hiển thị công khai (mặc định). Nhưng **KHÔNG feed thuật toán toàn cục, KHÔNG trending xuyên mạng, KHÔNG follower-user**. Discovery đi qua entity (tag/nghề/trường/Gallery) → ranking bị giới hạn trong context → viral tự triệt tiêu mà không cần cấm engagement.
- **Like là social proof thẩm mỹ**: "X người cũng thấy đẹp" = xác nhận sự đồng cảm, không phải vanity đua số. Hiển thị mặc định, không toggle ẩn.
- **Open model**: interaction (tuyển dụng, kết nối) xảy ra ở nơi khác. CINS verify và lưu kết quả.
- **Verify là moat**: mọi quyết định thiết kế phải bảo vệ tính xác thực của timeline.
- **Chat phải có context**: mọi chat đều gắn với dự án / lớp / sự kiện / 1-1. Không có group chat tự do.
- **Milestone không bao giờ tự sinh từ counter**: phải có xác nhận chủ động từ người có thẩm quyền.
- **Verified milestone bất tử**: khi org đóng cửa, milestone đã verify không mất giá trị.
- **Quan hệ theo người = kết bạn (2 chiều)**: phục vụ danh bạ nghề + bạn chung + tag co-author. Không có "theo dõi người" 1 chiều.
- **Tag là infrastructure, không phải content**: `keyword` và `phan_mem` không cần prose — giá trị nằm ở người và tác phẩm được gom dưới tag, không phải mô tả viết tay. AI gen `tom_tat` đủ.

---

## 3. Tech Stack

- **Frontend**: Next.js App Router
- **Database**: Supabase (Postgres) + pgvector cho vector(6) + HNSW index
- **Project**: ospzzzxcomrmhqrnkoiw.supabase.co
- **Storage**: Cloudflare Images (lưu cloudflare_id)
- **Realtime chat**: Supabase Realtime
- **Deploy**: Vercel

---

## 4. Naming Convention

- Tiền tố tiếng Anh: user_ / org_ / content_ / article_ / project_ / verify_ / social_ / chat_ / vector_ / edu_
- Tên bảng/field tiếng Việt không dấu: cot_moc, tac_pham, dong_gop, xac_nhan, ket_ban
- Timestamp fields: `tao_luc`, `cap_nhat_luc`, `xu_ly_luc` (không dùng created_at/updated_at trừ bảng mới từ migration v2/v3)

---

## 5. Schema — 62 bảng MVP + bảng linh_vuc riêng

### Bảng linh_vuc (bảng riêng, không thuộc nhóm article_)

Bảng danh mục lĩnh vực sáng tạo — tách riêng khỏi article_bai_viet vì cần quản lý UI (nhóm hiển thị, thứ tự, cover).

11 lĩnh vực hiện có, chia 3 nhóm: Sản xuất & Giải trí / Thiết kế thị giác / Thiết kế không gian & Sản phẩm.

Quan hệ: article_bai_viet.id_linh_vuc FK -> linh_vuc.id. Bắt buộc cho loại nghe.

---

### Nhóm user_ (8 bảng active + 1 dropped)

| Bảng | Vai trò |
|---|---|
| user_nguoi_dung | Profile chính. Fields đáng chú ý: `ai_summary_journey` (AI tự generate), `cho_phep_chat_an_danh`, `mxh_links` JSONB (default `[]`), `muc_tieu` là array enum. Auth qua Supabase auth.users. |
| user_thanh_vien_to_chuc | M-M user ↔ org. vai_tro dùng `vai_tro_to_chuc_enum`. Có `tu_ngay`/`den_ngay` date range, `nam_bat_dau` INT và `id_nganh` FK → article_bai_viet (loại nganh_dao_tao). UNIQUE (id_nguoi_dung, id_to_chuc, vai_tro). |
| **user_ket_ban** | **MỚI v6 — kết bạn 2 chiều.** Fields: `id_nguoi_gui`, `id_nguoi_nhan`, `trang_thai TEXT` (`pending`/`accepted`/`blocked`, default `pending`), `tao_luc`, `xu_ly_luc`. UNIQUE chuẩn hoá cặp (A-B = B-A, dùng `LEAST/GREATEST` hoặc check 2 chiều ở app). Điều kiện tag co-author. |
| user_theo_doi | **v6: chỉ còn follow tag(bai_viet)/org** để nhận `social_thong_bao` khi có nội dung mới. **KHÔNG còn follow user.** Không còn là điều kiện tag co-author (chuyển sang `user_ket_ban`). *[cần duyệt: giữ hay bỏ hẳn]* |
| user_linh_vuc | M-M user ↔ article_bai_viet. Có `id_linh_vuc` shortcut FK → linh_vuc. |
| user_nhom_boi_canh | Nhóm filter Journey. Fields: `ten_nhom`, `slug`, `icon`, `thu_tu`. |
| user_filter_journey | Ẩn/hiện cả nhóm milestone theo scope. Field `hien_thi` boolean. UNIQUE (id_nguoi_dung, id_nhom_boi_canh, ap_dung_cho). |
| user_hoc_vien_lop | Gán học viên vào khóa/lớp. UNIQUE (id_nguoi_dung, id_khoa_hoc). |
| user_tien_do_video | DROPPED — defer sang LMS/payment phase. |

---

### Nhóm org_ (16 bảng)

| Bảng | Vai trò |
|---|---|
| org_to_chuc | **Entity tổ chức chung — dùng cho cả 5 loại.** Có `logo_id` (cũ, backward compat) và `avatar_id` (dùng field này). Thêm `tinh_thanh tinh_thanh_vn_enum`. `loai_to_chuc loai_to_chuc_enum`, `trang_thai_tin_cay` (default `binh_thuong`). studio/doanh_nghiep/cong_dong sống thẳng trên bảng này, **không có extension table riêng** — field riêng nhỏ nhét JSONB, không đẻ bảng. |
| org_truong_dai_hoc | Extension 1-1 (chỉ `truong_dai_hoc`). Fields: ma_truong (Unique), ten_chinh_thuc, ten_tieng_anh, loai_truong enum, nam_thanh_lap, website, da_verify, hoc_phi_nam_tu/den, co_ktx, ktx_gia_thang. **CINS duyệt mới tạo được.** |
| org_co_so_dao_tao | Extension 1-1 (chỉ `co_so_dao_tao`). Fields: ma_co_so (Unique), ten_chinh_thuc, loai_co_so, giay_phep_dao_tao, da_verify. **User tạo được; `da_verify=false` mặc định, CINS xác nhận sau (như Sine Art).** |
| org_truong_nganh | M-M trường ↔ ngành. Có thêm: ten_chuong_trinh, he_dao_tao enum, thoi_gian_thang, slug (Unique), avatar_id, cover_id, `trang_thai_chuong_trinh` enum (`dang_tuyen` = hiển thị; `tam_dung` = ẩn khỏi trang, giữ dữ liệu liên quan). Gỡ ngành trên site → UPDATE `tam_dung`, không DELETE. |
| org_tuyen_sinh_nam | Tuyển sinh theo năm. Có `tinh_trang tinh_trang_tuyen_sinh_enum`, `link_thong_tin`, `ghi_chu`, 8 field ngày timeline, `so_thi_sinh INT` (nullable, điền sau kỳ thi). `ti_le_choi = so_thi_sinh / chi_tieu` tính app layer. UNIQUE (id_truong_nganh, nam). |
| org_phuong_thuc_xet_tuyen | Có `ten_phuong_thuc enum`, `chi_tieu_phuong_thuc`, `diem_chuan_phuong_thuc`, `thu_tu_uu_tien`, `tieu_chi JSONB`, `ap_dung_tat_ca_nganh`, `id_nganh_ap_dung UUID[]`, `id_cau_hinh_khoi FK` (legacy; ưu tiên lookup theo `org_cau_hinh_khoi.id_truong_nganh`). |
| org_cau_hinh_khoi | Cấu hình khối thi **per ngành** per năm. `id_truong_nganh FK` nullable — **NULL** = config chung toàn trường (fallback); **có giá trị** = khối riêng từng `org_truong_nganh`. `cac_mon JSONB` DEPRECATED. `id_module FK → edu_module_tinh_diem`. UNIQUE `(id_to_chuc, id_to_hop_mon, nam_ap_dung, COALESCE(id_truong_nganh, '00000000-…'))`. **Mỗi năm tuyển sinh cần bản ghi khối riêng** (`nam_ap_dung` = 2024, 2025, …). |
| org_hinh_anh | Gallery ảnh org. loai: khuon_vien/xuong/trien_lam/khac. **Dùng cho cả 5 loại org.** |
| org_bai_dang | Bài đăng org. `tieu_de NOT NULL`, `tom_tat`, `cover_id`, `trang_thai trang_thai_bai_dang_enum` (default nhap). **Dùng cho cả 5 loại org.** |
| org_bai_dang_tag | Junction M-M bài đăng ↔ article_bai_viet (tags). |
| org_khoa_hoc | Khóa học. Fields: ten_khoa_hoc, slug (Unique), avatar_id, cover_id, thoi_luong_buoi, hoc_phi, trinh_do_dau_vao enum. **Chỉ co_so_dao_tao.** |
| org_lop_hoc | Lớp. Fields: ma_lop, giao_vien_phu_trach FK, ngay_khai_giang, slot_toi_da. **Chỉ co_so_dao_tao.** |
| org_giao_trinh | Giáo trình. Fields: tieu_de, mo_ta_ngan, mo_ta_chi_tiet, thumbnail_id, video_gioi_thieu_url, visibility enum. **Chỉ co_so_dao_tao.** |
| org_su_kien | Sự kiện. Fields: bat_dau, ket_thuc (timestamptz), dia_diem, slot_toi_da. **Dùng cho cả 5 loại org.** |
| org_dang_ky_su_kien | Đăng ký sự kiện. UNIQUE (id_su_kien, id_nguoi_dung). |

---

### Nhóm edu_ (5 bảng)

| Bảng | Vai trò |
|---|---|
| edu_to_hop_mon | Danh mục khối thi chuẩn (H00, V00...). Có `cac_mon TEXT[]` — array cũ tham khảo, không tính điểm. |
| edu_to_hop_mon_chi_tiet | Cấu trúc slot của từng khối. `co_dinh=true`: môn cố định; `co_dinh=false`: slot trống, trường điền qua org_cau_hinh_mon. |
| edu_mon_thi | Danh mục môn thi. Fields: `ten`, `ma` (slug đề, vd. `hinh_hoa_chan_dung`), `loai` (`nang_khieu` / `van_hoa` / `ngoai_ngu`), `thumbnail_id` (Cloudflare Images id), `id_bai_viet` link content hub. **Placeholder thumbnail** (đã seed): `plh_nang_khieu` (9 môn), `plh_van_hoa` (8), `plh_ngoai_ngu` (6) — UI hiển thị gradient + chữ viết tắt; thay bằng UUID ảnh CF khi có asset thật. SQL: `supabase/sql/edu-mon-thi-thumbnail.sql`. Admin list/sửa: `lib/admin/mon-thi-server.ts`, `/admin/mon-thi`. |
| edu_module_tinh_diem | Template module tính điểm reusable. CINS tạo sẵn 4 module (H00/H02/V00/A00 chuẩn). |
| edu_module_mon | Môn trong template + hệ số mặc định. UNIQUE (id_module, so_thu_tu). |

### org_cau_hinh_mon (bảng riêng — nguồn duy nhất tính điểm)

Trường tự điền môn thật + hệ số **per khối** (`id_cau_hinh_khoi`). UNIQUE `(id_cau_hinh_khoi, id_mon_thi)`.

---

### Nhóm content_ (core 5 + thảo luận cộng đồng trên site)

| Bảng | Vai trò |
|---|---|
| content_cot_moc | SOURCE OF TRUTH. Field `thoi_diem DATE` (ngày xảy ra). Có FK context: id_du_an, id_su_kien, id_to_chuc, id_truong_nganh, id_lop_hoc, id_khoa_hoc. |
| content_tac_pham | Output sáng tạo. Có `cover_id` Cloudflare. **Site editor (migration 2026-05-26):** `slug` (kebab-case, unique per `id_nguoi_dung`, route `/{handle}/p/{slug}`), `noi_dung_blocks JSONB` (array Block `{id, loai, thu_tu, config}`), `noi_dung_html TEXT` (sanitize, scope `.article-rich-content`), `meta_title`, `meta_description`. |
| content_media | File media. Có `width`, `height`, `cloudflare_id` cho image dimensions. |
| content_tac_pham_thuoc_moc | M-M tác phẩm ↔ cột mốc. Có `thu_tu`. |
| content_tac_pham_tac_gia | M-M co-author. Fields: `vai_tro TEXT`, `trang_thai TEXT` (`pending`/`accepted`/`declined`, default `pending`), `la_chu_so_huu BOOLEAN` (owner row = TRUE, luôn accepted), `thu_tu SMALLINT`, `ghi_chu TEXT`, `xu_ly_luc TIMESTAMPTZ`. Migration: `supabase/sql/migration_co_author.sql`. |
| **content_thao_luan** | **Community discussion layer** — post thảo luận đa context (`loai_context` + `id_context`). v1: `cong_dong`. Fields: `nguoi_dang`, `tieu_de` nullable, `noi_dung`, `loai_post` (default `thao_luan`), `ghim`, `da_xoa` (soft delete). Migration: `supabase/sql/migration_cong_dong.sql` (+ `ALTER TYPE loai_doi_tuong_social_enum ADD VALUE 'thao_luan'`). |
| content_thao_luan_media | Junction post ↔ `content_media` (`thu_tu`). |
| **content_thao_luan_filter** | Nhãn taxonomy do admin cộng đồng định nghĩa (Reddit flair-style). Fields: `loai_context` + `id_context` (v1: `cong_dong` + `org_to_chuc.id`), `ten`, `slug`, `mau`, `icon` nullable, `thu_tu`. UNIQUE (`loai_context`, `id_context`, `slug`). **Lọc trên 1 feed chung** — không tách phòng. Migration: `supabase/sql/migration_cong_dong_filter.sql`. |
| content_thao_luan_filter_gan | Junction nhiều nhãn ↔ post (`id_thao_luan`, `id_filter`). |

---

### Nhóm article_ (9 bảng)

Quy tắc cốt lõi: Bài viết = Tag. Không có bảng tag riêng.

| Bảng | Vai trò |
|---|---|
| article_bai_viet | Mỗi tag IS 1 dòng. Fields: `tieu_de` (main, NOT NULL), `tieu_de_viet` (nullable, tag display), `tieu_de_eng`, `tom_tat`, `cover_id`, `thumbnail`, `luot_xem INT`, `meta_title`, `meta_description`. **v7: thêm `da_verify BOOLEAN DEFAULT false`** — verified tag ưu tiên top autocomplete; admin verify thủ công sau khi tag tự nhiên nổi lên. Supabase thực tế thêm: `slug`, `loai_bai_viet`, `noi_dung` (HTML; `keyword`/`phan_mem` = NULL mãi mãi), `main_video`, `meta` JSONB, `trang_thai_noi_dung`, `id_linh_vuc` FK, `tao_luc`, `cap_nhat_luc`. |
| article_nhom | Danh mục nhóm. loai_nhom: bo_phan/ky_thuat/nhom_nganh/cap_do. |
| article_gan_nhom | M-M bài viết ↔ nhóm. |
| article_gan_cot_moc | M-M tag ↔ cột mốc. Có `tao_luc`. |
| article_gan_tac_pham | M-M tag ↔ tác phẩm. Có `tao_luc`. |
| article_gan_du_an | M-M tag ↔ dự án. Có `tao_luc`. |
| article_lien_quan | Content graph. Field: `id_bai_viet_a`, `id_bai_viet_b`. Có `cap_do TEXT`. UNIQUE (a, b, loai_quan_he). |
| article_de_xuat | Cổng chặn — **v7: chỉ còn dùng cho `nghe` và `nganh_dao_tao`**. Field `context_de_xuat`. Có `ket_qua_phan_loai_ai JSONB`, `admin_review UUID FK`. |
| article_alias | Alias chống duplicate. Field `ten_alias`. |

---

### Nhóm project_ (2 bảng)

| Bảng | Vai trò |
|---|---|
| project_du_an | Owner XOR. Có slug (Unique), avatar_id, cover_id, bat_dau/ket_thuc date. |
| project_dong_gop | Verify đóng góp. Có `nguoi_duyet UUID FK`, `xu_ly_luc`. UNIQUE (id_du_an, id_nguoi_dung). |

---

### Nhóm verify_ (4 bảng)

| Bảng | Vai trò |
|---|---|
| verify_xac_nhan | Verify cột mốc. Có `email_external`, `url_proof`, `bang_chung`, `xu_ly_luc`. |
| verify_yeu_cau | Flow pull. Có `nguoi_yeu_cau`, `nguoi_xu_ly`, `xu_ly_luc`. |
| verify_tham_du_su_kien | Tham dự sự kiện. FK trực tiếp vào `id_su_kien` + `id_nguoi_dung`. Có `bang_chung`, `thoi_diem_xac_nhan`. UNIQUE (id_su_kien, id_nguoi_dung). |
| verify_email_token | Token freelancer. Fields: `token_hash` (Unique), `email_nhan`, `het_han_luc`, `da_claim_luc`, `ip_claim`. |

---

### Nhóm social_ (5 bảng)

| Bảng | Vai trò |
|---|---|
| social_binh_luan | Comment. FK field `nguoi_binh_luan`. Có `id_cha` (reply), `da_xoa` (soft delete). |
| social_reaction | Emoji reaction / like. UNIQUE (id_nguoi_dung, loai_doi_tuong, id_doi_tuong, emoji). **v6: count hiển thị công khai mặc định (social proof).** |
| social_luu | Bookmark. UNIQUE (id_nguoi_dung, loai_doi_tuong, id_doi_tuong). |
| social_luot_xem | Log lượt xem — partition theo tháng. Có `da_xu_ly_hint BOOLEAN`. |
| social_thong_bao | Notification. FK field `nguoi_nhan`. Có `noi_dung_ai`, `loai_doi_tuong TEXT`, `id_doi_tuong UUID`. **Dùng cho: kết bạn (lời mời), co-author tag, follow tag/org có nội dung mới.** |

---

### Nhóm chat_ (5 bảng)

| Bảng | Vai trò |
|---|---|
| chat_phong | 6 loại. Dùng `loai_context TEXT` + `id_context UUID`. Có `id_org_dai_dien FK`. |
| chat_thanh_vien | Có `tham_gia_luc`, `roi_luc`. UNIQUE (id_phong, id_nguoi_dung). |
| chat_tin_nhan | Field `loai_tin`. Có `id_dinh_kem FK → content_media`, `id_tin_tra_loi` (reply), `da_xoa`. |
| chat_da_doc | Field `id_tin_nhan_cuoi_doc`. PK (id_phong, id_nguoi_dung). |
| chat_chan | Có `id_nguoi_bi_chan` nullable (null = block all). |

---

### Nhóm vector_ (3 bảng)

| Bảng | Vai trò |
|---|---|
| vector_co_dinh | Content tĩnh. Fields: `phien_ban_quy_uoc`, `prompt_hash`, `tinh_luc`. UNIQUE (loai_doi_tuong, id_doi_tuong). |
| vector_dong | User và org. Fields: `do_tin_cay`, `so_data_point`, `cap_nhat_cuoi`, `cap_nhat_tiep`. UNIQUE (loai_doi_tuong, id_doi_tuong). |
| vector_hang_doi | Background job queue. Fields: `loai_vector enum`, `uu_tien`, `so_lan_thu`, `loi`, `bat_dau_xu_ly_luc`, `hoan_thanh_luc`. |

---

## 6. Quy tắc kiến trúc cốt lõi

1. Mọi thứ trên Journey = 1 dòng content_cot_moc — source of truth thống nhất.
2. Milestone không bao giờ tự sinh từ counter — phải có xác nhận chủ động.
3. Verified milestone không xóa khi org đóng cửa — chỉ thay đổi UI badge.
4. Engagement và level chuyên môn tính realtime từ activity, không lưu field cố định. **Like count cũng tính realtime từ `social_reaction`.**
5. Bài viết = Tag — không duplicate hệ thống tag và content.
6. che_do_hien_thi milestone: ẩn khi 1 trong 2 lớp (milestone hoặc nhóm) bảo ẩn.
7. **article_de_xuat là cổng chặn — chỉ áp dụng cho `nghe` và `nganh_dao_tao`.** `keyword` và `phan_mem` tạo thẳng `article_bai_viet` không qua cổng chặn, AI gen `tom_tat` ngay.
8. org_truong_nganh.id_nganh FK → article_bai_viet (loại nganh_dao_tao).
9. Nhóm phân loại tách bảng riêng — article_nhom + article_gan_nhom. Không lưu nhom trong meta JSONB.
10. article_bai_viet.id_linh_vuc FK → linh_vuc.id — bắt buộc cho bài loại nghe.
11. org_cau_hinh_mon là nguồn duy nhất tính điểm — không đọc từ edu_module_mon, không hardcode frontend.
12. Timeline tuyển sinh: `tinh_trang` enum cho display, các field ngày cho logic chi tiết ở app layer.
13. **CINS giữ vai_tro = owner cho mọi org** (kể cả org user tự tạo). Trường ĐH chỉ được cấp admin. Owner không giao cho org. User tạo org → được cấp `admin`.
14. edu_to_hop_mon.cac_mon TEXT[] là field cũ tham khảo — slot cụ thể dùng edu_to_hop_mon_chi_tiet.
15. org_to_chuc.logo_id là field cũ backward compat — dùng avatar_id cho code mới.
16. `org_cau_hinh_khoi.id_truong_nganh` nullable — NULL = fallback toàn trường; có giá trị = config per ngành. Calculator lookup theo ngành trước, fallback NULL sau.
17. `edu_mon_thi` phân biệt đề cụ thể — không gộp chung khi trường tách đề.
18. `org_tuyen_sinh_nam.so_thi_sinh` — điền sau kỳ thi; `ti_le_choi` tính app layer.
19. **Tag co-author chỉ cho phép giữa người đã kết bạn** (`user_ket_ban.trang_thai='accepted'`). Check ở app layer trước khi INSERT `content_tac_pham_tac_gia`. *(v6: đổi từ "mutual follow" → "kết bạn")*
20. Tag co-author cần consent: row `trang_thai=pending` → B nhận `social_thong_bao` → accept mới hiện trên Journey B. Owner row (`la_chu_so_huu=TRUE`) luôn `accepted`.
21. Journey người được tag: query `content_cot_moc` gốc (của A) qua join `tac_pham_thuoc_moc → tac_pham_tac_gia WHERE id_nguoi_dung=B AND trang_thai=accepted`. Không clone `content_cot_moc`. `che_do_hien_thi=chi_minh` không đẩy sang Journey B dù đã accepted.
22. **Engagement có context**: KHÔNG có feed thuật toán toàn cục / trending xuyên mạng. Discovery qua entity. Like/reaction hiển thị trong context của entity, không phải nhiên liệu ranking toàn mạng.
23. **Quan hệ theo người = kết bạn 2 chiều** (`user_ket_ban`). Không có follow-user 1 chiều. Bạn chung tính realtime (`bạn(A) ∩ bạn(B)`), không lưu field.
24. **Tạo org**: chỉ `truong_dai_hoc` cần CINS duyệt; 4 loại còn lại user tạo ngay (xem §17).
25. **`keyword` và `phan_mem` không có trang prose.** Trang detail của 2 loại này chỉ render: `tom_tat` (AI gen) + danh sách người + danh sách tác phẩm. Không xuất hiện trong navigation "Bài viết". `noi_dung` = NULL mãi mãi.
26. **`da_verify` không phải gatekeeping.** Tag chưa verify vẫn tồn tại, vẫn dùng được. `da_verify=true` chỉ ưu tiên trong autocomplete — lọc nhiễu bằng UX, không bằng chặn.
27. **AI gen `tom_tat` tag mới từ tên tag** — không đợi đủ data mới gen. Regen tự động khi `so_data_point` tăng đáng kể. Pattern dùng `vector_dong` để track (`cap_nhat_cuoi`, `cap_nhat_tiep`, `so_data_point`).

---

## 7. Các ENUM quan trọng

```
vai_tro_to_chuc_enum    : owner / admin / quan_ly_tuyen_sinh / quan_ly_noi_dung / giao_vien / nhan_vien / hoc_vien / thanh_vien
loai_moc_enum           : hoc / lam_viec / du_an / su_kien / thanh_tuu / ca_nhan
nguon_goc_moc_enum      : tu_tao / sinh_tu_du_an / sinh_tu_su_kien / sinh_tu_org_assign / sinh_tu_hoc_vien_lop
che_do_hien_thi_moc_enum: feature / public / theo_nhom / chi_minh
loai_bai_viet_enum      : linh_vuc / nghe / keyword / phan_mem / mon_hoc / blog / event / nganh_dao_tao
trang_thai_noi_dung_enum: cho_review / dang_viet / published / archived / merged
loai_to_chuc_enum       : truong_dai_hoc / co_so_dao_tao / studio / doanh_nghiep / cong_dong
trang_thai_tin_cay_enum : binh_thuong / dang_review / bi_canh_bao / bi_cam / verified_official
loai_truong_enum        : cong_lap / tu_thuc / dan_lap / co_von_nuoc_ngoai
loai_mo_hinh_khoa_enum  : cohort_co_dinh / lien_tuc_theo_thang
loai_su_kien_enum       : workshop / talkshow / trien_lam / contest / meetup / khoa_dao_tao_ngan / tour_cong_ty / tour_truong / open_day / screening / hackathon / career_fair
loai_phong_chat_enum    : 1_1 / 1_1_an_danh / 1_org / du_an / lop_hoc / su_kien
loai_chan_enum          : cu_the / tat_ca_an_danh / tat_ca_la / org_cu_the
loai_nguoi_xac_nhan_enum: to_chuc / nguoi_dung / external_email / system_url
giai_doan_enum          : moi_bat_dau / dang_hoc / dang_lam / tim_viec / freelance / dang_day
visibility_field_enum   : public / friends / private     (user_nguoi_dung.visibility_*)
tinh_thanh_vn_enum      : 34 đơn vị (sáp nhập 2025). LƯU Ý value TP.HCM là `hcm` (KHÔNG phải `ho_chi_minh`).
                          ha_noi · hue · hai_phong · da_nang · hcm · can_tho · cao_bang · lang_son · quang_ninh ·
                          dien_bien · lai_chau · son_la · nghe_an · ha_tinh · thanh_hoa · tuyen_quang · lao_cai ·
                          thai_nguyen · phu_tho · bac_ninh · hung_yen · ninh_binh · quang_tri · quang_ngai · gia_lai ·
                          khanh_hoa · dak_lak · lam_dong · dong_nai · tay_ninh · vinh_long · dong_thap · an_giang · ca_mau
ten_phuong_thuc_enum    : xet_diem_thi_thpt / xet_hoc_ba / danh_gia_nang_luc / xet_tuyen_thang / nang_khieu / phong_van / danh_gia_tu_duy / thi_van_hoa_rieng / nang_khieu_ket_hop / chung_chi_sat / chung_chi_act / chung_chi_ib / bang_nuoc_ngoai / v_sat / ket_hop
tinh_trang_tuyen_sinh_enum: sap_mo / dang_mo / da_dong / co_ket_qua
trang_thai_bai_dang_enum: nhap / da_dang
trang_thai_chuong_trinh_enum: dang_tuyen / tam_dung
loai_nhom_enum          : bo_phan / ky_thuat / nhom_nganh / cap_do
trang_thai_ket_ban      : pending / accepted / blocked   (v6 — dùng TEXT, không enum cứng, giống co_author)
```

---

## 8. article_bai_viet — meta JSONB theo loại

```
nghe          : null
nganh_dao_tao : { "ma_nganh": TEXT, "khoi_thi": TEXT[], "thoi_gian_nam": INT }
phan_mem      : { "nha_phat_hanh": TEXT, "version": TEXT, "platform": TEXT[], "website": TEXT }
mon_hoc       : null  keyword: null  linh_vuc: null  blog: null  event: null
```

Video lưu riêng tại field `main_video TEXT`. Nhóm phân loại KHÔNG lưu trong meta — dùng article_gan_nhom.

---

## 9. article_nhom — Nhóm phân loại

| loai_nhom | Dùng cho | Slug pattern |
|---|---|---|
| bo_phan | nghe | nghe-{linh-vuc}-{ten-bo-phan} |
| ky_thuat | keyword, phan_mem, mon_hoc, nghe | kt-{ten-ky-thuat} |
| nhom_nganh | nganh_dao_tao | nn-{ten-nhom} |
| cap_do | keyword, phan_mem, mon_hoc | cd-{cap-do} |

Quy tắc gán nhóm cho bài nghe: ít nhất 1 bo_phan + 1-2 ky_thuat.

**v7:** Phân nhóm tag `keyword`/`phan_mem` theo ngành nghề → defer đến khi có đủ data thực tế.

---

## 10. org_cau_hinh_khoi + org_cau_hinh_mon — Module tính điểm

**Flow:**
```
Trường chọn template (edu_module_tinh_diem)
    → pre-fill org_cau_hinh_mon từ edu_module_mon (tham khảo)
    → trường điền môn thật (edu_mon_thi) + hệ số per ngành
    → lưu org_cau_hinh_khoi (id_truong_nganh) + org_cau_hinh_mon
```

**Lookup config (app / DB):**
```
1. org_cau_hinh_khoi WHERE id_to_chuc = X AND nam_ap_dung = Z AND id_truong_nganh = N
2. Nếu không có môn / không có dòng → fallback: id_truong_nganh IS NULL (khối chung trường, cùng năm Z)
```

**Công thức tính điểm (app layer):**
```
diem = Σ(nhap_i × he_so_i) / Σ(thang_diem_i × he_so_i) × quy_ve_thang
     + diem_uu_tien (nếu co_diem_uu_tien = true, ≤3đ với thang 30)
     + diem_thuong  (nếu co_diem_thuong = true, ≤10% thang)
```

**API (schema):** `GET /api/truong/:id/cau-hinh-tinh-diem?id_truong_nganh=X&nam=Y`
**API (repo cins-website):** query param `nganh` = `org_truong_nganh.id` (không phải `article_bai_viet.id`).

**Ví dụ MTS 2024:**
- Hội họa / Đồ họa: Ngữ văn ×1 + Hình họa toàn thân ×2 + Bố cục tranh màu ×1
- Điêu khắc: Ngữ văn ×1 + Tượng tròn ×2 + Bố cục chạm nổi ×1
- Thiết kế đồ họa: Ngữ văn ×1 + Hình họa chân dung ×2 + Trang trí màu ×1

**Lỗi thường gặp — năm mới trống trên UI:** chỉ có khối `id_truong_nganh IS NULL` → trả môn generic. Query chẩn đoán trả 0 dòng khi join id_truong_nganh per năm → chưa seed per-ngành. Chạy seed SQL per-năm (§15).

---

## 11. Admin — Phân quyền 2 lớp

**CINS admin (`/admin`)** — chỉ CINS internal: duyệt org (gồm duyệt đề xuất `truong_dai_hoc`, verify `co_so_dao_tao`), seed ngành, `edu_*`, analytics, **verify tag (`da_verify`)**.

**Org admin (inline trên trang org)** — staff org: cover/avatar, `org_bai_dang`, `org_hinh_anh`, `org_su_kien`, (trường) `org_tuyen_sinh_nam`, invite `user_thanh_vien_to_chuc`.

Check: `user_thanh_vien_to_chuc.vai_tro IN ('admin', 'quan_ly_noi_dung', 'quan_ly_tuyen_sinh')`.

---

## 12. Nhóm tương lai (không trong MVP)

- payment_ (5 bảng) — khi org bán khóa học, sự kiện thu phí, subscription
- api_ (4 bảng) — public API cho developer
- ad_ (8 bảng) — sponsored content
- Video on demand + LMS đầy đủ — defer cùng payment phase
- **Community discussion layer** — *(v7 product: TBD mở rộng)* Ghi nhận đóng góp bằng **uy tín chuyên môn / verified hữu ích**, không phải đếm like ẩn danh; vẫn không có feed thuật toán toàn cục. **Site đã có bản v1 scoped:** `content_thao_luan` + `/cong-dong/[slug]` (xem §15).
- **Phân nhóm tag theo ngành nghề** — defer đến khi có đủ data thực tế từ user tagging.
- ~~`user_ket_ban`~~ — **đã kích hoạt ở v6**, không còn defer.

---

## 13. Implementation Notes

- user_nguoi_dung.auth_user_id link với auth.users — cần trigger handle_new_user().
- social_luot_xem partition theo tháng — cron tạo partition mới. Field `da_xu_ly_hint` để batch AI viewer hint.
- Vector queue cần worker background — Supabase Edge Functions.
- RLS chưa apply trong schema cơ bản — phải làm trước khi public.
- Weight xác nhận tính ở app layer từ loai_nguoi_xac_nhan.
- article_de_xuat: user gắn tag tạm dạng text string, admin publish mới convert thành FK. **Chỉ dùng cho `nghe` và `nganh_dao_tao`.**
- Render HTML bài nghe: dangerouslySetInnerHTML với CSS scope `.article-rich-content`.
- Timeline tuyển sinh: `tinh_trang` enum cho display tab; status chi tiết tính từ field ngày.
- Stat bar trang trường: diem_chuan = MAX | chi_tieu = SUM | journey_count = COUNT DISTINCT user_thanh_vien_to_chuc.
- RLS phân quyền org: admin + quan_ly_tuyen_sinh → tuyển sinh; admin + quan_ly_noi_dung → bài đăng/hình ảnh; admin → UPDATE org_to_chuc (cover, avatar); owner (CINS) → không giới hạn.
- content_cot_moc.thoi_diem là ngày xảy ra (DATE), tao_luc là ngày tạo record.
- `edu_mon_thi.thumbnail_id`: `plh_*` = placeholder UI; UUID/id CF = ảnh thật. Helper: `lib/truong/mon-thi-thumbnail.ts`, component `MonThiThumb`.
- `org_truong_nganh`: «Gỡ ngành» → `trang_thai_chuong_trinh = tam_dung` (DELETE API thực chất là ẩn).
- `content_tac_pham_tac_gia`: owner row INSERT cùng transaction với tác phẩm; tagged row INSERT sau, trigger `social_thong_bao` cho người được tag.
- social_binh_luan hỗ trợ reply qua `id_cha` và soft delete qua `da_xoa`.
- chat_tin_nhan hỗ trợ reply qua `id_tin_tra_loi` và soft delete qua `da_xoa`.
- Viewer hint notification: batch cuối ngày, filter `da_xu_ly_hint = false` SQL trước rồi mới gọi AI.

### Engagement (v6)

- **Like count**: tính realtime từ `social_reaction`, hiển thị công khai mặc định. Không có field cache, không có toggle ẩn per-tác-phẩm.
- **Sort** trong trang tag/nghề/Gallery: nhiều phương án — **mặc định `moi_nhat`** (thời gian đăng) | `a_z` (alphabet) | `nhieu_tuong_tac` (theo engagement). Sort theo engagement OK vì bị giới hạn trong context entity (không phải ranking toàn mạng → không viral).
- **KHÔNG** có feed thuật toán toàn cục, KHÔNG trending xuyên mạng, KHÔNG đề xuất nội dung dựa social graph.

### Kết bạn (v6)

- `user_ket_ban`: gửi lời mời (`pending`) → người nhận `social_thong_bao` → accept (`accepted`) / decline (xoá hoặc giữ record) / block (`blocked`). Chuẩn hoá cặp để A-B = B-A (LEAST/GREATEST id hoặc check 2 chiều).
- **Kết bạn dùng cho**: (1) danh sách bạn — danh bạ nghề, vào xem lại; (2) bạn chung — tính realtime `bạn(A) ∩ bạn(B)`, hiển thị "X bạn chung" làm social proof quan hệ; (3) **điều kiện tag co-author/dự án**.
- Co-author check: `isFriend(A, B)` — `SELECT 1 FROM user_ket_ban WHERE cặp(A,B) AND trang_thai='accepted'`. Chặn ở API layer trước khi INSERT.
- Discovery KHÔNG đi qua kết bạn — vẫn qua tag/nghề/trường/Gallery. Kết bạn chỉ **mở khoá hành động giữa 2 người** (cùng làm, chia sẻ riêng nếu có).
- *[cần duyệt: chat 1-1 có gate bằng kết bạn không? Hiện giữ nguyên logic chat cũ — chưa gate.]*

### Follow tag/org (v6 — thu hẹp)

- `user_theo_doi` **chỉ còn** follow `bai_viet` (tag) và `org` để nhận `social_thong_bao` khi có nội dung/cập nhật mới. KHÔNG còn follow user. KHÔNG còn là điều kiện tag co-author.
- *[cần duyệt: giữ follow tag/org hay bỏ hẳn `user_theo_doi`?]*

### Tag system (v7)

**Phân loại theo hành vi — không phải theo chủ đề:**

| Loại | Trang | Nội dung | Qua article_de_xuat? |
|---|---|---|---|
| `nghe` | Bài viết đầy đủ | Prose dài, ai_summary, section nghề | Có |
| `nganh_dao_tao` | Bài viết đầy đủ | Prose dài, thông tin ngành | Có |
| `keyword` | Aggregation only | `tom_tat` AI gen + người + tác phẩm | **Không** |
| `phan_mem` | Aggregation only | `tom_tat` AI gen + người + tác phẩm | **Không** |

**Flow tag mới (`keyword`/`phan_mem`):**
```
User gõ tag trong milestone/tác phẩm
  → Autocomplete: da_verify=true lên top, unverified bên dưới
  → Không khớp → user tạo mới
  → Dedup: lowercase match → article_alias → map về tag chính (tự động)
  → Không có alias → tạo article_bai_viet mới (loai=keyword/phan_mem)
  → AI gen tom_tat ngay từ tên tag
  → da_verify=false (chưa verify)
  → Admin verify sau khi tag tự nhiên nổi lên
```

**Dedup:**
- Lớp 1 — Exact lowercase: `figma` = `Figma` → tra `article_alias` → map tự động, không cần confirm.
- Lớp 2 — AI fuzzy: `Adobe Figma` → suggest "Bạn muốn tag Figma?" → user confirm.
- Keyword cùng tên nhưng khác ngành (hiếm) → thêm qualifier vào tên: `Ánh sáng — Nhiếp ảnh` / `Ánh sáng — Nội thất`. Link 2 tag qua `article_lien_quan`.

**`tom_tat` AI gen:**
- Gen ngay khi tag mới tạo, từ tên tag + context ngành sáng tạo VN.
- Regen tự động khi `so_data_point` (số người/tác phẩm tagged) tăng đáng kể — pattern `vector_dong`.
- Không regen mỗi lần page view.

**`da_verify` — không phải gatekeeping:**
- `false` = tag chưa verify, vẫn tồn tại, vẫn dùng được bình thường.
- `true` = admin đã xác nhận đây là thuật ngữ nghề nghiệp hợp lệ → ưu tiên top autocomplete.
- Admin verify thủ công từ `/admin` sau khi tag tự nhiên nổi lên — chi phí thấp.
- Migration: `supabase/sql/migration_da_verify_tag.sql` — `ALTER TABLE article_bai_viet ADD COLUMN da_verify BOOLEAN NOT NULL DEFAULT false`.

**Trang aggregation `keyword`/`phan_mem`:**
```
[Tên tag]          ← tieu_de
[tom_tat AI gen]   ← 1-2 câu
─────────────────
Người dùng tagged  ← query article_gan_cot_moc + người
Tác phẩm tagged    ← query article_gan_tac_pham
```
Không có section "Bài viết", không có rich text, không có cover editorial.

---

## 14. Seed Strategy

Sine Art là partner đầu tiên (`co_so_dao_tao`, `da_verify` do CINS xác nhận):
- ~520 học sinh = first users có Journey thật ngay từ ngày đầu
- Mô hình lien_tuc_theo_thang
- Model proven → nhân rộng ra trường ĐH và công ty

Pre-launch checklist:
- 10-20 Journey thật với creative từ Sine Art
- Tú là Journey số 1, public hoàn toàn
- 20-30 bài article live
- AI auto-tag cơ bản
- Seed edu_to_hop_mon_chi_tiet cho H00/H02/V00/V01 (cần UUID thật)
- Seed edu_module_mon cho 4 module template (cần UUID thật)
- `migration_co_author.sql` + **`migration_ket_ban.sql`** — chạy trước khi seed Journey có co-author
- **`migration_da_verify_tag.sql`** — chạy trước khi launch tag system v7

3 trường ĐH đã seed (MTS, MHI, MMA): ngành, tuyển sinh, cấu hình tính điểm per-ngành MTS 2024. Năm 2025 cần seed riêng.

---

## 15. Implementation — cins-website (Next.js)

**Map chi tiết trường:** [`docs/cursor_map_truong.md`](./cursor_map_truong.md)

| Thành phần | Ghi chú |
|---|---|
| Route trường | `/truong-dai-hoc/[slug]` — layout v6 (`tdh-page--v6`) |
| Route Journey | `/{slug}` timeline · `/{slug}/p/{postSlug}` bài viết · `/{slug}/p/new` tạo (cần login) |
| Hub công khai | `/`, `/nganh-hoc`, `/nghe-nghiep`, `/truong-dai-hoc`, `/bai-viet`, … |
| **Cộng đồng** | `/cong-dong` (listing) · `/cong-dong/tao` · `/cong-dong/[slug]` (feed) · `POST /api/to-chuc` · `POST/DELETE /api/cong-dong/:id/tham-gia` · `GET/POST /api/cong-dong/:id/posts` (`?filter=slug` lọc nhãn; POST `filter_ids[]`) · `GET/POST/PATCH/DELETE /api/cong-dong/:id/filters` (admin nhãn) · comment `…/posts/:postId/comments` · reaction `loai_doi_tuong=thao_luan` |
| API tính điểm | `GET /api/truong/{org_to_chuc.id}/cau-hinh-tinh-diem?nam=&nganh=` — `nganh`=`org_truong_nganh.id`; `PUT` lưu `org_cau_hinh_mon` |
| API catalog môn | `GET /api/truong/{id}/mon-thi-catalog` — `id, ten, loai, ma, thumbnail_id` |
| API ngành CRUD | `POST/GET …/nganh`, `DELETE …/nganh/{programId}` → ẩn (`tam_dung`) |
| **API kết bạn** *(v6, thay /api/follow user)* | `POST /api/ket-ban` (gửi lời mời) · `PATCH /api/ket-ban/:id` (accept/decline) · `DELETE /api/ket-ban/:id` (huỷ/unfriend) · `POST /api/ket-ban/:id/block` · `GET /api/ket-ban/status?id_nguoi=` → `{ trang_thai }` · `GET /api/ket-ban/chung?id_nguoi=` → bạn chung |
| **API follow tag/org** *(thu hẹp)* | `POST/DELETE /api/follow` — body `{ id_doi_tuong, loai_doi_tuong }` với `loai_doi_tuong ∈ {bai_viet, org}` only |
| API co-author | `POST /api/tac-pham/:id/tac-gia` — **validate `isFriend` trước** (đổi từ mutual follow); `PATCH …/:nguoi_dung_id` accept/decline; `DELETE …/:nguoi_dung_id` |
| **API tag v7** | `POST /api/tag` — tạo tag mới (keyword/phan_mem), AI gen tom_tat, skip article_de_xuat · `GET /api/tag/autocomplete?q=` — trả `da_verify=true` trước · `POST /api/tag/dedup` — fuzzy suggest |
| Query server | `lib/truong/queries.ts` → `loadCauHinhKhoiRow`: khối per-ngành trước; join `edu_mon_thi` qua `fetchMonCatalog` trong `cau-hinh-tinh-diem.ts` |
| **lib tag v7** | `lib/tag/create.ts` — `createTag(ten, loai)` → INSERT article_bai_viet + trigger AI gen tom_tat · `lib/tag/dedup.ts` — exact lowercase match → alias lookup; fuzzy → AI suggest |
| **lib kết bạn** *(v6)* | `lib/social/ket-ban.ts` — `isFriend(A,B)`, `mutualFriends(A,B)`, `sendFriendRequest`, `acceptFriendRequest`, `unfriend`, `blockUser`. *(thay `lib/social/follow.ts → isMutualFollow`)* |
| UI môn thi tab Ngành | `TruongNganhMonThiDauVao` — lưới ≤3 cột; modal `TruongNganhMonThiEditModal` |
| SQL thumbnail môn | `supabase/sql/edu-mon-thi-thumbnail.sql` — đã chạy |
| SQL co-author | `supabase/sql/migration_co_author.sql` — đã chạy |
| **SQL kết bạn** *(v6)* | `supabase/sql/migration_ket_ban.sql` — CREATE `user_ket_ban` + index cặp chuẩn hoá + RLS |
| **SQL da_verify tag** *(v7, mới)* | `supabase/sql/migration_da_verify_tag.sql` — `ALTER TABLE article_bai_viet ADD COLUMN da_verify BOOLEAN NOT NULL DEFAULT false` + index. **Cần viết & chạy.** |

### Journey & auth (site hiện tại)

| Quy tắc | Ghi chú |
|---|---|
| Xem công khai | Journey, timeline, bài viết, Gallery tab — **không** redirect `/login` |
| Tương tác | Like / bookmark / bình luận → modal đăng nhập nếu chưa session (`AuthGateProvider` trên `app/[slug]/layout`) |
| OAuth | Google PKCE — `app/auth/callback/route.ts`; cookie `cins-oauth-intent`, `cins-oauth-return` |
| Protected | `/onboarding`, `/admin`, `/{slug}/p/new`, `/{slug}/p/.../edit` |
| Dev OAuth | `NEXT_PUBLIC_SITE_URL=http://localhost:3001`; Supabase Redirect URLs `http://localhost:3001/auth/callback` |
| Co-author trên Journey | Tagged/bookmark: `che_do_hien_thi_journey` trên `content_tac_pham_tac_gia` / `social_luu` — user tự đặt Nổi bật trên timeline của mình, không sửa `content_cot_moc` gốc. Migration: `supabase/sql/migration_journey_foreign_visibility.sql` |
| Like count | Hiển thị công khai mặc định trên card/post (`attachSocialState`, `PostActionsRail`) — không anti-engagement |

**SQL grant (chạy trên Supabase):**
1. `supabase/sql/org-truong-grant-anon-read.sql`
2. `supabase/sql/org-truong-public-read-extended.sql`
3. `supabase/sql/org-truong-grant-cau-hinh-tinh-diem.sql` — kiểm tra `mon_anon_*_dk = 3` dưới `SET ROLE anon`

**SQL seed MTS — cấu hình tính điểm (theo thứ tự):**

| File | Mục đích |
|---|---|
| `org-truong-seed-cau-hinh-mon-mts-h00-2024.sql` | Khối chung H00 2024 + môn fallback |
| `org-truong-seed-cau-hinh-mon-mts-per-nganh-2024.sql` | 4 ngành × 3 môn, 2024 |
| `org-truong-fix-mon-mts-2025.sql` | Tạo khối 2025 per-ngành + môn |
| `org-truong-sync-cau-hinh-mts-active-nganh.sql` | Copy khối/môn → UUID đang hiển thị |
| `org-truong-dedupe-khoi-2025.sql` | Xoá khối 2025 trùng/rỗng (tuỳ chọn) |
| `edu-mon-thi-thumbnail.sql` | Cột thumbnail_id + seed plh_* |
| `migration_co_author.sql` | ALTER content_tac_pham_tac_gia |
| **`migration_ket_ban.sql`** | **CREATE user_ket_ban (v6)** |
| **`migration_da_verify_tag.sql`** | **ADD da_verify BOOLEAN (v7)** |
| **`migration_journey_foreign_visibility.sql`** | **ADD che_do_hien_thi_journey (site — tagged/Lưu về)** |

**Sau khi chạy `edu-mon-thi-thumbnail.sql`**, bật đọc cột từ DB trong:
- `lib/truong/cau-hinh-tinh-diem.ts` → `fetchMonCatalog`: `.select("id, ten, loai, ma, thumbnail_id")`
- `app/api/truong/[id]/mon-thi-catalog/route.ts` — cùng select

**Kiểm tra seed thumbnail:**
```sql
SELECT loai, thumbnail_id, count(*) AS so_mon
FROM public.edu_mon_thi
GROUP BY loai, thumbnail_id
ORDER BY loai;
-- Kỳ vọng: nang_khieu/plh_nang_khieu (9), van_hoa/plh_van_hoa (8), ngoai_ngu/plh_ngoai_ngu (6)
```

**Chẩn đoán nhanh khối 2025:**
```sql
SELECT tn.slug, k.id, count(m.id) AS so_mon
FROM org_cau_hinh_khoi k
JOIN org_truong_nganh tn ON tn.id = k.id_truong_nganh
LEFT JOIN org_cau_hinh_mon m ON m.id_cau_hinh_khoi = k.id
WHERE k.id_to_chuc = 'a1000000-0000-0000-0000-000000000001'
  AND k.nam_ap_dung = 2025
GROUP BY tn.slug, k.id;
```
0 dòng → chạy `org-truong-fix-mon-mts-2025.sql`.

---

## 16. Quy ước làm việc

- Làm việc bằng tiếng Việt.
- Field/bảng tiếng Việt không dấu với tiền tố tiếng Anh.
- "Khoan sửa" → defer, gom thay đổi lại sửa cuối.
- "Sao cũng được" → tự quyết hợp lý, không hỏi lại.
- Push back khi AI over-engineer hoặc sai semantic.
- Câu trả lời ngắn gọn, không giải thích dài dòng.

---

## 17. Tạo tổ chức & loại org (v6)

5 giá trị `loai_to_chuc_enum`, chia 2 nhóm theo cách tạo:

### Nhóm A — User tạo ngay (user → cấp `admin`, CINS giữ `owner`)

| Loại | Ai mở | Extension table | Tab nghiệp vụ riêng |
|---|---|---|---|
| `co_so_dao_tao` | Freelancer mở lớp, trung tâm nhỏ (Sine Art-style) | `org_co_so_dao_tao` (1-1) | Khóa học · Lớp · Giáo trình · Học viên |
| `studio` | Studio / team sáng tạo nhỏ | — (sống trên org_to_chuc) | Dự án · Tác phẩm |
| `doanh_nghiep` | Công ty / agency có pháp nhân | — | Dự án (+ verify kinh nghiệm làm việc của member) |
| `cong_dong` | Cộng đồng / club nghề | — | (chỉ các tab chung) |

### Nhóm B — CINS duyệt

| Loại | Cơ chế | Extension table |
|---|---|---|
| `truong_dai_hoc` | "Đề xuất trường" → CINS review → seed | `org_truong_dai_hoc` (1-1) |

Lý do tách: `truong_dai_hoc` gắn dữ liệu tuyển sinh/điểm chuẩn/ngành (`org_truong_nganh`, `org_tuyen_sinh_nam`, `org_cau_hinh_*`) — sai lệch phá moat verify. 4 loại còn lại không có dữ liệu nhạy cảm kiểu đó.

### Popup "Tạo tổ chức" (menu User)
- 4 card Nhóm A ở trên (tạo ngay).
- Dòng nhỏ dưới: *"Đại diện trường đại học? → Đề xuất xác minh"* (flow Nhóm B).

### Field map
- **Chung cả 5 loại** (`org_to_chuc`): `ten`, `slug`, `loai_to_chuc`, `avatar_id`, `cover_id`, `tinh_thanh`, mô tả, `trang_thai_tin_cay` (default `binh_thuong`).
- **Extension 1-1 chỉ cho 2 loại đào tạo/trường**: `org_co_so_dao_tao`, `org_truong_dai_hoc`.
- **studio / doanh_nghiep / cong_dong**: KHÔNG extension table. Field riêng nhỏ → JSONB trên `org_to_chuc`. Không đẻ bảng mới (schema reuse).

### Cấu trúc trang org (1 component, tab động theo `loai_to_chuc`)
- **Tab chung mọi loại**: Tổng quan · Bài đăng (`org_bai_dang`) · Sự kiện (`org_su_kien`) · Thành viên (`user_thanh_vien_to_chuc`) · Hình ảnh (`org_hinh_anh`).
- **Tab đặc thù**: bật theo loại như bảng Nhóm A.

### Ghi chú thiết kế chưa chốt
- **studio vs doanh_nghiep**: hiện gần như giống nhau (cùng `project_du_an`, cùng tab). Tạm giữ **2 nhãn dùng chung 1 template trang**. *[cân nhắc gộp 1 loại nếu doanh_nghiep không có gì studio không có — chốt sau.]*
- **cong_dong KHÔNG phải FB Group** (triết lý v7): không feed thảo luận tự do toàn mạng, không group chat tự do (`§2` chat phải có context). Hiện là **event hub + thông báo** + context verify tham dự (`verify_tham_du_su_kien`). Nếu thêm thảo luận → đi cùng "Community discussion layer" (§12, TBD).
- **cong_dong trên site** (v6 đã triển khai một phần): feed scoped **trong 1 org** qua `content_thao_luan` — thành viên đăng bài + thảo luận (KHÔNG nhồi vào `org_bai_dang`). Mỗi post kèm badge **nghề + verified journey** người đăng. `org_to_chuc.cau_hinh.che_do`: `cong_khai` (mặc định) / `rieng_tu`. Tạo org: `POST /api/to-chuc` → 2 dòng `user_thanh_vien_to_chuc` (CINS `owner` + creator `admin`) + **cột mốc Journey** `content_cot_moc` (`loai_moc=thanh_tuu`, `nguon_goc=sinh_tu_org_assign`, `id_to_chuc`) + `verify_xac_nhan` (`loai_nguoi_xac_nhan=to_chuc`, `trang_thai=da_xac_nhan`) → hiện filter **Verified**, vai trò **Người tạo cộng đồng**. Env: `CINS_SYSTEM_USER_ID`. **Nhãn lọc** (`content_thao_luan_filter`): admin định nghĩa taxonomy; user chọn nhiều nhãn khi đăng; feed mặc định hiện tất cả, chip lọc tuỳ chọn — **không** tách phòng. Tạo `cong_dong` → seed 4 nhãn mặc định (`lib/cong-dong/default-filters.ts`) + tutorial `/cong-dong/[slug]/nhan`.
- **Org không có Journey riêng**: org là *context* để verify milestone của member; mọi tác phẩm/dự án quy về `content_cot_moc` của từng user (quy tắc 1 + 2).
