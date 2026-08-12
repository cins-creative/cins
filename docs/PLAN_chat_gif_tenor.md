# PLAN — Tab GIF trong ChatStickerPicker (Tenor-shape → Giphy)

> **Phase:** BUILDING · **Ngày plan:** 2026-08-11 · **Build:** 2026-08-12 (Grok 4.5).
> Scope: picker meme/chat + API proxy GIF + gửi tin. Không đụng Journey schema, org, canvas, shop.
>
> **Đã ship Step 1–4:** `/api/gif/*` · tab GIF trong `ChatStickerPicker` · wire chat + CommentBlock.
> Cần `GIPHY_API_KEY` trong `.env.local` (+ Worker secret) — thiếu thì tab hiện “Chưa bật GIF”.

---

## 0. Yêu cầu (từ user)

1. Trong panel **My meme** (`ChatStickerPicker`) có cách **tìm / gửi GIF**.
2. Nguồn kiểu **Tenor** (search + trending/featured).

---

## 1. Quyết định kiến trúc (đọc trước khi code)

### 1.1 Tenor API đã chết — dùng Giphy Tenor-compat

Google **sunset Tenor API 2026-06-30**. Không đăng ký key Tenor mới; gọi `tenor.googleapis.com` sẽ fail.

**Chốt provider:** [GIPHY Tenor Compatibility API](https://developers.giphy.com/docs/api/tenor-migration/)

| Việc | Giá trị |
|---|---|
| Host | `https://api.giphy.com` (thay `tenor.googleapis.com`) |
| Search | `GET /v2/search?q=&key=&client_key=&limit=&pos=` |
| Featured / trending | `GET /v2/featured?...` |
| Key | `GIPHY_API_KEY` (server-only) |
| `client_key` | cố định `cins_chat` (mọi call) |
| `locale` | `vi_VN` |
| `country` | `VN` |
| `contentfilter` | `medium` (G/PG — phù hợp MXH) |
| `media_filter` | `tinygif,gif` (preview nhỏ + bản gửi) |

Lib nội bộ đặt tên **`lib/gif/tenor-compat.ts`** (shape Tenor) — nếu sau này đổi host/provider, UI không đổi.

**User cần làm tay:** tạo app + API key tại [developers.giphy.com](https://developers.giphy.com/) → bỏ vào `.env.local` + Worker secret `GIPHY_API_KEY`. Production key thường cần approve Giphy (beta key rate-limit thấp).

### 1.2 Không hotlink CDN ngoài khi gửi tin

Luật media CINs: ảnh → **Cloudflare Images**; DB chỉ giữ `cloudflare_id`.

**Chốt send path:**

1. User chọn GIF trong picker (preview vẫn từ Giphy CDN — chỉ browse).
2. Server **validate URL** (allowlist host Giphy) → `uploadCloudflareImageFromUrl` (đã hỗ trợ `image/gif`) → lấy `imageId`.
3. Gửi tin chat bằng **`cloudflareImageId`** path hiện có (`loai_tin: media`), **không** tạo `user_emoji_muc`.

Lý do không gửi như `sticker` / `emojiMucId`:

- Sticker bắt buộc meme **thuộc** user (`resolveOwnedUserEmojiMuc`).
- GIF one-shot ≠ bộ My meme.
- Media path đã có ở DM / org / overlay / floating — ít đụng schema.

**Không** Phase 1: “Lưu vào My meme” (có thể Step sau: mirror CF → `addUserEmojiMucClient`).

### 1.3 UI: tab trong cùng picker — không popup mới

`ChatStickerPicker` thêm 2 chế độ:

| Tab | Nội dung |
|---|---|
| **My meme** | Giữ nguyên (bộ `user_emoji_*`) |
| **GIF** | Search + grid featured; attribution GIPHY |

Props mở rộng:

```ts
type Props = {
  onClose: () => void;
  onSend: (item: UserEmojiMuc) => void;       // My meme — giữ nguyên
  onSendGif?: (payload: { cloudflareImageId: string; previewUrl?: string }) => void;
  disabled?: boolean;
};
```

Parent (5 chỗ dùng picker) wire `onSendGif` → cùng đường gửi ảnh chat (`cloudflare_image_id` / optimistic media), **không** `id_emoji_muc`.

Chỗ dùng (chỉ sửa compose, không refactor lớn):

- `CinsChatOverlay.tsx`
- `CinsChatFloatingStack.tsx`
- `OrgInboxPanel.tsx`
- `TinNhanQuanLyClient.tsx`
- `CommentBlock.tsx` — nếu comment chưa có send-media-by-id, **Phase 1: ẩn tab GIF** ở comment (hoặc disable + tooltip). Quyết định mặc định: **chỉ bật GIF nơi đã gửi được ảnh CF** (overlay + floating + org inbox + tin nhắn QL). Comment = Step riêng nếu cần.

### 1.4 Proxy server — key không ra client

| Route | Việc |
|---|---|
| `GET /api/gif/search?q=&pos=` | Auth session bắt buộc → proxy Giphy `/v2/search` |
| `GET /api/gif/featured?pos=` | Auth → proxy `/v2/featured` |
| `POST /api/gif/import` | Auth → body `{ url, id? }` → allowlist + CF upload → `{ imageId, url }` |

**Không** gọi Giphy từ browser. **Không** trả raw API key.

Response normalize (ẩn chi tiết Giphy thừa):

```ts
type GifResult = {
  id: string;
  previewUrl: string;   // tinygif
  url: string;          // gif (bản import)
  width: number;
  height: number;
  title?: string;
};
type GifPage = { items: GifResult[]; next: string | null };
```

### 1.5 Allowlist URL khi import

Chỉ chấp nhận host Giphy CDN (cập nhật nếu docs đổi), ví dụ:

- `media.giphy.com`
- `media0.giphy.com` … `media4.giphy.com`
- `i.giphy.com`
- `*.giphy.com` qua check hostname kết thúc bằng `.giphy.com` **và** `isSafePublicHttpUrl`

Từ chối URL arbitrary (SSRF). Reuse `isSafePublicHttpUrl` + thêm `isAllowedGifCdnUrl`.

### 1.6 Attribution & ToS

- Footer tab GIF: **Powered by GIPHY** (logo/text theo [GIPHY guidelines](https://developers.giphy.com/docs/) — không style lại logo sai).
- Không strip watermark metadata nếu có.
- Không cache vĩnh viễn toàn bộ thư viện Giphy trên CF — chỉ mirror **GIF user đã gửi** (giống ảnh chat thường).

### 1.7 Không schema DB mới

Không `CREATE`/`ALTER`. Tin GIF = tin `media` + `content_media` như ảnh thường. Thumbnail preview trong thread dùng delivery CF `public` (GIF animated được CF Images phục vụ nếu upload đúng mime).

**Rủi ro đã biết:** một số variant CF có thể flatten animation — dùng variant `public` (cùng meme/chat hiện tại). Nếu prod thấy GIF đứng hình → ticket riêng (variant / `anim=true`), không block Phase 1.

---

## 2. Database

**Không có.** Chỉ xác nhận không nhầm với `user_emoji_*`.

---

## 3. API / Lib

### 3.1 Env

| Biến | Scope |
|---|---|
| `GIPHY_API_KEY` | `.env.local` + `wrangler secret` (Worker `cins`) |
| (optional) `GIPHY_CLIENT_KEY` | default `cins_chat` |

Cập nhật ghi chú env trong `CINS_IMPLEMENTATION.md` sau khi ship (hỏi user).

### 3.2 Lib

| File | Việc |
|---|---|
| `lib/gif/constants.ts` | limit, filter, client_key, allowlist host |
| `lib/gif/tenor-compat.ts` | fetch search/featured → `GifPage` |
| `lib/gif/import-to-cloudflare.ts` | validate URL + `uploadCloudflareImageFromUrlChiTiet` |
| `lib/gif/client.ts` | fetch helpers cho picker |

### 3.3 Routes

| Method | Path | Auth | Rate |
|---|---|---|---|
| GET | `/api/gif/search` | session | ~30/phút/user (in-memory như auth routes) |
| GET | `/api/gif/featured` | session | cùng |
| POST | `/api/gif/import` | session | ~20/phút/user; cap size theo CF image limits |

Lỗi: thiếu key → `503` message rõ (“GIF chưa cấu hình”); Giphy 429 → `429`; import fail → map `lyDo` hiện có.

### 3.4 Gửi tin — không API message mới

Sau `import` → client gọi **đúng** send message hiện có với `cloudflare_image_id` (cùng ảnh đính kèm). Optimistic UI: preview local từ `previewUrl` / CF url.

---

## 4. Frontend

### 4.1 `ChatStickerPicker`

- Header: segmented **My meme | GIF** (token CINS, không invent palette).
- Tab GIF:
  - Input search debounce **300ms** → `/api/gif/search`
  - Empty query → `/api/gif/featured`
  - Grid (reuse class grid sticker hoặc `cins-chat-gif-grid`)
  - Infinite scroll / nút “Thêm” dùng `next` cursor
  - Click → `import` (loader trên cell) → `onSendGif` → `onClose`
- Attribution GIPHY dưới grid.
- CSS: `app/cins-chat-overlay.css` (cùng block sticker picker).

### 4.2 Parents

Mỗi parent đã có `sendSticker` / gửi ảnh: thêm `sendGifFromPicker({ cloudflareImageId })` song song đường gửi ảnh 1 tấm (không album phức tạp).

### 4.3 A11y

- `role="tablist"` cho My meme / GIF
- Search `aria-label="Tìm GIF"`
- Cell button `aria-label` từ `title` hoặc “Gửi GIF”

---

## 5. Steps (build theo thứ tự)

| Step | Việc | File chính | Verify |
|---|---|---|---|
| **1** | Env + lib tenor-compat + allowlist + routes search/featured/import | `lib/gif/*`, `app/api/gif/**` | curl search có session; không key → 503; URL lạ → 400 |
| **2** | UI tab GIF trong `ChatStickerPicker` + CSS | picker + css | Featured hiện; search debounce; attribution |
| **3** | Wire `onSendGif` overlay + floating (+ org/QL nếu cùng pattern) | 2–4 compose clients | Chọn GIF → tin `media` animated trong phòng |
| **4** | (Optional) CommentBlock / “Lưu My meme” | sau khi user chốt | — |

**Không** làm Step 2–3 nếu Step 1 chưa có `GIPHY_API_KEY` local.

---

## 6. Edge cases

| Case | Xử lý |
|---|---|
| Chưa có `GIPHY_API_KEY` | Tab GIF hiện empty + “Chưa bật GIF (thiếu cấu hình)” — không crash My meme |
| GIF > trần CF / nén fail | Toast lỗi; không gửi tin rỗng |
| User spam click | Disable cell khi `importingId`; rate-limit API |
| SSRF / URL giả | Allowlist host + `isSafePublicHttpUrl` |
| Giphy downtime | Error state + Retry |
| Offline / chậm | Giữ preview; fail import → không optimistic commit tin |
| Nội dung nhạy cảm | `contentfilter=medium` |
| Thu hồi tin | Giống media thường (purge CF nếu không còn ref) — **không** đụng `user_emoji` |

---

## 7. Security

- Key chỉ server.
- Auth bắt buộc mọi `/api/gif/*`.
- Không tin client `url` — allowlist + fetch server-side.
- Rate-limit theo user id (+ IP nếu có helper sẵn).
- Không log full URL query dài / PII.
- Attribution GIPHY bắt buộc trên UI browse.

**Quyền (gate DEV_RULES §3):**

1. **Ai xem tab GIF?** User đã đăng nhập, mở được compose chat (cùng điều kiện mở My meme).
2. **Ai gửi?** Chính user gửi vào phòng mình là thành viên — reuse guard send message hiện có sau khi có `cloudflareImageId`.
3. **Không** đụng verify / canonical.
4. Soft-delete / thu hồi: theo tin `media` hiện có.

---

## 8. Câu hỏi treo — cần user chốt trước build

1. **Provider:** Chấp nhận **Giphy Tenor-compat** (Tenor đã tắt)? (Khuyến nghị: **Có**)
2. **Gửi như `media` (ảnh GIF)** hay cố nhét layout **sticker** nhỏ? (Khuyến nghị: **media**)
3. **Comment Journey** bật GIF Phase 1 hay để sau?
4. Bạn đã có / sẽ lấy **GIPHY_API_KEY** (prod approval) chứ?

---

## 9. Ngoài scope

- SDK Giphy React chính thức (bundle nặng) — tự build UI theo token CINS.
- Klipy / Imgur / self-host thư viện GIF.
- Clip có tiếng (Giphy Clips).
- Đổi schema `loai_tin` mới (`gif`).
- Hotlink mãi `media.giphy.com` trong bubble.
