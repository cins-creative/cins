# PLAN — Shop: nút «Giới thiệu sản phẩm» (Kho → bài album ảnh + tự gắn kiosk)

> **Phase:** BUILD done 2026-08-10 (Grok 4.5) — Steps 1–5.
> **Ngày:** 2026-08-10
> **Model build đề xuất:** Step 1–2 **Grok 4.5 / Medium** (đa file, chạm editor core) · Step 3 **Grok 4.5 / Medium** · Step 4 **Composer 2.5 / Low** (CSS + copy).
> **Migration:** **0** — không tạo bảng, không ALTER. Tái dùng `shop_post_hang` + `publishPost` sẵn có.

---

## 1. Mục tiêu & phạm vi

Trong Kho (`/ban-hang/kho`), khi chủ shop đã hoàn thiện một **loại hàng** (mặt hàng), thêm nút **«Giới thiệu sản phẩm»** ở `shop-kho-loai-meta-head`. Bấm vào:

1. **Popup trình soạn bài Journey ngay tại trang Kho** (không rời trang).
2. Bài được **prefill dạng album ảnh**: lấy **chỉ ảnh** — thumbnail loại + ảnh minh họa (ảnh phụ) + ảnh các mẫu trong loại. **Bỏ video.**
3. Sau khi đăng: **tự gắn hàng của loại này vào bài** (post-kiosk → `ShopKioskBlock` ticker "Hàng bán · N sản phẩm").
4. Chủ shop **tự sửa được**: tiêu đề, mô tả, thêm/bớt ảnh trong album, tag, quyền hiển thị — như soạn bài thường.

Kèm theo (user chốt 2026-08-10): **siết trần post-kiosk = 20** cho **toàn bộ** luồng gắn hàng (không chỉ luồng giới thiệu) — hiện chưa có cap nào, bài gắn cả shop làm `listPostHang` + `setPostHang` nặng.

**Ngoài phạm vi (không làm ở plan này):** sinh caption bằng AI; đăng vào cộng đồng/org; bài giới thiệu cho **mẫu** đơn lẻ (chỉ cấp **loại hàng**); sửa lại bài giới thiệu cũ từ Kho (lần 2 vẫn tạo bài mới — xem §7).

---

## 2. Hiện trạng (đã verify trong code)

