# PLAN — Responsive & redesign mobile (desktop đã duyệt)

> Trạng thái: **PLAN — chưa code.** Khảo sát: [Khảo sát responsive toàn repo](303fe3a9-d0de-4489-b617-3e57d6636385).
> Skill hỗ trợ: `responsive-craft` (đã cài tại `.agents/skills/responsive-craft`) — dùng `audit` cho từng màn, `preview` để xem 4 viewport song song.

---

## 0. Điểm khởi đầu (fact từ khảo sát)

| Hạng mục | Thực tế hiện tại |
|---|---|
| Cách làm responsive | **CSS thủ công, ~407 `@media`**, desktop-first (`max-width:`) |
| Tailwind | v4 qua PostCSS, **không** custom breakpoint; responsive utility gần như không dùng trong TSX (~8 chỗ) |
| Breakpoint de-facto | 1199.98 · **991.98** (layout 3-col) · **960/961** (shell nav) · 767.98 (phone) · 575.98 (xs) + rải rác 480→1280 |
| Shell mobile | Drawer sidebar (≤960px) + **app chrome dính đáy** (`#app-topbar`, không phải 5-tab nav) |
| Token | `app/cins-design-tokens.css` — spacing/type **scale rời rạc**, không fluid |
| Hook viewport | 7 hook rời, mỗi chỗ hard-code media query. Không có `useMediaQuery`/`useIsMobile` |
| Ảnh | `next/image` ~62 file (có `sizes`), nhưng **~150+ file vẫn `<img>`** thủ công |
| Xung đột policy | `CINS_DEV_RULES.md` §UI ghi **mobile-first 360px**, code lại **desktop-first** |

**Kết luận nền:** desktop đã duyệt → **không rewrite**. Việc cần làm là *dịch* desktop sang mobile một cách có chủ đích, cộng với một lớp nền (token + breakpoint + hook) để dừng việc mỗi màn tự phát minh breakpoint riêng.

---

## 1. Chiến lược — 3 lớp, không big-bang

Theo escalation model của `responsive-craft`: **intrinsic CSS → container query → media query**.

| Lớp | Công cụ | Dùng cho ở CINs |
|---|---|---|
| **Liên tục** | `clamp()`, fluid token, `cqi` | Type scale (`--text-*`), padding trang, gap grid, hero — hết stair-stepping |
| **Component** | `@container` | Card (journey milestone, card trường/ngành, product card, org card) — cùng CSS dù nằm ở feed, sidebar, hay modal |
| **Cấu trúc** | `@media` (min-width) | Shell nav, số cột layout 3-col, sidebar ↔ drawer/tabs, chat overlay |

### Quyết định 1 — Không migrate sang Tailwind utility
407 `@media` + CSS theo trang là kiến trúc hiện hữu và **đã duyệt ở desktop**. Chuyển sang Tailwind responsive utility = viết lại markup toàn site, rủi ro cao, không thêm giá trị. Giữ CSS-first; Tailwind v4 chỉ đóng vai `@theme` cho token.

### Quyết định 2 — Mobile-first *cho code mới và màn được refactor*, không đổi hết 407 query
Đổi toàn bộ `max-width` → `min-width` cùng lúc là công thức gây regression trên bản desktop đã duyệt. Nguyên tắc: **màn nào vào scope refactor thì đảo sang mobile-first**, màn ngoài scope giữ nguyên. Ghi rõ luật này vào `CINS_DEV_RULES.md` để hết xung đột policy.

### Quyết định 3 — Chuẩn hoá 4 breakpoint, khai báo một chỗ
```
--bp-xs :  480px   /* phone nhỏ → phone lớn */
--bp-sm :  768px   /* phone → tablet dọc */
--bp-md :  992px   /* tablet → layout đa cột (thay 960/961 + 991.98) */
--bp-lg : 1200px   /* desktop rộng */
```
- Gộp **960/961 → 992**: shell nav và layout 3-col đổi cùng một điểm, hết vùng chết 961–991px (hiện nav đã desktop mà layout còn mobile).
- Media query vẫn phải viết literal (`@media (min-width: 992px)` — CSS var không dùng được trong điều kiện `@media`); token dùng cho JS/`matchMedia` + doc.
- Nguồn duy nhất cho JS: `lib/ui/breakpoints.ts` + hook `useBreakpoint()` / `useIsMobile()` → thay 7 hook rời + `window.innerWidth` rải rác.

---

## 2. Design mobile — hình dáng cụ thể

### 2.1 Shell (ưu tiên cao nhất — ảnh hưởng mọi trang)

Desktop: sidebar 64px hover-expand 240px + topbar.

