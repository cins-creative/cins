# CINS — Cursor Agent Pipeline: Viết nội dung Nghề nghiệp

Instruction này dành cho Cursor AI chạy vòng lặp tự động viết nội dung bài viết `loai_bai_viet = 'nghe'`.

---

## Chuẩn bị trước khi chạy

1. File này (`cins-cursor-pipeline-nghe.md`) đã được kéo vào chat
2. File brief nội dung (`cins-brief-article-nghe-v2.md`) đã được kéo vào chat
3. Cursor đã có quyền gọi Admin SQL API (đã test thành công)

---

## Vòng lặp — chạy đúng thứ tự, không bỏ bước

### BƯỚC 0 — Kiểm tra hàng đợi

Chạy SQL (mode **Chỉ đọc**):

```sql
SELECT COUNT(*) AS tong_chua_viet
FROM article_bai_viet
WHERE loai_bai_viet = 'nghe'
  AND (noi_dung IS NULL OR noi_dung = '');
```

In kết quả. Nếu = 0 thì dừng, báo "Đã hoàn thành tất cả bài nghề."

---

### BƯỚC 1 — Lấy 5 bài tiếp theo

Chạy SQL (mode **Chỉ đọc**):

```sql
SELECT
  id,
  slug,
  tieu_de,
  tieu_de_viet,
  tom_tat
FROM article_bai_viet
WHERE loai_bai_viet = 'nghe'
  AND (noi_dung IS NULL OR noi_dung = '')
ORDER BY tieu_de ASC
LIMIT 5;
```

Lưu danh sách. Đây là 5 bài sẽ xử lý trong lần chạy này.

---

### BƯỚC 2 — Với mỗi bài, làm tuần tự

Với **từng bài một** (không song song):

#### 2a. Xác định lĩnh vực và bộ phận

Đọc `tieu_de` và xác định:

**Lĩnh vực (linh_vuc):**

| Nếu tieu_de liên quan đến | Dùng slug |
|---|---|
| Game, game engine, gameplay | lv-game |
| Phim, hoạt hình, animation | lv-phim-hoat-hinh |
| Hội họa, mỹ thuật thuần túy | lv-my-thuat |
| Thiết kế đồ họa, branding, print | lv-thiet-ke-do-hoa |
| Kiến trúc, nội thất, không gian | lv-kien-truc-noi-that |
| Thời trang, may mặc | lv-thoi-trang |
| UI, UX, product design | lv-ui-ux |
| Nhiếp ảnh, quay phim, video | lv-nhiep-anh-video |

**Bộ phận (bo_phan):**

| Nếu nghề này thuộc giai đoạn | Dùng slug |
|---|---|
| Lên ý tưởng, concept, script, storyboard | bp-tien-san-xuat |
| Thực hiện sản phẩm chính (vẽ, model, quay) | bp-san-xuat |
| Chỉnh sửa sau khi có sản phẩm thô (edit, color, composite) | bp-hau-ky |
| Quản lý đội, dự án, studio | bp-quan-ly |
| Quảng bá, social, content | bp-marketing |

**Kỹ thuật (ky_thuat) — chọn 1–2:**

| Chuyên môn | Slug |
|---|---|
| Vẽ tay 2D, illustration | kt-2d-illustration |
| 3D modeling, sculpt | kt-3d |
| Animation (2D hoặc 3D) | kt-animation |
| Motion graphics, VFX, composite | kt-motion-vfx |
| Color grading, color theory | kt-color |
| Typography, layout, in ấn | kt-typography-print |
| UX research, prototyping | kt-ux-research |
| Âm thanh, âm nhạc | kt-audio |
| Render, lighting, shading | kt-render-lighting |

#### 2b. Soạn nội dung theo brief

