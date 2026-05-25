# CINS — Creative Hub Vietnam

> **Canonical instruction for agents & developers** — file trong repo: `docs/CINS_INSTRUCTION.md`  
> **Current version:** Schema **v5** (nguồn gốc: `CINS_instruction_v5.md`)  
> **Cập nhật:** Khi có v6/v7/…, thay hoặc merge vào file này và đổi dòng *Current version* ở trên. Giữ § Implementation / ghi chú site nếu vẫn đúng.

# Project Instructions (Schema v5 — migration v2 + v3 + v4 applied, synced với DB thực tế)

> Blog cá nhân tối ưu cho hình ảnh — với verified context mà không platform nào trong ngành creative VN có.

---

## 1. Bản chất sản phẩm

CINS là creative hub cho ngành sáng tạo Việt Nam. Không phải job board, portfolio site, MXH, hay LMS.

Hai tầng core:
- **Journey** — blog cá nhân theo thời gian. Text / ảnh / video / link. Tích lũy suốt hành trình nghề nghiệp.
- **Gallery** — aggregated feed tối ưu visual. Tất cả tác phẩm public. Cửa ngõ vào Journey của người tạo ra.

**Journey là nơi tích lũy. Gallery là nơi khám phá.**

---

## 2. Triết lý sản phẩm

- **Anti-engagement**: không like công khai, không share viral, không trending, không follower count công khai
- **Open model**: interaction (tuyển dụng, kết nối) xảy ra ở nơi khác. CINS verify và lưu kết quả.
- **Verify là moat**: mọi quyết định thiết kế phải bảo vệ tính xác thực của timeline
- **Chat phải có context**: mọi chat đều gắn với dự án / lớp / sự kiện / 1-1. Không có group chat tự do.
- **Milestone không bao giờ tự sinh từ counter**: phải có xác nhận chủ động từ người có thẩm quyền
- **Verified milestone bất tử**: khi org đóng cửa, milestone đã verify không mất giá trị

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
- Tên bảng/field tiếng Việt không dấu: cot_moc, tac_pham, dong_gop, xac_nhan
- Timestamp fields: `tao_luc`, `cap_nhat_luc`, `xu_ly_luc` (không dùng created_at/updated_at trừ bảng mới từ migration v2/v3)

---

## 5. Schema — 61 bảng MVP + bảng linh_vuc riêng

### Bảng linh_vuc (bảng riêng, không thuộc nhóm article_)

Bảng danh mục lĩnh vực sáng tạo — tách riêng khỏi article_bai_viet vì cần quản lý UI (nhóm hiển thị, thứ tự, cover).

11 lĩnh vực hiện có, chia 3 nhóm: Sản xuất & Giải trí / Thiết kế thị giác / Thiết kế không gian & Sản phẩm.

Quan hệ: article_bai_viet.id_linh_vuc FK -> linh_vuc.id. Bắt buộc cho loại nghe.

---

### Nhóm user_ (8 bảng)

| Bảng | Vai trò |
|---|---|
| user_nguoi_dung | Profile chính. Fields đáng chú ý: `ai_summary_journey` (AI tự generate), `cho_phep_chat_an_danh`, `mxh_links` JSONB (default `[]`), `muc_tieu` là array enum. Auth qua Supabase auth.users. |
| user_thanh_vien_to_chuc | M-M user ↔ org. vai_tro dùng `vai_tro_to_chuc_enum`. Có `tu_ngay`/`den_ngay` date range, `nam_bat_dau` INT và `id_nganh` FK → article_bai_viet (loại nganh_dao_tao). UNIQUE (id_nguoi_dung, id_to_chuc, vai_tro). |
| user_theo_doi | Follow polymorphic: user follow user/tag(bai_viet)/org. |
| user_linh_vuc | M-M user ↔ article_bai_viet. Có `id_linh_vuc` shortcut FK → linh_vuc. |
| user_nhom_boi_canh | Nhóm filter Journey. Fields: `ten_nhom`, `slug`, `icon`, `thu_tu`. |
| user_filter_journey | Ẩn/hiện cả nhóm milestone theo scope. Field `hien_thi` boolean. UNIQUE (id_nguoi_dung, id_nhom_boi_canh, ap_dung_cho). |
| user_hoc_vien_lop | Gán học viên vào khóa/lớp. UNIQUE (id_nguoi_dung, id_khoa_hoc). |
| user_tien_do_video | DROPPED — defer sang LMS/payment phase. |

