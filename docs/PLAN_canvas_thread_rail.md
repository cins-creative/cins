# PLAN — Rail hội thoại thu gọn ở chế độ Canvas

> Mục tiêu: Khi mở **Canvas** trong chat, thay vì ẩn hẳn danh sách hội thoại, hiển thị một **rail hẹp** (avatar + tên rút gọn + badge chưa đọc) ở mép trái để **thấy thông báo** và **chuyển hội thoại nhanh** mà không cần tắt canvas.

## Bối cảnh / hiện trạng

- Layout desktop: `aside.cins-chat-list` → `div.cins-chat-main` ( `cins-chat-convo` + `aside.cins-chat-side.is-canvas` ).
- Khi bật canvas, `section.cins-chat-panel` nhận class `has-canvas`. CSS hiện tại:
  ```css
  .cins-chat-panel.has-canvas .cins-chat-list { display: none; }   /* app/cins-chat-overlay.css:3177 */
  ```
  → Danh sách bị **ẩn hoàn toàn** ⇒ không nhảy hội thoại khác được.
- Bố cục mong muốn (desktop rộng): `[rail ~72px] [convo ~360px] [canvas co giãn]`.
- Mỗi thread item (`components/cins/CinsChatOverlay.tsx` ~L754+) đã có sẵn:
  - Avatar: `ChatAvatar` / `ChatGroupAvatar` / self-avatar.
  - Tên: `.cins-chat-thread-name > strong[title=rowName]`.
  - Badge: `.cins-chat-unread`, `.cins-chat-mention-badge`.
  - Phần ẩn ở rail: `.cins-chat-thread-preview`, `time`, `.cins-chat-thread-badges` (giữ badge nhưng đặt lại vị trí).
- `.cins-chat-list` đã có `container-type: inline-size; container-name: cins-chat-list` ⇒ style theo bề rộng thuận lợi.

## Database
- Không đổi. Không đụng schema/SSOT.

## API
- Không đổi. Rail dùng đúng dữ liệu thread list đang có.

## Frontend

### Quyết định UX đã chốt
- **Rail thu gọn + hover bung** — mô phỏng nav sidebar `.cins-app-sidebar` (64px → 240px khi `:hover`/`focus-within`, transition width, **overlay đè** canvas chứ không đẩy layout).
- **Project/tree**: hiển thị **phẳng** ở trạng thái thu gọn (mỗi hội thoại 1 avatar, bỏ indent/nhánh). Khi bung có thể hiện lại cấu trúc bình thường.
- **Tabs (Bạn bè / Mua bán…)**: thu gọn **ẩn tab**, chỉ hiện panel active; khi **bung** hiện lại tab switcher như bình thường.

### 1. Đánh dấu trạng thái rail (React)
File: `components/cins/CinsChatOverlay.tsx`
- Tại `aside.cins-chat-list` (~L4992), thêm class khi canvas mở:
  ```tsx
  className={`cins-chat-list${...} ${sidePanel === "canvas" ? " is-rail" : ""}`}
  ```
  - Dùng chính `sidePanel === "canvas"` (đã có sẵn) — không thêm state mới. Việc bung/thu là **CSS `:hover`/`:focus-within` thuần**, không cần state React (giống nav sidebar).

### 2. CSS rail (chính) — `app/cins-chat-overlay.css`
Thay khối `has-canvas .cins-chat-list { display:none }` bằng rail thu-gọn-hover-bung (desktop `@media (min-width:1024px)`):

- **Khung rail + hover bung (mô phỏng `.cins-app-sidebar`)**
  - Thu gọn: `.cins-chat-panel.has-canvas .cins-chat-list.is-rail { display:flex; width:72px; min-width:72px; max-width:72px; transition: width/min/max-width .26s ease; }`
  - Bung khi hover/focus: `.cins-chat-list.is-rail:hover, .cins-chat-list.is-rail:focus-within { width:300px; min-width:300px; max-width:300px; }`
  - **Overlay không đẩy canvas**: rail `position:absolute; inset-block:0; left:0; z-index` cao hơn convo/canvas; convo giữ nguyên vị trí (chừa 72px bằng padding-left/margin trên `cins-chat-main` hoặc để rail phủ mép trái). → Chốt cách chừa chỗ khi code (ưu tiên rail absolute + `cins-chat-main` có `padding-left:72px`).
