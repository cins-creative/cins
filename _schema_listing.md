# Schema listing (public) — 2026-07-24T00:59:46.733Z
Logic tables: **121** (không tính partition con)

## Tables
### `article_alias`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | uuid_generate_v4() |
| `id_bai_viet` | `uuid` | NO |  |
| `ten_alias` | `text` | NO |  |
| `nguon` | `nguon_alias_enum` | NO | 'admin'::nguon_alias_enum |

FK:
- `id_bai_viet` → `article_bai_viet.id`

### `article_bai_viet`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | uuid_generate_v4() |
| `slug` | `text` | NO |  |
| `tieu_de` | `text` | NO |  |
| `tieu_de_eng` | `text` | YES |  |
| `loai_bai_viet` | `loai_bai_viet_enum` | NO |  |
| `tom_tat` | `text` | YES |  |
| `cover_id` | `text` | YES |  |
| `noi_dung` | `text` | YES |  |
| `meta` | `jsonb` | YES |  |
| `trang_thai_noi_dung` | `trang_thai_noi_dung_enum` | NO | 'cho_review'::trang_thai_noi_dung_enum |
| `merged_vao_id` | `uuid` | YES |  |
| `luot_xem` | `int4` | NO | 0 |
| `meta_title` | `text` | YES |  |
| `meta_description` | `text` | YES |  |
| `tao_luc` | `timestamptz` | NO | now() |
| `cap_nhat_luc` | `timestamptz` | NO | now() |
| `tieu_de_viet` | `text` | YES |  |
| `main_video` | `text` | YES |  |
| `thumbnail` | `text` | YES |  |
| `id_linh_vuc` | `uuid` | YES |  |
| `da_verify` | `bool` | NO | false |
| `id_tac_gia_chinh` | `uuid` | YES |  |
| `so_nguoi_dong_gop` | `int4` | NO | 0 |

FK:
- `id_linh_vuc` → `linh_vuc.id`
- `id_tac_gia_chinh` → `user_nguoi_dung.id`
- `merged_vao_id` → `article_bai_viet.id`

### `article_de_xuat`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | uuid_generate_v4() |
| `ten_de_xuat` | `text` | NO |  |
| `context_de_xuat` | `text` | YES |  |
| `nguoi_de_xuat` | `uuid` | NO |  |
| `id_bai_viet_da_tao` | `uuid` | YES |  |
| `trang_thai` | `trang_thai_de_xuat_enum` | NO | 'cho_review'::trang_thai_de_xuat_enum |
| `ket_qua_phan_loai_ai` | `jsonb` | YES |  |
| `admin_review` | `uuid` | YES |  |
| `ghi_chu_admin` | `text` | YES |  |
| `tao_luc` | `timestamptz` | NO | now() |

FK:
- `admin_review` → `user_nguoi_dung.id`
- `id_bai_viet_da_tao` → `article_bai_viet.id`
- `nguoi_de_xuat` → `user_nguoi_dung.id`

### `article_dong_gop`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | gen_random_uuid() |
| `id_bai_viet` | `uuid` | NO |  |
| `id_nguoi_dong_gop` | `uuid` | NO |  |
| `noi_dung` | `text` | YES |  |
| `trang_thai` | `text` | NO | 'nhap'::text |
| `ghi_chu_duyet` | `text` | YES |  |
| `id_nguoi_duyet` | `uuid` | YES |  |
| `tao_luc` | `timestamptz` | NO | now() |
| `cap_nhat_luc` | `timestamptz` | NO | now() |
| `duyet_luc` | `timestamptz` | YES |  |
| `da_xoa` | `bool` | NO | false |
| `hien_thi` | `bool` | NO | true |

FK:
- `id_bai_viet` → `article_bai_viet.id`
- `id_nguoi_dong_gop` → `user_nguoi_dung.id`
- `id_nguoi_duyet` → `user_nguoi_dung.id`

### `article_dong_gop_binh_luan`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | gen_random_uuid() |
| `id_dong_gop` | `uuid` | NO |  |
| `id_nguoi_binh_luan` | `uuid` | NO |  |
| `id_cha` | `uuid` | YES |  |
| `noi_dung` | `text` | NO |  |
| `tao_luc` | `timestamptz` | NO | now() |
| `cap_nhat_luc` | `timestamptz` | NO | now() |
| `da_xoa` | `bool` | NO | false |

FK:
- `id_cha` → `article_dong_gop_binh_luan.id`
- `id_dong_gop` → `article_dong_gop.id`
- `id_nguoi_binh_luan` → `user_nguoi_dung.id`

### `article_gan_cot_moc`
PK: `id_bai_viet, id_cot_moc`

| column | type | null | default |
|---|---|---|---|
| `id_bai_viet` | `uuid` | NO |  |
| `id_cot_moc` | `uuid` | NO |  |
| `tao_luc` | `timestamptz` | NO | now() |

FK:
- `id_bai_viet` → `article_bai_viet.id`
- `id_cot_moc` → `content_cot_moc.id`

### `article_gan_du_an`
PK: `id_du_an, id_bai_viet`

| column | type | null | default |
|---|---|---|---|
| `id_du_an` | `uuid` | NO |  |
| `id_bai_viet` | `uuid` | NO |  |
| `tao_luc` | `timestamptz` | NO | now() |

FK:
- `id_bai_viet` → `article_bai_viet.id`
- `id_du_an` → `project_du_an.id`

### `article_gan_nhom`
PK: `id_bai_viet, id_nhom`

| column | type | null | default |
|---|---|---|---|
| `id_bai_viet` | `uuid` | NO |  |
| `id_nhom` | `uuid` | NO |  |

FK:
- `id_bai_viet` → `article_bai_viet.id`
- `id_nhom` → `article_nhom.id`

### `article_gan_tac_pham`
PK: `id_bai_viet, id_tac_pham`

| column | type | null | default |
|---|---|---|---|
| `id_bai_viet` | `uuid` | NO |  |
| `id_tac_pham` | `uuid` | NO |  |
| `tao_luc` | `timestamptz` | NO | now() |

FK:
- `id_bai_viet` → `article_bai_viet.id`
- `id_tac_pham` → `content_tac_pham.id`

### `article_lien_quan`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | uuid_generate_v4() |
| `id_bai_viet_a` | `uuid` | NO |  |
| `id_bai_viet_b` | `uuid` | NO |  |
| `loai_quan_he` | `loai_quan_he_enum` | NO |  |
| `cap_do` | `text` | YES |  |

FK:
- `id_bai_viet_a` → `article_bai_viet.id`
- `id_bai_viet_b` → `article_bai_viet.id`

### `article_nhom`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | uuid_generate_v4() |
| `slug` | `text` | NO |  |
| `ten` | `text` | NO |  |
| `mo_ta` | `text` | YES |  |
| `loai_nhom` | `loai_nhom_enum` | NO |  |
| `thu_tu` | `int4` | NO | 0 |

### `article_quyen_tham_dinh`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | gen_random_uuid() |
| `id_nguoi_dung` | `uuid` | NO |  |
| `pham_vi` | `text` | NO |  |
| `id_linh_vuc` | `uuid` | YES |  |
| `id_bai_viet` | `uuid` | YES |  |
| `cap_boi` | `uuid` | YES |  |
| `tao_luc` | `timestamptz` | NO | now() |
| `da_xoa` | `bool` | NO | false |

FK:
- `cap_boi` → `user_nguoi_dung.id`
- `id_bai_viet` → `article_bai_viet.id`
- `id_linh_vuc` → `linh_vuc.id`
- `id_nguoi_dung` → `user_nguoi_dung.id`

### `article_tac_gia`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | gen_random_uuid() |
| `id_bai_viet` | `uuid` | NO |  |
| `id_nguoi_dung` | `uuid` | NO |  |
| `id_dong_gop` | `uuid` | YES |  |
| `vai_tro` | `text` | NO | 'dong_gop'::text |
| `la_hien_tai` | `bool` | NO | false |
| `tao_luc` | `timestamptz` | NO | now() |

FK:
- `id_bai_viet` → `article_bai_viet.id`
- `id_dong_gop` → `article_dong_gop.id`
- `id_nguoi_dung` → `user_nguoi_dung.id`

### `chat_binh_chon`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | uuid_generate_v4() |
| `id_phong` | `uuid` | NO |  |
| `id_tin_nhan` | `uuid` | NO |  |
| `cau_hoi` | `text` | NO |  |
| `cho_nhieu` | `bool` | NO | false |
| `id_nguoi_tao` | `uuid` | NO |  |
| `tao_luc` | `timestamptz` | NO | now() |

FK:
- `id_nguoi_tao` → `user_nguoi_dung.id`
- `id_phong` → `chat_phong.id`
- `id_tin_nhan` → `chat_tin_nhan.id`

### `chat_binh_chon_lua_chon`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | uuid_generate_v4() |
| `id_binh_chon` | `uuid` | NO |  |
| `noi_dung` | `text` | NO |  |
| `thu_tu` | `int4` | NO | 0 |

FK:
- `id_binh_chon` → `chat_binh_chon.id`

### `chat_binh_chon_phieu`
PK: `id_binh_chon, id_nguoi_dung`

| column | type | null | default |
|---|---|---|---|
| `id_binh_chon` | `uuid` | NO |  |
| `id_nguoi_dung` | `uuid` | NO |  |
| `id_lua_chon` | `uuid` | NO |  |
| `tao_luc` | `timestamptz` | NO | now() |

FK:
- `id_binh_chon` → `chat_binh_chon.id`
- `id_lua_chon` → `chat_binh_chon_lua_chon.id`
- `id_nguoi_dung` → `user_nguoi_dung.id`

### `chat_canvas`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | uuid_generate_v4() |
| `id_phong` | `uuid` | NO |  |
| `ten` | `text` | NO | 'Bảng ý tưởng'::text |
| `mo_ta` | `text` | YES |  |
| `trang_thai` | `text` | NO | 'active'::text |
| `id_nguoi_tao` | `uuid` | NO |  |
| `tao_luc` | `timestamptz` | NO | now() |
| `cap_nhat_luc` | `timestamptz` | NO | now() |

FK:
- `id_nguoi_tao` → `user_nguoi_dung.id`
- `id_phong` → `chat_phong.id`

### `chat_canvas_node`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | uuid_generate_v4() |
| `id_canvas` | `uuid` | NO |  |
| `loai` | `text` | NO |  |
| `id_tin_nhan` | `uuid` | YES |  |
| `url` | `text` | YES |  |
| `noi_dung` | `text` | YES |  |
| `layout` | `jsonb` | NO | '{}'::jsonb |
| `id_nguoi_tao` | `uuid` | NO |  |
| `tao_luc` | `timestamptz` | NO | now() |
| `cap_nhat_luc` | `timestamptz` | NO | now() |

FK:
- `id_canvas` → `chat_canvas.id`
- `id_nguoi_tao` → `user_nguoi_dung.id`
- `id_tin_nhan` → `chat_tin_nhan.id`

### `chat_canvas_tin_an`
PK: `id_canvas, id_tin_nhan`

| column | type | null | default |
|---|---|---|---|
| `id_canvas` | `uuid` | NO |  |
| `id_tin_nhan` | `uuid` | NO |  |
| `id_nguoi_an` | `uuid` | NO |  |
| `tao_luc` | `timestamptz` | NO | now() |

FK:
- `id_canvas` → `chat_canvas.id`
- `id_nguoi_an` → `user_nguoi_dung.id`
- `id_tin_nhan` → `chat_tin_nhan.id`

### `chat_chan`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | uuid_generate_v4() |
| `id_nguoi_chan` | `uuid` | NO |  |
| `id_nguoi_bi_chan` | `uuid` | YES |  |
| `loai_chan` | `loai_chan_enum` | NO |  |
| `ly_do` | `text` | YES |  |
| `tao_luc` | `timestamptz` | NO | now() |

FK:
- `id_nguoi_bi_chan` → `user_nguoi_dung.id`
- `id_nguoi_chan` → `user_nguoi_dung.id`

### `chat_da_doc`
PK: `id_phong, id_nguoi_dung`

| column | type | null | default |
|---|---|---|---|
| `id_phong` | `uuid` | NO |  |
| `id_nguoi_dung` | `uuid` | NO |  |
| `id_tin_nhan_cuoi_doc` | `uuid` | NO |  |
| `cap_nhat_luc` | `timestamptz` | NO | now() |

FK:
- `id_nguoi_dung` → `user_nguoi_dung.id`
- `id_phong` → `chat_phong.id`
- `id_tin_nhan_cuoi_doc` → `chat_tin_nhan.id`

