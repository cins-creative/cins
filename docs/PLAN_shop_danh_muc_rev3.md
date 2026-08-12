# PLAN — Danh mục hàng Rev 3: ranh giới, chất lượng map, và cơ chế seller đóng góp

> **Tiếp nối:** [`PLAN_shop_danh_muc_san_pham.md`](./PLAN_shop_danh_muc_san_pham.md) (Rev 2 — kiến trúc 2 tầng + facet, bước 1–6 xong, bước 7 admin còn lại).
> **Rev 3 không đổi kiến trúc.** Hai tầng canonical/nhãn shop và hệ facet tổng quát giữ nguyên — đó vẫn là lựa chọn đúng. Rev 3 xử lý 4 thứ đang hỏng ở tầng trên: UI làm rơi ranh giới, vài ranh giới trong seed tự nó mong manh, soft-map chưa xác nhận chảy thẳng ra hub, và **chưa có đường cho seller đóng góp khi cây thiếu chỗ**.
> **Trạng thái:** §7 đã chốt 2026-08-12 — đang build.

---

## 1. Bốn vấn đề (đã verify trong code)

### 1.1 Dropdown làm rơi `mo_ta` — nghiêm trọng nhất, rẻ nhất để sửa

`shop_danh_muc.mo_ta` chứa toàn bộ ranh giới: *«có vòng/khoen treo → keychain»*, *«mô hình giấy → standee»*, *«bộ card nhiều tấm vẫn là card, không phải combo»*. Nó được seed đầy đủ trong `migration_shop_danh_muc.sql`, được `lib/shop/danh-muc.ts` map ra `moTa`, được `/api/shop/danh-muc` trả về, và `DanhMucOpt` trong `ShopKhoLoaiTaxonomy.tsx` khai báo `moTa: string | null`.

Rồi `danhMucOptions` map xuống `{ id, ten }`, và `DropdownOption` chỉ có hai field đó. **Ranh giới chết ở dòng cuối cùng.**

Seller nhìn 17 cái tên gần giống nhau trong khung ~380px, không một chỉ dẫn nào. Toàn bộ độ chính xác của taxonomy phụ thuộc vào việc seller chọn đúng, mà ta lại giấu đi đúng thứ giúp họ chọn đúng.

`shop-kho-loai-dd-option-copy` đã hỗ trợ dòng phụ `<em>` — option «Tạo «...»» đang dùng. Không cần CSS mới.

### 1.2 Cây phẳng 17 mục, không nhóm

§3c-bis của Rev 2 đã định sẵn 5 cấp cha nhưng `id_cha` để null nên UI không có gì để nhóm. Người dùng phải quét tuyến tính một danh sách dài toàn danh từ merch nghe giống nhau.

### 1.3 Ba ranh giới trong seed tự nó mong manh

| Ranh giới | Vấn đề |
|---|---|
| `charm-coaster` vs `keychain` — phân biệt bằng **có khoen treo** | Rõ ràng về logic, vô nghĩa về hành vi. Người mua tìm «charm Genshin» không phân biệt có khoen; seller bán charm thường kèm khoen. Ta bắt seller quyết một việc mỗi lần đăng hàng mà **không ai dùng kết quả để lọc**. Ngoài ra coaster (đế lót ly) và charm là hai công dụng khác hẳn nhau lại bị nhét chung. |
| `combo` là danh mục | **Mâu thuẫn với quyết định #2** (một loại = một danh mục, FK đơn). Set «card + standee» gắn `combo` thì biến mất khỏi cả filter `card` lẫn `standee`. §10 Rev 2 có nêu ca này rồi giải bằng «chọn 1 chính» — nhưng với combo thì không có «1 chính» nào đúng. Combo là **hình thức bán**, cắt ngang mọi danh mục → đúng định nghĩa facet. |
| `standee` vs `trung-bay` | Standee *là* đồ trưng bày. `trung-bay` = «hộp shaker, khung ảnh, kệ mica» — một giỏ tạp nham đứng cạnh một mục cụ thể hơn nó. «Kệ acrylic trưng bày standee» đoán đâu? |

### 1.4 Khoảng trống: đồ dùng hàng ngày in hình

Không có chỗ cho ốp điện thoại · mousepad/deskmat · ly & bình nước · quạt cầm tay · gương · chăn & gối. Đây là mảng lớn và đang tăng ở merch fes VN. Tất cả rơi vào `khac`, mà `listDanhMucTree({ forHubFilter: true })` lọc bỏ `khac` khỏi chip → **hàng đó vô hình với discovery**.

