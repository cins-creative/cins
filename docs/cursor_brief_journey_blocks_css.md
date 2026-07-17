# Brief — Cấu trúc block + CSS render bài Journey

> **Mục đích:** Brief cho agent/Claude soạn lại bài từ URL nguồn → JSON `noi_dung_blocks` khớp CINs, ghi DB đúng — trang render đúng CSS mà không viết HTML/CSS tay.
> **Phạm vi:** Journey compose (`EditorView`) · xem bài (`JourneyPostBody` / `PostBlockRenderer`) · org bài đăng cùng format block.
> **Không dùng brief này cho:** article canonical TipTap / `article_*` (hệ block khác).
> **Nguồn code:** `lib/editor/types.ts` · `components/editor/PostRenderer.tsx` · `components/journey/PostBlockRenderer.tsx` · `app/[slug]/p/new/editor.css` · `lib/editor/mo-ta-markdown.ts` · `lib/editor/image-layout.ts`

---

## 1. Nguyên tắc

1. **Không viết HTML/CSS.** Output JSON meta + `noi_dung_blocks`. App tự gắn class DOM.
2. **Nguồn sự thật:** JSONB `content_tac_pham.noi_dung_blocks` (+ `tieu_de`, `mo_ta`, `cover_id`). HTML cache (`noi_dung_html` / `.article-rich-content`) do server serialize — không nhờ agent viết.
3. Composer và trang xem **đồng bộ DOM/class** qua cùng CSS (`editor.css` scope `.cins-editor-page`).
4. Canvas nội dung: **max-width 880px** (`.editor-canvas`).

---

## 2. Phong bì trang (DOM ↔ CSS)

| Layer | Class / cấu trúc | DB / ghi chú |
|---|---|---|
| Overlay composer | `.j-compose-overlay` → `.j-compose-sheet` | UI only |
| Page | `.cins-editor-page` (+ `.is-overlay` / `.is-minimal-compose`) | |
| Canvas | `main.editor-canvas` (xem: thêm `.cins-post-view`) | max-width 880px |
| Cover / thumbnail | `.cover-add.has` → `.cover-img-wrap > img` | `cover_id` — thumb Gallery; bật `showCoverInPost` trên blocks để hiện trên card Journey + thân bài (mọi loại; ưu tiên embed Bunny) |
| Tiêu đề | `.title-in` — 38px / weight 800 / lh 1.28 | `tieu_de` |
| Mô tả ngắn | `.sub-in` — 18px | `mo_ta` (Markdown subset) |
| Thân bài | `.blocks` → `.block[data-block-type]` → `.block-inner` → class theo `loai` | `noi_dung_blocks` |

**Xem bài** (`JourneyPostBody`):  
`main.cins-editor-page.cins-post-view.editor-canvas` + `PostBlockRenderer` (gom chuỗi `imgs` liên tiếp thành lưới feed khi cần).

---

## 3. Schema block (ghi DB)

```ts
type BlockType =
  | "h2" | "h3" | "body" | "quote"
  | "imgs" | "embed" | "palette"
  | "divider" | "spacer";

type Block = {
  id: string;       // uuid hoặc "b-0"
  loai: BlockType;
  thu_tu: number;   // 0, 1, 2… theo thứ tự
  config?: Record<string, unknown>;
};
```

Chỉ các `loai` trong whitelist. `thu_tu` reset theo vị trí khi publish.

---

## 4. Map `loai` → class CSS → `config`

