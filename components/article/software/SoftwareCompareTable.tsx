import Image from "next/image";
import Link from "next/link";

import { articlePublicHref } from "@/lib/articles/article-href";
import {
  formatPlatformList,
  isMetaPhanMem,
} from "@/lib/articles/meta-phan-mem";
import { relGradient, relInitials } from "@/lib/articles/rel-visual";
import type {
  ArticleBaiViet,
  ArticleCard,
  MetaPhanMem,
} from "@/lib/articles/types";

type CompareCol = {
  id: string;
  slug: string;
  tieu_de: string;
  tom_tat: string | null;
  meta: MetaPhanMem | null;
  thumb_url?: string | null;
  isCurrent?: boolean;
};

function toCol(
  article: ArticleBaiViet | ArticleCard,
  isCurrent = false,
): CompareCol {
  const rawMeta = article.meta ?? null;
  const meta = isMetaPhanMem(rawMeta) ? rawMeta : null;
  return {
    id: article.id,
    slug: article.slug,
    tieu_de: article.tieu_de,
    tom_tat: article.tom_tat ?? null,
    meta,
    thumb_url: "thumb_url" in article ? article.thumb_url : undefined,
    isCurrent,
  };
}

const ROWS: { key: string; label: string; render: (c: CompareCol) => string }[] = [
  {
    key: "publisher",
    label: "Nhà phát triển",
    render: (c) => c.meta?.nha_phat_hanh?.trim() || "—",
  },
  {
    key: "version",
    label: "Phiên bản",
    render: (c) => c.meta?.version?.trim() || "—",
  },
  {
    key: "platform",
    label: "Nền tảng",
    render: (c) => formatPlatformList(c.meta),
  },
  {
    key: "website",
    label: "Website",
    render: (c) => c.meta?.website?.trim() || "—",
  },
  {
    key: "summary",
    label: "Tóm tắt",
    render: (c) => {
      const t = c.tom_tat?.trim();
      if (!t) return "—";
      return t.length > 120 ? `${t.slice(0, 118).trim()}…` : t;
    },
  },
];

type Props = {
  current: ArticleBaiViet;
  peers: ArticleCard[];
  sectionNum?: number;
};

export function SoftwareCompareTable({
  current,
  peers,
  sectionNum = 2,
}: Props) {
  const columns = [
    toCol(current, true),
    ...peers
      .filter((p) => p.id !== current.id)
      .slice(0, 2)
      .map((p) => toCol(p)),
  ];
  if (columns.length < 2) return null;

  const num = String(sectionNum).padStart(2, "0");

  return (
    <section aria-labelledby="sw-compare-title">
      <h2 id="sw-compare-title" className="section-h">
        <span className="num">{num}</span>
        So sánh các phần mềm tương tự
      </h2>

      <div className="sw-compare-head">
        {columns.map((col) => {
          const href = articlePublicHref("phan_mem", col.slug);
          const grad = relGradient(col.slug);
          const ini = relInitials(col.tieu_de);
          return (
            <Link
              key={col.id}
              href={href}
              className={`sw-compare-app${col.isCurrent ? " is-current" : ""}`}
            >
              <div
                className={`sw-compare-app-icon${col.thumb_url ? " has-img" : ""}`}
                style={col.thumb_url ? undefined : { background: grad }}
              >
                {col.thumb_url ? (
                  <Image
                    src={col.thumb_url}
                    alt=""
                    width={72}
                    height={72}
                    unoptimized
                  />
                ) : (
                  <span aria-hidden>{ini}</span>
                )}
              </div>
              <span className="sw-compare-app-name">{col.tieu_de}</span>
            </Link>
          );
        })}
      </div>

      <div className="sw-compare-table-wrap">
        <table className="sw-compare-table">
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.key}>
                <th scope="row">{row.label}</th>
                {columns.map((col) => (
                  <td key={`${row.key}-${col.id}`}>
                    {row.key === "website" && col.meta?.website?.trim() ? (
                      <a
                        href={col.meta.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="sw-compare-link"
                      >
                        {col.meta.website.replace(/^https?:\/\//, "")}
                      </a>
                    ) : (
                      row.render(col)
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
