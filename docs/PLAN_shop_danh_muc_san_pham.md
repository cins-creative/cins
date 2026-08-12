# PLAN — Danh mục sản phẩm toàn nền tảng (shop taxonomy)

> **Trạng thái:** bước 2–6 xong (migration + seed + lib + hub filter + Kho taxonomy). Admin CRUD còn lại (bước 7).
> **Bối cảnh:** giai đoạn đầu CINs nhắm nhóm bán **merch anime fes**; tương lai mở nhiều ngành hàng (quần áo, trang sức, art supply, dịch vụ…).
> **Rev 2 (2026-08-07):** sau khi soát thiên vị ngành hàng (§3b) — **trục Fandom/IP được tổng quát hoá thành hệ thuộc tính (facet)**, không còn bảng `shop_ip` riêng. Fandom trở thành facet đầu tiên.
> **Migration:** `supabase/sql/migration_shop_danh_muc.sql` · `npm run migrate:shop-danh-muc` — **đã chạy** CINs 2026-08-07.
> **Rev 3 (2026-08-12):** tiếp nối ở [`PLAN_shop_danh_muc_rev3.md`](./PLAN_shop_danh_muc_rev3.md) — ranh giới danh mục, chất lượng soft-map, và cơ chế seller đóng góp. Kiến trúc Rev 2 giữ nguyên.

---

## 1. Mục tiêu & phạm vi

**Mục tiêu:** hub `/cua-hang` (và search) lọc được sản phẩm **xuyên shop** theo danh mục chuẩn, trong khi seller vẫn giữ quyền tự đặt tên trưng bày trong shop mình. Kiến trúc phải sống được khi mở ngành hàng mới **mà không phải sửa schema**.

**Trong phạm vi:** cây danh mục canonical do CINs sở hữu · hệ thuộc tính (facet) dùng chung, Fandom là facet đầu · mapping từ `shop_nhom` lên canonical · filter UI trên hub · backfill dữ liệu hiện có.

**Ngoài phạm vi (giai đoạn này):** thuộc tính bắt buộc theo danh mục · gợi ý AI · landing SEO theo danh mục (Phase 3) · phí sàn theo danh mục.

---

## 2. Hiện trạng (verify trong code)

| Thành phần | Nguồn | Vấn đề |
|---|---|---|
| Loại hàng | `shop_nhom` (`truc=1`, `nhan` text ≤40, `noi_bat`, `gia_mac_dinh`, `so_mau`) | Nhãn **tự do theo từng shop** — «Túi Đeo Chéo Canvas» vs «Tote bag» là 2 giá trị khác nhau |
| Trục phụ | `shop_nhom` (`truc=2`) + `shop_san_pham.id_nhom_2` | Ý nghĩa trục do seller quyết → không đồng nhất |
| Tên trục | `shop_cua_hang.nhan_phan_loai` / `nhan_phan_loai_2` (≤40) | Mỗi shop gọi trục một tên khác nhau |
| Bản sao text | `shop_san_pham.phan_loai` / `phan_loai_2` | Denormalized, sync qua `lib/shop/nhom.ts` |
| Biến thể | `shop_bien_the` (`so_luong_ton`, giá theo `shop_bang_gia_dong`) | **Đã có** — size/màu thuộc đây, không phải taxonomy |
| Hub | `lib/shop/cua-hang-listing.ts` → `catalogHang` (loại) | Chưa có trường nào để lọc chung |

**Kết luận:** hiện tại là **taxonomy cục bộ**, đúng cho trưng bày nhưng **không dùng được cho discovery**. Không thể chỉ "chuẩn hóa text" — cần tầng canonical riêng.

---

## 3. Kiến trúc đề xuất — 2 tầng tách bạch

```
Tầng nền tảng (CINs sở hữu)
  shop_danh_muc              cây «cái gì»: Standee · Card · Túi · Nhẫn · Áo thun…
  shop_danh_muc_alias        từ đồng nghĩa → auto-gợi ý mapping

  shop_thuoc_tinh            ĐỊNH NGHĨA trục lọc phụ (facet): Fandom · Thương hiệu · Chất liệu…
  shop_thuoc_tinh_gia_tri    GIÁ TRỊ: Genshin · HSR · Pandora · Bạc 925…
  shop_thuoc_tinh_alias      từ đồng nghĩa cho giá trị

        ▲ mapping (nullable, seller confirm)
        │
Tầng shop (giữ nguyên, seller tự do)
  shop_nhom                  tên trưng bày «Túi Đeo Chéo Canvas Harumasa»
  shop_bien_the              size / màu / tồn / giá — KHÔNG phải taxonomy
```

**Nguyên tắc:**

1. **Danh mục ≠ nhãn trưng bày.** Seller vẫn đặt tên tuỳ ý; canonical chỉ là *thẻ* gắn thêm. Không đổi tên loại của seller.
2. **Chỉ CINs tạo danh mục canonical.** Seller tự tạo → trùng lặp, spam, không SEO, không so sánh được (đúng tinh thần §29).
3. **Trục lọc phụ dùng một hệ chung (facet), không mỗi ngành một bảng.** Fandom (merch) · Thương hiệu (trang sức, quần áo) · Chất liệu · Phong cách — cùng một schema, cùng một cơ chế quản trị, cùng một component UI.
4. **Facet ≠ biến thể.** Size/màu ảnh hưởng tồn kho & giá → thuộc `shop_bien_the` (đã có). Facet chỉ để **lọc**, không ảnh hưởng kho/giá. Lẫn hai cái này là lỗi đắt nhất khi mở ngành quần áo.
5. **Mapping ở cấp loại (`shop_nhom`), không phải mẫu.** Hub đang hiển thị theo loại; ~90 loại hiện có → backfill khả thi. Mẫu kế thừa từ loại; cần chi tiết hơn thì Phase 2 thêm override.
6. **Chưa map ≠ bị ẩn.** Loại chưa map vẫn hiện ở «Tất cả», chỉ không xuất hiện khi user lọc. Nhắc seller trong Kho.