| `loai` | Class khi render | `config` |
|---|---|---|
| `h2` | `.b-text.h2` (+ `.b-text-ro`) | `{ "html": "Tiêu đề mục" }` |
| `h3` | `.b-text.h3` | `{ "html": "…" }` |
| `body` | `.b-text` | `{ "html": "đoạn…\n\nđoạn 2" }` |
| `quote` | `.b-quote` > nội dung `.b-quote-ro` | `{ "html": "trích dẫn" }` |
| `imgs` | `.b-imgs` > `.imgwrap.{layout}` > `.ph > img` | xem §5 |
| `embed` | `.b-embed.b-embed-ro` (+ `.is-iframe`…) | `{ "url": "https://…" }` |
| `palette` | `.b-palette` > `.sw` | `{ "colors": ["#1a1a1a"] }` hex |
| `divider` | `.b-divider.thick-{thin\|med\|thick}` | `{ "len": 5–100, "thick": "med" }` |
| `spacer` | `.b-spacer.{s\|m\|l}` | `{ "size": "m" }` |

### Typography (token hiện tại)

| Vai trò | Style gần đúng |
|---|---|
| body | 16px / line-height 1.75 / `--ink-body` |
| h2 | 26px / 700 / lh 1.25 / `--ink-display` |
| h3 | 20px / 700 / lh 1.3 |
| quote | ~24px italic, border-left 3px xanh CINs |
| title trang | 38px / 800 (không phải block) |
| mo_ta | 18px (không phải block) |

Font UI: Be Vietnam Pro (`--font-sans`). Quote historically dùng `--font-serif` trong editor.

---

## 5. Ảnh (`imgs`)

```json
{
  "id": "b-2",
  "loai": "imgs",
  "thu_tu": 2,
  "config": {
    "layout": "masonry",
    "rounded": false,
    "cap": "Chú thích (optional)",
    "imgs": [
      "https://example.com/anh1.jpg",
      "uuid-cloudflare-images"
    ]
  }
}
```

### `layout` hợp lệ

| Key | Ý nghĩa CSS |
|---|---|
| `full` | Tràn, xếp dọc, giữ tỉ lệ gốc |
| `inset` | ~70% ngang, căn giữa |
| `duo` | 2 cột, crop `object-fit: cover` |
| `grid3` | Lưới 3 cột ô vuông |
| `grid4` | Lưới 2×2, tối đa 4 ô |
| `masonry` | Masonry 3 cột (CSS columns) |
| `justified` | Hàng cân full chiều ngang |

### Seed ảnh

Mỗi phần tử `imgs[]`:

- URL `http(s)` đầy đủ, **hoặc**
- Cloudflare Images UUID → resolve `imagedelivery.net`

Seed demo / placeholder (`m-…`, `extra-…`, stock editor) bị lọc khi render. Production nên upload Cloudflare rồi thay UUID nếu cần ổn định lâu dài.

**Album:** nhiều block `imgs` liền nhau → feed có thể gom `image-grid`; permalink/`PostRenderer` vẫn render từng `.b-imgs`.

---

## 6. Markdown subset (text — không HTML)

Áp dụng cho `mo_ta` và `config.html` của `h2` / `h3` / `body` / `quote`:

| Được | Không được |
|---|---|
| `**đậm**` | `[text](url)` |
| `*nghiêng*` / `_nghiêng_` | Heading `#` / `##` trong chuỗi |
| `~~gạch ngang~~` | Code fence / `` `code` `` |
| List `- item` / `1. item` | HTML thô (`<p>`, `<br>`, …) |
| Autolink `https://…` | |

Heading mục trong thân bài = block `loai: "h2"` / `"h3"`, không dùng `#` trong text.

---

## 7. Embed whitelist

`config.url` được classify → iframe hoặc link fallback.

**Tier 1 / chính:** YouTube · Vimeo · Figma · Canva · Sketchfab · Spline · PlayCanvas · Rive / Lottie (web + file) · SoundCloud.

**Khác / legacy:** Behance · Framer · CodePen · Bunny (URL nội bộ).

URL ngoài whitelist → `.b-embed` dạng link, không iframe.

---

## 8. Ví dụ JSON đầu ra