- **Trạng thái THU GỌN (mặc định)** — dùng `:not(:hover):not(:focus-within)` hoặc biến hiển thị:
  - Item: `flex-direction: column; align-items:center; gap:2px; padding:6px 4px;`
  - Avatar canh giữa; tên `.cins-chat-thread-name strong` 1 dòng `font-size:10–11px; max-width:64px; ellipsis`.
  - Ẩn: `.cins-chat-thread-preview`, `time`, project toggle, org badge phụ, tab switcher, search.
  - Badge (`.cins-chat-unread`, `.cins-chat-mention-badge`): **overlay góc phải-trên avatar** (`position:absolute`) để luôn thấy thông báo.
  - Project child: bỏ nhánh/indent → phẳng.
  - `.cins-chat-thread.is-active`: nền/viền nổi bật (token CINS).
- **Trạng thái BUNG (hover/focus)**:
  - Trả layout item về bình thường (row ngang: avatar + tên + preview + time + badge phải).
  - Hiện lại tab switcher + search.
  - Badge trở lại vị trí thường.
- **Tooltip**: giữ `title={rowName}` để thu gọn vẫn xem được tên đầy đủ.

### 4. Responsive / mobile
- Giữ nguyên hành vi hiện tại ở `@media (max-width:1023.98px)` và `@container cins-chat-canvas-main (max-width:899.98px)`: panel hẹp vẫn **canvas full màn**, KHÔNG bật rail (tránh chiếm chỗ). Rail chỉ bật khi panel đủ rộng (desktop `/chat` fullscreen).
- Cần bảo đảm rule mới `is-rail` **không** ghi đè các rule mobile `display:none`/overlay canvas. Đặt selector rail trong nhánh desktop hoặc thêm `@media (min-width:1024px)`.

## Các bước triển khai
1. **Step 1 — React**: thêm class `is-rail` cho `.cins-chat-list` khi `sidePanel === "canvas"`. (1 dòng, `CinsChatOverlay.tsx`)
2. **Step 2 — Khung rail + hover bung**: đổi khối L3177; rail `absolute` 72px, `:hover/:focus-within` → 300px, transition; `cins-chat-main` chừa `padding-left:72px`. (`cins-chat-overlay.css`)
3. **Step 3 — Trạng thái thu gọn**: avatar giữa + tên rút gọn + badge overlay avatar; ẩn preview/time/tabs/search; project phẳng; active nổi bật.
4. **Step 4 — Trạng thái bung**: trả item về row ngang bình thường; hiện lại tab + search.
5. **Step 5 — Guard responsive**: bọc `@media (min-width:1024px)`; giữ mobile/tablet canvas-full như cũ; kiểm tra không đè rule `display:none` mobile.

## Edge cases
- **Tên dài / emoji**: ellipsis 1 dòng, `title` full name.
- **Nhóm & org hub**: dùng `ChatGroupAvatar`/org avatar sẵn có; badge vẫn overlay đúng.
- **Self chat ("Gửi riêng cho tôi")**: self-avatar (Bookmark) vẫn hiển thị ở rail.
- **Project parent/child (cây)**: ở rail nên **ẩn nhánh/indent** (`is-project-child` branch) — chỉ hiện avatar phẳng, tránh rối trong 72px. Cân nhắc chỉ hiển thị parent hoặc flatten.
- **Nhiều badge (unread + mention)**: xếp chồng gọn góc avatar, tránh tràn.
- **Tab đang chọn (`ban_be`/`mua_ban`/...)**: rail hiển thị đúng panel active hiện tại; chuyển tab vẫn hoạt động (hoặc ẩn tab switcher trong rail Phase 1, giữ 1 tab mặc định).
- **Muted thread**: badge unread đang bị ẩn khi muted (logic hiện có) → giữ nguyên.
- **Scroll**: rail dọc scroll được khi nhiều hội thoại (`overflow-y:auto`).

## Security / Performance
- Không thêm query/API → không ảnh hưởng RLS, không N+1.
- Thuần CSS + 1 class React ⇒ không thêm bundle, không re-render thêm.
- Danh sách dài: rail vẫn tái dùng cùng danh sách đã render (không nhân đôi DOM). Nếu về sau list rất dài, cân nhắc virtualization (đã có rule perf) — không thuộc scope này.

## Ngoài phạm vi (không làm)
- Không đổi schema/SSOT, không đổi logic dữ liệu thread.
- Không thêm hệ màu mới — dùng token CINS hiện có.
- Không đổi hành vi canvas/tldraw.