---

## 3b. Soát thiên vị ngành hàng (câu user đặt ra — Rev 2)

Câu hỏi: *thiết kế này có over-fit cho merch anime, khi tương lai mở quần áo / trang sức như Shopee?*

Nguyên tắc trả lời: **thiên vị ở seed data và UI là đúng** (chiến lược beachhead — phải thắng một nhóm trước). **Thiên vị ở schema là sai**, vì đó là chỗ đắt nhất để sửa. Soát từng thành phần:

| Thành phần | Tổng quát được? | Kết luận |
|---|---|---|
| 2 tầng: canonical vs nhãn shop | ✅ | Shopee / Etsy / Lazada đều vậy. Giữ. |
| Alias + admin gộp + `trang_thai` thay vì delete | ✅ | Universal. Giữ. |
| `nganh_hang` trên danh mục | ✅ | Đã chừa sẵn từ Rev 1. Giữ. |
| Mapping nullable + `xac_nhan` flag | ✅ | Universal. Giữ. |
| **16 danh mục merch** | ➖ *không cần* | Đây là **seed data của 1 vertical**, không phải schema. Mở ngành mới = thêm rows, không sửa cấu trúc. Không phải thiên vị đáng lo. |
| **Cây 1 cấp** | ⚠️ **rủi ro** | Shopee dùng 3 cấp. Xử lý ở §3c — coi 16 mục là **lá**, không phải cấp 1. |
| **Bảng `shop_ip` riêng** | ❌ **thiên vị thật** | Đã sửa ở Rev 2 → hệ facet. Lý do dưới đây. |

### Vì sao `shop_ip` là thiên vị cấu trúc

Fandom có nghĩa với merch / cosplay / doujin, **vô nghĩa với trang sức, quần áo basic, văn phòng phẩm**. Nếu hard-code một bảng `shop_ip` + junction + UI riêng, thì mỗi ngành hàng mới lại cần một bảng bespoke: `shop_thuong_hieu` (trang sức), `shop_chat_lieu`, `shop_phong_cach`… → **N bảng, N junction, N nhánh UI, N lần viết lại logic đề xuất/gộp/alias**. Đó là nợ kiến trúc thấy trước được.

Tổng quát hoá: **facet** = định nghĩa trục + giá trị. Fandom chỉ là facet đầu tiên.

| Ngành hàng | Facet | Ví dụ giá trị |
|---|---|---|
| `merch` | Fandom | Genshin · HSR · Ghibli |
| `trang-suc` | Thương hiệu · Chất liệu | Pandora · Bạc 925 · Vàng 18k |
| `quan-ao` | Thương hiệu · Phong cách | Uniqlo · Streetwear · Vintage |
| `art-supply` | Thương hiệu · Chất liệu | Copic · Acrylic · Watercolor |
| *mọi ngành* | Dịp / mục đích | Quà tặng · Cosplay · Đi làm |

Cùng một `shop_thuoc_tinh_gia_tri`, cùng cơ chế `de_xuat → hien → an`, cùng alias, cùng nút gộp, cùng component chip. **Viết governance một lần.**

**Chi phí đổi:** 3 bảng thay vì 2, thêm một join khi query facet. **Lợi:** không phải viết lại khi mở vertical thứ 2 — mà bạn đã nói chắc chắn sẽ mở.

### §3c. Quyết định về độ sâu cây (chốt trước khi seed)

Rủi ro: phát hành 16 slug ở "cấp 1", sau này cần cấp cha kiểu Shopee (`Thời trang nam > Áo > Áo thun`) → phải chèn tầng, URL/SEO đã công bố bị ảnh hưởng.

**Đề xuất:** coi 16 mục Phase 1 là **node lá**, `id_cha = null` tạm thời. Kèm 2 luật:

1. **Slug lá không mang tên cấp cha.** Dùng `ao-thun`, **không** dùng `thoi-trang-nam-ao-thun`. Sau này chèn cha `thoi-trang-nam` thì slug lá không đổi → URL cũ còn nguyên.
2. **URL luôn trỏ lá:** `/cua-hang?danhMuc=ao-thun`, không encode cả đường dẫn cây. Cấp cha chỉ để **nhóm chip trên UI** và roll-up số đếm.

Với 2 luật này, chèn cấp cha ở Phase 2 là **thêm rows + set `id_cha`**, không migration đau, không đổi URL.

### §3c-bis. Cấp cha tương lai sẽ là gì (dự kiến — không tạo ở Phase 1)

Nêu ra đây để **đặt tên slug lá cho khỏi đụng** slug cha sau này, chứ chưa seed.

**Ngành `merch` — 5 cấp cha dự kiến:**

| Cấp cha (dự kiến) | slug | Gom các lá |
|---|---|---|
| Giấy & in ấn | `giay-in-an` | `artprint` · `sticker` · `card` · `fanbook` · `van-phong-pham` |
| Charm & phụ kiện đeo | `charm-phu-kien` | `charm-coaster` · `keychain` · `pin-badge` · `omamori` |
| Trưng bày | `trung-bay-nhom` | `standee` · `trung-bay` |
| Búp bê & mô hình | `bup-be-mo-hinh` | `plush` · `figure` |
| Mặc & mang theo | `mac-mang-theo` | `apparel` · `tui` |

`combo` và `khac` để **ngoài cây** (không gán cha) — chúng cắt ngang mọi nhóm.

**Ngành tương lai — hình dung cấu trúc tương tự:**

