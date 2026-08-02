# PLAN — Tab «Khách hàng» + thẻ phân loại khách hàng trong chat

> **Phase:** PLANNING (Opus 5) · **Ngày:** 2026-08-02 · **Build đề xuất:** Grok 4.5 (Medium) theo từng Step.
> Scope: chỉ chat overlay + module shop. Không đụng Journey, org, canvas, filter_nhan.

---

## 0. Yêu cầu (từ user)

1. Nếu tôi là **shop** và có người **mua hàng của tôi** → trong danh sách hội thoại (`ChatThreadRow`) và header hội thoại (`cins-chat-convo-head`) của người đó có thêm **thẻ «Khách hàng»**.
2. Với hội thoại là khách hàng → shop có **chức năng chọn thẻ phân loại**. Mặc định 3 thẻ: **Đã chuyển tiền · Chưa chuyển tiền · Ship**. Shop **tự thêm thẻ + chọn màu**.
3. Thẻ này **chỉ shop thấy** (khách hàng và người khác không thấy).
4. Thanh tab hội thoại (`cins-chat-thread-tabs`) có thêm tab **«Khách hàng»** — filter tất cả khách đã mua hàng của mình.

---

## 1. Quyết định kiến trúc (đọc trước khi code)

### 1.1 «Khách hàng» là **chiều phụ**, KHÔNG phải giá trị mới của `ChatThreadGroup`

`ChatThread.group` là **một** giá trị (`ban_be | nguoi_la | to_chuc`) và quyết định thread nằm ở tab nào (`lib/chat/types.ts:191`). Một khách hàng vẫn có thể là **bạn bè** hoặc **người lạ**.

→ Nếu thêm `"khach_hang"` vào `ChatThreadGroup`, khách hàng là bạn bè sẽ **biến mất khỏi tab Bạn bè**. Không làm.

**Chốt:**

```ts
// lib/chat/types.ts — GIỮ NGUYÊN
export type ChatThreadGroup = "ban_be" | "nguoi_la" | "to_chuc";

// MỚI — chỉ dùng cho state tab UI + tabUnread
export type ChatThreadView = ChatThreadGroup | "khach_hang";
```

- `activeTab: ChatThreadView`; filter: `activeTab === "khach_hang" ? t.isKhachHang : t.group === activeTab`.
- `CHAT_THREAD_GROUP_ORDER` / `_LABEL` giữ nguyên (server dùng); thêm `CHAT_THREAD_VIEW_ORDER` / `_LABEL` cho UI.
- `tabUnread` đổi sang `Record<ChatThreadView, number>`; `khach_hang` cộng riêng (một thread có thể được cộng 2 lần — đúng ý nghĩa vì hai tab khác nhau).
- `ChatLaunchState.tab` vẫn là `ChatThreadGroup` (server-side) → chỉ mở rộng nếu cần deep-link tab khách hàng (không cần ở Phase 1).

### 1.2 Tab «Khách hàng» chỉ hiện với seller

Điều kiện: `user_nguoi_dung.ban_hang_bat = true` (`lib/shop/settings.ts:13` — `getBanHangEnabled`). Không cần `shop_hien_thi`, không cần `shopReady` (shop đã tắt hiển thị vẫn phải quản khách cũ).

### 1.3 Khách hàng = buyer trên `shop_don_hang`, khóa theo `id_nguoi_ban`

- Order: `shop_don_hang(id_nguoi_mua, id_nguoi_ban, trang_thai, tao_luc, ma_don, tong_tien)`; **không có `id_cua_hang`** → luôn filter `id_nguoi_ban = <sellerUserId>`.
- Index sẵn có: `idx_shop_don_seller (id_nguoi_ban, tao_luc DESC)`.
- **Lọc trạng thái:** loại `nhap` (đơn nháp chưa phải khách). **Giữ** `huy` nhưng đánh dấu — xem §6 Edge. (Đơn hủy vẫn là người từng mua/liên hệ; shop cần thấy để quản.)
- Không tạo bảng `khach_hang` riêng — derive từ đơn (không có nguồn sự thật thứ hai).

