# CINs Widget — tham chiếu tích hợp (file riêng)

> Nguồn máy: `C:\Users\TheTrung\Projects\cins-widget`  
> Đưa vào repo này dưới dạng **tài liệu tham chiếu** — **không** gộp code Tauri/widget vào `app/` / `components/` / `lib/` của website.  
> App widget vẫn chạy độc lập; website CINS chỉ học pattern + biết chỗ map.

---

## 1. Widget là gì

Desktop moodboard Windows (**Tauri 2** + WebView2), brand CINs Design System.

| Khả năng | Chi tiết |
|----------|----------|
| Boards | Nhiều board; mỗi board mở sticky riêng trên desktop |
| Collage / slideshow | Fill / Fit; khung tròn / vuông / dọc / ngang / custom |
| Ảnh | Local, URL `https:`, sync board web (HTTP scrape trong app) |
| Rive | Gắn `.riv` URL hoặc file local per board; tôn trọng `prefers-reduced-motion` |
| Config | `%APPDATA%\com.cins.widget\` |

Chạy widget:

```bash
cd C:\Users\TheTrung\Projects\cins-widget
npm install
npm run dev          # Tauri
npm run preview      # UI browser, không native
```

---

## 2. Bản đồ nguồn (giữ nguyên ở máy widget)

| Layer | Path (trên máy widget) |
|-------|------------------------|
| UI | `src/index.html`, `styles.css`, `renderer.js`, `sticky.*` |
| Rive helpers | `src/rive-runtime.js` → `window.CinsRive` |
| Bridge | `src/cins-bridge.js` → `window.cins` (Tauri invoke) |
| Native | `src-tauri/` (Rust commands, capabilities) |
| Seed | `config.json` |
| Rive docs archive | `docs/rive-knowledge/` (INDEX + 01…10) |
| Designs (gallery tĩnh) | `designs/` — app **không** load |

Package: `@rive-app/canvas-lite`, `@tauri-apps/api` v2. Identifier: `com.cins.widget`.

---

## 3. Pattern Rive từ widget (học để tái dùng trên web CINS)

### 3.1 Runtime mỏng

- Package: **`@rive-app/canvas-lite`** (nhỏ nhất; đủ decorative / empty state).
- Self-host / vendor `rive.js` trong `src/vendor/rive/` khi cần offline WebView.
- Archive chọn renderer: `docs/rive-knowledge/04-choose-renderer.md`.

### 3.2 API `window.CinsRive` (`rive-runtime.js`)

```
loadBuffer(src)           // cache ArrayBuffer theo URL
mountRive({ canvas, src, stateMachine?, autoplay?, onLoad, onLoadError })
cleanup(instance)         // bắt buộc khi unmount / đổi board
pauseAll / playAll        // tab visibility
applyReducedMotionInput   // set bool input tên phổ biến trên SM
mountEmpty / cleanupEmpty // empty.riv + SM "bumpy"
```

Quy tắc vận hành đã implement:

1. **Buffer cache** — `fetch` một lần, `slice(0)` mỗi lần mount (tránh transfer ownership).
2. **`resizeDrawingSurfaceToCanvas()`** sau `onLoad`.
3. **`prefers-reduced-motion: reduce`** → không autoplay; pause; cố gắng set input SM (`prefersReducedMotion` / aliases).
4. **`visibilitychange`** → pause khi ẩn tab/cửa sổ; play lại khi hiện (nếu không reduced).
5. **`cleanup()`** khi clear Rive board / đổi nguồn — tránh leak instance.
6. Empty state: file local `cins/rive/empty.riv`, state machine `bumpy`.

### 3.3 Board model (Rive slot)

Mỗi board có thể gắn:

```json
{
  "rive": {
    "mode": "url" | "file" | "none",
    "src": "https://…/file.riv" | "filename.riv",
    "stateMachine": "…"
  }
}
```

Bridge commands liên quan: `pickRivFile`, `setBoardRive`, `rivUrl` / `resolve_riv_path`.

Stage UI: canvas `#stage-rive-canvas` ưu tiên hơn ảnh slideshow khi board có Rive; mount qua `CinsRive.mountRive` trong `renderer.js`.

### 3.4 Bảo mật widget (không copy mù vào web)