| Vùng | Sự thật | Nguồn |
|---|---|---|
| Nút sẽ đặt ở | `ShopKhoLoaiMeta` → `shop-kho-loai-meta-head` (đang có `shop-kho-loai-back`, `shop-kho-loai-view`, `shop-kho-loai-delete`) | `components/shop/ShopKhoLoaiHub.tsx` L1010–1052 |
| Media loại hàng | `anhId/anhUrl` (chính) · `anhPhuIds/anhPhuUrls` (≤ `SHOP_NHOM_ANH_PHU_MAX = 8`) · `videoPhuId/...` (video **tách riêng**, không nằm trong mảng ảnh) | `lib/shop/types.ts` L60–105, L199 |
| Ảnh mẫu | `ShopSanPham.anhId/anhUrl`; biến thể có `anhId` riêng | `lib/shop/types.ts` L202–221, L44–54 |
| Mẫu của loại ở client | `ShopKhoClient` state `products` → `filteredProducts` (đã fetch `/api/shop/san-pham?nhomId=` khi mở loại) | `ShopKhoClient.tsx` |
| Composer Journey | `CinsFeedComposer` → `useJourneyCompose().openCompose()` → `JourneyComposeProvider` state → `JourneyComposeOverlay` → `EditorView` | `components/journey/JourneyComposeContext.tsx` L105–415 |
| Provider cần gì | `ownerId`, `ownerSlug`, `ownerName`, `ownerAvatarId?`, `isOwner`, `syncComposeUrl?` | `JourneyComposeContext.tsx` L70–94 |
| Nguồn owner ở Kho | `GET /api/auth/session-profile` trả `id`, `slug`, `tenHienThi`, `avatarId` — **ShopKhoClient đã gọi** (chỉ dùng `slug`) | `app/api/auth/session-profile/route.ts` L18–27 · `ShopKhoClient.tsx` L171–188 |
| Prefill hiện có? | **Chưa.** `EditorView` create mode chỉ seed từ **nháp localStorage** (`readComposeEditorDraft`) hoặc `initialPhotoFiles: File[]` | `EditorView.tsx` L1003–1057, L1203–1223 |
| Nháp localStorage | `ComposeEditorDraft` = `{ tieuDe, moTa, coverSeed, blocks: ServerBlock[], visibility, tags, albumGridCompose, coverThumb… }`; key `cins-compose-editor:{slug}:journey:{intent}` | `lib/journey/compose-editor-draft.ts` L21–56 |
| Album ảnh | Mỗi ảnh = 1 block `imgs` với `albumGridCell: true` (+ `albumLayout`); `config.imgs` = **Cloudflare imageId**; không dùng `content_media` | `EditorView.tsx` L1998–2036 · `lib/journey/image-grid.ts` L23–31 |
| Publish | Server Action `publishPost()` → trả `{ ok, slug, cotMocId, tacPhamId, milestone }` | `lib/editor/post-publish-action.ts` L104–122, L489–495 |
| Sau publish (client) | `onPublished(detail)` với `ComposePublishedDetail` **đã có `cotMocId`** | `lib/journey/compose-published-sync.ts` L13–21 |
| Gắn hàng vào bài | Bảng `shop_post_hang` (`id_cot_moc` → `content_cot_moc.id`, `id_bien_the`, `id_bang_gia`, `gia_hien_thi`, `thu_tu`, UNIQUE(cot_moc, bien_the)) — **không có FK `shop_nhom`** | `supabase/sql/migration_shop_ban_hang.sql` L111–121 |
| API gắn hàng | `PUT /api/milestone/{id}/shop-hang` body `{ items: [{ idBienThe, idBangGia, thuTu }] }` → `setPostHang()` (replace-all, guard chủ cột mốc + `assertShopReady`) | `app/api/milestone/[milestoneId]/shop-hang/route.ts` · `lib/shop/post-hang.ts` L139–191 |
| Gắn lúc publish? | **Không** — `PublishPostInput` không có field shop → hiện tại là 2 bước (đăng → attach) | `post-publish-action.ts` L64–102 |
| Trần số hàng / bài | **Chưa có cap nào**: `ShopAttachHangModal` cho tick không giới hạn; `listPostHang` `.limit(100)`; `setPostHang` resolve giá **tuần tự** từng biến thể | `ShopAttachHangModal.tsx` · `lib/shop/post-hang.ts` L20–29, L171–183 |

**Chốt kiến trúc rút ra:** ảnh shop **đã là Cloudflare imageId** nên prefill album **không cần upload lại** — chỉ cần nhét imageId vào `blocks[].config.imgs`. `publishPost` nhận thẳng (`isPersistedImageSeed`).

---

## 3. Database

- Bài viết: `content_cot_moc` + `content_tac_pham` + `content_tac_pham_thuoc_moc` (do `publishPost` ghi, không đổi).
- Gắn hàng: `shop_post_hang` (do `setPostHang` ghi, không đổi).
- Ảnh: nằm trong `content_tac_pham.noi_dung_blocks` (imageId), **không** insert `content_media`.
- **Cooldown anti-spam (đã thêm):** bảng `shop_nhom_gioi_thieu` (`id_nhom` PK, `id_cot_moc`, `tao_luc`) — **1 lần / loại / 3 ngày**. Migration `supabase/sql/migration_shop_nhom_gioi_thieu.sql` · `npm run migrate:shop-nhom-gioi-thieu`. API `GET|POST /api/shop/nhom/[id]/gioi-thieu`.

> Nếu sau này muốn "bài giới thiệu chính thức của loại hàng" (để sửa thay vì tạo mới, hiện link trên storefront) thì mới cần ALTER `shop_nhom` thêm `id_cot_moc_gioi_thieu uuid` — **để Phase 2, cần user duyệt** theo DEV_RULES §1.

---

## 4. API & lib

### 4.1 API

Tái dùng:

| Việc | Endpoint / action | Ghi chú |
|---|---|---|
| Đăng bài | Server Action `publishPost()` | Không đổi signature |
| Gắn hàng vào bài | `PUT /api/milestone/{cotMocId}/shop-hang` | Đã guard chủ cột mốc + `assertShopReady` |
| Mẫu của loại | `GET /api/shop/san-pham?nhomId=` | ShopKhoClient đã gọi khi mở loại |
| Owner cho provider | `GET /api/auth/session-profile` | ShopKhoClient đã gọi, chỉ cần dùng thêm `id`/`tenHienThi`/`avatarId` |
| Cooldown giới thiệu | `GET|POST /api/shop/nhom/[id]/gioi-thieu` | GET = trạng thái; POST `{ cotMocId }` ghi mốc — 429 nếu còn trong 3 ngày |

### 4.2 Lib mới — `lib/shop/gioi-thieu.ts` (client-safe, pure)

```ts
/** Ảnh (imageId) của loại hàng — chỉ ảnh, bỏ video, dedupe, giữ thứ tự ưu tiên. */
export function thuThapAnhLoaiHang(input: {
  nhom: ShopNhom;
  mau: ShopSanPham[];          // filteredProducts của loại
  gomAnhBienThe?: boolean;     // mặc định false (xem §8 Q3)
  max?: number;                // mặc định SHOP_GIOI_THIEU_ANH_MAX
}): string[];                   // imageId[]

/** Prefill nháp compose = album ảnh + tiêu đề + mô tả + tag fandom. */
export function buildPrefillGioiThieu(input: {
  nhom: ShopNhom;
  imageIds: string[];
  kichThuoc?: Record<string, { width: number; height: number }>;
  gomTagFandom?: boolean;
}): Omit<ComposeEditorDraft, "v" | "savedAt">;

/** Biến thể để gắn kiosk — bỏ mẫu ngừng bán / thiếu giá; cắt tại SHOP_POST_HANG_MAX. */
export function chonBienTheChoKiosk(input: {
  mau: ShopSanPham[];
  bangGia: ShopBangGia;
  max?: number;                // mặc định SHOP_POST_HANG_MAX = 20
}): {
  items: Array<{ idBienThe: string; idBangGia: string; thuTu: number }>;
  biCat: number;               // số biến thể bị bỏ vì quá trần → hiện hint
};
```

Hằng số mới trong `lib/shop/types.ts`:

- `SHOP_GIOI_THIEU_ANH_MAX = 24` — trần ảnh prefill (ImageGrid tự gấp "+N").
- `SHOP_POST_HANG_MAX = 20` — trần **dòng `shop_post_hang`** (= biến thể) trên 1 bài. Đơn vị là biến thể vì đó là đơn vị query + đúng con số ticker (`aria-label="Hàng bán · N sản phẩm"`).

### 4.3 Siết cap post-kiosk — **sửa hành vi hiện có** (user chốt)

| File | Thay đổi |
|---|---|
| `lib/shop/post-hang.ts` | `setPostHang`: `if (items.length > SHOP_POST_HANG_MAX) throw new Error("TOO_MANY")`. `listPostHang`: `.limit(SHOP_POST_HANG_MAX)` thay `100`. Gộp `resolveGiaBienThe` thành 1 query theo `in(id_bien_the)` nếu rẻ — bỏ vòng lặp tuần tự. |
| `app/api/milestone/[milestoneId]/shop-hang/route.ts` | Validate `items.length` ở backend (400 + «Mỗi bài chỉ gắn tối đa 20 sản phẩm.»), không tin UI. |
| `components/shop/ShopAttachHangModal.tsx` | Counter «N/20»; chặn tick khi đạt trần; checkbox chọn cả nhóm → chỉ thêm tới trần rồi hint; disable Lưu khi vượt. |

**Không hồi tố:** bài cũ đang có >20 dòng giữ nguyên trong DB, chỉ hiện/đọc 20 dòng đầu theo `thu_tu`; lần lưu lại tiếp theo mới bị siết.

**Prefill trả về đúng shape `ComposeEditorDraft`** (không tạo type song song):

