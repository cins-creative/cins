# Handoff: rewrite bài nghề CINs cho Claude

> Mục đích: gom lại bối cảnh, danh sách việc đã làm, chuẩn văn phong mới nhất và prompt để giao tiếp phần rewrite nghề cho Claude.
>
> File liên quan chính: `docs/PLAN_nghe_merge_da_linh_vuc.md`.

---

## 1. Bối cảnh ngắn

Module đang xử lý là canonical **nghề nghiệp** của CINs.

Quy tắc sản phẩm đã chốt:

- **1 nghề = 1 article canonical**.
- Một nghề có thể thuộc nhiều lĩnh vực qua bảng junction `article_gan_linh_vuc`.
- Slug canonical dùng dạng trung tính: `nghe-{role}`.
- Các article bị gộp giữ slug cũ ở trạng thái `merged` và redirect 308 về article thắng.
- Nội dung nghề không viết như bách khoa khô, cũng không list thuật ngữ tiếng Anh.
- Đối tượng đọc chính: **học sinh THPT và sinh viên** đang tìm hiểu ngành sáng tạo.
- Tiếng Việt là chính; English chỉ giữ cho tên nghề/công cụ/khái niệm bắt buộc và phải giải thích bằng tiếng Việt.

---

## 2. Việc kỹ thuật đã làm

### Merge / dữ liệu

- Đã tạo migration `article_gan_linh_vuc` + backfill từ `article_bai_viet.id_linh_vuc`.
- Hub nghề đã đọc lĩnh vực qua junction.
- Đã merge mẫu `3D Animator` về `/nghe-nghiep/nghe-3d-animator`.
- Đã chạy batch merge exact duplicate:
  - Script: `scripts/batch-merge-nghe-dups.mts`.
  - Kết quả ghi nhận: **240** published, **82** merged, **0** cụm exact duplicate còn lại.
- Đã chạy near-role merge:
  - Script: `scripts/batch-merge-nghe-near-roles.mts`.
  - Kết quả ghi nhận: **216** published, **114** merged.
  - Giữ riêng các role có khác biệt thật: `Head of Story`, `Storyboard Artist`, `Motion Designer` theo UI, `UX Designer`, `Rigging TD`, specialty Producer/Illustrator...

### Content rewrite

Đã apply DB thật bằng các script:

- `scripts/apply-nghe-art-director-rewrite.mts`
- `scripts/apply-nghe-next-two-rewrites.mts`
- `scripts/apply-nghe-rewrite-batch1.mts`
- `scripts/apply-nghe-rewrite-batch2.mts`
- `scripts/apply-nghe-rewrite-batch3.mts`
- `scripts/apply-nghe-rewrite-batch4.mts`
- `scripts/apply-nghe-rewrite-batch4-revision1.mts`

Lưu ý quan trọng: sau batch 4, user phản hồi **nội dung chưa mạch lạc**. Vì vậy chuẩn mới không lấy theo batch 2-4 cũ, mà lấy theo **revision mới nhất của bài `Director`** trong `scripts/apply-nghe-rewrite-batch4-revision1.mts`.

---

## 3. Danh sách bài đã rewrite / apply

### Mẫu đầu

1. `nghe-art-director`
2. `nghe-concept-artist`
3. `nghe-ui-designer`

### Batch nghề 1

4. `nghe-colorist`
5. `nghe-compositor`
6. `nghe-texture-surfacing-artist`
7. `nghe-producer`
8. `nghe-production-manager`

### Batch nghề 2

9. `nghe-lighting-artist`
10. `nghe-fx-artist`
11. `nghe-music-composer`
12. `nghe-pipeline-td`
13. `nghe-project-manager`
14. `nghe-render-td`
15. `nghe-rigging-artist`
16. `nghe-sound-designer`
17. `nghe-storyboard-artist`
18. `nghe-architectural-visualizer`

### Batch nghề 3

19. `nghe-illustrator`
20. `nghe-motion-designer`
21. `nghe-3d-animator`
22. `nghe-3d-generalist`
23. `nghe-3d-modeler`
24. `nghe-character-concept-artist`
25. `nghe-character-designer`
26. `nghe-character-modeler`
27. `nghe-costume-designer`
28. `nghe-creative-director`

### Batch nghề 4

29. `nghe-design-director`
30. `nghe-design-manager`
31. `nghe-director`
32. `nghe-editor`
33. `nghe-environment-artist`
34. `nghe-environment-concept-artist`
35. `nghe-foley-artist`
36. `nghe-line-producer`
37. `nghe-previs-artist`
38. `nghe-product-designer`

