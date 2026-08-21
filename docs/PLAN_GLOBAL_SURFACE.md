# PLAN — Bề mặt public tiếng Anh (Global Surface Slice)

Ngày lập: 2026-08-20 · Trạng thái: **Phase 0 xong · Phase 1 chrome đang làm** · Nguồn định vị: `CINS_DECISIONS.md` O23 + LOG 2026-08-20, `CINS_FOUNDATIONS.md` §1.1–1.3.

> Lát cắt HẸP: chỉ bề mặt **public share** (profile · Journey · tác phẩm · storefront chế độ xem). **KHÔNG** dịch editor, dashboard seller, admin, module hướng nghiệp/ĐH. Full i18n + đa tiền tệ + đa quốc gia vẫn defer.

---

## ⭐ CHỐT PHẠM VI (2026-08-21) — "VN-only vận hành + English chỉ để XEM"

Sau vòng tư duy mở rộng SEA/Đài Loan (địa chỉ đa nước, đa tiền tệ, QR nước ngoài, Lemon Squeezy, xuyên biên A→B), **kết luận: KHÔNG làm** — không kiểm chứng & quản lý nổi khi chưa có cầu ngoại thật. Chốt lại đúng lát cắt hẹp:

**Làm:** người nước ngoài **vào xem** portfolio/Journey/tác phẩm/storefront của VN bằng **tiếng Anh** (chrome tĩnh + format + `<html lang>` + OG). = Phase 0 (xong) + Phase 1 chrome (đang làm).

**Giữ nguyên VN, KHÔNG đụng (đường ray giao dịch):**
- Địa chỉ: `tinh_thanh_vn_enum` như cũ — **không** thêm quốc gia, **không** bỏ ward, **không** address tự do.
- Thanh toán buyer→seller: **VietQR VND** như cũ. Thu phí 5%: **VietQR + Sepay** như cũ.
- Vận chuyển: ĐVVC VN như cũ.
- Content người dùng (tên/mô tả sản phẩm, caption, tên shop): **để nguyên tiếng Việt** giai đoạn này — **chưa** machine-translate.

**DEFER — gated theo cầu (chỉ mở khi English-view cho tín hiệu khách ngoại thật):**
- Enum/định dạng địa chỉ đa nước (SEA + TW) · đa tiền tệ (`tien_te` quy đổi) · QR nội địa nước khác (PromptPay/QRIS/DuitNow/QR Ph/TWQR) · rail phí seller ngoại (Lemon Squeezy ví trả trước) · checkout & ship xuyên biên · **Phase 2 content song ngữ (MT)**.

**Track song song (ngoài doc này):** VN retention — **Web Push / PWA** ("Cài đặt ứng dụng"). Ưu tiên cùng English-view vì đều rẻ & bám tập VN hiện có.

Khách ngoại muốn **mua**: vẫn đi luồng VN (VND + địa chỉ VN) hoặc nhắn seller qua chat. **Không** build checkout ngoại.

---

## 0. Mục tiêu & vì sao

Seller VN (mũi nhọn: wibu/merch) share link portfolio/storefront ra khán giả quốc tế (X/Discord/ArtStation). Link đó phải **đọc được bằng tiếng Anh**. Đây là feature **cho seller VN**, không phải mở thị trường nước ngoài. Giá thành phải nhỏ — nếu không nó thành full i18n nhiều tháng.

### Trong / ngoài phạm vi

| Trong | Ngoài |
|---|---|
| `/{slug}` profile (journey + gallery), `/{slug}/p/{postSlug}` tác phẩm | Editor bài (`/{slug}/p/new`, `.../edit`) |
| `/{slug}/shop/**` storefront **chế độ xem** (buyer) | Dashboard seller `/seller/**` |
| `/shopping/**` hub browse (buyer) | Admin `/admin/**` |
| Chrome tĩnh + format số/ngày/tiền + `<html lang>` + OG | Module `/guidance`, `/university`, `/majors` deep content (VN-only) |
| Content song ngữ (Phase 2 — xem §6) | Chat, thanh toán, checkout logic (giữ VN) |

---

## 1. Crux: chrome ít, content nhiều

Đo từ scan (2026-08-20):

| Bề mặt | Chrome tĩnh (catalog dịch được) | Content người dùng (data — cần chiến lược) |
|---|---|---|
| Journey timeline/gallery | ~15% (~150–220 chuỗi) | ~85% (tiêu đề/mô tả cột mốc, caption tác phẩm, tên org, co-author) |
| Post permalink | ~20% | ~80% (title, block text, comment) |
| Storefront view | chrome ~150–200 chuỗi | tên shop, tên/mô tả sản phẩm, review, tên danh mục |

