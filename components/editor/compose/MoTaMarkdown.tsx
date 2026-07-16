"use client";

import type { ReactNode } from "react";

import {
  renderMoTaMarkdownToReactNodes,
  stripMoTaMarkdown,
} from "@/lib/editor/mo-ta-markdown";

import "./mo-ta-markdown.css";

type Props = {
  text: string | null | undefined;
  className?: string;
  /** Thẻ bao (mặc định p — khớp `.jcard-desc`). */
  as?: "p" | "div" | "span" | "small" | "h2" | "h3";
  /** Autolink URL — tắt khi nằm trong `Link`/`<a>`. Mặc định bật. */
  linkify?: boolean;
};

/** Caption / mo_ta với subset Markdown an toàn. */
export function MoTaMarkdown({
  text,
  className,
  as = "p",
  linkify = true,
}: Props) {
  const raw = text ?? "";
  const nodes = renderMoTaMarkdownToReactNodes(raw, { linkify });
  if (!nodes) return null;

  const Tag = as;
  return <Tag className={className}>{nodes as ReactNode}</Tag>;
}

export { stripMoTaMarkdown, renderMoTaMarkdownToReactNodes };