### `chat_ghim`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | uuid_generate_v4() |
| `id_phong` | `uuid` | NO |  |
| `id_tin_nhan` | `uuid` | NO |  |
| `id_nguoi_ghim` | `uuid` | NO |  |
| `ghim_luc` | `timestamptz` | NO | now() |

FK:
- `id_nguoi_ghim` → `user_nguoi_dung.id`
- `id_phong` → `chat_phong.id`
- `id_tin_nhan` → `chat_tin_nhan.id`

### `chat_moc`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | uuid_generate_v4() |
| `id_phong` | `uuid` | NO |  |
| `ten` | `text` | NO |  |
| `mo_ta` | `text` | YES |  |
| `thoi_diem` | `timestamptz` | NO |  |
| `url` | `text` | YES |  |
| `id_nguoi_tao` | `uuid` | NO |  |
| `tao_luc` | `timestamptz` | NO | now() |
| `cap_nhat_luc` | `timestamptz` | NO | now() |
| `nhac_truoc_phut` | `int4` | NO | 1440 |
| `id_tin_tao` | `uuid` | YES |  |
| `id_tin_nhac_truoc` | `uuid` | YES |  |
| `id_tin_den_han` | `uuid` | YES |  |

FK:
- `id_nguoi_tao` → `user_nguoi_dung.id`
- `id_phong` → `chat_phong.id`
- `id_tin_den_han` → `chat_tin_nhan.id`
- `id_tin_nhac_truoc` → `chat_tin_nhan.id`
- `id_tin_tao` → `chat_tin_nhan.id`

### `chat_phong`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | uuid_generate_v4() |
| `loai_phong` | `loai_phong_chat_enum` | NO |  |
| `loai_context` | `text` | YES |  |
| `id_context` | `uuid` | YES |  |
| `id_org_dai_dien` | `uuid` | YES |  |
| `tao_luc` | `timestamptz` | NO | now() |
| `cap_nhat_luc` | `timestamptz` | NO | now() |
| `ten_phong` | `text` | YES |  |
| `avatar_id` | `text` | YES |  |
| `ma_moi` | `text` | YES |  |
| `id_phong_cha` | `uuid` | YES |  |
| `trang_thai` | `text` | NO | 'active'::text |

FK:
- `id_org_dai_dien` → `org_to_chuc.id`
- `id_phong_cha` → `chat_phong.id`

### `chat_thanh_vien`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | uuid_generate_v4() |
| `id_phong` | `uuid` | NO |  |
| `id_nguoi_dung` | `uuid` | NO |  |
| `vai_tro` | `vai_tro_chat_enum` | NO | 'thanh_vien'::vai_tro_chat_enum |
| `an_danh` | `bool` | NO | false |
| `tham_gia_luc` | `timestamptz` | NO | now() |
| `roi_luc` | `timestamptz` | YES |  |

FK:
- `id_nguoi_dung` → `user_nguoi_dung.id`
- `id_phong` → `chat_phong.id`

### `chat_the_gan`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | uuid_generate_v4() |
| `id_the` | `uuid` | NO |  |
| `id_tin_nhan` | `uuid` | NO |  |
| `id_nguoi_gan` | `uuid` | NO |  |
| `tao_luc` | `timestamptz` | NO | now() |

FK:
- `id_nguoi_gan` → `user_nguoi_dung.id`
- `id_the` → `chat_the_tai_nguyen.id`
- `id_tin_nhan` → `chat_tin_nhan.id`

### `chat_the_tai_nguyen`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | uuid_generate_v4() |
| `id_phong` | `uuid` | NO |  |
| `ten` | `text` | NO |  |
| `slug` | `text` | NO |  |
| `mau` | `text` | YES |  |
| `thu_tu` | `int4` | NO | 0 |
| `id_nguoi_tao` | `uuid` | NO |  |
| `tao_luc` | `timestamptz` | NO | now() |

FK:
- `id_nguoi_tao` → `user_nguoi_dung.id`
- `id_phong` → `chat_phong.id`

### `chat_tin_nhan`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | uuid_generate_v4() |
| `id_phong` | `uuid` | NO |  |
| `id_nguoi_gui` | `uuid` | NO |  |
| `noi_dung` | `text` | YES |  |
| `loai_tin` | `loai_tin_nhan_enum` | NO | 'text'::loai_tin_nhan_enum |
| `id_dinh_kem` | `uuid` | YES |  |
| `id_tin_tra_loi` | `uuid` | YES |  |
| `tao_luc` | `timestamptz` | NO | now() |
| `da_xoa` | `bool` | NO | false |
| `sua_luc` | `timestamptz` | YES |  |
| `da_sua` | `bool` | NO | false |
| `ngu_canh` | `jsonb` | YES |  |

FK:
- `id_dinh_kem` → `content_media.id`
- `id_nguoi_gui` → `user_nguoi_dung.id`
- `id_phong` → `chat_phong.id`
- `id_tin_tra_loi` → `chat_tin_nhan.id`

### `chat_yeu_cau_tham_gia`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | gen_random_uuid() |
| `id_phong` | `uuid` | NO |  |
| `id_nguoi_dung` | `uuid` | NO |  |
| `trang_thai` | `text` | NO | 'pending'::text |
| `tao_luc` | `timestamptz` | NO | now() |
| `xu_ly_luc` | `timestamptz` | YES |  |

FK:
- `id_nguoi_dung` → `user_nguoi_dung.id`
- `id_phong` → `chat_phong.id`

### `cins_huong_dan`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | gen_random_uuid() |
| `nhom_slug` | `text` | NO |  |
| `nhom_ten` | `text` | NO |  |
| `nhom_thu_tu` | `int4` | NO | 0 |
| `slug` | `text` | NO |  |
| `tieu_de` | `text` | NO |  |
| `video_url` | `text` | YES |  |
| `noi_dung_html` | `text` | NO | ''::text |
| `thu_tu` | `int4` | NO | 0 |
| `da_xuat_ban` | `bool` | NO | false |
| `da_xoa` | `bool` | NO | false |
| `id_nguoi_sua` | `uuid` | YES |  |
| `tao_luc` | `timestamptz` | NO | now() |
| `sua_luc` | `timestamptz` | NO | now() |

FK:
- `id_nguoi_sua` → `user_nguoi_dung.id`

### `cong_dong_filter`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | gen_random_uuid() |
| `loai_context` | `text` | NO | 'cong_dong'::text |
| `id_context` | `uuid` | NO |  |
| `ten` | `text` | NO |  |
| `slug` | `text` | NO |  |
| `mau` | `text` | YES |  |
| `icon` | `text` | YES |  |
| `thu_tu` | `int2` | NO | 0 |
| `tao_luc` | `timestamptz` | NO | now() |

### `cong_dong_filter_gan`
PK: `id_cot_moc, id_filter`

| column | type | null | default |
|---|---|---|---|
| `id_cot_moc` | `uuid` | NO |  |
| `id_filter` | `uuid` | NO |  |

FK:
- `id_cot_moc` → `content_cot_moc.id`
- `id_filter` → `cong_dong_filter.id`

### `content_cot_moc`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | uuid_generate_v4() |
| `id_nguoi_dung` | `uuid` | NO |  |
| `loai_moc` | `loai_moc_enum` | NO |  |
| `nguon_goc` | `nguon_goc_moc_enum` | NO | 'tu_tao'::nguon_goc_moc_enum |
| `tieu_de` | `text` | NO |  |
| `mo_ta` | `text` | YES |  |
| `thoi_diem` | `date` | NO |  |
| `che_do_hien_thi` | `che_do_hien_thi_moc_enum` | NO | 'public'::che_do_hien_thi_moc_enum |
| `id_nhom_boi_canh` | `uuid` | YES |  |
| `id_du_an` | `uuid` | YES |  |
| `id_su_kien` | `uuid` | YES |  |
| `id_to_chuc` | `uuid` | YES |  |
| `id_truong_nganh` | `uuid` | YES |  |
| `id_lop_hoc` | `uuid` | YES |  |
| `id_khoa_hoc` | `uuid` | YES |  |
| `tao_luc` | `timestamptz` | NO | now() |
| `cap_nhat_luc` | `timestamptz` | NO | now() |
| `ghim` | `bool` | NO | false |

FK:
- `id_du_an` → `project_du_an.id`
- `id_khoa_hoc` → `org_khoa_hoc.id`
- `id_lop_hoc` → `org_lop_hoc.id`
- `id_nguoi_dung` → `user_nguoi_dung.id`
- `id_nhom_boi_canh` → `user_nhom_boi_canh.id`
- `id_su_kien` → `org_su_kien.id`
- `id_to_chuc` → `org_to_chuc.id`
- `id_truong_nganh` → `org_truong_nganh.id`

### `content_cot_moc_hien_thi_ngoai_le`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | gen_random_uuid() |
| `id_cot_moc` | `uuid` | NO |  |
| `id_nguoi_dung` | `uuid` | NO |  |
| `loai` | `text` | NO |  |
| `tao_luc` | `timestamptz` | NO | now() |

FK:
- `id_cot_moc` → `content_cot_moc.id`
- `id_nguoi_dung` → `user_nguoi_dung.id`

### `content_diem_feed`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | gen_random_uuid() |
| `loai_doi_tuong` | `text` | NO |  |
| `id_doi_tuong` | `uuid` | NO |  |
| `diem_co_ban` | `int2` | NO | 40 |
| `diem_noi_dung` | `int2` | NO | 0 |
| `diem_verify` | `int2` | NO | 0 |
| `diem_engagement` | `int2` | NO | 0 |
| `engagement_can_tinh_lai` | `bool` | NO | false |
| `bat_dau_luc` | `timestamptz` | NO | now() |
| `day_boi` | `uuid` | YES |  |
| `day_luc` | `timestamptz` | YES |  |
| `tao_luc` | `timestamptz` | NO | now() |
| `cap_nhat_luc` | `timestamptz` | NO | now() |
| `diem_uu_tien` | `int2` | NO | 0 |

FK:
- `day_boi` → `user_nguoi_dung.id`

### `content_feed_score_cau_hinh`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `int2` | NO | 1 |
| `base` | `int2` | NO | 40 |
| `boost_reset_score` | `int2` | NO | 100 |
| `verified` | `int2` | NO | 20 |
| `max_content` | `int2` | NO | 20 |
| `max_engagement` | `int2` | NO | 20 |
| `max_total` | `int2` | NO | 100 |
| `max_total_verified` | `int2` | NO | 120 |
| `decay_hours` | `int2` | NO | 168 |
| `content_text_min_chars` | `int2` | NO | 50 |
| `content_part` | `int2` | NO | 5 |
| `engagement_reaction` | `int2` | NO | 1 |
| `engagement_comment` | `int2` | NO | 2 |
| `engagement_luu` | `int2` | NO | 3 |
| `cap_nhat_boi` | `uuid` | YES |  |
| `tao_luc` | `timestamptz` | NO | now() |
| `cap_nhat_luc` | `timestamptz` | NO | now() |

FK:
- `cap_nhat_boi` → `user_nguoi_dung.id`

### `content_feed_score_phien_ban`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | gen_random_uuid() |
| `so_phien` | `int4` | NO |  |
| `cau_hinh` | `jsonb` | NO |  |
| `ly_do` | `text` | NO |  |
| `loai` | `text` | NO | 'luu'::text |
| `id_phien_goc` | `uuid` | YES |  |
| `tao_boi` | `uuid` | YES |  |
| `tao_luc` | `timestamptz` | NO | now() |

FK:
- `id_phien_goc` → `content_feed_score_phien_ban.id`
- `tao_boi` → `user_nguoi_dung.id`

### `content_media`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | uuid_generate_v4() |
| `id_tac_pham` | `uuid` | NO |  |
| `thu_tu` | `int4` | NO | 0 |
| `loai_media` | `loai_media_enum` | NO |  |
| `cloudflare_id` | `text` | NO |  |
| `width` | `int4` | YES |  |
| `height` | `int4` | YES |  |
| `duration_s` | `int4` | YES |  |
| `alt` | `text` | YES |  |

FK:
- `id_tac_pham` → `content_tac_pham.id`

### `content_share_link`
PK: `token`

| column | type | null | default |
|---|---|---|---|
| `token` | `text` | NO |  |
| `id_nguoi_tao` | `uuid` | NO |  |
| `id_to_chuc` | `uuid` | YES |  |
| `target_path` | `text` | NO |  |
| `tieu_de` | `text` | NO |  |
| `mo_ta` | `text` | YES |  |
| `image_id` | `text` | NO |  |
| `image_url` | `text` | NO |  |
| `tao_luc` | `timestamptz` | NO | now() |

