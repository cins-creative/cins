# PLAN — Gộp nghề trùng + map nhiều lĩnh vực

**Phase:** PLANNING only (không code / không migration trong bước này)  
**Mục tiêu:** Một nghề = một bài canonical; xuất hiện trên nhiều lĩnh vực; nội dung focus tính chất công việc (không clone theo ngành).  
**Neo DB (2026-08-01):** 288 `nghe`, tất cả có `id_linh_vuc`; 0 `merged`; 33 cụm trùng exact `tieu_de_eng` (~78 bài).

---

## 1. Hiện trạng

| Thành phần | Thực tế |
|---|---|
| `article_bai_viet.id_linh_vuc` | FK **1–1**, FOUNDATIONS quy tắc 10: bắt buộc với `nghe` |
| `merged_vao_id` + `trang_thai_noi_dung='merged'` | Đã có; page `/nghe-nghiep/[slug]` đã 308 sang slug đích |
| `article_alias` | Alias tên/slug phụ (dedup search) — chưa thay junction lĩnh vực |
| `article_gan_nhom` | `bo_phan` đang **theo lĩnh vực** (`nghe-game-…`, `nghe-phim-…`) |
| Hub `/nghe-nghiep` | Filter lĩnh vực qua `.eq("id_linh_vuc", …)` |
| Pattern M2M sẵn | `content_tac_pham_linh_vuc (id_tac_pham, id_linh_vuc, la_chinh)` |

**Vấn đề:** Cùng vai trò (Art Director, 3D Animator…) bị nhân bản theo lĩnh vực → nội dung lặp, SEO trùng, lens sai.

---

## 2. Quyết định kiến trúc (đề xuất)

### 2.1 Một nghề = một entity

- Giữ **một** `article_bai_viet` (`loai_bai_viet='nghe'`) cho mỗi vai trò canonical (vd. `3D Animator`).
- Bản trùng → `trang_thai_noi_dung='merged'`, `merged_vao_id` → bài thắng (đã có sẵn luồng 308).
- Slug cũ vẫn resolve; canonical URL = slug bài thắng.

### 2.2 Nhiều lĩnh vực = junction (M2M)

Tạo bảng (tên đề xuất):

```
article_gan_linh_vuc
  id_bai_viet   uuid FK → article_bai_viet  ON DELETE CASCADE
  id_linh_vuc   uuid FK → linh_vuc          ON DELETE CASCADE
  la_chinh      boolean NOT NULL DEFAULT false
  thu_tu        int NULL                    -- optional sort trên UI chip
  tao_luc       timestamptz DEFAULT now()
  PRIMARY KEY (id_bai_viet, id_linh_vuc)
```

Gương `content_tac_pham_linh_vuc`.

**`id_linh_vuc` trên `article_bai_viet`:**

- **Phase A (ship):** giữ cột; sync = `la_chinh=true` (hoặc lĩnh vực đầu nếu chưa set chính). Hub/query cũ không gãy.
- **Phase B (sau):** app chỉ đọc junction; cột cũ = cache `la_chinh` (dual-write). Không drop cột cho đến khi audit xong (ALTER cũ → báo cáo + DECISIONS).

### 2.3 Nội dung bài sau merge

Focus **tính chất công việc** (giọng Vietcetera / brief nghề), nhưng **đối tượng đọc chính là HS THPT & Sinh viên**:

- Là ai / làm gì / kỹ năng / lộ trình — **không** viết 3 bài “Animator trong Game / Phim / VFX”.
- Khác biệt theo lĩnh vực: **một khối nhẹ** (infobox hoặc 1 subsection) — “Xuất hiện ở đâu”: Game · Hoạt hình · VFX… (1–3 câu mỗi nơi), không nhân đôi 4 section.
- Tool/pipeline ngành: chỉ nhắc khi thật sự khác bản chất (vd. realtime game vs shot-based VFX) — vẫn trong cùng bài.
- Tiếng Việt là chính; tránh đoạn liệt kê toàn thuật ngữ Anh. Chỉ giữ English cho tên nghề/công cụ/khái niệm bắt buộc, và giải thích ngay bằng tiếng Việt.

