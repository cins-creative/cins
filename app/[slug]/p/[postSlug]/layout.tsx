import { Anton } from "next/font/google";

import "../../journey/journey.css";
import "@/styles/article-rich-content.css";
import "../new/editor.css";
import "./post-page.css";

/**
 * Layout chung cho `/[slug]/p/[postSlug]` (xem bài viết riêng) và
 * `/[slug]/p/[postSlug]/edit` (chỉnh sửa).
 *
 * Mọi child route đều cần Anton font (--font-j-anton) cùng với
 * `journey.css` (cho `.j-ps-*` styles) và `article-rich-content.css`
 * (để render HTML từ `blocksToHtml`).
 */
const anton = Anton({
  variable: "--font-j-anton",
  subsets: ["latin", "vietnamese"],
  weight: ["400"],
  display: "swap",
});

export default function PostLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <div className={anton.variable}>{children}</div>;
}