FK:
- `id_nguoi_tao` → `user_nguoi_dung.id`
- `id_to_chuc` → `org_to_chuc.id`

### `content_tac_pham`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | uuid_generate_v4() |
| `id_nguoi_dung` | `uuid` | NO |  |
| `loai_tac_pham` | `loai_tac_pham_enum` | NO |  |
| `tieu_de` | `text` | NO |  |
| `mo_ta` | `text` | YES |  |
| `cover_id` | `text` | YES |  |
| `che_do_hien_thi` | `che_do_hien_thi_moc_enum` | NO | 'public'::che_do_hien_thi_moc_enum |
| `tao_luc` | `timestamptz` | NO | now() |
| `cap_nhat_luc` | `timestamptz` | NO | now() |
| `slug` | `text` | YES |  |
| `noi_dung_blocks` | `jsonb` | NO | '[]'::jsonb |
| `noi_dung_html` | `text` | YES |  |
| `meta_title` | `text` | YES |  |
| `meta_description` | `text` | YES |  |

FK:
- `id_nguoi_dung` → `user_nguoi_dung.id`

### `content_tac_pham_linh_vuc`
PK: `id_tac_pham, id_linh_vuc`

| column | type | null | default |
|---|---|---|---|
| `id_tac_pham` | `uuid` | NO |  |
| `id_linh_vuc` | `uuid` | NO |  |
| `la_chinh` | `bool` | NO | false |
| `tao_luc` | `timestamptz` | NO | now() |

FK:
- `id_linh_vuc` → `linh_vuc.id`
- `id_tac_pham` → `content_tac_pham.id`

### `content_tac_pham_tac_gia`
PK: `id_tac_pham, id_nguoi_dung`

| column | type | null | default |
|---|---|---|---|
| `id_tac_pham` | `uuid` | NO |  |
| `id_nguoi_dung` | `uuid` | NO |  |
| `vai_tro` | `text` | YES |  |
| `tao_luc` | `timestamptz` | NO | now() |
| `trang_thai` | `text` | NO | 'pending'::text |
| `la_chu_so_huu` | `bool` | NO | false |
| `thu_tu` | `int2` | YES |  |
| `ghi_chu` | `text` | YES |  |
| `xu_ly_luc` | `timestamptz` | YES |  |
| `che_do_hien_thi_journey` | `text` | NO | 'public'::text |

FK:
- `id_nguoi_dung` → `user_nguoi_dung.id`
- `id_tac_pham` → `content_tac_pham.id`

### `content_tac_pham_thuoc_moc`
PK: `id_tac_pham, id_cot_moc`

| column | type | null | default |
|---|---|---|---|
| `id_tac_pham` | `uuid` | NO |  |
| `id_cot_moc` | `uuid` | NO |  |
| `thu_tu` | `int4` | NO | 0 |

FK:
- `id_cot_moc` → `content_cot_moc.id`
- `id_tac_pham` → `content_tac_pham.id`

### `content_world_boost`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | gen_random_uuid() |
| `loai_doi_tuong` | `text` | NO |  |
| `id_doi_tuong` | `uuid` | NO |  |
| `dang_bat` | `bool` | NO | true |
| `bat_dau_luc` | `timestamptz` | NO | now() |
| `het_han_luc` | `timestamptz` | NO |  |
| `gia_han_luc` | `timestamptz` | YES |  |
| `cap_boi` | `uuid` | YES |  |
| `tat_boi` | `uuid` | YES |  |
| `tao_luc` | `timestamptz` | NO | now() |
| `cap_nhat_luc` | `timestamptz` | NO | now() |

FK:
- `cap_boi` → `user_nguoi_dung.id`
- `tat_boi` → `user_nguoi_dung.id`

### `edu_module_mon`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | gen_random_uuid() |
| `id_module` | `uuid` | NO |  |
| `id_slot` | `uuid` | YES |  |
| `ten_mon_mac_dinh` | `text` | YES |  |
| `he_so` | `numeric` | NO | 1 |
| `thang_diem` | `int4` | NO | 10 |
| `thoi_gian_phut` | `int4` | YES |  |
| `so_thu_tu` | `int4` | NO | 1 |

FK:
- `id_module` → `edu_module_tinh_diem.id`
- `id_slot` → `edu_to_hop_mon_chi_tiet.id`

### `edu_module_tinh_diem`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | gen_random_uuid() |
| `ten` | `text` | NO |  |
| `mo_ta` | `text` | YES |  |
| `quy_ve_thang` | `int4` | YES |  |
| `co_diem_uu_tien` | `bool` | NO | true |
| `co_diem_thuong` | `bool` | NO | false |
| `trang_thai` | `text` | NO | 'active'::text |
| `created_at` | `timestamptz` | NO | now() |

### `edu_mon_thi`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | gen_random_uuid() |
| `ma` | `text` | NO |  |
| `ten` | `text` | NO |  |
| `loai` | `text` | NO |  |
| `id_bai_viet` | `uuid` | YES |  |
| `mo_ta` | `text` | YES |  |
| `trang_thai` | `text` | NO | 'active'::text |
| `created_at` | `timestamptz` | NO | now() |
| `thumbnail_id` | `text` | YES |  |

FK:
- `id_bai_viet` → `article_bai_viet.id`

### `edu_to_hop_mon`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | uuid_generate_v4() |
| `ma_to_hop` | `text` | NO |  |
| `ten_to_hop` | `text` | NO |  |
| `cac_mon` | `_text` | NO |  |
| `mo_ta` | `text` | YES |  |

### `edu_to_hop_mon_chi_tiet`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | gen_random_uuid() |
| `id_to_hop_mon` | `uuid` | NO |  |
| `so_thu_tu` | `int4` | NO |  |
| `ten_slot` | `text` | NO |  |
| `loai` | `text` | NO |  |
| `co_dinh` | `bool` | NO | false |

FK:
- `id_to_hop_mon` → `edu_to_hop_mon.id`

### `filter_gan`
PK: `id_filter, loai_doi_tuong, id_doi_tuong`

| column | type | null | default |
|---|---|---|---|
| `id_filter` | `uuid` | NO |  |
| `loai_doi_tuong` | `filter_doi_tuong_enum` | NO |  |
| `id_doi_tuong` | `uuid` | NO |  |
| `tao_luc` | `timestamptz` | NO | now() |

FK:
- `id_filter` → `filter_nhan.id`

### `filter_nhan`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | gen_random_uuid() |
| `id_nguoi_dung` | `uuid` | YES |  |
| `id_to_chuc` | `uuid` | YES |  |
| `ten` | `text` | NO |  |
| `slug` | `text` | NO |  |
| `mau` | `text` | YES |  |
| `thu_tu` | `int4` | NO | 0 |
| `tao_luc` | `timestamptz` | NO | now() |

FK:
- `id_nguoi_dung` → `user_nguoi_dung.id`
- `id_to_chuc` → `org_to_chuc.id`

### `gop_y`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | uuid_generate_v4() |
| `id_nguoi_dung` | `uuid` | YES |  |
| `ho_ten` | `text` | YES |  |
| `email` | `text` | YES |  |
| `noi_dung` | `text` | NO |  |
| `trang_url` | `text` | YES |  |
| `user_agent` | `text` | YES |  |
| `trang_thai` | `gop_y_trang_thai_enum` | NO | 'moi'::gop_y_trang_thai_enum |
| `ghi_chu` | `text` | YES |  |
| `nguoi_xu_ly` | `uuid` | YES |  |
| `xu_ly_luc` | `timestamptz` | YES |  |
| `tao_luc` | `timestamptz` | NO | now() |
| `anh_url` | `text` | YES |  |

FK:
- `id_nguoi_dung` → `user_nguoi_dung.id`
- `nguoi_xu_ly` → `user_nguoi_dung.id`

### `linh_vuc`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | uuid_generate_v4() |
| `slug` | `text` | NO |  |
| `ten` | `text` | NO |  |
| `ten_eng` | `text` | YES |  |
| `mo_ta` | `text` | YES |  |
| `thumbnail_id` | `text` | YES |  |
| `thu_tu` | `int4` | NO | 0 |
| `trang_thai` | `text` | NO | 'active'::text |
| `nhom` | `text` | YES |  |

### `linh_vuc_gan_nhom`
PK: `id_linh_vuc, id_nhom`

| column | type | null | default |
|---|---|---|---|
| `id_linh_vuc` | `uuid` | NO |  |
| `id_nhom` | `uuid` | NO |  |
| `la_chinh` | `bool` | NO | false |
| `thu_tu` | `int4` | NO | 0 |

FK:
- `id_linh_vuc` → `linh_vuc.id`
- `id_nhom` → `linh_vuc_nhom.id`

### `linh_vuc_nhom`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | gen_random_uuid() |
| `slug` | `text` | NO |  |
| `ten` | `text` | NO |  |
| `ten_eng` | `text` | YES |  |
| `mo_ta` | `text` | YES |  |
| `thu_tu` | `int4` | NO | 0 |
| `trang_thai` | `text` | NO | 'active'::text |

### `org_bai_dang`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | uuid_generate_v4() |
| `id_to_chuc` | `uuid` | NO |  |
| `loai_bai_dang` | `loai_bai_dang_org_enum` | NO |  |
| `tieu_de` | `text` | NO |  |
| `noi_dung` | `text` | YES |  |
| `ghim` | `bool` | NO | false |
| `trang_thai` | `trang_thai_bai_dang_enum` | NO | 'nhap'::trang_thai_bai_dang_enum |
| `tao_luc` | `timestamptz` | NO | now() |
| `cap_nhat_luc` | `timestamptz` | NO | now() |
| `tom_tat` | `text` | YES |  |
| `cover_id` | `text` | YES |  |
| `thoi_diem` | `date` | YES |  |
| `noi_dung_blocks` | `jsonb` | NO | '[]'::jsonb |
| `nguon_url` | `text` | YES |  |

FK:
- `id_to_chuc` → `org_to_chuc.id`

### `org_bai_dang_tac_gia`
PK: `id_bai_dang, id_nguoi_dung`

| column | type | null | default |
|---|---|---|---|
| `id_bai_dang` | `uuid` | NO |  |
| `id_nguoi_dung` | `uuid` | NO |  |
| `vai_tro` | `text` | YES |  |
| `tao_luc` | `timestamptz` | NO | now() |
| `trang_thai` | `text` | NO | 'pending'::text |
| `thu_tu` | `int2` | YES |  |
| `ghi_chu` | `text` | YES |  |
| `xu_ly_luc` | `timestamptz` | YES |  |
| `che_do_hien_thi_journey` | `text` | NO | 'public'::text |

FK:
- `id_bai_dang` → `org_bai_dang.id`
- `id_nguoi_dung` → `user_nguoi_dung.id`

### `org_bai_dang_tag`
PK: `id_bai_dang, id_bai_viet`

| column | type | null | default |
|---|---|---|---|
| `id_bai_dang` | `uuid` | NO |  |
| `id_bai_viet` | `uuid` | NO |  |

FK:
- `id_bai_dang` → `org_bai_dang.id`
- `id_bai_viet` → `article_bai_viet.id`

### `org_bai_tap`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | uuid_generate_v4() |
| `id_khoa_hoc` | `uuid` | NO |  |
| `id_giao_trinh` | `uuid` | YES |  |
| `ten_bai_tap` | `text` | NO |  |
| `mo_ta` | `text` | YES |  |
| `video_youtube_url` | `text` | YES |  |
| `thumbnail_url` | `text` | YES |  |
| `visible` | `bool` | NO | true |
| `thu_tu` | `int4` | NO | 0 |
| `tao_luc` | `timestamptz` | NO | now() |
| `cap_nhat_luc` | `timestamptz` | NO | now() |

FK:
- `id_giao_trinh` → `org_giao_trinh.id`
- `id_khoa_hoc` → `org_khoa_hoc.id`

### `org_cau_hinh_khoi`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | gen_random_uuid() |
| `id_to_chuc` | `uuid` | NO |  |
| `id_to_hop_mon` | `uuid` | NO |  |
| `nam_ap_dung` | `int4` | NO |  |
| `cac_mon` | `jsonb` | NO |  |
| `quy_ve_thang` | `int4` | YES |  |
| `diem_san_xet_tuyen` | `numeric` | YES |  |
| `mo_ta` | `text` | YES |  |
| `trang_thai` | `text` | NO | 'active'::text |
| `created_at` | `timestamptz` | NO | now() |
| `updated_at` | `timestamptz` | NO | now() |
| `id_module` | `uuid` | YES |  |
| `id_truong_nganh` | `uuid` | YES |  |