---

### Nhóm org_ (16 bảng)

| Bảng | Vai trò |
|---|---|
| org_to_chuc | Entity tổ chức chung. Có `logo_id` (field cũ, backward compat) và `avatar_id` (dùng field này). Thêm `tinh_thanh tinh_thanh_vn_enum`. |
| org_truong_dai_hoc | Extension 1-1. Fields: ma_truong (Unique), ten_chinh_thuc, ten_tieng_anh, loai_truong enum, nam_thanh_lap, website, da_verify, hoc_phi_nam_tu/den, co_ktx, ktx_gia_thang. |
| org_co_so_dao_tao | Extension 1-1. Fields: ma_co_so (Unique), ten_chinh_thuc, loai_co_so, giay_phep_dao_tao, da_verify. |
| org_truong_nganh | M-M trường ↔ ngành. Có thêm: ten_chuong_trinh, he_dao_tao enum, thoi_gian_thang, slug (Unique), avatar_id, cover_id, `trang_thai_chuong_trinh` enum (`dang_tuyen` = hiển thị; `tam_dung` = ẩn khỏi trang, giữ dữ liệu liên quan). Gỡ ngành trên site → UPDATE `tam_dung`, không DELETE. |
| org_tuyen_sinh_nam | Tuyển sinh theo năm. Có `tinh_trang tinh_trang_tuyen_sinh_enum`, `link_thong_tin`, `ghi_chu`, 8 field ngày timeline, `so_thi_sinh INT` (nullable, điền sau kỳ thi). `ti_le_choi = so_thi_sinh / chi_tieu` tính app layer. UNIQUE (id_truong_nganh, nam). |
| org_phuong_thuc_xet_tuyen | Có `ten_phuong_thuc enum`, `chi_tieu_phuong_thuc`, `diem_chuan_phuong_thuc`, `thu_tu_uu_tien`, `tieu_chi JSONB`, `ap_dung_tat_ca_nganh`, `id_nganh_ap_dung UUID[]`, `id_cau_hinh_khoi FK` (legacy; ưu tiên lookup theo `org_cau_hinh_khoi.id_truong_nganh`). |
| org_cau_hinh_khoi | Cấu hình khối thi **per ngành** per năm. `id_truong_nganh FK` nullable — **NULL** = config chung toàn trường (fallback); **có giá trị** = khối riêng từng `org_truong_nganh`. `cac_mon JSONB` DEPRECATED. `id_module FK → edu_module_tinh_diem`. UNIQUE `(id_to_chuc, id_to_hop_mon, nam_ap_dung, COALESCE(id_truong_nganh, '00000000-…'))`. **Mỗi năm tuyển sinh cần bản ghi khối riêng** (`nam_ap_dung` = 2024, 2025, …). |
| org_hinh_anh | Gallery ảnh trường. loai: khuon_vien/xuong/trien_lam/khac. |
| org_bai_dang | Bài đăng org. `tieu_de NOT NULL`, `tom_tat`, `cover_id`, `trang_thai trang_thai_bai_dang_enum` (default nhap). |
| org_bai_dang_tag | Junction M-M bài đăng ↔ article_bai_viet (tags). |
| org_khoa_hoc | Khóa học. Fields thực tế: ten_khoa_hoc, slug (Unique), avatar_id, cover_id, thoi_luong_buoi, hoc_phi, trinh_do_dau_vao enum. |
| org_lop_hoc | Lớp. Fields: ma_lop, giao_vien_phu_trach FK, ngay_khai_giang, slot_toi_da. |
| org_giao_trinh | Giáo trình. Fields: tieu_de, mo_ta_ngan, mo_ta_chi_tiet, thumbnail_id, video_gioi_thieu_url, visibility enum. |
| org_su_kien | Sự kiện. Fields thực tế: bat_dau, ket_thuc (timestamptz), dia_diem, slot_toi_da. |
| org_dang_ky_su_kien | Đăng ký sự kiện. UNIQUE (id_su_kien, id_nguoi_dung). |