| Ngành | Cấp cha dự kiến | Ví dụ lá |
|---|---|---|
| `trang-suc` | Nhẫn · Dây chuyền · Vòng tay · Bông tai · Phụ kiện tóc | `nhan-bac` · `day-chuyen-vang` |
| `quan-ao` | Áo · Quần · Đầm & váy · Ngoài trời · Phụ kiện mặc | `ao-thun` · `hoodie` · `chan-vay` |
| `art-supply` | Bút & màu · Giấy & canvas · Dụng cụ · Thiết bị số | `but-copic` · `mau-nuoc` |
| `dich-vu` | Commission · In ấn theo yêu cầu · Workshop | `commission-chibi` |

⚠️ **Lưu ý đặt tên:** slug cha dự kiến ở trên **không được trùng** slug lá. Vì thế cấp cha «Trưng bày» phải là `trung-bay-nhom`, vì `trung-bay` đã là lá (Hộp shaker). Khi seed Phase 1 cần rà lại danh sách này một lượt để tránh khoá tên.

---

## 4. Database (chờ duyệt — có ALTER bảng cũ)

### 4.1 Bảng mới — `shop_danh_muc`

| Cột | Ghi chú |
|---|---|
| `id` uuid PK | |
| `slug` text UNIQUE | ổn định cho URL / SEO — **không** đổi sau khi phát hành; không mang tên cấp cha (§3c) |
| `ten` text | tên hiển thị VI |
| `id_cha` uuid null → self | Phase 1 để null (16 mục = lá); chèn cha ở Phase 2 |
| `nganh_hang` text | `merch` (Phase 1), sau: `trang-suc`, `quan-ao`, `art-supply`, `dich-vu`… |
| `mo_ta` text null | **ranh giới danh mục** — nguồn chuẩn cho seller & admin (§5) |
| `thu_tu` int | sắp xếp chip |
| `icon` text null | lucide name hoặc ảnh |
| `trang_thai` text | `hien` \| `an` — **không hard delete** (giữ mapping cũ + URL) |
| `tao_luc` / `cap_nhat_luc` | |

### 4.2 Bảng mới — `shop_danh_muc_alias`

`id` · `id_danh_muc` FK → `shop_danh_muc` ON DELETE CASCADE · `tu_khoa` text (normalize: lower, bỏ dấu) · UNIQUE(`tu_khoa`).

Dùng cho: backfill tự động + gợi ý khi seller tạo loại. Mental model giống `article_alias` (đã có admin merge ở `lib/tag/admin-merge.ts`).

### 4.3 Bảng mới — `shop_thuoc_tinh` (định nghĩa facet)

| Cột | Ghi chú |
|---|---|
| `id` uuid PK | |
| `slug` text UNIQUE | `fandom`, `thuong-hieu`, `chat-lieu` |
| `ten` text | «Fandom», «Thương hiệu» |
| `nganh_hang` text null | null = áp mọi ngành; `merch` = chỉ ngành merch |
| `kieu` text | `chon_nhieu` (Fandom) \| `chon_mot` (Thương hiệu) |
| `seller_de_xuat_duoc` bool | true cho Fandom (long tail); false cho facet cần kiểm soát chặt |
| `hien_o_hub` bool | có lên filter hub không (một số facet chỉ dùng nội bộ) |
| `thu_tu` int | |
| `trang_thai` text | `hien` \| `an` |

### 4.4 Bảng mới — `shop_thuoc_tinh_gia_tri` (giá trị facet)

| Cột | Ghi chú |
|---|---|
| `id` uuid PK | |
| `id_thuoc_tinh` uuid FK → `shop_thuoc_tinh` | |
| `slug` text | UNIQUE(`id_thuoc_tinh`, `slug`) — `genshin-impact` |
| `ten` text | |
| `nhom` text null | **nhóm chip chung, không IP-specific**: «HoYoverse» (fandom) · «Cao cấp» (thương hiệu) |
| `loai` text null | phân loại con tuỳ facet: `game` \| `anime` \| `vtuber` \| `original` |
| `trang_thai` text | `de_xuat` \| `hien` \| `an` — xem §5b |
| `so_shop_dung` int default 0 | cache, dùng cho auto-promote + sắp xếp |
| `id_gop_vao` uuid null → self | khi admin gộp trùng, giữ bản ghi cũ để redirect |
| `id_nguoi_de_xuat` uuid null | audit: ai đề xuất |
| `thu_tu` int | ghim giá trị chủ lực lên đầu |

Alias: `shop_thuoc_tinh_alias` (`id_gia_tri`, `tu_khoa`) — UNIQUE(`id_thuoc_tinh`, `tu_khoa`) *(unique theo facet, vì «ba» có thể là Blue Archive ở Fandom nhưng nghĩa khác ở facet Chất liệu)*.

Junction: `shop_nhom_thuoc_tinh` (`id_nhom`, `id_gia_tri`) — một loại gắn nhiều giá trị, nhiều facet.

### 4.5 ⚠️ ALTER bảng cũ — cần user duyệt (DEV_RULES §1 + rule 6)

| Bảng | Cột thêm | Vì sao |
|---|---|---|
| `shop_nhom` | `id_danh_muc` uuid null FK → `shop_danh_muc` ON DELETE SET NULL | mapping canonical |
| `shop_nhom` | `danh_muc_xac_nhan` bool default false | phân biệt seller đã confirm vs hệ thống đoán |

Index: `shop_nhom(id_danh_muc)` · `shop_nhom_thuoc_tinh(id_gia_tri)` · `shop_thuoc_tinh_gia_tri(id_thuoc_tinh, trang_thai)`.

**Không** thêm cột lên `shop_san_pham` ở Phase 1 (tránh mở rộng denormalization đang phải sync).

### 4.6 RLS