Đọc `cins-brief-article-nghe-v2.md` và soạn HTML 4 sections:
- **Intro** — 2 đoạn, không quá 4 câu, mở bằng ví dụ thực tế
- **Section 01** — ai là [nghề này], trách nhiệm cốt lõi, infobox vị trí trong quy trình
- **Section 02** — 3–5 đầu việc chính, mỗi đầu việc có mô tả + danh sách thuật ngữ + ảnh placeholder
- **Section 03** — 6 kỹ năng icon grid + 6 accordion chi tiết, thứ tự khớp nhau
- **Section 04** — 4–6 bước lộ trình, bước cuối là portfolio cụ thể

#### 2c. Tạo SQL

**Phần 1 — UPDATE:**
```sql
UPDATE article_bai_viet SET
  tieu_de_viet        = '...',
  tom_tat             = '...',
  meta                = jsonb_build_object('video_url', ''),
  meta_title          = '...',
  meta_description    = '...',
  trang_thai_noi_dung = 'published',
  noi_dung            = $noidung$
    [HTML 4 sections]
  $noidung$
WHERE id = '[uuid từ bước 1]'
  AND loai_bai_viet = 'nghe';
```

**Phần 2 — Gán nhóm:**
```sql
INSERT INTO article_gan_nhom (id_bai_viet, id_nhom)
SELECT b.id, n.id
FROM article_bai_viet b, article_nhom n
WHERE b.id = '[uuid]'
  AND n.slug IN ('[lv-slug]', '[bp-slug]', '[kt-slug-1]', '[kt-slug-2]')
ON CONFLICT DO NOTHING;
```

#### 2d. Chạy SQL

Chạy **Phần 1** trước (mode **Đầy đủ**) → kiểm tra `1 row affected`.
Chạy **Phần 2** sau → kiểm tra số rows inserted.

#### 2e. Verify

```sql
SELECT slug, tieu_de, trang_thai_noi_dung,
       LENGTH(noi_dung) AS do_dai
FROM article_bai_viet
WHERE id = '[uuid]';
```

`do_dai > 1000` và `trang_thai = 'published'` → in `✓ [tieu_de] — [do_dai] ký tự`.

---

### BƯỚC 3 — Báo cáo

Sau khi xong 5 bài:

```sql
SELECT COUNT(*) AS con_lai
FROM article_bai_viet
WHERE loai_bai_viet = 'nghe'
  AND (noi_dung IS NULL OR noi_dung = '');
```

In báo cáo:

```
── Kết quả lần chạy này ──
✓ [Tên nghề 1] — [N] ký tự
✓ [Tên nghề 2] — [N] ký tự
✓ [Tên nghề 3] — [N] ký tự
✓ [Tên nghề 4] — [N] ký tự
✓ [Tên nghề 5] — [N] ký tự

Còn lại: [X] bài chưa có nội dung.
Chạy lại để tiếp tục.
```

---

## Xử lý lỗi

| Tình huống | Cách xử lý |
|---|---|
| `0 rows affected` | Query `SELECT id FROM article_bai_viet WHERE slug = '[slug]'` lấy đúng UUID |
| Dollar-quoting lỗi | Đổi delimiter: `$body$...$body$` |
| Nghề quá hẹp / ít thông tin | Viết section 02 ngắn hơn (2–3 đầu việc thay vì 5), giữ đủ 4 sections |
| Không chắc lĩnh vực | Ưu tiên slug gần nhất — có thể gán 2 linh_vuc nếu nghề nằm ở giao điểm |
| `do_dai < 1000` sau verify | Nội dung quá ngắn — kiểm tra section 02 có đủ đầu việc và ảnh placeholder không |

---

## Lưu ý quan trọng

- **Không** tạo `article_lien_quan`
- **Không** UPDATE bài đã có `noi_dung`
- **Luôn** dùng `WHERE id = '...' AND loai_bai_viet = 'nghe'`
- **Thứ tự** xử lý: `ORDER BY tieu_de ASC` — ổn định, tái tạo được
- **Section 03**: thứ tự 6 item trong icon grid phải khớp với thứ tự 6 accordion bên dưới
- **Section 04**: bước cuối luôn là portfolio — nêu cụ thể loại dự án và nơi đăng
