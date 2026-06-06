import { Anton } from "next/font/google";

import "./journey.css";
import "./image-grid.css";
import "@/styles/article-rich-content.css";
/* Modal `JourneyPostModal` portal vào document.body và hiển thị bài viết
   theo layout editor canvas (`.cins-editor-page`). Cần load editor.css +
   post-page.css ở layout journey để modal style đúng. */
import "../p/new/editor.css";
import "../p/[postSlug]/post-page.css";

/**
 * Font Anton chỉ dùng làm `--font-j-anton` cho các số liệu / năm / nhãn lớn
 * trên trang Journey. Mọi text khác dùng `--font-sans` (Be Vietnam Pro) /
 * `--font-serif` (Crimson Pro) / `--font-mono` (JetBrains Mono) đã có sẵn
 * từ `cins-design-tokens.css`.
 */
const anton = Anton({
  variable: "--font-j-anton",
  subsets: ["latin", "vietnamese"],
  weight: ["400"],
  display: "swap",
});

/**
 * Parallel route slot `@modal` — nhận intercepted route khi user click cột
 * mốc trên journey để mở modal bài viết. URL update sang `/[slug]/p/...`
 * nhưng journey page (children) vẫn render bên dưới. Vào thẳng URL bài viết
 * KHÔNG đi qua intercepted route → fall back về `app/[slug]/p/[postSlug]/
 * page.tsx` standalone.
 */
export default function JourneyLayout({
  children,
  modal: _modal,
}: Readonly<{
  children: React.ReactNode;
  modal: React.ReactNode;
}>) {
  void _modal;
  return <div className={anton.variable}>{children}</div>;
}
