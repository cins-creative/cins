# PLAN — Sửa kiến trúc giao tin nhắn (độ trễ + đồng bộ đa thiết bị)

Ngày: 31/08/2026 · Model: **Opus 5 (planning, medium)** · Trạng thái: **PLAN — chưa code**

Xuất phát: user so với Facebook/Messenger — "tin tới là mọi thiết bị đồng bộ ngay", CINs chậm hơn rõ.
Phân tích nguyên nhân đã làm trong chat trước; file này là **plan sửa**, có thứ tự, có rollback, có ma trận verify.

> **Nguyên tắc xuyên suốt:** `chat_tin_nhan` **vẫn là SoT duy nhất**. Mọi thứ thêm vào chỉ là **đường vận chuyển** (transport), không phải nguồn sự thật thứ hai. Không bảng mới, không cột mới (xem §3).

---

## 0. Mục tiêu & không-mục-tiêu

### Mục tiêu (đo được)

| # | Mục tiêu | Hiện tại | Đích |
|---|---|---|---|
| M1 | Tin tới **phòng đang mở**, cả hai bên online | ~1–3.5s (bị chặn dưới bởi poll 3s khi WS yếu) | **< 500ms** p50 |
| M2 | Badge/âm thanh inbox khi **không mở phòng** | tới 45–120s nếu WS chết | **< 2s** khi tab hiện |
| M3 | Quay lại tab sau khi ngủ → thấy tin mới | tới 45s (TTL RAM) hoặc lâu hơn | **< 1s** sau khi tab visible |
| M4 | **Không mất tin** sau reconnect (gap fill) | không có API bù đúng cách | 0 tin mất, có cursor xác định |
| M5 | Tải server cho chat | mỗi phòng mở = 1 request nặng / 3s | giảm ≥ 80% số request |

### Không-mục-tiêu (nói rõ để không kỳ vọng sai)

- **Không** làm web nền (tab ẩn, Safari iOS bị OS treo) nhảy tin như app Facebook. Việc đó chỉ giải được bằng **native + push** (Phase 3), không phải socket.
- **Không** tự dựng hạ tầng socket riêng (Durable Object / MQTT) trong plan này. Đã cân ở phân tích trước: giá tổ chức, chưa đáng.
- **Không** đổi UI, không đổi nghiệp vụ tin (mapping, unread watermark, quyền, học phí, đơn hàng).

---

## 1. Hiện trạng — sự thật đã đọc trong repo (có neo)

### 1.1 Đường nhận tin hôm nay

```
POST /api/chat/rooms/[id]/messages
  → sendRoomMessage()  → INSERT chat_tin_nhan        (direct-message.ts:1532)
  → Postgres WAL → publication supabase_realtime      (migration_chat_realtime.sql)
  → Supabase Realtime kiểm RLS cho TỪNG client        ← điểm nghẽn
  → WS postgres_changes → useChatRealtime → UI
```

Song song có **3 lớp poll REST** bù cho WS:

| Lớp | Nhịp | Neo | Ghi chú |
|---|---|---|---|
| Phòng đang mở | **3s** | `use-open-room-message-backfill.ts:10,32` | gọi `GET messages?limit=12` — **endpoint nặng** |
| Inbox (provider) | **120s** + `visibilitychange` | `CinsChatProvider.tsx:528–537` | qua `prefetchChatData` |
| Inbox (bubble stack) | **120s** + `focus` | `CinsChatFloatingStack.tsx:128,1137` | cùng `prefetchChatData` |

### 1.2 Bốn lỗi kiến trúc cụ thể (đây là cái phải sửa)

**L-1 — Subscribe toàn bảng, không lọc.**
`useChatRealtime` đăng ký `postgres_changes` INSERT + UPDATE trên `public.chat_tin_nhan` **không có `filter`** (`use-chat-realtime.ts:75–99`). Nghĩa là **mọi tin của toàn sàn** đều đi qua máy Realtime, được kiểm RLS **một lần cho mỗi client đang online**, rồi mới tới client hợp lệ. Chi phí ~ *O(số tin × số client online)*. Đây là lý do gốc của độ trễ tăng theo tải, và là chi phí đắt nhất về sau.

Tiền lệ đúng đã có trong repo: `use-chat-read-cursors-realtime.ts:89` dùng `filter: id_phong=eq.${id}`. Nhưng `postgres_changes` **chỉ có một filter `eq`**, không diễn tả được "các phòng của tôi" → **không thể sửa L-1 bằng cách lọc**. Phải đổi transport (Phase 2).

**L-2 — Không có API bù tin (catch-up).**
`GET .../messages` chỉ nhận `before` + `limit` (`route.ts:24–35`). **Không có `after`.** Nên sau khi WS chết/ngủ, client chỉ biết "lấy lại 12 tin cuối" và dựa vào dedupe theo id. Hệ quả:
- Gap dài hơn 12 tin → **mất tin thật** (không ai phát hiện).
- Bù tin = kéo lại nguyên trang nặng, không phải delta.

**L-3 — Phân trang keyset không có tie-break.**
`before` resolve `tao_luc` rồi `.lt("tao_luc", beforeAt)` (`direct-message.ts:1186–1207`), sắp xếp chỉ theo `tao_luc`. Hai tin **cùng `tao_luc`** (gửi dồn, insert cùng ms, tin hệ thống bulk) sẽ bị **sót hoặc trùng** ở biên trang. Lỗi âm thầm, hiện có. Phải sửa cùng lúc với `after`.

**L-4 — Tab quay lại vẫn đọc cache RAM 45s.**
`visibilitychange`/`focus` → `prefetchChatData()` → `prefetchChatThreads(viewerId)` **không `force`** → gặp `THREADS_RAM_TTL_MS = 45s` thì **return luôn cache, không fetch** (`chat-prefetch.ts:15,59–63`). Đúng ý định "chống fetch dồn", nhưng làm sai M3: mở lại tab trong vòng 45s → badge/inbox vẫn cũ.

### 1.2b Lượt scan 2 — 6 phát hiện thêm (quan trọng, có cái nặng hơn L-1..L-4)

**L-5 — `markRoomRead` bỏ qua tham số `lastMessageId` → đánh dấu đọc CẢ PHÒNG.** ⚠️ bug thật
`direct-message.ts:1613–1623`: hàm luôn query **tin mới nhất của phòng** rồi `const messageId = last?.id ?? lastMessageId` — tham số truyền vào **chỉ dùng khi phòng rỗng**. Hệ quả:

- Mở phòng còn 100 tin chưa đọc, chỉ tải 30 tin cuối ⇒ watermark nhảy lên tin mới nhất ⇒ **70 tin coi như đã đọc dù chưa hiện**.
- Gửi một tin (`sendRoomMessage` gọi `markRoomRead`) ⇒ **đánh dấu đọc luôn các tin của người kia vừa tới mà mình chưa xem**.
- Watermark có thể trỏ vào tin mà viewer **không được thấy** (query không lọc `chi_hien_cho`).