Tapestry / banner vải cũng lơ lửng: `artprint` định nghĩa «in khổ lớn không khung» nên có thể nhận, nhưng người mua không nghĩ tapestry là artprint.

> **Luật cần nhớ:** `khac` phình ra = tín hiệu **cây thiếu mục**, không phải seller lười. Cần dashboard đếm.

### 1.5 Soft-map chưa xác nhận đang được trình bày như sự thật

Bước 5b map 72/120 loại bằng alias với `danh_muc_xac_nhan=false`. Nhưng `lib/shop/cua-hang-listing.ts` chỉ đọc `id_danh_muc` → slug; **không nơi nào trong lib đọc `danh_muc_xac_nhan`** (chỉ `nhom.ts` và API PATCH dùng). Phỏng đoán của máy đang lên hub như dữ liệu đã xác nhận.

Với alias kiểu `('charm-coaster', 'charm')` + thuật toán trong `suggestDanhMucFromTen` (substring hai chiều, cộng điểm theo token), một loại tên «Charm móc khóa kim loại» khớp `charm` và có thể bị đẩy sai mục ngay từ đầu.

---

## 2. Phase A — Sửa UI (chỉ frontend, không đụng DB)

Rẻ nhất, giảm sai ngay, không cần user chốt gì thêm.

| # | Việc | File |
|---|---|---|
| A1 | `DropdownOption` thêm `moTa?: string \| null`; render thành `<em>` dưới `<strong>{ten}</strong>` | `ShopKhoLoaiTaxonomy.tsx` |
| A2 | `danhMucOptions` truyền `moTa` xuống (đã có sẵn trong `tax.danhMuc`) | `ShopKhoLoaiTaxonomy.tsx` |
| A3 | Search khớp cả `moTa`, không chỉ `ten` — gõ «khoen» ra `keychain` | `filtered` trong `TaxSelectDropdown` |
| A4 | Gom nhóm theo `idCha`; **degrade về danh sách phẳng khi `idCha` null** → Phase B seed cấp cha là grouping tự sáng, không phải sửa code lần hai | `TaxSelectDropdown` |
| A5 | Gợi ý alias (`shop-kho-loai-tax-suggest-list`) hiện kèm `moTa` + lý do khớp | `ShopKhoLoaiTaxonomy.tsx` |
| A6 | Sheet cao 382px với 17 mục → tăng `max-height`, ghim ô search sticky | `shop-dashboard.css` |

**Không** làm ở Phase A: đổi seed, đổi schema, đụng hub.

**Verify:** mở `/ban-hang/kho`, một loại chưa map → thấy mô tả ranh giới dưới mỗi mục; gõ «khoen» ra `keychain`; gõ «combo» ra `combo` kèm dòng «Set trộn nhiều danh mục».

---

## 3. Phase B — Sửa taxonomy (đổi seed + migration nhẹ)

Cần user chốt §7 trước. Mọi thay đổi ở đây động vào **slug**, mà slug là bề mặt SEO vĩnh viễn — làm một lần cho đúng, trước khi có landing `/cua-hang/[danhMucSlug]` (Phase 3 Rev 2).

### B1. Seed 5 cấp cha theo §3c-bis

Tạo 5 row cha + set `id_cha` cho các lá. Slug lá **không đổi** (đúng luật §3c).

| Cha | slug | Gom |
|---|---|---|
| Giấy & in ấn | `giay-in-an` | `artprint` · `sticker` · `card` · `fanbook` · `van-phong-pham` |
| Charm & phụ kiện đeo | `charm-phu-kien` | `charm-coaster`* · `keychain` · `pin-badge` · `omamori` |
| Trưng bày | `trung-bay-nhom` | `standee` · `trung-bay` |
| Búp bê & mô hình | `bup-be-mo-hinh` | `plush` · `figure` |
| Mặc & mang theo | `mac-mang-theo` | `apparel` · `tui` |

⚠️ **Guard bắt buộc:** hub hiện render **mọi** row `hien` thành chip (`listDanhMucTree({ forHubFilter: true })` chỉ lọc `khac`). Thêm 5 cha → 5 chip rỗng. Phải lọc chip về **node lá** (`id_cha IS NOT NULL` hoặc lá không con). Cha chỉ dùng để gom nhóm dropdown + roll-up số đếm.

