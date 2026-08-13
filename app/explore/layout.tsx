import type { ReactNode } from "react";

import "@/app/articles/article-page.css";
import "@/app/articles/article-layout-v2.css";
import "@/app/articles/article-layout-nghe.css";
import "@/app/articles/article-layout-keyword.css";
import "@/app/articles/article-layout-software.css";
import "@/styles/article-content.css";
import "@/styles/article-rich-content.css";
import "@/app/articles/article-keyword-inline.css";

export default function KhamPhaLayout({ children }: { children: ReactNode }) {
  return children;
}