Comment trong code nói "server lấy tin mới nhất, không tin cursor client cũ" — tức là **có chủ ý**, nhưng nó biến `markRoomRead` thành "đọc hết phòng", không phải "đọc tới đây". **Đây là lý do vì sao E2 (catch-up tự mark read) nguy hiểm hơn tôi viết ở lượt 1:** nếu lỡ bật, nó không mất một tin — nó **xoá sạch unread của phòng**.

**L-6 — Đường POST gửi tin có ~5–6 round-trip DB tuần tự.**
`sendRoomMessage`: INSERT (+`select MESSAGE_SELECT`) → `UPDATE chat_phong` → `markRoomRead` (bên trong lại `assertRoomMember` + select + upsert + notify org inbox) → `fetchMessageById` (**select lại tin vừa insert**) → `applyOrgAdvisoryPerspectiveToMessage`. Tất cả **`await` tuần tự** trước khi trả response. Trên Workers→Supabase mỗi round-trip ~30–80ms ⇒ **200–500ms chỉ ở server**.
Vì UI đã optimistic nên user không thấy tin mình chậm, **nhưng**: id thật về chậm, và ở Phase 2 thì **broadcast + push cũng bị đẩy lùi tương ứng**. Muốn đạt M1 < 500ms thì phải cắt phần này.

**L-7 — `useChatRealtime` được mount ở 4 nơi, mỗi nơi mở một kênh subscribe TOÀN BẢNG.**
`CinsChatProvider.tsx:656` · `OrgInboxPanel.tsx:221` · `TinNhanQuanLyClient.tsx:819` (+ mỗi instance của chúng). Mỗi hook tạo channel riêng với topic random, cùng đăng ký INSERT+UPDATE trên cả `chat_tin_nhan`. Một tab đang mở hộp thư org = **2–3 lần** chi phí của L-1, và là nguồn beep/badge trùng.
Đã có sẵn giải pháp trong repo: provider có **event bus** `subscribeChatMessages` (`CinsChatProvider.tsx:565`) — hai surface kia nên tiêu thụ bus thay vì mở kênh riêng.

**L-8 — Hai poller 3s có thể chạy song song cho cùng lúc.**
`useOpenRoomMessageBackfill` được dùng ở **cả** `CinsChatOverlay.tsx:2885` và `CinsChatFloatingStack.tsx:1290`. Overlay mở + bubble mini mở ⇒ **2 request/3s**, mỗi request là endpoint nặng.

**L-9 — Endpoint messages làm việc nặng ngay cả khi không có tin mới.**
`listRoomMessages` luôn chạy: `assertRoomMember` → query tin → `listRoomReadCursors` + `listPinnedMessagesForRoom` (Promise.all) → `enrichMessages` → 4–5 **dynamic import** (`group-message`, `org-hub-phong`, `lop-room-access`, `lop-bai-notice`, `chao-lop-notice`) → `applyOrgAdvisoryPerspective`. Với poll 3s thì đây là phần tốn nhất của chat, và **99% lần gọi trả về 0 tin mới**.
⇒ Catch-up `after` **phải short-circuit**: không có row mới thì trả `{messages: [], hasMore: false}` **trước** khi làm pinned/cursors/enrich.

**L-10 — Presence toàn sàn dùng một topic duy nhất.** (ngoài phạm vi tin nhắn, nhưng cùng hạ tầng)
`CinsChatOverlay.tsx:1537` gọi `useRoomPresence("__cins_global__")` ⇒ **mọi user mở chat** cùng `track` và cùng `subscribe` sync trên `room-presence:__cins_global__`. Mỗi join/leave phát sync cho tất cả ⇒ lưu lượng ~O(N²) theo số người online, và presenceState trả về danh sách toàn bộ user online.
Cái này **ăn chung quota/kết nối Realtime với chat**, nên nó có thể đang **góp phần làm kênh chat chậm/đứt**. Không sửa trong plan này, nhưng phải đo và có brief riêng.

### 1.3 Điểm ghi tin (choke point) — quan trọng cho Phase 2

- **Chính:** `sendRoomMessage()` — 1 INSERT duy nhất (`direct-message.ts:1532–1536`), sau đó bump `chat_phong.cap_nhat_luc`, `markRoomRead` cho người gửi, notify org, và **push FCM** (`:1580–1600`).
- **Bỏ qua choke point (2 chỗ):** `lib/co-so/lop-chat-phong.ts:341` và `lib/co-so/don-hoc-phi-chat.ts:444` INSERT thẳng `chat_tin_nhan`.
  ⇒ Nếu chỉ phát broadcast trong `sendRoomMessage`, **2 luồng này sẽ không được đẩy** (rơi về CDC/poll → chậm, và sau này nếu bỏ CDC thì mất). **Phải gom trước** (Phase 1.5).

### 1.4 Cái đang làm **đúng** — giữ nguyên, đừng sửa

- **Idempotency client đã có:** `reconcileChatMessage` dedupe theo `id`, khớp bản optimistic theo payload, xử lý album/sticker/GIF (`lib/chat/realtime.ts:279–341`). Đây là nền tảng để thêm transport thứ hai mà không sinh bubble trùng.
- Watchdog 25s + `CLOSED` + `setAuth`/`TOKEN_REFRESHED` (L35b) — giữ.
- Unread = watermark `chat_da_doc`, không phải cột mỗi tin — giữ.
- Push FCM 4 loại + coalesce 45s/isolate (`lib/push/su-kien.ts:149–163`) — giữ, Phase 3 nối thêm.
- `chi_hien_cho` (tin một phía) đã lọc **cả server** (`.or(chi_hien_cho...)` trong `listRoomMessages`) và client (`tinHienVoiViewer`).

---

## 2. Kiến trúc đích

```
                    ┌──── SoT (không đổi) ────┐
POST messages ──► sendRoomMessage ──► INSERT chat_tin_nhan
                         │
                         ├──► [MỚI] publishChatEvent()  ── Broadcast ──► kênh user:<id>  ──► client online
                         │        (fan-out theo thành viên phòng, đã lọc chi_hien_cho)
                         │
                         ├──► firePushTinNhanMoi()      ── FCM ─────────► thiết bị ngủ / ngoài app
                         │
                         └──► WAL → CDC postgres_changes  (GIỮ làm lưới an toàn, tắt sau)

Client: envelope (nhanh) ──► nếu phòng đang mở: GET messages?after=<cursor>  ──► render
        reconnect / foreground / online ──► cùng một GET after=<cursor>  (gap fill)
```

Ba thay đổi bản chất:

1. **Uỷ quyền chuyển từ mỗi-tin sang mỗi-lần-join.** Client join đúng **một kênh riêng của mình** (`user:<profileId>`), được duyệt một lần. Không còn kiểm RLS cho từng tin × từng client.
2. **Server quyết định người nhận.** Fan-out dùng `listRoomMemberIdsExcept` + lọc `chi_hien_cho` **ở server** (đã có sẵn trong nhánh push). An toàn hơn hôm nay (client tự lọc).
3. **Có cursor xác định** → bù tin bằng delta, không phải "đoán 12 tin cuối".

### 2.1 Tại sao **envelope mỏng**, không đẩy full tin

Payload broadcast chỉ mang: `roomId`, `messageId`, `senderId`, `sentAt`, `kind`, `preview` (đã an toàn), `event: insert|update`.

Lý do (đây là chỗ dễ sai nhất nếu làm ngược):

- Nội dung tin **khác nhau theo người đọc**: `applyOrgAdvisoryPerspective` (ẩn tên staff với khách), `noiDungChaoLopChoHocVien` / `noiDungLopBaiChoHocVien` (đổi thân tin theo viewer), lọc theo kỳ học `filterMessagesForKyVisibility`, `shouldShowLopBaiTin` / `shouldShowChaoLopTin`. Muốn đẩy full tin thì phải **map lại cho từng người nhận** → phòng lớp 50 người = 50 lần enrich (mỗi lần có query) ngay trong request gửi tin. Vừa đắt vừa **dễ leak nếu map sai một nhánh**.
- Envelope mỏng = **một đường code duy nhất** cho mọi loại phòng. Ít nhánh = ít lỗi. Đúng yêu cầu "không muốn bị lỗi".
- Đổi lại thêm 1 round-trip cho phòng đang mở. Vẫn đạt M1: broadcast ~50–150ms + `after` fetch nhẹ ~150–250ms ⇒ **< 500ms**, so với 1–3.5s hôm nay.

`preview` trong envelope: **chỉ dùng cho inbox/âm thanh/badge**, và chỉ gửi cho người đã được server xác định là người nhận hợp lệ. Với phòng có perspective (org advisory / lớp), gửi **preview trung tính** (vd. "Tin nhắn mới") thay vì thân tin — quyết định ở §7.

> Đẩy full tin cho **DM 1-1 đơn giản** (không `chi_hien_cho`, không org, không lớp) là tối ưu **Phase 4**, chỉ làm sau khi đã đo, không làm trong Phase 2.

---

## 3. SSOT scan (bắt buộc trước mọi thay đổi DB) — kết luận: **không migration bảng nghiệp vụ**

| Sự thật cần giữ | Nguồn hiện có | Kết luận |
|---|---|---|
| Nội dung tin nhắn | `chat_tin_nhan` | **SoT, không đổi.** Không thêm bảng "tin đang bay" — sẽ trùng grain. |
| Ai đã đọc tới đâu | `chat_da_doc` (watermark) | Không đổi. |
| Thứ tự / cursor | `chat_tin_nhan.tao_luc` + `id` (PK) | **Đủ** cho keyset. Không cần cột `seq`/`stt` mới. |
| Thiết bị nhận push | `user_web_push` (đã mở rộng FCM — DECISIONS A26) | Không đổi. |
| Thành viên phòng | `chat_thanh_vien` | Không đổi. |

**Không** `CREATE TABLE`, **không** `ALTER` bảng nghiệp vụ trong plan này.

**Thay đổi phía DB duy nhất (Phase 2), cần user duyệt trước khi chạy:** policy RLS trên **`realtime.messages`** (schema hệ thống của Supabase, không phải bảng nghiệp vụ) để mở **private channel** cho topic `user:<profile_id>`:

> ý: chỉ cho phép join/read topic khi `topic = 'user:' || current_profile_id()::text`.

- Hàm `current_profile_id()` **đã tồn tại** (dùng trong `migration_chat_rls.sql`).
- Việc gỡ `chat_tin_nhan` khỏi publication `supabase_realtime` (tắt CDC) **chỉ làm ở Phase 4**, sau khi broadcast đã chạy ổn ≥ 2 tuần, và phải báo user riêng.

**Phải xác minh trước khi code Phase 2** (không đoán từ trí nhớ): API broadcast từ server trên phiên bản Supabase của CINs — `realtime.send(...)` qua RPC service-role **hoặc** HTTP `POST /realtime/v1/api/broadcast`. Chạy trên Cloudflare Workers ⇒ **ưu tiên đường HTTP** (Worker không giữ WS ra ngoài). Kiểm bằng 1 script thử nhỏ (`scripts/check-*.mjs`, read-only/không side effect nghiệp vụ) **trước** khi viết lib.

---

## 4. Lộ trình — 5 phase, phase sau không bắt đầu khi phase trước chưa verify

| Phase | Nội dung | Sửa lỗi nào | Rủi ro | Ước lượng | Model đề xuất |
|---|---|---|---|---|---|
| **1** | Catch-up API `after` + keyset tie-break + cursor thay poll 3s + `maxAgeMs` tab + short-circuit + gom poller | L-2 L-3 L-4 L-8 L-9 | Thấp | 1 session | Grok 4.5 · Medium |
| **1A** | `markRoomRead` tôn trọng cursor (**commit riêng**, chạm unread) | L-5 | Trung bình | 0.5 session | Grok 4.5 · Medium |
| **1B** | Một cửa ghi tin + một cửa nhận tin (refactor thuần) | L-7 (+ nền Phase 2) | Thấp | 0.5–1 session | Grok 4.5 · Medium |
| **1C** | Cắt round-trip đường POST gửi tin | L-6 | Trung bình | 0.5 session | Grok 4.5 · Medium |
| **2** | Broadcast envelope kênh `user:<id>`, CDC làm fallback (feature flag) | L-1 | **Cao** | 2 session | Grok 4.5 · **High** |
| **3** | Push đánh thức → foreground catch-up (web + native) | — | Trung bình | 1 session | Grok 4.5 · Medium |
| **4** | Đo, rồi: tắt CDC · (tuỳ chọn) full payload cho DM | — | Trung bình | 0.5–1 session | Grok 4.5 · Medium |
| **(riêng)** | Presence toàn sàn `__cins_global__` — đo rồi thu hẹp | L-10 | ? | brief riêng | Opus 5 (plan) |

**Phase 1 đứng một mình có giá trị** (đạt M3, M4, M5 và phần lớn M2) — nếu dừng ở đây vẫn lãi.

**1C — cắt round-trip POST (chi tiết):** bỏ `fetchMessageById` khi row vừa INSERT đã có đủ field (`MESSAGE_SELECT` đã select sẵn — chỉ cần enrich phần thiếu); `UPDATE chat_phong.cap_nhat_luc` và `markRoomRead` chuyển thành **không chặn response** (fire-and-forget có log) *nếu* xác nhận không có nơi nào đọc ngay sau POST và dựa vào chúng. **Phải kiểm từng cái**, không cắt hàng loạt — đây là chỗ dễ sinh lỗi "thread không nhảy lên đầu" hoặc "badge tự sáng lại".