```json
{
  "tieu_de": "Tên bài",
  "mo_ta": "Một câu **mô tả** ngắn.",
  "cover_id": "https://nguon-goc.com/hero.jpg",
  "noi_dung_blocks": [
    {
      "id": "b-0",
      "loai": "h2",
      "thu_tu": 0,
      "config": { "html": "Bối cảnh" }
    },
    {
      "id": "b-1",
      "loai": "body",
      "thu_tu": 1,
      "config": { "html": "Đoạn mở…\n\nĐoạn tiếp theo." }
    },
    {
      "id": "b-2",
      "loai": "imgs",
      "thu_tu": 2,
      "config": {
        "layout": "full",
        "imgs": ["https://nguon-goc.com/img1.jpg"],
        "cap": "Caption"
      }
    },
    {
      "id": "b-3",
      "loai": "quote",
      "thu_tu": 3,
      "config": { "html": "Câu trích dẫn." }
    },
    {
      "id": "b-4",
      "loai": "embed",
      "thu_tu": 4,
      "config": { "url": "https://www.youtube.com/watch?v=…" }
    },
    {
      "id": "b-5",
      "loai": "divider",
      "thu_tu": 5,
      "config": { "len": 40, "thick": "med" }
    }
  ]
}
```

Meta publish thêm (khi ghi DB đầy đủ): `visibility` (`feature` \| `public` \| `theo_nhom` \| `chi_minh`), `loaiMoc` (`hoc` \| `lam_viec` \| `du_an` \| `su_kien` \| `thanh_tuu` \| `ca_nhan`), `thoiDiem` (`YYYY-MM-DD`).

---

## 9. Prompt copy-paste cho Claude

```
Bạn chuyển bài từ URL nguồn sang định dạng CINs Journey.

KHÔNG viết HTML/CSS. Chỉ output JSON:
- tieu_de, mo_ta, cover_id (ảnh hero/thumbnail nếu có)
- noi_dung_blocks: mảng { id, loai, thu_tu, config }

loai chỉ được: h2 | h3 | body | quote | imgs | embed | palette | divider | spacer

Quy tắc:
1. Cắt bài nguồn thành block tuần tự; giữ thứ tự logic (mục → đoạn → ảnh).
2. Ảnh: lấy URL gốc vào config.imgs[]; chọn layout phù hợp
   (1 ảnh → full|inset; album → masonry|duo|justified; lưới đều → grid3|grid4).
3. Text: plain text + markdown subset (** * ~~ list - / 1.); không HTML.
4. Video YouTube/Vimeo/… → loai embed + url.
5. Palette hex → palette. Không bịa loai ngoài whitelist.
6. cover_id = ảnh đại diện (OG/hero); không nhét cover vào imgs trừ khi ảnh đó cũng nằm trong thân bài.
7. Reference schema: docs/cursor_brief_journey_blocks_css.md trong repo CINs.
```

---

## 10. File liên quan (khi cần đào sâu)

| Việc | File |
|---|---|
| Type `Block` | `lib/editor/types.ts` |
| Render read-only | `components/editor/PostRenderer.tsx` |
| Render feed + grid ảnh | `components/journey/PostBlockRenderer.tsx` · `lib/journey/image-grid.ts` |
| CSS canvas / block | `app/[slug]/p/new/editor.css` |
| Markdown subset | `lib/editor/mo-ta-markdown.ts` |
| Layout ảnh | `lib/editor/image-layout.ts` |
| Resolve URL ảnh | `lib/editor/resolve-image-seed-url.ts` |
| Embed providers | `lib/editor/embed-providers.ts` |
| Sanitize → HTML cache | `lib/editor/sanitize.ts` |
| Publish action | `app/[slug]/p/new/actions.ts` |
| View body | `components/journey/JourneyPostBody.tsx` |

---

## 11. Phạm vi ghi DB

- Insert/update `content_tac_pham` (`tieu_de`, `mo_ta`, `cover_id`, `noi_dung_blocks`, …) + liên kết cột mốc (`content_cot_moc` / `content_tac_pham_thuoc_moc`).
- Org: `org_bai_dang.noi_dung_blocks` cùng format Journey.
- Không paste class CSS vào cột DB.
