# CINS — SCHEMA

> **File trong repo:** `docs/CINS_SCHEMA.md`
> **SINH TỪ DB — là sự thật cấu trúc.** Không sửa tay. Regenerate bằng query `information_schema` / `dump_schema.sql` mỗi khi schema đổi.
> Snapshot: **2026-06-07** · Supabase `ospzzzxcomrmhqrnkoiw`.
> **70 bảng logic** · **66 enum** · **118+ FK**. (69 bảng thường + `social_luot_xem` partitioned; 2 partition con `social_luot_xem_2026_05/06` không tính logic.)
> Khi conflict với mọi file khác → file này (và DB) thắng.

**Lưu ý field/enum legacy** (giữ backward-compat, KHÔNG dùng cho code mới):
- `org_to_chuc.logo_id` → dùng `avatar_id` (quy tắc 15).
- `edu_to_hop_mon.cac_mon text[]` → dùng `edu_to_hop_mon_chi_tiet` (quy tắc 14).
- `tinh_thanh_vn_enum_old` → dùng `tinh_thanh_vn_enum`.
- `doanh_nghiep` vẫn trong `loai_to_chuc_enum` nhưng **ẩn UI** (gộp vào `studio`, L7).

---

## article_ — Bài viết & tag (9 bảng)

### article_alias

| Cột | Kiểu | Null | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `id_bai_viet` | uuid | NO |  |
| `ten_alias` | text | NO |  |
| `nguon` | nguon_alias_enum | NO | 'admin'::nguon_alias_enum |

### article_bai_viet

| Cột | Kiểu | Null | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `slug` | text | NO |  |
| `tieu_de` | text | NO |  |
| `tieu_de_eng` | text | YES |  |
| `loai_bai_viet` | loai_bai_viet_enum | NO |  |
| `tom_tat` | text | YES |  |
| `cover_id` | text | YES |  |
| `noi_dung` | text | YES |  |
| `meta` | jsonb | YES |  |
| `trang_thai_noi_dung` | trang_thai_noi_dung_enum | NO | 'cho_review'::trang_thai_noi_dung_enum |
| `merged_vao_id` | uuid | YES |  |
| `luot_xem` | integer | NO | 0 |
| `meta_title` | text | YES |  |
| `meta_description` | text | YES |  |
| `tao_luc` | timestamp with time zone | NO | now() |
| `cap_nhat_luc` | timestamp with time zone | NO | now() |
| `tieu_de_viet` | text | YES |  |
| `main_video` | text | YES |  |
| `thumbnail` | text | YES |  |
| `id_linh_vuc` | uuid | YES |  |
| `da_verify` | boolean | NO | false |

### article_de_xuat

| Cột | Kiểu | Null | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `ten_de_xuat` | text | NO |  |
| `context_de_xuat` | text | YES |  |
| `nguoi_de_xuat` | uuid | NO |  |
| `id_bai_viet_da_tao` | uuid | YES |  |
| `trang_thai` | trang_thai_de_xuat_enum | NO | 'cho_review'::trang_thai_de_xuat_enum |
| `ket_qua_phan_loai_ai` | jsonb | YES |  |
| `admin_review` | uuid | YES |  |
| `ghi_chu_admin` | text | YES |  |
| `tao_luc` | timestamp with time zone | NO | now() |

### article_gan_cot_moc

| Cột | Kiểu | Null | Default |
|---|---|---|---|
| `id_bai_viet` | uuid | NO |  |
| `id_cot_moc` | uuid | NO |  |
| `tao_luc` | timestamp with time zone | NO | now() |

### article_gan_du_an

| Cột | Kiểu | Null | Default |
|---|---|---|---|
| `id_du_an` | uuid | NO |  |
| `id_bai_viet` | uuid | NO |  |
| `tao_luc` | timestamp with time zone | NO | now() |

### article_gan_nhom

| Cột | Kiểu | Null | Default |
|---|---|---|---|
| `id_bai_viet` | uuid | NO |  |
| `id_nhom` | uuid | NO |  |

### article_gan_tac_pham

| Cột | Kiểu | Null | Default |
|---|---|---|---|
| `id_bai_viet` | uuid | NO |  |
| `id_tac_pham` | uuid | NO |  |
| `tao_luc` | timestamp with time zone | NO | now() |

### article_lien_quan

| Cột | Kiểu | Null | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `id_bai_viet_a` | uuid | NO |  |
| `id_bai_viet_b` | uuid | NO |  |
| `loai_quan_he` | loai_quan_he_enum | NO |  |
| `cap_do` | text | YES |  |

### article_nhom

| Cột | Kiểu | Null | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `slug` | text | NO |  |
| `ten` | text | NO |  |
| `mo_ta` | text | YES |  |
| `loai_nhom` | loai_nhom_enum | NO |  |
| `thu_tu` | integer | NO | 0 |

---

## chat_ — Nhắn tin (5 bảng)

### chat_chan

| Cột | Kiểu | Null | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `id_nguoi_chan` | uuid | NO |  |
| `id_nguoi_bi_chan` | uuid | YES |  |
| `loai_chan` | loai_chan_enum | NO |  |
| `ly_do` | text | YES |  |
| `tao_luc` | timestamp with time zone | NO | now() |

### chat_da_doc

| Cột | Kiểu | Null | Default |
|---|---|---|---|
| `id_phong` | uuid | NO |  |
| `id_nguoi_dung` | uuid | NO |  |
| `id_tin_nhan_cuoi_doc` | uuid | NO |  |
| `cap_nhat_luc` | timestamp with time zone | NO | now() |

### chat_phong

| Cột | Kiểu | Null | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `loai_phong` | loai_phong_chat_enum | NO |  |
| `loai_context` | text | YES |  |
| `id_context` | uuid | YES |  |
| `id_org_dai_dien` | uuid | YES |  |
| `tao_luc` | timestamp with time zone | NO | now() |
| `cap_nhat_luc` | timestamp with time zone | NO | now() |

### chat_thanh_vien

| Cột | Kiểu | Null | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `id_phong` | uuid | NO |  |
| `id_nguoi_dung` | uuid | NO |  |
| `vai_tro` | vai_tro_chat_enum | NO | 'thanh_vien'::vai_tro_chat_enum |
| `an_danh` | boolean | NO | false |
| `tham_gia_luc` | timestamp with time zone | NO | now() |
| `roi_luc` | timestamp with time zone | YES |  |

### chat_tin_nhan

| Cột | Kiểu | Null | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `id_phong` | uuid | NO |  |
| `id_nguoi_gui` | uuid | NO |  |
| `noi_dung` | text | YES |  |
| `loai_tin` | loai_tin_nhan_enum | NO | 'text'::loai_tin_nhan_enum |
| `id_dinh_kem` | uuid | YES |  |
| `id_tin_tra_loi` | uuid | YES |  |
| `tao_luc` | timestamp with time zone | NO | now() |
| `da_xoa` | boolean | NO | false |

---

## content_ — Milestone, tác phẩm, cộng đồng (7 bảng)

### content_cot_moc

