# CINS — Brief: Viết nội dung bài viết Nghề nghiệp

Dùng file này khi yêu cầu AI viết nội dung cho một bài `loai_bai_viet = 'nghe'` đã có trong database.

---

## Thông tin đầu ra cần tạo

**SQL UPDATE** — cập nhật các field sau vào row đã có trong `article_bai_viet`:
- `tieu_de_viet` — tên nghề tiếng Việt
- `tom_tat` — 1–2 câu tiếng Việt
- `meta` — `jsonb_build_object('video_url', '')`
- `meta_title` — SEO title
- `meta_description` — SEO description dưới 160 ký tự
- `trang_thai_noi_dung` — set thành `'published'`
- `noi_dung` — HTML đầy đủ 4 sections

**SQL article_gan_nhom** — gán nhóm phân loại

> **Bắt buộc:** Dùng `WHERE id = '[uuid]'` — không dùng slug.

> **Không tạo** `article_lien_quan`. Bỏ qua.

---

## Cấu trúc SQL

### Phần 1 — UPDATE

```sql
UPDATE article_bai_viet SET
  tieu_de_viet        = '[Tên nghề tiếng Việt]',
  tom_tat             = '[1-2 câu]',
  meta                = jsonb_build_object('video_url', ''),
  meta_title          = '[Tên nghề] là gì? Công việc, kỹ năng và lộ trình vào nghề | CINS',
  meta_description    = '[dưới 160 ký tự]',
  trang_thai_noi_dung = 'published',
  noi_dung            = $noidung$
    [HTML 4 SECTIONS]
  $noidung$
WHERE id = '[uuid]'
  AND loai_bai_viet = 'nghe';
```

> Dùng dollar-quoting `$noidung$...$noidung$` — tránh lỗi escape dấu nháy đơn trong HTML.

### Phần 2 — Gán nhóm

```sql
INSERT INTO article_gan_nhom (id_bai_viet, id_nhom)
SELECT b.id, n.id
FROM article_bai_viet b, article_nhom n
WHERE b.id = '[uuid]'
  AND n.slug IN (
    '[slug-nhom-1]',
    '[slug-nhom-2]',
    '[slug-nhom-3]'
  )
ON CONFLICT DO NOTHING;
```

**Slug nhóm theo `loai_nhom` — schema thực tế trong DB CINs (v6, 2026-05):**

DB không dùng `lv-*`/`bp-*`/`kt-*` như brief gốc. Thay vào đó, `bo_phan` đã encode cả lĩnh vực + vai trò trong slug: `nghe-{linh-vuc}-{vai-tro}`.

| loai_nhom | Slug có sẵn |
|---|---|
| `bo_phan` (lĩnh vực 3D) | `nghe-3d-concept-tien-ky`, `nghe-3d-modeling-sculpting`, `nghe-3d-texturing-shading`, `nghe-3d-lighting-rendering`, `nghe-3d-visualization`, `nghe-3d-quan-ly-san-xuat` |
| `bo_phan` (lĩnh vực Game) | `nghe-game-tien-san-xuat`, `nghe-game-san-xuat-art`, `nghe-game-technical-art`, `nghe-game-level-design`, `nghe-game-am-thanh`, `nghe-game-qa-release`, `nghe-game-quan-ly-san-xuat` |
| `bo_phan` (lĩnh vực Hoạt hình) | `nghe-hoat-hinh-tien-san-xuat`, `nghe-hoat-hinh-san-xuat-2d`, `nghe-hoat-hinh-san-xuat-3d`, `nghe-hoat-hinh-technical-art`, `nghe-hoat-hinh-hau-ky`, `nghe-hoat-hinh-am-thanh`, `nghe-hoat-hinh-quan-ly-san-xuat` |
| `bo_phan` (lĩnh vực Phim) | `nghe-phim-tien-san-xuat`, `nghe-phim-san-xuat`, `nghe-phim-hau-ky`, `nghe-phim-am-thanh`, `nghe-phim-phat-hanh`, `nghe-phim-quan-ly-san-xuat` |
| `bo_phan` (lĩnh vực VFX) | `nghe-vfx-tien-hien-truong`, `nghe-vfx-3d-fx`, `nghe-vfx-compositing`, `nghe-vfx-motion-graphics`, `nghe-vfx-technical`, `nghe-vfx-quan-ly-san-xuat` |
| `bo_phan` (lĩnh vực Comic) | `nghe-comic-sang-tac`, `nghe-comic-ve-san-xuat`, `nghe-comic-hoan-thien`, `nghe-comic-quan-ly-xuat-ban`, `nghe-comic-phat-hanh` |
| `bo_phan` (lĩnh vực Đồ hoạ) | `nghe-dohoa-branding`, `nghe-dohoa-print-editorial`, `nghe-dohoa-packaging`, `nghe-dohoa-digital-social`, `nghe-dohoa-environmental`, `nghe-dohoa-quan-ly-san-xuat` |
| `bo_phan` (lĩnh vực UI/UX) | `nghe-uiux-ui-design`, `nghe-uiux-ux-design`, `nghe-uiux-ux-research`, `nghe-uiux-content`, `nghe-uiux-quan-ly-san-xuat` |
| `bo_phan` (lĩnh vực Minh hoạ) | `nghe-minh-hoa-concept-dev`, `nghe-minh-hoa-ky-thuat-so`, `nghe-minh-hoa-thuong-mai`, `nghe-minh-hoa-chuyen-nganh`, `nghe-minh-hoa-quan-ly-san-xuat` |
| `bo_phan` (lĩnh vực Kiến trúc) | `nghe-kien-truc-thiet-ke`, `nghe-kien-truc-noi-that`, `nghe-kien-truc-visualization`, `nghe-kien-truc-ho-so-kt`, `nghe-kien-truc-giam-sat`, `nghe-kien-truc-quan-ly-du-an` |
| `bo_phan` (lĩnh vực Thời trang) | `nghe-thoitrang-nghien-cuu`, `nghe-thoitrang-ky-thuat`, `nghe-thoitrang-styling`, `nghe-thoitrang-visual-marketing`, `nghe-thoitrang-kiem-soat-cl`, `nghe-thoitrang-quan-ly-san-xuat` |
| `nhom_nganh` | `nn-my-thuat-thiet-ke`, `nn-my-thuat-thuan-tuy`, `nn-kien-truc-xay-dung`, `nn-bao-chi-truyen-thong` |
| `ky_thuat` | (chỉ có 1 slug `ky-thuat-ve-tay`, hiếm dùng) |
| `cap_do` | (không gán cho nghề) |

