# PLAN — Botbar mobile: 5 object cố định + "Quản lý tổ chức"

> Phạm vi: **chỉ mobile (≤960px)**. Desktop giữ nguyên.
> Trạng thái: plan (chưa code). Ngày: 2026-08-27.

---

## 1. Mục tiêu

Botbar mobile (topbar `position: fixed; bottom: 0`) rút còn **đúng 5 object cố định**:

| # | Object | Nguồn hiện tại | Ghi chú |
|---|--------|----------------|---------|
| 1 | **Menu** (burger) | `tb-left > #app-tb-burger` | Giữ nguyên |
| 2 | **Quản lý tổ chức** (MỚI) | thay `tb-group-gio` + `tb-group-shop` | Dropdown gộp: shop cá nhân · CSĐT · Studio · Cộng đồng |
| 3 | **Chat** (giữa) | `CinsChatLauncher` | **Phải thuộc `topbar-inner`** → ẩn cùng nav khi hide |
| 4 | **Noti** | `tb-group-notify` | Giữ nguyên |
| 5 | **Account** | `tb-group-account` | Giữ nguyên |

**Giỏ chờ mua** (`gio-chung`): tách hẳn khỏi botbar → **object nổi độc lập, neo góc trái-dưới** (`position: fixed`), KHÔNG phải một ô của botbar.

---

## 2. Quyết định đã chốt (user)

- **Giỏ hàng:** thả nổi độc lập góc trái-dưới màn hình (không nằm trong 5 object).
- **Quản lý tổ chức — khi chỉ 1 thực thể:** bấm **đi thẳng** tới trang quản lý, không mở dropdown.
- **Quản lý tổ chức — khi 0 thực thể:** vẫn hiện ô, bấm mở **"Tạo tổ chức / Mở shop"**.
- **Chat:** thuộc topbar → khi nav hide (scroll) thì chat **ẩn theo** (đảo yêu cầu cũ "chat luôn giữa/không ẩn").

**Còn treo (cần xác nhận khi build):** có gồm **`truong_dai_hoc`** (nếu user là staff trường) trong danh sách không? Mặc định plan: **không** — chỉ 4 loại user nêu (shop, `co_so_dao_tao`, `studio`, `cong_dong`). `doanh_nghiep` **ẩn** (nhất quán "ẩn UI").

---

## 3. Data source — KHÔNG schema mới (chỉ đọc, SSOT ok)

- **Shop cá nhân:** `shop_cua_hang` (`id_nguoi_dung = viewer`, `da_xoa = false`) → quản lý `/ban-hang`.
- **Org (CSĐT/Studio/Cộng đồng):** `user_thanh_vien_to_chuc` (`id_nguoi_dung = viewer`, `trang_thai='active'`, `vai_tro ∈ {owner, admin, quan_ly_noi_dung, quan_ly_tuyen_sinh, giao_vien}`) JOIN `org_to_chuc` (`id, ten, slug, loai_to_chuc, avatar_id`).
- **Route quản lý:**
  - `co_so_dao_tao` / `studio` (/ `truong_dai_hoc` nếu bật): `orgQuanLyPath(kind, slug)` — `lib/to-chuc/org-quan-ly-routes.ts`.
  - `cong_dong`: **không có `/manage`** (quản trị qua `#app-topbar-page-slot`) → href tới trang cộng đồng (`/community/[slug]` hoặc tương đương — xác định khi build).
- Tái dùng pattern cache của `lib/cins/home-adaptive/capabilities.ts` (service-role, `unstable_cache` revalidate 60s + tag).

---

## 4. API / Server

- **Hàm mới** `lib/cins/managed-entities.ts` → `loadManagedEntities(viewerId)`:
  - 3 truy vấn song song: shop_cua_hang (count/head), user_thanh_vien_to_chuc (rows), org_to_chuc (`.in('id', staffOrgIds)`).
  - Trả `Array<{ kind: 'shop'|'co_so_dao_tao'|'studio'|'cong_dong'; id; ten; slug; avatarUrl; href }>`.
  - Select cột tối thiểu; cache 60s theo tag `managed-ent:${viewerId}`.
- **Cách nạp:** ưu tiên gọi trong `CinsAppTopbar` (đã là async server component) → truyền prop xuống `OrgManagerButton` (client). Tránh round-trip API. (Endpoint refresh để sau nếu cần.)