### 1.4 Thẻ phân loại: bảng mới per-seller, **không** reuse `chat_the_tai_nguyen`

`chat_the_tai_nguyen` scope theo **phòng** và **mọi thành viên phòng đều đọc được** (RLS `is_chat_room_member`) → vi phạm yêu cầu «chỉ shop thấy». Không reuse.

Bảng mới, đặt tên theo convention `shop_*` + tách `the` / `the_gan` giống L28:

| Bảng | Ý nghĩa |
|---|---|
| `shop_the_khach` | Định nghĩa thẻ của **một seller** (tên, màu, thứ tự, cờ mặc định) |
| `shop_the_khach_gan` | Gán thẻ ↔ **buyer** (không gán vào phòng chat, không gán vào đơn) |

Gán theo **buyer**, không theo đơn: yêu cầu là phân loại *hội thoại/khách*, một khách có nhiều đơn.

### 1.5 3 thẻ mặc định: seed ở **write path**, KHÔNG seed ở read path

| Tên | slug | Màu (palette `ROOM_TAG_COLOR_PALETTE`) | `mac_dinh` |
|---|---|---|---|
| Đã chuyển tiền | `da-chuyen-tien` | `#15803d` (green) | true |
| Chưa chuyển tiền | `chua-chuyen-tien` | `#b45309` (amber) | true |
| Ship | `ship` | `#1f74c9` (blue) | true |

**User đã chốt: thẻ mặc định được xóa tự do như thẻ tự thêm.** Điều này loại bỏ phương án seed-lazy-khi-đọc: nếu seed mỗi lần đọc thấy 0 thẻ, shop xóa hết 3 thẻ thì lần load sau chúng **sống lại**. Nên:

1. **Migration backfill** — insert 3 thẻ cho mọi seller hiện có (`ban_hang_bat = true`), guard `WHERE NOT EXISTS` (idempotent).
2. **Seller mới** — seed trong `setBanHangEnabled(userId, true)` (`lib/shop/settings.ts`), chỉ khi seller chưa có thẻ nào.
3. **Read path không bao giờ seed.** `listShopKhachHangTags` trả đúng những gì có, kể cả rỗng (UI hiện empty state + nút «Thêm thẻ»).

`mac_dinh` giữ lại nhưng **chỉ mang tính thông tin** (biết thẻ nào do hệ thống tạo); không chặn xóa, không chặn sửa.

Edge chấp nhận: shop xóa hết thẻ → tắt bán hàng → bật lại → 3 thẻ seed lại (guard chỉ đếm số thẻ hiện có). Không đáng thêm cột tracking cho case này.

### 1.6 Multi-select

Thẻ = nhãn nhiều-chọn (giống `setMessageTags`). «Đã / Chưa chuyển tiền» loại trừ nhau về nghĩa nhưng **không** enforce ở DB/API — shop tự quản, và enforce sẽ chặn thẻ tự thêm. Xem §8.

### 1.7 Khách chưa từng chat

`notifySellerDonHangChat()` (`lib/shop/don-hang.ts:1118`) mở DM room khi có đơn → gần như luôn có phòng. Nhưng đơn cũ / lỗi gửi có thể không có.

**Chốt Phase 1:** chỉ hiện khách **đã có phòng DM**. Khách chưa có phòng → hiện ở Phase 2 dạng thread `pending:` (reuse `lib/chat/optimistic-thread.ts` + `isPendingRoomId`). Lý do: tránh phình payload `/api/chat/threads` và tránh thread giả không mở được.

---

## 2. Database

### 2.1 Bước 0 — xác thực DB thật trước khi viết migration

Luật repo: **DB là source of truth**, không tin file SQL/prose. Trước khi chạy:

```sql
-- 1) cột seller opt-in
select column_name, data_type from information_schema.columns
where table_schema='public' and table_name='user_nguoi_dung'
  and column_name in ('ban_hang_bat','shop_hien_thi');

-- 2) cột đơn hàng dùng trong query
select column_name, data_type from information_schema.columns
where table_schema='public' and table_name='shop_don_hang';

-- 3) enum trạng thái đơn hiện tại
select enumlabel from pg_enum e
join pg_type t on t.oid = e.enumtypid
where t.typname = 'shop_trang_thai_don_enum' order by e.enumsortorder;

-- 4) bảng mới chưa tồn tại
select table_name from information_schema.tables
where table_schema='public' and table_name like 'shop_the_khach%';
```

**Không ALTER bảng cũ** trong plan này → không cần quy trình duyệt ALTER (DEV_RULES §1). Chỉ `CREATE TABLE` + `CREATE POLICY` mới.

### 2.2 Migration: `supabase/sql/migration_shop_the_khach.sql`

Idempotent (`IF NOT EXISTS`, `DROP POLICY IF EXISTS`) theo chuẩn repo.

```sql
-- =====================================================================
-- migration_shop_the_khach.sql
-- Thẻ phân loại khách hàng của shop (chỉ seller thấy).
-- Idempotent — chạy lại an toàn.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.shop_the_khach (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_nguoi_ban  uuid NOT NULL REFERENCES public.user_nguoi_dung(id) ON DELETE CASCADE,
  ten           text NOT NULL,
  slug          text NOT NULL,
  mau           text,
  thu_tu        integer NOT NULL DEFAULT 0,
  mac_dinh      boolean NOT NULL DEFAULT false,
  tao_luc       timestamptz NOT NULL DEFAULT now(),
  cap_nhat_luc  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id_nguoi_ban, slug)
);

CREATE INDEX IF NOT EXISTS shop_the_khach_ban_idx
  ON public.shop_the_khach (id_nguoi_ban, thu_tu);

CREATE TABLE IF NOT EXISTS public.shop_the_khach_gan (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_the        uuid NOT NULL REFERENCES public.shop_the_khach(id) ON DELETE CASCADE,
  id_nguoi_ban  uuid NOT NULL REFERENCES public.user_nguoi_dung(id) ON DELETE CASCADE,
  id_nguoi_mua  uuid NOT NULL REFERENCES public.user_nguoi_dung(id) ON DELETE CASCADE,
  tao_luc       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id_the, id_nguoi_mua)
);

CREATE INDEX IF NOT EXISTS shop_the_khach_gan_ban_mua_idx
  ON public.shop_the_khach_gan (id_nguoi_ban, id_nguoi_mua);

COMMENT ON TABLE public.shop_the_khach IS
  'Thẻ phân loại khách hàng do seller tự định nghĩa — chỉ seller đọc/ghi.';
COMMENT ON TABLE public.shop_the_khach_gan IS
  'Gán thẻ lên buyer (theo cặp seller-buyer). Buyer KHÔNG được đọc.';
COMMENT ON COLUMN public.shop_the_khach.mac_dinh IS
  'Thẻ seed mặc định (Đã/Chưa chuyển tiền, Ship) — thông tin, không chặn xóa/sửa.';

ALTER TABLE public.shop_the_khach ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_the_khach_gan ENABLE ROW LEVEL SECURITY;

-- Chỉ chủ shop — buyer KHÔNG có policy nào (mặc định deny).
DROP POLICY IF EXISTS shop_the_khach_owner ON public.shop_the_khach;
CREATE POLICY shop_the_khach_owner ON public.shop_the_khach
  FOR ALL
  USING (id_nguoi_ban = public.current_profile_id())
  WITH CHECK (id_nguoi_ban = public.current_profile_id());

DROP POLICY IF EXISTS shop_the_khach_gan_owner ON public.shop_the_khach_gan;
CREATE POLICY shop_the_khach_gan_owner ON public.shop_the_khach_gan
  FOR ALL
  USING (id_nguoi_ban = public.current_profile_id())
  WITH CHECK (id_nguoi_ban = public.current_profile_id());

-- --- Backfill 3 thẻ mặc định cho seller hiện có --------------------------
-- Chỉ seller chưa có thẻ nào. Read path KHÔNG seed (xem PLAN §1.5).
INSERT INTO public.shop_the_khach (id_nguoi_ban, ten, slug, mau, thu_tu, mac_dinh)
SELECT u.id, d.ten, d.slug, d.mau, d.thu_tu, true
FROM public.user_nguoi_dung u
CROSS JOIN (VALUES
  ('Đã chuyển tiền',   'da-chuyen-tien',   '#15803d', 0),
  ('Chưa chuyển tiền', 'chua-chuyen-tien', '#b45309', 1),
  ('Ship',             'ship',             '#1f74c9', 2)
) AS d(ten, slug, mau, thu_tu)
WHERE u.ban_hang_bat = true
  AND NOT EXISTS (
    SELECT 1 FROM public.shop_the_khach t WHERE t.id_nguoi_ban = u.id
  );
```