FK:
- `id_module` → `edu_module_tinh_diem.id`
- `id_to_chuc` → `org_to_chuc.id`
- `id_to_hop_mon` → `edu_to_hop_mon.id`
- `id_truong_nganh` → `org_truong_nganh.id`

### `org_cau_hinh_mon`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | gen_random_uuid() |
| `id_cau_hinh_khoi` | `uuid` | NO |  |
| `id_mon_thi` | `uuid` | NO |  |
| `id_slot` | `uuid` | YES |  |
| `he_so` | `numeric` | NO | 1 |
| `thang_diem` | `int4` | NO | 10 |
| `thoi_gian_phut` | `int4` | YES |  |
| `so_thu_tu` | `int4` | NO | 1 |
| `ghi_chu` | `text` | YES |  |

FK:
- `id_cau_hinh_khoi` → `org_cau_hinh_khoi.id`
- `id_mon_thi` → `edu_mon_thi.id`
- `id_slot` → `edu_to_hop_mon_chi_tiet.id`

### `org_co_so_dao_tao`
PK: `id_to_chuc`

| column | type | null | default |
|---|---|---|---|
| `id_to_chuc` | `uuid` | NO |  |
| `ma_co_so` | `text` | NO |  |
| `ten_chinh_thuc` | `text` | NO |  |
| `loai_co_so` | `loai_co_so_enum` | NO |  |
| `nam_thanh_lap` | `int4` | YES |  |
| `website` | `text` | YES |  |
| `giay_phep_dao_tao` | `text` | YES |  |
| `da_verify` | `bool` | NO | false |

FK:
- `id_to_chuc` → `org_to_chuc.id`

### `org_dang_ky_su_kien`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | uuid_generate_v4() |
| `id_su_kien` | `uuid` | NO |  |
| `id_nguoi_dung` | `uuid` | NO |  |
| `trang_thai` | `trang_thai_dang_ky_su_kien_enum` | NO | 'cho_duyet'::trang_thai_dang_ky_su_kien_enum |
| `tao_luc` | `timestamptz` | NO | now() |
| `loai_phan_hoi` | `loai_phan_hoi_su_kien_enum` | NO | 'se_tham_gia'::loai_phan_hoi_su_kien_enum |

FK:
- `id_nguoi_dung` → `user_nguoi_dung.id`
- `id_su_kien` → `org_su_kien.id`

### `org_giao_trinh`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | uuid_generate_v4() |
| `id_khoa_hoc` | `uuid` | NO |  |
| `tieu_de` | `text` | NO |  |
| `mo_ta_ngan` | `text` | YES |  |
| `mo_ta_chi_tiet` | `text` | YES |  |
| `thumbnail_id` | `text` | YES |  |
| `video_gioi_thieu_url` | `text` | YES |  |
| `visibility` | `visibility_giao_trinh_enum` | NO | 'public'::visibility_giao_trinh_enum |
| `cap_nhat_luc` | `timestamptz` | NO | now() |
| `thu_tu` | `int4` | NO | 0 |
| `so_buoi` | `int4` | YES |  |

FK:
- `id_khoa_hoc` → `org_khoa_hoc.id`

### `org_hinh_anh`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | gen_random_uuid() |
| `id_to_chuc` | `uuid` | NO |  |
| `cloudflare_id` | `text` | NO |  |
| `caption` | `text` | YES |  |
| `loai` | `text` | NO | 'khac'::text |
| `thu_tu` | `int4` | NO | 0 |
| `nam` | `int4` | YES |  |
| `created_at` | `timestamptz` | NO | now() |

FK:
- `id_to_chuc` → `org_to_chuc.id`

### `org_khoa_hoc`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | uuid_generate_v4() |
| `id_to_chuc` | `uuid` | NO |  |
| `ten_khoa_hoc` | `text` | NO |  |
| `slug` | `text` | NO |  |
| `mo_ta` | `text` | YES |  |
| `loai_mo_hinh` | `loai_mo_hinh_khoa_enum` | NO |  |
| `avatar_id` | `text` | YES |  |
| `cover_id` | `text` | YES |  |
| `thoi_luong_buoi` | `int4` | YES |  |
| `thoi_luong_phut_moi_buoi` | `int4` | YES |  |
| `hoc_phi` | `numeric` | YES |  |
| `trinh_do_dau_vao` | `trinh_do_dau_vao_enum` | NO | 'khong_yeu_cau'::trinh_do_dau_vao_enum |
| `trang_thai_khoa_hoc` | `trang_thai_khoa_hoc_enum` | NO | 'sap_khai_giang'::trang_thai_khoa_hoc_enum |
| `noi_dung_blocks` | `jsonb` | NO | '[]'::jsonb |
| `bai_tap_hien_thi` | `text` | NO | 'day_du'::text |

FK:
- `id_to_chuc` → `org_to_chuc.id`

### `org_lop_hoc`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | uuid_generate_v4() |
| `id_khoa_hoc` | `uuid` | NO |  |
| `ma_lop` | `text` | NO |  |
| `hinh_thuc` | `hinh_thuc_lop_enum` | NO | 'truc_tiep'::hinh_thuc_lop_enum |
| `giao_vien_phu_trach` | `uuid` | YES |  |
| `ngay_khai_giang` | `date` | YES |  |
| `ngay_du_kien_ket_thuc` | `date` | YES |  |
| `slot_toi_da` | `int4` | YES |  |
| `trang_thai` | `trang_thai_lop_enum` | NO | 'sap_khai_giang'::trang_thai_lop_enum |
| `lich_hoc` | `text` | YES |  |
| `giao_vien_text` | `text` | YES |  |

FK:
- `giao_vien_phu_trach` → `user_nguoi_dung.id`
- `id_khoa_hoc` → `org_khoa_hoc.id`

### `org_phuong_thuc_xet_tuyen`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | uuid_generate_v4() |
| `id_tuyen_sinh_nam` | `uuid` | NO |  |
| `ten_phuong_thuc` | `ten_phuong_thuc_enum` | NO |  |
| `chi_tieu_phuong_thuc` | `int4` | YES |  |
| `diem_chuan_phuong_thuc` | `numeric` | YES |  |
| `id_to_hop_mon` | `uuid` | YES |  |
| `dieu_kien_xet_tuyen` | `text` | YES |  |
| `thu_tu_uu_tien` | `int4` | NO | 1 |
| `tieu_chi` | `jsonb` | YES |  |
| `ap_dung_tat_ca_nganh` | `bool` | YES | true |
| `id_nganh_ap_dung` | `_uuid` | YES |  |
| `id_cau_hinh_khoi` | `uuid` | YES |  |

FK:
- `id_cau_hinh_khoi` → `org_cau_hinh_khoi.id`
- `id_to_hop_mon` → `edu_to_hop_mon.id`
- `id_tuyen_sinh_nam` → `org_tuyen_sinh_nam.id`

### `org_scout_luu`
PK: `id_to_chuc, id_nguoi_dung`

| column | type | null | default |
|---|---|---|---|
| `id_to_chuc` | `uuid` | NO |  |
| `id_nguoi_dung` | `uuid` | NO |  |
| `ghi_chu` | `text` | YES |  |
| `tao_luc` | `timestamptz` | NO | now() |

FK:
- `id_nguoi_dung` → `user_nguoi_dung.id`
- `id_to_chuc` → `org_to_chuc.id`

### `org_su_kien`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | uuid_generate_v4() |
| `id_to_chuc` | `uuid` | NO |  |
| `ten` | `text` | NO |  |
| `loai_su_kien` | `loai_su_kien_enum` | NO |  |
| `mo_ta` | `text` | YES |  |
| `cover_id` | `text` | YES |  |
| `bat_dau` | `timestamptz` | NO |  |
| `ket_thuc` | `timestamptz` | YES |  |
| `dia_diem` | `text` | YES |  |
| `slot_toi_da` | `int4` | YES |  |
| `mien_phi` | `bool` | NO | true |
| `gia_ve` | `int4` | YES |  |
| `tinh_thanh` | `tinh_thanh_vn_enum` | YES |  |
| `noi_dung` | `text` | YES |  |
| `cach_mua_ve` | `text` | YES |  |

FK:
- `id_to_chuc` → `org_to_chuc.id`

### `org_su_kien_loai_ve`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | gen_random_uuid() |
| `id_su_kien` | `uuid` | NO |  |
| `ten` | `text` | NO |  |
| `mo_ta` | `text` | YES |  |
| `gia` | `int4` | NO |  |
| `cover_id` | `text` | YES |  |
| `thu_tu` | `int4` | NO | 0 |
| `tao_luc` | `timestamptz` | NO | now() |
| `cap_nhat_luc` | `timestamptz` | NO | now() |

FK:
- `id_su_kien` → `org_su_kien.id`

### `org_to_chuc`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | uuid_generate_v4() |
| `slug` | `text` | NO |  |
| `ten` | `text` | NO |  |
| `loai_to_chuc` | `loai_to_chuc_enum` | NO |  |
| `mo_ta` | `text` | YES |  |
| `logo_id` | `text` | YES |  |
| `cover_id` | `text` | YES |  |
| `trang_thai_hoat_dong` | `trang_thai_hoat_dong_enum` | NO | 'dang_hoat_dong'::trang_thai_hoat_dong_enum |
| `trang_thai_tin_cay` | `trang_thai_tin_cay_enum` | NO | 'binh_thuong'::trang_thai_tin_cay_enum |
| `nguoi_tao` | `uuid` | YES |  |
| `tao_luc` | `timestamptz` | NO | now() |
| `cap_nhat_luc` | `timestamptz` | NO | now() |
| `avatar_id` | `text` | YES |  |
| `tinh_thanh` | `tinh_thanh_vn_enum` | YES |  |
| `dia_chi` | `text` | YES |  |
| `dien_thoai` | `text` | YES |  |
| `email_lien_he` | `text` | YES |  |
| `gioi_thieu_truong` | `text` | YES |  |
| `cau_hinh` | `jsonb` | NO | '{}'::jsonb |

FK:
- `nguoi_tao` → `user_nguoi_dung.id`

### `org_truong_dai_hoc`
PK: `id_to_chuc`

| column | type | null | default |
|---|---|---|---|
| `id_to_chuc` | `uuid` | NO |  |
| `ma_truong` | `text` | NO |  |
| `ten_chinh_thuc` | `text` | NO |  |
| `ten_tieng_anh` | `text` | YES |  |
| `loai_truong` | `loai_truong_enum` | NO |  |
| `nam_thanh_lap` | `int4` | YES |  |
| `website` | `text` | YES |  |
| `da_verify` | `bool` | NO | false |
| `hoc_phi_nam_tu` | `int4` | YES |  |
| `hoc_phi_nam_den` | `int4` | YES |  |
| `co_ktx` | `bool` | YES | false |
| `ktx_gia_thang` | `text` | YES |  |
| `ktx_dia_chi` | `text` | YES |  |

FK:
- `id_to_chuc` → `org_to_chuc.id`

### `org_truong_nganh`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | uuid_generate_v4() |
| `id_to_chuc` | `uuid` | NO |  |
| `id_nganh` | `uuid` | NO |  |
| `ten_chuong_trinh` | `text` | NO |  |
| `he_dao_tao` | `he_dao_tao_enum` | NO |  |
| `thoi_gian_thang` | `int4` | NO |  |
| `slug` | `text` | NO |  |
| `avatar_id` | `text` | YES |  |
| `cover_id` | `text` | YES |  |
| `trang_thai_chuong_trinh` | `trang_thai_chuong_trinh_enum` | NO | 'dang_tuyen'::trang_thai_chuong_trinh_enum |
| `ma_nganh` | `text` | YES |  |

FK:
- `id_nganh` → `article_bai_viet.id`
- `id_to_chuc` → `org_to_chuc.id`

### `org_truong_nganh_mon`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | gen_random_uuid() |
| `id_truong_nganh` | `uuid` | NO |  |
| `id_mon_hoc` | `uuid` | NO |  |
| `thu_tu` | `int4` | NO | 0 |
| `tao_luc` | `timestamptz` | NO | now() |
| `ngung_day` | `bool` | NO | false |
| `ngung_day_luc` | `timestamptz` | YES |  |

FK:
- `id_mon_hoc` → `article_bai_viet.id`
- `id_truong_nganh` → `org_truong_nganh.id`

