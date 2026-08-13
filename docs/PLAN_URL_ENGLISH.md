# PLAN — Đổi toàn bộ URL trang sang tiếng Anh

Ngày lập: 2026-08-14 · Trạng thái: **đã hoàn thành** (build xanh + smoke test redirect pass).

## Kết quả (2026-08-14)

| Hạng mục | Số lượng |
|---|---|
| Folder `app/**` đổi tên (`git mv`, giữ history) | 239 |
| URL literal rewrite | 946 trong 368 file |
| Import specifier `@/app/**` sửa theo folder mới | 132 trong 72 file |
| Route trang + API còn segment tiếng Việt (ngoài `/admin`) | 0 |

Toolkit (giữ lại để chạy lại / mở rộng):

| Script | Việc |
|---|---|
| `scripts/url-en/dictionary.mjs` | Từ điển segment — nguồn sự thật duy nhất |
| `scripts/url-en/map-routes.mjs` | Sinh `docs/URL_MAP_GENERATED.md` để review |
| `scripts/url-en/apply.mjs` | `git mv` folder + rewrite URL literal |
| `scripts/url-en/fix-app-imports.mjs` | Sửa import `@/app/...` sau khi đổi folder |
| `scripts/url-en/gen-legacy-map.mjs` | Sinh `lib/navigation/legacy-url-map.ts` |
| `scripts/url-en/smoke-redirects.mjs` | Smoke test 308 trên server đang chạy |

**Lưu ý khi chạy lại `apply.mjs --literals`:** `middleware.ts` và
`lib/navigation/legacy-url-map.ts` nằm trong `SKIP_FILES` — chúng **phải** giữ path
tiếng Việt, nếu bị rewrite thì redirect legacy sẽ tự trỏ về chính nó.

Query param đã đổi ở biên URL (giá trị lưu DB giữ tiếng Việt): `?nhom=` → `?group=`,
`?mau=` → `?variant=`, `?display=luoi` → `?display=grid`. Reader gallery vẫn nhận
`luoi` cho link đã share.

`worker.ts` được đưa vào `tsconfig.exclude`: nó import artifact `.open-next/worker.js`
chỉ tồn tại sau deploy build, nên `@ts-expect-error` lúc đúng lúc sai.

## Quyết định đã chốt (2026-08-14)

| # | Quyết định |
|---|---|
| Q1 | **Đổi cả API routes** cùng lần này (`/api/co-so` → `/api/academy`…). 353 route file. |
| Q2 | **Redirect 308 vĩnh viễn** cho URL cũ, qua một map tập trung. Áp dụng cho cả `/api/*` (308 giữ method + body nên POST vẫn đúng). |
| Q3 | **Đổi luôn query param tiếng Việt** (`?display=luoi`, `?nhom=`, `?mau=`). Giá trị lưu DB giữ nguyên, map ở biên URL. |
| Q4 | Từ vựng §1 chốt như đề xuất. |
| — | `/admin/**` ngoài phạm vi (giữ tiếng Việt). |

## 0. Phạm vi

| Trong phạm vi | Ngoài phạm vi |
|---|---|
| 105 route trang + 353 route API (`app/**`, không `admin`) | `/admin/**` (user chỉ định bỏ) |
| ~598 URL literal trong 239 file (`href`, `redirect`, `revalidatePath`, `router.push`, middleware regex) + mọi `fetch("/api/…")` | Tên bảng/cột DB, enum, tên file/folder `lib/`, `components/` |
| Registry segment reserved (3 chỗ) + middleware redirect 308 | Slug động do người dùng tạo (`tui-deo-cheo-canvas-…`) — giữ nguyên |
| `sitemap.ts`, metadata `openGraph.url`, canonical | Giá trị enum/data trùng tên segment (`browseMode`, `gallery_luoi`) |
| Query param: `display`, `nhom`, `mau` | |

Slug động **không đổi**: chỉ đổi segment tĩnh. Ví dụ user đưa ra khớp đúng nguyên tắc này —
`/ban-hang/kho/tui-deo-cheo-canvas-harumasa-sunday` → `/seller/inventory/tui-deo-cheo-canvas-harumasa-sunday`.

## 1. Bảng mapping đề xuất (cần bạn chốt)

Hai dòng có ✅ là do bạn chỉ định trong yêu cầu.

### 1.1 Top-level