### 2.4 Rule gộp / giữ riêng

| Gộp (1 bài + multi `linh_vuc`) | Giữ riêng |
|---|---|
| Exact cùng `tieu_de_eng` (Art Director ×5, Colorist ×3…) | `2D Animator` ≠ `3D Animator` |
| Stem rõ cùng vai trò + cùng seniority (3D Modeler Game/HH) | `Key Animator`, `In-between Animator` |
| `VFX Compositor` ↔ `Compositor` **chỉ khi** nội dung/công cụ cùng họ — **review tay** | `Game Director` ≠ `Director` |
| | `Animation Producer` / `VFX Producer` ≠ `Producer` (specialty) — link `article_lien_quan`, không merge |

**Chọn bài thắng (canonical):**

1. `LENGTH(noi_dung)` lớn nhất và ≥ ~8k, **hoặc**
2. Bản đã SEO/`meta_*` tốt hơn nếu độ dài tương đương  
3. Slug: ưu tiên trung tính `nghe-{role}` (vd. `nghe-art-director`); nếu chưa có → rename bài thắng **hoặc** giữ slug dài nhất đang có + alias các slug thua.

---

## 3. Database

### Migration (sau khi user xác nhận ALTER)

1. `CREATE TABLE article_gan_linh_vuc (...)` + index `(id_linh_vuc)`, `(id_bai_viet)`.
2. Backfill: mỗi `nghe` hiện tại → 1 row junction từ `id_linh_vuc`, `la_chinh=true`.
3. RLS: đọc public như `article_bai_viet` published; ghi = service role / admin (giống pattern gan_nhom).
4. **Không** drop / NOT NULL đổi `id_linh_vuc` trong migration đầu.

### Merge batch (data, không schema)

Với mỗi cụm duyệt:

1. Chọn `id_thang`.
2. Union `id_linh_vuc` của mọi bản trong cụm → INSERT junction (một `la_chinh`).
3. Union hữu ích từ `article_gan_nhom` / `article_lien_quan` / `article_alias` / tag gắn (`article_gan_tac_pham`, `article_gan_cot_moc`…) → trỏ sang `id_thang` (tránh orphan).
4. Bản thua: `merged_vao_id=id_thang`, `trang_thai_noi_dung='merged'`.
5. (Tuỳ chọn) INSERT `article_alias` từ `tieu_de`/`slug` bản thua.

**`bo_phan` sau merge:** giữ **nhiều** `bo_phan` từ các lĩnh vực (Art Director ∈ tiền sản xuất phim + quản lý sản xuất game) **hoặc** trim còn nhóm chung nếu trùng nghĩa — quyết định per cụm khi apply, không hard-delete hàng loạt.

---

## 4. API / lib

| Chỗ | Đổi |
|---|---|
| `getNgheHub` / filter lĩnh vực | `EXISTS` / join `article_gan_linh_vuc` thay vì only `.eq(id_linh_vuc)` |
| `lib/articles/queries.ts` | `linh_vuc_id[]` / `linh_vuc_slugs[]` đọc từ junction (type đã có mảng) |
| Admin nghe / inline | UI multi-select lĩnh vực; vẫn dual-write `id_linh_vuc` = chính |
| SEO | canonical 1 slug; schema Occupation 1; chip lĩnh vực trên trang |
| `nghe-role-preview` | match linh_vuc hint qua junction (boost nếu overlap) |

Không cần endpoint merge public — script admin/one-off + (sau) nút admin.

---

## 5. Frontend

- Trang nghề: hero hiện **chips lĩnh vực** (từ junction), không một badge cứng.
- Hub: filter lĩnh vực → nghề có map lĩnh vực đó (kể cả không phải `la_chinh`).
- Lens lĩnh vực (nếu có): query qua junction.
- Redirect: giữ behavior 308 hiện tại cho slug `merged`.

---

## 6. Steps triển khai (thứ tự)