---

### Phase 1 — Catch-up cursor (làm trước, rẻ, gần như chỉ được)

**1.1 · Server: `listRoomMessages` nhận `after`**
`lib/chat/direct-message.ts`

- Thêm `after?: string` (message id) vào `ListRoomMessagesOptions`.
- Resolve cursor → `(tao_luc, id)` của tin đó (giống cách `before` đang làm, cùng `eq id_phong` để không lộ tin phòng khác).
- Filter keyset **có tie-break**: `tao_luc > t OR (tao_luc = t AND id > i)`.
- Khi có `after`: `order("tao_luc", asc)` + `order("id", asc)`, `limit + 1` để tính `hasMore`.
- **Sửa L-3 luôn:** nhánh `before` cũng đổi sang keyset `tao_luc < t OR (tao_luc = t AND id < i)` và `order` hai cấp. Đây là sửa bug âm thầm, không đổi hợp đồng bên ngoài.
- **`markRead` phải mặc định `false` khi có `after`.** Hiện `shouldMarkRead = options.markRead ?? !options.before` — thêm `after` mà không sửa dòng này thì **mọi lần catch-up sẽ tự đánh dấu đã đọc** → mất badge, mất watermark. Đây là bẫy số một của Phase 1.
- Giữ nguyên toàn bộ enrich / lọc lớp / perspective / pinned / readCursors (không đổi hành vi đọc).

**1.2 · API route**
`app/api/chat/rooms/[roomId]/messages/route.ts`

- Nhận `after`; **chặn** gửi đồng thời `before` + `after` → 400.
- `mark_read` chỉ chấp nhận khi **không** có `before` và **không** có `after`.
- Giữ `limit` ≤ 80.

**1.3 · Client: đổi poll 3s thành catch-up theo cursor**
`lib/chat/use-open-room-message-backfill.ts` (đổi vai trò, giữ tên file)

- Giữ cursor = `id` tin **mới nhất đã có trong state** của phòng.
- Gọi `GET ...?after=<cursor>&limit=50` khi: **(a)** kênh realtime vừa reconnect, **(b)** `visibilitychange` → visible, **(c)** `online`, **(d)** interval an toàn **20s** (thay 3s), **(e)** khi nhận envelope (Phase 2).
- **Gap quá lớn:** nếu `hasMore === true` → không cố nối delta; **reload tail** (`limit=30`, không `after`) và thay state phòng. Tránh trạng thái nửa vời.
- **Không cursor** (phòng vừa mở, state rỗng) → giữ đường cũ (`limit=30`).
- Tin về đi qua `reconcileChatMessage` như hiện tại (đã idempotent) — **không viết merge mới**.

**1.4 · Fix L-4 (tab quay lại) — ĐÃ SỬA LẠI SAU LƯỢT SCAN 2**
`lib/chat/chat-prefetch.ts` + `CinsChatProvider.tsx` + `CinsChatFloatingStack.tsx`

> ⚠️ Bản lượt 1 của tôi ghi "truyền `force: true` từ `visibilitychange`/`focus`". **Không được làm thế.** `/api/chat/threads` → `listAllChatThreads` (`org-message.ts:1701`) chạy **6 nhóm query song song** (direct + group + org + staff inbox + shop khách + shop đã mua) kèm dynamic import. `force` vô điều kiện ⇒ user nhảy qua lại giữa các tab sẽ **nã liên tục endpoint nặng nhất của chat**. Đây là cách biến một bug nhỏ thành sự cố tải.

Cách đúng:

- Thêm tham số **`maxAgeMs`** cho `prefetchChatThreads` (thay vì cờ `force` nhị phân). Interval định kỳ dùng 45s như hiện tại; **`visibilitychange`/`focus` dùng `maxAgeMs` ngắn (~5s)**. Vừa hết stale 45s, vừa chặn hammer.
- Giữ `threadsInflight` dedupe (2 poller + 2 event vẫn chỉ 1 request).
- Giữ interval 120s. Phase 2 sẽ biến nó thành lưới an toàn thuần.

**1.5 · Sửa L-5 (`markRoomRead`) — quyết định cần user chốt (Q6)**
`lib/chat/direct-message.ts:1605–1640`

Hai lựa chọn, **không tự quyết**:
- **(a) Tôn trọng cursor:** dùng `lastMessageId` khi được truyền, chỉ fallback "tin mới nhất" khi không truyền. Đúng nghĩa "đã đọc tới đây", chặn mất unread. **Rủi ro:** nơi nào đang *ngầm dựa* vào hành vi "đọc hết phòng" sẽ đổi hành vi (badge có thể còn lại sau khi mở phòng — thực ra là đúng hơn).
- **(b) Giữ nguyên**, và chỉ đảm bảo catch-up không bao giờ gọi mark read.
*Khuyến nghị:* **(a)**, nhưng tách **commit riêng, verify riêng** (V17–V18) vì nó chạm unread — thứ user nhìn thấy hằng ngày.

**1.6 · Sửa L-9 (short-circuit) + L-8 (một poller)**
- `listRoomMessages`: khi nhánh `after` không có row mới ⇒ return sớm, **bỏ** pinned + readCursors + enrich + dynamic import.
- Gom poller: chỉ **một** `useOpenRoomMessageBackfill` hoạt động tại một thời điểm cho một `roomId`. Cách rẻ nhất: khoá theo `roomId` ở module-level (`Map<roomId, ownerToken>`) — instance thứ hai cho cùng phòng thành no-op. Overlay ưu tiên hơn mini.

**Xong khi:**
- Tắt WS bằng DevTools → tin mới vẫn tới trong ≤ 20s, **không sai thứ tự, không trùng**.
- Gửi 40 tin liên tiếp trong lúc tab ẩn → mở lại: **đủ 40 tin**, đúng thứ tự (kiểm cả trường hợp cùng `tao_luc`).
- Số request `GET messages` khi mở một phòng 10 phút: từ ~200 xuống ~30.

---

### Phase 1B — Một cửa ghi tin + một cửa nhận tin (bắt buộc trước Phase 2)

`lib/chat/` + `lib/co-so/lop-chat-phong.ts:341` + `lib/co-so/don-hoc-phi-chat.ts:444`

- Tạo helper nội bộ duy nhất thực hiện: INSERT `chat_tin_nhan` → bump `chat_phong.cap_nhat_luc` → **(Phase 2) publish** → trả row.
- Hai chỗ đang INSERT thẳng chuyển sang dùng helper. **Không đổi payload, không đổi thứ tự side-effect nghiệp vụ** (push/notify org vẫn ở `sendRoomMessage`, không kéo vào helper để tránh đổi hành vi).
- Đây là **refactor thuần**: cùng SQL, cùng kết quả. Verify bằng cách so sánh hành vi 2 luồng (tạo phòng lớp, đơn học phí) trước/sau.

