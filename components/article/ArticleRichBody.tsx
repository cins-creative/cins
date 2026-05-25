"use client";

import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { imagedeliveryPreferPublicInHtml } from "@/lib/cloudflare/imagedelivery-prefer-public";
import {
  isProbablyHtmlContent,
  stripLeadingSqlComments,
} from "@/lib/article/rich-body";

const markdownLink = {
  a({ href, children, className, ...rest }: React.ComponentProps<"a">) {
    if (href?.startsWith("/")) {
      return (
        <Link href={href} className={className} {...rest}>
          {children}
        </Link>
      );
    }
    return (
      <a
        href={href}
        className={className}
        target="_blank"
        rel="noopener noreferrer"
        {...rest}
      >
        {children}
      </a>
    );
  },
};

type Props = {
  source: string;
  /** Mặc định: `article-rich-content article-content-html` (đồng bộ NgheLeadRich). */
  className?: string;
  /** Bọc markdown trong `.body` (typography `.arv2 .body` trên trang v2). */
  markdownBodyClass?: string;
  emptyMessage?: string;
};

const DEFAULT_WRAP = "article-rich-content article-content-html";

export function ArticleRichBody({
  source,
  className = DEFAULT_WRAP,
  markdownBodyClass = "body",
  emptyMessage = "Nội dung đang được cập nhật.",
}: Props) {
  const trimmed = stripLeadingSqlComments(source.trim());
  if (!trimmed) {
    if (!emptyMessage?.trim()) return null;
    return <p className="body-md-empty">{emptyMessage}</p>;
  }

  if (isProbablyHtmlContent(trimmed)) {
    const html = imagedeliveryPreferPublicInHtml(trimmed);
    return (
      <div
        className={className}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return (
    <div className={className}>
      <div className={markdownBodyClass}>
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownLink}>
          {trimmed}
        </ReactMarkdown>
      </div>
    </div>
  );
}