`id_nguoi_ban` **denormalize** trên `shop_the_khach_gan` là cố ý: policy 1 điều kiện, không cần subquery sang `shop_the_khach`; và index `(id_nguoi_ban, id_nguoi_mua)` phục vụ query batch theo danh sách buyer.

### 2.3 Runner

- `scripts/run-shop-the-khach-migration.mjs` — copy `scripts/run-shop-ban-hang-migration.mjs` (validate project ref `ospzzzxcomrmhqrnkoiw`, `db.unsafe(sqlText)`).
- `package.json` → `"migrate:shop-the-khach": "node scripts/run-shop-the-khach-migration.mjs"`.

### 2.4 Constants

`lib/chat/constants.ts` (hoặc `lib/shop/constants.ts` nếu có):

```ts
/** Số thẻ phân loại khách hàng tối đa mỗi shop. */
export const MAX_SHOP_CUSTOMER_TAGS = 20;
```

---

## 3. Backend / lib

### 3.1 `lib/shop/khach-hang.ts` (mới, `import "server-only"`)

```ts
export type ShopKhachHangTag = {
  id: string; ten: string; slug: string; mau: string | null;
  thuTu: number; macDinh: boolean;
};

export type ShopKhachHang = {
  buyerId: string;
  soDon: number;          // đếm đơn hợp lệ (loại 'nhap')
  donGanNhatLuc: string;  // MAX(tao_luc)
  chiDonHuy: boolean;     // mọi đơn đều 'huy' → hiện nhạt
  tagIds: string[];
};
```

Hàm:

| Hàm | Việc |
|---|---|
| `listShopKhachHang(sellerId)` | `shop_don_hang` → group theo `id_nguoi_mua` (`id_nguoi_ban = sellerId`, `trang_thai <> 'nhap'`) + join `shop_the_khach_gan` → `Map<buyerId, ShopKhachHang>` |
| `listShopKhachHangTags(sellerId)` | đọc `shop_the_khach` theo `thu_tu, tao_luc`. **Không seed** — rỗng thì trả rỗng |
| `seedShopKhachHangTagsIfEmpty(sellerId)` | insert 3 thẻ mặc định nếu seller chưa có thẻ nào. Gọi từ `setBanHangEnabled(id, true)` — **không** gọi ở read path |
| `createShopKhachHangTag(sellerId, ten, mau?)` | validate ≤40 ký tự, slug unique per seller, giới hạn `MAX_SHOP_CUSTOMER_TAGS`, màu qua `pickRoomTagColor` nếu không truyền |
| `updateShopKhachHangTag(sellerId, tagId, {ten?, mau?})` | đổi tên/màu (kể cả `mac_dinh`) |
| `deleteShopKhachHangTag(sellerId, tagId)` | xóa tự do (kể cả `mac_dinh`); cascade xóa `_gan` |
| `setShopKhachHangTags(sellerId, buyerId, tagIds)` | verify mọi `tagId` thuộc seller **và** buyerId thật là khách của seller → delete-then-insert theo cặp (giống `setMessageTags`) |

