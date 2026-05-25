import type { ReactNode } from "react";

import "@/app/bai-viet/article-page.css";
import "@/app/bai-viet/article-layout-v2.css";
import "@/app/bai-viet/article-layout-nghe.css";
import "@/app/bai-viet/article-layout-keyword.css";
import "@/app/bai-viet/article-layout-software.css";
import "@/app/bai-viet/article-keyword-inline.css";
import "@/styles/article-content.css";
import "@/styles/article-rich-content.css";

export default function BaiVietLayout({ children }: { children: ReactNode }) {
  return children;
}