### Revision theo feedback "mạch lạc hơn"

Đã sửa lại 5 bài sau bằng script `scripts/apply-nghe-rewrite-batch4-revision1.mts`:

1. `nghe-product-designer`
2. `nghe-design-director`
3. `nghe-design-manager`
4. `nghe-director`
5. `nghe-editor`

Trong đó `Product Designer` đã được chốt nghĩa:

- Ở bài này, `Product Designer` = **nhà thiết kế sản phẩm số** trong app/web/dashboard/product team.
- Không mô tả như industrial/product designer thiết kế đồ vật vật lý.
- Không thu hẹp thành người chỉ "vẽ UI đẹp".
- Cần nói rõ vai trò đứng giữa người dùng, sản phẩm, UI/UX và khả năng build thật.

---

## 4. Văn phong mẫu mới nhất: lấy theo bài `Director`

Nguồn mẫu: `scripts/apply-nghe-rewrite-batch4-revision1.mts`, entry `nghe-director`.

### Tinh thần chung

Viết như một bài giải thích nghề cho học sinh/sinh viên đang tự hỏi:

- "Nghề này thật sự làm gì?"
- "Có giống điều mình tưởng không?"
- "Nếu muốn thử thì bắt đầu từ đâu?"

Không viết như:

- Từ điển nghề nghiệp.
- Danh sách bullet quá dày.
- Bài SEO nhồi keyword.
- Bài dịch tiếng Anh sang tiếng Việt.
- Bài liệt kê thuật ngữ production.

### Cấu trúc khuyến nghị

Giữ HTML class hiện có để frontend render đúng:

```html
<section class="arc-intro">...</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>{Role} là ai?</h2>
  ...
  <div class="arc-infobox">
    <span class="arc-infobox-label">Xuất hiện ở đâu?</span>
    ...
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>{Cốt lõi công việc}</h2>
  ...
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Cần luyện gì?</h2>
  ...
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Lộ trình bắt đầu</h2>
  <div class="arc-path">...</div>
</section>
```

### Nhịp viết

Mỗi bài nên có:

- `arc-intro`: 2 đoạn mở bằng tình huống cụ thể, có cảm giác nghề.
- Section 01: giải thích nghề, ranh giới với nghề dễ nhầm, đoạn dành cho HS/SV.
- Infobox "Xuất hiện ở đâu?": ngắn, không biến thành list dài.
- Section 02: viết bằng prose, đi theo logic công việc thật. Có thể dùng 1 `arc-job-item` để nhấn điểm dễ nhầm hoặc câu hỏi nghề hay tự hỏi.
- Section 03: năng lực cần luyện, nhưng viết thành đoạn mạch lạc, không chỉ list skill.
- Section 04: lộ trình 5 bước, cụ thể cho HS/SV.

### Mẫu giọng từ bài Director

Ví dụ tinh thần mở bài:

> Cùng một kịch bản, có đạo diễn kể thành một bộ phim hài ấm áp, có người kể thành một câu chuyện lạnh và căng. Khác biệt không chỉ nằm ở máy quay hay diễn viên, mà ở cách nhìn: cảnh nào được giữ lại, nhân vật im lặng bao lâu, camera đứng gần hay xa, âm thanh có nên vang lên hay để trống.

Điểm cần học từ mẫu này:

- Mở bằng tình huống cụ thể, không định nghĩa ngay.
- Không nhồi thuật ngữ.
- Dẫn từ trải nghiệm người xem sang bản chất nghề.
- Sau đó mới định nghĩa vai trò.

### Quy tắc để tránh "không mạch lạc"

- Mỗi section chỉ có một ý chính.
- Không biến mỗi đoạn thành một cụm bullet "đúng nhưng rời".
- Tránh chuyển từ việc này sang việc khác mà không có câu nối.
- Ít dùng tiếng Anh trong phần thân bài. Nếu dùng, giải thích ngay.
- Với nghề senior/manager/director, phải nói rõ đây **không phải vị trí entry-level**, mà là hướng phát triển dài hạn.
- Với nghề dễ nhầm, luôn có đoạn "không nên hiểu sai".

---

## 5. Guard chất lượng trước khi apply

Mỗi batch chỉ nên làm **5 bài/lần** cho đến khi user xác nhận style ổn.

Checklist:

- Có `arc-intro`.
- Có `Xuất hiện ở đâu?`.
- Có đoạn nhắc đối tượng `học sinh THPT` hoặc `sinh viên`.
- Có `arc-path`.
- Không dính các từ guard cũ:
  - `style guide`
  - `art bible`
  - `paint-over`
  - `moodboard`
  - `reference book`
  - `brief nội bộ`
  - `stakeholder`
  - `deliverable`
  - `game art dump`
- Với nghề mơ hồ, phải có đoạn phân biệt nghĩa đúng/nghĩa dễ nhầm.
- Không dùng template quá máy móc giữa các bài.

Ví dụ verify SQL/Node đã dùng:

```ts
const rows = await sql`
  SELECT slug, length(noi_dung)::int AS len,
    (noi_dung ~* '(style guide|art bible|paint-over|moodboard|reference book|brief nội bộ|stakeholder|deliverable|game art dump)') AS has_jargon,
    (noi_dung LIKE '%học sinh%' OR noi_dung LIKE '%sinh viên%') AS has_audience,
    (noi_dung LIKE '%Xuất hiện ở đâu%') AS has_fields_box,
    (noi_dung LIKE '%<section class="arc-intro"%') AS has_intro,
    (noi_dung LIKE '%<div class="arc-path"%') AS has_path
  FROM article_bai_viet
  WHERE slug = ANY(${slugs})
  ORDER BY array_position(${slugs}, slug)
`;
```

---

## 6. Cách viết script apply

Pattern hiện tại:

- Tạo script `.mts` trong `scripts/`.
- Dùng `postgres(process.env.DATABASE_URL, { max: 1, prepare: false })`.
- Mỗi article update các field:
  - `tieu_de_viet`
  - `tom_tat`
  - `meta_title`
  - `meta_description`
  - `trang_thai_noi_dung = 'published'`
  - `noi_dung`
  - `cap_nhat_luc = now()`
- Filter an toàn:
  - `WHERE id = ${id}::uuid`
  - `AND loai_bai_viet = 'nghe'`
- Chạy dry-run trước, apply sau:
  - `npx tsx scripts/<script>.mts`
  - `npx tsx scripts/<script>.mts --apply`

---

## 7. Gợi ý task tiếp theo cho Claude

Nếu mục tiêu là sửa tiếp các bài batch 4 còn chưa được revision theo style Director, batch tiếp theo nên là 5 bài:

1. `nghe-environment-artist`
2. `nghe-environment-concept-artist`
3. `nghe-foley-artist`
4. `nghe-line-producer`
5. `nghe-previs-artist`

Prompt gợi ý để đưa Claude:

```md
Bạn đang làm trong repo CINs. Đọc `docs/HANDOFF_nghe_rewrite_claude.md` và `docs/PLAN_nghe_merge_da_linh_vuc.md`.

Hãy rewrite lại đúng 5 bài nghề sau theo văn phong mẫu mới nhất lấy từ bài `nghe-director` trong `scripts/apply-nghe-rewrite-batch4-revision1.mts`:

- `nghe-environment-artist`
- `nghe-environment-concept-artist`
- `nghe-foley-artist`
- `nghe-line-producer`
- `nghe-previs-artist`

Yêu cầu:

- Chỉ làm 5 bài này, không batch 10.
- Văn phong mạch lạc, prose nhiều hơn bullet.
- Đối tượng: học sinh THPT và sinh viên.
- Tiếng Việt là chính; English chỉ giữ tên nghề/công cụ cần thiết.
- Mỗi bài có `arc-intro`, `arc-section`, `arc-infobox`, `arc-path`.
- Mỗi bài cần giải thích nghề bằng tình huống cụ thể, rồi mới định nghĩa.
- Không viết kiểu list thuật ngữ.
- Nếu nghề dễ nhầm, có đoạn "không nên hiểu sai".
- Tạo script apply `.mts`, dry-run, apply DB thật, verify guard, commit/push.
- Sau khi xong, gửi link thật `https://cins.vn/nghe-nghiep/{slug}`.
```

---

## 8. Ghi chú cho người nhận task

- Đừng lấy batch 2/3/4 cũ làm mẫu văn phong chính. Các batch đó đúng cấu trúc nhưng user đã phản hồi chưa mạch lạc.
- Lấy bài `Director` revised làm mẫu nhịp viết.
- `Product Designer` đã được sửa lại theo nghĩa sản phẩm số; không cần sửa lại trừ khi user muốn polish thêm.
- Từ giờ nên đi batch 5 bài, verify, cho user đọc, rồi mới tiếp.