---

### Nhóm edu_ (5 bảng)

| Bảng | Vai trò |
|---|---|
| edu_to_hop_mon | Danh mục khối thi chuẩn (H00, V00...). Có `cac_mon TEXT[]` — array cũ tham khảo, không tính điểm. |
| edu_to_hop_mon_chi_tiet | Cấu trúc slot của từng khối. `co_dinh=true`: môn cố định; `co_dinh=false`: slot trống, trường điền qua org_cau_hinh_mon. |
| edu_mon_thi | Danh mục môn thi. Fields: `id`, `ten`, `ma` (slug đề, vd. `hinh_hoa_chan_dung`), `loai` (`nang_khieu` / `van_hoa` / `ngoai_ngu`), `trang_thai` (vd. `active`), `thumbnail_id` (Cloudflare Images id hoặc `plh_*`), `id_bai_viet` link content hub. **Không có** `cap_nhat_luc` / `tao_luc`. **Placeholder thumbnail** (đã seed): `plh_nang_khieu` (9 môn), `plh_van_hoa` (8), `plh_ngoai_ngu` (6) — UI hiển thị gradient + chữ viết tắt; thay bằng UUID ảnh CF khi có asset thật. SQL: `supabase/sql/edu-mon-thi-thumbnail.sql`. Admin list/sửa: `lib/admin/mon-thi-server.ts`, `/admin/mon-thi`. |
| edu_module_tinh_diem | Template module tính điểm reusable. CINS tạo sẵn 4 module (H00/H02/V00/A00 chuẩn). |
| edu_module_mon | Môn trong template + hệ số mặc định. UNIQUE (id_module, so_thu_tu). |

### org_cau_hinh_mon (bảng riêng — nguồn duy nhất tính điểm)

Trường tự điền môn thật + hệ số **per khối** (`id_cau_hinh_khoi`). UNIQUE `(id_cau_hinh_khoi, id_mon_thi)`.

---

### Nhóm content_ (5 bảng)

| Bảng | Vai trò |
|---|---|
| content_cot_moc | SOURCE OF TRUTH. Field `thoi_diem DATE` (ngày xảy ra). Có FK context: id_du_an, id_su_kien, id_to_chuc, id_truong_nganh, id_lop_hoc, id_khoa_hoc. |
| content_tac_pham | Output sáng tạo. Có `cover_id` Cloudflare. |
| content_media | File media. Có `width`, `height` cho image dimensions. |
| content_tac_pham_thuoc_moc | M-M tác phẩm ↔ cột mốc. Có `thu_tu`. |
| content_tac_pham_tac_gia | M-M co-author. |

---

### Nhóm article_ (9 bảng)

Quy tắc cốt lõi: Bài viết = Tag. Không có bảng tag riêng.

| Bảng | Vai trò |
|---|---|
| article_bai_viet | Mỗi tag IS 1 dòng. Fields thực tế (Supabase): `slug`, `loai_bai_viet`, `tieu_de` (NOT NULL), `tieu_de_viet`, `tieu_de_eng`, `tom_tat`, **`noi_dung`** (HTML — **không** có cột `noi_dung_markdown`), `cover_id`, `thumbnail`, `main_video`, `meta` JSONB, `meta_title`, `meta_description`, `trang_thai_noi_dung`, `luot_xem`, `id_linh_vuc` FK, `tao_luc`, `cap_nhat_luc`. |
| article_nhom | Danh mục nhóm. loai_nhom: bo_phan/ky_thuat/nhom_nganh/cap_do (không có linh_vuc trong enum thực tế). |
| article_gan_nhom | M-M bài viết ↔ nhóm. |
| article_gan_cot_moc | M-M tag ↔ cột mốc. Có `tao_luc`. |
| article_gan_tac_pham | M-M tag ↔ tác phẩm. Có `tao_luc`. |
| article_gan_du_an | M-M tag ↔ dự án. Có `tao_luc`. |
| article_lien_quan | Content graph. Field tên thực: `id_bai_viet_a`, `id_bai_viet_b` (không phải nguon/dich). Có `cap_do TEXT`. UNIQUE (a, b, loai_quan_he). |
| article_de_xuat | Cổng chặn. Field `context_de_xuat` (không phải ly_do). Có `ket_qua_phan_loai_ai JSONB`, `admin_review UUID FK`. |
| article_alias | Alias chống duplicate. Field `ten_alias` (không phải alias). |

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
| verify_tham_du_su_kien | Tham dự sự kiện. FK trực tiếp vào `id_su_kien` + `id_nguoi_dung` (không qua id_dang_ky). Có `bang_chung`, `thoi_diem_xac_nhan`. UNIQUE (id_su_kien, id_nguoi_dung). |
| verify_email_token | Token freelancer. Fields: `token_hash` (Unique), `email_nhan`, `het_han_luc`, `da_claim_luc`, `ip_claim`. |

