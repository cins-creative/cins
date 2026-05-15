import Image from "next/image";

import { getCoverUrl } from "@/lib/articles/cover";
import { buildNgheKicker } from "@/lib/articles/rel-visual";
import type { ArticleBaiViet, ArticleCard } from "@/lib/articles/types";

function splitTitleEm(title: string): { main: string; em: string | null } {
  const idx = title.indexOf(" | ");
  if (idx === -1) return { main: title, em: null };
  return {
    main: title.slice(0, idx).trim(),
    em: title.slice(idx + 3).trim() || null,
  };
}

function formatCapNhat(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function initials(title: string): string {
  const w = title.trim().split(/\s+/).filter(Boolean);
  if (w.length >= 2)
    return `${w[0]!.slice(0, 1)}${w[1]!.slice(0, 1)}`.toUpperCase();
  return title.trim().slice(0, 2).toUpperCase() || "C";
}

function IconEye() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
    </svg>
  );
}

function IconCal() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

type Props = {
  article: ArticleBaiViet;
  lienQuan: ArticleCard[];
};

export function ArticleNgheHero({ article, lienQuan }: Props) {
  const cover = getCoverUrl(article.cover_id);
  const { main: titleMain, em: titleEm } = splitTitleEm(article.tieu_de);
  const kicker = buildNgheKicker(lienQuan, article.tieu_de);

  return (
    <>
      <div className="nghe-hero-panel" data-rich-hero-slot="true">
        <div className="l1-hero">
          <h1 className="h-disp nghe-hero-title">
            {titleMain}
            {titleEm ? (
              <>
                <br />
                <em>{titleEm}</em>
              </>
            ) : null}
          </h1>
          <div className="nghe-hero-row">
            <div className="nghe-hero-copy">
              <span className="kicker k-nghe">{kicker}</span>
              {article.tom_tat?.trim() ? (
                <p className="h-summary">{article.tom_tat.trim()}</p>
              ) : null}
            </div>
            <div className="mascot">
              {cover ? (
                <Image
                  src={cover}
                  alt=""
                  width={280}
                  height={280}
                  className="arv2-mascot-img"
                  priority
                />
              ) : (
                <span className="mascot-ph" aria-hidden>
                  {initials(article.tieu_de)}
                </span>
              )}
            </div>
          </div>
          <div className="h-meta">
            <span>
              <IconEye />
              {article.luot_xem.toLocaleString("vi-VN")} lượt xem
            </span>
            <span>
              <IconCal />
              Cập nhật {formatCapNhat(article.cap_nhat_luc)}
            </span>
          </div>
        </div>
      </div>
      <div className="mock-vid nghe-mock-vid" aria-hidden>
        <div className="label">
          <span>Video — &quot;Giới thiệu {article.tieu_de}&quot;</span>
          <span className="dur">—</span>
        </div>
      </div>
    </>
  );
}