| Cột | Kiểu | Null | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `id_nguoi_dung` | uuid | NO |  |
| `loai_moc` | loai_moc_enum | NO |  |
| `nguon_goc` | nguon_goc_moc_enum | NO | 'tu_tao'::nguon_goc_moc_enum |
| `tieu_de` | text | NO |  |
| `mo_ta` | text | YES |  |
| `thoi_diem` | date | NO |  |
| `che_do_hien_thi` | che_do_hien_thi_moc_enum | NO | 'public'::che_do_hien_thi_moc_enum |
| `id_nhom_boi_canh` | uuid | YES |  |
| `id_du_an` | uuid | YES |  |
| `id_su_kien` | uuid | YES |  |
| `id_to_chuc` | uuid | YES |  |
| `id_truong_nganh` | uuid | YES |  |
| `id_lop_hoc` | uuid | YES |  |
| `id_khoa_hoc` | uuid | YES |  |
| `ghim` | boolean | NO | false |
| `tao_luc` | timestamp with time zone | NO | now() |
| `cap_nhat_luc` | timestamp with time zone | NO | now() |

> `che_do_hien_thi_moc_enum`: `feature` · `public` · `theo_nhom` · `chi_minh` · **`cong_dong`** (post cộng đồng — ẩn Journey public, hiện feed org).

### content_media

| Cột | Kiểu | Null | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `id_tac_pham` | uuid | NO |  |
| `thu_tu` | integer | NO | 0 |
| `loai_media` | loai_media_enum | NO |  |
| `cloudflare_id` | text | NO |  |
| `width` | integer | YES |  |
| `height` | integer | YES |  |
| `duration_s` | integer | YES |  |
| `alt` | text | YES |  |

### content_tac_pham

| Cột | Kiểu | Null | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `id_nguoi_dung` | uuid | NO |  |
| `loai_tac_pham` | loai_tac_pham_enum | NO |  |
| `tieu_de` | text | NO |  |
| `mo_ta` | text | YES |  |
| `cover_id` | text | YES |  |
| `che_do_hien_thi` | che_do_hien_thi_moc_enum | NO | 'public'::che_do_hien_thi_moc_enum |
| `tao_luc` | timestamp with time zone | NO | now() |
| `cap_nhat_luc` | timestamp with time zone | NO | now() |
| `slug` | text | YES |  |
| `noi_dung_blocks` | jsonb | NO | '[]'::jsonb |
| `noi_dung_html` | text | YES |  |
| `meta_title` | text | YES |  |
| `meta_description` | text | YES |  |

### content_tac_pham_tac_gia

| Cột | Kiểu | Null | Default |
|---|---|---|---|
| `id_tac_pham` | uuid | NO |  |
| `id_nguoi_dung` | uuid | NO |  |
| `vai_tro` | text | YES |  |
| `tao_luc` | timestamp with time zone | NO | now() |
| `trang_thai` | text | NO | 'pending'::text |
| `la_chu_so_huu` | boolean | NO | false |
| `thu_tu` | smallint | YES |  |
| `ghi_chu` | text | YES |  |
| `xu_ly_luc` | timestamp with time zone | YES |  |

### content_tac_pham_thuoc_moc

| Cột | Kiểu | Null | Default |
|---|---|---|---|
| `id_tac_pham` | uuid | NO |  |
| `id_cot_moc` | uuid | NO |  |
| `thu_tu` | integer | NO | 0 |

### cong_dong_filter

| Cột | Kiểu | Null | Default |
|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() |
| `loai_context` | text | NO | 'cong_dong'::text |
| `id_context` | uuid | NO |  |
| `ten` | text | NO |  |
| `slug` | text | NO |  |
| `mau` | text | YES |  |
| `icon` | text | YES |  |
| `thu_tu` | smallint | NO | 0 |
| `tao_luc` | timestamp with time zone | NO | now() |

### cong_dong_filter_gan

| Cột | Kiểu | Null | Default |
|---|---|---|---|
| `id_cot_moc` | uuid | NO |  |
| `id_filter` | uuid | NO |  |

> PK `(id_cot_moc, id_filter)`. Bỏ: `content_thao_luan`, `content_thao_luan_media`, `content_thao_luan_filter_gan`.

---

## edu_ — Tính điểm tuyển sinh (5 bảng)

### edu_module_mon

| Cột | Kiểu | Null | Default |
|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() |
| `id_module` | uuid | NO |  |
| `id_slot` | uuid | YES |  |
| `ten_mon_mac_dinh` | text | YES |  |
| `he_so` | numeric(4,2) | NO | 1 |
| `thang_diem` | integer | NO | 10 |
| `thoi_gian_phut` | integer | YES |  |
| `so_thu_tu` | integer | NO | 1 |

### edu_module_tinh_diem

| Cột | Kiểu | Null | Default |
|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() |
| `ten` | text | NO |  |
| `mo_ta` | text | YES |  |
| `quy_ve_thang` | integer | YES |  |
| `co_diem_uu_tien` | boolean | NO | true |
| `co_diem_thuong` | boolean | NO | false |
| `trang_thai` | text | NO | 'active'::text |
| `created_at` | timestamp with time zone | NO | now() |

### edu_mon_thi

| Cột | Kiểu | Null | Default |
|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() |
| `ma` | text | NO |  |
| `ten` | text | NO |  |
| `loai` | text | NO |  |
| `id_bai_viet` | uuid | YES |  |
| `mo_ta` | text | YES |  |
| `trang_thai` | text | NO | 'active'::text |
| `created_at` | timestamp with time zone | NO | now() |
| `thumbnail_id` | text | YES |  |

### edu_to_hop_mon

| Cột | Kiểu | Null | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `ma_to_hop` | text | NO |  |
| `ten_to_hop` | text | NO |  |
| `cac_mon` | text[] | NO |  |
| `mo_ta` | text | YES |  |

### edu_to_hop_mon_chi_tiet

| Cột | Kiểu | Null | Default |
|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() |
| `id_to_hop_mon` | uuid | NO |  |
| `so_thu_tu` | integer | NO |  |
| `ten_slot` | text | NO |  |
| `loai` | text | NO |  |
| `co_dinh` | boolean | NO | false |

---

## linh_vuc — Danh mục lĩnh vực (1 bảng)

### linh_vuc

| Cột | Kiểu | Null | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `slug` | text | NO |  |
| `ten` | text | NO |  |
| `ten_eng` | text | YES |  |
| `mo_ta` | text | YES |  |
| `cover_id` | text | YES |  |
| `thu_tu` | integer | NO | 0 |
| `trang_thai` | text | NO | 'active'::text |
| `nhom` | text | YES |  |

---

## org_ — Tổ chức, trường, khóa học (19 bảng)

### org_bai_dang

| Cột | Kiểu | Null | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `id_to_chuc` | uuid | NO |  |
| `loai_bai_dang` | loai_bai_dang_org_enum | NO |  |
| `tieu_de` | text | NO |  |
| `noi_dung` | text | YES |  |
| `ghim` | boolean | NO | false |
| `trang_thai` | trang_thai_bai_dang_enum | NO | 'nhap'::trang_thai_bai_dang_enum |
| `tao_luc` | timestamp with time zone | NO | now() |
| `cap_nhat_luc` | timestamp with time zone | NO | now() |
| `tom_tat` | text | YES |  |
| `cover_id` | text | YES |  |
| `noi_dung_blocks` | jsonb | NO | '[]'::jsonb |

### org_bai_dang_tag