---

### Nhóm social_ (5 bảng)

| Bảng | Vai trò |
|---|---|
| social_binh_luan | Comment. FK field tên `nguoi_binh_luan`. Có `id_cha` (reply), `da_xoa` (soft delete). |
| social_reaction | Emoji reaction. UNIQUE (id_nguoi_dung, loai_doi_tuong, id_doi_tuong, emoji). |
| social_luu | Bookmark. UNIQUE (id_nguoi_dung, loai_doi_tuong, id_doi_tuong). |
| social_luot_xem | Log lượt xem — partition theo tháng. Có `da_xu_ly_hint BOOLEAN` flag cho AI batch viewer hint. |
| social_thong_bao | Notification. FK field tên `nguoi_nhan`. Có `noi_dung_ai`, `loai_doi_tuong TEXT`, `id_doi_tuong UUID` cho context. |

---

### Nhóm chat_ (5 bảng)

| Bảng | Vai trò |
|---|---|
| chat_phong | 6 loại. Dùng `loai_context TEXT` + `id_context UUID` (không phải id_entity). Có `id_org_dai_dien FK`. |
| chat_thanh_vien | Có `tham_gia_luc`, `roi_luc`. UNIQUE (id_phong, id_nguoi_dung). |
| chat_tin_nhan | Field tên `loai_tin` (không phải loai). Có `id_dinh_kem FK → content_media`, `id_tin_tra_loi` (reply), `da_xoa`. |
| chat_da_doc | Field `id_tin_nhan_cuoi_doc`. PK (id_phong, id_nguoi_dung). |
| chat_chan | Có `id_nguoi_bi_chan` nullable (null = block all). |

---

### Nhóm vector_ (3 bảng)

| Bảng | Vai trò |
|---|---|
| vector_co_dinh | Cho content tĩnh. Fields: `phien_ban_quy_uoc`, `prompt_hash`, `tinh_luc`. UNIQUE (loai_doi_tuong, id_doi_tuong). |
| vector_dong | Cho user và org. Fields: `do_tin_cay`, `so_data_point`, `cap_nhat_cuoi`, `cap_nhat_tiep`. UNIQUE (loai_doi_tuong, id_doi_tuong). |
| vector_hang_doi | Background job queue. Fields: `loai_vector enum`, `uu_tien`, `so_lan_thu`, `loi`, `bat_dau_xu_ly_luc`, `hoan_thanh_luc`. |

---

## 6. Quy tắc kiến trúc cốt lõi