1. ✅ **Chốt rule gộp** — slug trung tính; VFX* → tên chung; merge script trước; mẫu `3D Animator`.  
2. ✅ **Migration** `article_gan_linh_vuc` + backfill 288 nghe (`migration_article_gan_linh_vuc.sql`).  
3. ✅ **Hub filter + chip hero** đọc junction (`listNgheArticlesForHub`, `attachArticleLinhVucFromGan`).  
4. ✅ **Merge mẫu** `3D Animator` → `/nghe-nghiep/nghe-3d-animator` (linh vực: Hoạt hình · 3D Art); slug cũ stub `merged` 308.  
5. ✅ **Batch merge** 33 cụm (exact `tieu_de_eng` + alias VFX Colorist/Compositor/Lighting → tên chung). Script: `npx tsx scripts/batch-merge-nghe-dups.mts [--apply]`. Kết quả (2026-08-02): **240** published · **82** merged · **0** cụm trùng còn lại. `VFX Producer` giữ riêng.  
5b. ✅ **Near-role merge** 16 cụm (3D-prefix→bare, Texture/Surfacing, Shader, Motion, FX, Lead Comp→Compositor, UI Artist/UIUX Game→UI Designer, Illustrator thin). Script: `npx tsx scripts/batch-merge-nghe-near-roles.mts [--apply]`. Sau chạy: **216** published · **114** merged. Giữ riêng: Head of Story, Storyboard, Motion Designer (UI), UX Designer, Rigging TD, specialty Illustrator/Producer…  
6. 🔄 **Rewrite nội dung** — mẫu đã apply: `nghe-art-director`, `nghe-concept-artist`, `nghe-ui-designer` (file trong `scripts/nghe-content/`). Batch nghề 1 đã apply: `nghe-colorist`, `nghe-compositor`, `nghe-texture-surfacing-artist`, `nghe-producer`, `nghe-production-manager` (`scripts/apply-nghe-rewrite-batch1.mts`). Batch nghề 2 đã apply: `nghe-lighting-artist`, `nghe-fx-artist`, `nghe-music-composer`, `nghe-pipeline-td`, `nghe-project-manager`, `nghe-render-td`, `nghe-rigging-artist`, `nghe-sound-designer`, `nghe-storyboard-artist`, `nghe-architectural-visualizer` (`scripts/apply-nghe-rewrite-batch2.mts`). Batch nghề 3 đã apply: `nghe-illustrator`, `nghe-motion-designer`, `nghe-3d-animator`, `nghe-3d-generalist`, `nghe-3d-modeler`, `nghe-character-concept-artist`, `nghe-character-designer`, `nghe-character-modeler`, `nghe-costume-designer`, `nghe-creative-director` (`scripts/apply-nghe-rewrite-batch3.mts`). Batch nghề 4 đã apply: `nghe-design-director`, `nghe-design-manager`, `nghe-director`, `nghe-editor`, `nghe-environment-artist`, `nghe-environment-concept-artist`, `nghe-foley-artist`, `nghe-line-producer`, `nghe-previs-artist`, `nghe-product-designer` (`scripts/apply-nghe-rewrite-batch4.mts`). Revision mạch lạc hơn cho 5 bài: `nghe-product-designer`, `nghe-design-director`, `nghe-design-manager`, `nghe-director`, `nghe-editor` (`scripts/apply-nghe-rewrite-batch4-revision1.mts`); Product Designer chốt nghĩa **sản phẩm số/app/web**, không phải industrial/product vật lý. Chuẩn: đối tượng HS THPT & Sinh viên; tiếng Việt là chính; infobox “Xuất hiện ở đâu”.  
7. **Cập nhật docs:** FOUNDATIONS quy tắc 10; DECISIONS LOG; IMPLEMENTATION SQL/script.

---

## 7. Edge cases

| Case | Xử lý |
|---|---|
| Bản thua đã gắn tag Journey / tác phẩm | Re-point `article_gan_*` → `id_thang` trước khi đánh `merged` |
| Hai bản đều dài, nội dung lệch ngành | Merge entity + rewrite 1 bản “tính chất chung”; khác biệt → infobox lĩnh vực |
| `Producer` vs `VFX Producer` | Không auto-merge; đề xuất `article_lien_quan` |
| Hub đếm nghề theo lĩnh vực | Đếm distinct bài qua junction (một nghề đếm ở mọi lĩnh vực map) |
| Curator scope `id_linh_vuc` | Quyền theo **bất kỳ** lĩnh vực gắn junction |
| Concurrent merge | Script khóa theo cụm; idempotent (đã `merged` thì skip) |
| SEO duplicate | 308 + canonical; sitemap chỉ `published` không `merged` |