| Cột | Kiểu | Null | Default |
|---|---|---|---|
| `id_bai_dang` | uuid | NO |  |
| `id_bai_viet` | uuid | NO |  |

### org_cau_hinh_khoi

| Cột | Kiểu | Null | Default |
|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() |
| `id_to_chuc` | uuid | NO |  |
| `id_to_hop_mon` | uuid | NO |  |
| `nam_ap_dung` | integer | NO |  |
| `cac_mon` | jsonb | NO |  |
| `quy_ve_thang` | integer | YES |  |
| `diem_san_xet_tuyen` | numeric(4,2) | YES |  |
| `mo_ta` | text | YES |  |
| `trang_thai` | text | NO | 'active'::text |
| `created_at` | timestamp with time zone | NO | now() |
| `updated_at` | timestamp with time zone | NO | now() |
| `id_module` | uuid | YES |  |
| `id_truong_nganh` | uuid | YES |  |

### org_cau_hinh_mon

| Cột | Kiểu | Null | Default |
|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() |
| `id_cau_hinh_khoi` | uuid | NO |  |
| `id_mon_thi` | uuid | NO |  |
| `id_slot` | uuid | YES |  |
| `he_so` | numeric(4,2) | NO | 1 |
| `thang_diem` | integer | NO | 10 |
| `thoi_gian_phut` | integer | YES |  |
| `so_thu_tu` | integer | NO | 1 |
| `ghi_chu` | text | YES |  |

### org_co_so_dao_tao

| Cột | Kiểu | Null | Default |
|---|---|---|---|
| `id_to_chuc` | uuid | NO |  |
| `ma_co_so` | text | NO |  |
| `ten_chinh_thuc` | text | NO |  |
| `loai_co_so` | loai_co_so_enum | NO |  |
| `nam_thanh_lap` | integer | YES |  |
| `website` | text | YES |  |
| `giay_phep_dao_tao` | text | YES |  |
| `da_verify` | boolean | NO | false |

### org_dang_ky_su_kien

| Cột | Kiểu | Null | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `id_su_kien` | uuid | NO |  |
| `id_nguoi_dung` | uuid | NO |  |
| `trang_thai` | trang_thai_dang_ky_su_kien_enum | NO | 'cho_duyet'::trang_thai_dang_ky_su_kien_enum |
| `tao_luc` | timestamp with time zone | NO | now() |

### org_giao_trinh

| Cột | Kiểu | Null | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `id_khoa_hoc` | uuid | NO |  |
| `tieu_de` | text | NO |  |
| `mo_ta_ngan` | text | YES |  |
| `mo_ta_chi_tiet` | text | YES |  |
| `thumbnail_id` | text | YES |  |
| `video_gioi_thieu_url` | text | YES |  |
| `visibility` | visibility_giao_trinh_enum | NO | 'public'::visibility_giao_trinh_enum |
| `cap_nhat_luc` | timestamp with time zone | NO | now() |

### org_hinh_anh

| Cột | Kiểu | Null | Default |
|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() |
| `id_to_chuc` | uuid | NO |  |
| `cloudflare_id` | text | NO |  |
| `caption` | text | YES |  |
| `loai` | text | NO | 'khac'::text |
| `thu_tu` | integer | NO | 0 |
| `nam` | integer | YES |  |
| `created_at` | timestamp with time zone | NO | now() |

### org_khoa_hoc

| Cột | Kiểu | Null | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `id_to_chuc` | uuid | NO |  |
| `ten_khoa_hoc` | text | NO |  |
| `slug` | text | NO |  |
| `mo_ta` | text | YES |  |
| `loai_mo_hinh` | loai_mo_hinh_khoa_enum | NO |  |
| `avatar_id` | text | YES |  |
| `cover_id` | text | YES |  |
| `thoi_luong_buoi` | integer | YES |  |
| `thoi_luong_phut_moi_buoi` | integer | YES |  |
| `hoc_phi` | numeric(12,2) | YES |  |
| `trinh_do_dau_vao` | trinh_do_dau_vao_enum | NO | 'khong_yeu_cau'::trinh_do_dau_vao_enum |
| `trang_thai_khoa_hoc` | trang_thai_khoa_hoc_enum | NO | 'sap_khai_giang'::trang_thai_khoa_hoc_enum |

### org_lop_hoc

| Cột | Kiểu | Null | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `id_khoa_hoc` | uuid | NO |  |
| `ma_lop` | text | NO |  |
| `hinh_thuc` | hinh_thuc_lop_enum | NO | 'truc_tiep'::hinh_thuc_lop_enum |
| `giao_vien_phu_trach` | uuid | YES |  |
| `ngay_khai_giang` | date | NO |  |
| `ngay_du_kien_ket_thuc` | date | YES |  |
| `slot_toi_da` | integer | YES |  |
| `trang_thai` | trang_thai_lop_enum | NO | 'sap_khai_giang'::trang_thai_lop_enum |

### org_phuong_thuc_xet_tuyen

| Cột | Kiểu | Null | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `id_tuyen_sinh_nam` | uuid | NO |  |
| `ten_phuong_thuc` | ten_phuong_thuc_enum | NO |  |
| `chi_tieu_phuong_thuc` | integer | YES |  |
| `diem_chuan_phuong_thuc` | numeric(4,2) | YES |  |
| `id_to_hop_mon` | uuid | YES |  |
| `dieu_kien_xet_tuyen` | text | YES |  |
| `thu_tu_uu_tien` | integer | NO | 1 |
| `tieu_chi` | jsonb | YES |  |
| `ap_dung_tat_ca_nganh` | boolean | YES | true |
| `id_nganh_ap_dung` | uuid[] | YES |  |
| `id_cau_hinh_khoi` | uuid | YES |  |

### org_su_kien

| Cột | Kiểu | Null | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `id_to_chuc` | uuid | NO |  |
| `ten` | text | NO |  |
| `loai_su_kien` | loai_su_kien_enum | NO |  |
| `mo_ta` | text | YES |  |
| `cover_id` | text | YES |  |
| `bat_dau` | timestamp with time zone | NO |  |
| `ket_thuc` | timestamp with time zone | YES |  |
| `dia_diem` | text | YES |  |
| `slot_toi_da` | integer | YES |  |

### org_to_chuc

| Cột | Kiểu | Null | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `slug` | text | NO |  |
| `ten` | text | NO |  |
| `loai_to_chuc` | loai_to_chuc_enum | NO |  |
| `mo_ta` | text | YES |  |
| `logo_id` | text | YES |  *(legacy → avatar_id)* |
| `cover_id` | text | YES |  |
| `trang_thai_hoat_dong` | trang_thai_hoat_dong_enum | NO | 'dang_hoat_dong'::trang_thai_hoat_dong_enum |
| `trang_thai_tin_cay` | trang_thai_tin_cay_enum | NO | 'binh_thuong'::trang_thai_tin_cay_enum |
| `nguoi_tao` | uuid | YES |  |
| `tao_luc` | timestamp with time zone | NO | now() |
| `cap_nhat_luc` | timestamp with time zone | NO | now() |
| `avatar_id` | text | YES |  |
| `tinh_thanh` | tinh_thanh_vn_enum | YES |  |
| `dia_chi` | text | YES |  |
| `dien_thoai` | text | YES |  |
| `email_lien_he` | text | YES |  |
| `gioi_thieu_truong` | text | YES |  |
| `cau_hinh` | jsonb | NO | '{}'::jsonb |

