import { Anton } from "next/font/google";

import "./journey.css";
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

export default function JourneyLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <div className={anton.variable}>{children}</div>;
}