**Kết luận:** dịch chrome-only cho buyer quốc tế **giá trị thấp** (nút English bọc content Việt). Giá trị thật ở Phase 2. Phase 0+1 là điều kiện cần; Phase 2 là điều kiện đủ.

---

## 2. Cơ chế locale — switch + cookie + IP default (KHÔNG prefix)

**Vì sao không `/en/...`:** `app/[slug]/page.tsx` coi mọi top-segment ngoài `RESERVED_TOP_SEGMENTS` là profile. `en` chưa reserved → có thể là slug user. Prefix ⇒ phải reserve `en`, migrate slug, split-brain giữa profile `/{slug}` (không prefix) và phần prefix. Loại.

**Chọn:** một switch ngôn ngữ (sidebar chân + menu tài khoản) là nguồn sự thật user. `middleware.ts` forward `x-cins-locale`.

```
Ưu tiên: ?lang=en|vi (ghi cookie)  >  cookie cins-locale (user đã switch)
  >  IP cf-ipcountry (VN → vi, khác → en) — CHỈ seed mặc định switch, không ghi cookie
  >  Accept-Language  >  default vi
```

- **IP / geo chỉ set mặc định** của switch khi chưa có cookie. User bấm VI/EN → cookie `cins-locale` 1 năm; IP không ghi đè.
- **`?lang=en`** cho seller share + OG crawler (không cookie).
- Chèn **sau** legacy redirect, cạnh block `requestHeaders` hiện có trong `middleware.ts`. Không đặt trước legacy 308.

---

## 3. Kiến trúc (module mới, nhỏ)

| Module | File | Vai trò |
|---|---|---|
| Locale server | `lib/locale/server.ts` | `getCinsLocale()` đọc `headers()` → `"en" \| "vi"` |
| Locale client | `lib/locale/context.tsx` | `<LocaleProvider>` + `useLocale()`; seed từ server layout |
| Message catalog | `lib/i18n/messages/{vi,en}.ts` + `lib/i18n/t.ts` | `getT(locale)` (server) · `useT()` (client). Typed keys, không lib nặng |
| Format | `lib/format/index.ts` | `formatDate/formatNumber/formatCurrency(value, locale)` — wrap `Intl`, tiền vẫn VND (`₫`) |
| Pick content | `lib/locale/pick.ts` | `pickText({ vi, en }, locale)` — EN nếu có, else VI |

**Catalog: custom-light, KHÔNG next-intl.** Lý do: Next 16 + OpenNext/Cloudflare edge đi trước docs; scope ~350–420 chuỗi quản tay dễ; tránh rủi ro plugin edge-runtime. Có thể migrate next-intl sau nếu mở rộng. (next-intl `localePrefix:'never'` khả thi nhưng chưa cần.)

---

## 4. PHASE 0 — Hạ tầng (no-regret, làm trước)

| # | Việc | File | Verify |
|---|---|---|---|
| 0.1 | Locale detect + forward header | `middleware.ts` | `x-cins-locale` xuất hiện downstream |
| 0.2 | `getCinsLocale()` server | `lib/locale/server.ts` | unit: header→locale |
| 0.3 | `LocaleProvider` + `useLocale()`, seed ở layout public | `lib/locale/context.tsx`, `app/[slug]/layout.tsx` | client đọc đúng |
| 0.4 | `lib/format/*` locale-aware; **chưa** thay call site | `lib/format/index.ts` | `formatCurrency(1000,"en")` = `₫1,000` |
| 0.5 | `<html lang>` + `openGraph.locale` động | `app/layout.tsx`, `lib/seo/build-article-metadata.ts`, `app/[slug]/_lib/build-journey-metadata.ts` | view-source `lang` đổi theo `?lang=` |
| 0.6 | Guardrail vào `CINS_DEV_RULES.md`: code mới trên trụ 1/2 không hardcode `vi-VN`/VND/`tinh_thanh`/timezone ở lõi | `docs/CINS_DEV_RULES.md` | checklist review |

Phase 0 không đổi UI người dùng thấy — thuần hạ tầng. An toàn merge sớm.

---

## 5. PHASE 1 — Chrome catalog (bề mặt public)

Dịch chuỗi tĩnh. Ưu tiên theo mật độ (từ scan):