### `org_tuyen_dung`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | gen_random_uuid() |
| `id_to_chuc` | `uuid` | NO |  |
| `tieu_de` | `text` | NO |  |
| `mo_ta` | `text` | YES |  |
| `loai_hinh` | `loai_hinh_lam_viec_enum` | NO | 'toan_thoi_gian'::loai_hinh_lam_viec_enum |
| `cap_do` | `_text` | YES |  |
| `tinh_thanh` | `tinh_thanh_vn_enum` | YES |  |
| `lam_tu_xa` | `bool` | NO | false |
| `id_linh_vuc` | `uuid` | YES |  |
| `muc_luong_tu` | `int4` | YES |  |
| `muc_luong_den` | `int4` | YES |  |
| `hien_thi_luong` | `bool` | NO | false |
| `han_nop` | `date` | YES |  |
| `trang_thai` | `trang_thai_tuyen_dung_enum` | NO | 'dang_mo'::trang_thai_tuyen_dung_enum |
| `da_xoa` | `bool` | NO | false |
| `tao_luc` | `timestamptz` | NO | now() |
| `cap_nhat_luc` | `timestamptz` | NO | now() |
| `yeu_cau` | `text` | YES |  |
| `quyen_loi` | `text` | YES |  |
| `mo_ta_ngan` | `text` | YES |  |
| `so_luong` | `int4` | YES |  |
| `hien_thi_co_hoi` | `bool` | NO | true |
| `giai_doan_muc_tieu` | `_text` | NO | ARRAY['dang_lam'::text, 'tim_viec'::text, 'freelance'::text] |
| `id_nghe` | `uuid` | YES |  |
| `phuc_loi` | `jsonb` | NO | '[]'::jsonb |
| `dia_chi` | `text` | YES |  |

FK:
- `id_linh_vuc` → `linh_vuc.id`
- `id_nghe` → `article_bai_viet.id`
- `id_to_chuc` → `org_to_chuc.id`

### `org_tuyen_dung_ung_tuyen`
PK: `id_tuyen_dung, id_nguoi_dung`

| column | type | null | default |
|---|---|---|---|
| `id_tuyen_dung` | `uuid` | NO |  |
| `id_nguoi_dung` | `uuid` | NO |  |
| `thu_ngo` | `text` | YES |  |
| `trang_thai` | `trang_thai_ung_tuyen_enum` | NO | 'moi'::trang_thai_ung_tuyen_enum |
| `tao_luc` | `timestamptz` | NO | now() |

FK:
- `id_nguoi_dung` → `user_nguoi_dung.id`
- `id_tuyen_dung` → `org_tuyen_dung.id`

### `org_tuyen_sinh_nam`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | uuid_generate_v4() |
| `id_truong_nganh` | `uuid` | NO |  |
| `nam` | `int4` | NO |  |
| `chi_tieu` | `int4` | YES |  |
| `diem_chuan` | `numeric` | YES |  |
| `tinh_trang` | `tinh_trang_tuyen_sinh_enum` | NO | 'sap_mo'::tinh_trang_tuyen_sinh_enum |
| `link_thong_tin` | `text` | YES |  |
| `ghi_chu` | `text` | YES |  |
| `ngay_mo_ho_so` | `date` | YES |  |
| `ngay_dong_ho_so` | `date` | YES |  |
| `ngay_thi_tu` | `date` | YES |  |
| `ngay_thi_den` | `date` | YES |  |
| `ngay_cong_bo_diem` | `date` | YES |  |
| `ngay_xac_nhan_nhap_hoc_tu` | `date` | YES |  |
| `ngay_xac_nhan_nhap_hoc_den` | `date` | YES |  |
| `ghi_chu_timeline` | `text` | YES |  |
| `so_thi_sinh` | `int4` | YES |  |

FK:
- `id_truong_nganh` → `org_truong_nganh.id`

### `project_dong_gop`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | uuid_generate_v4() |
| `id_du_an` | `uuid` | NO |  |
| `id_nguoi_dung` | `uuid` | NO |  |
| `vai_tro` | `text` | YES |  |
| `nguon` | `nguon_dong_gop_enum` | NO | 'tu_apply'::nguon_dong_gop_enum |
| `trang_thai` | `trang_thai_dong_gop_enum` | NO | 'cho_duyet'::trang_thai_dong_gop_enum |
| `nguoi_duyet` | `uuid` | YES |  |
| `xu_ly_luc` | `timestamptz` | YES |  |
| `tao_luc` | `timestamptz` | NO | now() |

FK:
- `id_du_an` → `project_du_an.id`
- `id_nguoi_dung` → `user_nguoi_dung.id`
- `nguoi_duyet` → `user_nguoi_dung.id`

### `project_du_an`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | uuid_generate_v4() |
| `id_user_owner` | `uuid` | YES |  |
| `id_to_chuc_owner` | `uuid` | YES |  |
| `ten` | `text` | NO |  |
| `slug` | `text` | NO |  |
| `mo_ta` | `text` | YES |  |
| `avatar_id` | `text` | YES |  |
| `cover_id` | `text` | YES |  |
| `bat_dau` | `date` | YES |  |
| `ket_thuc` | `date` | YES |  |
| `trang_thai` | `trang_thai_du_an_enum` | NO | 'dang_lam'::trang_thai_du_an_enum |
| `loai_du_an` | `loai_du_an_enum` | YES |  |
| `che_do_hien_thi` | `che_do_hien_thi_du_an_enum` | NO | 'public'::che_do_hien_thi_du_an_enum |
| `cho_phep_apply` | `bool` | NO | false |
| `tao_luc` | `timestamptz` | NO | now() |
| `cap_nhat_luc` | `timestamptz` | NO | now() |

FK:
- `id_to_chuc_owner` → `org_to_chuc.id`
- `id_user_owner` → `user_nguoi_dung.id`

### `shop_bang_gia`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | gen_random_uuid() |
| `id_nguoi_dung` | `uuid` | NO |  |
| `ten` | `text` | NO |  |
| `tien_te` | `text` | NO | 'VND'::text |
| `ghi_chu` | `text` | YES |  |
| `da_xoa` | `bool` | NO | false |
| `tao_luc` | `timestamptz` | NO | now() |
| `cap_nhat_luc` | `timestamptz` | NO | now() |

FK:
- `id_nguoi_dung` → `user_nguoi_dung.id`

### `shop_bang_gia_dong`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | gen_random_uuid() |
| `id_bang_gia` | `uuid` | NO |  |
| `id_bien_the` | `uuid` | NO |  |
| `gia` | `numeric` | NO |  |
| `gia_giam` | `numeric` | YES |  |

FK:
- `id_bang_gia` → `shop_bang_gia.id`
- `id_bien_the` → `shop_bien_the.id`

### `shop_bien_the`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | gen_random_uuid() |
| `id_san_pham` | `uuid` | NO |  |
| `nhan` | `text` | NO | 'Mặc định'::text |
| `sku` | `text` | YES |  |
| `so_luong_ton` | `int4` | NO | 0 |
| `anh_id` | `text` | YES |  |
| `da_xoa` | `bool` | NO | false |
| `tao_luc` | `timestamptz` | NO | now() |
| `cap_nhat_luc` | `timestamptz` | NO | now() |

FK:
- `id_san_pham` → `shop_san_pham.id`

### `shop_cua_hang`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | gen_random_uuid() |
| `id_nguoi_dung` | `uuid` | NO |  |
| `ten` | `text` | YES |  |
| `mo_ta` | `text` | YES |  |
| `avatar_id` | `text` | YES |  |
| `cover_id` | `text` | YES |  |
| `chinh_sach` | `text` | YES |  |
| `lien_he` | `text` | YES |  |
| `tao_luc` | `timestamptz` | NO | now() |
| `cap_nhat_luc` | `timestamptz` | NO | now() |
| `nhan_phan_loai` | `text` | YES |  |
| `nhan_phan_loai_2` | `text` | YES |  |
| `tam_dong` | `bool` | NO | false |
| `tam_dong_tu` | `timestamptz` | YES |  |
| `tam_dong_den` | `timestamptz` | YES |  |
| `tam_dong_ly_do` | `text` | YES |  |
| `da_xoa` | `bool` | NO | false |
| `banner_su_kien_id` | `text` | YES |  |
| `banner_su_kien_hien` | `bool` | NO | true |

FK:
- `id_nguoi_dung` → `user_nguoi_dung.id`

### `shop_don_hang`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | gen_random_uuid() |
| `id_nguoi_mua` | `uuid` | NO |  |
| `id_nguoi_ban` | `uuid` | NO |  |
| `id_cot_moc` | `uuid` | YES |  |
| `id_su_kien` | `uuid` | YES |  |
| `loai_don` | `shop_loai_don_enum` | NO | 'mua_ngay'::shop_loai_don_enum |
| `trang_thai` | `shop_trang_thai_don_enum` | NO | 'cho_xac_nhan'::shop_trang_thai_don_enum |
| `tien_te` | `text` | NO | 'VND'::text |
| `tong_tien` | `numeric` | NO | 0 |
| `ghi_chu` | `text` | YES |  |
| `dieu_khoan_snapshot` | `text` | YES |  |
| `da_tru_kho` | `bool` | NO | false |
| `xac_nhan_luc` | `timestamptz` | YES |  |
| `huy_luc` | `timestamptz` | YES |  |
| `tao_luc` | `timestamptz` | NO | now() |
| `cap_nhat_luc` | `timestamptz` | NO | now() |
| `nguoi_mua_chap_nhan_luc` | `timestamptz` | YES |  |
| `nguoi_mua_chap_nhan_van_ban` | `text` | YES |  |
| `nguoi_mua_chap_nhan_phien_ban` | `text` | YES |  |
| `ma_don` | `text` | YES |  |
| `thanh_toan_snapshot` | `jsonb` | YES |  |
| `bien_lai_anh_url` | `text` | YES |  |
| `bien_lai_anh_id` | `text` | YES |  |

FK:
- `id_cot_moc` → `content_cot_moc.id`
- `id_nguoi_ban` → `user_nguoi_dung.id`
- `id_nguoi_mua` → `user_nguoi_dung.id`
- `id_su_kien` → `org_su_kien.id`

### `shop_don_hang_dong`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | gen_random_uuid() |
| `id_don_hang` | `uuid` | NO |  |
| `id_bien_the` | `uuid` | YES |  |
| `ten_snapshot` | `text` | NO |  |
| `nhan_snapshot` | `text` | YES |  |
| `so_luong` | `int4` | NO |  |
| `gia_don_vi` | `numeric` | NO |  |

FK:
- `id_bien_the` → `shop_bien_the.id`
- `id_don_hang` → `shop_don_hang.id`

### `shop_gio`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | gen_random_uuid() |
| `id_nguoi_mua` | `uuid` | NO |  |
| `id_cot_moc` | `uuid` | YES |  |
| `tao_luc` | `timestamptz` | NO | now() |
| `cap_nhat_luc` | `timestamptz` | NO | now() |
| `id_cua_hang` | `uuid` | YES |  |

FK:
- `id_cot_moc` → `content_cot_moc.id`
- `id_cua_hang` → `shop_cua_hang.id`
- `id_nguoi_mua` → `user_nguoi_dung.id`

### `shop_gio_dong`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | gen_random_uuid() |
| `id_gio` | `uuid` | NO |  |
| `id_bien_the` | `uuid` | NO |  |
| `so_luong` | `int4` | NO |  |

FK:
- `id_bien_the` → `shop_bien_the.id`
- `id_gio` → `shop_gio.id`

### `shop_nhom`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | gen_random_uuid() |
| `id_nguoi_dung` | `uuid` | NO |  |
| `truc` | `int2` | NO |  |
| `nhan` | `text` | NO |  |
| `mo_ta` | `text` | YES |  |
| `thu_tu` | `int4` | NO | 0 |
| `da_xoa` | `bool` | NO | false |
| `tao_luc` | `timestamptz` | NO | now() |
| `cap_nhat_luc` | `timestamptz` | NO | now() |
| `anh_id` | `text` | YES |  |
| `gia_mac_dinh` | `numeric` | YES |  |
| `overlay_anh_id` | `text` | YES |  |
| `anh_phu_ids` | `_text` | NO | '{}'::text[] |
| `video_phu_id` | `text` | YES |  |
| `noi_bat` | `bool` | NO | false |

FK:
- `id_nguoi_dung` → `user_nguoi_dung.id`

### `shop_nhom_danh_gia`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | gen_random_uuid() |
| `id_nhom` | `uuid` | NO |  |
| `id_nguoi_dung` | `uuid` | NO |  |
| `id_don_hang` | `uuid` | NO |  |
| `diem` | `int2` | NO |  |
| `noi_dung` | `text` | YES |  |
| `anh_ids` | `_text` | NO | '{}'::text[] |
| `da_xoa` | `bool` | NO | false |
| `tao_luc` | `timestamptz` | NO | now() |
| `cap_nhat_luc` | `timestamptz` | NO | now() |

