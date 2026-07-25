import "../../journey/journey.css";
import "../../journey/image-grid.css";
import "@/styles/article-rich-content.css";
import "../new/editor.css";
import "./post-page.css";

/**
 * Layout chung cho `/[slug]/p/[postSlug]` (xem bài viết riêng) và
 * `/[slug]/p/[postSlug]/edit` (chỉnh sửa).
 *
 * Load `journey.css` (`.j-ps-*`) + `article-rich-content.css`
 * (render HTML từ `blocksToHtml`). Typography: Be Vietnam Pro (`--font-sans`).
 */
export default function PostLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