---

## 8. Security

- Merge / gắn lĩnh vực: **admin / service role** only.
- RLS SELECT junction: public đọc nếu bài `published` (hoặc policy đơn giản join bài published).
- Không mở API merge cho user thường.
- Validate `loai_bai_viet='nghe'` trước mọi attach lĩnh vực (keyword/phan_mem không dùng bảng này trừ khi sau này mở rộng có chủ đích).

---

## 9. Phạm vi không làm trong phase này

- Gộp `keyword` Vinglish (track riêng).
- Đổi taxonomy `bo_phan` toàn cục.
- Drop cột `id_linh_vuc`.
- Auto-merge theo stem mờ (chỉ exact + list đã duyệt).

---

## 10. Chốt với user (2026-08-01)

### Giải thích câu hỏi (để khỏi tối nghĩa)

**Q1 — Slug URL sau khi gộp**  
Ví dụ gộp 5 bài Art Director. Chỉ còn 1 bài “sống”. Người vào slug cũ (`nghe-game-art-director`) bị 308 sang slug bài thắng.  
- *Cách A — giữ slug bài thắng:* URL có thể là `…/nghe-hoat-hinh-art-director` (vì bài HH dài nhất). Hơi lệch vì nghề đã mang nhiều lĩnh vực.  
- *Cách B — đổi sang slug trung tính:* `…/nghe-art-director`; mọi slug cũ 308 về đây. Sạch hơn lâu dài, thêm 1 bước rename.

**Q2 — Cụm nào merge thử trước**  
- `3D Animator` chỉ **2 bài** → thử quy trình (junction + merge + 308 + nội dung) rủi ro thấp.  
- `Art Director` **5 bài** → làm sau khi quy trình ổn.

### Đã chốt

| # | Chốt |
|---|---|
| 3 | Prefix **VFX** gộp vào tên chung (`VFX Compositor` → `Compositor`, tương tự Colorist / Lighting…) |
| 4 | **Merge bằng script trước**; chưa làm UI admin “Gộp nghề” |

### Đề xuất mặc định (chờ OK nhanh)

| # | Đề xuất |
|---|---|
| 1 | **Cách B — slug trung tính** `nghe-{role}` khi gộp ≥2 lĩnh vực; slug cũ 308. Nếu rename phiền phase 1: tạm giữ slug bài thắng, backlog rename. |
| 2 | **Mẫu đầu = `3D Animator` (2 bài)**, xong mới `Art Director`. |

### Tư vấn UI — merge trước có cần đổi logic không?

**Bắt buộc đổi (nếu không thì merge phản tác dụng):**

1. **Hub filter lĩnh vực** — hiện `.eq("id_linh_vuc", X)`. Sau merge, Art Director chỉ còn 1 `id_linh_vuc` → lọc Game sẽ **mất** nghề dù đã map nhiều lĩnh vực.  
   → Cần migration `article_gan_linh_vuc` **trước hoặc cùng** merge đầu; hub đọc qua junction.
2. **Trang nghề** — hiện 1 badge lĩnh vực. Nên hiện **chips nhiều lĩnh vực** (đọc junction). Đổi nhỏ, không redesign.

**Có thể hoãn:**

- UI admin multi-select / nút “Gộp nghề” — script đủ phase 1.
- Đổi taxonomy `bo_phan`, rename slug hàng loạt (nếu chọn tạm Cách A).

**Thứ tự ship đề xuất:**  
(1) migration junction + backfill + dual-write `id_linh_vuc` = `la_chinh`  
(2) sửa query hub/filter + chips trang nghề  
(3) script merge mẫu `3D Animator`  
(4) batch exact còn lại (VFX* → tên chung)  
(5) rewrite nội dung bài đã merge  

---

**Next:** User OK đề xuất Q1/Q2 → BUILD Step migration + hub query (Grok) → merge mẫu.
