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

Focus **tính chất công việc** (giọng Vietcetera / brief nghề):

- Là ai / làm gì / kỹ năng / lộ trình — **không** viết 3 bài “Animator trong Game / Phim / VFX”.
- Khác biệt theo lĩnh vực: **một khối nhẹ** (infobox hoặc 1 subsection) — “Xuất hiện ở đâu”: Game · Hoạt hình · VFX… (1–3 câu mỗi nơi), không nhân đôi 4 section.
- Tool/pipeline ngành: chỉ nhắc khi thật sự khác bản chất (vd. realtime game vs shot-based VFX) — vẫn trong cùng bài.

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

1. **Chốt rule gộp** với user (bảng §2.4) + danh sách 33 cụm exact → tick merge/giữ/review.  
2. **Migration** `article_gan_linh_vuc` + backfill + dual-write app tối thiểu.  
3. **Đổi query hub/filter** sang junction (vẫn sync `id_linh_vuc`).  
4. **Script merge** 1 cụm mẫu (đề xuất: `3D Animator` ×2) → review nội dung + chip lĩnh vực trên UI.  
5. **Batch merge** các cụm exact đã tick (ưu tiên Art Director, Colorist, Pipeline TD…).  
6. **Rewrite nội dung** bài đã merge (giọng Vietcetera; bỏ đoạn clone theo ngành) — Grok + few-shot, không Opus toàn bộ.  
7. **Cập nhật docs:** FOUNDATIONS quy tắc 10 (1 nghề ↔ N lĩnh vực qua junction; `id_linh_vuc` = chính); DECISIONS LOG; IMPLEMENTATION SQL/script.

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

## 10. Câu hỏi chờ chốt

1. **Slug canonical:** rename về `nghe-{role}` trung tính, hay giữ slug bài thắng hiện tại?  
2. **Cụm mẫu đầu:** `3D Animator` (2 bài) trước, rồi `Art Director` (5)?  
3. **`VFX Compositor` / `VFX Colorist` / `VFX Lighting Artist`:** merge vào Compositor/Colorist/Lighting hay giữ prefix VFX? (Đề xuất: merge Compositor+Colorist+Lighting nếu cùng nghề; giữ riêng nếu brief VFX khác hẳn.)  
4. Có cần UI admin “Gộp nghề” ngay phase 1, hay chỉ script + review?

---

**Next:** User chốt §10 → Step 1 xuất checklist 33 cụm → xác nhận migration → mới BUILD (Grok).