Mobile đề xuất: **bottom tab bar 5 mục + drawer cho phần còn lại**.
- Lý do: `lib/cins/mainNav.ts` có 7 mục cấp 1 có icon, dùng liên tục → Fork 6 signal "app với 3–5 flow cốt lõi + nav có icon → bottom tabs". Drawer hiện tại chôn toàn bộ điều hướng sau 1 tap và người dùng mobile hầu như không mở.
- Tabs: Trang chủ · Khám phá nghề · Tổ chức · Cộng đồng · Cửa hàng. Còn lại (Tìm khoá học, Sự kiện, profile, cài đặt) vào drawer từ avatar/topbar.
- Kỹ thuật: `position: fixed; bottom: 0` + `padding-bottom: env(safe-area-inset-bottom)`, `viewport-fit=cover` trong viewport meta, chiều cao tab bar phơi thành `--nav-bottom-h` để mọi trang trừ vào padding và các sheet/FAB canh theo.
- Topbar mobile thu về: logo + search + avatar. Không sticky đôi (xem Fork sticky ở §2.3).

### 2.2 Fluid foundation
- `--text-xs…--text-display`: bọc `clamp()` — `--text-display` hiện 88px, ở 360px phải về ~32px, không nhảy bậc.
- Padding trang: `clamp(16px, 4vw, 32px)`; container `min(100% - 2 * var(--page-pad), 1240px)` thay `max-width: 1200px` cứng.
- Input: `font-size: max(16px, 1rem)` toàn site — chặn iOS Safari auto-zoom.
- Mọi `100vh` → `100dvh` (fallback `vh`). Chat/sheet/board là chỗ ảnh hưởng nhất.

### 2.3 Từng màn chủ lực — bản dịch desktop → mobile

| Màn | Desktop | Mobile đề xuất | Fork cần chốt |
|---|---|---|---|
| **Journey / feed** (`journey.css`, ~48 `@media`) | Timeline + milestone card + gallery 3-col + comment sheet | Feed 1 cột, media **full-bleed** (đúng DEV_RULES §UI), gallery 2-up ở ≥480px, comment mở bottom sheet `dvh` | Milestone card: rút gọn dần (progressive) hay giữ đủ nội dung? |
| **Trường / cơ sở 3-col** (`cins-truong-chi-tiet-v6.css`) | sidebar + center + admission | Center làm mạch chính; sidebar + admission thành **sticky tab strip** (pattern đã có ở `useCoSoMobileShell`) — chuẩn hoá 1 component dùng chung | Fork 1: drawer vs tabs vs accordion inline |
| **Chat overlay** | Overlay + dock FAB | Full-screen `100dvh`, header 1 hàng, input dính bàn phím (`visualViewport`), 4 tab → scroll strip hoặc gộp 2+2 | Fork 5: tab nào được sticky |
| **Shop seller / admin table** (10 cột) | Bảng rộng | Ưu tiên: **card stack** cho đơn hàng (có action mỗi dòng), **h-scroll + sticky cột 1** cho kho/số liệu cần so sánh | Fork 2 — cần bạn chỉ ra cột nào là "cột thiết yếu" |
| **Career hub filter rail** | Rail cố định | Giữ drawer nhưng chuyển sang **FAB + filter sheet** + hiển thị filter đang bật (hiện mất trạng thái) | — |
| **Post editor** (panel 264/360/560px) | Toolbar + panel | Toolbar 1 hàng scroll, panel thành sheet, `dvh` + bàn phím | Editor mobile có cần đầy đủ tính năng, hay chế độ soạn gọn? |
| **Bento/card grid** (home, listing) | Nhiều cột | `grid-template-columns: repeat(auto-fit, minmax(...))` + container query cho card → hết `repeat(4, 1fr)` cứng | Fork 8: stack 1 cột vs mini-grid 2 cột |
| **Form dài** (login, onboarding, tạo tổ chức) | Nhiều cột | 1 cột; onboarding/tạo tổ chức chuyển **stepped** nếu >10 field | Fork 7 |
| **Board canvas** | Pan/zoom desktop | Xác nhận scope: read-only trên mobile là chấp nhận được? | Cần bạn quyết |

### 2.4 Ảnh
Không đổi `<img>` → `next/image` đại trà (rủi ro cao, ~150 file). Thay vào đó: helper `srcset` dùng CF variant `gridsm`/`grid` cho mọi `<img>` trong feed/gallery + bắt buộc `width`/`height` chống CLS. `next/image` chỉ cho code mới.

---

## 3. Các bước triển khai (mỗi phase = một brief riêng)

