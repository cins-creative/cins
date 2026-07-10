# Brief — Đóng góp nội dung canonical

> **Mục tiêu:** Tab "Đóng góp" trên trang entity + luồng curator promote bản thảo → bài chính.
> **Luật nền:** `CINS_FOUNDATIONS.md` §1, §K, quy tắc 25/30–32 · **L26** trong `CINS_DECISIONS.md`.
> **Phạm vi MVP:** `keyword` + `nghe` trước (entity đã có prose + `EntityArticleLayout`).

---

## Tóm tắt mô hình

| Khái niệm | Ý nghĩa |
|---|---|
| **Bài chính** | `article_bai_viet.noi_dung` — tab **Nội dung**, do curator promote |
| **Bản đóng góp** | Mỗi user **một bài riêng** — không sửa chung như Wikipedia |
| **Curator** | Nhận thông báo khi có bản mới → duyệt / từ chối / yêu cầu sửa |
| **Attribution** | Hero: tác giả chính + "N người đóng góp" (click → danh sách) |

**Không làm ở MVP:** merge theo section, domain Y tế/Khoa học, milestone Journey tự sinh khi duyệt (defer).

---

## Session map (chạy tuần tự)

| # | Tên | Đầu ra | Phụ thuộc |
|---|---|---|---|
| **S0** | Chuẩn bị & đối chiếu DB | Xác nhận bảng/cột; sketch ERD | — | ✅ |
| **S1** | Migration schema | `article_dong_gop`, `article_tac_gia`, `article_quyen_tham_dinh` + RLS | S0 | ✅ |
| **S2** | Lib & types | `lib/article/dong-gop/*`, types, helpers trạng thái | S1 | ✅ |
| **S3** | Admin — bảng quản lý | `/admin/dong-gop` list + duyệt/từ chối | S2 | ✅ |
| **S4** | Admin — phân quyền curator | Gán user làm curator (phạm vi) | S3 |
| **S5** | Tab UI "Đóng góp" | `NgheMainContentTabs` + panel danh sách bản | S2 |
| **S6** | Editor soạn bản | Form/editor HTML + skeleton theo `loai_bai_viet` | S5 |
| **S7** | Gửi duyệt + thông báo | Submit → `cho_duyet` → notify curator | S6, S3 |
| **S8** | Promote → bài chính | Copy `noi_dung`, cập nhật `article_tac_gia`, bản cũ xuống tab Đóng góp | S7 |
| **S9** | Hero attribution | Tác giả chính + "N người đóng góp" + panel contributors | S8 |
| **S10** | Bình luận trên bản thảo | Comment scoped per `article_dong_gop` | S5 |
| **S11** | Polish & edge cases | Ẩn bản, soft-delete, empty states, sample keyword | S9, S10 |

Mỗi session = **1 PR nhỏ** hoặc 1 nhóm commit. Review 1 sample (keyword GDD) trước khi bulk.

---

## S0 — Chuẩn bị & đối chiếu DB

**Mục tiêu:** Không assume schema — đọc DB thật trước khi viết SQL.

**Việc cần làm:**
1. Đọc `information_schema` / Supabase MCP: `article_bai_viet` (cột `noi_dung`, `loai_bai_viet`, `id_linh_vuc`).
2. Kiểm tra `social_thong_bao` — pattern thông báo hiện có.
3. Xác nhận chưa có bảng `article_dong_gop` / `article_tac_gia` trùng tên.
4. Chốt ERD draft (bên dưới) — chỉnh nếu DB conflict.

**ERD đề xuất (draft — S0 xác nhận):**

