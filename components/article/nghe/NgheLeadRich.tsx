import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { imagedeliveryPreferPublicInHtml } from "@/lib/cloudflare/imagedelivery-prefer-public";

function isProbablyHtml(source: string): boolean {
  return /^\s*</.test(source);
}

/** Bỏ các dòng mở đầu kiểu comment SQL (`-- …`) thường gặp trong seed/migration dính vào `noi_dung`. */
export function stripLeadingSqlComments(text: string): string {
  const lines = text.split(/\r?\n/);
  let i = 0;
  while (i < lines.length) {
    const t = lines[i].trim();
    if (t === "") {
      i += 1;
      continue;
    }
    if (/^--(\s|$)/.test(t)) {
      i += 1;
      continue;
    }
    break;
  }
  return lines.slice(i).join("\n").trim();
}

type Props = {
  source: string;
};

const richWrap = "nghe-lead-rich article-rich-content article-content-html";

/** Nội dung khối lead (HTML từ CMS hoặc markdown). */
export function NgheLeadRich({ source }: Props) {
  const trimmed = stripLeadingSqlComments(source.trim());
  if (!trimmed) {
    return null;
  }

  if (isProbablyHtml(trimmed)) {
    const html = imagedeliveryPreferPublicInHtml(trimmed);
    return (
      <div
        className={richWrap}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return (
    <div className={richWrap}>
      <div className="body">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            a({ href, children, className, ...rest }) {
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
          }}
        >
          {trimmed}
        </ReactMarkdown>
      </div>
    </div>
  );
}