Tái dùng: `pickRoomTagColor`, `resolveRoomTagColor`, `roomTagChipStyle` từ `lib/chat/tag-colors.ts` (không phải server-only) — **không** tạo palette mới.
`slugifyTagName` đang là hàm private trong `lib/chat/room-tags.ts` → **tách ra** `lib/chat/tag-colors.ts` (hoặc `lib/text/slug.ts` nếu đã có) và dùng chung; không copy-paste.

Mọi hàm dùng `createServiceRoleClient()` + kiểm quyền trong application code (chuẩn repo); RLS là lớp chặn cho client trực tiếp.

### 3.2 Nhúng vào thread payload — `lib/chat/org-message.ts:1376` `listAllChatThreads`

```ts
export async function listAllChatThreads(viewerId: string): Promise<ChatThread[]> {
  const [direct, group, org, khach] = await Promise.all([
    listDirectThreads(viewerId),
    listGroupThreads(viewerId),
    listOrgThreadsForUser(viewerId),
    loadKhachHangOverlay(viewerId), // null nếu ban_hang_bat = false
  ]);
  const merged = [...direct, ...group, ...org];
  if (khach) applyKhachHangOverlay(merged, khach); // set isKhachHang + khachHangTagIds
  merged.sort(...);
  return merged;
}
```

`loadKhachHangOverlay(viewerId)`:
1. `getBanHangEnabled(viewerId)` → false thì **return null ngay** (0 query thêm cho user thường).
2. `listShopKhachHang(viewerId)` → Map theo buyerId.

`applyKhachHangOverlay`: với thread `kind === "user" && !isGroup && !isSelf && peerUserId` có trong Map → gán:

```ts
// lib/chat/types.ts — thêm vào ChatThread
/** Viewer là seller và peer đã mua hàng của viewer (chỉ seller thấy). */
isKhachHang?: boolean;
/** Số đơn + đơn gần nhất — tooltip/sort tab Khách hàng. */
khachHangSoDon?: number;
/** Thẻ phân loại do seller gán (server chỉ trả cho seller). */
khachHangTagIds?: string[];
```

**Bất biến bảo mật:** overlay chỉ được áp cho `viewerId === sellerId`. `listAllChatThreads` luôn được gọi với viewer hiện tại (`app/api/chat/threads/route.ts:6`) → an toàn; ghi comment cảnh báo tại chỗ để không ai reuse sai.

### 3.3 API routes

| Route | Method | Body / Query | Trả về |
|---|---|---|---|
| `app/api/shop/khach-hang/the/route.ts` | `GET` | — | `{ enabled: boolean, tags: ShopKhachHangTag[] }` (không seed) |
| ↑ | `POST` | `{ ten, mau? }` | `{ tag }` |
| `app/api/shop/khach-hang/the/[tagId]/route.ts` | `PATCH` | `{ ten?, mau? }` | `{ tag }` |
| ↑ | `DELETE` | — | `{ ok: true }` |
| `app/api/shop/khach-hang/[buyerId]/the/route.ts` | `PUT` | `{ tagIds: string[] }` | `{ tagIds }` |

Chuẩn mọi route: `getCurrentSessionAndProfile()` → 401; `getBanHangEnabled()` → 403 `"Chưa bật bán hàng."`; validate input; trả `{ error }` tiếng Việt.

**Không** cần `GET /api/shop/khach-hang` (danh sách khách) ở Phase 1 — danh sách khách đã đi kèm `/api/chat/threads` qua overlay. Chỉ cần khi làm Phase 2 (khách chưa có phòng).

---

## 4. Frontend

### 4.1 `lib/chat/types.ts`

- Thêm `ChatThreadView`, `CHAT_THREAD_VIEW_ORDER`, `CHAT_THREAD_VIEW_LABEL` (`khach_hang: "Khách hàng"`).
- Thêm 3 field `isKhachHang` / `khachHangSoDon` / `khachHangTagIds` vào `ChatThread`.
- `lib/chat/chat-mock-data.ts` có type trùng tên — kiểm tra còn dùng không, **không** sửa nếu là dead code.