- `shop_danh_muc` / `_alias` / `shop_thuoc_tinh`: **SELECT public**, ghi chỉ service-role (admin). Seller **không** tạo được danh mục hay facet.
- `shop_thuoc_tinh_gia_tri`: SELECT public (`hien`, cộng `de_xuat` của chính mình). Seller INSERT được **chỉ khi** facet có `seller_de_xuat_duoc=true`, và **server ép** `trang_thai='de_xuat'` + `so_shop_dung=0` — đi qua API, không PostgREST trần.
- `shop_nhom.id_danh_muc` / `shop_nhom_thuoc_tinh`: theo policy `shop_nhom` — chỉ owner ghi; FK chặn giá trị không tồn tại.

---

## 5. Seed Phase 1 — danh mục vertical `merch` (bảng để review)

16 node lá. Cột «Ranh giới» quan trọng nhất khi review — nó quyết định seller map đúng hay sai, và sẽ được ghi vào `shop_danh_muc.mo_ta`.

| # | slug | Tên hiển thị | Ví dụ khớp (dữ liệu thật đang có) | Ranh giới / dễ lẫn với |
|---|---|---|---|---|
| 1 | `standee` | Standee & mô hình giấy | Standee acrylic, standee mica | Chất liệu **không** đổi danh mục → facet `chat-lieu` |
| 2 | `charm-coaster` | Charm & coaster rời | Coaster acrylic, charm rời không khoen | Có vòng/khoen treo → `keychain` |
| 3 | `keychain` | Keychain & móc khóa | Móc khóa kim loại, PVC, acrylic | Phân biệt với mục 2 bằng **có khoen treo**, không bằng chất liệu |
| 4 | `pin-badge` | Pin & badge cài áo | Huy hiệu, enamel pin | Không gộp sticker |
| 5 | `card` | Card & photocard | «Card Nhựa Cứng Bo Góc Honkai: Star Rail» | Bộ card nhiều tấm vẫn ở đây, không phải `combo` |
| 6 | `artprint` | Artprint & poster | «Artprint Mononoke» | In khổ lớn không khung; có khung → `trung-bay` |
| 7 | `sticker` | Sticker & washi tape | Sticker sheet, washi | Decal dán xe cũng ở đây |
| 8 | `tui` | Túi (tote, canvas, đeo chéo) | «Túi Đeo Chéo Canvas Harumasa Sunday» | Ví/pouch nhỏ → vẫn đây ở Phase 1 |
| 9 | `apparel` | Áo, nón & phụ kiện mặc | Áo thun, hoodie, bucket | Khi mở ngành `quan-ao` sẽ tách nhỏ — xem §9 |
| 10 | `van-phong-pham` | Sổ, bút & văn phòng phẩm | Notebook, bookmark | Bookmark giấy có thể lẫn `artprint` |
| 11 | `omamori` | Bùa omamori | «Bùa Omamori Acrylic Genshin…» | Vải hay acrylic đều ở đây; chất liệu → facet |
| 12 | `trung-bay` | Hộp shaker & phụ kiện trưng bày | «Hộp Shaker 6cm Đựng Charm Genshin Impact» | Khung ảnh, kệ mica |
| 13 | `plush` | Plush & doll | Gấu bông, doll 20cm, quần áo doll | |
| 14 | `figure` | Figure & mô hình | Nendo-style, resin, garage kit | Mô hình **giấy** → mục 1 |
| 15 | `fanbook` | Fanbook & doujinshi | Artbook, zine | |
| 16 | `combo` | Combo & giftset | Set trộn nhiều danh mục | Cùng loại → về danh mục gốc |

Ngoài bảng: `khac` (Khác) — luôn tồn tại, ẩn khỏi chip filter, để seller không bị chặn.

**Alias seed** lấy trực tiếp từ 90 `shop_nhom.nhan` đang có — script sinh gợi ý, admin duyệt một lượt.

**Luật ưu tiên (đã chốt — §5d):** **danh mục = công dụng/hình dáng, chất liệu = facet riêng.** Tên loại có chất liệu («Standee acrylic», «Omamori acrylic») vẫn về danh mục theo công dụng; chất liệu gắn vào facet `chat-lieu`. Ghi luật này vào `mo_ta` của các mục liên quan.

---

## 5d. Chất liệu vs công dụng — ✅ đã chốt: chất liệu là facet

**Chốt (2026-08-07):** danh mục theo **công dụng/hình dáng**; chất liệu tách thành **facet `chat-lieu`**, bật ngay Phase 1. Mục 2 đổi `acrylic-charm` → `charm-coaster`. Ghi chép quá trình quyết định bên dưới.

**Xuất phát — user chọn: ưu tiên chất liệu.** Hợp lý về hành vi mua — với merch anime, người mua *có* nghĩ theo chất liệu («muốn mua acrylic», «muốn đồ vải»). Nhưng nếu cài luật đó **thẳng vào cây danh mục** thì có hệ quả sau:

| Tên loại thật | Công dụng thắng | **Chất liệu thắng** |
|---|---|---|
| Standee acrylic | `standee` | `acrylic-charm` |
| Bùa Omamori Acrylic | `omamori` | `acrylic-charm` |
| Keychain acrylic | `keychain` | `acrylic-charm` |
| Coaster acrylic | `acrylic-charm` | `acrylic-charm` |

Acrylic là chất liệu **áp đảo** trong merch anime → mục `acrylic-charm` hút gần hết 4 mục khác, còn `standee` / `keychain` / `omamori` gần như rỗng. Filter co lại còn «acrylic vs không acrylic» — mất đúng cái giá trị mà bộ 16 mục tạo ra. Đồng thời «Standee acrylic» và «Standee mica» bị tách đôi dù người mua coi là một thứ.

### Đề xuất: giữ cả hai, đặt vào đúng tầng

Hệ facet vừa chốt ở q4 giải quyết được việc này — chất liệu **cắt ngang** mọi danh mục, đúng định nghĩa facet:

- **Danh mục** = công dụng/hình dáng: `standee` · `keychain` · `omamori` · `card`
- **Facet `chat-lieu`** = `acrylic` · `mica` · `vai` · `giay` · `kim-loai` · `pvc` · `nhua` · `go`

