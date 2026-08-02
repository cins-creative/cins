# PLAN — Org node chat: summary thay vì xổ inbox + «Quản lý thông báo» dùng chung

> Trạng thái: **BUILT** · Phase kế thừa `PLAN_org_inbox_notify_chat.md`.
> Chốt UX: overlay = **tín hiệu**, xử lý tin org ở **trang quản trị**. Phòng học/hub **vẫn chat trong overlay**.
> **0 migration** (dùng `org_to_chuc.cau_hinh` jsonb — tiền lệ `lib/cong-dong/linh-vuc.ts`).

---

## 0. Bốn việc

| # | Việc | Hiện tại |
|---|---|---|
| **A** | Org node «Tổ chức của tôi» **không xổ inbox**, chỉ hiện *Chưa đọc / Chưa trả lời* | Expand liệt kê từng `ChatThreadRow` → rối, trùng `OrgInboxPanel` |
| **B** | Giữ **phòng học / hub** trong overlay (vẫn expand được) | Đang chung một list với inbox |
| **C** | Tin org **không tạo floating bubble**; ưu tiên **Noti** → mở trang quản trị | Bubble + Noti mở overlay (2 kênh lệch nhau) |
| **D** | Menu row: **«Quản lý thông báo»** — org nhiều admin, một người xem là đủ (mặc định hiển thị đầy đủ) | Chưa có |

---

## 1. Điểm khởi đầu (fact)

- `ToChucOrgNode` gom mọi thread `isManagedOrgThread` theo `orgId` — `lib/chat/group-to-chuc-threads.ts` L47–125. Predicate: `isOrgStaffInbox` **hoặc** (`viewerIsOrgMember` && (`isOrgHub` || `lopHocId`)) (L9–15).
- Render node + expand: `CinsChatOverlay.tsx` L4252–4327 (`renderToChucOrgNode`).
- Staff inbox thread build: `listOrgStaffInboxThreadsForViewer` — `lib/chat/org-message.ts` L1423–1613. **Chưa** gắn trạng thái trả lời.
- Quy tắc «Chưa trả lời» đã tồn tại: `buildInboxThread` L327–328 — `last.id_nguoi_gui === studentUserId ? "open" : "replied"`.
- Filter trang QL: `OrgInboxPanel.tsx` L616–645 — `unread` / `open` / `all`, state nội bộ, **chưa nhận prop initial**.
- Bubble: `CinsChatFloatingStack.tsx` — `pickUnreadThreads` (L139–145) + `mergePeekThreads` (L147–…) lấy **mọi** thread `unread > 0`, không loại org staff.
- Noti: `org_tin_nhan_moi` coalesce 1 row / **admin** / phòng (`lib/chat/org-inbox-notify.ts` L121–158); mark read chỉ cho `viewerId` (L162–174). Click → `openChat` overlay (`JourneyNotifications.tsx` L325–357).
- Route QL: `orgQuanLyPath(kind, slug, "tin-nhan")` — `lib/to-chuc/org-quan-ly-routes.ts` L147.
- `chat_da_doc` = watermark **theo từng user** — không có khái niệm "org đã đọc".

---

## 2. A + B — Node summary, giữ phòng học

### Tách hai loại thread trong node

`ToChucOrgNode` bổ sung, **không** đổi shape `ChatThread` cho mọi tab:

```
inbox:  { count, unread, chuaTraLoi }   // từ thread isOrgStaffInbox — KHÔNG render
rooms:  ChatThread[]                    // hub + lopHocId — vẫn render khi expand
```

`unread` node = `inbox.unread + tổng unread của rooms` (giữ badge tổng như hiện tại).

### Row org

| Vùng | Nội dung |
|---|---|
| Chevron | **Chỉ hiện khi `rooms.length > 0`** (phòng học/hub). Không có phòng ⇒ không expand |
| Meta sub | `Chưa đọc {n} · Chưa trả lời {m}` (ẩn số 0; không còn "N hội thoại") |
| Chip | Hai số là **nút** → mở QL tin nhắn với filter tương ứng |
| Nút Maximize | Giữ — mở `/quan-ly/tin-nhan` (không filter) |