**Một cửa NHẬN tin — sửa L-7** (phần mới sau lượt scan 2):

- `useChatRealtime` chỉ còn **một** chỗ mount: `CinsChatProvider`.
- `OrgInboxPanel.tsx:221` và `TinNhanQuanLyClient.tsx:819` chuyển sang tiêu thụ **`subscribeChatMessages`** (bus đã có sẵn ở provider). Hai chỗ này hiện tự `mapRealtimeRow` + `tinHienVoiViewer` — bus đã phát `ChatRealtimeMessageEvent` **đã map + đã lọc**, nên logic của chúng gọn lại, không thêm.
- **Phải xác minh trước:** `CinsChatProvider` có thực sự mount trên các route chứa 2 component đó (`/co-so/[slug]/quan-ly/tin-nhan`, trang org) hay không. Nếu **không** mount ⇒ giữ nguyên hook ở đó cho tới Phase 2 (khi kênh user thay thế), **không** ép provider vào layout chỉ để refactor.

**Xong khi:**
- grep `from("chat_tin_nhan")` + `.insert` chỉ còn **một** nơi.
- grep `useChatRealtime(` chỉ còn ở provider (hoặc có ghi chú lý do nếu còn chỗ khác).
- DevTools → WS: một tab mở hộp thư org chỉ còn **1** kênh `cins-chat:*` (trước là 2–3).

---

### Phase 2 — Broadcast envelope (phần đáng giá nhất, rủi ro cao nhất)

**2.0 · Xác minh trước khi viết (không bỏ bước này)**
Script thử: gửi 1 broadcast từ Node bằng service-role tới topic thử, một trang thử subscribe và nhận được. Chốt: đường HTTP hay RPC · tên event · giới hạn payload · rate limit của plan Supabase hiện tại.

**2.1 · Server publish**
`lib/chat/publish.ts` (mới) — gọi từ helper Phase 1.5.

- Người nhận = `listRoomMemberIdsExcept(roomId, senderId)` (đã có) **∩** `chi_hien_cho` nếu có (logic đã có ở nhánh push, `direct-message.ts:1586–1589` — **tái dùng, đừng viết lại**).
- Với mỗi người nhận: publish envelope tới topic `user:<recipientId>`.
- **Người gửi cũng nhận** envelope tới topic của chính mình (để **đa thiết bị của cùng một người** đồng bộ — đây chính là "gửi trên điện thoại, desktop thấy ngay"). Client bỏ qua nếu đã có id đó.
- **Fire-and-forget, có timeout**, `try/catch` — **publish lỗi không được làm fail việc gửi tin**. Tin đã vào DB là đã gửi thành công.
- Phòng lớn: chặn trần (vd. > 200 người nhận → chỉ publish topic phòng, hoặc bỏ publish và để CDC/poll lo). Ghi rõ ngưỡng.
- Cũng publish cho **UPDATE** (thu hồi / sửa / bump card đơn) — hôm nay client đã xử lý UPDATE (`handleRealtimeUpdate`, kèm nhánh bump `don_hang`/`don_hoc_phi`).

**2.2 · Client nhận**
`lib/chat/use-chat-user-channel.ts` (mới) — **không sửa** `use-chat-realtime.ts` (giữ CDC nguyên vẹn làm fallback).

- Subscribe **một** kênh `user:<viewerProfileId>` (private). Tái dùng đúng bộ resilience của L35b: `CLOSED` → reconnect, watchdog 25s, `setAuth` khi `TOKEN_REFRESHED`, `visibilitychange`/`online`, backoff.
- Nhận envelope → **hai việc tách biệt**:
  1. **Inbox ngay** (không chờ fetch): badge, âm thanh, bubble — dùng đúng `handleRealtimeInsert` hiện có (đường này chỉ cần `roomId`/`senderId`/`kind`).
  2. **Nếu phòng đang mở**: kích `after` catch-up (Phase 1.3). Debounce ~120ms để 5 tin dồn = 1 request.
- **Cờ chống trùng:** mọi tin cuối cùng vẫn đi qua `reconcileChatMessage` (dedupe theo id). Envelope + CDC + poll cùng lúc ⇒ vẫn 1 bubble. **Đây là lý do giữ được CDC song song mà không sinh lỗi trùng.**
- Âm thanh/badge **phải chống nhân đôi**: envelope và CDC có thể cùng báo một tin. Cần `Set` id đã xử lý (TTL ngắn, có trần) đặt ở **provider**, dùng chung cho cả hai nguồn. **Không** để mỗi hook tự đếm.

**2.3 · Feature flag + song hành**
- `NEXT_PUBLIC_CHAT_BROADCAST` : `off` (mặc định) · `shadow` · `on`.
  - `shadow`: client subscribe + **đo** (log ai tới trước, lệch bao nhiêu ms) nhưng **không** dùng để render/beep → xác nhận độ phủ mà không rủi ro.
  - `on`: envelope là đường chính, CDC vẫn chạy (dedupe lo phần trùng).
- Server publish có cờ riêng (env, không `NEXT_PUBLIC_`) để bật/tắt độc lập với client.
- **Rollback = đổi env, không cần revert code.**

**Xong khi:**
- `shadow` cho thấy ≥ 99% tin tới bằng envelope, và **luôn tới trước** CDC.
- Bật `on`: hai máy + hai tab, gửi qua lại 50 tin → không trùng bubble, không lệch thứ tự, đúng 1 tiếng beep/tin.
- Kill kênh envelope → CDC + poll 20s vẫn giữ hệ thống đúng (chỉ chậm hơn).

---

### Phase 3 — Push đánh thức, không tin vào socket khi app/tab ngủ

- Nhận push (web/native) → **không** dựng tin từ payload push; chỉ **đánh thức rồi catch-up** bằng `after` (đường Phase 1). Push là chuông, catch-up là sự thật.
- Native (`cins_app_main`, R8/R13 đã có): `AppState` → `active` ⇒ catch-up ngay; kênh envelope subscribe khi foreground.
- Xem lại `CHAT_COALESCE_MS = 45s` **per-isolate** trên Workers (`lib/push/su-kien.ts:154`): nhiều isolate ⇒ coalesce không chắc chắn. Chỉ đánh giá, **không** thêm bảng để chống trùng push (sẽ là nguồn thứ hai) — nếu cần thì bàn riêng.

---

### Phase 4 — Đo rồi mới cắt

1. Đo p50/p95 (envelope vs CDC) trong ≥ 2 tuần `on`.
2. Nếu ổn: đề xuất user gỡ `chat_tin_nhan` khỏi publication `supabase_realtime` (**cần duyệt riêng** — DB change). Giữ `chat_da_doc` CDC (per-room filter, rẻ, đang đúng).
3. Tuỳ chọn: full payload cho **DM 1-1 thuần** để bỏ round-trip → về ~150ms. Chỉ làm nếu đo thấy round-trip là phần trội, và phải có test riêng cho nhánh "phòng có perspective vẫn dùng envelope".