- Tauri IPC + capability allowlist — không `shell` / `exec`.
- URL ảnh/feed chỉ `https:`.
- Media local chỉ ảnh trong app-data `media/`.
- CSP chặt trong `index.html` / `tauri.conf.json` (+ `wasm-unsafe-eval` cho Rive).

Website Next.js có mô hình bảo mật khác (Supabase/R2) — đừng port IPC nguyên xi.

---

## 4. Map sang website CINs Creative (không merge code)

| Việc trên website (đã có) | Việc trên widget | Quan hệ |
|---------------------------|------------------|---------|
| `lib/cins/rive-runtime.ts` — WASM self-host | `rive-runtime.js` — canvas-lite helpers | Cùng ý: self-host + cleanup; **hai file độc lập** |
| `lib/cins/rive-embed.ts` — ưu tiên play SM | `mountRive(..., stateMachine)` | Cùng nguyên tắc: SM trước timeline |
| `CinsSidebarRiveBrand*` — logo sidebar | Empty `empty.riv` + SM `bumpy` | Micro-brand motion; có thể share asset `.riv` sau, không share API |
| Embed `.riv` trong post / R2 | Board `setBoardRive` + sticky | Cùng domain “attach riv”; storage khác |
| **`cins-creative` `/api/feed/[slug]`** | Sync board web / feed cover HTTPS | Portfolio public → widget nhét cover vào pool; **không scrape SPA** |

**Không làm:** import `renderer.js` / `cins-bridge.js` vào Next.js; không nhúng Tauri vào monorepo web.

**Feed Creative (Phase W):**
- Endpoint: `GET {CREATIVE_ORIGIN}/api/feed/{profileSlug}` → `{ slug, works:[{ id, title, coverUrl, workUrl }] }` (chỉ `public`/`feature`).
- Widget: thêm nguồn sync “CINs Creative” — fetch JSON, dùng `coverUrl` (imagedelivery.net https). Repo widget vẫn tách.

**Có thể làm sau (vẫn file/asset riêng):**

1. Copy (hoặc symlink) asset `empty.riv` vào `public/rive/` nếu muốn empty-state giống widget.
2. Port **ý tưởng** reduced-motion + buffer cache vào helper web mới (ví dụ `lib/cins/cins-rive-player.ts`) — viết lại TypeScript, không paste IIFE.
3. Khi build **editor animation CINS** (xem `RIVE_ARCHITECTURE_NOTES.md`): widget là consumer playback nhẹ; editor là author — giữ tách biệt.

---

## 5. Liên hệ kiến trúc Rive (research)

| Doc trong repo này | Vai trò |
|--------------------|---------|
| [`RIVE_ARCHITECTURE_NOTES.md`](./RIVE_ARCHITECTURE_NOTES.md) | Nguyên lý editor / format / SM / renderer |
| **File này** (`CINS_WIDGET.md`) | Pattern playback thực tế đã ship trong desktop widget |
| Widget `docs/rive-knowledge/` | Archive scrape docs Rive (2026-07-12) — đọc tại máy widget, không copy hàng loạt vào đây |

Widget xác nhận MVP playback nên:

- Dùng **canvas-lite** (hoặc canvas) cho decorative.
- Một `.riv` nhỏ + optional **một** state machine name.
- Honoring reduced-motion + cleanup là bắt buộc product.

Editor (notes) vẫn tách: author JSON/`cinsanim` ≠ play `.riv` của designer ngoài.

---

## 6. Checklist khi “tích hợp ý” vào product web

- [ ] Giữ widget repo / process riêng (`cins-widget`); không submodule bắt buộc.
- [ ] Không merge HTML/CSS/JS widget vào route Next.
- [ ] Nếu tái dùng Rive helper: viết TS mới theo pattern mục 3, hoặc share chỉ **file `.riv`**.
- [ ] Sidebar / embed web tiếp tục stack `@rive-app/react-canvas` hiện tại trừ khi chủ đích đổi lite.
- [ ] Reduced-motion: mirror hành vi widget (pause / không autoplay / SM input nếu có).

---

## 7. Kết luận

**Tích hợp = tài liệu + ranh giới**, không phải gộp codebase.

- Widget = desktop moodboard + Rive lite player (Tauri).
- Website = Next.js / embed / sidebar (stack riêng).
- Research editor = `RIVE_ARCHITECTURE_NOTES.md`.

Ba đường song song; chỉ chia sẻ nguyên lý và (tuỳ chọn) asset `.riv`.