«Bùa Omamori Acrylic Genshin» → danh mục `omamori` + facet chất liệu `acrylic` + facet fandom `genshin-impact`.

Người mua muốn lọc theo chất liệu thì **vẫn lọc được** (chip Chất liệu), thậm chí tốt hơn: xem *mọi* đồ acrylic xuyên danh mục trong một lần, thay vì bị giới hạn trong mục `acrylic-charm`.

**Kéo theo (đã áp vào §5):** mục 2 `acrylic-charm` → `charm-coaster` («Charm & coaster rời») — định nghĩa theo công dụng; mục 2 vs mục 3 phân biệt bằng **có khoen treo**, không bằng chất liệu. Mục 11 `omamori` nhận cả vải lẫn acrylic.

**Facet `chat-lieu`** bật ngay Phase 1, `seller_de_xuat_duoc=false` — danh sách đóng ~8 giá trị, chất liệu không phải long tail như fandom nên không cần cơ chế đề xuất.

**Lợi phụ:** ca «Bùa Omamori Acrylic» từ chỗ nhập nhằng 2 danh mục (phải để `danh_muc_xac_nhan=false`) trở thành **xác định** — `omamori` + chất liệu `acrylic`. Tách đúng tầng làm giảm số ca cần seller confirm.

---

## 5b. Facet «Fandom» — quản trị khi liên tục có giá trị mới

Danh mục là tập **đóng, đổi chậm** (16 mục dùng được vài năm). Giá trị facet là **long tail mở** — game mới ra hàng tháng, thương hiệu trang sức cũng vậy. Vì thế hai tầng **không dùng cùng cơ chế quản trị**. Cơ chế dưới đây viết một lần, áp cho **mọi** facet có `seller_de_xuat_duoc=true`.

### So sánh 3 mô hình

| | A. Chỉ admin tạo | B. Seller gõ tự do | C. Seller đề xuất → admin duyệt *(**đã chốt**)* |
|---|---|---|---|
| Giá trị mới xuất hiện | Seller **bị chặn** đến khi admin thêm | Dùng ngay | Dùng ngay (`de_xuat`) |
| Trùng lặp | Không | Nhiều («GI», «genshin», «Nguyên Thần») | Có, nhưng alias + gộp hút lại |
| Gánh nặng admin | Cao, là bottleneck | Không | Thấp — duyệt theo lô, chỉ giá trị đủ phổ biến |
| Chất lượng filter | Sạch | Rác, filter vô dụng | Sạch ở tầng `hien` |
| Rủi ro chính | Seller bỏ không gắn | Taxonomy chết vì noise | Cần quy tắc auto-promote rõ |

### Cơ chế (C)

1. **Ba trạng thái:** `de_xuat` (seller vừa tạo — chỉ hiện trong shop đó + search text) → `hien` (vào chip filter toàn hub) → `an` (ngừng, giữ mapping).
2. **Auto-promote:** giá trị `de_xuat` đạt **≥3 shop khác nhau** *hoặc* **≥10 loại hàng** → vào hàng chờ, admin bấm một nút. Ngưỡng để trong config, không rải hard-code.
3. **Chống trùng lúc gõ:** normalize (lower, bỏ dấu, bỏ ký tự đặc biệt) → tra `shop_thuoc_tinh_alias` + fuzzy trên `ten` → hiện «Có phải bạn muốn *Genshin Impact*?» trước khi cho tạo mới. Chỗ này ngăn phần lớn rác, hiệu quả hơn kiểm duyệt sau.
4. **Gộp không mất dữ liệu:** admin gộp → chuyển `shop_nhom_thuoc_tinh` sang giá trị đích, set `id_gop_vao`, đẩy tên cũ thành alias. Slug cũ vẫn redirect (giống `lib/tag/admin-merge.ts`).
5. **Không có cấp nhân vật.** Genshin ~90 nhân vật × N game → nổ chip filter. Nhân vật nằm trong **tên loại**, đã search full-text được («Harumasa», «Mononoke»).
6. **`nhom` để gom chip**, không phải cấp cây — dropdown «HoYoverse ▸ Genshin · HSR · ZZZ» cho gọn khi danh sách dài.

### Seed giá trị facet `fandom` — Phase 1 (bảng để review)

| slug | Tên | loai | nhom *(nhà phát hành)* | Alias seed |
|---|---|---|---|---|
| `genshin-impact` | Genshin Impact | game | HoYoverse | genshin, gi, nguyên thần |
| `honkai-star-rail` | Honkai: Star Rail | game | HoYoverse | hsr, star rail, honkai sr |
| `zenless-zone-zero` | Zenless Zone Zero | game | HoYoverse | zzz, zenless |
| `honkai-impact-3` | Honkai Impact 3rd | game | HoYoverse | hi3, honkai impact |
| `blue-archive` | Blue Archive | game | Nexon | ba, bluar |
| `arknights` | Arknights | game | Hypergryph | ak, minh nhật phương châu |
| `identity-v` | Identity V | game | NetEase | idv |
| `wuthering-waves` | Wuthering Waves | game | Kuro Games | wuwa |
| `jujutsu-kaisen` | Jujutsu Kaisen | anime | — | jjk, chú thuật hồi chiến |
| `chainsaw-man` | Chainsaw Man | anime | — | csm, cưa máy |
| `ghibli` | Studio Ghibli | anime | Ghibli | mononoke, totoro |
| `vtuber` | Vtuber | vtuber | — | hololive, nijisanji *(tách riêng nếu đủ nhiều)* |
| `original` | Original / OC | original | — | oc, tự vẽ, original character |
| `khac` | Fandom khác | khac | — | — |

> Chỉ cần đủ phủ **wave fes đầu tiên**; phần còn lại để cơ chế đề xuất tự lớn. Đừng seed 100 giá trị ngay — seed sai tệ hơn seed thiếu, vì seller sẽ map bừa vào mục gần đúng rồi rất khó dọn.