### org_truong_dai_hoc

| Cột | Kiểu | Null | Default |
|---|---|---|---|
| `id_to_chuc` | uuid | NO |  |
| `ma_truong` | text | NO |  |
| `ten_chinh_thuc` | text | NO |  |
| `ten_tieng_anh` | text | YES |  |
| `loai_truong` | loai_truong_enum | NO |  |
| `nam_thanh_lap` | integer | YES |  |
| `website` | text | YES |  |
| `da_verify` | boolean | NO | false |
| `hoc_phi_nam_tu` | integer | YES |  |
| `hoc_phi_nam_den` | integer | YES |  |
| `co_ktx` | boolean | YES | false |
| `ktx_gia_thang` | text | YES |  |

### org_truong_nganh

| Cột | Kiểu | Null | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `id_to_chuc` | uuid | NO |  |
| `id_nganh` | uuid | NO |  |
| `ten_chuong_trinh` | text | NO |  |
| `he_dao_tao` | he_dao_tao_enum | NO |  |
| `thoi_gian_thang` | integer | NO |  |
| `slug` | text | NO |  |
| `avatar_id` | text | YES |  |
| `cover_id` | text | YES |  |
| `trang_thai_chuong_trinh` | trang_thai_chuong_trinh_enum | NO | 'dang_tuyen'::trang_thai_chuong_trinh_enum |

### org_tuyen_sinh_nam

| Cột | Kiểu | Null | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `id_truong_nganh` | uuid | NO |  |
| `nam` | integer | NO |  |
| `chi_tieu` | integer | YES |  |
| `diem_chuan` | numeric(4,2) | YES |  |
| `tinh_trang` | tinh_trang_tuyen_sinh_enum | NO | 'sap_mo'::tinh_trang_tuyen_sinh_enum |
| `link_thong_tin` | text | YES |  |
| `ghi_chu` | text | YES |  |
| `ngay_mo_ho_so` | date | YES |  |
| `ngay_dong_ho_so` | date | YES |  |
| `ngay_thi_tu` | date | YES |  |
| `ngay_thi_den` | date | YES |  |
| `ngay_cong_bo_diem` | date | YES |  |
| `ngay_xac_nhan_nhap_hoc_tu` | date | YES |  |
| `ngay_xac_nhan_nhap_hoc_den` | date | YES |  |
| `ghi_chu_timeline` | text | YES |  |
| `so_thi_sinh` | integer | YES |  |

### org_tuyen_dung

| Cột | Kiểu | Null | Default |
|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() |
| `id_to_chuc` | uuid | NO |  |
| `tieu_de` | text | NO |  |
| `mo_ta` | text | YES |  |
| `loai_hinh` | loai_hinh_lam_viec_enum | NO | 'toan_thoi_gian'::loai_hinh_lam_viec_enum |
| `cap_do` | text | YES |  |
| `tinh_thanh` | tinh_thanh_vn_enum | YES |  |
| `lam_tu_xa` | boolean | NO | false |
| `id_linh_vuc` | uuid | YES |  |
| `muc_luong_tu` | integer | YES |  |
| `muc_luong_den` | integer | YES |  |
| `hien_thi_luong` | boolean | NO | false |
| `han_nop` | date | YES |  |
| `trang_thai` | trang_thai_tuyen_dung_enum | NO | 'dang_mo'::trang_thai_tuyen_dung_enum |
| `da_xoa` | boolean | NO | false |
| `tao_luc` | timestamptz | NO | now() |
| `cap_nhat_luc` | timestamptz | NO | now() |

### org_tuyen_dung_ung_tuyen

| Cột | Kiểu | Null | Default |
|---|---|---|---|
| `id_tuyen_dung` | uuid | NO |  |
| `id_nguoi_dung` | uuid | NO |  |
| `thu_ngo` | text | YES |  |
| `trang_thai` | trang_thai_ung_tuyen_enum | NO | 'moi'::trang_thai_ung_tuyen_enum |
| `tao_luc` | timestamptz | NO | now() |

PK: (`id_tuyen_dung`, `id_nguoi_dung`)

### org_scout_luu

| Cột | Kiểu | Null | Default |
|---|---|---|---|
| `id_to_chuc` | uuid | NO |  |
| `id_nguoi_dung` | uuid | NO |  |
| `ghi_chu` | text | YES |  |
| `tao_luc` | timestamptz | NO | now() |

PK: (`id_to_chuc`, `id_nguoi_dung`) — shortlist tài năng org/giảng viên quan tâm (module `scout_tai_nang`).

---

## project_ — Dự án (2 bảng)

### project_dong_gop

| Cột | Kiểu | Null | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `id_du_an` | uuid | NO |  |
| `id_nguoi_dung` | uuid | NO |  |
| `vai_tro` | text | YES |  |
| `nguon` | nguon_dong_gop_enum | NO | 'tu_apply'::nguon_dong_gop_enum |
| `trang_thai` | trang_thai_dong_gop_enum | NO | 'cho_duyet'::trang_thai_dong_gop_enum |
| `nguoi_duyet` | uuid | YES |  |
| `xu_ly_luc` | timestamp with time zone | YES |  |
| `tao_luc` | timestamp with time zone | NO | now() |

### project_du_an

| Cột | Kiểu | Null | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `id_user_owner` | uuid | YES |  |
| `id_to_chuc_owner` | uuid | YES |  |
| `ten` | text | NO |  |
| `slug` | text | NO |  |
| `mo_ta` | text | YES |  |
| `avatar_id` | text | YES |  |
| `cover_id` | text | YES |  |
| `bat_dau` | date | YES |  |
| `ket_thuc` | date | YES |  |
| `trang_thai` | trang_thai_du_an_enum | NO | 'dang_lam'::trang_thai_du_an_enum |
| `loai_du_an` | loai_du_an_enum | YES |  |
| `che_do_hien_thi` | che_do_hien_thi_du_an_enum | NO | 'public'::che_do_hien_thi_du_an_enum |
| `cho_phep_apply` | boolean | NO | false |
| `tao_luc` | timestamp with time zone | NO | now() |
| `cap_nhat_luc` | timestamp with time zone | NO | now() |

---

## social_ — Tương tác (5 bảng · `social_luot_xem` partitioned theo tháng)

### social_binh_luan

| Cột | Kiểu | Null | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `nguoi_binh_luan` | uuid | NO |  |
| `loai_doi_tuong` | loai_doi_tuong_social_enum | NO |  |
| `id_doi_tuong` | uuid | NO |  |
| `noi_dung` | text | NO |  |
| `id_cha` | uuid | YES |  |
| `tao_luc` | timestamp with time zone | NO | now() |
| `cap_nhat_luc` | timestamp with time zone | NO | now() |
| `da_xoa` | boolean | NO | false |

### social_luot_xem  *(partitioned by range, con: `_2026_05`, `_2026_06`)*

| Cột | Kiểu | Null | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `nguoi_xem` | uuid | YES |  |
| `loai_doi_tuong` | loai_doi_tuong_social_enum | NO |  |
| `id_doi_tuong` | uuid | NO |  |
| `tao_luc` | timestamp with time zone | NO | now() |
| `da_xu_ly_hint` | boolean | NO | false |