### 4.2 `components/cins/CinsChatOverlay.tsx`

| Việc | Vị trí |
|---|---|
| `activeTab` → `useState<ChatThreadView>` | ~952 |
| Render tabs từ `CHAT_THREAD_VIEW_ORDER`, **ẩn** `khach_hang` khi không phải seller | 3702–3724 |
| `filtered` useMemo: nhánh `khach_hang` (`t.isKhachHang`), giữ nguyên các nhánh cũ; **bỏ** sub-filter Bạn bè khi ở tab này | 1303–1333 |
| Sort tab Khách hàng: mặc định `lastAt DESC` (nhất quán); **không** nest project | 1319+ |
| `tabUnread` → `Record<ChatThreadView, number>` | 1356–1366 |
| Filter thẻ trong tab Khách hàng: hàng chip màu (giống `.cins-chat-banbe-filters`) — multi-select AND/OR → chọn **OR** | dưới tabs |
| Thẻ «Khách hàng» + chip thẻ trên header hội thoại | 3846–3861 |
| Nút mở popover chọn thẻ trong `.cins-chat-convo-actions` (chỉ khi `active.isKhachHang`) | 3888 |
| Tồn tại `khachHangTags` state + fetch `/api/shop/khach-hang/the` lazy (khi mở tab hoặc mở popover lần đầu) | cạnh các fetch khác |
| Optimistic update `khachHangTagIds` khi gán thẻ, rollback nếu API lỗi | — |

Seller flag: dùng `useShopReadyGate()` (`lib/shop/use-shop-ready-gate.ts`) — nhưng chỉ cần `banHangBat`, không cần `shopReady`. Nếu hook không expose riêng → đọc `banHangBat` từ response `/api/user/ban-hang` mà hook đã fetch (không thêm request mới).

### 4.3 Component mới

| Component | File | Việc |
|---|---|---|
| `ChatKhachHangTagPopover` | `components/cins/ChatKhachHangTagPopover.tsx` | Checkbox list thẻ + màu · tạo thẻ mới (input tên + picker 12 màu `ROOM_TAG_COLOR_PALETTE`) · đổi tên/màu · xóa (ẩn nút với `mac_dinh`) |
| (tùy) `ChatKhachHangBadge` | inline trong overlay | `<span className="cins-chat-kind-pill is-khach">Khách hàng</span>` — đủ nhỏ, để inline cạnh `ChatKindPill` |

### 4.4 `ChatThreadRow` (~747–786)

- Badge «Khách hàng» cạnh `.cins-chat-thread-name` (chỉ khi `thread.isKhachHang`).
- Chip thẻ (tối đa 2 + `+N`) ở `.cins-chat-thread-top` hoặc dòng preview — **không** đẩy chiều cao row (đang 62px); nếu chật thì chỉ hiện **dot màu** trong list và full chip ở header.

### 4.5 CSS — `app/cins-chat-overlay.css`

- `.cins-chat-kind-pill.is-khach` — dùng `--cins-orange` soft (phân biệt `is-org` xanh).
- `.cins-chat-thread-tag-dot`, `.cins-chat-khach-tag-chip` — style inline màu qua `roomTagChipStyle()`.
- `.cins-chat-khach-tag-popover` — theo pattern popover có sẵn.
- **4 tab** trên mobile: `.cins-chat-thread-tabs` (133–140) cần kiểm tràn — cho scroll ngang hoặc rút gọn label thành «Khách».

---

## 5. Steps (một phase / một brief)

