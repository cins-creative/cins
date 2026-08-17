# PLAN: Tag ngầm + gỡ thư viện nghề

> **Phase 1 — planning only.** Không code trong phase này.
> Ngày: 2026-08-16
> Bối cảnh: đã gộp `phan_mem` → `keyword`; UI lọc loại thẻ còn lộ taxonomy. User muốn **một túi tên**, loại chỉ là **dấu đóng hệ thống theo ngữ cảnh tạo**, bỏ hub «Khám phá nghề», tập trung MXH · Shop · CSĐT.

---

## Thesis

CINs không còn là thư viện entity (nghề / khái niệm / phần mềm xếp ngăn). User chỉ thấy **tên** và **bao nhiêu người gắn**. `loai_bai_viet` vẫn sống trong DB — nhưng **không hiện, không chọn, không chia nhóm lĩnh vực trên picker**.

Ba tầng FOUNDATIONS cũ: Journey · Entity lens · Canonical. Pivot này **thu hẹp Canonical + hub thư viện**; **giữ Journey (MXH)** và **giữ entity như lens vận hành** (shop fandom, môn đồ án, thẻ trên bài) — không giữ encyclopedia nghề.

---

## Ba object không được lẫn

| Object | Lưu ở đâu | User thấy | Khi nào mint `article_bai_viet` |
|---|---|---|---|
| **Thẻ gắn bài** | `article_gan_tac_pham` / `article_gan_cot_moc` → `article_bai_viet` | Tên + số người | Compose editor → luôn `keyword` |
| **Nhãn vai trò cộng sự** | `content_tac_pham_tac_gia.vai_tro` **TEXT** (đã có; nhiều vị trí nối `\n`) | Chuỗi tự do: «Vợ», «người chụp» | **Không mint.** Picker gợi ý tên có sẵn, thêm mới chỉ ghi chuỗi |
| **Entity vận hành** | cùng bảng `article_bai_viet`, `loai` đóng theo chỗ tạo | Tên trong UI chỗ đó (Phân loại / Môn…) | Shop → `fandom`. Trường/CSĐT thêm môn → `mon_hoc`. Chương trình ngành → `nganh_dao_tao` |

**Push back (quan trọng):** «Thêm vai trò mới: Vợ → auto nghề nghiệp» **không nên** tạo hàng `loai=nghe`. Lý do:

1. `vai_tro` **đã là text tự do** — `CoAuthorPositionPicker.onAddCustom` không gọi `POST /api/tag`.
2. `chk_nghe_phai_co_linh_vuc` bắt `id_linh_vuc` NOT NULL — «Vợ» không thuộc Game/Phim/Hoạt hình.
3. Mint nghề từ vai trò sẽ nhồi `/careers` (330 bài `nghe`) bằng nhãn xã hội — đúng cái thư viện đang muốn bỏ.
4. «Phân loại ngầm» = **chỗ tạo đóng loại**, không = **mọi chuỗi gõ đều thành entity**.

Gợi ý nghề trong dropdown vẫn được (autocomplete từ `nghe` đã published) — **bỏ chip lĩnh vực** (`ed-coauthor-role-option-lv`, `formatNgheRoleLabel` prefix `Hoạt hình - …`). Chọn «Director» lưu `"Director"`, không `"Hoạt hình - Director"`.

---

## Database

**Không ALTER trong bước UI.** Enum `loai_bai_viet_enum` giữ: `keyword` · `phan_mem` (0 hàng) · `mon_hoc` · `nghe` · `nganh_dao_tao` · `fandom` · …

- Tables chạm (đọc/ghi, không đổi schema):
  - `article_bai_viet` (`loai_bai_viet`, `tieu_de`, `slug`, `id_linh_vuc`)
  - `article_gan_tac_pham` / `article_gan_cot_moc` / `article_alias`
  - `content_tac_pham_tac_gia.vai_tro` (text)
  - `org_truong_nganh_mon` (môn chương trình)
  - `shop_nhom_fandom` (facet shop)
- Indexes: giữ `article_bai_viet_slug_key` (unique toàn cục) — dedup tên vẫn qua alias/exact match.
- RLS: không đổi. Tạo tag vẫn qua service role + session user như `POST /api/tag`.

**Không làm (trừ khi user chốt sau):**

