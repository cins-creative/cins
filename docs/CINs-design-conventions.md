# Quy ước UI — CINs website

Tài liệu ghi lại các quyết định design/dev đồng bộ với **CINs Design System** (`CINs Design System.zip`) và codebase Next.js hiện tại.

## Typography — Be Vietnam Pro duy nhất

Chuẩn: **một font duy nhất Be Vietnam Pro** cho toàn UI (ngoại lệ JetBrains Mono cho code). **Anton đã gỡ** khỏi runtime (`layout.tsx`, `cins-font-bridge.css`, mọi CSS app). Crimson Pro còn cho editorial dài nếu cần.

- Heading H1–H6 + body + display marketing: `--font-sans` / `--font-display` → Be Vietnam Pro.
- Không load `Anton` qua `next/font` hay Google Fonts link.

File liên quan:

- `app/cins-font-bridge.css` — `--font-sans` / `--font-display` / `h1` → Be Vietnam.
- `app/cins-design-tokens.css` — token font.
- `app/layout.tsx` — chỉ `Be_Vietnam_Pro` (+ Crimson Pro link cho editorial).

## Icon — Material Symbols (Google Fonts), không dùng emoji trong UI component

- Các ô icon kiểu `.ft-card-ic` và chip filter hero dùng **Material Symbols Outlined** (Google), load qua `app/cins-material-symbols.css`.
- Component gọn: `components/cins/MsIcon.tsx` — truyền **tên glyph** (ví dụ `palette`, `school`, `explore`; xem [Google Fonts Icons](https://fonts.google.com/icons)).

## Nút primary — gradient `grad-blue` (Design System)

Theo file trong zip: `preview/components-buttons.html` (class `.grad-blue`):

```txt
linear-gradient(135deg, #3DA0FF 0%, var(--cins-blue) 60%, #154F99 100%)
```

Áp dụng cho các nút CTA chính trên trang chủ:

- `.nav-cta` — Đăng ký miễn phí
- `.hero-cmm-cta` — Bắt đầu ngay
- `.hero-cmm-search-btn` — Tìm kiếm
- `.bs-cta` — Làm quiz miễn phí

Biến CSS và hover được tập trung trong `app/cins-gradients.css` (để không xung đột với block solid cũ, đoạn ép màu flat cho `.nav-cta` trong `app/cins-styles.css` đã được gỡ).

## Thứ tự import CSS (layout)

1. `globals.css`
2. `cins-design-tokens.css`
3. `cins-font-bridge.css`
4. `cins-styles.css`
5. `cins-cmm.css`
6. `cins-material-symbols.css`
7. `cins-gradients.css` — override nút gradient sau các style gốc.

## Gradient mở rộng (tham chiếu zip)

Trong Design System còn các họ gradient khác (`.grad-sunny`, `.grad-festive`, `.grad-mint`, `.grad-lilac`, `.grad-shimmer`, `.grad-outline`) — có thể tái sử dụng khi cần nút phụ / hero đặc biệt; chưa gắn hết vào homepage.

---

*Cập nhật theo chỉnh sửa codebase và file `preview/components-buttons.html` trong CINs Design System.*