Expand → chỉ list `rooms` (hub CSĐT, phòng lớp), qua `renderThreadRow(..., { nestedInOrg: true })` như cũ.

### Data cần thêm

1. `ChatThread.orgInboxStatus?: "open" | "replied"` (`lib/chat/types.ts`) — set tại `org-message.ts` L1577+ bằng đúng rule L327–328 (`last.id_nguoi_gui === studentId`). Không query thêm: `last` đã có sẵn.
2. `groupToChucThreads` chia `inbox` / `rooms`, cộng `chuaTraLoi = count(orgInboxStatus === "open")`.
3. `OrgInboxPanel` nhận `initialFilter?: "unread" | "open" | "all"`; trang QL đọc `?filter=` (+ `?room=` cho mục C).

---

## 3. C — Bỏ bubble org, ưu tiên Noti

- `CinsChatFloatingStack`: loại thread `isOrgStaffInbox` khỏi `pickUnreadThreads` **và** `mergePeekThreads` (chặn cả đường pinned snapshot). Hub/lớp **vẫn** có bubble (là chat thật).
- `JourneyNotifications` → `OrgTinNhanMoiNotifyItem`: thay `openChat(...)` bằng `router.push(orgQuanLyPath(orgLoai, orgSlug, "tin-nhan") + "?room=" + roomId)`. Payload đã có `orgSlug` + `orgLoai` (`org-inbox-notify.ts` L109–117) → không cần fetch thêm.
- ⚠️ Đảo quyết định `CINS_DECISIONS.md` (2026-08-02): «Bell → mở overlay» ⇒ **Bell → trang QL**. Phải ghi lại LOG.
- Overlay vẫn mở được phòng inbox nếu user tự bấm từ trang QL / deep link — chỉ **không tự nổi bubble**.

---

## 4. D — «Quản lý thông báo» (đọc dùng chung)

### Ngữ nghĩa

| Chế độ | Hành vi |
|---|---|
| **Hiển thị đầy đủ** (mặc định) | Mỗi admin có unread/noti riêng — như hiện tại |
| **Ẩn khi đã có người xem** | Một admin mở hội thoại trong quản trị ⇒ với **mọi** admin: noti `da_doc=true`, hội thoại hết đậm, hết đếm *Chưa đọc*. Tin **mới** sau đó vẫn báo lại cho tất cả |

Chỉ đổi **hiển thị**, không đổi `chat_da_doc` của người chưa đọc (watermark cá nhân giữ nguyên → không phá lịch sử đọc).

### Lưu trữ — 0 migration

`org_to_chuc.cau_hinh` → `{ tinNhan: { thongBaoChung: boolean } }`. Đọc/ghi merge như `lib/cong-dong/linh-vuc.ts` L102–160. Lib mới `lib/chat/org-notify-settings.ts`: `getOrgThongBaoChung(orgId)` · `setOrgThongBaoChung(orgId, on, actorId)`.

### Backend

| Chỗ | Thay đổi khi `thongBaoChung = true` |
|---|---|
| `markOrgInboxNotifyRead` | Bỏ `eq("nguoi_nhan", viewerId)` — mark read **mọi** admin của phòng đó (chỉ khi viewer là admin org, check server) |
| Unread staff thread (`org-message.ts` L1568–1573) | `readAt` = **max** watermark trong nhóm `ORG_ADMIN_ROLES` của org, thay vì watermark riêng viewer |
| `OrgInboxPanel` (`buildInboxThread` L321–328) | Cùng rule `readAt` chung |
| `notifyOrgAdminsOfStudentMessage` | Không đổi — update `da_doc=false` cho tất cả admin khi có tin mới đã đúng |

Query watermark chung: một lần `chat_da_doc` theo `id_phong in (...)` + `id_nguoi_dung in (adminIds)`, lấy max — cùng batch với query hiện có, không N+1.

### UI