### Seed giá trị facet `chat-lieu` — Phase 1 (danh sách đóng)

`seller_de_xuat_duoc = false` · `kieu = chon_nhieu` (một loại có thể acrylic + kim loại).

| slug | Tên | Alias seed |
|---|---|---|
| `acrylic` | Acrylic | acrylic, mica trong, ac |
| `mica` | Mica | mica |
| `giay` | Giấy & in | giay, art paper, couche |
| `vai` | Vải & canvas | vai, canvas, cotton, thêu |
| `kim-loai` | Kim loại | kim loai, inox, thau, enamel |
| `pvc` | PVC & nhựa mềm | pvc, nhua mem, cao su |
| `nhua-cung` | Nhựa cứng | nhua cung, pp, pet |
| `go` | Gỗ | go, tre |
| `bong` | Bông & nhồi | bong, plush, nhoi |

> Chất liệu **không** long tail: nếu thiếu, admin thêm là đủ. Không mở cho seller đề xuất để tránh «acrylic trong», «acrylic mờ», «acrylic 3mm» thành 3 giá trị.

---

## 5c. Seed mẫu (tạm) — hình dung dữ liệu thật trước khi làm

Lấy đúng 5 loại hàng đang hiện trên hub `/cua-hang`. `id` viết bằng slug cho dễ đọc; thực tế là uuid.

### `shop_danh_muc` (5 dòng mẫu / 16)

| slug | ten | nganh_hang | id_cha | thu_tu | trang_thai |
|---|---|---|---|---|---|
| `card` | Card & photocard | merch | null | 50 | hien |
| `artprint` | Artprint & poster | merch | null | 60 | hien |
| `tui` | Túi (tote, canvas, đeo chéo) | merch | null | 80 | hien |
| `omamori` | Bùa omamori & charm vải | merch | null | 110 | hien |
| `trung-bay` | Hộp shaker & phụ kiện trưng bày | merch | null | 120 | hien |

### `shop_danh_muc_alias` — sinh từ tên loại thật

| tu_khoa *(đã normalize)* | id_danh_muc |
|---|---|
| `card nhua` · `photocard` · `card bo goc` | `card` |
| `artprint` · `art print` · `poster` | `artprint` |
| `tui canvas` · `tui deo cheo` · `tote` | `tui` |
| `omamori` · `bua omamori` | `omamori` |
| `hop shaker` · `shaker` | `trung-bay` |

### `shop_thuoc_tinh` — facet Phase 1 + 1 dòng nhìn trước tương lai

| slug | ten | nganh_hang | kieu | seller_de_xuat_duoc | hien_o_hub | trang_thai |
|---|---|---|---|---|---|---|
| `fandom` | Fandom | `merch` | chon_nhieu | **true** | true | hien |
| `chat-lieu` | Chất liệu | null *(mọi ngành)* | chon_nhieu | **false** | true | hien |
| `thuong-hieu` | Thương hiệu | null *(mọi ngành)* | chon_mot | false | true | **an** *(bật khi mở ngành trang sức / quần áo)* |

Hai facet Phase 1: `fandom` (long tail, seller đề xuất được) và `chat-lieu` (danh sách đóng, admin quản). Dòng `thuong-hieu` để minh hoạ: mở ngành hàng mới = **thêm rows / đổi `trang_thai`**, không migration.

### `shop_thuoc_tinh_gia_tri` — gồm 1 dòng `de_xuat` và 1 dòng đã gộp

| id_thuoc_tinh | slug | ten | loai | nhom | trang_thai | so_shop_dung | id_gop_vao |
|---|---|---|---|---|---|---|---|
| `fandom` | `genshin-impact` | Genshin Impact | game | HoYoverse | hien | 12 | — |
| `fandom` | `honkai-star-rail` | Honkai: Star Rail | game | HoYoverse | hien | 9 | — |
| `fandom` | `zenless-zone-zero` | Zenless Zone Zero | game | HoYoverse | hien | 5 | — |
| `fandom` | `ghibli` | Studio Ghibli | anime | Ghibli | hien | 3 | — |
| `fandom` | `silver-blade` | Silver Blade *(game mới ra tuần trước)* | game | — | **de_xuat** | 1 | — |
| `fandom` | `genshin` | Genshin *(seller gõ trùng)* | game | — | **an** | 0 | → `genshin-impact` |

Dòng `silver-blade`: seller dùng được ngay trong shop mình, chưa lên chip filter hub. Đủ 3 shop → vào hàng chờ duyệt.
Dòng `genshin`: minh hoạ gộp — junction đã chuyển sang `genshin-impact`, bản ghi giữ lại để URL cũ còn redirect.

### `shop_thuoc_tinh_alias`

| id_thuoc_tinh | tu_khoa | id_gia_tri |
|---|---|---|
| `fandom` | `genshin` · `gi` · `nguyen than` | `genshin-impact` |
| `fandom` | `hsr` · `star rail` · `honkai sr` | `honkai-star-rail` |
| `fandom` | `zzz` · `zenless` | `zenless-zone-zero` |
| `fandom` | `mononoke` · `totoro` | `ghibli` |

### `shop_nhom` sau khi map (dữ liệu thật trên hub)

| nhan *(seller tự đặt — không đổi)* | shop | → id_danh_muc | danh_muc_xac_nhan | Cách suy ra |
|---|---|---|---|---|
| Card Nhựa Cứng Bo Góc Honkai: Star Rail | Tùng Bơ | `card` | true | alias `card bo goc` |
| Artprint Mononoke | KorzFáng | `artprint` | true | alias `artprint` |
| Túi Đeo Chéo Canvas Harumasa Sunday | Basakila | `tui` | true | alias `tui deo cheo` |
| Hộp Shaker 6cm Đựng Charm Genshin Impact | Basakila | `trung-bay` | true | alias `hop shaker` |
| Bùa Omamori Acrylic Genshin Honkai Star… | Basakila | `omamori` | true | alias `omamori`; chữ «Acrylic» đi vào facet chất liệu, **không** tranh danh mục (§5d) |