---

## 5. Hợp đồng API sau Phase 1 (chốt để không lệch giữa web và native)

`GET /api/chat/rooms/{roomId}/messages`

| Tham số | Kiểu | Mặc định | Ghi chú |
|---|---|---|---|
| `limit` | 1..80 | 30 | như hiện tại |
| `before` | message id | — | trang lùi (lịch sử). Loại trừ với `after` |
| `after` | message id | — | **mới** — delta tiến (catch-up) |
| `mark_read` | `1`/`true` | off | **chỉ** khi không có `before` và không có `after` |

- Thứ tự trả về: **luôn tăng dần theo `(tao_luc, id)`** (giữ như hiện tại — client không phải đổi).
- `hasMore` với `after` = **còn tin mới hơn nữa** ⇒ client hiểu là "gap lớn, reload tail".
- Lỗi: 400 (`before`+`after`), 401, 403 (`FORBIDDEN` từ `assertRoomMember`), 500.
- Cursor **không tồn tại / không thuộc phòng** → xử lý như không có cursor (trả tail), **không** 500. Ghi rõ trong test.

---

## 6. Edge case — bảng kiểm (mỗi dòng phải có test hoặc kịch bản tay)

| # | Tình huống | Rủi ro | Cách chặn |
|---|---|---|---|
| E1 | Hai tin cùng `tao_luc` ở biên trang | Sót/trùng tin | Keyset `(tao_luc, id)` + order 2 cấp (Phase 1.1) |
| E2 | Catch-up tự mark read | Mất badge/watermark | `markRead=false` khi có `after`; test badge sau catch-up |
| E3 | Envelope + CDC + poll cùng báo 1 tin | Bubble trùng, beep 3 lần | `reconcileChatMessage` (đã có) + `Set` id đã beep ở provider |
| E4 | Gap > limit sau khi ngủ lâu | Thiếu tin giữa | `hasMore` ⇒ reload tail, không nối delta |
| E5 | Tin một phía `chi_hien_cho` | Leak cho người không được thấy | Fan-out lọc **ở server** (tái dùng logic push); envelope không mang thân tin |
| E6 | Phòng org (advisory) | Lộ tên staff thật | Envelope không mang thân tin; preview trung tính (§7) |
| E7 | Phòng lớp có freeze kỳ học | HV thấy tin ngoài kỳ | Nội dung vẫn chỉ đến từ `listRoomMessages` (đã lọc) — envelope không bypass |
| E8 | Optimistic đang chờ, tin thật về từ 2 nguồn | Nhân đôi bubble của chính mình | Đường `from === "me"` trong `reconcileChatMessage` (đã có); test riêng ảnh/GIF/album |
| E9 | Nhiều tab cùng user | N lần beep, N request | Beep dùng `Set` chung; per-tab request thì chấp nhận (có debounce) |
| E10 | Reconnect storm (mạng chập chờn) | Bão request | Backoff đã có + debounce catch-up 120ms + inflight dedupe |
| E11 | JWT hết hạn (~1h) | Kênh câm | `setAuth` + `TOKEN_REFRESHED` (đã có ở L35b) — áp cho kênh mới |
| E12 | Publish lỗi / Realtime down | Không gửi được tin | Publish fire-and-forget, có timeout, không throw ra `sendRoomMessage` |
| E13 | Workers nhiều isolate | Coalesce/rate-limit không nhất quán | Không dùng state in-memory cho tính đúng đắn; chỉ dùng cho tối ưu |
| E14 | Phòng rất đông (lớp/hub) | Fan-out đắt | Trần người nhận; vượt trần → dựa CDC/poll |
| E15 | Thu hồi / sửa tin | UI giữ bản cũ | Publish cả UPDATE; giữ `handleRealtimeUpdate` |
| E16 | Card đơn hàng bump `tao_luc` | Card nhân bản / sai vị trí | `mergeChatMessageUpdate` đã sort lại — giữ, test lại luồng shop |
| E17 | Cursor là tin đã bị xoá cứng | 500 | Coi như không có cursor → trả tail |
| E18 | Đồng hồ client lệch | Cursor sai | Cursor **luôn là message id do server phát**, không dùng `Date.now()` client |
| E19 | User nhảy tab liên tục | Nã `/api/chat/threads` (6 nhóm query) | `maxAgeMs ~5s` cho đường visibility, **không** `force` (§Phase 1.4) |
| E20 | Mở phòng còn 100 tin chưa đọc, chỉ tải 30 | 70 tin bị coi là đã đọc (L-5) | Phase 1A: `markRoomRead` tôn trọng cursor |
| E21 | Overlay + bubble mini cùng một phòng | 2 poller, 2 lần patch state | Khoá theo `roomId` (§Phase 1.6), overlay ưu tiên |
| E22 | Cắt `markRoomRead`/`UPDATE cap_nhat_luc` khỏi đường POST (1C) | Thread không nhảy lên đầu; badge tự sáng lại | Kiểm từng call-site đọc ngay sau POST; nếu nghi ngờ thì **giữ await** |
| E23 | Provider không mount trên route org/quản lý | Refactor L-7 làm mất realtime ở 2 surface đó | Xác minh mount **trước** khi gỡ hook; không mount thì hoãn tới Phase 2 |

---

## 7. Bảo mật (rà theo `CINS_DEV_RULES.md`)

1. **Service-role không bao giờ xuống client.** Publish chỉ chạy server-side (`lib/chat/publish.ts` phải `import "server-only"`).
2. **Private channel + policy.** Topic `user:<id>` phải có policy trên `realtime.messages`; nếu không, kênh có thể bị người khác join. **Không** chấp nhận "đặt tên topic khó đoán" thay cho policy.
3. **Không tin client về quyền.** Người nhận do server tính từ `chat_thanh_vien` + `chi_hien_cho`; client không được yêu cầu "gửi tin phòng X cho tôi".
4. **Envelope là dữ liệu tối thiểu.** Không `noi_dung` đầy đủ cho phòng có perspective. Chốt cần user quyết (§10-Q2): preview thật (tiện, giống Messenger) vs preview trung tính cho phòng org/lớp (an toàn hơn).
5. **Không dùng envelope làm nguồn render nội dung.** Mọi thân tin vẫn qua `listRoomMessages` — nơi đã có `assertRoomMember` + lọc kỳ/lớp/`chi_hien_cho` + org perspective. Đây là bất biến quan trọng nhất của plan.

---

## 8. Rollout & rollback