**Quy tắc gán nhóm:**
- Mỗi bài bắt buộc 1 `bo_phan` (chọn slug khớp lĩnh vực + vai trò), 1 `nhom_nganh` (nếu phù hợp)
- Slug bài viết `nghe-{linhvuc}-{ten-nghe}` quyết định lĩnh vực — hãy chọn `bo_phan` cùng prefix `nghe-{linhvuc}-`
- Không gán `cap_do` cho nghề
- Pipeline tự bỏ qua nhóm trùng nhờ `ON CONFLICT DO NOTHING`

---

## Cấu trúc HTML (`noi_dung`) — 4 sections bắt buộc

---

### INTRO (không đánh số)

```html
<section class="arc-intro">
  <p>[Câu mở bằng ví dụ thực tế — sản phẩm cụ thể mà nghề này tạo ra, hoặc tình huống người ta thấy rõ nhất vai trò của nghề này]</p>
  <p>[Điều gì làm nghề này khác với nghề tương tự — đặt ngay ở đây để người đọc không nhầm]</p>
</section>
```

**Yêu cầu:** Không quá 4 câu. Không bắt đầu bằng "[Tên nghề] là nghề...". Tên nghề tiếng Anh giữ nguyên.

---

### SECTION 01 — [Tên nghề] là ai?

```html
<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>[Tên nghề] là ai?</h2>
  <p>[Định nghĩa — nghề này làm gì, tạo ra sản phẩm gì cụ thể]</p>
  <p>[Khác với nghề tương tự như thế nào — nếu có nghề dễ nhầm]</p>
  <ul class="arc-list">
    <li>[Trách nhiệm cốt lõi 1 — có <strong>thuật ngữ</strong> inline nếu cần]</li>
    <li>[Trách nhiệm cốt lõi 2]</li>
    <li>[Trách nhiệm cốt lõi 3]</li>
    <li>[Trách nhiệm cốt lõi 4]</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"[keyword tiếng Anh — tên nghề + context + tool]"</span>
    </div>
    <p class="arc-image-caption">[Chú thích tiếng Việt]</p>
  </div>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Vị trí trong quy trình sản xuất</span>
    <p>[Thuộc giai đoạn nào: tiền kỳ / sản xuất / hậu kỳ. Nhận đầu vào từ <strong>nghề/bộ phận nào</strong>, bàn giao cho <strong>ai</strong>.]</p>
  </div>
</section>
```

---

### SECTION 02 — Công việc cụ thể

```html
<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Công việc của một [Tên nghề]</h2>

  <!-- 3–5 arc-job-item, mỗi item là 1 đầu việc chính -->
  <div class="arc-job-item">
    <h3 class="arc-h3">1. [Tên đầu việc]</h3>
    <p>[Mô tả — 2–3 câu: làm gì, tại sao quan trọng, kết quả trông như thế nào]</p>
    <ul class="arc-list">
      <li><strong>[Thuật ngữ]</strong> — [giải thích tiếng Việt ngắn]</li>
      <li><strong>[Thuật ngữ]</strong> — [giải thích]</li>
    </ul>

    <!-- Chọn 1 dạng ảnh phù hợp — xem quy tắc bên dưới -->
    <div class="arc-image-block arc-image-single">
      <div class="arc-image-placeholder">
        <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
        <span class="arc-img-hint-kw">"[keyword tiếng Anh mô tả đầu việc này]"</span>
      </div>
      <p class="arc-image-caption">[Chú thích]</p>
    </div>
  </div>

</section>
```