> `danh_muc_xac_nhan = false` giờ chỉ còn dùng cho ca alias **không khớp gì** → hệ thống để `khac` và nhắc seller chọn.

### `shop_nhom_thuoc_tinh` (junction — một loại nhiều giá trị)

| id_nhom | id_gia_tri | facet |
|---|---|---|
| Card Nhựa Cứng Bo Góc HSR | `honkai-star-rail` | fandom |
| Card Nhựa Cứng Bo Góc HSR | `nhua-cung` | chat-lieu |
| Artprint Mononoke | `ghibli` | fandom |
| Artprint Mononoke | `giay` | chat-lieu |
| Túi Đeo Chéo Canvas Harumasa Sunday | `zenless-zone-zero` | fandom |
| Túi Đeo Chéo Canvas Harumasa Sunday | `vai` | chat-lieu |
| Hộp Shaker 6cm Đựng Charm | `genshin-impact` | fandom |
| Hộp Shaker 6cm Đựng Charm | `acrylic` | chat-lieu |
| Bùa Omamori Acrylic Genshin Honkai Star… | `genshin-impact` | fandom |
| Bùa Omamori Acrylic Genshin Honkai Star… | `honkai-star-rail` | fandom |
| Bùa Omamori Acrylic Genshin Honkai Star… | `acrylic` | chat-lieu |

### Hub nhìn thấy gì

- Chip danh mục: `Tất cả · Card (1) · Artprint (1) · Túi (1) · Trưng bày (1) · Omamori (1)` — mục 0 sản phẩm không hiện.
- Dropdown Fandom: `HoYoverse ▸ Genshin (2) · HSR (2) · ZZZ (1)` · `Ghibli (1)`. `silver-blade` **không** xuất hiện (còn `de_xuat`).
- Dropdown Chất liệu: `Acrylic (2) · Giấy (1) · Vải (1) · Nhựa cứng (1)`.
- Chọn `Chất liệu = Acrylic` → ra **2 loại thuộc 2 danh mục khác nhau** (Omamori + Hộp shaker). Đây chính là thứ không làm được nếu nhồi chất liệu vào cây.
- Facet `thuong-hieu` đang `an` → **không** render gì. Bật lên là có ngay, không sửa code.

---

## 6. API

| Route | Method | Ghi chú |
|---|---|---|
| `/api/shop/danh-muc` | GET | cây danh mục + facet (`hien_o_hub`) + giá trị `hien` — cache dài, dữ liệu ít đổi |
| `/api/shop/thuoc-tinh/gia-tri` | POST | seller đề xuất giá trị mới (chỉ facet `seller_de_xuat_duoc`); server ép `de_xuat` |
| `/api/shop/nhom/[id]` | PATCH | nhận thêm `idDanhMuc`, `giaTriIds[]` — owner only |
| `/api/admin/shop/danh-muc` | GET/POST/PATCH | admin CRUD danh mục + alias + gộp |
| `/api/admin/shop/thuoc-tinh` | GET/POST/PATCH | admin CRUD facet + duyệt/gộp giá trị + hàng chờ auto-promote |

Lib mới:
- `lib/shop/danh-muc.ts` — `listDanhMucTree()`, `suggestDanhMucFromTen(ten)` (normalize + alias), `applyDanhMucToNhom()`.
- `lib/shop/thuoc-tinh.ts` — `listFacetsForNganhHang()`, `suggestGiaTriFromText()`, `deXuatGiaTri()`, `promoteGiaTri()`, `gopGiaTri()`. **Governance viết ở đây một lần cho mọi facet.**

Hub `lib/shop/cua-hang-listing.ts`: `PublicShopListingHang` thêm `danhMucSlug` + `facets: Record<facetSlug, giaTriSlug[]>` (đi cùng `noiBat` / `soLuongBan` / `hetHang` vừa thêm).

---

## 7. Frontend

**Hub `/cua-hang`** (mode «Hàng», đã có toggle Shop|Hàng):
- Hàng chip filter danh mục dưới toolbar, `Tất cả` + đếm số. Multi-select OR trong cùng trục, AND giữa các trục.
- Facet render **generic** từ metadata (`hien_o_hub`, `kieu`) — thêm facet mới không cần sửa component.
- Filter **client-side** ở Phase 1 (data đã nạp sẵn) → không thêm round-trip. Sync `?danhMuc=` / `?fandom=` để share link.
- Giữ thứ tự ưu tiên hiện tại (Feature → còn hàng → có ảnh → đã bán) **trong** tập đã lọc, vẫn round-robin theo shop.

**Kho seller (`/ban-hang/kho`)**:
- Form loại: select «Danh mục CINs» + gợi ý từ alias («Gợi ý: Card & photocard» kèm nút Dùng).
- Ô facet Fandom: combobox cho chọn nhiều, gõ tên mới → hiện gợi ý trùng trước khi cho đề xuất.
- Badge «Chưa gắn danh mục» trên loại chưa map + banner đếm số.

---

## 8. Các bước triển khai