- `ALTER TYPE … RENAME VALUE keyword → the` (phá toàn bộ code).
- `DROP VALUE phan_mem` (Postgres khó gỡ enum).
- Gỡ `chk_nghe_phai_co_linh_vuc` — chỉ cần nếu quyết định mint `nghe` không lĩnh vực (không khuyến nghị).
- Bảng mới cho vai trò — thừa, đã có TEXT.

---

## API

Hiện `POST /api/tag` nhận `loai` từ client, validate `CREATABLE_TAG_LOAI`.

| Endpoint | Thay đổi |
|---|---|
| `POST /api/tag` | Vẫn nhận `loai` (shop/trường đóng cứng). Editor **không** gửi menu loại — luôn `keyword`. Server: `keyword` \| `mon_hoc` \| `nghe` \| `fandom`. **Không** tạo `phan_mem`. Không tin UI «user chọn loại». |
| `GET` tag suggest index | Editor: **không** `loaiFilter`. Trả `tieu_de` + `so_nguoi_tagged` (đã có trên index). Không bắt buộc trả badge loại cho UI compose. Shop sheet vẫn lọc `fandom`. Trường picker vẫn `mon_hoc`. |
| `loadCoAuthorNgheRoleOptions` | Optional: vẫn load `nghe` để gợi ý. **Bỏ** `linhVucTen` trên option / không format `LV - role`. Custom add **không** INSERT bài viết. |
| `/api/careers/role-preview` | Tooltip vai trò: giữ hoặc suy từ text; không phụ thuộc hub `/careers`. |
| Hub `/careers` listing | Gỡ nav; 308 hub → `/` (hoặc `/organizations`) — **chốt với user**. Chi tiết `/careers/[slug]` có thể 308 → `/keyword/[slug]` **chỉ khi** đã đổi `loai` (hiện `nghe` ≠ `keyword`). |

Validation tạo tag: tên trim, max 120, dedup exact alias — giữ.

---

## Frontend

### EditorTagMenu + TagInput (compose / gắn thẻ bài)

- **Xóa** `div.tag-input-filters` (Tất cả / Thẻ / Môn học / …).
- **Xóa** bước «tạo loại nào» (`CREATE_TAG_LOAI_LABEL` picker).
- Query rỗng: **list** index (sort `so_nguoi_tagged` desc), không empty «Gõ để tìm…».
- Mỗi dòng: **tên + số người** (`so_nguoi_tagged`). Không badge loại, không lĩnh vực.
- Gõ: search xuyên loại (index đã mix). Exact trùng → pick, không tạo trùng.
- Tạo mới: `POST { ten, loai: "keyword" }` im lặng.

Shop `FandomTaxSelect` và `TruongNganhMonChuongTrinh` **giữ list theo ngữ cảnh** (đã đóng `fandom` / `mon_hoc`). Không đưa chip loại vào editor.

### CoAuthorRoleInput

- Ẩn `span.ed-coauthor-role-option-lv`.
- Label option = `roleShort` / `tieuDe`, không `formatNgheRoleLabel(lv, …)`.
- `onAddCustom` giữ: chỉ `addPosition(label)` — chuỗi.
- Placeholder: «Vai trò trên tác phẩm» (không «Tìm vị trí công việc»).

### Nav / thư viện

- `lib/cins/mainNav.ts`: gỡ item `career` («Khám phá nghề»).
- Promo home / World Journey `kind: "careers"`: ẩn.
- `/careers` page: 308 (chốt đích). Không xóa file route trong cùng PR với menu — tách bước.
- `/majors` (ngành): **không** nằm sidebar hiện tại. Giữ cho trường cho đến khi user bảo gỡ thư viện ngành.

### Entity lens (không phải hub)

Click thẻ trên bài → trang aggregation người + tác phẩm (`/keyword/[slug]`, `/fandom/[slug]`, môn…) **vẫn hợp lệ**: đó là lens Journey, không phải catalog «120+ vị trí». Không bắt buộc prose canonical.

---

## Implementation Steps

Làm theo phase. Mỗi phase một brief build.

1. **Compose menu (UI, 0 migration)**  
   Gỡ filter + create-loai. Empty = browse `tieu_de` + `so_nguoi_tagged`. Create cứng `keyword`. `TagInput` cùng pattern (Journey modal gắn thẻ).

