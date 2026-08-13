# PLAN — Người mua hủy đơn + shop nhờ khách hủy

> **Trạng thái:** ĐÃ BUILD 2026-08-13 · **Ngày plan:** 2026-08-13 · **Model plan:** Opus 5 (Medium)
> **Build đề xuất:** Grok 4.5 (Medium) — chạm DB (ALTER) + API + lib + 3–5 file UI.
> Liên quan: `CINS_DECISIONS.md` (L33 shop UGC), `CINS_IMPLEMENTATION.md` §API shop, `docs/PLAN_shop_combo_voucher.md`.

---

## 1. Vấn đề & hiện trạng

Người mua **không có cách hủy đơn**. Hủy đơn hiện chỉ:

| Ai | Trạng thái cho phép | Đường đi |
|---|---|---|
| Seller | `cho_xac_nhan` → `huy` | `cancelDonHang` (`lib/shop/don-hang.ts:1256`) ← `PATCH /api/shop/don/[id]` `action:"huy"` |
| Seller | `cho_lay_hang` \| `dang_giao` → `hoan_tra` | `hoanTraDonHang` (`:1189`) |

Hệ quả thực tế (case user nêu): shop hết hàng sau khi **đã nhận tiền** (`da_nhan_tien`) → không ai đóng được đơn. Seller không tự hủy được (chặn state), buyer cũng không. Đơn treo tới khi tự đóng (`hoan_thanh`) → sai bản chất + phát sinh phí nền tảng cho đơn không giao.

Đã có mảnh sẵn nhưng chưa nối:

- `donCapNhatPayload` đã suy `boi: "nguoi_mua"` (`don-hang.ts:1314`).
- Chat đã có copy «Người mua đã hủy đơn» (`lib/chat/don-cap-nhat.ts:57`) — **dead code** vì buyer chưa hủy được bao giờ.
- Preset lý do seller có dòng «Người mua yêu cầu hủy» (`ShopDonDetailModal.tsx:37`) — chỉ là text, không phải flow.

---

## 2. Quyết định thiết kế (cần user chốt — §8)

### 2.1 Hai đường hủy tách biệt theo «tiền đã sang tay chưa»

| Đường | Trạng thái | Ai bấm | Cần đối phương đồng ý? | Kết quả |
|---|---|---|---|---|
| **A. Buyer tự hủy** | `cho_xac_nhan` | Buyer | Không | `huy`, `huy_boi = buyerId` |
| **B. Shop nhờ khách hủy** | `da_nhan_tien` | Shop yêu cầu → Buyer đồng ý | **Có** (buyer là người bấm hủy) | `huy`, `huy_boi = buyerId`, `ly_do_huy` = lý do shop nêu |

**Vì sao B không để shop tự hủy?** Ở `da_nhan_tien` shop **đã cầm tiền** (CINs không giữ tiền — quy tắc L33). Nếu shop tự hủy đơn phương, buyer mất bằng chứng đơn còn hiệu lực khi tiền chưa được hoàn. Bắt buộc buyer là người bấm hủy = buyer xác nhận đã dàn xếp xong. Đây đúng ý user: *shop nhắn nhờ khách hủy*.

**Vì sao B không dùng `hoan_tra`?** `hoan_tra` mang nghĩa «đã gửi, hàng quay về» (`cho_lay_hang`/`dang_giao`). Ở `da_nhan_tien` hàng chưa rời shop → `huy` + restock đúng ngữ nghĩa hơn.

### 2.2 Không cho buyer tự hủy sau `da_nhan_tien`

Buyer đơn phương hủy khi shop đã đóng gói/đã nhận tiền → shop lỗ công + nguy cơ abuse. Sau `da_nhan_tien` buyer muốn hủy thì **chat với shop** (shop bấm «Nhờ khách hủy» → buyer đồng ý), hoặc dùng **khiếu nại** (`shop_khieu_nai`) nếu shop im lặng. Không mở đường mới cho tranh chấp.