- Menu `ChatThreadRowMenu`: thêm action `org-notify` — **«Quản lý thông báo»** (icon `BellRing`), chỉ hiện trên **row org node** khi viewer là `owner`/`admin` org.
- Bấm → popover 2 radio: *Hiển thị đầy đủ* (mặc định) · *Ẩn khi đã có người xem*, kèm 1 dòng giải thích.
- Org node hiện chưa có menu ⇒ gắn `ChatThreadRowMenu` vào `cins-chat-org-node-row` (cạnh nút Maximize), `buildThreadMenuActions` thêm nhánh `orgNodeMode`.
- Mirror ở trang QL tin nhắn (cùng API) để admin không phải vào overlay mới đổi được.

### API

`PATCH /api/org/[orgId]/chat/thong-bao` — body `{ thongBaoChung: boolean }`; gate `owner`/`admin` (không dùng `ORG_ADMIN_ROLES` rộng — đây là cấu hình tổ chức). Trả về state mới. `GET` gộp vào payload thread list để tránh round-trip.

---

## 5. Thứ tự thực hiện

| Bước | Nội dung | File chính |
|---|---|---|
| 1 | `orgInboxStatus` + chia `inbox`/`rooms` trong node | `lib/chat/types.ts`, `org-message.ts`, `group-to-chuc-threads.ts` |
| 2 | Render node summary + chip filter, expand chỉ phòng học | `CinsChatOverlay.tsx`, `app/cins-chat-overlay.css` |
| 3 | `initialFilter` + `?room=` trang QL | `OrgInboxPanel.tsx`, `OrgTinNhanQuanLyClient.tsx` |
| 4 | Bỏ bubble org staff | `CinsChatFloatingStack.tsx` |
| 5 | Noti → trang QL | `JourneyNotifications.tsx` |
| 6 | Setting `thongBaoChung` + API + read chung | `lib/chat/org-notify-settings.ts`, `org-inbox-notify.ts`, `org-message.ts`, route mới |
| 7 | UI menu «Quản lý thông báo» | `ChatThreadRowMenu.tsx`, `CinsChatOverlay.tsx` |

Bước 1–5 độc lập với 6–7 → có thể build làm hai lượt.

---

## 6. Edge case

1. Org **chỉ có** inbox, không phòng học → node không expand được; phải chắc không render chevron chết.
2. Search (`query.trim()`) đang bypass nest — kiểm tra node vẫn hiện đúng khi tìm kiếm.
3. Đếm đôi badge: `tabUnread` cộng theo `threads` phẳng, node cộng riêng ⇒ giữ nguyên nguồn `threads`, không cộng thêm ở node.
4. Thread inbox không còn xổ nhưng vẫn nằm trong `threads` → vẫn được realtime patch; đừng lọc ở tầng state (chỉ lọc ở tầng render + bubble).
5. `thongBaoChung` bật rồi tắt: unread cá nhân quay lại watermark riêng — có thể "hiện lại" tin cũ. Chấp nhận (đúng ngữ nghĩa), ghi chú trong tooltip.
6. Admin bị gỡ vai trò: max-watermark chỉ tính member `active` + `den_ngay is null`.
7. Người gửi cũng là admin org → vẫn bỏ qua notify (logic cũ L72–87 giữ).

---

## 7. Security

- Đổi setting: **server** check `owner`/`admin` của đúng `orgId`; không tin `orgId` từ client mà không kiểm membership.
- Mark-read dùng chung: chỉ áp dụng khi viewer thực sự là admin org của phòng (`loadOrgAdvisoryRoom` + membership), tránh user thường tắt noti của admin.
- `?room=` trên trang QL: validate phòng thuộc org trước khi select — không leak phòng org khác.

---

## 8. Cần cập nhật tài liệu khi chốt

- `CINS_DECISIONS.md` LOG: đảo «Bell → overlay» thành «Bell → trang QL»; node org không xổ inbox; setting `thongBaoChung` trong `org_to_chuc.cau_hinh`.
- `CINS_IMPLEMENTATION.md`: route `PATCH /api/org/[orgId]/chat/thong-bao`, lib `org-notify-settings.ts`.
