"use client";

import { useMemo } from "react";

import { validateArticleHtml } from "@/lib/article/blocks/validate";

type Props = {
  html: string;
  loaiBaiViet: string;
  strict?: boolean;
};

/** Gợi ý chất lượng bản soạn — Block Studio validation. */
export function ArticleBlockValidation({ html, loaiBaiViet, strict }: Props) {
  const result = useMemo(
    () => validateArticleHtml(html, loaiBaiViet, { strict }),
    [html, loaiBaiViet, strict],
  );

  if (result.issues.length === 0) return null;

  return (
    <ul className="article-block-validation" role="list" aria-label="Gợi ý nội dung">
      {result.issues.map((issue) => (
        <li
          key={issue.code}
          className={`article-block-validation__item article-block-validation__item--${issue.level}`}
          role="listitem"
        >
          {issue.message}
        </li>
      ))}
    </ul>
  );
}