### 2.3 `dang_giao` / `cho_lay_hang` / `da_giao_tai_su_kien`: không hủy

Hàng đã rời shop → seller dùng `hoan_tra` (đã có). Không thêm gì.

### 2.4 Yêu cầu hủy lưu ở DB, không chỉ ở chat

Cần state bền: buyer phải thấy yêu cầu cả ở modal đơn / lịch sử mua (`ShopMuaHistory.tsx`), không chỉ trong bubble chat (tin có thể bị xóa/lướt qua). → **ALTER `shop_don_hang` thêm 3 cột nullable** (§3). Phương án zero-migration (chỉ lưu trong `chat_tin_nhan.ngu_canh`) bị loại vì mất state khi tin bị xóa và không query được.

### 2.5 Tái dùng card đơn trong chat, KHÔNG thêm `loai` tin mới

Thêm một `ChatContextLoai` mới (kiểu `shop_don_khao_sat`) tốn ~10 file (`lib/chat/types.ts`, `realtime.ts`, `direct-message.ts`, `optimistic-message.ts`, `message-perspective.ts`, `message-action-capabilities.ts`, `forward-message-client.ts`, `ChatMessageThreadItems.tsx`, `ChatMessageBody.tsx`, parser riêng). Thay vào đó: **bump card `don_hang` đã có** + thêm field `yeuCauHuy` vào `ngu_canh` — dùng lại `bumpDonHangChatMessage` (`:1340`), realtime đã coi UPDATE card `don_hang` như tin mới (`CinsChatProvider.tsx:603`). Rẻ hơn ~1 file UI.

---

## 3. Database

### 3.1 ALTER `shop_don_hang` — **cần user xác nhận trước** (Rule 6, DEV_RULES §1)

Additive, nullable, không đụng cột cũ, không đổi enum:

| Cột | Type | Ý nghĩa |
|---|---|---|
| `yeu_cau_huy_luc` | `timestamptz` | Lúc shop gửi yêu cầu hủy (null = không có yêu cầu) |
| `yeu_cau_huy_ly_do` | `text` | Lý do shop nêu (≤ `SHOP_LY_DO_HUY_MAX` = 300) |
| `yeu_cau_huy_boi` | `uuid` | Actor gửi yêu cầu (= `id_nguoi_ban`; để mở nếu sau này admin/hệ thống gửi) |

File: `supabase/sql/migration_shop_don_yeu_cau_huy.sql` + script `migrate:shop-don-yeu-cau-huy` trong `package.json` (theo pattern `migration_shop_don_huy.sql`).

Index: **không cần** — luôn truy vấn theo `id` đơn.

### 3.2 Enum

Không đổi. `trang_thai` vẫn 9 value; buyer hủy dùng `huy` sẵn có.

### 3.3 RLS

Không đổi. Policy hiện có: SELECT cho buyer+seller, UPDATE policy tồn tại nhưng **app không dùng** — mọi mutation qua service-role trong lib + authz ở API. Giữ nguyên nguyên tắc đó.

### 3.4 Không thêm bảng log

Lịch sử suy từ `huy_luc`/`huy_boi`/`ly_do_huy` + `yeu_cau_huy_*` + `capNhat` trong chat, giống các trạng thái khác.

---

## 4. Lib (`lib/shop/don-hang.ts`)

### 4.1 Tách `applyCancel` dùng chung

Rút phần thân `cancelDonHang` (update có điều kiện → restock → `hoanVoucherChoDon` → bump chat) thành internal `applyCancel(don, actorId, lyDo, allowed: ShopTrangThaiDon[])`, dùng `.in("trang_thai", allowed)` làm cửa đua (giống `applyHoanTra:1225`). Giữ nguyên tính idempotent: chỉ winner restock.