### social_luu

| Cột | Kiểu | Null | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `id_nguoi_dung` | uuid | NO |  |
| `loai_doi_tuong` | loai_doi_tuong_social_enum | NO |  |
| `id_doi_tuong` | uuid | NO |  |
| `che_do_hien_thi` | che_do_luu_enum | NO | 'private'::che_do_luu_enum |
| `ghi_chu_rieng` | text | YES |  |
| `tao_luc` | timestamp with time zone | NO | now() |

### social_reaction

| Cột | Kiểu | Null | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `id_nguoi_dung` | uuid | NO |  |
| `loai_doi_tuong` | loai_doi_tuong_social_enum | NO |  |
| `id_doi_tuong` | uuid | NO |  |
| `emoji` | text | NO |  |
| `tao_luc` | timestamp with time zone | NO | now() |

### social_thong_bao

| Cột | Kiểu | Null | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `nguoi_nhan` | uuid | NO |  |
| `loai` | text | NO |  |
| `noi_dung` | text | NO |  |
| `noi_dung_ai` | text | YES |  |
| `loai_doi_tuong` | text | YES |  |
| `id_doi_tuong` | uuid | YES |  |
| `da_doc` | boolean | NO | false |
| `tao_luc` | timestamp with time zone | NO | now() |
| `xu_ly_luc` | timestamp with time zone | YES |  |

---

## user_ — Người dùng & quan hệ (8 bảng)

### user_filter_journey

| Cột | Kiểu | Null | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `id_nguoi_dung` | uuid | NO |  |
| `id_nhom_boi_canh` | uuid | YES |  |
| `hien_thi` | boolean | NO | true |
| `ap_dung_cho` | ap_dung_cho_enum | NO |  |

### user_hoc_vien_lop

| Cột | Kiểu | Null | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `id_nguoi_dung` | uuid | NO |  |
| `id_khoa_hoc` | uuid | NO |  |
| `id_lop_hoc` | uuid | YES |  |
| `trang_thai` | trang_thai_hoc_vien_enum | NO | 'da_dang_ky'::trang_thai_hoc_vien_enum |
| `ngay_dang_ky` | date | NO | CURRENT_DATE |
| `ngay_hoan_thanh` | date | YES |  |
| `ket_qua` | text | YES |  |

### user_ket_ban

| Cột | Kiểu | Null | Default |
|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() |
| `id_nguoi_gui` | uuid | NO |  |
| `id_nguoi_nhan` | uuid | NO |  |
| `trang_thai` | text | NO | 'pending'::text |
| `tao_luc` | timestamp with time zone | NO | now() |
| `xu_ly_luc` | timestamp with time zone | YES |  |

### user_linh_vuc

| Cột | Kiểu | Null | Default |
|---|---|---|---|
| `id_nguoi_dung` | uuid | NO |  |
| `id_bai_viet` | uuid | NO |  |
| `tao_luc` | timestamp with time zone | NO | now() |
| `id_linh_vuc` | uuid | YES |  |

### user_nguoi_dung

| Cột | Kiểu | Null | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `auth_user_id` | uuid | YES |  |
| `slug` | text | NO |  |
| `ten_hien_thi` | text | NO |  |
| `avatar_id` | text | YES |  |
| `cover_id` | text | YES |  |
| `bio` | text | YES |  |
| `trang_thai_tai_khoan` | trang_thai_tai_khoan_enum | NO | 'dang_hoat_dong'::trang_thai_tai_khoan_enum |
| `lan_cuoi_active` | timestamp with time zone | YES |  |
| `cho_phep_chat_an_danh` | boolean | NO | true |
| `ai_summary_journey` | text | YES |  |
| `ai_summary_cap_nhat_luc` | timestamp with time zone | YES |  |
| `giai_doan` | giai_doan_enum | YES |  |
| `muc_tieu` | muc_tieu_enum[] | YES |  |
| `ngay_sinh` | date | YES |  |
| `gioi_tinh` | gioi_tinh_enum | YES |  |
| `tinh_thanh` | tinh_thanh_vn_enum | YES |  |
| `dia_chi_chi_tiet` | text | YES |  |
| `email_lien_he` | text | YES |  |
| `so_dien_thoai` | text | YES |  |
| `mxh_links` | jsonb | NO | '[]'::jsonb |
| `theme` | text | YES |  |
| `visibility_ngay_sinh` | visibility_field_enum | NO | 'private'::visibility_field_enum |
| `visibility_gioi_tinh` | visibility_field_enum | NO | 'public'::visibility_field_enum |
| `visibility_dia_chi` | visibility_field_enum | NO | 'private'::visibility_field_enum |
| `visibility_email` | visibility_field_enum | NO | 'private'::visibility_field_enum |
| `visibility_sdt` | visibility_field_enum | NO | 'private'::visibility_field_enum |
| `tao_luc` | timestamp with time zone | NO | now() |
| `journey_loai_moc_visibility` | jsonb | NO | '{}'::jsonb |

### user_quyen_he_thong *(phân quyền cấp hệ thống — migration `migration_user_quyen_he_thong.sql`)*

| Cột | Kiểu | Null | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `id_nguoi_dung` | uuid | NO |  |
| `vai_tro` | vai_tro_he_thong_enum | NO |  |
| `cap_boi` | uuid | YES |  |
| `tao_luc` | timestamptz | NO | now() |
| `cap_nhat_luc` | timestamptz | NO | now() |

> **Ghi chú:** `super_admin` không lưu bảng — suy từ email `info.cins.vn@gmail.com` trong app. `thanh_vien` = không có dòng.

### user_nhom_boi_canh

| Cột | Kiểu | Null | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `id_nguoi_dung` | uuid | YES |  |
| `ten_nhom` | text | NO |  |
| `slug` | text | NO |  |
| `icon` | text | YES |  |
| `thu_tu` | integer | NO | 0 |

### user_thanh_vien_to_chuc

| Cột | Kiểu | Null | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `id_nguoi_dung` | uuid | NO |  |
| `id_to_chuc` | uuid | NO |  |
| `vai_tro` | vai_tro_to_chuc_enum | NO |  |
| `trang_thai` | trang_thai_thanh_vien_enum | NO | 'active'::trang_thai_thanh_vien_enum |
| `tu_ngay` | date | NO | CURRENT_DATE |
| `den_ngay` | date | YES |  |
| `nam_bat_dau` | integer | YES |  |
| `id_nganh` | uuid | YES |  |

### user_theo_doi  *(follow 1 chiều: người/tag/org — `loai_theo_doi_enum`: nguoi_dung/the/to_chuc; L17)*

| Cột | Kiểu | Null | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `id_nguoi_theo_doi` | uuid | NO |  |
| `loai_doi_tuong` | loai_theo_doi_enum | NO |  |
| `id_doi_tuong` | uuid | NO |  |
| `tao_luc` | timestamp with time zone | NO | now() |

---

## vector_ — pgvector embeddings (3 bảng)

### vector_co_dinh