| Phase | Nội dung | Phạm vi file | Rủi ro desktop |
|---|---|---|---|
| **P0 — Foundation** | breakpoint token + `lib/ui/breakpoints.ts` + `useIsMobile` + fluid `clamp()` cho type/spacing + `dvh` + input 16px + `viewport-fit=cover` | `cins-design-tokens.css`, `globals.css`, `app/layout.tsx`, 1 file lib mới | Trung bình (type scale đổi → cần soi lại desktop) |
| **P1 — Shell** | Bottom tab bar + drawer thu gọn + `--nav-bottom-h` + gộp 960→992 | `cins-app-nav.css`, `CinsShell`, `useCinsSidebarNav`, `mainNav.ts` | Thấp (chỉ nhánh ≤992px) |
| **P2 — 3 màn chủ lực** | Journey · trường/cơ sở · chat. Mỗi màn: audit → chốt fork → mobile-first hoá CSS màn đó | CSS + component theo màn | Trung bình — cần snapshot before/after |
| **P3 — Bảng & seller/admin** | Shop table, admin table, career rail, editor | `shop-dashboard.css`, `cins-admin.css`, `editor.css` | Thấp |
| **P4 — Grid, form, ảnh** | auto-fit grid + container query card, form 1 cột/stepped, srcset helper | listing/home CSS, form CSS, lib ảnh | Thấp |
| **P5 — Sweep** | Xoá breakpoint lẻ (480/560/640/720/800/900/1024/1100/1280) về 4 token; cập nhật `CINS_DEV_RULES.md` | Toàn CSS + docs | Trung bình |

Đề nghị chạy **P0 + P1 trước**, review trên máy thật, rồi mới mở P2.

---

## 4. Edge case / bẫy phải chặn trước

1. **Vùng chết 961–991px** — đang có thật hôm nay; P1 xử lý.
2. **`overflow: hidden` ở ancestor giết `position: sticky`** — journey/trường dùng sticky nhiều; dùng `overflow: clip` khi chỉ cần cắt hình.
3. **`transform` ở ancestor phá `position: fixed`** — bottom tab bar + sheet dễ trúng khi drawer dùng `translateX`.
4. **Thiếu `align-self: start`** cho sticky trong flex/grid — lỗi sticky im lặng phổ biến nhất.
5. **Thiếu `min-width: 0`** cho flex child chứa text/ảnh động — tràn ngang ở 360px (tên trường/ngành dài tiếng Việt là ca thật).
6. **Bàn phím ảo** ở chat/editor/form: dùng `visualViewport`, không dựa `100vh`.
7. **`display: none` ẩn nội dung trên mobile** → mất với screen reader và SEO. Cột bảng bị ẩn phải là dữ liệu phụ thật.
8. **Safe area landscape** — không chỉ `bottom`, còn `left/right` khi máy nằm ngang.
9. **Touch target ≥44×44px** (DEV_RULES §7) — tab bar, tab strip, action trong card.
10. **Z-index** — hiện có `9999`; cần thang tầng (`isolation: isolate`) trước khi thêm tab bar + sheet + chat overlay chồng nhau.
11. **Dark mode** phải kiểm cùng lượt — token dark ở `cins-design-tokens.css` L137–199.
12. **Regression desktop**: mỗi phase chạy `snapshot.js --before` rồi `snapshot.js` để so 1440px, không chỉ soi mobile.

---

## 5. Verify

- **Viewport bắt buộc:** 320 · 360 (mốc DEV_RULES) · 390 · 430 · 768 · 992 · 1200 · 1440.
- **Kéo, không nhảy** — resize liên tục 280→2560px để bắt lỗi khoảng giữa.
- Công cụ: `node .agents/skills/responsive-craft/scripts/preview.js http://localhost:3001` (dev server: `npm run host`).
- Checklist mỗi màn: không scroll ngang · touch ≥44px · sticky còn dính · bàn phím không che input · safe area ok · dark mode ok · desktop 1440px không đổi.

---

## 6. Design fork — đã chốt

| Fork | Quyết định |
|---|---|
| Điều hướng mobile | **Bottom tab bar 5 mục** (Trang chủ · Khám phá nghề · Tổ chức · Cộng đồng · Cửa hàng) + drawer cho phần còn lại |
| Trường / cơ sở 3-col | **Sticky tab strip** — chuẩn hoá thành 1 component dùng chung, mở rộng từ `useCoSoMobileShell` |
| Bảng shop / admin | **Card stack** cho đơn hàng (có action mỗi dòng) · **h-scroll + sticky cột 1** cho kho & số liệu cần so sánh ngang |
| Board canvas / post editor | **Chế độ gọn** — editor soạn cơ bản, board read-only trên mobile |
| Thứ tự thi công | **P0 foundation + P1 shell**, review trên máy thật rồi mới mở P2 |

### Còn treo (chốt khi vào P3)
- Cột nào là "thiết yếu ở 360px" cho từng bảng shop/admin — cần liệt kê theo từng bảng lúc audit, không quyết trước được.
- Bộ tính năng tối thiểu của editor mobile (ảnh, heading, link, gì nữa?).