Bổ sung trong `applyCancel`: khi state trước khi hủy là `da_nhan_tien` → gọi `loaiTruPhiDong(don.id, reason)` trong `try/catch` (đơn có thể đã ghi phí nếu từng hoàn thành → loại trừ; no-op nếu chưa có). Cùng cách `applyHoanTra:1231`.

Ngoài ra: clear `yeu_cau_huy_*` = null và reset khảo sát (`hoan_khao_sat_den = null`) trong patch hủy để `tickDongDonShop` không bám đơn đã hủy (thực tế `OPEN_TT` đã loại `huy` — làm cho sạch dữ liệu).

### 4.2 Hàm mới

| Hàm | Signature | Luật |
|---|---|---|
| `cancelDonHang` | *(giữ nguyên)* seller, `cho_xac_nhan` | → `applyCancel(..., ["cho_xac_nhan"])` |
| `yeuCauHuyDonHang` | `(actorId, donId, lyDo: string) => Promise<ShopDonHang>` | `idNguoiBan === actorId`; state `da_nhan_tien`; `lyDo` bắt buộc (trim, ≤300); set `yeu_cau_huy_*`; bump chat; `insertSocialThongBao` cho buyer |
| `huyYeuCauHuyDonHang` | `(actorId, donId)` | Seller rút lại yêu cầu → set 3 cột = null + bump chat |
| `cancelDonHangByBuyer` | `(actorId, donId, lyDo?: string \| null)` | `idNguoiMua === actorId`; **`cho_xac_nhan`** → lý do buyer nhập (bắt buộc); **`da_nhan_tien`** → chỉ khi `yeuCauHuyLuc != null`, lý do mặc định = `yeu_cau_huy_ly_do` (prefix `"Shop yêu cầu hủy: "`); state khác → `INVALID_STATE`; `insertSocialThongBao` cho seller |

Lỗi ném ra (giữ vocabulary hiện có): `NOT_FOUND`, `FORBIDDEN`, `INVALID_STATE`, `REASON_REQUIRED`, `UPDATE_FAILED`, + mới **`NEED_SHOP_REQUEST`** (buyer bấm hủy ở `da_nhan_tien` mà shop chưa yêu cầu).

### 4.3 Chống abuse — **không làm ở phase này** (user chốt 2026-08-13)

Buyer tự hủy `cho_xac_nhan` không giới hạn số lần. Nếu sau này thấy spam: đếm `huy` có `huy_boi = buyerId` trong 24h + ném `TOO_MANY_CANCELS` (→ 429). Ghi lại ở đây để không phải thiết kế lại.

### 4.4 Chat context (`donHangToChatContext:1446`)

Thêm khi `yeuCauHuyLuc != null` và `trangThai === "da_nhan_tien"`:

- vào `moTa`: `"Shop đề nghị hủy đơn: <lý do>"` + `"Người mua bấm Đồng ý hủy để đóng đơn."` (tin nhắn preview/search vẫn thấy).
- field mới `yeuCauHuy: { lyDo, luc }` trong return → `ngu_canh.yeuCauHuy` (card render nút).

`donCapNhatPayload`: không đổi (đã tự suy `boi: "nguoi_mua"`).

### 4.5 Types

`lib/shop/types.ts`: thêm `yeuCauHuyLuc`, `yeuCauHuyLyDo`, `yeuCauHuyBoi` vào `ShopDonHang` + 3 cột vào `DON_SELECT` (`don-hang.ts:102`) + mapper row→object.

`lib/chat/types.ts`: `ChatContextCard.yeuCauHuy?: { lyDo: string | null; luc: string | null } | null`.

---

## 5. API — `PATCH /api/shop/don/[id]`

Thêm 3 action vào switch hiện có (`route.ts:82-135`), giữ shape `{ don, chatContext }`:

| `action` | Body | Ai | Validate |
|---|---|---|---|
| `yeu_cau_huy` | `{ lyDo }` | Seller | `lyDo` trim, slice 300, rỗng → **422** «Cần nêu lý do nhờ khách hủy đơn.» |
| `bo_yeu_cau_huy` | — | Seller | — |
| `buyer_huy` | `{ lyDo? }` | Buyer | `cho_xac_nhan` → `lyDo` bắt buộc (422 nếu rỗng); `da_nhan_tien` → `lyDo` optional |

Map lỗi mới trong catch:

- `NEED_SHOP_REQUEST` → **422** «Đơn đã được shop xác nhận — nhờ shop gửi yêu cầu hủy trong chat trước.»
- `REASON_REQUIRED` → **422** «Cần nhập lý do hủy đơn.»

Các lỗi cũ (`FORBIDDEN` 403, `NOT_FOUND` 404, `INVALID_STATE` 422) dùng lại nguyên xi.

**GET** `/api/shop/don/[id]`: `don` tự có 3 cột mới (qua `DON_SELECT`) → không cần đổi. Thêm vào block `dongDon` (hoặc top-level) cờ tiện cho UI: `coTheHuy: { buyer: boolean, canYeuCau: boolean }` — **optional**, UI tự suy được từ `trangThai` + `yeuCauHuyLuc`; ưu tiên **không thêm** để giảm bề mặt.

Không `revalidatePath` (đúng như các action đơn khác); client gọi `invalidateDonCaches()`.

---

## 6. Frontend

| File | Thay đổi |
|---|---|
`components/shop/ShopDonDetailModal.tsx` | (a) **Seller**, `da_nhan_tien`: nút «Nhờ khách hủy đơn» → panel lý do (preset: *Hết hàng* · *Sai giá / sai mẫu* · *Không giao được tới địa chỉ*) → `yeu_cau_huy`; nếu đã gửi → banner «Đã gửi yêu cầu hủy — chờ người mua» + «Rút lại». (b) **Buyer**, `cho_xac_nhan`: nút «Hủy đơn» + panel lý do riêng (preset: *Đặt nhầm* · *Đổi ý* · *Tìm được chỗ khác* · *Shop nhờ hủy*) → `buyer_huy`; hint đỏ nếu `bienLaiAnhUrl` có: «Bạn đã gửi biên lai — nếu shop đã nhận tiền, tự liên hệ shop để nhận lại. CINs không giữ tiền.» (c) **Buyer**, `da_nhan_tien` + `yeuCauHuyLuc`: banner «Shop đề nghị hủy đơn: …» + «Đồng ý hủy» / «Không hủy» (Không hủy = đóng banner client-side, không API). Tái dùng class `shop-don-detail-huy*` có sẵn.
`components/cins/ChatDonHangCard.tsx` | Banner + nút inline khi `ngu_canh.yeuCauHuy` và viewer là buyer (`don.idNguoiMua === viewerId`, card đã fetch đơn live ở `:165-192`): «Đồng ý hủy đơn» → `buyer_huy`; sau khi hủy set state local để card đổi sang trạng thái hủy (bump chat sẽ đồng bộ lại). Đây là điểm chạm chính user yêu cầu — nút nằm ngay trong bubble.
`components/shop/ShopMuaHistory.tsx` | Badge «Shop đề nghị hủy» cho đơn có `yeuCauHuyLuc`; mở modal để xử lý (không nhân bản logic hủy).
`components/shop/ShopDonClient.tsx` | Dashboard seller: thêm «Nhờ khách hủy» vào `donActOptions` cho `da_nhan_tien` (mở modal thay vì act trực tiếp — cần lý do). Optional, có thể để Phase 2.
`lib/chat/don-cap-nhat.ts` | Không đổi logic; kiểm lại `donCapNhatTieuDe` cho `huy` — nhánh `boi === "nguoi_mua"` giờ mới thực sự chạy (seller thấy «Người mua đã hủy đơn», buyer thấy «Bạn đã hủy đơn này»). ✅ đã đúng sẵn.
CSS | `components/shop/shop-don-detail-modal.css` (banner yêu cầu hủy) + `app/cins-chat-overlay.css` block `cins-chat-don-card-*` (banner + hàng nút trong card). Dùng token CINS sẵn có, không hệ màu mới.