| Cột | Kiểu | Null | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `loai_doi_tuong` | loai_doi_tuong_vector_enum | NO |  |
| `id_doi_tuong` | uuid | NO |  |
| `vector` | vector(6) | NO |  |
| `phien_ban_quy_uoc` | text | NO |  |
| `prompt_hash` | text | NO |  |
| `tinh_luc` | timestamp with time zone | NO | now() |

### vector_dong

| Cột | Kiểu | Null | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `loai_doi_tuong` | loai_doi_tuong_vector_enum | NO |  |
| `id_doi_tuong` | uuid | NO |  |
| `vector` | vector(6) | NO |  |
| `do_tin_cay` | numeric(3,2) | NO | 0.50 |
| `phien_ban_quy_uoc` | text | NO |  |
| `nguon_du_lieu` | nguon_du_lieu_vector_enum | NO | 'ket_hop'::nguon_du_lieu_vector_enum |
| `so_data_point` | integer | NO | 0 |
| `cap_nhat_cuoi` | timestamp with time zone | NO | now() |
| `cap_nhat_tiep` | timestamp with time zone | YES |  |

### vector_hang_doi

| Cột | Kiểu | Null | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `loai_doi_tuong` | loai_doi_tuong_vector_enum | NO |  |
| `id_doi_tuong` | uuid | NO |  |
| `loai_vector` | loai_vector_enum | NO |  |
| `ly_do` | ly_do_vector_enum | YES |  |
| `uu_tien` | integer | NO | 5 |
| `trang_thai` | trang_thai_hang_doi_enum | NO | 'cho'::trang_thai_hang_doi_enum |
| `so_lan_thu` | integer | NO | 0 |
| `loi` | text | YES |  |
| `tao_luc` | timestamp with time zone | NO | now() |
| `bat_dau_xu_ly_luc` | timestamp with time zone | YES |  |
| `hoan_thanh_luc` | timestamp with time zone | YES |  |

---

## verify_ — Xác thực (4 bảng)

### verify_email_token

| Cột | Kiểu | Null | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `id_xac_nhan` | uuid | NO |  |
| `token_hash` | text | NO |  |
| `email_nhan` | text | NO |  |
| `het_han_luc` | timestamp with time zone | NO | (now() + '7 days'::interval) |
| `da_claim_luc` | timestamp with time zone | YES |  |
| `ip_claim` | text | YES |  |
| `tao_luc` | timestamp with time zone | NO | now() |

### verify_tham_du_su_kien

| Cột | Kiểu | Null | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `id_su_kien` | uuid | NO |  |
| `id_nguoi_dung` | uuid | NO |  |
| `nguon_xac_nhan` | nguon_tham_du_enum | NO | 'admin_manual'::nguon_tham_du_enum |
| `nguoi_xac_nhan` | uuid | YES |  |
| `trang_thai` | trang_thai_tham_du_enum | NO | 'cho_xac_nhan'::trang_thai_tham_du_enum |
| `bang_chung` | text | YES |  |
| `tao_luc` | timestamp with time zone | NO | now() |
| `thoi_diem_xac_nhan` | timestamp with time zone | YES |  |

### verify_xac_nhan

| Cột | Kiểu | Null | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `id_cot_moc` | uuid | NO |  |
| `loai_nguoi_xac_nhan` | loai_nguoi_xac_nhan_enum | NO |  |
| `id_nguoi_xac_nhan` | uuid | YES |  |
| `email_external` | text | YES |  |
| `url_proof` | text | YES |  |
| `trang_thai` | trang_thai_xac_nhan_enum | NO | 'cho_duyet'::trang_thai_xac_nhan_enum |
| `bang_chung` | text | YES |  |
| `tao_luc` | timestamp with time zone | NO | now() |
| `xu_ly_luc` | timestamp with time zone | YES |  |

### verify_yeu_cau  *(flow pull — user đẩy yêu cầu, org duyệt; FOUNDATIONS §V)*

| Cột | Kiểu | Null | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `nguoi_yeu_cau` | uuid | NO |  |
| `id_cot_moc` | uuid | NO |  |
| `id_to_chuc` | uuid | NO |  |
| `noi_dung` | text | YES |  |
| `trang_thai` | trang_thai_yeu_cau_enum | NO | 'cho_xu_ly'::trang_thai_yeu_cau_enum |
| `nguoi_xu_ly` | uuid | YES |  |
| `tao_luc` | timestamp with time zone | NO | now() |
| `xu_ly_luc` | timestamp with time zone | YES |  |

---

## ENUM (63)