| Step | Nội dung | File chạm | Verify |
|---|---|---|---|
| **0** | Xác thực DB (§2.1). Không viết code. | — | 4 query trả đúng |
| **1** | Migration (2 bảng + RLS + backfill) + runner + npm script + constants | `supabase/sql/migration_shop_the_khach.sql`, `scripts/run-shop-the-khach-migration.mjs`, `package.json`, `lib/chat/constants.ts` | `npm run migrate:shop-the-khach` 2 lần liên tiếp không lỗi (backfill không nhân đôi); 2 bảng + 2 policy tồn tại; seller hiện có đã có đúng 3 thẻ |
| **2** | `lib/shop/khach-hang.ts` + seed vào `setBanHangEnabled` + tách `slugifyTagName` dùng chung. **Không UI.** | `lib/shop/khach-hang.ts`, `lib/shop/settings.ts`, `lib/chat/room-tags.ts`, `lib/chat/tag-colors.ts` | `tsc` sạch; script tay: `listShopKhachHang(<sellerId thật>)` ra đúng số khách; bật bán hàng cho account test → có 3 thẻ |
| **3** | API routes (5 endpoint) | `app/api/shop/khach-hang/**` | curl: 401 khi chưa login · 403 khi `ban_hang_bat=false` · POST/PATCH/DELETE/PUT · xóa hết thẻ rồi GET lại → vẫn rỗng (không resurrect) |
| **4** | Overlay backend: types + `listAllChatThreads` overlay | `lib/chat/types.ts`, `lib/chat/org-message.ts` | `/api/chat/threads` với seller → thread của buyer có `isKhachHang: true`; với user thường → **không** có field và **không** query shop |
| **5** | UI tab «Khách hàng» + badge (chưa có popover) | `CinsChatOverlay.tsx`, `cins-chat-overlay.css` | Tab hiện với seller, ẩn với user thường; filter đúng; khách là bạn bè vẫn còn ở tab Bạn bè |
| **6** | Popover chọn/thêm/sửa/xóa thẻ + filter theo thẻ + empty state khi 0 thẻ | `ChatKhachHangTagPopover.tsx`, `CinsChatOverlay.tsx`, CSS | Gán thẻ → reload vẫn giữ; tạo thẻ màu mới; xóa được cả thẻ mặc định; login bằng account buyer → **không** thấy gì |
| **7** *(sau)* | Phase 2: khách chưa có phòng DM (thread `pending:`) | `lib/chat/optimistic-thread.ts`, overlay | Mở thread pending → tạo phòng thật |
| **8** | Cập nhật tài liệu (§9) | `docs/*` | — |

---

## 6. Edge cases

| Case | Xử lý |
|---|---|
| Seller tắt `ban_hang_bat` | Tab ẩn, overlay không chạy; **dữ liệu thẻ giữ nguyên** (bật lại là có). API trả 403. |
| Buyer cũng là seller (mua chéo nhau) | Hai chiều độc lập: mỗi bên thấy badge/thẻ của riêng mình. Không xung đột vì khóa `(id_nguoi_ban, id_nguoi_mua)`. |
| Tự mua hàng của mình (`id_nguoi_mua = id_nguoi_ban`) | Loại khỏi danh sách khách — thread `isSelf` không được gán badge. |
| Khách chỉ có đơn `nhap` | Không tính là khách. |
| Khách chỉ có đơn `huy` | Vẫn hiện, `chiDonHuy = true` → chip nhạt/`opacity`. (Nếu user muốn ẩn → 1 dòng filter.) |
| Khách là **nhóm**/org thread | Không bao giờ gán badge (chỉ DM `kind==="user"`). |
| Thread `pending:` (chưa có roomId thật) | Không gán badge cho tới khi có `peerUserId` khớp; popover disable. |
| Xóa thẻ đang gán | `ON DELETE CASCADE` xóa `_gan`; UI xóa optimistic khỏi mọi thread. Confirm trước khi xóa nếu thẻ đang gán cho ≥1 khách. |
| Shop xóa hết thẻ | Read path không seed → giữ rỗng, UI hiện empty state + «Thêm thẻ». |
| Trùng tên thẻ | Slug unique per seller → tự thêm `-2`; tên trùng vẫn cho (giống `chat_the_tai_nguyen`). |
| Vượt `MAX_SHOP_CUSTOMER_TAGS` | 400 `"Tối đa 20 thẻ."` |
| Màu không hợp lệ | `normalizeHex` reject → fallback `pickRoomTagColor`. |
| Buyer bị xóa account | `ON DELETE CASCADE` cả 2 bảng. |
| Đơn mới trong lúc chat mở | `/api/chat/threads` cache session (`lib/chat/chat-session-cache.ts`) → badge lỗi nhịp. Chấp nhận Phase 1; refresh khi mở tab Khách hàng (refetch threads) hoặc khi có notification đơn mới. |
| Shop có 5.000 khách | Query group-by có index; nhưng payload threads phình. Phase 1 giới hạn overlay theo threads đã có (bounded bởi số phòng DM). Phase 2 phải phân trang riêng — **không** nhét vào `/api/chat/threads`. |
| 4 tab tràn mobile | Scroll ngang hoặc label «Khách». |