FK:
- `id_don_hang` → `shop_don_hang.id`
- `id_nguoi_dung` → `user_nguoi_dung.id`
- `id_nhom` → `shop_nhom.id`

### `shop_phuong_thuc_tt`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | gen_random_uuid() |
| `id_cua_hang` | `uuid` | NO |  |
| `ngan_hang` | `text` | NO |  |
| `so_tai_khoan` | `text` | NO |  |
| `ten_chu_tai_khoan` | `text` | NO |  |
| `qr_anh_id` | `text` | YES |  |
| `mac_dinh` | `bool` | NO | false |
| `kich_hoat` | `bool` | NO | true |
| `thu_tu` | `int4` | NO | 0 |
| `tao_luc` | `timestamptz` | NO | now() |
| `cap_nhat_luc` | `timestamptz` | NO | now() |

FK:
- `id_cua_hang` → `shop_cua_hang.id`

### `shop_post_hang`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | gen_random_uuid() |
| `id_cot_moc` | `uuid` | NO |  |
| `id_bien_the` | `uuid` | NO |  |
| `id_bang_gia` | `uuid` | YES |  |
| `gia_hien_thi` | `numeric` | NO |  |
| `tien_te` | `text` | NO | 'VND'::text |
| `thu_tu` | `int4` | NO | 0 |
| `tao_luc` | `timestamptz` | NO | now() |

FK:
- `id_bang_gia` → `shop_bang_gia.id`
- `id_bien_the` → `shop_bien_the.id`
- `id_cot_moc` → `content_cot_moc.id`

### `shop_quay_su_kien`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | gen_random_uuid() |
| `id_su_kien` | `uuid` | NO |  |
| `id_nguoi_dung` | `uuid` | NO |  |
| `id_cot_moc` | `uuid` | YES |  |
| `bang_chung` | `jsonb` | NO | '[]'::jsonb |
| `trang_thai` | `shop_trang_thai_quay_enum` | NO | 'cho_xu_ly'::shop_trang_thai_quay_enum |
| `ly_do_tu_choi` | `text` | YES |  |
| `duyet_boi` | `uuid` | YES |  |
| `duyet_luc` | `timestamptz` | YES |  |
| `tao_luc` | `timestamptz` | NO | now() |
| `cap_nhat_luc` | `timestamptz` | NO | now() |

FK:
- `duyet_boi` → `user_nguoi_dung.id`
- `id_cot_moc` → `content_cot_moc.id`
- `id_nguoi_dung` → `user_nguoi_dung.id`
- `id_su_kien` → `org_su_kien.id`

### `shop_san_pham`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | gen_random_uuid() |
| `id_nguoi_dung` | `uuid` | NO |  |
| `ten` | `text` | NO |  |
| `mo_ta` | `text` | YES |  |
| `anh_id` | `text` | YES |  |
| `dang_ban` | `bool` | NO | true |
| `da_xoa` | `bool` | NO | false |
| `tao_luc` | `timestamptz` | NO | now() |
| `cap_nhat_luc` | `timestamptz` | NO | now() |
| `phan_loai` | `text` | YES |  |
| `phan_loai_2` | `text` | YES |  |
| `noi_bat` | `bool` | NO | false |
| `id_nhom` | `uuid` | YES |  |
| `id_nhom_2` | `uuid` | YES |  |

FK:
- `id_nguoi_dung` → `user_nguoi_dung.id`
- `id_nhom` → `shop_nhom.id`
- `id_nhom_2` → `shop_nhom.id`

### `social_bao_cao`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | gen_random_uuid() |
| `nguoi_bao_cao` | `uuid` | NO |  |
| `loai_doi_tuong` | `text` | NO | 'cot_moc'::text |
| `id_doi_tuong` | `uuid` | NO |  |
| `id_chu_so_huu` | `uuid` | YES |  |
| `loai_bao_cao` | `loai_bao_cao_enum` | NO |  |
| `tieu_de` | `text` | YES |  |
| `noi_dung` | `text` | YES |  |
| `bang_chung` | `jsonb` | NO | '[]'::jsonb |
| `kenh` | `text` | NO | 'admin'::text |
| `id_cong_dong` | `uuid` | YES |  |
| `trang_thai` | `trang_thai_bao_cao_enum` | NO | 'moi'::trang_thai_bao_cao_enum |
| `ket_qua_xu_ly` | `text` | YES |  |
| `nguoi_xu_ly` | `uuid` | YES |  |
| `tao_luc` | `timestamptz` | NO | now() |
| `xu_ly_luc` | `timestamptz` | YES |  |

FK:
- `id_chu_so_huu` → `user_nguoi_dung.id`
- `id_cong_dong` → `org_to_chuc.id`
- `nguoi_bao_cao` → `user_nguoi_dung.id`
- `nguoi_xu_ly` → `user_nguoi_dung.id`

### `social_binh_luan`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | uuid_generate_v4() |
| `nguoi_binh_luan` | `uuid` | NO |  |
| `loai_doi_tuong` | `loai_doi_tuong_social_enum` | NO |  |
| `id_doi_tuong` | `uuid` | NO |  |
| `noi_dung` | `text` | NO |  |
| `id_cha` | `uuid` | YES |  |
| `tao_luc` | `timestamptz` | NO | now() |
| `cap_nhat_luc` | `timestamptz` | NO | now() |
| `da_xoa` | `bool` | NO | false |
| `ghim_luc` | `timestamptz` | YES |  |
| `anh_dinh_kem` | `_text` | YES |  |

FK:
- `id_cha` → `social_binh_luan.id`
- `nguoi_binh_luan` → `user_nguoi_dung.id`

### `social_luot_xem` _(partitioned)_

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | uuid_generate_v4() |
| `nguoi_xem` | `uuid` | YES |  |
| `loai_doi_tuong` | `loai_doi_tuong_social_enum` | NO |  |
| `id_doi_tuong` | `uuid` | NO |  |
| `tao_luc` | `timestamptz` | NO | now() |
| `da_xu_ly_hint` | `bool` | NO | false |
| `loai_su_kien` | `loai_su_kien_social_enum` | NO | 'hien_thi'::loai_su_kien_social_enum |
| `phien_id` | `text` | YES |  |
| `nguon` | `nguon_su_kien_enum` | YES |  |
| `loai_boi_canh` | `loai_doi_tuong_social_enum` | YES |  |
| `id_boi_canh` | `uuid` | YES |  |
| `ngu_canh` | `jsonb` | YES |  |

FK:
- `nguoi_xem` → `user_nguoi_dung.id`
- `nguoi_xem` → `user_nguoi_dung.id`
- `nguoi_xem` → `user_nguoi_dung.id`
- `nguoi_xem` → `user_nguoi_dung.id`
- `nguoi_xem` → `user_nguoi_dung.id`
- `nguoi_xem` → `user_nguoi_dung.id`
- `nguoi_xem` → `user_nguoi_dung.id`
- `nguoi_xem` → `user_nguoi_dung.id`
- `nguoi_xem` → `user_nguoi_dung.id`

### `social_luu`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | uuid_generate_v4() |
| `id_nguoi_dung` | `uuid` | NO |  |
| `loai_doi_tuong` | `loai_doi_tuong_social_enum` | NO |  |
| `id_doi_tuong` | `uuid` | NO |  |
| `che_do_hien_thi` | `che_do_luu_enum` | NO | 'private'::che_do_luu_enum |
| `tao_luc` | `timestamptz` | NO | now() |
| `che_do_hien_thi_journey` | `text` | NO | 'public'::text |
| `ghi_chu_rieng` | `text` | YES |  |

FK:
- `id_nguoi_dung` → `user_nguoi_dung.id`

### `social_reaction`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | uuid_generate_v4() |
| `id_nguoi_dung` | `uuid` | NO |  |
| `loai_doi_tuong` | `loai_doi_tuong_social_enum` | NO |  |
| `id_doi_tuong` | `uuid` | NO |  |
| `emoji` | `text` | NO |  |
| `tao_luc` | `timestamptz` | NO | now() |

FK:
- `id_nguoi_dung` → `user_nguoi_dung.id`

### `social_thong_bao`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | uuid_generate_v4() |
| `nguoi_nhan` | `uuid` | NO |  |
| `loai` | `text` | NO |  |
| `noi_dung` | `text` | NO |  |
| `noi_dung_ai` | `text` | YES |  |
| `loai_doi_tuong` | `text` | YES |  |
| `id_doi_tuong` | `uuid` | YES |  |
| `da_doc` | `bool` | NO | false |
| `tao_luc` | `timestamptz` | NO | now() |
| `xu_ly_luc` | `timestamptz` | YES |  |

FK:
- `nguoi_nhan` → `user_nguoi_dung.id`

### `social_thong_ke_doi_tuong_ngay`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | uuid_generate_v4() |
| `loai_doi_tuong` | `loai_doi_tuong_social_enum` | NO |  |
| `id_doi_tuong` | `uuid` | NO |  |
| `ngay` | `date` | NO |  |
| `luot_tiep_can` | `int4` | NO | 0 |
| `tiep_can_unique` | `int4` | NO | 0 |
| `luot_xem_noi_dung` | `int4` | NO | 0 |
| `luot_mo_comment` | `int4` | NO | 0 |
| `luot_click_profile` | `int4` | NO | 0 |
| `luot_xem_media` | `int4` | NO | 0 |
| `luot_click_lien_ket` | `int4` | NO | 0 |
| `cap_nhat_luc` | `timestamptz` | NO | now() |

### `user_emoji_bo`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | gen_random_uuid() |
| `id_nguoi_dung` | `uuid` | NO |  |
| `ten` | `text` | NO |  |
| `thu_tu` | `int2` | NO | 0 |
| `tao_luc` | `timestamptz` | NO | now() |
| `cap_nhat_luc` | `timestamptz` | NO | now() |
| `cloudflare_id_anh_bia` | `text` | YES |  |

FK:
- `id_nguoi_dung` → `user_nguoi_dung.id`

### `user_emoji_muc`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | gen_random_uuid() |
| `id_bo` | `uuid` | NO |  |
| `cloudflare_id` | `text` | NO |  |
| `ten_goi` | `text` | YES |  |
| `thu_tu` | `int2` | NO | 0 |
| `da_xoa` | `bool` | NO | false |
| `tao_luc` | `timestamptz` | NO | now() |

FK:
- `id_bo` → `user_emoji_bo.id`

### `user_filter_journey`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | uuid_generate_v4() |
| `id_nguoi_dung` | `uuid` | NO |  |
| `id_nhom_boi_canh` | `uuid` | YES |  |
| `hien_thi` | `bool` | NO | true |
| `ap_dung_cho` | `ap_dung_cho_enum` | NO |  |

FK:
- `id_nguoi_dung` → `user_nguoi_dung.id`
- `id_nhom_boi_canh` → `user_nhom_boi_canh.id`

### `user_gallery_noi_bat`
PK: `id_nguoi_dung, id_cot_moc`

| column | type | null | default |
|---|---|---|---|
| `id_nguoi_dung` | `uuid` | NO |  |
| `id_cot_moc` | `uuid` | NO |  |
| `thu_tu` | `int4` | NO | 0 |
| `tao_luc` | `timestamptz` | NO | now() |

FK:
- `id_nguoi_dung` → `user_nguoi_dung.id`

### `user_hoc_vien_lop`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | uuid_generate_v4() |
| `id_nguoi_dung` | `uuid` | NO |  |
| `id_khoa_hoc` | `uuid` | NO |  |
| `id_lop_hoc` | `uuid` | YES |  |
| `trang_thai` | `trang_thai_hoc_vien_enum` | NO | 'da_dang_ky'::trang_thai_hoc_vien_enum |
| `ngay_dang_ky` | `date` | NO | CURRENT_DATE |
| `ngay_hoan_thanh` | `date` | YES |  |
| `ket_qua` | `text` | YES |  |

FK:
- `id_khoa_hoc` → `org_khoa_hoc.id`
- `id_lop_hoc` → `org_lop_hoc.id`
- `id_nguoi_dung` → `user_nguoi_dung.id`

### `user_journey_ghim`
PK: `id_nguoi_dung, milestone_key`

| column | type | null | default |
|---|---|---|---|
| `id_nguoi_dung` | `uuid` | NO |  |
| `milestone_key` | `text` | NO |  |
| `ghim_luc` | `timestamptz` | NO | now() |

FK:
- `id_nguoi_dung` → `user_nguoi_dung.id`