- `ap_dung_cho_enum` : ban_than / nguoi_xem_khac
- `che_do_hien_thi_du_an_enum` : public / private / chi_thanh_vien
- `che_do_hien_thi_moc_enum` : feature / public / theo_nhom / chi_minh
- `che_do_luu_enum` : private / public
- `giai_doan_enum` : moi_bat_dau / dang_hoc / dang_lam / tim_viec / freelance / dang_day
- `gioi_tinh_enum` : nam / nu / khac / khong_muon_noi
- `he_dao_tao_enum` : dai_hoc / cao_dang / trung_cap / chung_chi
- `hinh_thuc_lop_enum` : truc_tiep / truc_tuyen / ket_hop
- `loai_bai_dang_org_enum` : thong_bao / tuyen_sinh / su_kien / showcase / khac
- `loai_bai_viet_enum` : linh_vuc / nghe / keyword / phan_mem / mon_hoc / blog / event / nganh_dao_tao
- `loai_chan_enum` : cu_the / tat_ca_an_danh / tat_ca_la / org_cu_the
- `loai_co_so_enum` : trung_tam / truong_nghe / co_so_tu_nhan / chi_nhanh
- `loai_doi_tuong_social_enum` : cot_moc / tac_pham / du_an / thao_luan
- `loai_doi_tuong_vector_enum` : user / org / bai_viet / khoa_hoc / linh_vuc
- `loai_hinh_lam_viec_enum` : toan_thoi_gian / ban_thoi_gian / remote / freelance / thuc_tap
- `loai_media_enum` : image / video / audio / pdf / embed
- `loai_mo_hinh_khoa_enum` : cohort_co_dinh / lien_tuc_theo_thang
- `loai_moc_enum` : hoc / lam_viec / du_an / su_kien / thanh_tuu / ca_nhan
- `loai_nguoi_xac_nhan_enum` : to_chuc / nguoi_dung / external_email / system_url
- `loai_nhom_enum` : bo_phan / ky_thuat / nhom_nganh / cap_do
- `loai_phong_chat_enum` : 1_1 / 1_1_an_danh / 1_org / du_an / lop_hoc / su_kien
- `loai_quan_he_enum` : THUOC_LINH_VUC / LIEN_QUAN / DUNG_TRONG_NGHE / TIEN_QUYET / DUNG_TRONG_NGANH
- `loai_su_kien_enum` : workshop / talkshow / trien_lam / contest / meetup / khoa_dao_tao_ngan / tour_cong_ty / tour_truong / open_day / screening / hackathon / career_fair
- `loai_tac_pham_enum` : image / video / comic / ui_prototype / blog_process / audio / 3d_model / bai_viet
- `loai_theo_doi_enum` : nguoi_dung / the / to_chuc
- `loai_tin_nhan_enum` : text / media / system
- `loai_to_chuc_enum` : truong_dai_hoc / co_so_dao_tao / studio / doanh_nghiep / cong_dong  *(doanh_nghiep ẩn UI)*
- `loai_truong_enum` : cong_lap / tu_thuc / dan_lap / co_von_nuoc_ngoai
- `loai_vector_enum` : co_dinh / dong
- `ly_do_vector_enum` : tao_moi / noi_dung_edit / quy_uoc_doi / dinh_ky / member_thay_doi / journey_inferred
- `muc_tieu_enum` : tim_khoa_hoc / tim_viec / tim_collaborator / show_portfolio / hoc_hoi
- `nguon_alias_enum` : admin / ai_merge / user_de_xuat
- `nguon_dong_gop_enum` : tu_apply / duoc_moi
- `nguon_du_lieu_vector_enum` : khai_bao / hanh_vi / ket_hop
- `nguon_goc_moc_enum` : tu_tao / sinh_tu_du_an / sinh_tu_su_kien / sinh_tu_org_assign / sinh_tu_hoc_vien_lop
- `nguon_tham_du_enum` : qr_code / admin_manual / system_checkin
- `ten_phuong_thuc_enum` : xet_diem_thi_thpt / xet_hoc_ba / danh_gia_nang_luc / xet_tuyen_thang / nang_khieu / phong_van / danh_gia_tu_duy / thi_van_hoa_rieng / nang_khieu_ket_hop / chung_chi_sat / chung_chi_act / chung_chi_ib / bang_nuoc_ngoai / v_sat / ket_hop
- `tinh_thanh_vn_enum` : ha_noi / hue / hai_phong / da_nang / hcm / can_tho / cao_bang / lang_son / quang_ninh / dien_bien / lai_chau / son_la / nghe_an / ha_tinh / thanh_hoa / tuyen_quang / lao_cai / thai_nguyen / phu_tho / bac_ninh / hung_yen / ninh_binh / quang_tri / quang_ngai / gia_lai / khanh_hoa / dak_lak / lam_dong / dong_nai / tay_ninh / vinh_long / dong_thap / an_giang / ca_mau  *(34 tỉnh — quy hoạch mới)*
- `tinh_thanh_vn_enum_old` : *(63 tỉnh cũ — legacy, KHÔNG dùng)*
- `tinh_trang_tuyen_sinh_enum` : sap_mo / dang_mo / da_dong / co_ket_qua
- `trang_thai_bai_dang_enum` : nhap / da_dang / archived
- `trang_thai_chuong_trinh_enum` : dang_tuyen / tam_dung / ngung_dao_tao
- `trang_thai_dang_ky_su_kien_enum` : cho_duyet / da_duyet / tu_choi / huy
- `trang_thai_de_xuat_enum` : cho_review / da_duyet / tu_choi
- `trang_thai_dong_gop_enum` : cho_duyet / da_duyet / tu_choi
- `trang_thai_du_an_enum` : dang_lam / hoan_thanh / tam_dung / huy
- `trang_thai_hang_doi_enum` : cho / dang_xu_ly / hoan_thanh / loi
- `trang_thai_hoat_dong_enum` : dang_hoat_dong / tam_ngung / da_dong_cua
- `trang_thai_hoc_vien_enum` : da_dang_ky / dang_hoc / da_hoan_thanh / da_bo_hoc / tam_nghi
- `trang_thai_khoa_hoc_enum` : sap_khai_giang / dang_mo_don / dang_hoc / da_ket_thuc / tam_dung
- `trang_thai_lop_enum` : sap_khai_giang / dang_hoc / da_ket_thuc / huy
- `trang_thai_noi_dung_enum` : cho_review / dang_viet / published / archived / merged
- `trang_thai_tai_khoan_enum` : dang_hoat_dong / tam_dung / da_xoa / bi_khoa
- `trang_thai_tham_du_enum` : cho_xac_nhan / da_xac_nhan / tu_choi
- `trang_thai_thanh_vien_enum` : active / left / pending / rejected
- `trang_thai_tin_cay_enum` : binh_thuong / dang_review / bi_canh_bao / bi_cam / verified_official
- `trang_thai_tuyen_dung_enum` : nhap / dang_mo / da_dong
- `trang_thai_ung_tuyen_enum` : moi / dang_xem / phu_hop / tu_choi / da_nhan
- `trang_thai_xac_nhan_enum` : cho_duyet / da_xac_nhan / tu_choi
- `trang_thai_yeu_cau_enum` : cho_xu_ly / da_duyet / tu_choi
- `trinh_do_dau_vao_enum` : co_ban / trung_cap / nang_cao / khong_yeu_cau
- `vai_tro_chat_enum` : admin / thanh_vien
- `vai_tro_to_chuc_enum` : owner / admin / giao_vien / nhan_vien / hoc_vien / thanh_vien / quan_ly_tuyen_sinh / quan_ly_noi_dung
- `vai_tro_he_thong_enum` : admin / curator *(thanh_vien = không có dòng; super_admin = email app)*
- `visibility_field_enum` : public / friends / private
- `visibility_giao_trinh_enum` : public / chi_hoc_vien / private

---

## FOREIGN KEYS

> **Tổng 118 FK** (theo Query 0). Danh sách dưới là phần đã dump được; paste Query 3 **bị cắt ngang ở `user_linh_vuc`** — còn ~20 FK chưa liệt kê (nhánh `user_nguoi_dung.auth_user_id`, `user_thanh_vien_to_chuc`, `vector_*`, `verify_*`, `user_theo_doi`, `social_*` còn lại…). Chạy lại Query 3 đầy đủ để bổ sung.