### B2. `combo` → facet `hinh-thuc-ban`

Facet mới, `kieu = chon_mot`, `seller_de_xuat_duoc = false`, `hien_o_hub = true`, giá trị: `le` · `combo-giftset` · `pre-order`.

Migration dữ liệu: mọi `shop_nhom` đang trỏ `combo` → gán giá trị facet `combo-giftset`, đặt `id_danh_muc = null` + `danh_muc_xac_nhan = false` để seller chọn lại danh mục thật. Danh mục `combo` chuyển `trang_thai = 'an'` (không hard delete — giữ URL).

**Lợi:** set «card + standee» giờ nằm ở `card` (danh mục chính) + facet `combo-giftset` → người lọc card **thấy nó**, người muốn lọc riêng combo cũng lọc được.

### B3. Chốt lại `charm-coaster` / `keychain`

Ba phương án, xem §7 Q2.

### B4. Mục mới cho khoảng trống

| slug đề xuất | Tên | Ranh giới |
|---|---|---|
| `do-dung-in-hinh` | Đồ dùng in hình | Ốp điện thoại, mousepad/deskmat, ly & bình, quạt, gương, chăn gối. Công dụng là **đồ dùng**, hình in chỉ là trang trí. |
| `tapestry` | Tapestry & banner vải | Treo tường bằng vải. Giấy → `artprint`. |

Kiểm slug không đụng danh sách cha dự kiến (§3c-bis) và các ngành tương lai (`trang-suc`, `quan-ao`, `art-supply`, `dich-vu`).

### B5. Làm sắc `trung-bay`

Đổi tên hiển thị thành «Phụ kiện trưng bày» và ghi rõ trong `mo_ta`: *«Vật đựng/đỡ để trưng bày món khác (hộp shaker, khung, kệ). Bản thân món được trưng bày → danh mục của nó.»*

### B6. Rà lại alias sau mọi thay đổi trên

`uq_shop_danh_muc_alias_tu_khoa` là UNIQUE **toàn cục** → alias `charm` chỉ thuộc được một mục. Mọi gộp/tách phải rà lại bảng alias, không chỉ bảng danh mục.

---

## 4. Phase C — Chất lượng dữ liệu soft-map

| # | Việc |
|---|---|
| C1 | Script audit: xuất 72 loại đã soft-map kèm `nhan` + danh mục đoán + alias đã khớp, để review thủ công. Đo tỉ lệ sai thật, đừng đoán. |
| C2 | Chốt luật hub cho `danh_muc_xac_nhan=false` (§7 Q4) |
| C3 | Nếu chọn «chỉ hiện khi confirm»: `cua-hang-listing.ts` đọc thêm cột và bỏ qua bản chưa confirm khi filter; vẫn hiện ở «Tất cả» |
| C4 | Nhắc seller: badge trên loại chưa confirm trong Kho + đếm số trên dashboard shop |

Ưu tiên C1 trước C2 — quyết định phụ thuộc số liệu.

---

## 5. Phase D — Cơ chế seller đóng góp mà không vỡ cây

### 5.1 Vì sao không thể copy mô hình của facet value

Facet value dùng mô hình C (`de_xuat` → `hien` → `an`) và nó đúng cho facet. **Áp thẳng cho danh mục thì sai**, vì danh mục gánh ba thứ mà facet value không gánh:

1. **FK đơn** — mỗi loại chỉ một danh mục. Nếu seller tạo được row `de_xuat` và gán vào đó, khi admin quyết «thật ra là keychain» thì phải migrate FK cho mọi loại đã trỏ vào.
2. **Slug là bề mặt SEO vĩnh viễn** — không hard delete (giữ URL). Cho seller sinh slug = tích nợ slug rác vĩnh viễn trên tài sản CINs sở hữu.
3. **Roll-up số đếm** — chip filter và landing page tính theo cây. Một nhánh do seller tạo làm lệch số đếm.

Và điểm quyết định: **một danh mục `de_xuat` không lên chip filter thì về hành vi giống hệt `khac`.** Nó không cho seller thêm gì cả, chỉ thêm chi phí. Vậy tạo row là vô nghĩa.

→ **Nguyên tắc Rev 3: seller không tạo danh mục, seller báo thiếu chỗ.** Request rẻ hơn row, và mang nhiều thông tin hơn (mô tả + link tới sản phẩm thật để admin nhìn).

