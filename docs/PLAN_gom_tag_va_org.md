# PLAN — Gom bài viết thành tag + siết org (CSĐT · Studio)

> **Trạng thái:** draft chờ duyệt · **Ngày:** 2026-08-15
> **Task type:** planning (Opus 5 · Medium). **Chưa code** — chờ user chốt plan + câu treo §8.
> **Không** ALTER / DROP enum / xóa bảng trong phase này.

---

## 1. Bối cảnh

Ban đầu CINs dựng **thư viện ngành**: nghề, môn học, ngành đào tạo, keyword, phần mềm, fandom — mỗi loại một hub, một route, một skin entity. Org cũng 5 loại (`truong_dai_hoc` / `co_so_dao_tao` / `studio` / `doanh_nghiep` / `cong_dong`).

Hướng đó **phân mảnh** surface + ops:

- User phải hiểu “đây là nghề hay keyword hay môn?” trước khi gắn tag.
- Guest home kéo nghề + ngành + **toàn bộ trường** (`listTruongDaiHoc`) rồi cắt 6 — nặng, lệch MXH/shop.
- Nuôi kênh đại học = seed trang, ngành, môn, cấu hình điểm, tuyển sinh — trường ĐH **không cần** CINs (họ đã có cổng + fanpage).
- Muốn ra ngoài VN: nghề/ngành/môn VN không portable; **CSĐT và studio thì nước nào cũng có**.

Hướng mới (user 2026-08-15): **MXH + shop là trục**. Bài viết → **tag nói chung**. Org product = **Cơ sở đào tạo** + **Studio**. Đại học bó trong nước, không nuôi kênh.

Plan này **đồng ý hướng**, nhưng **không gộp mù** mọi `loai_bai_viet` thành một giá trị enum, và **không xóa** `cong_dong` / dữ liệu trường trong cùng một nhát.

---

## 2. Chốt đề xuất (chờ user xác nhận)

### 2.1 Sản phẩm

| Trục | Giữ / đầu tư | Đóng băng | Không đụng phase này |
|---|---|---|---|
| MXH | Journey, follow, chat, World, Gallery | — | — |
| Shop | Catalog, đơn P2P, Kho, Phân loại (fandom) | — | — |
| Org | `co_so_dao_tao` · `studio` (`doanh_nghiep` đã ẩn → studio) | `truong_dai_hoc` (VN, read-only dần) | Schema trường, URL cũ |
| Tag | Một entity page, một ô gắn tag | Hub thư viện `/careers` `/majors` `/articles?loai=` | DROP enum |
| Cộng đồng | **Giữ** như MXH scoped (xem §2.5 · P1) | Không seed thêm nếu chưa có cohort | Xóa `cong_dong` |

### 2.2 Tag = một thứ; loại cũ = nhãn phụ (không phải thư viện)

`article_bai_viet` **đã là** bảng tag. Phân mảnh nằm ở **hub + route + filter loại**, không ở việc “thiếu bảng tag”.

**Mô hình đích (UX):**

- User gõ một ô → tạo/chọn tag. Mặc định `loai_bai_viet = keyword`.
- Trang entity **một skin** (lens 3 tab đã có: Nội dung tùy chọn / Đóng góp / Thảo luận). Canonical prose **vẫn tùy chọn** (FOUNDATIONS §2).
- Route đích dài hạn: **`/keyword/[slug]`** (đã là generic). Các `/careers` `/software` `/fandom` `/majors` `/articles` → 308 dần về `/keyword/[slug]` **sau khi** UI một skin chạy.
- Loại cũ **không xóa cột** — giữ `loai_bai_viet` làm *facet nội bộ* khi còn cần:

| Loại hiện tại | Vai trò sau gom | Ghi chú |
|---|---|---|
| `keyword` | **Tag mặc định** | Đích gom |
| `fandom` | Facet shop «Phân loại» | Giữ enum + `/fandom` đến khi Kho hết phụ thuộc route riêng (DECISIONS 2026-08-10/12) |
| `phan_mem` | Tag + meta JSONB (nhà PH, platform) | Không cần hub `/software`; meta giữ |
| `nghe` | Tag + **danh tính nghề** (onboarding, verify moc `lam_viec`, bản đồ `giai_doan`) | **Không** flatten thành keyword thuần — mất nghề = mất moat verify |
| `nganh_dao_tao` | Neo chương trình trường VN | Đóng băng cùng đại học; không creatable; không hub `/majors` trên nav |
| `mon_hoc` | Neo L31 `org_truong_nganh_mon` | Đóng băng; **gỡ khỏi `CREATABLE_TAG_LOAI`** để user khỏi tạo môn như tag tự do |
| `linh_vuc` | Bảng danh mục 11 lĩnh vực | Giữ để nhóm nghề / filter; **không** hub thư viện |
| `blog` / `event` | Không phải tag | Ngoài scope gom |

`article_de_xuat` chỉ còn cho `nghe` / `nganh_dao_tao` (FOUNDATIONS quy tắc 7). Sau chốt: **ngành** không nhận đề xuất mới; nghề giữ cổng nếu vẫn dùng làm danh tính.

O6 (phân nhóm keyword/phan_mem theo nghề) — **đóng / không làm**. Gom tag xong thì O6 là thư viện 2.0.

### 2.3 Org: 2 loại product quốc tế + đại học VN đóng băng

**Đầu tư:**

1. **`co_so_dao_tao`** — khóa / lớp / giáo trình / học viên / LMS mỏng (L34 Plan 1). Portable: academy mọi nước.
2. **`studio`** — Journey org, dự án, tác phẩm, shop gắn người/org. Portable: studio / brand / xưởng.

**Đóng băng `truong_dai_hoc` (không DROP):**

- Không tính năng mới (tuyển sinh, điểm, seed trường, L23 inline admin…).
- Không đề xuất trường mới trên UI user.
- Không module trường / ngành / nghề-thư viện trên guest home.
- URL `/university/[slug]` + dữ liệu `org_truong_*` / `edu_*` **giữ** — trang đã có vẫn đọc được (VN).
- Admin `/admin/nganh` `/admin/mon-thi` `/admin/edu` = bảo trì, không seed hàng loạt.
- Match org theo ngành (L21) vốn chỉ chạy với trường — CSĐT/studio vẫn bạn chung + tỉnh + persona (FOUNDATIONS đã ghi).

**Không gộp trường thành CSĐT.** Khác model: trường = ngành + điểm + tuyển sinh; CSĐT = khóa/lớp/học phí. Gộp schema = nợ lớn, không giúp MXH/shop.

### 2.4 Phân bổ lệch: người toàn cục · trường ĐH chỉ VN

User (2026-08-15): *bài user nước khác được lên Journey VN; trường ĐH VN không phân bổ ra thế giới.*

**Đúng luật.** Khớp L18 (bài *người*) + L21 (org siết hơn user) + đóng băng đại học. Không cần i18n / cột `quoc_gia` để hiểu nguyên tắc.

