"use client";

import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Props = {
  markdown: string;
  /** Class trên wrapper markdown (wireframe: `article-content`) */
  className?: string;
};

export function ArticleMarkdownBody({ markdown, className }: Props) {
  if (!markdown?.trim()) {
    const cls = [className, "body-md-empty"].filter(Boolean).join(" ");
    return <p className={cls}>Nội dung đang được cập nhật.</p>;
  }

  return (
    <div className={className ?? "body"}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a({ href, children, className, ...rest }) {
            if (href?.startsWith("/")) {
              return (
                <Link
                  href={href}
                  className={className}
                  {...rest}
                >
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
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
