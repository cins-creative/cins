import Image from "next/image";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { RelThumb } from "@/components/article/shared/RelThumb";
import type { ArticleCard } from "@/lib/articles/types";
import { articlePublicHref } from "@/lib/articles/article-href";
import { labelLoaiQuanHe } from "@/lib/articles/quan-he-labels";
import {
  buildRelTipContent,
  relItemSubline,
} from "@/lib/articles/rel-tip-content";
import {
  relGradient,
  relInitials,
  relLoaiKind,
  relTagForCard,
} from "@/lib/articles/rel-visual";

function RelTip({
  card,
  tipClass,
}: {
  card: ArticleCard;
  tipClass?: string;
}) {
  const grad = relGradient(card.slug || card.id);
  const ini = relInitials(card.tieu_de);
  const thumb = card.thumb_url?.trim() || null;
  const tip = buildRelTipContent(card);
  const stripSrc = tip.thumbnailSrc?.trim() || null;

  return (
    <div
      className={[
        "rel-tip",
        tipClass,
        stripSrc ? "rel-tip--has-thumb" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-hidden
    >
      <div className="rel-tip-head">
        <div
          className={`rel-tip-thumb${thumb ? " rel-tip-thumb--has-img" : ""}`}
          style={thumb ? undefined : { background: grad }}
        >
          {thumb ? (
            <Image src={thumb} alt="" width={40} height={30} unoptimized />
          ) : (
            ini
          )}
        </div>
        <div>
          <div className="rel-tip-name">{card.tieu_de}</div>
          <div className="rel-tip-kind">{tip.kind}</div>
        </div>
      </div>
      {stripSrc ? (
        <div className="rel-tip-thumb-strip">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={stripSrc}
            alt={tip.thumbnailAlt ?? ""}
            className="rel-tip-thumb-photo"
            width={280}
            height={158}
          />
        </div>
      ) : null}
      {tip.desc ? <div className="rel-tip-desc">{tip.desc}</div> : null}
      <div className="rel-tip-meta">
        {tip.meta.map((m) => (
          <span
            key={m}
            className={
              tip.metaHot === m
                ? "hot"
                : tip.metaOk === m
                  ? "ok"
                  : tip.metaWarn === m
                    ? "warn"
                    : undefined
            }
          >
            {m}
          </span>
        ))}
      </div>
    </div>
  );
}

export function NgheRelItem({
  card,
  tipClass = "tip-left",
  showTag = true,
  showSummary = true,
}: {
  card: ArticleCard;
  tipClass?: string;
  /** Badge loại (NGÀNH ĐT, MÔN HỌC, …) — tắt trên sidebar môn học. */
  showTag?: boolean;
  /** Dòng tóm tắt dưới tiêu đề — tắt trên sidebar môn học. */
  showSummary?: boolean;
}) {
  const tag = relTagForCard(card);
  const sub = card.tom_tat?.trim();
  const shortSub =
    sub && sub.length > 48 ? `${sub.slice(0, 46).trim()}…` : sub;
  const subline = relItemSubline(card);

  const compact = !showTag && !showSummary;

  return (
    <Link
      href={articlePublicHref(card.loai_bai_viet, card.slug)}
      className={`rel-item${compact ? " rel-item--compact" : ""}`}
    >
      <RelThumb card={card} size={compact ? "lg" : "md"} />
      <span className="rel-name">
        {card.tieu_de}
        {compact && subline ? <small>{subline}</small> : null}
        {showSummary && shortSub ? <small>{shortSub}</small> : null}
      </span>
      {showTag ? (
        <span className={tag.className} aria-hidden>
          {tag.label}
        </span>
      ) : null}
      <RelTip card={card} tipClass={tipClass} />
    </Link>
  );
}

export function NgheRelCard({
  card,
  tipClass,
}: {
  card: ArticleCard;
  tipClass?: string;
}) {
  const sub = card.tom_tat?.trim();

  return (
    <Link
      href={articlePublicHref(card.loai_bai_viet, card.slug)}
      className="rel-card"
    >
      <RelThumb card={card} />
      <span className="rel-card-body">
        <strong>{card.tieu_de}</strong>
        {sub ? <span>{sub}</span> : null}
      </span>
      <span className="rel-card-arrow" aria-hidden>
        →
      </span>
      <RelTip card={card} tipClass={tipClass} />
    </Link>
  );
}

export function NgheRelTile({
  card,
  tipClass,
}: {
  card: ArticleCard;
  tipClass?: string;
}) {
  const grad = relGradient(card.slug || card.id);
  const ini = relInitials(card.tieu_de);
  const loai = String(card.loai_bai_viet);
  const desc = card.tom_tat?.trim();

  return (
    <Link
      href={articlePublicHref(card.loai_bai_viet, card.slug)}
      className="rel-tile"
    >
      <RelThumb card={card} size="sm" />
      <span className="rel-name">{card.tieu_de}</span>
      <div className={`rel-tip${tipClass ? ` ${tipClass}` : ""}`}>
        <div className="rel-tip-head">
          <div
            className={`rel-tip-thumb${card.thumb_url?.trim() ? " rel-tip-thumb--has-img" : ""}`}
            style={
              card.thumb_url?.trim()
                ? undefined
                : { background: grad }
            }
          >
            {card.thumb_url?.trim() ? (
              <Image
                src={card.thumb_url.trim()}
                alt=""
                width={40}
                height={30}
                unoptimized
              />
            ) : (
              ini
            )}
          </div>
          <div>
            <div className="rel-tip-name">{card.tieu_de}</div>
            <div className="rel-tip-kind">
              {relLoaiKind(loai)}
              {card.loai_quan_he
                ? ` · ${labelLoaiQuanHe(card.loai_quan_he)}`
                : ""}
            </div>
          </div>
        </div>
        {desc ? <div className="rel-tip-desc">{desc}</div> : null}
        <div className="rel-tip-meta">
          <span>{relLoaiKind(loai)}</span>
        </div>
      </div>
    </Link>
  );
}

export function NgheMdInline({ text }: { text: string }) {
  if (!text.trim()) return null;
  return <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>;
}
