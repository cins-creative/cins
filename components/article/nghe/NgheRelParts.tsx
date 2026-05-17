import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import type { ArticleCard } from "@/lib/articles/types";
import { labelLoaiQuanHe } from "@/lib/articles/quan-he-labels";
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
  const loai = String(card.loai_bai_viet);
  const desc = card.tom_tat?.trim();

  return (
    <div className={`rel-tip${tipClass ? ` ${tipClass}` : ""}`}>
      <div className="rel-tip-head">
        <div className="rel-tip-thumb" style={{ background: grad }}>
          {ini}
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
  );
}

export function NgheRelItem({
  card,
  tipClass = "tip-left",
}: {
  card: ArticleCard;
  tipClass?: string;
}) {
  const grad = relGradient(card.slug || card.id);
  const ini = relInitials(card.tieu_de);
  const tag = relTagForCard(card);
  const sub = card.tom_tat?.trim();
  const shortSub =
    sub && sub.length > 48 ? `${sub.slice(0, 46).trim()}…` : sub;

  return (
    <Link href={`/bai-viet/${card.slug}`} className="rel-item">
      <span className="rel-thumb" style={{ background: grad }}>
        {ini}
      </span>
      <span className="rel-name">
        {card.tieu_de}
        {shortSub ? <small>{shortSub}</small> : null}
      </span>
      <span className={tag.className}>{tag.label}</span>
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
  const grad = relGradient(card.slug || card.id);
  const ini = relInitials(card.tieu_de);
  const sub = card.tom_tat?.trim();

  return (
    <Link href={`/bai-viet/${card.slug}`} className="rel-card">
      <span className="rel-thumb" style={{ background: grad }}>
        {ini}
      </span>
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
    <Link href={`/bai-viet/${card.slug}`} className="rel-tile">
      <span className="rel-thumb thumb-sm" style={{ background: grad }}>
        {ini}
      </span>
      <span className="rel-name">{card.tieu_de}</span>
      <div className={`rel-tip${tipClass ? ` ${tipClass}` : ""}`}>
        <div className="rel-tip-head">
          <div className="rel-tip-thumb" style={{ background: grad }}>
            {ini}
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