### `user_ket_ban`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | gen_random_uuid() |
| `id_nguoi_gui` | `uuid` | NO |  |
| `id_nguoi_nhan` | `uuid` | NO |  |
| `trang_thai` | `text` | NO | 'pending'::text |
| `tao_luc` | `timestamptz` | NO | now() |
| `xu_ly_luc` | `timestamptz` | YES |  |

FK:
- `id_nguoi_gui` → `user_nguoi_dung.id`
- `id_nguoi_nhan` → `user_nguoi_dung.id`

### `user_linh_vuc`
PK: `id_nguoi_dung, id_bai_viet`

| column | type | null | default |
|---|---|---|---|
| `id_nguoi_dung` | `uuid` | NO |  |
| `id_bai_viet` | `uuid` | NO |  |
| `tao_luc` | `timestamptz` | NO | now() |
| `id_linh_vuc` | `uuid` | YES |  |

FK:
- `id_bai_viet` → `article_bai_viet.id`
- `id_linh_vuc` → `linh_vuc.id`
- `id_nguoi_dung` → `user_nguoi_dung.id`

### `user_nguoi_dung`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | uuid_generate_v4() |
| `auth_user_id` | `uuid` | YES |  |
| `slug` | `text` | NO |  |
| `ten_hien_thi` | `text` | NO |  |
| `avatar_id` | `text` | YES |  |
| `cover_id` | `text` | YES |  |
| `bio` | `text` | YES |  |
| `trang_thai_tai_khoan` | `trang_thai_tai_khoan_enum` | NO | 'dang_hoat_dong'::trang_thai_tai_khoan_enum |
| `lan_cuoi_active` | `timestamptz` | YES |  |
| `cho_phep_chat_an_danh` | `bool` | NO | true |
| `ai_summary_journey` | `text` | YES |  |
| `ai_summary_cap_nhat_luc` | `timestamptz` | YES |  |
| `giai_doan` | `giai_doan_enum` | YES |  |
| `muc_tieu` | `_muc_tieu_enum` | YES |  |
| `ngay_sinh` | `date` | YES |  |
| `gioi_tinh` | `gioi_tinh_enum` | YES |  |
| `tinh_thanh` | `tinh_thanh_vn_enum` | YES |  |
| `dia_chi_chi_tiet` | `text` | YES |  |
| `email_lien_he` | `text` | YES |  |
| `so_dien_thoai` | `text` | YES |  |
| `mxh_links` | `jsonb` | NO | '[]'::jsonb |
| `theme` | `text` | YES |  |
| `visibility_ngay_sinh` | `visibility_field_enum` | NO | 'private'::visibility_field_enum |
| `visibility_gioi_tinh` | `visibility_field_enum` | NO | 'public'::visibility_field_enum |
| `visibility_dia_chi` | `visibility_field_enum` | NO | 'private'::visibility_field_enum |
| `visibility_email` | `visibility_field_enum` | NO | 'private'::visibility_field_enum |
| `visibility_sdt` | `visibility_field_enum` | NO | 'private'::visibility_field_enum |
| `tao_luc` | `timestamptz` | NO | now() |
| `journey_loai_moc_visibility` | `jsonb` | NO | '{}'::jsonb |
| `journey_mac_dinh_view` | `text` | YES |  |
| `journey_mac_dinh_ap_dung_toi` | `bool` | NO | false |
| `da_xac_minh` | `bool` | NO | false |
| `xac_minh_luc` | `timestamptz` | YES |  |
| `xac_minh_boi` | `uuid` | YES |  |
| `ban_hang_bat` | `bool` | NO | false |
| `ban_hang_dieu_khoan_luc` | `timestamptz` | YES |  |
| `shop_hien_thi` | `bool` | NO | false |

FK:
- `xac_minh_boi` → `user_nguoi_dung.id`

### `user_nhom_boi_canh`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | uuid_generate_v4() |
| `id_nguoi_dung` | `uuid` | YES |  |
| `ten_nhom` | `text` | NO |  |
| `slug` | `text` | NO |  |
| `icon` | `text` | YES |  |
| `thu_tu` | `int4` | NO | 0 |

FK:
- `id_nguoi_dung` → `user_nguoi_dung.id`

### `user_quyen_he_thong`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | uuid_generate_v4() |
| `id_nguoi_dung` | `uuid` | NO |  |
| `vai_tro` | `vai_tro_he_thong_enum` | NO |  |
| `cap_boi` | `uuid` | YES |  |
| `tao_luc` | `timestamptz` | NO | now() |
| `cap_nhat_luc` | `timestamptz` | NO | now() |

FK:
- `cap_boi` → `user_nguoi_dung.id`
- `id_nguoi_dung` → `user_nguoi_dung.id`

### `user_thanh_vien_to_chuc`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | uuid_generate_v4() |
| `id_nguoi_dung` | `uuid` | NO |  |
| `id_to_chuc` | `uuid` | NO |  |
| `vai_tro` | `vai_tro_to_chuc_enum` | NO |  |
| `trang_thai` | `trang_thai_thanh_vien_enum` | NO | 'active'::trang_thai_thanh_vien_enum |
| `tu_ngay` | `date` | NO | CURRENT_DATE |
| `den_ngay` | `date` | YES |  |
| `nam_bat_dau` | `int4` | YES |  |
| `id_nganh` | `uuid` | YES |  |

FK:
- `id_nganh` → `article_bai_viet.id`
- `id_nguoi_dung` → `user_nguoi_dung.id`
- `id_to_chuc` → `org_to_chuc.id`

### `user_theo_doi`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | uuid_generate_v4() |
| `id_nguoi_theo_doi` | `uuid` | NO |  |
| `loai_doi_tuong` | `loai_theo_doi_enum` | NO |  |
| `id_doi_tuong` | `uuid` | NO |  |
| `tao_luc` | `timestamptz` | NO | now() |

FK:
- `id_nguoi_theo_doi` → `user_nguoi_dung.id`

### `vector_co_dinh`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | uuid_generate_v4() |
| `loai_doi_tuong` | `loai_doi_tuong_vector_enum` | NO |  |
| `id_doi_tuong` | `uuid` | NO |  |
| `vector` | `vector` | NO |  |
| `phien_ban_quy_uoc` | `text` | NO |  |
| `prompt_hash` | `text` | NO |  |
| `tinh_luc` | `timestamptz` | NO | now() |

### `vector_dong`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | uuid_generate_v4() |
| `loai_doi_tuong` | `loai_doi_tuong_vector_enum` | NO |  |
| `id_doi_tuong` | `uuid` | NO |  |
| `vector` | `vector` | NO |  |
| `do_tin_cay` | `numeric` | NO | 0.50 |
| `phien_ban_quy_uoc` | `text` | NO |  |
| `nguon_du_lieu` | `nguon_du_lieu_vector_enum` | NO | 'ket_hop'::nguon_du_lieu_vector_enum |
| `so_data_point` | `int4` | NO | 0 |
| `cap_nhat_cuoi` | `timestamptz` | NO | now() |
| `cap_nhat_tiep` | `timestamptz` | YES |  |

### `vector_hang_doi`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | uuid_generate_v4() |
| `loai_doi_tuong` | `loai_doi_tuong_vector_enum` | NO |  |
| `id_doi_tuong` | `uuid` | NO |  |
| `loai_vector` | `loai_vector_enum` | NO |  |
| `ly_do` | `ly_do_vector_enum` | YES |  |
| `uu_tien` | `int4` | NO | 5 |
| `trang_thai` | `trang_thai_hang_doi_enum` | NO | 'cho'::trang_thai_hang_doi_enum |
| `so_lan_thu` | `int4` | NO | 0 |
| `loi` | `text` | YES |  |
| `tao_luc` | `timestamptz` | NO | now() |
| `bat_dau_xu_ly_luc` | `timestamptz` | YES |  |
| `hoan_thanh_luc` | `timestamptz` | YES |  |

### `verify_email_token`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | uuid_generate_v4() |
| `id_xac_nhan` | `uuid` | NO |  |
| `token_hash` | `text` | NO |  |
| `email_nhan` | `text` | NO |  |
| `het_han_luc` | `timestamptz` | NO | (now() + '7 days'::interval) |
| `da_claim_luc` | `timestamptz` | YES |  |
| `ip_claim` | `text` | YES |  |
| `tao_luc` | `timestamptz` | NO | now() |

FK:
- `id_xac_nhan` → `verify_xac_nhan.id`

### `verify_tham_du_su_kien`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | uuid_generate_v4() |
| `id_su_kien` | `uuid` | NO |  |
| `id_nguoi_dung` | `uuid` | NO |  |
| `nguon_xac_nhan` | `nguon_tham_du_enum` | NO | 'admin_manual'::nguon_tham_du_enum |
| `nguoi_xac_nhan` | `uuid` | YES |  |
| `trang_thai` | `trang_thai_tham_du_enum` | NO | 'cho_xac_nhan'::trang_thai_tham_du_enum |
| `bang_chung` | `text` | YES |  |
| `tao_luc` | `timestamptz` | NO | now() |
| `thoi_diem_xac_nhan` | `timestamptz` | YES |  |

FK:
- `id_nguoi_dung` → `user_nguoi_dung.id`
- `id_su_kien` → `org_su_kien.id`
- `nguoi_xac_nhan` → `user_nguoi_dung.id`

### `verify_xac_nhan`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | uuid_generate_v4() |
| `id_cot_moc` | `uuid` | NO |  |
| `loai_nguoi_xac_nhan` | `loai_nguoi_xac_nhan_enum` | NO |  |
| `id_nguoi_xac_nhan` | `uuid` | YES |  |
| `email_external` | `text` | YES |  |
| `url_proof` | `text` | YES |  |
| `trang_thai` | `trang_thai_xac_nhan_enum` | NO | 'cho_duyet'::trang_thai_xac_nhan_enum |
| `bang_chung` | `text` | YES |  |
| `tao_luc` | `timestamptz` | NO | now() |
| `xu_ly_luc` | `timestamptz` | YES |  |

FK:
- `id_cot_moc` → `content_cot_moc.id`
- `id_nguoi_xac_nhan` → `user_nguoi_dung.id`

### `verify_yeu_cau`
PK: `id`

| column | type | null | default |
|---|---|---|---|
| `id` | `uuid` | NO | uuid_generate_v4() |
| `nguoi_yeu_cau` | `uuid` | NO |  |
| `id_cot_moc` | `uuid` | NO |  |
| `id_to_chuc` | `uuid` | NO |  |
| `noi_dung` | `text` | YES |  |
| `trang_thai` | `trang_thai_yeu_cau_enum` | NO | 'cho_xu_ly'::trang_thai_yeu_cau_enum |
| `nguoi_xu_ly` | `uuid` | YES |  |
| `tao_luc` | `timestamptz` | NO | now() |
| `xu_ly_luc` | `timestamptz` | YES |  |

FK:
- `id_cot_moc` → `content_cot_moc.id`
- `id_to_chuc` → `org_to_chuc.id`
- `nguoi_xu_ly` → `user_nguoi_dung.id`
- `nguoi_yeu_cau` → `user_nguoi_dung.id`