### 5.2 Ba nhu cầu trông giống nhau nhưng khác tầng

Khi seller đứng trước dropdown và thấy «không có mục nào đúng», thật ra họ đang gặp một trong ba việc — và chỉ **một** cần admin tạo row:

| Nhu cầu thật | Tín hiệu | Tầng đúng | Ai xử lý |
|---|---|---|---|
| «Tên tôi gõ không ra gợi ý» | Mục đúng **có tồn tại**, alias không khớp | `shop_danh_muc_alias` | **Tự học** (D1) — không ai duyệt |
| «Tôi muốn chi tiết hơn: Standee mini, Standee 15cm» | Muốn phân loại trưng bày riêng trong shop | `shop_nhom.nhan` (đã tự do) hoặc `shop_bien_the` | Không cần gì — chỉ cần UI giải thích |
| «Món này thật sự không thuộc mục nào» | Ốp điện thoại, mousepad | Cây thiếu mục | **Request → admin tạo** (D2) |

Đa số là loại 1. Nếu chỉ làm D2 mà không làm D1, admin sẽ ngập trong request mà 80% chỉ là thiếu alias.

### 5.3 D1 — Alias tự học (không có UI, không cần duyệt)

Cơ chế: khi seller **bỏ qua gợi ý và chọn tay** một danh mục khác, ghi `(normalize(nhan) → id_danh_muc, id_shop)` vào bảng ứng viên. Không ảnh hưởng gì cho tới khi **≥3 shop khác nhau** cùng ánh xạ một từ khóa vào cùng một danh mục → vào hàng chờ admin bấm một nút (hoặc auto-promote, xem §7 Q5).

Bảng `shop_danh_muc_alias_ung_vien`: `id` · `tu_khoa` (normalize) · `id_danh_muc` · `id_shop` · `id_nhom` · `tao_luc` · UNIQUE(`tu_khoa`, `id_danh_muc`, `id_shop`).

Vì sao cơ chế này tốt: **đóng góp miễn phí** — cây tốt lên mà seller không phải làm thêm việc gì, và **không có bề mặt để spam** vì seller không biết nó tồn tại.

Guard:
- Chỉ lấy token ≥3 ký tự, bỏ stopword; **không** lấy nguyên `nhan` 40 ký tự.
- Trừ token trùng tên fandom/nhân vật (tra `shop_thuoc_tinh_gia_tri` + alias facet) — «Harumasa» không được thành alias danh mục.
- Trước khi promote phải kiểm `uq_shop_danh_muc_alias_tu_khoa` (UNIQUE toàn cục): nếu từ khóa đã thuộc mục khác → **xung đột, đẩy cho admin quyết**, đừng ghi đè.

### 5.4 D2 — «Báo thiếu danh mục» (request, không phải row)

**UI:** cuối dropdown, chỉ hiện **sau khi search không khớp** — không phải nút thường trực. Nội dung form:

1. Tên loại hàng (prefill từ `nhan`)
2. «Nó là cái gì / dùng để làm gì» — bắt buộc ≥20 ký tự
3. Chọn một: «Gần giống mục ___ nhưng khác ở ___» / «Không thuộc mục nào đang có»

**Hành vi ngay:** loại được gán `khac`, banner *«Đã ghi nhận. Hàng vẫn bán bình thường, chỉ chưa lên bộ lọc.»* — **không chặn bán**, đúng tinh thần quyết định #8 (soft).

**Không có gì lên hub.** Đây là lý do cơ chế này an toàn: không ai gửi request để được lên top, nên **không có động lực gaming**.

Bảng `shop_danh_muc_yeu_cau`: `id` · `id_shop` · `id_nhom` (link sản phẩm thật — admin phải nhìn được ảnh) · `tu_khoa_chuan` · `mo_ta` · `id_danh_muc_gan_nhat` (null nếu «không thuộc mục nào») · `cum` (cluster key để gom) · `trang_thai` (`moi` \| `gop_alias` \| `da_tao` \| `tu_choi`) · `id_danh_muc_ket_qua` · `ly_do_tu_choi` · `tao_luc`.

**Chống lạm dụng:** rate-limit 5 request/shop/ngày · chặn gửi khi `nhan` đã khớp alias mạnh (bắt đọc gợi ý trước) · mô tả tối thiểu 20 ký tự.