```
article_bai_viet (entity — bài chính)
  id, noi_dung, loai_bai_viet, id_linh_vuc, ...
  + (mới) id_tac_gia_chinh UUID FK → user_nguoi_dung  [cache, optional]
  + (mới) so_nguoi_dong_gop INT DEFAULT 0             [cache, optional]

article_dong_gop (bản thảo — 1 row = 1 bài của 1 user cho 1 entity)
  id UUID PK
  id_bai_viet UUID FK → article_bai_viet
  id_nguoi_dong_gop UUID FK → user_nguoi_dung
  noi_dung TEXT                    -- HTML, cùng pipeline lead
  trang_thai TEXT                 -- nhap | cho_duyet | duoc_duyet | tu_choi | can_sua
  ghi_chu_duyet TEXT
  id_nguoi_duyet UUID FK → user_nguoi_dung
  tao_luc, cap_nhat_luc, duyet_luc
  da_xoa BOOLEAN
  hien_thi BOOLEAN DEFAULT true    -- contributor ẩn bản sau từ chối

article_tac_gia (attribution lịch sử)
  id UUID PK
  id_bai_viet UUID FK
  id_nguoi_dung UUID FK
  id_dong_gop UUID FK → article_dong_gop  -- bản được promote
  vai_tro TEXT                    -- tac_gia_chinh | dong_gop
  la_hien_tai BOOLEAN DEFAULT false
  tao_luc

article_quyen_tham_dinh (curator scope)
  id UUID PK
  id_nguoi_dung UUID FK
  pham_vi TEXT                    -- toan_cuc | linh_vuc | bai_viet
  id_linh_vuc UUID FK nullable
  id_bai_viet UUID FK nullable
  cap_boi UUID FK → user_nguoi_dung  -- CINS admin
  tao_luc, da_xoa
```

**Đầu ra:** ERD chốt + note conflict (nếu có).

### S0 — Kết quả (2026-07-10) ✅

| Kiểm tra | Kết quả |
|---|---|
| `article_bai_viet` | Có `noi_dung`, `loai_bai_viet`, `id_linh_vuc` — khớp `lib/articles/types.ts`. Chưa có `id_tac_gia_chinh`, `so_nguoi_dong_gop` → thêm ở S1. |
| `article_dong_gop` / `article_tac_gia` / `article_quyen_tham_dinh` | **Chưa tồn tại** trong repo/SQL. |
| `social_thong_bao` | Pattern: `nguoi_nhan`, `loai`, `noi_dung`, `loai_doi_tuong`, `id_doi_tuong` — dùng `insertSocialThongBao` (`lib/social/thong-bao-insert.ts`). S7 sẽ dùng `loai_doi_tuong='article_dong_gop'`. |
| `user_quyen_he_thong` | Đã có role `curator` toàn cục — **bổ sung** `article_quyen_tham_dinh` cho phạm vi per entity/lĩnh vực. CINS admin vẫn duyệt qua service role. |

**Quyết định S0:**

1. **1 bản active / user / entity** — `UNIQUE (id_bai_viet, id_nguoi_dong_gop) WHERE da_xoa=false` (user cập nhật cùng row, không spawn nhiều bài).
2. **Chỉ 1 `cho_duyet`** per user per entity — partial unique index.
3. **Cache attribution** trên `article_bai_viet`: `id_tac_gia_chinh`, `so_nguoi_dong_gop`.
4. **Curator mutation** qua service role (server lib) — RLS chặn client trực tiếp promote; contributor RLS cho soạn/sửa bản của mình.
5. **Tuyệt đối tách** khỏi `content_cot_moc` / Journey / feed trang chủ — bảng `article_*` riêng.

---

## S1 — Migration schema

**File:** `supabase/sql/migration_article_dong_gop.sql`

**Việc cần làm:**
1. Tạo 3 bảng + index (`id_bai_viet`, `id_nguoi_dong_gop`, `trang_thai`).
2. UNIQUE partial: 1 user chỉ 1 bản `cho_duyet` active per `id_bai_viet` (hoặc cho phép nhiều — chốt ở S0).
3. RLS:
   - `article_dong_gop`: SELECT public nếu `hien_thi=true` AND `da_xoa=false`; INSERT/UPDATE chủ bản; curator UPDATE `trang_thai`.
   - `article_quyen_tham_dinh`: SELECT curator + admin; INSERT/DELETE admin only.
4. Seed: CINS admin = curator `toan_cuc` (founder).

**Đầu ra:** Migration chạy được trên `ospzzzxcomrmhqrnkoiw`.