1. Mọi thứ trên Journey = 1 dòng content_cot_moc — source of truth thống nhất
2. Milestone không bao giờ tự sinh từ counter — phải có xác nhận chủ động
3. Verified milestone không xóa khi org đóng cửa — chỉ thay đổi UI badge
4. Engagement và level chuyên môn tính realtime từ activity, không lưu field cố định
5. Bài viết = Tag — không duplicate hệ thống tag và content
6. che_do_hien_thi milestone: ẩn khi 1 trong 2 lớp (milestone hoặc nhóm) bảo ẩn
7. article_de_xuat là cổng chặn — chưa tạo article_bai_viet cho đến khi admin duyệt
8. org_truong_nganh.id_nganh FK → article_bai_viet (loại nganh_dao_tao)
9. Nhóm phân loại tách bảng riêng — article_nhom + article_gan_nhom. Không lưu nhom trong meta JSONB.
10. article_bai_viet.id_linh_vuc FK → linh_vuc.id — bắt buộc cho bài loại nghe.
11. org_cau_hinh_mon là nguồn duy nhất tính điểm — không đọc từ edu_module_mon, không hardcode frontend.
12. Timeline tuyển sinh: `tinh_trang` enum cho display, các field ngày cho logic chi tiết ở app layer.
13. CINS giữ vai_tro = owner cho mọi org. Trường chỉ được cấp admin. Owner không giao cho org.
14. edu_to_hop_mon.cac_mon TEXT[] là field cũ tham khảo — slot cụ thể dùng edu_to_hop_mon_chi_tiet.
15. org_to_chuc.logo_id là field cũ backward compat — dùng avatar_id cho code mới.
16. `org_cau_hinh_khoi.id_truong_nganh` nullable — NULL = fallback toàn trường; có giá trị = config per ngành. Calculator lookup theo ngành trước, fallback NULL sau (chỉ khi **không** có dòng khối per-ngành cho năm đó).
17. `edu_mon_thi` phân biệt đề cụ thể — không gộp chung `hinh_hoa` khi trường tách đề (MTS: toàn thân / chân dung / tượng tròn, …).
18. `org_tuyen_sinh_nam.so_thi_sinh` — điền sau kỳ thi; `ti_le_choi` tính app layer.

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
ten_phuong_thuc_enum    : xet_diem_thi_thpt / xet_hoc_ba / danh_gia_nang_luc / xet_tuyen_thang / nang_khieu / phong_van / danh_gia_tu_duy / thi_van_hoa_rieng / nang_khieu_ket_hop / chung_chi_sat / chung_chi_act / chung_chi_ib / bang_nuoc_ngoai / v_sat / ket_hop
tinh_trang_tuyen_sinh_enum: sap_mo / dang_mo / da_dong / co_ket_qua
trang_thai_bai_dang_enum: nhap / da_dang
trang_thai_chuong_trinh_enum: dang_tuyen / tam_dung
loai_nhom_enum          : bo_phan / ky_thuat / nhom_nganh / cap_do
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

**Ví dụ MTS 2024** (mỗi ngành một khối + 3 môn trong `org_cau_hinh_mon`):
- Hội họa / Đồ họa: Ngữ văn ×1 + Hình họa toàn thân ×2 + Bố cục tranh màu ×1
- Điêu khắc: Ngữ văn ×1 + Tượng tròn ×2 + Bố cục chạm nổi ×1
- Thiết kế đồ họa: Ngữ văn ×1 + Hình họa chân dung ×2 + Trang trí màu ×1

**Lỗi thường gặp — năm mới (vd. 2025) trống trên UI:**
- Chỉ có khối `nam_ap_dung = 2025` và `id_truong_nganh IS NULL` (H00 chung) → API trả 4 môn generic, **sai** với từng ngành.
- Query chẩn đoán trả **0 dòng** khi `nam_ap_dung = 2025` và join `id_truong_nganh` → **chưa seed** `org_cau_hinh_khoi` per-ngành cho năm đó (không phải lỗi quyền nếu `mon_anon_2024_dk = 3`).
- Cần chạy seed SQL per-năm (xem §15).

---

## 11. Admin — Phân quyền 2 lớp

**CINS admin (`/admin`)** — chỉ CINS internal: duyệt org, seed ngành, `edu_*`, analytics.

**Trường admin (inline trên `/truong-dai-hoc/[slug]`)** — staff trường: cover/avatar, `org_bai_dang`, `org_hinh_anh`, `org_tuyen_sinh_nam`, invite `user_thanh_vien_to_chuc`.

Check: `user_thanh_vien_to_chuc.vai_tro IN ('admin', 'quan_ly_noi_dung', 'quan_ly_tuyen_sinh')`.

---

## 12. Nhóm tương lai (không trong MVP)

- payment_ (5 bảng) — khi org bán khóa học, sự kiện thu phí, subscription
- api_ (4 bảng) — public API cho developer
- ad_ (8 bảng) — sponsored content
- Video on demand + LMS đầy đủ — defer cùng payment phase