```ts
{
  tieuDe: nhom.nhan,
  moTa: nhom.moTa ?? "",
  coverSeed: nhom.anhId,                    // thumbnail loại = cover bài
  albumGridCompose: true,
  visibility: "public",
  tags: nhom.fandoms.map(toArticleTagRef),  // tag Phân loại/fandom — user chốt: có
  blocks: imageIds.map((id) => ({
    loai: "imgs",
    config: {
      layout: "full", rounded: false, gap: IMG_SLOT_GAP_DEFAULT, cap: "",
      imgs: [id],
      albumGridCell: true, albumLayout: "justified",
      ...(kichThuoc?.[id] ?? {}),            // width/height nếu đo được
    },
  })),
}
```

---

## 5. Frontend

### 5.1 Prefill plumbing (điểm chạm editor — giữ diff nhỏ nhất)

| File | Thay đổi |
|---|---|
| `lib/journey/compose-types.ts` | `{ kind: "photo" }` thêm 2 field optional: `prefillDraft?: Omit<ComposeEditorDraft,"v"\|"savedAt">`, `draftScope?: string`. Không thêm kind mới → không đụng `parseComposeSearchParams` (prefill **không** serialize lên URL). |
| `lib/journey/compose-editor-draft.ts` | `buildComposeEditorDraftKey()` nhận thêm `scope?: string` → hậu tố `:{scope}`. `clearComposeSessionDrafts()` nhận `scopes?: string[]` để dọn nháp scoped sau publish. |
| `components/journey/JourneyComposeOverlay.tsx` | Chuyển `prefillDraft` + `draftScope` từ compose state xuống `EditorView`. |
| `components/editor/EditorView.tsx` | 2 chỗ: (a) `composeDraftKey` truyền `scope` (L1003–1010); (b) trong `peekRestoredComposeDraft()` (L1027–1056) — **nếu không có nháp đã lưu thì fallback sang `prefillDraft`**. Mọi `useState` initializer đọc `restoredDraft` (L1155–1230) tự động nhận prefill, **không cần sửa thêm**. |

**Thứ tự ưu tiên:** nháp đã lưu (`scope` riêng) **>** prefill. Mở lại lần 2 cho cùng loại hàng → resume đúng nội dung user đang soạn, không bị prefill ghi đè.

**Draft scope:** `shop-nhom:{nhomId}` → key = `cins-compose-editor:{slug}:journey:photo:shop-nhom:{nhomId}`. Không chạm nháp album thường của user.

### 5.2 Provider compose trên trang Kho

`ShopKhoClient` đang ở `/ban-hang/kho` — **ngoài** `JourneyComposeProvider`, nên `useJourneyCompose()` hiện trả fallback no-op.

Thêm `components/shop/ShopComposeProvider.tsx` (client):

- Gọi `GET /api/auth/session-profile` (hoặc nhận props từ `ShopKhoClient` để **không gọi lặp**).
- Render `JourneyComposeProvider` với `ownerId`, `ownerSlug`, `ownerName`, `ownerAvatarId`, `isOwner={true}`, **`syncComposeUrl={false}`** (không nhét `?compose=photo` vào URL dashboard).
- Nếu chưa có profile → render children, nút «Giới thiệu sản phẩm» ở trạng thái disabled.

Bọc trong `app/ban-hang/kho/page.tsx` (bên trong `ShopReadyGate`) hoặc ngay trong `ShopKhoClient` — ưu tiên **page.tsx** để `ShopKhoClient` không phình thêm.

### 5.3 Nút + luồng bấm

`ShopKhoLoaiMeta` (`ShopKhoLoaiHub.tsx`):

- Prop mới: `onGioiThieu?: () => void`, `gioiThieuDisabledReason?: string | null`.
- Nút đặt trong `shop-kho-loai-meta-head`, **cạnh `shop-kho-loai-view`**, trước cụm xóa. Class `shop-kho-loai-gioi-thieu`, icon Lucide `Megaphone` (hoặc `Sparkles`), label «Giới thiệu sản phẩm», `title` = lý do disable khi có.
- Disable khi: không có ảnh nào · chưa có profile · `banHangEnabled === false` · đang mở overlay.