| Bảng | Cột | → | Tham chiếu |
|---|---|---|---|
| `article_alias` | `id_bai_viet` | → | `article_bai_viet` |
| `article_bai_viet` | `merged_vao_id` | → | `article_bai_viet` |
| `article_bai_viet` | `id_linh_vuc` | → | `linh_vuc` |
| `article_de_xuat` | `id_bai_viet_da_tao` | → | `article_bai_viet` |
| `article_de_xuat` | `nguoi_de_xuat` | → | `user_nguoi_dung` |
| `article_de_xuat` | `admin_review` | → | `user_nguoi_dung` |
| `article_gan_cot_moc` | `id_bai_viet` | → | `article_bai_viet` |
| `article_gan_cot_moc` | `id_cot_moc` | → | `content_cot_moc` |
| `article_gan_du_an` | `id_du_an` | → | `project_du_an` |
| `article_gan_du_an` | `id_bai_viet` | → | `article_bai_viet` |
| `article_gan_nhom` | `id_bai_viet` | → | `article_bai_viet` |
| `article_gan_nhom` | `id_nhom` | → | `article_nhom` |
| `article_gan_tac_pham` | `id_tac_pham` | → | `content_tac_pham` |
| `article_gan_tac_pham` | `id_bai_viet` | → | `article_bai_viet` |
| `article_lien_quan` | `id_bai_viet_a` | → | `article_bai_viet` |
| `article_lien_quan` | `id_bai_viet_b` | → | `article_bai_viet` |
| `chat_chan` | `id_nguoi_bi_chan` | → | `user_nguoi_dung` |
| `chat_chan` | `id_nguoi_chan` | → | `user_nguoi_dung` |
| `chat_da_doc` | `id_tin_nhan_cuoi_doc` | → | `chat_tin_nhan` |
| `chat_da_doc` | `id_phong` | → | `chat_phong` |
| `chat_da_doc` | `id_nguoi_dung` | → | `user_nguoi_dung` |
| `chat_phong` | `id_org_dai_dien` | → | `org_to_chuc` |
| `chat_thanh_vien` | `id_nguoi_dung` | → | `user_nguoi_dung` |
| `chat_thanh_vien` | `id_phong` | → | `chat_phong` |
| `chat_tin_nhan` | `id_tin_tra_loi` | → | `chat_tin_nhan` |
| `chat_tin_nhan` | `id_dinh_kem` | → | `content_media` |
| `chat_tin_nhan` | `id_phong` | → | `chat_phong` |
| `chat_tin_nhan` | `id_nguoi_gui` | → | `user_nguoi_dung` |
| `content_cot_moc` | `id_nhom_boi_canh` | → | `user_nhom_boi_canh` |
| `content_cot_moc` | `id_du_an` | → | `project_du_an` |
| `content_cot_moc` | `id_nguoi_dung` | → | `user_nguoi_dung` |
| `content_cot_moc` | `id_su_kien` | → | `org_su_kien` |
| `content_cot_moc` | `id_to_chuc` | → | `org_to_chuc` |
| `content_cot_moc` | `id_truong_nganh` | → | `org_truong_nganh` |
| `content_cot_moc` | `id_lop_hoc` | → | `org_lop_hoc` |
| `content_cot_moc` | `id_khoa_hoc` | → | `org_khoa_hoc` |
| `content_media` | `id_tac_pham` | → | `content_tac_pham` |
| `content_tac_pham` | `id_nguoi_dung` | → | `user_nguoi_dung` |
| `content_tac_pham_tac_gia` | `id_tac_pham` | → | `content_tac_pham` |
| `content_tac_pham_tac_gia` | `id_nguoi_dung` | → | `user_nguoi_dung` |
| `content_tac_pham_thuoc_moc` | `id_tac_pham` | → | `content_tac_pham` |
| `content_tac_pham_thuoc_moc` | `id_cot_moc` | → | `content_cot_moc` |
| `cong_dong_filter_gan` | `id_cot_moc` | → | `content_cot_moc` |
| `cong_dong_filter_gan` | `id_filter` | → | `cong_dong_filter` |
| `edu_module_mon` | `id_module` | → | `edu_module_tinh_diem` |
| `edu_module_mon` | `id_slot` | → | `edu_to_hop_mon_chi_tiet` |
| `edu_mon_thi` | `id_bai_viet` | → | `article_bai_viet` |
| `edu_to_hop_mon_chi_tiet` | `id_to_hop_mon` | → | `edu_to_hop_mon` |
| `org_bai_dang` | `id_to_chuc` | → | `org_to_chuc` |
| `org_bai_dang_tag` | `id_bai_dang` | → | `org_bai_dang` |
| `org_bai_dang_tag` | `id_bai_viet` | → | `article_bai_viet` |
| `org_cau_hinh_khoi` | `id_to_chuc` | → | `org_to_chuc` |
| `org_cau_hinh_khoi` | `id_module` | → | `edu_module_tinh_diem` |
| `org_cau_hinh_khoi` | `id_truong_nganh` | → | `org_truong_nganh` |
| `org_cau_hinh_khoi` | `id_to_hop_mon` | → | `edu_to_hop_mon` |
| `org_cau_hinh_mon` | `id_cau_hinh_khoi` | → | `org_cau_hinh_khoi` |
| `org_cau_hinh_mon` | `id_slot` | → | `edu_to_hop_mon_chi_tiet` |
| `org_cau_hinh_mon` | `id_mon_thi` | → | `edu_mon_thi` |
| `org_co_so_dao_tao` | `id_to_chuc` | → | `org_to_chuc` |
| `org_dang_ky_su_kien` | `id_su_kien` | → | `org_su_kien` |
| `org_dang_ky_su_kien` | `id_nguoi_dung` | → | `user_nguoi_dung` |
| `org_giao_trinh` | `id_khoa_hoc` | → | `org_khoa_hoc` |
| `org_hinh_anh` | `id_to_chuc` | → | `org_to_chuc` |
| `org_khoa_hoc` | `id_to_chuc` | → | `org_to_chuc` |
| `org_lop_hoc` | `id_khoa_hoc` | → | `org_khoa_hoc` |
| `org_lop_hoc` | `giao_vien_phu_trach` | → | `user_nguoi_dung` |
| `org_phuong_thuc_xet_tuyen` | `id_to_hop_mon` | → | `edu_to_hop_mon` |
| `org_phuong_thuc_xet_tuyen` | `id_cau_hinh_khoi` | → | `org_cau_hinh_khoi` |
| `org_phuong_thuc_xet_tuyen` | `id_tuyen_sinh_nam` | → | `org_tuyen_sinh_nam` |
| `org_su_kien` | `id_to_chuc` | → | `org_to_chuc` |
| `org_to_chuc` | `nguoi_tao` | → | `user_nguoi_dung` |
| `org_truong_dai_hoc` | `id_to_chuc` | → | `org_to_chuc` |
| `org_truong_nganh` | `id_to_chuc` | → | `org_to_chuc` |
| `org_truong_nganh` | `id_nganh` | → | `article_bai_viet` |
| `org_tuyen_sinh_nam` | `id_truong_nganh` | → | `org_truong_nganh` |
| `project_dong_gop` | `id_du_an` | → | `project_du_an` |
| `project_dong_gop` | `id_nguoi_dung` | → | `user_nguoi_dung` |
| `project_dong_gop` | `nguoi_duyet` | → | `user_nguoi_dung` |
| `project_du_an` | `id_to_chuc_owner` | → | `org_to_chuc` |
| `project_du_an` | `id_user_owner` | → | `user_nguoi_dung` |
| `social_binh_luan` | `nguoi_binh_luan` | → | `user_nguoi_dung` |
| `social_binh_luan` | `id_cha` | → | `social_binh_luan` |
| `social_luot_xem` | `nguoi_xem` | → | `user_nguoi_dung` |
| `social_luu` | `id_nguoi_dung` | → | `user_nguoi_dung` |
| `social_reaction` | `id_nguoi_dung` | → | `user_nguoi_dung` |
| `social_thong_bao` | `nguoi_nhan` | → | `user_nguoi_dung` |
| `user_filter_journey` | `id_nguoi_dung` | → | `user_nguoi_dung` |
| `user_filter_journey` | `id_nhom_boi_canh` | → | `user_nhom_boi_canh` |
| `user_hoc_vien_lop` | `id_lop_hoc` | → | `org_lop_hoc` |
| `user_hoc_vien_lop` | `id_khoa_hoc` | → | `org_khoa_hoc` |
| `user_hoc_vien_lop` | `id_nguoi_dung` | → | `user_nguoi_dung` |
| `user_ket_ban` | `id_nguoi_nhan` | → | `user_nguoi_dung` |
| `user_ket_ban` | `id_nguoi_gui` | → | `user_nguoi_dung` |
| `user_linh_vuc` | `id_nguoi_dung` | → | `user_nguoi_dung` |
| *…(paste bị cắt — chạy lại Query 3 để bổ sung ~20 FK còn lại)* | | | |