---

## S2 — Lib & types

**Thư mục:** `lib/article/dong-gop/`

| File | Nội dung |
|---|---|
| `types.ts` | `ArticleDongGop`, `TrangThaiDongGop`, `ArticleTacGia` |
| `fetch.ts` | List bản theo `id_bai_viet`, get by id |
| `mutate.ts` | Create draft, submit, hide, soft-delete |
| `curator.ts` | Approve, reject, request-edit; resolve curator for entity |
| `attribution.ts` | Đếm contributor, tác giả chính hiện tại |

**Đầu ra:** Lib gọi được từ Server Action / Route Handler; types export cho components.

---

## S3 — Admin — bảng quản lý đóng góp

**Route:** `app/admin/dong-gop/page.tsx`

**UI:**
- Bảng: entity (tên + loại), contributor, trạng thái, ngày gửi.
- Filter: `cho_duyet` | `duoc_duyet` | `tu_choi` | tất cả.
- Action: **Xem** (preview HTML) · **Duyệt** · **Từ chối** (modal ghi chú) · **Yêu cầu sửa**.
- So sánh 2 cột: bài chính hiện tại vs bản đề xuất (read-only).

**Gate:** `getCurrentUserIsCinsAdmin()` hoặc user có row `article_quyen_tham_dinh`.

**Đầu ra:** Founder duyệt được bản đầu tiên trên keyword GDD.

---

## S4 — Admin — phân quyền curator

**Vị trí:** Tab/modal trong `/admin/dong-gop` hoặc `/admin` riêng.

**UI:**
- Danh sách curator hiện có (user, phạm vi, domain/entity).
- Form thêm: chọn user + phạm vi (`toan_cuc` / `linh_vuc` / chọn 1 `article_bai_viet`).
- Gỡ quyền (soft-delete row).

**Đầu ra:** Gán user X làm curator keyword GDD.

---

## S5 — Tab UI "Đóng góp"

**Files:**
- `components/article/nghe/NgheMainContentTabs.tsx` — thêm tab `contribution`.
- `components/article/entity/EntityArticleLayout.tsx` — prop `contribution?: ReactNode`.
- `components/article/contribution/ContributionTabPanel.tsx` — list bản.

**UI tab Đóng góp:**
- Header: số bản + nút **Viết bản của bạn** (nếu đã login).
- List card: avatar, tên, trạng thái badge, excerpt, số bình luận.
- Bản `duoc_duyet` (đã từng là chính): badge "Đã từng là bài chính".
- Empty state: "Chưa có bản đóng góp — hãy là người đầu tiên."

**Wire vào:** `KeywordEntityArticleView`, `NgheLayoutStatic` (và software/mon-hoc sau).

**Đầu ra:** Tab hiển thị trên `/keyword/[slug]` (read-only list trước).

---

## S6 — Editor soạn bản

**Files:**
- `components/article/contribution/ContributionEditor.tsx`
- Tái dùng: `NgheLeadContentEditorModal` / Tiptap pattern từ admin nghề.

**UX:**
- Mở từ "Viết bản của bạn" → editor full-page hoặc modal.
- **Skeleton theo `loai_bai_viet`:** pre-fill `h2` sections (vd keyword: Khái niệm · Thành phần · Ví dụ · Tài liệu tham khảo).
- Gợi ý: "Đã có N bản về chủ đề này" + link xem trước.
- Lưu nháp (`trang_thai=nhap`) vs Gửi duyệt (`cho_duyet`).

**Đầu ra:** User soạn và lưu nháp được 1 bản GDD.

---

## S7 — Gửi duyệt + thông báo curator

**Việc cần làm:**
1. Submit → `trang_thai=cho_duyet`, `cap_nhat_luc=now()`.
2. Resolve curator: `article_quyen_tham_dinh` theo `id_bai_viet` → `id_linh_vuc` → `toan_cuc`.
3. Insert `social_thong_bao` (hoặc pattern notification hiện có) cho curator.
4. Không gửi lại nếu đã `cho_duyet` (idempotent).