`ShopKhoClient`:

1. State `gioiThieuOpen` + đo kích thước ảnh (§5.4).
2. Gom ảnh: `thuThapAnhLoaiHang({ nhom: activeNhom, mau: filteredProducts })`.
3. `openCompose({ kind: "photo", prefillDraft, draftScope: \`shop-nhom:${nhom.id}\` })`.
4. Lắng `onPublished` để gắn kiosk (§5.5).

### 5.4 Kích thước ảnh cho album justified

`ImageGrid` justified cần `width`/`height`; shop **không lưu** w/h ảnh → nếu để trống, mọi ảnh coi như 1200×800 (lưới đều, tỉ lệ sai với ảnh dọc).

**Cách làm:** trước khi mở overlay, đo song song bằng `new Image()` trên URL variant `thumbnail` (đã cache CDN), `Promise.allSettled` + timeout ~1500ms; ảnh nào chưa đo được thì bỏ w/h (fallback mặc định). Hiện spinner nhỏ trên nút trong lúc đo.

### 5.5 Tự gắn kiosk sau khi đăng

Trong `ShopKhoClient`, sau `openCompose`, nghe publish theo **một** trong hai cách (chọn cách A):

- **A. `window.addEventListener(COMPOSE_PUBLISHED_EVENT)`** — `detail.cotMocId` có sẵn; không cần sửa provider. Chỉ xử lý khi state "đang chờ gắn cho nhomId X".
- B. Prop `onAfterPublished` của provider — không mang `detail` → phải tự tra bài mới, kém hơn.

Luồng gắn:

```
detail.cotMocId
  → chonBienTheChoKiosk({ mau: filteredProducts, bangGia })   // bỏ ngừng bán / thiếu giá, cắt tại 20
  → PUT /api/milestone/{cotMocId}/shop-hang { items }
  → dispatch "cins:shop-hang-changed"
  → ở lại Kho + toast «Đã đăng bài giới thiệu · gắn N sản phẩm» + link /{slug}/p/{postSlug}
```

`biCat > 0` → toast thêm: «Bài chỉ gắn tối đa 20 sản phẩm — N mẫu còn lại không gắn.»

Thất bại gắn hàng → **không** xóa bài; toast «Bài đã đăng nhưng chưa gắn được hàng» + nút **Thử lại** (giữ `cotMocId` trong state).

**Mặc định bài** (user chốt: cột mốc «Cá nhân» + công khai) — **không cần code thêm**: `DEFAULT_LOAI_MOC = "ca_nhan"` (`EditorView.tsx` L6445) và visibility fallback `"public"` (L1241–1243) đã khớp. `ComposeEditorDraft` **không** có field `loaiMoc`, nên nếu sau này muốn mặc định khác thì phải thêm field vào compose state — hiện không cần.

### 5.6 CSS

`components/shop/shop-dashboard.css`: `.shop-kho-loai-gioi-thieu` theo pattern `.shop-kho-loai-view` (token CINS, radius 10/14, `--cins-blue`), touch target ≥ 44px ở mobile, `:disabled` mờ + `cursor: not-allowed`. Không màu mới ngoài token.

---

## 6. Các bước triển khai

| Step | Nội dung | File | Model |
|---|---|---|---|
| **1** | Prefill plumbing: compose-types + draft scope + overlay + 2 điểm trong EditorView. Verify bằng cách tạm gọi `openCompose` với prefill giả từ Journey. | `lib/journey/compose-types.ts`, `lib/journey/compose-editor-draft.ts`, `components/journey/JourneyComposeOverlay.tsx`, `components/editor/EditorView.tsx` | Grok 4.5 / Medium |
| **2** | `lib/shop/gioi-thieu.ts` + hằng số + `ShopComposeProvider` + nút trong `ShopKhoLoaiMeta` + mở overlay từ `ShopKhoClient` (chưa gắn kiosk). | `lib/shop/gioi-thieu.ts`, `lib/shop/types.ts`, `components/shop/ShopComposeProvider.tsx`, `components/shop/ShopKhoLoaiHub.tsx`, `components/shop/ShopKhoClient.tsx`, `app/ban-hang/kho/page.tsx` | Grok 4.5 / Medium |
| **3** | Auto-attach kiosk sau publish + toast/link + retry; dọn nháp scoped. | `components/shop/ShopKhoClient.tsx`, `lib/journey/compose-editor-draft.ts` | Grok 4.5 / Medium |
| **4** | **Siết cap 20 cho post-kiosk chung** (§4.3): server + route validate + counter trong modal attach; gộp resolve giá 1 query. | `lib/shop/post-hang.ts`, `app/api/milestone/[milestoneId]/shop-hang/route.ts`, `components/shop/ShopAttachHangModal.tsx`, `lib/shop/types.ts` | Grok 4.5 / Medium |
| **5** | CSS nút + copy + empty/disabled state + mobile 360px. | `components/shop/shop-dashboard.css` | Composer 2.5 / Low |

