"use client";

import { ArticleDraftContentEditor } from "@/components/article/draft/ArticleDraftContentEditor";

import "@/styles/article-draft-tiptap.css";

type Props = {
  value: string;
  onChange: (html: string) => void;
};

/** Soạn giới thiệu trường / cơ sở — Tiptap soạn trực quan (không tab HTML). */
export function GioiThieuContentEditor({ value, onChange }: Props) {
  return (
    <ArticleDraftContentEditor
      value={value?.trim() || "<p></p>"}
      onChange={onChange}
      hideHint
      hideTabs
    />
  );
}