---

## 5. Frontend

### 5.1 `OrgManagerButton` (client, MỚI) — ô số 2
- Nhận `entities` từ server.
- **0 mục:** nút mở "Tạo tổ chức / Mở shop" (`webHref('/create-organization')` + link `/ban-hang`).
- **1 mục:** `<Link>` thẳng tới `entity.href` (không dropdown).
- **≥2 mục:** dropdown portal (reuse pattern `ShopTopbarButton`: `computeFixedMenuPosition`, `navigateManageHref`) — list avatar + tên + nhãn loại, nhóm theo loại.
- Icon: `Building2`/`Store` (lucide).

### 5.2 `CinsAppTopbar`
- Render **cả** cụm desktop (`tb-group-gio` + `tb-group-shop`) **và** `OrgManagerButton`; CSS ẩn/hiện theo breakpoint (topbar là server component, không biết viewport):
  - **Desktop:** hiện gio + shop, ẩn OrgManagerButton.
  - **Mobile:** ẩn gio + shop, hiện OrgManagerButton (ô số 2).

### 5.3 Chat FAB (ô số 3) — REVERT về slot trong nav
- `CinsChatDock`: mobile portal FAB vào `#app-topbar-chat-slot` (bản cũ), **bỏ** `createPortal(dock, document.body)` + class `is-botbar-center` fixed.
- Kết quả: FAB nằm trong `topbar-inner` → `.is-hidden` (transform) ẩn luôn chat cùng nav.
- **Bubbles peek (`+5`) + mini:** giữ **dock nổi độc lập** (`position: fixed`), KHÔNG thuộc nav → không ẩn theo (đúng ý "không muốn bubble biến mất"). Chỉ **FAB** thuộc nav.

### 5.4 Giỏ hàng nổi (mobile)
- `ShopGioChungButton`: mobile portal trigger ra `document.body`, `position: fixed` **góc trái-dưới**; desktop giữ trong topbar.
- Giỏ trống → ẩn (giữ logic `showTrigger` hiện có).

### 5.5 Grid botbar
- 5 cột: `burger | org | chat | notify | user` (chat giữa, pop lên `margin-top: -28px`, ẩn cùng nav).
- File CSS: `app/cins-app-nav.css` (grid + ẩn/hiện group theo media), `app/cins-chat-overlay.css` (chat slot revert), CSS giỏ (`shop-gio-chung.css`) cho floating mobile.

---

## 6. Các bước build (đúng thứ tự)

1. `lib/cins/managed-entities.ts` — `loadManagedEntities()` (+ href cong_dong).
2. `CinsAppTopbar` — nạp entities, thêm `OrgManagerButton`, giữ gio/shop cho desktop.
3. `OrgManagerButton` + CSS dropdown (reuse pattern ShopTopbarButton).
4. `CinsChatDock` — revert FAB vào slot; bỏ portal center; giữ bubbles nổi.
5. `cins-app-nav.css` — grid 5 cột mobile; media ẩn gio/shop desktop-only, hiện OrgManager mobile-only; chat slot pop-up + hide-with-nav.
6. Giỏ floating mobile (portal body, fixed góc trái-dưới) + CSS.
7. QA mobile: 0 / 1 / ≥2 thực thể; scroll hide nav (chat ẩn, giỏ + bubbles vẫn nổi); badge số.

---

## 7. Edge cases

- Shop + nhiều org → dropdown phân nhóm theo loại.
- `cong_dong` không có `/manage` → href trang cộng đồng (chốt khi build).
- `doanh_nghiep` → **loại khỏi** danh sách (ẩn UI).
- `truong_dai_hoc` (staff) → **mặc định ẩn**, chờ user xác nhận (mục 2 "còn treo").
- Chat panel đang mở (`chat.open`) → dock return null (giữ nguyên).
- Giỏ trống → floating ẩn.

---

## 8. Security / Performance

- Service-role đọc **chỉ theo `viewer.id`**; select cột tối thiểu; cache 60s theo tag.
- Không N+1: 1 query membership + 1 query `org_to_chuc.in(ids)` + 1 count shop.
- **Không schema change → không migration.**

## 9. Không đụng
Desktop layout · route `/manage` · schema DB · logic đơn hàng.
