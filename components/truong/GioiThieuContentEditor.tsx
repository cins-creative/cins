"use client";

import { ArticleDraftContentEditor } from "@/components/article/draft/ArticleDraftContentEditor";

import "@/styles/article-draft-tiptap.css";

type Props = {
  value: string;
  onChange: (html: string) => void;
};

/** Soạn giới thiệu trường / cơ sở — cùng Tiptap + tab HTML như admin bài viết. */
export function GioiThieuContentEditor({ value, onChange }: Props) {
  return (
    <ArticleDraftContentEditor
      value={value?.trim() || "<p></p>"}
      onChange={onChange}
      hideHint
    />
  );
}