| URL hiện tại | Đề xuất | Ghi chú |
|---|---|---|
| `/bai-viet/[slug]` | `/articles/[slug]` | |
| `/ban-hang` | `/seller` | ✅ |
| `/ban-hang/kho` | `/seller/inventory` | ✅ |
| `/ban-hang/cua-hang` | `/seller/store` | |
| `/ban-hang/don` | `/seller/orders` | |
| `/ban-hang/bao-cao` | `/seller/reports` | |
| `/ban-hang/su-kien` | `/seller/events` | |
| `/ban-hang/uu-dai` | `/seller/promotions` | + `/combos`, `/vouchers` |
| `/cua-hang` | `/shopping` | ✅ |
| `/cua-hang/mat-hang` | `/shopping/category` | ✅ (số ít theo bạn; mình sẽ giữ nguyên `category`) |
| `/cua-hang/hang` | `/shopping/products` | tab "hàng" (mẫu/sản phẩm) |
| `/cua-hang/shop` | `/shopping/shops` | tab "cửa hàng" |
| `/mo-shop` | `/open-shop` | |
| `/co-so` | `/academy` | cơ sở đào tạo |
| `/co-so-dao-tao` | `/university` | trường ĐH (đã nhận 308 từ `/truong-dai-hoc`) |
| `/cong-dong` | `/community` | `/tao` → `/create` |
| `/to-chuc` | `/organizations` | |
| `/tao-to-chuc` | `/create-organization` | `/co-so` → `/academy`, `/studio` giữ |
| `/nganh-hoc` | `/majors` | |
| `/nghe-nghiep` | `/careers` | |
| `/huong-nghiep/nganh` · `/nghe` | `/guidance/major` · `/guidance/career` | |
| `/tim-khoa-hoc` | `/find-courses` | |
| `/tim-kiem` | `/search` | |
| `/su-kien` | `/events` | |
| `/tuyen-dung` | `/jobs` | |
| `/tai-khoan/thanh-toan` | `/account/billing` | |
| `/chinh-sach/phi-san` | `/policies/marketplace-fee` | |
| `/chinh-sach/phi-csdt` | `/policies/platform-fee` | |
| `/ho-tro` · `/ho-tro/huong-dan` | `/support` · `/support/guides` | |
| `/thong-tin-du-an` | `/about` | |
| `/termandservice` | `/terms` | |
| `/kham-pha` | `/explore` | |
| `/chat/goi` | `/chat/calls` | |
| `/chat/nhom/moi/[ma]` | `/chat/groups/invite/[ma]` | |
| `/luoi` | **xóa** | đã là legacy redirect về `/` |
| `/cong-dong/[slug]/nhan` | **xóa** | legacy redirect sau khi tạo cộng đồng |
| `/nhap/fb-feature-cards` | `/draft/fb-feature-cards` | trang nháp nội bộ |
| `/keyword`, `/software`, `/fandom`, `/studio`, `/login`, `/onboarding`, `/maintenance`, `/s/[token]` | giữ nguyên | đã tiếng Anh |

### 1.2 Segment lồng (dùng lại ở `/academy`, `/university`, `/studio`)

`quan-ly`→`manage` · `tong-quan`→`overview` · `cai-dat`→`settings` · `tin-nhan`→`messages` ·
`chi-nhanh`→`branches` · `diem-danh`→`attendance` · `doanh-thu`→`revenue` · `giao-trinh`→`curriculum` ·
`hoc-phi`→`tuition` · `hoc-vien`→`students` · `lop-hoc`→`classes` · `phi`→`fees` · `co-so`→`facilities` ·
`khoa-hoc`→`courses` · `bai-dang`→`posts` · `su-kien`→`events` · `tuyen-dung`→`jobs` · `thong-tin`→`info` ·
`loai`→`collections` (trang loại hàng storefront) · `nhom`→`groups` · `moi`→`invite` · `tao`→`create`

## 2. Điểm tập trung phải sửa (làm trước, giảm rủi ro)

| File | Vai trò |
|---|---|
| `lib/navigation/hard-nav.ts` | `RESERVED_TOP_SEGMENTS` + `FRAGILE_SHELL_PREFIXES` + `pathnameShellId` |
| `lib/link/cins-internal-preview.ts` | bản sao thứ hai của `RESERVED_TOP_SEGMENTS` |
| `app/[slug]/journey/actions.ts` | `RESERVED_SLUGS` — chặn user chiếm slug trùng route mới |
| `lib/cins/hubPaths.ts` | `NGHE_NGHIEP_HUB_PATH`, `NGANH_HOC_HUB_PATH`, `TO_CHUC_HUB_PATH`, `TIM_KHOA_HOC_HUB_PATH`, `CO_SO_DAO_TAO_HUB_PATH` |
| `lib/to-chuc/co-so-routes.ts`, `org-quan-ly-routes.ts`, `su-kien-routes.ts` | builder + parser `/co-so/...` |
| `lib/shop/cua-hang-href.ts` | `/ban-hang/kho`, `/ban-hang/cua-hang`, `/{slug}/shop/.../loai/...` |
| `lib/cong-dong/routes.ts`, `lib/search/paths.ts`, `lib/huong-dan/slug.ts` | builder theo domain |
| `lib/cins/mainNav.ts` (18 literal) | nav chính |
| `middleware.ts` (17 literal) | legacy redirect + default-tab redirect + protected path regex |

