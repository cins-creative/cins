# PLAN: Tab stale refresh kiểu Facebook

Ngày: 25/08/2026 · Model: Grok 4.6 · Trạng thái: **ĐÃ SHIP** (2026-08-25) — user chốt STALE=90' · guard compose · hard reload

## Mục tiêu

Khi user **để tab cins.vn nền lâu rồi quay lại**, app **hard reload đúng URL hiện tại** một lần — giống Facebook/Instagram web: dọn heap, DOM feed, socket zombie, JWT stale. L35b (reconnect realtime) vẫn giữ cho idle ngắn; lớp này là **an toàn cho idle dài**.

Không dùng `router.refresh()` làm thay thế hard reload — RSC refresh **không** xóa JS heap / `sessionStorage` phình / WebSocket chồng.

## Hành vi đã ship (v1)

| | Chốt |
|---|---|
| Trigger | `visibilitychange` → `visible` **và** tab đã `hidden` liên tục ≥ **`STALE_MS`** |
| Hành động | `window.location.reload()` |
| `STALE_MS` | **90 phút** (`STALE_TAB_MS` trong `StaleTabReload.tsx`) |
| Soft path ngắn | **Không** — L35b soft-reconnect |
| Loop guard | `sessionStorage` `cins-stale-reload-at` — cooldown **60s** |
| Phạm vi mount | `<StaleTabReload />` trong `CinsShellFrame` |

### Không reload khi (guard)

1. `[data-cins-call-active]` — cuộc gọi / chuông đến (IncomingCallHost, overlay, mini).
2. `[data-cins-compose-dirty]` — compose overlay/mini có chữ, ảnh pending, hoặc card ngữ cảnh chờ gửi.
3. `activeElement` input/textarea/select/contenteditable có nội dung không rỗng.

## Files

| File | Việc |
|---|---|
| `components/cins/StaleTabReload.tsx` | Hook visibility + guards + reload |
| `components/cins/CinsShell.tsx` | Mount |
| `ChatIncomingCallHost` · overlay · mini | `data-cins-call-active` / `data-cins-compose-dirty` |
| `docs/CINS_DECISIONS.md` | L35c |

## Verify

1. Tab nền **< 90'** → không reload.
2. Tab nền **≥ 90'** → 1 lần reload, URL giữ.
3. Đang gõ chat / đang gọi → không reload.
4. Reload xong → nền 5s quay lại → không reload (cooldown).