| Nguồn | Lên Journey / World VN | Lên “thế giới” (viewer ngoài VN, hoặc pool chung khi chưa có locale) |
|---|---|---|
| Cột mốc **user** (mọi nước) | Có — theo L18 (`feature` mọi người; `public` follow/bạn) | Có — cùng một pool người |
| `org_bai_dang` **studio / CSĐT** | Có — L21 (đủ follow = đầy đủ; chưa follow = gợi ý / chèn tỉ lệ) | Có — đây là 2 loại org portable |
| `org_bai_dang` **`truong_dai_hoc`** | Hữu cơ: chỉ viewer VN (hoặc surface VN: guest home, `/university`) | **Không** — không Khám phá, không Gallery World, không `goi_y_theo_doi`, không L21 #3 |
| User VN đăng đồ án / “học tại ĐH X” | Có — đó là bài *người* + attribution (L21 #2) | Có — không phải kênh trường |

**Follow ≠ phân bổ.** Ai (kể cả ngoài VN) chủ động theo dõi một trường vẫn thấy bài trong tab **Đang theo dõi**. Cấm là *discovery hữu cơ*, không cắt subscription.

**Hiện trạng code (lệch luật này):**

- Một World pool, **không** có `quoc_gia` trên user. `tinh_thanh` chỉ gắn org.
- `fetchWorldJourneyOrgBaiDangMilestones` lấy **mọi** `org_bai_dang` `da_dang` — không lọc `loai_to_chuc` → trường đã vào feed giữa của mọi người.
- Gallery World: `fetchOrgBaiDangVisualRows` gồm `truong_dai_hoc` + `co_so_dao_tao`.
- Gợi ý org: persona `hoc`/`day` ưu tiên trường.

**Cách làm, không đợi locale:**

1. **Bây giờ (một pool):** loại `truong_dai_hoc` khỏi Khám phá / Gallery World / gợi ý / chèn L21 #3. Giữ tab theo dõi + trang `/university` + (nếu P3/P5 giữ) module guest VN.
2. **Khi có locale viewer** (site, IP, hoặc cột sau này — **không** ALTER trong phase này): nới lại hữu cơ trường **chỉ** cho viewer VN. User nước khác vẫn chảy vào pool người VN.

**Không** áp hàng rào này cho CSĐT/studio. **Không** chặn bài user vì họ “thuộc” trường.

Rủi ro ngược: Journey VN đầy bài ngoại ngữ. Chấp nhận ở phase MXH; L18 đã siết `public`. Lọc ngôn ngữ / locale feed = brief khác, không lẫn pivot tag/org.

### 2.5 Cộng đồng — không gộp vào “chỉ 2 org”

User nói “org chỉ giữ 2 dạng”. **Push-back:** `cong_dong` là bề mặt **MXH** (feed scoped, flair, chế độ phòng L27), tồn tại mọi nước, không phải thư viện ngành, không phải kênh đại học.

Đề xuất mặc định: **giữ `cong_dong`**, không nuôi thêm nếu chưa có cohort; không xóa create `/community`. Chốt ở §8.1.

---

## 3. Database

**Phase 1–3: không migration.** Không `ALTER` cột cũ (DEV_RULES + L34). Không `DROP VALUE` enum Postgres (không hỗ trợ an toàn).

Giữ nguyên:

- `loai_bai_viet_enum` đủ 9 value
- `loai_to_chuc_enum` đủ 5 value
- `org_truong_dai_hoc`, `org_truong_nganh`, `org_truong_nganh_mon`, `org_cau_hinh_*`, `edu_*`
- `article_nhom` / `article_gan_nhom` / `article_lien_quan`
- `shop_nhom_fandom`
- Cột `da_verify` trên bài (đã không dùng UI, 2026-08-12)

**Phase 4 (tùy chọn, sau khi UX ổn, user xác nhận từng ALTER):**

- Có thể thêm `article_bai_viet.an_hub boolean` hoặc flag tương đương — **chỉ nếu** cần ẩn khỏi search/hub mà không đổi enum. Ưu tiên ẩn bằng query (`loai` not in …) trước khi ALTER.
- **Không** backfill `nghe` → `keyword` (mất `id_linh_vuc` bắt buộc + verify nghề).
- **Không** backfill `nganh_dao_tao` / `mon_hoc` → `keyword` khi L31 còn sống.

RLS: không đổi. Tag vẫn public read; org create vẫn membership.

---

## 4. API

Không endpoint mới ở phase đóng băng. Chỉ **thu hẹp hành vi**:

| Khu | Việc | Không làm |
|---|---|---|
| Tạo org | User chỉ thấy CSĐT + Studio (+ Cộng đồng nếu §8.1 = giữ) | Xóa route `/api/.../truong` |
| `article_de_xuat` | Từ chối `nganh_dao_tao` mới | Xóa bảng đề xuất |
| `createTag` | Bỏ `mon_hoc` khỏi `CREATABLE_TAG_LOAI`; `nganh_dao_tao` vốn không creatable | Đổi `PICKABLE_TAG_LOAI` (vẫn pick được tag cũ trên bài đã gắn) |
| Tag suggest | Một bucket UI; `loai` chỉ tie-break / icon nhỏ | Xóa filter SQL theo loại (cần để không gợi môn/ngành nếu muốn — flag query) |
| Admin tag | List + merge alias như hiện tại | Verify (đã gỡ) |
| Trường | API public GET giữ | POST/PATCH tính năng mới |

Lỗi: đề xuất ngành / tạo trường từ UI user → 403 + copy “CINs không mở kênh đại học mới”.

---

## 5. Frontend

### 5.1 Ẩn thư viện (phase 1 — nav / home / create)

- Guest home (`loadGuestHomeData`): **bỏ** khối trường + ngành + (tuỳ chốt) nghề-hub. Giữ sự kiện, khóa CSĐT, tác phẩm. Đây cũng cắt query nặng `listTruongDaiHoc()`.
- Nav / explore: bỏ lối `/careers` `/majors` `/articles` như thư viện. `/find-courses` giữ nếu trỏ **khóa CSĐT**, không trỏ ngành ĐH.
- `/organizations`: listing CSĐT + Studio; trường không nổi bật (hoặc tab “Đại học VN” thu nhỏ).
- Tạo org: chỉ academy + studio (+ community).

### 5.2 Một ô tag (phase 2)

- Composer / Journey / shop Kho: một `TagInput`, không bắt chọn loại trước.
- Tạo mới → `keyword` (trừ ngữ cảnh Kho «Phân loại» → `fandom` như hiện tại).
- Entity page: skin `keyword` cho mọi loại pickable; badge loại nhỏ hoặc bỏ.
- Follow tag / Gallery theo tag: không đổi model (`loai_theo_doi`).

### 5.3 Redirect (phase 3)

`articlePublicHref` dần về `/keyword/[slug]` + 308 từ `/careers` `/software` `/articles` `/majors` `/guidance/*`. `/fandom` sau cùng (Kho còn link). `/university/*` **không** 308 — đóng băng, không chuyển thành academy.

### 5.4 Không đụng

Shop taxonomy S1–S4, watermark, đơn P2P, chat, CSĐT L34 Plan 1, verify người/org.

---

## 6. Implementation — thứ tự

Chỉ làm sau khi user chốt §2 + §8. **Một phase / một brief.**

### Bước 1 — Đóng băng product (nav + home + create)

- Ẩn hub thư viện + module trường/ngành trên home.
- Siết create org / đề xuất ngành.
- Gỡ `mon_hoc` khỏi creatable.
- Copy: CINs cho người sáng tạo, studio, cơ sở đào tạo — không phải cổng đại học.

**Verify:** guest home không gọi `listTruongDaiHoc`; URL cũ trường/ngành/nghề vẫn 200.

### Bước 2 — Tag UX một ô

- Suggest + create mặc định `keyword`.
- Entity skin thống nhất.
- Admin merge giữ.

**Verify:** gắn tag bài Journey không hiện picker loại; fandom ở Kho vẫn sheet riêng.

### Bước 3 — 308 hub cũ

- `articlePublicHref` + redirect page.
- Sitemap / canonical.

**Verify:** `/careers/[slug]` → 308 `/keyword/[slug]` (nếu chốt gộp route nghề); SEO không 404.

### Bước 4 — Docs luật (cùng hoặc ngay sau Bước 1 khi user nói “cập nhật docs”)

- FOUNDATIONS §1 (bỏ nhấn thư viện ngành / mở rộng domain kiểu bách khoa); §O (2 loại đầu tư + trường đóng băng); quy tắc 24–25 (entity = tag lens, không hub loại).
- DECISIONS: LOG pivot + đóng O6; OPEN còn lại ở §8.
- `CINS_INSTRUCTION.md` neo số liệu org.
- **Không** xóa `cursor_map_truong.md` — đánh dấu “đóng băng / bảo trì VN”.

### Ngoài scope (cấm lẫn brief)

- Gộp `truong` → `co_so_dao_tao`
- Stripe / cầm tiền
- i18n / SEA payout (thread khác)
- WebRTC CSĐT, vé sự kiện, review sao
- DROP bảng `edu_*` / `org_truong_*`

---

## 7. Edge cases

| Tình huống | Xử lý |
|---|---|
| Bài đã gắn `mon_hoc` / `nganh` | Giữ junction; tag vẫn hiện; không creatable thêm |
| User cũ follow `/careers/x` | Follow theo `id` bài, không theo URL — 308 không gãy |
| Slug trùng khi gom route (`vtuber` vs fandom — đã có tiền lệ 2026-08-10) | Không merge slug tự động; admin merge tay |
| Trường đã seed / partner | Trang sống, không disclaimer mới; không bán “kênh trường” |
| Admin CINs L23 chỉ mở khoá trường | Giữ — ít đụng CSĐT/studio (đúng hướng) |
| `id_linh_vuc` bắt buộc với `nghe` | Giữ khi còn loại `nghe`; keyword không bắt buộc |
| Shop `shop_nhom_fandom` | Không đụng; fandom không thành keyword |
| Concurrent tạo tag trùng tên khác loại | Dedup **trong cùng loại** như hiện tại; không gộp xuyên loại tự động |
| Guest gõ `/majors` | Phase 1: trang còn; phase 3: 308 hoặc trang “đã chuyển sang tag” |

---

## 8. Câu treo — cần user chốt trước khi build

| # | Câu hỏi | Đề xuất plan | Điều kiện đóng |
|---|---|---|---|
| **P1** | Giữ `cong_dong` như loại org MXH? | **Giữ** (không nuôi nếu chưa có cohort) | User nói giữ / ẩn create / sunset |
| **P2** | Hub `/careers` + loại `nghe`: 308 về `/keyword` hay giữ route nghề vì danh tính? | **Giữ `loai=nghe` + ẩn hub**; route `/careers/[slug]` sống đến khi verify nghề không phụ thuộc URL | User chốt ẩn-hub vs 308 |
| **P3** | Guest home: bỏ luôn khối nghề (8 card) hay giữ như “tag nổi”? | **Bỏ** — home = Journey/shop/CSĐT | User chốt |
| **P4** | `/find-courses` còn trỏ `/majors`? | Đổi sang khóa CSĐT only; bỏ hàng ngành ĐH | User chốt |
| **P5** | Trường đã public: noindex hay để SEO VN? | **Index giữ** (đã có URL); không noindex hàng loạt | User chốt nếu muốn “biến mất Google” |
| **P6** | Trường ĐH có được hữu cơ trên World của *user VN* không, hay chỉ follow + trang trường? | **Một pool hiện tại: loại khỏi World hữu cơ cho mọi viewer** (kể cả VN). Khi có locale: nới lại cho viewer VN. Follow luôn giữ. | User chốt “cắt hết World” vs “còn World cho người VN” |

Security: không đổi RLS. Ẩn UI ≠ xóa quyền service_role. Không public thêm field trường.

---

## 9. Hệ quả docs (sau khi user chốt, hỏi lại “cập nhật chứ?”)

| File | Việc |
|---|---|
| `CINS_FOUNDATIONS.md` §1 §2 §O quy tắc 7/24/25 | Pivot MXH+shop; org 2 loại đầu tư; tag một lens |
| `CINS_DECISIONS.md` OPEN + LOG | Đóng O6; thêm P1–P5 → LOG khi chốt |
| `CINS_INSTRUCTION.md` | Neo org; dòng “thay đổi lớn” |
| `CINS_IMPLEMENTATION.md` | Ghi hub đóng băng + `CREATABLE_TAG_LOAI` |
| `cursor_map_truong.md` | Banner đóng băng |

---

## 10. Tóm tắt một câu

**Đúng hướng:** ngừng làm thư viện ngành, để tag là tag, org quốc tế = CSĐT + Studio, đại học VN đóng băng. **Sai nếu:** gộp enum/`nghe`/xóa trường/`cong_dong` trong một PR. Làm theo Bước 1 (ẩn) → 2 (một ô tag) → 3 (308) → docs.