| Bước | Hành động | Rollback |
|---|---|---|
| 1 | Ship Phase 1 (không flag — thuần cải thiện) | Revert commit; API `after` không ai gọi thì vô hại |
| 2 | Ship Phase 1.5 refactor | Revert commit |
| 3 | Policy `realtime.messages` (**xin duyệt user**) | DROP POLICY |
| 4 | Server publish `on`, client `shadow` — đo 3–5 ngày | Tắt env publish |
| 5 | Client `on` cho **chính user + vài tester** trước | Đổi env về `shadow` |
| 6 | `on` toàn bộ, CDC vẫn chạy ≥ 2 tuần | Đổi env |
| 7 | Xét tắt CDC (**xin duyệt user**) | ADD TABLE lại vào publication |

Không bước nào yêu cầu sửa dữ liệu ⇒ **mọi rollback là đổi env hoặc revert code**, không có backfill.

---

## 9. Ma trận verify (chạy tay, ghi kết quả vào plan này khi build)

**Thiết bị:** desktop Chrome · iPhone Safari · Android app native (nếu có bản dev) — tối thiểu 2 trong 3, 2 account.

| # | Kịch bản | Kỳ vọng |
|---|---|---|
| V1 | Cả hai mở cùng phòng, gửi 20 tin qua lại | < 500ms, không trùng, đúng thứ tự |
| V2 | B không mở phòng | Badge + beep < 2s, đúng 1 lần |
| V3 | B mở 3 tab | 1 beep, cả 3 tab cùng cập nhật |
| V4 | Cùng account 2 máy, gửi từ máy 1 | Máy 2 hiện tin mình vừa gửi (mục tiêu "đồng bộ như Facebook") |
| V5 | DevTools chặn WS | Vẫn đúng qua poll 20s; bỏ chặn → catch-up ngay, không trùng |
| V6 | Ẩn tab 10 phút, gửi 40 tin | Mở lại: đủ 40, đúng thứ tự, badge đúng |
| V7 | Máy ngủ 1h (JWT hết hạn) | Thức: reconnect + catch-up, không mất tin |
| V8 | Phòng nhóm 5+ người | Tất cả nhận; không ai nhận trùng |
| V9 | Phòng lớp có freeze kỳ | HV **không** thấy tin ngoài kỳ |
| V10 | Phòng org (khách ↔ CSĐT) | Khách không thấy tên staff; member org thấy hint |
| V11 | Tin một phía (`chi_hien_cho`) | Chỉ đúng người thấy; người khác không cả badge |
| V12 | Gửi ảnh / GIF / album / sticker | Optimistic không nhân đôi |
| V13 | Thu hồi + sửa tin | Cả hai bên cập nhật |
| V14 | Card đơn hàng bump | Card xuống đáy, không nhân bản, buyer được beep |
| V15 | Tạo phòng lớp / đơn học phí (luồng 1.5) | Tin hệ thống vẫn tới đúng như trước |
| V16 | Mạng chập chờn 2 phút (throttle) | Không bão request; hồi phục sạch |
| V17 | Phòng 100 tin chưa đọc, mở rồi đóng ngay | Badge còn đúng số tin chưa cuộn tới (Phase 1A) |
| V18 | A gửi 3 tin trong lúc B đang gõ, B gửi 1 tin | 3 tin của A **không** bị tự đánh dấu đã đọc |
| V19 | Nhảy tab 20 lần trong 30 giây | ≤ ~6 request `/api/chat/threads` (không phải 20) |
| V20 | Mở hộp thư org + overlay cùng lúc | DevTools: 1 kênh `cins-chat:*`; 1 poller/phòng; 1 beep |

Thêm: `ReadLints` mọi file sửa · DevTools Network WS còn `101` sau 60' idle · `sessionStorage` chat không phình.

---

## 10. Câu hỏi cần user chốt trước khi build

**Q1 — Phạm vi lần này:** làm **Phase 1 (+1.5)** rồi đo và quyết, hay cam kết luôn tới Phase 2?
*Khuyến nghị:* Phase 1+1.5 trước. Rẻ, gần như chỉ được, và làm nền bắt buộc cho Phase 2.

**Q2 — Preview trong envelope** (§7-4): preview thật cho mọi phòng (tiện, giống Messenger) hay **trung tính** cho phòng org/lớp?
*Khuyến nghị:* trung tính cho org/lớp, thật cho DM/nhóm bạn bè.

**Q3 — Interval an toàn phòng đang mở:** 20s (đề xuất) hay 10s (nhanh hơn khi WS chết, tốn hơn)?

**Q4 — Trần fan-out** (E14): ngưỡng bao nhiêu người nhận thì bỏ publish? Đề xuất 200.

**Q5 — Có bật `shadow` đo trước** (thêm ~3–5 ngày) hay bật `on` luôn sau khi test tay?
*Khuyến nghị:* có `shadow` — đây là cách duy nhất biết envelope phủ đủ trước khi phụ thuộc vào nó.

**Q6 — `markRoomRead` (L-5, §Phase 1A):** sửa để tôn trọng cursor "đã đọc tới đây", hay giữ hành vi "mở phòng là đọc hết"?
*Khuyến nghị:* sửa, commit riêng. Đây là bug **đang làm mất unread** hằng ngày, độc lập với chuyện nhanh/chậm.

**Q7 — Presence toàn sàn (L-10):** có muốn tôi đo lưu lượng topic `__cins_global__` trong lần này (chỉ đo, không sửa) để biết nó có góp phần làm chat chậm không?

---

## 10b. Quyết định của user (31/08/2026)

| Câu | Chốt |
|---|---|
| Phạm vi đợt này | **Phase 1 → 1A → 1B → 1C**. Chưa Phase 2. |
| Q2 preview envelope | Trung tính cho org/lớp, thật cho DM/nhóm (áp dụng khi tới Phase 2) |
| Q3 nhịp lưới an toàn | **20s** |
| Q6 `markRoomRead` | **Giữ nguyên hành vi "mở phòng là đọc hết".** ⇒ Phase 1A **thu hẹp**: chỉ đảm bảo đường `after` **không bao giờ** mark read; **không** sửa `markRoomRead`. E20/V17/V18 chuyển thành "xác nhận hành vi cũ không tệ hơn", không phải fix. |
| Q5 shadow | Không dùng shadow (chỉ liên quan Phase 2) |
| Q7 presence toàn sàn | **Chỉ đo**, không sửa đợt này |

## 10c. Nhật ký thực thi (31/08/2026) — Phase 1 · 1A · 1B · 1C **ĐÃ LÀM**

### Sửa lại con số ở §1.3: **7 chỗ ghi tin, không phải 2**

Lượt scan 1 tôi đếm 2 chỗ INSERT ngoài `sendRoomMessage` — **đếm thiếu**, vì regex không bắt trường hợp `.from("chat_tin_nhan")` và `.insert(` nằm khác dòng. Thực tế có **6 chỗ** ngoài choke point:

| File | Tin gì |
|---|---|
| `lib/co-so/lop-chat-phong.ts` | chào mừng HV vào lớp |
| `lib/co-so/don-hoc-phi-chat.ts` | card "Tham gia phòng học" |
| `lib/chat/room-poll.ts` | tin bình chọn |
| `lib/chat/room-moc-notify.ts` | nhắc mốc |
| `lib/chat/canvas/comment-notice.ts` | thông báo bình luận canvas |
| `lib/media/call-history.ts` | tín hiệu cuộc gọi |
| `lib/co-so/lop-he-thong-tin.ts` | tin hệ thống bài tập / nộp bài |

Đây đúng là các luồng **nặng thông báo nhất**. Nếu Phase 2 chỉ nối vào `sendRoomMessage` thì bình chọn, nhắc mốc, cuộc gọi, bài tập lớp **đều không được đẩy**.

### Đã làm

**Phase 1 — catch-up cursor**
- `listRoomMessages`: thêm `after`; keyset `(tao_luc, id)` **cho cả hai chiều** (sửa L-3); short-circuit khi delta rỗng (L-9); delta không trả `readCursors`/`pinnedMessages`.
- **Guard cứng L-5/E2:** `isDelta ⇒ shouldMarkRead = false` kể cả khi caller truyền `markRead: true`. Route cũng chặn `mark_read` khi có cursor. (Theo Q6, **không** sửa `markRoomRead`.)
- Route: `after`, 400 khi kèm `before`, 400 cho `CURSOR_CONFLICT`.
- `use-open-room-message-backfill.ts`: **3s → 20s**, chuyển sang `?after=`, thêm trigger `online` + `CHAT_REALTIME_RESUBSCRIBED_EVENT`, **phân trang delta tối đa 4 vòng × 50 tin** để lấp gap **không để lỗ ở giữa**, khoá 1 poller/phòng (L-8, overlay `priority: 1`).
- `latestServerMessageId()` — cursor bỏ qua bản optimistic (nếu không, `after` là id optimistic ⇒ server coi như không cursor ⇒ kéo cả tail).
- `maxAgeMs` cho `prefetchChatThreads`; provider + stack dùng **5s** ở `visibilitychange`/`focus` (L-4) — **không** `force`.

**Phase 1B — một cửa**
- `lib/chat/insert-message.ts` (mới): `insertChatMessageRow()` + `CHAT_MESSAGE_ROW_COLS`. **Cả 7 chỗ** ghi tin đi qua đây; grep `from("chat_tin_nhan") … .insert` giờ chỉ còn 1 kết quả. Đây là điểm nối publish của Phase 2.
- Giữ nguyên hành vi từng call-site: chỗ nào **không** bump `cap_nhat_luc` thì vẫn không; chỗ nào bump **sau** khi tạo xong bản ghi phụ (bình chọn, mốc) thì giữ nguyên vị trí bump.
- **E23 đã xác minh:** `OrgInboxPanel` và `TinNhanQuanLyClient` đều gọi `useCinsChat()` (throw nếu thiếu provider) ⇒ provider chắc chắn mount ⇒ an toàn gỡ hook riêng. Cả hai chuyển sang `subscribeChatMessages`; `useChatRealtime` giờ **chỉ còn ở provider** (L-7).

**Phase 1C — cắt round-trip POST**
- Tách `enrichMessageFromRow()` khỏi `fetchMessageById()`: đường gửi tin **không đọc lại tin vừa ghi** (row từ `INSERT … RETURNING` dùng đúng `MESSAGE_SELECT`).
- `markRoomRead` + enrich chạy **song song**. `markRoomRead` **vẫn `await`** — cố tình không fire-and-forget để tránh E22 (badge tự sáng lại vì watermark chưa ghi).
- Còn giữ: bump `cap_nhat_luc` awaited (Workers không có `waitUntil` ở đây, fire-and-forget có thể bị cắt).

### Verify đã chạy

| Việc | Kết quả |
|---|---|
| `scripts/check-chat-keyset.mjs` (mới, read-only, DB thật) | Keyset tiến/lùi **khớp từng id** với thứ tự chuẩn; `or(...and(...))` với timestamp `+00:00` chạy đúng; **hai `or()` = AND** (không OR chéo với `chi_hien_cho`) |
| `tsc --noEmit` | **8 lỗi = đúng baseline** trước khi sửa (nợ cũ ở `posts/publish`, `CinsBoard`, `JourneyPopoverPicker`, `JourneyShopStorefront`, `shop-switch`, và `CinsChatOverlay:4907` — dòng không ai chạm). Bắt được 3 lỗi thật do tôi (`chat` ngoài scope trong `CoSoRoomsPane`) và đã sửa. |
| `ReadLints` mọi file sửa | Sạch |

**Chưa chạy:** ma trận V1–V20 (cần 2 thiết bị / 2 account thật) — xem §9.

### Q7 — đo presence toàn sàn (`scripts/check-presence-global.mjs`, chỉ lắng nghe)

- Lúc đo: **0–1 người online**, payload `presenceState` ~**145 B/người**. Ở quy mô hiện tại **không phải vấn đề** — chưa cần sửa.
- Nhưng lưu lượng đúng là ~O(N²): mỗi join/leave đẩy 1 sync **mang cả danh sách** tới **mọi** client. N=500 ⇒ mỗi lần vào/ra đẩy ~500 × 72 KB. Đây là landmine khi đông, không phải bug hôm nay.
- ⚠️ **Phát hiện phụ (bảo mật):** script join được topic **chỉ bằng anon key** (key này nằm trong bundle client, ai cũng có). Nghĩa là **bất kỳ ai cũng liệt kê được profile id của toàn bộ người đang online trên CINs**. Rò rỉ nhẹ nhưng thật. Cần brief riêng — không sửa trong đợt này.

## 11. Hệ quả tài liệu (cập nhật khi build xong)

- `docs/CINS_DECISIONS.md` — LOG mục mới (nối L35 / L35b): đổi transport chat sang broadcast envelope, CDC làm fallback; nêu rõ SoT không đổi.
- `docs/CINS_IMPLEMENTATION.md` — bảng API `chat/rooms/[roomId]/messages` thêm `after`; mục `lib/chat/` thêm `publish.ts`, `use-chat-user-channel.ts`.
- `docs/PLAN_realtime_lag_thong_bao.md` — trỏ sang plan này cho phần P2 "gộp hook realtime".
- Nếu chạy policy `realtime.messages`: ghi vào inventory DB change của DECISIONS + thêm file `supabase/sql/`.

---

## 12. Điều plan này **không** hứa

- Web ở tab ẩn / iOS Safari nền vẫn có thể câm cho tới khi bạn quay lại — đó là giới hạn của trình duyệt, không phải của kiến trúc này. Đường đúng là native + push (Phase 3).
- Không bằng Messenger về p95 khi mạng xấu: họ có hạ tầng riêng + retry ở tầng protocol.
- Không giảm được số lần "phải fetch" xuống 0 nếu vẫn dùng envelope mỏng — đó là **đánh đổi có chủ ý** để đổi lấy một đường code an toàn.