Step 4 độc lập với 1–3 (có thể làm trước hoặc song song nếu muốn giảm tải kiosk sớm).

Một phase một brief — paste plan này khi build từng step.

---

## 7. Edge cases

| Tình huống | Xử lý |
|---|---|
| Loại hàng **không có ảnh nào** (kể cả mẫu) | Nút disable + hint «Thêm ảnh cho loại hàng hoặc mẫu trước» |
| Loại **chỉ có video**, không ảnh | Vẫn disable — yêu cầu là **chỉ lấy ảnh** |
| Ảnh > `SHOP_GIOI_THIEU_ANH_MAX` | Cắt theo thứ tự ưu tiên (ảnh chính → ảnh phụ loại → ảnh mẫu); user tự thêm tiếp trong editor |
| Trùng imageId giữa loại và mẫu | Dedupe theo imageId, giữ lần xuất hiện đầu |
| Đã có nháp scoped cho loại này | Resume nháp, **bỏ** prefill (tránh mất nội dung đang soạn) |
| Đóng overlay không đăng | Nháp scoped còn; kiosk chưa gắn; mở lại resume |
| Publish OK, attach kiosk **fail** | Bài giữ nguyên + toast + **Thử lại**; không rollback bài |
| Mẫu chưa có dòng giá trong bảng đang chọn | Bỏ khỏi items (nếu không `setPostHang` throw `GIA_NOT_FOUND` làm fail cả PUT) |
| Kho chưa có bảng giá nào | Đăng bài bình thường, bỏ bước gắn kiosk + hint «Tạo bảng giá để gắn hàng vào bài» |
| Bán hàng bị tắt giữa lúc soạn | `assertShopReady` fail → toast; bài vẫn đăng được |
| Mẫu ngừng bán (`dangBan === false`) | Không gắn kiosk (khớp hành vi storefront) |
| Loại có **> 20 biến thể** | Gắn 20 đầu theo thứ tự mẫu + toast báo số bị bỏ; user tự chỉnh bằng modal «Gắn sản phẩm» |
| Bài cũ đang gắn > 20 dòng | Giữ trong DB, chỉ đọc 20 dòng đầu; lưu lại lần sau mới bị siết (không hồi tố) |
| Modal attach: tick cả nhóm vượt trần | Chỉ thêm tới trần, hint «Đã đạt 20/20» — không silently bỏ |
| Loại hàng bị xóa khi đang soạn | Bài vẫn đăng; gắn kiosk bỏ qua mẫu đã xóa; nếu rỗng → chỉ toast đăng bài |
| Bấm «Giới thiệu» lần 2 cho cùng loại | Tạo **bài mới** (chưa có liên kết 1-1 loại↔bài — xem §3 ghi chú Phase 2) |
| Ảnh CF bị xóa sau khi đăng | Bài hỏng ảnh — chấp nhận (giống bài thường), không đồng bộ ngược |
| Nhiều tab Kho | Nháp scoped theo loại nên không đè nhau; publish ở tab nào tab đó gắn kiosk |
| `filteredProducts` chưa fetch xong khi bấm | Chờ / disable nút tới khi `/api/shop/san-pham?nhomId=` xong (tránh album thiếu ảnh mẫu) |
| Mobile 360px | Nút xuống dòng trong head, không tràn; overlay compose đã responsive |

