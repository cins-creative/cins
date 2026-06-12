"use client";

import { ArticleRichBody } from "@/components/article/ArticleRichBody";

type Props = {
  html: string;
  className?: string;
};

const GIOI_THIEU_BODY_CLASS =
  "tdh-gioi-thieu-body article-draft-tiptap__preview-body article-rich-content article-content-html";

/** Hiển thị HTML giới thiệu — cùng scope class như preview editor admin. */
export function GioiThieuRichBody({ html, className = GIOI_THIEU_BODY_CLASS }: Props) {
  return <ArticleRichBody source={html} className={className} emptyMessage="" />;
}