### 5.1 Journey / profile / post
`ContentSurfaceViewToggle` · `JourneyTimelineBar` · `JourneyMilestoneCard`(+actions) · `JourneyGalleryGridView` · `JourneyPostBody` · `PostMetaRail` · `PostActionsRail` · `CommentBlock` · `JourneyFollowButton`/`JourneyUserFollowButton` · `JourneySidebar`. Label lib: `lib/journey/profile.ts` (`GIAI_DOAN_LABEL`), visibility maps.

### 5.2 Storefront view
`JourneyShopStorefront` · `JourneyShopLoaiClient` · `JourneyShopView` · `JourneyShopGuestActions` · `CuaHangListingClient` · `ShopGioChungButton` · `ShopMuaHistory` · promo cards. Label lib: `lib/shop/types.ts` (`SHOP_TRANG_THAI_DON_LABEL`, `SHOP_LOAI_DON_LABEL`), `lib/shop/khieu-nai-labels.ts`.

### 5.3 OG images (chrome) + format
`lib/journey/og-share-card.tsx`, `lib/journey/post-og-card.tsx`, các `opengraph-image.tsx`/`twitter-image.tsx` → nhận locale từ `?lang=` (qua `x-url`/`x-cins-locale`). Thay call site `Intl`/`toLocaleString("vi-VN")` trên bề mặt public bằng `lib/format` (2 bản `formatGia()` trùng ở shop → gộp).

**Ước lượng:** ~350–420 chuỗi, ~45 component. Chính sách từ đã-English (`Journey`, `Gallery`, `Shop`, `Verified`): giữ nguyên hai bản như nhau.

---

## 6. PHASE 2 — Content song ngữ 🔒 DEFER (gated theo cầu — chốt 2026-08-21)

> **Không làm giai đoạn này.** Content người dùng để nguyên tiếng Việt; chỉ mở Phase 2 khi English-view cho tín hiệu khách ngoại thật (traffic/signup/portfolio ngoại). Phân tích 3 nhánh giữ lại để tham chiếu khi mở.

Đây là nơi có giá trị thật. Ba nhánh, khác nhau về schema + công:

| | A. Seller tự nhập | B. Máy dịch + cache | C. Hybrid |
|---|---|---|---|
| Schema | Thêm `*_en` (hoặc bảng dịch) cho `shop_cua_hang.ten/mo_ta`, `shop_san_pham.ten`, `shop_nhom.nhan/mo_ta`, `content_cot_moc.tieu_de/mo_ta`, `content_tac_pham.mo_ta`, `user.bio` | Bảng cache `*_dich` keyed (bản gốc hash → en) | Cả hai: override thủ công đè cache MT |
| Seller effort | Cao (điền tay) — cold-start phần lớn bỏ trống | 0 | 0, tùy chọn override |
| Chất lượng | Cao | Trung bình (thuật ngữ fandom rủi ro) | Cao dần |
| Chi phí | 0 | API MT + cache + invalidation khi sửa content | API MT |
| Đụng dashboard seller | Có (thêm ô English — ngoại lệ có kiểm soát) | Không | Có (ô override) |
| Phủ ngay | Thấp | 100% | 100% |

**Hướng ưu tiên khi mở (ghi 2026-08-20, chưa kích hoạt): nhánh B — MT + cache, tiến hóa sang C.** Cold-start không thể trông chờ seller điền English; MT phủ 100% khớp đúng câu chuyện auto-detect. Cache theo hash bản gốc, invalidate khi content sửa. Giữ nguyên proper noun / `₫`. Sau khi có seller nghiêm túc → mở ô override (C). *(2026-08-21: hoãn — chưa build tới khi có cầu ngoại.)*

*Nếu chọn A:* Phase 2 thành schema + editor field, `pickText()` render EN-else-VI, không cần pipeline MT.

Tiền tố tên cột theo convention (`CINS_FOUNDATIONS.md` §4): tiếng Việt không dấu — vd `mo_ta_en` / bảng `*_dich`. Chốt tên cột + ALTER idempotent trước migration.

---

## 7. SEO / hreflang — defer

Cookie-locale ⇒ hreflang **không bắt buộc** phase này. Khi có URL EN tường minh (`?lang=en` canonical hoặc subdomain sau): thêm `alternates.languages` ở `lib/seo/build-article-metadata.ts` + `app/sitemap.ts` `xhtml:link`. Hiện: `<html lang>` + `openGraph.locale` theo locale phát hiện là đủ. Profile đã `noindex` nên không lo trùng.