---

## 13. Implementation Notes

- user_nguoi_dung.auth_user_id link với auth.users Supabase — cần trigger handle_new_user()
- social_luot_xem partition theo tháng — cron tạo partition mới. Có field `da_xu_ly_hint` để batch AI viewer hint.
- Vector queue cần worker background — Supabase Edge Functions
- RLS chưa được apply trong schema cơ bản — phải làm trước khi public
- Weight xác nhận tính ở app layer từ loai_nguoi_xac_nhan
- Viewer hint notification: batch cuối ngày, filter `da_xu_ly_hint = false` SQL trước rồi mới gọi AI
- article_de_xuat: user gắn tag tạm dạng text string, sau khi admin publish mới convert thành FK
- noi_dung của bài nghe là HTML — render bằng dangerouslySetInnerHTML với CSS scope `.article-rich-content`
- Timeline tuyển sinh: `tinh_trang` enum cho display tab. Status chi tiết tính từ field ngày: done = ngay_thi_den < NOW() | active = ngay_thi_tu ≤ NOW() ≤ ngay_thi_den | upcoming = còn lại
- Stat bar trang trường: diem_chuan = MAX(diem_chuan) | chi_tieu = SUM(chi_tieu) | journey_count = COUNT DISTINCT user_thanh_vien_to_chuc WHERE id_to_chuc = X
- RLS phân quyền org: admin + quan_ly_tuyen_sinh → org_tuyen_sinh_nam, org_phuong_thuc_xet_tuyen, org_cau_hinh_khoi, org_cau_hinh_mon | admin + quan_ly_noi_dung → org_bai_dang, org_hinh_anh, org_bai_dang_tag | admin → UPDATE org_to_chuc (cover, avatar) | owner (CINS) → không giới hạn
- org_to_chuc.logo_id là field cũ — dùng avatar_id trong code mới
- social_binh_luan hỗ trợ reply qua `id_cha` và soft delete qua `da_xoa`
- chat_tin_nhan hỗ trợ reply qua `id_tin_tra_loi` và soft delete qua `da_xoa`
- content_cot_moc.thoi_diem là ngày xảy ra milestone (DATE), tao_luc là ngày tạo record
- `org_tuyen_sinh_nam.so_thi_sinh` nullable — `ti_le_choi` tính app layer
- `edu_mon_thi.thumbnail_id`: giá trị `plh_*` = placeholder UI (không phải Cloudflare id); UUID/id CF dài = ảnh thật qua `imagedelivery.net`. Helper: `lib/truong/mon-thi-thumbnail.ts`, component `MonThiThumb`.
- `org_truong_nganh`: admin «Gỡ ngành» → `trang_thai_chuong_trinh = tam_dung` (API `DELETE …/nganh/{programId}` trên site thực chất là ẩn).

---

## 14. Seed Strategy

Sine Art là partner đầu tiên:
- ~520 học sinh = first users có Journey thật ngay từ ngày đầu
- Mô hình lien_tuc_theo_thang
- Model proven với Sine Art → nhân rộng ra trường ĐH và công ty

Pre-launch checklist:
- 10-20 Journey thật với creative từ Sine Art
- Tú là Journey số 1, public hoàn toàn
- 20-30 bài article live
- AI auto-tag cơ bản
- Seed edu_to_hop_mon_chi_tiet cho H00/H02/V00/V01 (cần UUID thật)
- Seed edu_module_mon cho 4 module template (cần UUID thật)

3 trường ĐH đã seed (MTS, MHI, MMA): ngành, tuyển sinh, **cấu hình tính điểm per-ngành MTS 2024** (SQL trong repo `supabase/sql/`). **Năm 2025** cần seed riêng — copy khối/môn từ 2024, không tự sinh khi chỉ có dữ liệu 2024.

---

## 15. Implementation — cins-website (Next.js)

**Map chi tiết:** [`docs/cursor_map_truong.md`](./cursor_map_truong.md)