---

## 8. Quyết định đã chốt (user duyệt 2026-08-10)

| # | Quyết định |
|---|---|
| **Q1** | Album lấy **ảnh chính + ảnh phụ của loại hàng + ảnh các mẫu**. Bỏ video. |
| **Q2** | **Không** gộp ảnh biến thể (`shop_bien_the.anh_id`) ở Phase 1 — dễ trùng, phình album. |
| **Q3** | Kiosk: **tối đa 20 sản phẩm / 1 bài** — và siết luôn cho **mọi** luồng gắn hàng hiện có để giảm query (§4.3), không chỉ luồng giới thiệu. Đơn vị = dòng `shop_post_hang` (biến thể). |
| **Q4** | **Có** tự gán tag Phân loại/fandom của loại hàng vào bài. |
| **Q5** | Mặc định **cột mốc «Cá nhân» + công khai** — trùng default sẵn có, không cần code thêm. |
| **Q6** | Sau khi đăng: **ở lại Kho** + toast có link xem bài. |

---

## 9. Verify sau khi build

- [ ] Loại có 1 ảnh chính + 3 ảnh phụ + 5 mẫu có ảnh → bấm nút: overlay mở, album đúng số ảnh (dedupe), cover = thumbnail loại, tiêu đề = tên loại, mô tả = `moTa`.
- [ ] Video của loại **không** xuất hiện trong album.
- [ ] Thêm/bớt ảnh trong editor hoạt động; sửa tiêu đề/mô tả/tag bình thường.
- [ ] Đóng overlay → bấm lại: resume đúng nội dung đang soạn (không bị prefill ghi đè).
- [ ] Đăng → bài xuất hiện trên `/{slug}` dạng `jcard--photo` + `ShopKioskBlock` hiện «Hàng bán · N sản phẩm».
- [ ] Bài mới đăng có cột mốc «Cá nhân», công khai, và tag Phân loại/fandom của loại hàng.
- [ ] `shop_post_hang` có đúng N dòng cho `id_cot_moc` mới; không có biến thể thiếu giá; **N ≤ 20**.
- [ ] Loại > 20 biến thể → gắn đúng 20 + toast báo số bị bỏ.
- [ ] Modal «Gắn sản phẩm»: counter N/20, chặn tick quá trần, tick cả nhóm dừng ở trần.
- [ ] `PUT /api/milestone/{id}/shop-hang` với 21 items → 400 (test bằng curl, không chỉ qua UI).
- [ ] Bài cũ đang có >20 dòng vẫn render (20 dòng đầu), không lỗi.
- [ ] Nháp album thường (`:journey:photo`) của user **không** bị ảnh hưởng.
- [ ] URL `/ban-hang/kho` **không** bị thêm `?compose=photo`; Back không mở lại overlay.
- [ ] Tắt bán hàng → nút ẩn/disable; attach fail có toast + Thử lại.
- [ ] Mobile 360px: head không tràn, touch target ≥ 44px.
- [ ] Không lỗi lint/type; không `select('*')`; không log PII.

---

## 10. Tài liệu cần cập nhật khi build xong

| File | Mục |
|---|---|
| `docs/CINS_DECISIONS.md` | LOG 2026-08-10: «Shop — Giới thiệu sản phẩm từ Kho» (prefill compose qua nháp scoped; kiosk gắn sau publish; **trần 20 sản phẩm/bài áp cho mọi luồng post-kiosk**; 0 migration; quyết định Q1–Q6) |
| `docs/CINS_IMPLEMENTATION.md` | `lib/shop/gioi-thieu.ts`, `ShopComposeProvider`, mở rộng `JourneyComposeState.prefillDraft` + `draftScope`, `SHOP_POST_HANG_MAX` + validate ở `PUT /api/milestone/{id}/shop-hang` |
| `docs/CINS_INSTRUCTION.md` | Dòng «Thay đổi lớn gần đây» nếu coi là mốc |
| `docs/cursor_brief_journey_blocks_css.md` | Ghi chú album prefill từ imageId có sẵn (không upload lại) |
