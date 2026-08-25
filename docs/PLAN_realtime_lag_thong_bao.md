# PLAN: Sửa "ở lâu bị lag + mất thông báo tin nhắn"

Ngày: 25/08/2026 · Model: Grok 4.6 (FIX đa file) · Trạng thái: **ĐÃ SHIP P0 + P1a** (2026-08-25)

Xuất phát: user báo `cins.vn` mới vào mượt, **ở lâu thì lag dần + mất báo tin nhắn** — cảm giác "cache đầy". F5 lại hết.

## Chẩn đoán (đã xác minh trong code)

App Router là SPA → **JS/RAM/DOM/socket không bị unload khi chuyển trang**. Cái "phình theo thời gian" là realtime chết + bộ nhớ client, KHÔNG phải cache CDN.

### A. Mất thông báo tin nhắn (P0)

Thông báo chat (âm thanh, badge tab, bubble góc) chỉ sống nhờ WebSocket Supabase (`useChatRealtime`). Poll unread dự phòng chạy tận **120s/lần** → không bù kịp.

Đã vá 1 lần ở **DECISIONS L35** (2026-07-25): `CHANNEL_ERROR`/`TIMED_OUT` + reconnect khi `visibilitychange`/`online`. **Lỗ còn lại** khớp triệu chứng "ngồi yên không rời tab":

| Lỗ | Hệ quả |
|---|---|
| Không xử lý `CLOSED` trong `.subscribe()` | Server/proxy đóng WS im lặng → không reconnect |
| Không có watchdog khi tab đang mở | Chỉ nối lại khi đổi tab/mạng; tắt màn hình Windows thường không bắn `hidden` |
| `removeChannel` **không await** + topic random mỗi lần | Socket cũ chưa chết đã tạo mới → chồng socket → lag → hết slot WS |
| JWT ~1h + timer bị Chrome throttle ở tab nền | Token hết hạn → realtime câm; không refresh khi quay lại |

Neo: `lib/chat/use-chat-realtime.ts:84`, `lib/chat/use-chat-read-cursors-realtime.ts:82`, `lib/chat/use-room-presence.ts:50`.

### B. Lag "như cache đầy" (P1)

1. **Mỗi tin realtime `JSON.stringify` cả phòng vào `sessionStorage`**, mảng tin **không cap** → quota ~5MB đầy, stringify ngày càng đắt trên main thread. Neo: `writeRoomMessagesCache` (`lib/chat/chat-session-cache.ts`), gọi ở `CinsChatFloatingStack:1189`, `CinsChatOverlay:2567`.
2. Feed World Journey **không ảo hóa** — cuộn lâu giữ toàn bộ card + ảnh + IntersectionObserver trong DOM.
3. Cache RAM không trần: `milestone-detail-cache`, `gallery-video-dimension-cache`, `post-local-cache`.

## Phạm vi đã ship (P0 + P1a)

### P0 — Realtime resilience (3 hook) ✅

Áp cùng một bộ cho cả 3 hook, **không đổi logic nghiệp vụ** (mapping tin, unread, âm thanh, watermark, presence key):

1. Thêm `CLOSED` vào nhánh reconnect.
2. `teardown()` thành **async + await `removeChannel`** trước khi subscribe lại; cờ `reconnecting` chống chồng.
3. **Watchdog** `setInterval` ~25s: khi tab `visible` mà `channel.state` không phải `joined`/`joining` → `hardReconnect()`. Kênh khỏe → không làm gì (không churn).
4. `hardReconnect()`: `await teardown()` → `supabase.realtime.setAuth()` (làm mới JWT từ accessToken callback) → `connect()`.
5. `onAuthStateChange('TOKEN_REFRESHED')` → `hardReconnect()`.
6. Giữ nguyên `visibilitychange`/`online`/backoff cũ.

API đã xác minh trong `@supabase/realtime-js`: `REALTIME_SUBSCRIBE_STATES.CLOSED`, getter `channel.state` (`joined|joining|...`), `RealtimeClient.setAuth(token?)`.

Files:
- `lib/chat/use-chat-realtime.ts` — INSERT/UPDATE `chat_tin_nhan` (badge/âm thanh/bubble).
- `lib/chat/use-chat-read-cursors-realtime.ts` — watermark đã đọc.
- `lib/chat/use-room-presence.ts` — presence + re-`track` khi `SUBSCRIBED`.

### P1a — Cap tin trong cache phiên ✅

- `lib/chat/chat-session-cache.ts`: `writeRoomMessagesCache` chỉ giữ **N tin cuối** (`CHAT_SESSION_MESSAGES_CAP = 200`). Chặn `sessionStorage` phình + stringify đắt. Không đụng state React.

## Ngoài phạm vi (đề xuất P2 — làm sau, cần brief riêng)

- Ảo hóa / unmount card ngoài viewport ở World Journey feed.
- LRU + trần cho các Map cache RAM (`milestone-detail`, `gallery-video-dimension`).
- Cân nhắc gộp 3 hook realtime vào 1 helper `useResilientRealtimeChannel` (giảm drift) — refactor thuần, không đổi hành vi.

## P3 liên quan (đã ship riêng)

- Tab stale hard reload kiểu Facebook — [`PLAN_tab_stale_refresh.md`](./PLAN_tab_stale_refresh.md) · DECISIONS **L35c**.

## Verify

- `ReadLints` 4 file đã sửa.
- Thủ công trên `cins.vn`: DevTools → Network → WS lọc `supabase` sau 30–60' idle vẫn còn `101`; Application → Session Storage `cins-chat-messages:v1:*` không vượt vài trăm KB; gửi tin từ máy khác khi để tab lâu → vẫn kêu + badge.

## Hệ quả tài liệu

- ✅ **DECISIONS L35b** (2026-08-25): realtime watchdog + CLOSED + token refresh; cap cache tin phiên. Plan này = SoT kỹ thuật; DECISIONS = mốc quyết định.