## Enums
- `ap_dung_cho_enum`: `ban_than`, `nguoi_xem_khac`
- `che_do_hien_thi_du_an_enum`: `public`, `private`, `chi_thanh_vien`
- `che_do_hien_thi_moc_enum`: `feature`, `public`, `theo_nhom`, `chi_minh`, `cong_dong`
- `che_do_luu_enum`: `private`, `public`
- `filter_doi_tuong_enum`: `cot_moc`, `org_bai_dang`, `tac_pham`
- `giai_doan_enum`: `moi_bat_dau`, `dang_hoc`, `dang_lam`, `tim_viec`, `freelance`, `dang_day`
- `gioi_tinh_enum`: `nam`, `nu`, `khac`, `khong_muon_noi`
- `gop_y_trang_thai_enum`: `moi`, `dang_xu_ly`, `da_xu_ly`, `bo_qua`
- `he_dao_tao_enum`: `dai_hoc`, `cao_dang`, `trung_cap`, `chung_chi`
- `hinh_thuc_lop_enum`: `truc_tiep`, `truc_tuyen`, `ket_hop`
- `loai_bai_dang_org_enum`: `thong_bao`, `tuyen_sinh`, `su_kien`, `showcase`, `khac`, `hoc_bong`
- `loai_bai_viet_enum`: `linh_vuc`, `nghe`, `keyword`, `phan_mem`, `mon_hoc`, `blog`, `event`, `nganh_dao_tao`
- `loai_bao_cao_enum`: `spam`, `phan_cam`, `quay_roi`, `sai_lech`, `lua_dao`, `ban_quyen`, `mao_danh`, `khac`
- `loai_chan_enum`: `cu_the`, `tat_ca_an_danh`, `tat_ca_la`, `org_cu_the`
- `loai_co_so_enum`: `trung_tam`, `truong_nghe`, `co_so_tu_nhan`, `chi_nhanh`
- `loai_doi_tuong_social_enum`: `cot_moc`, `tac_pham`, `du_an`, `thao_luan`, `binh_luan`, `org_bai_dang`, `chat_tin_nhan`, `nguoi_dung`, `to_chuc`, `su_kien`, `org_tuyen_dung`, `article_dong_gop`
- `loai_doi_tuong_vector_enum`: `user`, `org`, `bai_viet`, `khoa_hoc`, `linh_vuc`
- `loai_du_an_enum`: `commercial`, `personal`, `open_source`, `school`
- `loai_hinh_lam_viec_enum`: `toan_thoi_gian`, `ban_thoi_gian`, `remote`, `freelance`, `thuc_tap`
- `loai_media_enum`: `image`, `video`, `audio`, `pdf`, `embed`
- `loai_mo_hinh_khoa_enum`: `cohort_co_dinh`, `lien_tuc_theo_thang`
- `loai_moc_enum`: `hoc`, `lam_viec`, `du_an`, `su_kien`, `thanh_tuu`, `ca_nhan`
- `loai_nguoi_xac_nhan_enum`: `to_chuc`, `nguoi_dung`, `external_email`, `system_url`
- `loai_nhom_enum`: `bo_phan`, `ky_thuat`, `nhom_nganh`, `cap_do`
- `loai_phan_hoi_su_kien_enum`: `quan_tam`, `se_tham_gia`
- `loai_phong_chat_enum`: `1_1`, `1_1_an_danh`, `1_org`, `du_an`, `lop_hoc`, `su_kien`, `nhom`
- `loai_quan_he_enum`: `THUOC_LINH_VUC`, `LIEN_QUAN`, `DUNG_TRONG_NGHE`, `TIEN_QUYET`, `DUNG_TRONG_NGANH`
- `loai_su_kien_enum`: `workshop`, `talkshow`, `trien_lam`, `contest`, `meetup`, `khoa_dao_tao_ngan`, `tour_cong_ty`, `tour_truong`, `open_day`, `screening`, `hackathon`, `career_fair`, `le_hoi`
- `loai_su_kien_social_enum`: `hien_thi`, `mo_card`, `xem_binh_luan`, `mo_popover_nguoi`, `xem_profile_full`, `click_lien_ket`, `xem_media`
- `loai_tac_pham_enum`: `image`, `video`, `comic`, `ui_prototype`, `blog_process`, `audio`, `3d_model`, `bai_viet`
- `loai_theo_doi_enum`: `nguoi_dung`, `the`, `to_chuc`
- `loai_tin_nhan_enum`: `text`, `media`, `system`, `sticker`, `binh_chon`
- `loai_to_chuc_enum`: `truong_dai_hoc`, `co_so_dao_tao`, `studio`, `doanh_nghiep`, `cong_dong`
- `loai_truong_enum`: `cong_lap`, `tu_thuc`, `dan_lap`, `co_von_nuoc_ngoai`
- `loai_vector_enum`: `co_dinh`, `dong`
- `ly_do_vector_enum`: `tao_moi`, `noi_dung_edit`, `quy_uoc_doi`, `dinh_ky`, `member_thay_doi`, `journey_inferred`
- `muc_tieu_enum`: `tim_khoa_hoc`, `tim_viec`, `tim_collaborator`, `show_portfolio`, `hoc_hoi`
- `nguon_alias_enum`: `admin`, `ai_merge`, `user_de_xuat`
- `nguon_dong_gop_enum`: `tu_apply`, `duoc_moi`
- `nguon_du_lieu_vector_enum`: `khai_bao`, `hanh_vi`, `ket_hop`
- `nguon_goc_moc_enum`: `tu_tao`, `sinh_tu_du_an`, `sinh_tu_su_kien`, `sinh_tu_org_assign`, `sinh_tu_hoc_vien_lop`
- `nguon_su_kien_enum`: `journey_home`, `entity_lens`, `permalink`, `gallery`, `org_page`, `cong_dong`, `khac`
- `nguon_tham_du_enum`: `qr_code`, `admin_manual`, `system_checkin`
- `shop_loai_don_enum`: `mua_ngay`, `dat_truoc_nhan_su_kien`
- `shop_trang_thai_don_enum`: `nhap`, `cho_xac_nhan`, `da_nhan_tien`, `da_giao_tai_su_kien`, `huy`
- `shop_trang_thai_quay_enum`: `cho_xu_ly`, `da_duyet`, `tu_choi`
- `ten_phuong_thuc_enum`: `xet_diem_thi_thpt`, `xet_hoc_ba`, `danh_gia_nang_luc`, `xet_tuyen_thang`, `nang_khieu`, `phong_van`, `danh_gia_tu_duy`, `thi_van_hoa_rieng`, `nang_khieu_ket_hop`, `chung_chi_sat`, `chung_chi_act`, `chung_chi_ib`, `bang_nuoc_ngoai`, `v_sat`, `ket_hop`
- `tinh_thanh_vn_enum`: `ha_noi`, `hue`, `hai_phong`, `da_nang`, `hcm`, `can_tho`, `cao_bang`, `lang_son`, `quang_ninh`, `dien_bien`, `lai_chau`, `son_la`, `nghe_an`, `ha_tinh`, `thanh_hoa`, `tuyen_quang`, `lao_cai`, `thai_nguyen`, `phu_tho`, `bac_ninh`, `hung_yen`, `ninh_binh`, `quang_tri`, `quang_ngai`, `gia_lai`, `khanh_hoa`, `dak_lak`, `lam_dong`, `dong_nai`, `tay_ninh`, `vinh_long`, `dong_thap`, `an_giang`, `ca_mau`
- `tinh_thanh_vn_enum_old`: `ha_noi`, `hcm`, `da_nang`, `hai_phong`, `can_tho`, `an_giang`, `ba_ria_vung_tau`, `bac_giang`, `bac_kan`, `bac_lieu`, `bac_ninh`, `ben_tre`, `binh_dinh`, `binh_duong`, `binh_phuoc`, `binh_thuan`, `ca_mau`, `cao_bang`, `dak_lak`, `dak_nong`, `dien_bien`, `dong_nai`, `dong_thap`, `gia_lai`, `ha_giang`, `ha_nam`, `ha_tinh`, `hai_duong`, `hau_giang`, `hoa_binh`, `hung_yen`, `khanh_hoa`, `kien_giang`, `kon_tum`, `lai_chau`, `lam_dong`, `lang_son`, `lao_cai`, `long_an`, `nam_dinh`, `nghe_an`, `ninh_binh`, `ninh_thuan`, `phu_tho`, `phu_yen`, `quang_binh`, `quang_nam`, `quang_ngai`, `quang_ninh`, `quang_tri`, `soc_trang`, `son_la`, `tay_ninh`, `thai_binh`, `thai_nguyen`, `thanh_hoa`, `thua_thien_hue`, `tien_giang`, `tra_vinh`, `tuyen_quang`, `vinh_long`, `vinh_phuc`, `yen_bai`
- `tinh_trang_tuyen_sinh_enum`: `sap_mo`, `dang_mo`, `da_dong`, `co_ket_qua`
- `trang_thai_bai_dang_enum`: `nhap`, `da_dang`, `archived`
- `trang_thai_bao_cao_enum`: `moi`, `dang_xu_ly`, `da_xu_ly`, `bo_qua`
- `trang_thai_chuong_trinh_enum`: `dang_tuyen`, `tam_dung`, `ngung_dao_tao`
- `trang_thai_dang_ky_su_kien_enum`: `cho_duyet`, `da_duyet`, `tu_choi`, `huy`
- `trang_thai_de_xuat_enum`: `cho_review`, `da_duyet`, `tu_choi`
- `trang_thai_dong_gop_enum`: `cho_duyet`, `da_duyet`, `tu_choi`
- `trang_thai_du_an_enum`: `dang_lam`, `hoan_thanh`, `tam_dung`, `huy`
- `trang_thai_hang_doi_enum`: `cho`, `dang_xu_ly`, `hoan_thanh`, `loi`
- `trang_thai_hoat_dong_enum`: `dang_hoat_dong`, `tam_ngung`, `da_dong_cua`
- `trang_thai_hoc_vien_enum`: `da_dang_ky`, `dang_hoc`, `da_hoan_thanh`, `da_bo_hoc`, `tam_nghi`
- `trang_thai_khoa_hoc_enum`: `sap_khai_giang`, `dang_mo_don`, `dang_hoc`, `da_ket_thuc`, `tam_dung`
- `trang_thai_lop_enum`: `sap_khai_giang`, `dang_hoc`, `da_ket_thuc`, `huy`
- `trang_thai_noi_dung_enum`: `cho_review`, `dang_viet`, `published`, `archived`, `merged`
- `trang_thai_tai_khoan_enum`: `dang_hoat_dong`, `tam_dung`, `da_xoa`, `bi_khoa`
- `trang_thai_tham_du_enum`: `cho_xac_nhan`, `da_xac_nhan`, `tu_choi`
- `trang_thai_thanh_vien_enum`: `active`, `left`, `pending`, `rejected`
- `trang_thai_tin_cay_enum`: `binh_thuong`, `dang_review`, `bi_canh_bao`, `bi_cam`, `verified_official`
- `trang_thai_tuyen_dung_enum`: `nhap`, `dang_mo`, `da_dong`
- `trang_thai_ung_tuyen_enum`: `moi`, `dang_xem`, `phu_hop`, `tu_choi`, `da_nhan`
- `trang_thai_xac_nhan_enum`: `cho_duyet`, `da_xac_nhan`, `tu_choi`
- `trang_thai_yeu_cau_enum`: `cho_xu_ly`, `da_duyet`, `tu_choi`
- `trinh_do_dau_vao_enum`: `co_ban`, `trung_cap`, `nang_cao`, `khong_yeu_cau`
- `vai_tro_chat_enum`: `admin`, `thanh_vien`, `owner`
- `vai_tro_he_thong_enum`: `admin`, `curator`, `thanh_vien`
- `vai_tro_to_chuc_enum`: `owner`, `admin`, `giao_vien`, `nhan_vien`, `hoc_vien`, `thanh_vien`, `quan_ly_tuyen_sinh`, `quan_ly_noi_dung`
- `visibility_field_enum`: `public`, `friends`, `private`
- `visibility_giao_trinh_enum`: `public`, `chi_hoc_vien`, `private`

## Partition children
- `social_luot_xem_2026_05_loai_doi_tuong_id_doi_tuong_idx` → parent `idx_luot_xem_doi_tuong` ()
- `social_luot_xem_2026_06_loai_doi_tuong_id_doi_tuong_idx` → parent `idx_luot_xem_doi_tuong` ()
- `social_luot_xem_2026_05_da_xu_ly_hint_idx` → parent `idx_luot_xem_hint` ()
- `social_luot_xem_2026_06_da_xu_ly_hint_idx` → parent `idx_luot_xem_hint` ()
- `social_luot_xem_2026_05_tao_luc_idx` → parent `idx_luot_xem_tao_luc` ()
- `social_luot_xem_2026_06_tao_luc_idx` → parent `idx_luot_xem_tao_luc` ()
- `social_luot_xem_2026_05` → parent `social_luot_xem` (FOR VALUES FROM ('2026-05-01 00:00:00+00') TO ('2026-06-01 00:00:00+00'))
- `social_luot_xem_2026_06` → parent `social_luot_xem` (FOR VALUES FROM ('2026-06-01 00:00:00+00') TO ('2026-07-01 00:00:00+00'))
- `social_luot_xem_2026_05_loai_boi_canh_id_boi_canh_loai_su_k_idx` → parent `social_luot_xem_boi_canh_idx` ()
- `social_luot_xem_2026_06_loai_boi_canh_id_boi_canh_loai_su_k_idx` → parent `social_luot_xem_boi_canh_idx` ()
- `social_luot_xem_2026_05_tao_luc_idx1` → parent `social_luot_xem_chua_xu_ly_idx` ()
- `social_luot_xem_2026_06_tao_luc_idx1` → parent `social_luot_xem_chua_xu_ly_idx` ()
- `social_luot_xem_2026_05_loai_doi_tuong_id_doi_tuong_loai_su_idx` → parent `social_luot_xem_doi_tuong_idx` ()
- `social_luot_xem_2026_06_loai_doi_tuong_id_doi_tuong_loai_su_idx` → parent `social_luot_xem_doi_tuong_idx` ()