| Thành phần | Ghi chú |
|---|---|
| Route | `/truong-dai-hoc/[slug]` — layout v6 (`tdh-page--v6`) |
| API tính điểm | `GET /api/truong/{org_to_chuc.id}/cau-hinh-tinh-diem?nam=&nganh=` — `nganh` = `org_truong_nganh.id`; `PUT` lưu `org_cau_hinh_mon` |
| API catalog môn | `GET /api/truong/{id}/mon-thi-catalog` — `id, ten, loai, ma, thumbnail_id` (fallback placeholder theo `loai` nếu null) |
| API ngành CRUD | `POST/GET …/nganh`, `DELETE …/nganh/{programId}` → ẩn (`tam_dung`) |
| Query server | `lib/truong/queries.ts` → `loadCauHinhKhoiRow`: khối per-ngành trước; join `edu_mon_thi` (`ma`, `thumbnail_id`) qua `fetchMonCatalog` trong `cau-hinh-tinh-diem.ts` |
| UI môn thi tab Ngành | `TruongNganhMonThiDauVao` — lưới card tối đa **3 cột**, thumbnail + tên/hệ số; modal sửa `TruongNganhMonThiEditModal` (cột Ảnh) |
| SQL thumbnail môn | `supabase/sql/edu-mon-thi-thumbnail.sql` — đã chạy: 9 `nang_khieu`, 8 `van_hoa`, 6 `ngoai_ngu` |

**SQL grant (chạy trên Supabase):**
1. `supabase/sql/org-truong-grant-anon-read.sql`
2. `supabase/sql/org-truong-public-read-extended.sql`
3. `supabase/sql/org-truong-grant-cau-hinh-tinh-diem.sql` — kiểm tra `mon_anon_*_dk = 3` dưới `SET ROLE anon`

**SQL seed MTS — cấu hình tính điểm (theo thứ tự):**

| File | Mục đích |
|---|---|
| `org-truong-seed-cau-hinh-mon-mts-h00-2024.sql` | Khối chung H00 2024 + môn fallback |
| `org-truong-seed-cau-hinh-mon-mts-per-nganh-2024.sql` | 4 ngành × 3 môn, `nam_ap_dung = 2024` |
| `org-truong-fix-mon-mts-2025.sql` | **Tạo** `org_cau_hinh_khoi` 2025 per-ngành + gắn môn (chạy khi query 2025 trả 0 dòng) |
| `org-truong-sync-cau-hinh-mts-active-nganh.sql` | Copy khối/môn từ UUID legacy → UUID **đang hiển thị** trên trang trường (Đồ họa `be66ebb8…`) |
| `org-truong-dedupe-khoi-2025.sql` | Xóa khối 2025 trùng/rỗng (tùy chọn) |
| `edu-mon-thi-thumbnail.sql` | Cột `edu_mon_thi.thumbnail_id` + seed `plh_*` theo `loai` |

**Sau khi chạy `edu-mon-thi-thumbnail.sql`**, có thể bật đọc cột từ DB trong:
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

**Chẩn đoán nhanh:**
```sql
-- Phải có dòng (postgres): mỗi slug năm 2025
SELECT tn.slug, k.id, count(m.id) AS so_mon
FROM org_cau_hinh_khoi k
JOIN org_truong_nganh tn ON tn.id = k.id_truong_nganh
LEFT JOIN org_cau_hinh_mon m ON m.id_cau_hinh_khoi = k.id
WHERE k.id_to_chuc = 'a1000000-0000-0000-0000-000000000001'
  AND k.nam_ap_dung = 2025
GROUP BY tn.slug, k.id;
```
Nếu **0 dòng** → chạy `org-truong-fix-mon-mts-2025.sql` (toàn file `BEGIN`…`COMMIT`). Nếu có khối nhưng `so_mon = 0` → chạy lại bước INSERT môn trong file đó.

---

## 16. Quy ước làm việc

- Làm việc bằng tiếng Việt
- Field/bảng tiếng Việt không dấu với tiền tố tiếng Anh
- "Khoan sửa" → defer, gom thay đổi lại sửa cuối
- "Sao cũng được" → tự quyết hợp lý, không hỏi lại
- Push back khi AI over-engineer hoặc sai semantic
- Câu trả lời ngắn gọn, không giải thích dài dòng