**Rủi ro số 1:** `/{slug}` là catch-all profile. Mỗi segment tiếng Anh mới (`seller`, `shopping`,
`academy`, `university`, `community`, `majors`, `careers`, `events`, `jobs`, `search`, `articles`,
`organizations`, `account`, `policies`, `support`, `about`, `terms`, `explore`, `guidance`,
`find-courses`, `open-shop`, `create-organization`, `draft`) phải vào **cả 3** registry ở trên trước khi
route đi vào hoạt động — nếu không sẽ bị nuốt thành profile hoặc hard-nav sai.

## 3. Chiến lược redirect (SEO + link đã share)

Thêm một bảng map duy nhất `lib/navigation/legacy-url-map.ts`: `{ [oldTopSegment]: newTopSegment }` +
map segment lồng, và một hàm `rewriteLegacyPath(pathname): string | null`. Middleware gọi hàm này
**trước** mọi logic khác và trả `308`.

Cách này thay thế 3 hàm redirect legacy rời rạc đang có trong `middleware.ts` bằng một nguồn duy nhất,
và giữ được `/truong-dai-hoc` → `/university` (2 chặng gộp thành 1).

Cần giữ redirect này lâu dài vì `/bai-viet/*`, `/nganh-hoc/*`, `/nghe-nghiep/*` đang nằm trong `sitemap.ts`
và đã được index.

## 4. Thứ tự thực hiện

| Bước | Nội dung | Verify |
|---|---|---|
| 1 | Chốt bảng mapping (§1) → viết `lib/navigation/url-map.ts` (nguồn sự thật duy nhất) | typecheck |
| 2 | Cập nhật 3 registry reserved + `RESERVED_SLUGS` | `npm run build` |
| 3 | Đổi tên folder `app/**` theo mapping (git mv, giữ history) — **không** sửa literal | build 404-clean |
| 4 | Sửa route builder trong `lib/` (§2) — phần lớn literal chảy qua đây | typecheck |
| 5 | Quét literal còn lại (~239 file) theo từng domain: shop → co-so → cong-dong → còn lại | grep về 0 |
| 6 | `middleware.ts`: `rewriteLegacyPath` 308 + cập nhật regex protected/default-tab | test URL cũ |
| 7 | `sitemap.ts`, `openGraph.url`, `revalidatePath`, `lib/seo/*` | xem `/sitemap.xml` |
| 8 | Smoke test 105 route + soft-nav giữa các shell (HardNavGuard) | thủ công |

Mỗi bước là một commit riêng. Bước 3 và 5 là nơi dễ vỡ nhất → nên chạy `npm run host` kiểm tra sau mỗi domain.

## 5. Edge case đã phát hiện

1. **Tab id vừa là URL vừa là data.** `CoSoTabId` (`bai-dang`, `khoa-hoc`, `su-kien`, `tuyen-dung`) dùng cho
   cả URL và config trang (có thể lưu DB, xem `co-so-page-cau-hinh`). Nếu đổi URL segment mà giữ tab id →
   cần lớp map `tabId ↔ urlSegment`. **Đề xuất: giữ tab id nguyên, chỉ map ở tầng URL.** Cần xác nhận
   `co_so_page_cau_hinh` có lưu tab id trong DB không (đọc DB trực tiếp trước khi sửa).
2. **`browseMode="mat-hang"`** trong `components/shop/CuaHangListing*` là giá trị data, không phải URL —
   giữ nguyên để không đụng logic, chỉ URL đổi.
3. **`?display=luoi`** (query param gallery) và `JourneyDefaultView = "gallery_luoi"` lưu trong
   `user_*` — **không đổi** (là data, không phải path). Xem Q3.
4. **`/co-so` là cả top-level và segment lồng** (`/co-so/[slug]/quan-ly/co-so`). Hai vị trí phải đổi thành
   hai từ khác nhau (`/academy` vs `facilities`) → không thể find-replace mù.
5. **`revalidatePath("/luoi")`** ở 2 chỗ (`lib/editor/*`) sẽ chết khi xóa route → phải xóa cùng lúc.
6. **OG image route** (`opengraph-image`, `twitter-image`) đọc `x-url` từ middleware; đổi path không ảnh
   hưởng nhưng cần smoke test 1–2 trang vì middleware sẽ có nhánh redirect mới chạy trước.
7. **`/nganh` xuất hiện trong `RESERVED_TOP_SEGMENTS`** nhưng không có `page.tsx` (chỉ có
   `app/nganh/actions.ts`, 10 literal) → cần xác định đây là route đã xóa hay server action dùng chung.

## 6. Câu hỏi mở

Đã chốt hết — xem bảng "Quyết định đã chốt" ở đầu file. Q1 (API đổi luôn), Q2 (308 vĩnh viễn),
Q3 (đổi query param), Q4 (từ vựng §1) đều đã thực hiện.

## 7. Còn lại

- `/admin/**` vẫn tiếng Việt theo yêu cầu — nếu sau này muốn đổi, thêm vào `dictionary.mjs`
  rồi bỏ filter admin trong `apply.mjs`.
- Chưa smoke test soft-nav (HardNavGuard) giữa các shell bằng tay; redirect và SSR đã pass.