2. **Vai trò tự do (UI)**  
   Gỡ chip lĩnh vực; lưu label trần. Không gọi `createTag` từ role picker. (Đã đúng về DB.)

3. **Nav: gỡ Khám phá nghề**  
   `MAIN_NAV_ITEMS` + tip/promo. 308 `GET /careers` → `/`. Giữ `/careers/[slug]` tạm (deep link / SEO) cho đến bước 5.

4. **Khóa ngữ cảnh tạo (đã gần xong)**  
   Audit: shop chỉ `fandom`; trường chỉ `mon_hoc`; editor chỉ `keyword`. Không mở create `nghe` từ compose.

5. **Thư viện nghề (sau khi chốt Q2–Q3)**  
   308 hoặc `noindex` hub; quyết định trang chi tiết `nghe`. Studio job picker / `org_tuyen_dung.id_nghe` giữ FK — không phụ thuộc hub.

6. **Docs** (khi user xác nhận)  
   FOUNDATIONS §1 (ba tầng) + quy tắc tag; DECISIONS LOG; IMPLEMENTATION URL `/careers`.

---

## Edge Cases

- **Trùng tên khác loại** (Blender vừa keyword vừa môn): slug unique toàn cục nên đã là 2 hàng khác slug. Compose mix list sẽ hiện 2 dòng cùng chữ — chấp nhận, hoặc dedup hiển thị theo `normalize(tieu_de)` giữ hàng `so_nguoi_tagged` cao hơn (cần chốt).
- **Index 2500** + list lúc mở menu: scroll trong menu 300px; sort người gắn. Không fetch full table mỗi keystroke (cache session v10+).
- **`loaiFilterFixed` đóng góp bài** (`related-fields.ts` còn ô «Phần mềm»): empty sau gộp `phan_mem`. Gỡ hoặc map sang keyword — ngoài compose menu.
- **Custom role «Vợ» vs nghe «Director»:** một cái text trên junction, một cái entity. Không gộp.
- **Nghề cũ 330 hàng + 114 merged:** không xóa. Chỉ không còn cửa vào catalog. Studio/CSĐT vẫn resolve `id_nghe` nếu có.
- **Cộng đồng `?linh_vuc=`** trỏ `/careers?linh_vuc=`: đổi sang `/community?linh_vuc=` (đã có hint trong `linh-vuc.ts`).
- **Concurrent tạo tag cùng tên:** giữ exact alias → `da_ton_tai`.
- **Client giả `loai`:** user đăng nhập vẫn có thể POST `fandom` từ ngoài shop. Chấp nhận (cùng creatable) hoặc sau này stamp theo referer — không P0.

---

## Security

- `POST /api/tag`: bắt buộc session (đã có 401).
- Không `select('*')`; index đã cột hẹp.
- Tên tag: trim, length cap, không HTML.
- `vai_tro` text: cap độ dài phía persist co-author (kiểm tra existing); không FK nên không injection schema.
- RLS article: tạo qua service role trong `createTag` — giữ; không mở insert anon.
- 308 `/careers`: không lộ PII.

---

## Câu hỏi chốt trước khi build

1. **Vai trò «Vợ»:** chỉ TEXT (khuyến nghị) hay vẫn mint `nghe`?  
2. **Hub `/careers`:** 308 → `/` hay → `/organizations`? Trang `/careers/[slug]` giữ lens ẩn hay 308 luôn?  
3. **List compose mix:** gồm cả `nghe` / `mon_hoc` / `nganh` / `fandom`, hay chỉ `keyword` + `fandom` (môn/ngành chỉ từ UI trường)? Mix đủ loại đúng «không rạch ròi» nhưng ồn (tên ngành cạnh tên thẻ).  
4. **`/majors`:** giữ cho trường hay coi là thư viện và gỡ sau?  
5. **Entity page khi click thẻ:** giữ tab Nội dung/Đóng góp/Thảo luận hay chỉ lưới người + bài (bỏ canonical)?

---

## Verify sau từng phase

- Mở `#` trên editor: không còn hàng chip loại; list tên + số người; tạo mới không hỏi loại.
- Shop «Tạo phân loại mới» vẫn ra `fandom`.
- Trường «Thêm môn» vẫn `mon_hoc`.
- «Thêm vai trò mới: Vợ» không tạo hàng `article_bai_viet`; không hiện «Hoạt hình».
- Sidebar không còn «Khám phá nghề».