**Đầu ra:** Founder nhận thông báo khi có bản mới.

---

## S8 — Promote → bài chính

**Luồng duyệt (curator):**
1. `duoc_duyet` trên `article_dong_gop`.
2. Nếu đã có bài chính: bản đang active → `duoc_duyet` + `la_hien_tai=false` trên `article_tac_gia` cũ.
3. Copy `noi_dung` bản mới → `article_bai_viet.noi_dung`.
4. Upsert `article_tac_gia`: contributor mới `la_hien_tai=true`, `vai_tro=tac_gia_chinh`.
5. Cập nhật cache `id_tac_gia_chinh`, `so_nguoi_dong_gop` trên `article_bai_viet` (nếu có cột).
6. Revalidate path entity.

**Đầu ra:** Tab Nội dung hiển thị bản vừa duyệt; bản cũ xuống tab Đóng góp.

---

## S9 — Hero attribution

**Files:**
- `components/article/entity/EntityArticleHeader.tsx` (hoặc tương đương hero).

**UI:**
- Dưới tiêu đề: "bởi **{tên tác giả}**" (link Journey).
- Kèm: "**{N} người đã đóng góp**" — click mở panel/modal danh sách (`article_tac_gia`).
- Panel: avatar, tên, vai trò, ngày đóng góp, link Journey.

**Đầu ra:** Hero keyword GDD hiện attribution sau promote.

---

## S10 — Bình luận trên bản thảo

**Quyết định kỹ thuật (chốt ở S10):**
- Option A: tái dùng comment trên `content_cot_moc` proxy (phức tạp).
- Option B: `article_dong_gop_binh_luan` bảng mới (đơn giản MVP).

**UI:** Thread comment dưới mỗi bản trong tab Đóng góp. Gợi ý constructive (placeholder: "Góp ý để cải thiện bản này…").

**Đầu ra:** User bình luận trên bản bị từ chối / bản chờ duyệt.

---

## S11 — Polish & edge cases

| Case | Xử lý |
|---|---|
| Contributor ẩn bản | `hien_thi=false`, vẫn trong DB |
| Không có bài chính | Tab Nội dung empty + CTA "Viết bản đầu tiên" |
| Curator từ chối | Hiện `ghi_chu_duyet` trên card bản |
| User chưa login | Nút soạn → redirect login |
| Trùng bản đang `cho_duyet` | Chặn hoặc cho sửa bản pending |
| Sample | Seed 2–3 bản GDD + 1 promote để demo |

**Đầu ra:** Flow end-to-end trên keyword GDD ổn định.

---

## Guardrail (giữ suốt các session)

1. **Curator ≠ verify** — không dùng `da_verify` cho nội dung đóng góp.
2. **RLS** thực thi quyền — UI chỉ ẩn/hiện.
3. **Bài chính** luôn neo đầu trang — feed MXH không đẩy lấn.
4. **Tiếng Việt** cho mọi copy UI (`*.tsx`).
5. Đọc `CINS_DEV_RULES.md` trước mỗi session code.

---

## Session tiếp theo (sau MVP — không block)

| Hạng mục | Khi nào |
|---|---|
| Milestone Journey khi bản được duyệt | Khi có nhu cầu retention contributor |
| Schema section per `linh_vuc` (block JSON) | Khi duplicate content quá nhiều |
| Tab Đóng góp cho `phan_mem`, `mon_hoc` | Sau keyword+nghe ổn |
| Domain registry (Y tế, Khoa học) | Founder xử lý sau |
| Chat scoped trên entity | Khi thảo luận tab chưa đủ |

---

## Cách chạy với agent

Mỗi lần bắt đầu session, prompt mẫu:

```
Chạy Session S{N} trong docs/cursor_brief_dong_gop_noi_dung.md
Đọc CINS_FOUNDATIONS §K + CINS_DEV_RULES trước.
Sample entity: keyword GDD (/keyword/game-design-document)
```

Sau mỗi session xong: cập nhật `CINS_IMPLEMENTATION.md` (API/lib mới) nếu có code.