State management: giữ pattern hiện tại — `useState` cục bộ + `invalidateDonCaches()` + `onDonChange` callback. Không thêm store.

---

## 7. Thứ tự triển khai (mỗi bước 1 brief)

1. **DB + lib** — migration 3 cột; `DON_SELECT` + type + mapper; tách `applyCancel`; `cancelDonHangByBuyer`, `yeuCauHuyDonHang`, `huyYeuCauHuyDonHang`; `donHangToChatContext.yeuCauHuy`. *(no UI)*
2. **API** — 3 action + map lỗi mới. Verify bằng curl/Thunder trên đơn thật ở `cho_xac_nhan` và `da_nhan_tien`.
3. **Modal** — buyer hủy + seller yêu cầu + banner (`ShopDonDetailModal` + CSS).
4. **Chat card** — banner + nút «Đồng ý hủy» trong bubble (`ChatDonHangCard` + CSS overlay).
5. **Polish** — badge `ShopMuaHistory`, action dashboard seller, thông báo `social_thong_bao` hai chiều.

---

## 8. Quyết định đã chốt (user, 2026-08-13)

1. **ALTER 3 cột `yeu_cau_huy_*`** trên `shop_don_hang` — ✅ **được duyệt** (nullable, additive). Ghi inventory ALTER vào `CINS_DECISIONS.md` khi build.
2. **Buyer tự hủy ở `cho_xac_nhan`** — ✅ **không cần shop đồng ý**, không giới hạn thời gian.
3. **Scope tối thiểu** — ❌ không làm ở phase này: chiều buyer chủ động xin hủy đơn `da_nhan_tien`; checkbox «đã nhận lại tiền»; guard 5 đơn/24h. Giữ lại trong §4.3 + §13 làm backlog.

---

## 9. Edge cases

| Tình huống | Xử lý |
|---|---|
| Buyer bấm hủy đúng lúc seller bấm xác nhận | Cửa đua `.in("trang_thai", allowed)` — người thua nhận `INVALID_STATE` (422), UI reload đơn. Chỉ winner restock (đã có ở `cancelDonHang`). |
| Gọi `buyer_huy` hai lần (double click / retry) | Lần 2 không match state → `INVALID_STATE`; không double restock, không double `hoanVoucherChoDon`. |
| Shop yêu cầu hủy → buyer im lặng | Đơn tiếp tục pipeline khảo sát/tự đóng như cũ. **Không** auto-hủy (nền tảng không tự hủy — `types.ts:10`). Cân nhắc nhắc lại qua thông báo ở Phase 2. |
| Shop yêu cầu hủy → rồi tự cập nhật vận đơn (có hàng lại) | `capNhatVanChuyenDonHang` nên clear `yeu_cau_huy_*` (đơn sang `dang_giao`), tránh banner mồ côi. Ghi rõ trong Step 1. |
| Đơn có khiếu nại đang mở | Chặn hủy → `INVALID_STATE` với message riêng «Đơn đang khiếu nại — chờ admin xử lý.» Kiểm qua `shop_khieu_nai` theo `id_don_hang` + trạng thái mở. |
| Đã ghi phí nền tảng (đơn từng hoàn thành rồi rollback) | `loaiTruPhiDong` trong `applyCancel` (try/catch, không chặn hủy). |
| Voucher đã dùng | `hoanVoucherChoDon` đã có trong đường hủy — dùng lại nguyên. |
| Kho: `da_tru_kho = false` (đơn `dat_truoc` chưa trừ) | `applyCancel` chỉ restock khi `don.daTruKho` — logic sẵn, đúng. |
| Card chat của đơn đã bị xóa | `bumpDonHangChatMessage` fallback `notifySellerDonHangChat` — đã có (`:1364`). |
| Buyer hủy khi shop bị khóa/`gate` | Không liên quan — hủy giảm số đơn mở, chỉ giúp `gate.ts`. |
| `lyDo` chứa ký tự lạ / quá dài | Trim + `slice(0, SHOP_LY_DO_HUY_MAX)` ở API (đã là pattern hiện có), không render HTML thô. |