---

## 7. Security & performance

**Security**

1. Buyer **không có RLS policy** trên cả 2 bảng → deny by default. Không có route nào trả thẻ cho non-owner.
2. Mọi endpoint: session → `ban_hang_bat` → filter `id_nguoi_ban = session.profile.id` trong **mọi** query (service-role bypass RLS, nên application check là lớp thật).
3. `setShopKhachHangTags` verify **cả hai**: tag thuộc seller **và** buyer là khách của seller → chống gán thẻ vào user bất kỳ (probing quan hệ).
4. `buyerId` từ URL param — validate UUID, không nội suy.
5. Overlay chỉ áp cho viewer = seller; comment cảnh báo trong `listAllChatThreads`.
6. Không log tên khách / `ma_don` ra console.

**Performance**

1. User thường: **0 query thêm** (`getBanHangEnabled` là 1 query nhỏ, có thể gộp — nếu đã có profile fetch chứa `ban_hang_bat` thì tái dùng, khỏi query).
2. Seller: +2 query (`shop_don_hang` group-by dùng `idx_shop_don_seller`; `shop_the_khach_gan` dùng `(id_nguoi_ban, id_nguoi_mua)`), chạy song song trong `Promise.all` sẵn có.
3. Thẻ (`/api/shop/khach-hang/the`) fetch **lazy** — chỉ khi mở tab Khách hàng hoặc popover.
4. Filter tab hoàn toàn **client-side** (giữ nguyên kiến trúc: API trả tất cả threads, tab không refetch).
5. Không thêm realtime channel mới.

---

## 8. Đã chốt với user (2026-08-02)

| Câu | Chốt |
|---|---|
| Loại trừ «Đã / Chưa chuyển tiền» | **Không** — multi-select tự do, shop tự quản. Không thêm cột `nhom_loai_tru`. |
| Xóa 3 thẻ mặc định | **Cho xóa** tự do → seed chuyển sang write path (§1.5), read path không seed. |
| Người chỉ có đơn `huy` | **Vẫn hiện**, chip nhạt (`chiDonHuy = true`). |
| Khách chưa từng chat | **Phase 2** — Phase 1 chỉ khách đã có phòng DM. |
| Nơi hiện thẻ | **Chỉ trong chat** — không đụng `/cua-hang` phase này. |

---

## 9. Tài liệu cần cập nhật khi build xong

| File | Mục |
|---|---|
| `docs/CINS_IMPLEMENTATION.md` | §3 danh mục migration (`migration_shop_the_khach.sql` + runner) · API `app/api/shop/khach-hang/**` · lib `lib/shop/khach-hang.ts` · ghi chú chat overlay tab Khách hàng |
| `docs/CINS_DECISIONS.md` | LOG 2026-08-02: «Khách hàng» là chiều phụ không phải `ChatThreadGroup`; không reuse `chat_the_tai_nguyen` (RLS member đọc được → lộ thẻ cho khách); seed 3 thẻ ở write path để xóa được vĩnh viễn; 5 câu chốt ở §8 |
| `docs/CINS_INSTRUCTION.md` | Số bảng neo (+2) · dòng «Thay đổi lớn gần đây» |
| `docs/CINS_FOUNDATIONS.md` | Chỉ nếu chốt quy tắc mới về dữ liệu «chỉ seller thấy» |