### 5.5 D3 — Hàng chờ admin (gộp vào bước 7 Rev 2)

Gom request theo cụm (normalize + fuzzy), sắp theo **số shop khác nhau** (không phải số request — một shop gửi 20 lần vẫn là 1 phiếu).

**Ngưỡng gợi ý tạo mục mới: ≥3 shop khác nhau *và* ≥8 loại hàng.** Cao hơn ngưỡng facet value (≥3 shop *hoặc* ≥10 loại) vì tạo danh mục đắt hơn nhiều: slug vĩnh viễn, chip mới, ảnh hưởng roll-up, phải viết `mo_ta` ranh giới.

Ba nút:

| Nút | Hành động |
|---|---|
| **Tạo danh mục mới** | Tạo row (admin tự đặt slug + `mo_ta` ranh giới) → backfill mọi loại trong cụm → thông báo các shop |
| **Đây là alias của mục X** | Tạo alias → remap loại đang `khac` → thông báo seller kèm giải thích ranh giới |
| **Từ chối** | Bắt buộc ghi lý do; seller thấy lý do. **Đây là kênh dạy ranh giới hiệu quả nhất** — rẻ hơn viết tài liệu không ai đọc. |

Kèm widget: **top từ khóa trong `khac`** — đo đúng thứ §1.4 cảnh báo (cây thiếu mục vs seller lười).

### 5.6 Đường thoát tương lai (không làm bây giờ)

Nếu D1+D2 vẫn không đủ: cho seller đề xuất **danh mục con dưới một cha đã có** (`id_cha` khác null, `nguon='seller'`). An toàn hơn tạo lá gốc vì sản phẩm vẫn **roll-up lên cha** → không bao giờ biến mất khỏi filter. Chỉ mở được sau khi cây có cấp cha thật (B1). Ghi lại đây để không phải nghĩ lại.

---

## 6. Thứ tự & phụ thuộc

| Phase | Chặn bởi | Đụng gì | Ghi chú |
|---|---|---|---|
| **A** — UI dropdown | — | Frontend | Làm ngay, giảm sai ngay |
| **C1** — audit soft-map | — | Script | Chạy song song với A, cần số liệu để chốt Q4 |
| **B** — sửa taxonomy | §7 Q1–Q3 | Migration + seed + hub chip guard | Làm **trước** landing SEO Phase 3 |
| **C2–C4** — luật hub | C1 + Q4 | Lib + UI | |
| **D** — cơ chế đóng góp | B (cần cây ổn định) + bước 7 admin | 2 bảng mới + API + admin UI | D1 làm trước D2 |

Một phase = một brief riêng.

---

## 7. Đã chốt (2026-08-12)

| # | Chốt | Hệ quả build |
|---|---|---|
| **Q1** | (a) Seed 5 cấp cha ngay | Hub chip **chỉ lá**; dropdown Kho gom nhóm theo cha |
| **Q2** | (c) Gộp charm + keychain + coaster thành **một** mục | Slug mới `charm-keychain`; `charm-coaster` + `keychain` ẩn, remap FK, URL cũ alias |
| **Q3** | (b) Giữ `combo` là danh mục | Bỏ B2 (không tạo facet `hinh-thuc-ban`); `combo` không gán cấp cha |
| **Q4** | (a) Soft-map chưa confirm **lên filter hub** | Không đổi listing — `id_danh_muc` đủ; `danh_muc_xac_nhan` chỉ để nhắc seller trong Kho |
| **Q5** | (b) Alias tự học → hàng chờ, admin bấm 1 nút | Không auto-promote (UNIQUE toàn cục) |
| **Q6** | (c) Không seed `do-dung-in-hinh` / `tapestry` | Chờ D2 gom request (≥3 shop) rồi admin tạo |

---

## 8. Tài liệu cần cập nhật khi xong

- `CINS_IMPLEMENTATION.md`: 2 bảng mới (`shop_danh_muc_alias_ung_vien`, `shop_danh_muc_yeu_cau`) + API request/queue + gộp slug.
- `CINS_DECISIONS.md`: seller không tạo danh mục — seller báo thiếu chỗ; gộp charm-keychain; combo giữ là danh mục; soft-map lên hub.
- `CINS_FOUNDATIONS.md`: **S1–S4** (nhãn ≠ danh mục ≠ facet ≠ biến thể; seller báo thiếu; `khac` phình = cây thiếu mục).
