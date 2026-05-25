# CINS — Brief: Viết nội dung bài viết Môn học (v3 — 6 sections)

Dùng cho bài `loai_bai_viet = 'mon_hoc'` đã có trong database.

**Mẫu chất lượng:** `c:\Users\DELL\Downloads\update-bo-cuc-mau-v3.sql` (~13k ký tự).

---

## Cấu trúc HTML — 6 sections bắt buộc

| Section | Component | Nội dung |
|---|---|---|
| **Intro** (không số) | `arc-intro` | 2 đoạn, max 4 câu. Không mở bằng "[Tên môn] là môn học..." |
| **01** | `arc-section` + `arc-num` | [Tên môn] là gì? 2 đoạn + `arc-image-single` + (tùy chọn) `arc-infobox` |
| **02** | `arc-section` | Học những gì? 1 đoạn + `arc-list` 4-5 mục + `arc-image-grid-2` |
| **03** | `arc-section` | Tại sao quan trọng? 1-2 đoạn + `arc-infobox` (nếu ≥3 ngành) + `arc-image-single` |
| **04** | `arc-section` | Thi / Đánh giá — theo loại môn + `arc-image-wide` |
| **05** | `arc-accordion` | Lưu ý khi làm bài — 5-6 `details.arc-card` (cái đầu mở sẵn) |
| **06** | `arc-path` | Các bước làm bài — 5-6 `arc-path-step` đánh số 1, 2, 3... |

---

## SQL UPDATE

```sql
UPDATE article_bai_viet SET
  tieu_de             = '[Tên có dấu chuẩn]',
  tieu_de_eng         = '[Tiếng Anh hoặc NULL]',
  tieu_de_viet        = '[= tieu_de]',
  tom_tat             = '[1-2 câu]',
  meta_title          = '[Tên] là gì? Học gì, thi như thế nào và ứng dụng thực tế | CINS',
  meta_description    = '[< 160 ký tự]',
  trang_thai_noi_dung = 'published',
  noi_dung            = $noidung$[HTML 6 sections]$noidung$
WHERE id = '[uuid]'
  AND loai_bai_viet = 'mon_hoc';
```

> **Bắt buộc:** `WHERE id = '[uuid]'` — không dùng slug.
> **Không tạo** `article_lien_quan` / `article_gan_nhom`.

---

## Section 05 — `arc-accordion`

```html
<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">05</span>Những lưu ý khi làm bài</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>[Lỗi phổ biến nhất — câu ngắn, hành động]</summary>
      <div class="arc-card-body">
        <p>[Vấn đề + hậu quả.]</p>
        <p>[Cách tránh / sửa cụ thể.]</p>
      </div>
    </details>

    <details class="arc-card">
      <summary>[Lưu ý 2]</summary>
      <div class="arc-card-body"><p>[Nội dung.]</p></div>
    </details>

    <!-- 5-6 lưu ý -->
  </div>
</section>
```

**Quy tắc:**
- Mỗi lưu ý = 1 lỗi cụ thể, không chung chung
- Cái đầu (`open`) là lỗi quan trọng nhất
- Summary là câu ngắn dạng hành động, không phải danh từ trừu tượng

---

## Section 06 — `arc-path`

```html
<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">06</span>Các bước làm bài</h2>
  <div class="arc-path">

    <div class="arc-path-step">
      <div class="arc-step-num">1</div>
      <div class="arc-step-body">
        <strong>[Đọc đề / chuẩn bị]</strong>
        <p>[Làm gì, tại sao, mất bao lâu — 2-3 câu.]</p>
      </div>
    </div>

    <!-- 5-6 bước -->

    <div class="arc-path-step">
      <div class="arc-step-num">[N]</div>
      <div class="arc-step-body">
        <strong>[Hoàn thiện và kiểm tra]</strong>
        <p>[Nhìn tổng thể, biết khi nào dừng tay.]</p>
      </div>
    </div>

  </div>
</section>
```

**Quy tắc:**
- 5-6 bước, đủ làm theo thực tế
- Bước 1 luôn là **đọc đề / xác định hướng**
- Bước cuối luôn là **nhìn tổng thể + biết khi nào dừng**
- Môn thi: có thời gian ước tính ("30 phút đầu...")

---

## Quy tắc viết

- **Ngôn ngữ:** thuần Việt, đối tượng THPT/SV. Giữ tiếng Anh khi không có từ Việt (gouache, storyboard...).
- **Tránh:** "trang bị cho người học", "thông qua việc", "nền tảng vững chắc" → nói thẳng.
- **Giọng:** anh chị đi trước kể chuyện cho đàn em.
- **HTML:** `<strong>` inline trong câu; `&amp;` thay `&`; dollar-quoting `$noidung$...$noidung$`.
- **Ảnh placeholder:** keyword tiếng Anh cụ thể (chủ thể + hành động + chất liệu + bối cảnh) + caption Việt.

### Theo loại môn

| Loại | Đặc điểm section 04 |
|---|---|
| Thi năng khiếu (Hình họa, Bố cục màu) | Mô tả đề + tiêu chí chấm + thời gian |
| Kỹ thuật (AutoCAD, Dựng 3D) | Quy trình + bài tập + đồ án |
| Nghệ thuật (Sơn mài, Lụa) | Kỹ thuật chất liệu + ứng dụng hiện đại |
| Lý thuyết (Lịch sử mỹ thuật) | Thi viết / tiểu luận |
| Thiết kế ứng dụng (Typography, UX/UI) | Portfolio + dự án thực |
| Media (Motion, Dựng phim) | Bài tập dự án + reel |