---

## 10. Security

- **Auth:** mọi action qua `getCurrentSessionAndProfile()`; actorId **luôn** lấy từ session, không nhận từ body.
- **Authz:** check trong lib (`idNguoiMua`/`idNguoiBan` vs actorId) — không tin client `viewerRole`. Buyer không thể gọi `yeu_cau_huy`, seller không thể gọi `buyer_huy` (403 `FORBIDDEN`).
- **Data isolation:** service-role client chỉ trong `lib/shop/*` (`server-only`); mọi mutation kèm `.eq("id", donId)` + điều kiện state; RLS giữ nguyên cho đường đọc trực tiếp.
- **Input:** `lyDo` trim + cắt 300 (`SHOP_LY_DO_HUY_MAX`); action là whitelist string literal; không có field free-form nào ghi thẳng vào DB ngoài `lyDo`.
- **Rate/abuse:** phase này không giới hạn số lần (§4.3); `NEED_SHOP_REQUEST` là rào chính — buyer không tự hủy được đơn shop đã nhận tiền.
- **Không rò rỉ:** thông báo lỗi không tiết lộ thông tin đơn của người khác; `NOT_FOUND` dùng chung cho «không tồn tại» và «không phải đơn của bạn» ở đường GET (đã đúng: 403 khi không thuộc đơn).

---

## 11. Verify sau build

1. Đơn `cho_xac_nhan`: buyer hủy → trạng thái `huy`, kho hoàn (kiểm `shop_bien_the.ton_kho`), voucher hoàn, chat card đổi sang «Người mua đã hủy đơn» phía shop / «Bạn đã hủy đơn này» phía buyer.
2. Đơn `da_nhan_tien`: buyer bấm hủy khi **chưa** có yêu cầu → 422 đúng message.
3. Shop bấm «Nhờ khách hủy» → buyer thấy banner trong bubble chat (realtime, không F5) + trong modal + badge lịch sử mua.
4. Buyer «Đồng ý hủy» → `huy`, `huy_boi = buyerId`, `ly_do_huy` chứa lý do shop, kho hoàn, `shop_phi_dong` không phát sinh.
5. Shop «Rút lại yêu cầu» → banner mất ở cả 2 phía.
6. Double-click «Đồng ý hủy» → 1 lần thành công, 1 lần 422, kho **không** hoàn 2 lần.
7. Seller vẫn hủy được đơn `cho_xac_nhan` như cũ (không regression).

---

## 12. Cập nhật tài liệu sau khi build

- `CINS_IMPLEMENTATION.md` → §API shop: 3 action mới + file migration.
- `CINS_DECISIONS.md` → LOG: quyết định «buyer hủy `cho_xac_nhan` đơn phương; `da_nhan_tien` cần shop yêu cầu» + inventory ALTER 3 cột.
- `docs/CINS_INSTRUCTION.md` → dòng «Thay đổi lớn gần đây» nếu user muốn.

---

## 13. Backlog (đã bàn, chưa làm)

- Buyer chủ động **xin hủy** đơn `da_nhan_tien` → shop đồng ý (chiều ngược của §2.1B). Hiện buyer dùng chat text hoặc khiếu nại.
- Checkbox «tôi đã nhận lại tiền» khi buyer đồng ý hủy, lưu vào `ly_do_huy` để làm bằng chứng khi tranh chấp.
- Guard chống abuse buyer hủy nhiều đơn/24h (§4.3).
- Nhắc lại yêu cầu hủy nếu buyer im lặng quá N ngày (thông báo, **không** auto-hủy).