**Dạng ảnh:**
- 1 khái niệm → `arc-image-single`
- 2 thứ so sánh / trước-sau → `arc-image-grid-2`
- 3 ví dụ cùng loại → `arc-image-grid-3`
- Kết quả cuối / quy trình → `arc-image-wide` + class `arc-image-placeholder--wide`

---

### SECTION 03 — Cần giỏi gì?

```html
<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>[Tên nghề] cần giỏi gì?</h2>

  <!-- 6 kỹ năng — icon grid -->
  <div class="arc-skill-grid">
    <div class="arc-skill-icon-item">
      <span class="arc-skill-emoji">[emoji]</span>
      <span>[Tên kỹ năng ngắn — tiếng Việt]</span>
    </div>
    <!-- x6 -->
  </div>

  <!-- Accordion giải thích chi tiết — đúng 6 item, khớp với icon grid -->
  <div class="arc-accordion">

    <details class="arc-card" open>
      <summary>[Kỹ năng quan trọng nhất — mở sẵn]</summary>
      <div class="arc-card-body">
        <p>[Tại sao kỹ năng này quan trọng đặc biệt với nghề này]</p>
        <p>[Cách học / rèn luyện cụ thể]</p>
      </div>
    </details>

    <details class="arc-card">
      <summary>[Kỹ năng 2]</summary>
      <div class="arc-card-body"><p>...</p></div>
    </details>

    <!-- x6 total, thứ tự accordion khớp với thứ tự icon grid -->

  </div>
</section>
```

**Emoji theo loại kỹ năng:**

| Kỹ năng | Emoji |
|---|---|
| Thị giác / thẩm mỹ | 🎨 |
| Kỹ thuật / công nghệ | ⚙️ |
| Tư duy / phân tích | 🧠 |
| Giao tiếp / làm việc nhóm | 💬 |
| Sáng tạo / kể chuyện | ✨ |
| Màu sắc / ánh sáng | 🌈 |
| Âm thanh / nhịp điệu | 🎵 |
| Tổ chức / quản lý | 📋 |
| Vật liệu / không gian | 📦 |
| Tốc độ / phản xạ | ⚡ |

---

### SECTION 04 — Lộ trình

```html
<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Làm cách nào để trở thành [Tên nghề]?</h2>
  <div class="arc-path">

    <div class="arc-path-step">
      <div class="arc-step-num">1</div>
      <div class="arc-step-body">
        <strong>[Nền tảng — kỹ năng hoặc phần mềm cốt lõi cần học trước]</strong>
        <p>[2–3 câu: học cái gì, ở đâu, mục tiêu của bước này là gì]</p>
      </div>
    </div>

    <!-- 4–6 bước tổng cộng -->

    <div class="arc-path-step">
      <div class="arc-step-num">[N]</div>
      <div class="arc-step-body">
        <strong>Xây dựng portfolio thực tế</strong>
        <p>[Portfolio nghề này cần có gì cụ thể — loại dự án, số lượng, đặc điểm. Đăng ở đâu — ArtStation, Behance, GitHub tùy nghề.]</p>
      </div>
    </div>

  </div>
</section>
```

**Quy tắc lộ trình:**
- Bước 1: nền tảng cốt lõi (phần mềm, kỹ năng vẽ, kiến thức nền)
- Bước giữa: học chuyên sâu → thực hành dự án → kết nối pipeline với nghề khác
- Bước cuối: portfolio — nêu **cụ thể** loại dự án, số lượng, nên đăng ở đâu

---

## Quy tắc viết nội dung

### Ngôn ngữ
- Thuần tiếng Việt — người đọc là học sinh THPT chưa biết ngành
- Giữ nguyên tiếng Anh: tên nghề, tên phần mềm, thuật ngữ kỹ thuật không có từ Việt tương đương
- Thay thế: pipeline → quy trình sản xuất; brief → yêu cầu; feedback → góp ý; iteration → vòng chỉnh sửa; workflow → luồng công việc
- Giọng văn: người đi trước kể chuyện nghề cho đàn em nghe — thân thiện, cụ thể, không hàn lâm

### HTML
- `<strong>` nằm inline trong câu — không đứng một mình thành dòng riêng
- `&amp;` thay cho `&` trong text
- Dùng dollar-quoting `$noidung$...$noidung$` trong SQL

### Ảnh
- Keyword tiếng Anh — search Unsplash, Behance, ArtStation, Pinterest
- Mô tả cụ thể: tên nghề + hành động + công cụ + bối cảnh
- Caption tiếng Việt, ngắn, nêu ý nghĩa của ảnh với bài

---

## Ví dụ

**Yêu cầu:**
> Viết nội dung về UI Artist (id: abc123...) theo brief CINS

**Output:**
1. SQL UPDATE với `$noidung$...$noidung$` bao gồm 4 sections đầy đủ
2. SQL INSERT `article_gan_nhom` với 3+ slug nhóm phù hợp