| Bước | Nội dung | Chặn bởi | Trạng thái |
|---|---|---|---|
| 1 | ✅ Chốt §11 (8/8) | — | xong |
| 2 | ✅ Migration: 6 bảng + 2 cột `shop_nhom` · `npm run migrate:shop-danh-muc` | bước 1 | **đã chạy** 2026-08-07 |
| 3 | ✅ Seed 17 danh mục + facet fandom/chat-lieu/thuong-hieu + alias | bước 2 | trong migration |
| 4 | ✅ `lib/shop/danh-muc.ts` + `thuoc-tinh.ts` + listing DTO (`danhMucSlug`/`facets`) | bước 3 | xong |
| 5 | ✅ UI filter hub (danh mục + facet generic) + `?danhMuc=`/`?fandom=`/`?chat-lieu=` | bước 4 | xong |
| 5b | ✅ Soft-map alias → `shop_nhom` (`danh_muc_xac_nhan=false`) + facet links · `npm run soft-map:shop-taxonomy` | bước 3 | 72/120 loại · 115 facet link |
| 6 | ✅ UI Kho: chọn danh mục + Fandom + Chất liệu, gợi ý alias, badge nhắc | bước 4 | xong |
| 7 | Admin: CRUD, hàng chờ duyệt, gộp | sau khi hub chạy | **tiếp theo** |

Mỗi bước = một brief riêng (rule «một phase / một brief»).

---

## 9. Roadmap mở rộng

**Phase 2 — ngành hàng thứ hai (ví dụ trang sức / quần áo):**
- Thêm rows `shop_danh_muc` với `nganh_hang` mới; chèn **cấp cha** cho cây merch nếu cần (theo §3c, slug lá không đổi).
- Bật facet `thuong-hieu` / `chat-lieu` — **không migration**, chỉ đổi `trang_thai` + seed giá trị.
- **Kiểm lại nguyên tắc 4:** size/màu quần áo phải vào `shop_bien_the`, không được lẻn vào facet.
- Cân nhắc override danh mục ở cấp mẫu (`shop_san_pham`) nếu seller ngành mới dùng loại khác cách merch.

**Phase 3 — discovery & SEO:** landing `/cua-hang/[danhMucSlug]` (ISR) · gợi ý mapping bằng AI · dashboard admin «danh mục nào bán chạy / thiếu nguồn cung» · thuộc tính **bắt buộc** theo danh mục (Shopee-style required attributes) · cân nhắc phí sàn theo danh mục.

---

## 10. Edge cases

- **Loại chưa map:** hiện ở «Tất cả», không hiện khi lọc; không chặn tạo/bán.
- **Đổi tên loại của seller:** không ảnh hưởng mapping (FK theo id).
- **Admin gộp 2 danh mục:** chuyển `shop_nhom.id_danh_muc` sang đích + đẩy slug cũ thành alias; không xóa slug (redirect được).
- **Danh mục `an`:** loại đã map vẫn giữ FK; chip không hiện; admin thấy cảnh báo còn N loại đang trỏ.
- **Facet `an`:** giá trị đã gắn vẫn giữ trong junction; hub không render facet đó.
- **Seller map sai để lên top filter:** `danh_muc_xac_nhan` + báo cáo sai danh mục; admin sửa được (ghi audit `id_nguoi_de_xuat`).
- **Một loại đúng 2 danh mục** («Combo card + standee»): Phase 1 chọn 1 chính; nếu tần suất cao → Phase 2 đổi thành junction `shop_nhom_danh_muc`. **Ảnh hưởng schema — chốt sớm (§11.2).**
- **Facet rỗng:** bình thường, facet luôn tuỳ chọn.
- **Seller spam đề xuất giá trị:** rate-limit theo shop + `de_xuat` không lên hub → không có động lực spam.
- **Cùng tên ở 2 facet khác nhau** («Bạc» = chất liệu vs thương hiệu): alias UNIQUE **theo facet**, không toàn cục.

---

## 11. Quyết định (user chốt 2026-08-07)

| # | Vấn đề | Chốt |
|---|---|---|
| 1 | Luật ưu tiên khi tên khớp nhiều mục | ✅ **Danh mục = công dụng · chất liệu = facet `chat-lieu`** (§5d). Mục 2 đổi `acrylic-charm` → `charm-coaster` |
| 2 | Một loại gắn bao nhiêu danh mục | ✅ **1 danh mục chính** — FK đơn `shop_nhom.id_danh_muc` |
| 3 | Độ sâu cây | ✅ **16 mục = node lá**, chừa sẵn cấp cha. Cấp cha dự kiến ở **§3c-bis** |
| 4 | Fandom: bảng riêng hay facet | ✅ **Facet tổng quát** — Fandom là facet đầu tiên |
| 5 | Seed Fandom + auto-promote | ✅ **14 giá trị** + ngưỡng **≥3 shop hoặc ≥10 loại** |
| 6 | Fandom Phase 1 hay 2 | ✅ **Phase 1**, cùng danh mục |
| 7 | ALTER `shop_nhom` 2 cột | ✅ **Duyệt** (`id_danh_muc` nullable FK · `danh_muc_xac_nhan` bool default false) |
| 8 | Bắt buộc chọn danh mục | ✅ **Soft** — gợi ý sẵn, không chặn lưu |

### Còn treo

- Rà slug cấp cha dự kiến (§3c-bis) để không trùng slug lá — làm trong bước seed.
- Chốt danh sách 9 giá trị `chat-lieu` (§5b) — thêm/bớt gì không.

**Toàn bộ 8 câu đã chốt → plan sẵn sàng vào bước 2 (migration).**

---

## 12. Tài liệu cần cập nhật khi build xong

- `CINS_IMPLEMENTATION.md`: 5 bảng mới + API `/api/shop/danh-muc` · `/api/shop/thuoc-tinh/**` + ghi chú hub `/cua-hang` (filter).
- `CINS_DECISIONS.md`: (a) taxonomy 2 tầng — CINs sở hữu canonical, seller giữ nhãn trưng bày; (b) **facet tổng quát thay vì bảng riêng cho mỗi trục ngành hàng**; (c) inventory ALTER `shop_nhom`.
- `CINS_FOUNDATIONS.md`: nếu chốt thành quy tắc kiến trúc — phân biệt **nhãn cục bộ (§29) vs danh mục discovery vs facet vs biến thể** (4 khái niệm dễ lẫn).