---

## 8. Thứ tự thực hiện (mỗi bước 1 commit)

| Bước | Nội dung | Phase |
|---|---|---|
| 1 | `middleware.ts` locale detect + `x-cins-locale`; `lib/locale/server.ts` | 0 |
| 2 | `LocaleProvider` + layout seed; `lib/format/*` | 0 |
| 3 | `<html lang>` + OG locale động; guardrail DEV_RULES | 0 |
| 4 | Catalog scaffold `lib/i18n/*` + dịch cluster journey/post | 1 · **đã bắt đầu 2026-08-20** (toggle/sidebar/follow/filter/post meta + giá storefront + lịch sử mua + OG fallback) |
| 5 | Dịch cluster storefront view + hub | 1 · **đang làm** (2026-08-20: storefront + LoaiClient + hub · 2026-08-21: lịch sử mua + voucher/combo + chi tiết đơn buyer + shop tạm đóng + review/gallery; checkout/giỏ `ShopGioChungButton` giữ VN theo §0) |
| 6 | OG chrome + gộp `formatGia`, thay call site public | 1 · **đang làm** (2026-08-20: OG `Tác phẩm` + comment compose + type/visibility card + shop view guest · 2026-08-21: social actors modal + org sự kiện feed card `formatDate` + milestone fallback `people.*` + identity-verified card + organizations view) |
| 7 | 🔒 **DEFER** — Chốt nhánh Phase 2 (A/B/C) → migration/schema hoặc pipeline MT | 2 (gated) |
| 8 | 🔒 **DEFER** — Render content song ngữ (`pickText`/MT) trên bề mặt public | 2 (gated) |

Bước 1–6 làm được ngay không phụ thuộc quyết định. Bước 7–8 **hoãn** (chốt 2026-08-21) — chỉ mở khi English-view cho tín hiệu cầu ngoại.

---

## 9. Edge cases

1. **OG unfurl không cookie:** crawler dùng `?lang=` param; nếu thiếu → default vi. Seller share link English phải kèm `?lang=en`.
2. **Slug `en`/`vi`:** không reserve (không dùng prefix) — nhưng `?lang` là query nên vô hại với `[slug]`.
3. **Client/server lệch locale:** provider seed từ server (`x-cins-locale`) để tránh hydration mismatch; không đọc `navigator.language` ở client lần đầu.
4. **Format tiền:** luôn VND `₫`; chỉ đổi grouping theo locale (`en-US`). Không convert tỉ giá.
5. **Content trống EN (nhánh A):** `pickText` fallback VI — không hiện chuỗi rỗng.
6. **MT cache stale (nhánh B):** invalidate theo hash bản gốc khi seller sửa.
7. **`localeCompare("vi")` khi sort:** giữ VI cho dữ liệu VN; không đổi sort theo UI locale (tránh xáo trộn thứ tự dữ liệu).
8. **Chuỗi đã-English lẫn lộn:** catalog vẫn khai cả 2 bản để nhất quán, tránh nửa Việt nửa Anh.

---

## 10. Security / performance

- Không log `Accept-Language` kèm PII; cookie `cins-locale` non-sensitive, `SameSite=Lax`.
- MT (nhánh B): key server-only, không lộ client; rate-limit + cache để chặn chi phí; không MT nội dung private (chỉ public).
- Middleware locale chạy trên gần mọi request → giữ O(1), không gọi DB/network trong middleware.
- `lib/format`/catalog không thêm bundle nặng client (tree-shake theo locale nếu cần).

---

## 11. Câu hỏi mở

1. ~~Phase 2 nhánh nào (A/B/C)?~~ → **Hoãn (2026-08-21)**, không chặn gì vì Phase 2 gated.
2. Có làm nút **toggle ngôn ngữ** hiển thị cho user không, hay chỉ auto-detect + `?lang=`? (đề xuất: auto-detect + toggle nhỏ ở footer/profile).
3. ~~Phạm vi content Phase 2 (comment/review)?~~ → theo Phase 2, hoãn.

### Điều kiện MỞ phase gated (SEA / thanh toán ngoại / Phase 2)
Chỉ xem xét khi có **tín hiệu cầu ngoại đo được** từ English-view: tỉ lệ traffic ngoại đáng kể, có signup/portfolio ngoại, hoặc seller VN yêu cầu bán ra rõ ràng. Không build trước tín hiệu.
