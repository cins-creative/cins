import Image from "next/image";
import { BadgeCheck } from "lucide-react";
import type { ReactNode } from "react";

import { NgheHeroMascot } from "@/components/article/nghe/NgheHeroMascot";

export type EntityBadgeKind = "keyword" | "phan_mem" | "mon_hoc" | "nghe";

const BADGE: Record<EntityBadgeKind, { className: string; label: string }> = {
  keyword: { className: "is-keyword", label: "Khái niệm" },
  phan_mem: { className: "is-phan-mem", label: "Phần mềm" },
  mon_hoc: { className: "is-mon-hoc", label: "Môn học" },
  nghe: { className: "is-nghe", label: "Nghề nghiệp" },
};

type Props = {
  kind: EntityBadgeKind;
  title: string;
  emLine?: string | null;
  summary?: string | null;
  /** Ghép sau nhãn loại — ví dụ lĩnh vực. */
  contextLabel?: string | null;
  thumbnailUrl?: string | null;
  verified?: boolean;
  introId?: string;
  draftTools?: ReactNode;
};

function badgeText(kind: EntityBadgeKind, context: string): string {
  const base = BADGE[kind].label;
  return context ? `${base} · ${context}` : base;
}

/** Hero card đầu trang nội dung. */
export function EntityArticleHeader({
  kind,
  title,
  emLine,
  summary,
  contextLabel,
  thumbnailUrl,
  verified = false,
  introId = "entity-sec-intro",
  draftTools,
}: Props) {
  const displayTitle = title.trim() || "Bài viết";
  const displayEm = (emLine ?? "").trim();
  const displaySummary = (summary ?? "").trim();
  const displayContext = (contextLabel ?? "").trim();
  const thumb = thumbnailUrl?.trim() || null;
  const badge = BADGE[kind];

  return (
    <header className="ent-hero" id={introId}>
      {draftTools ? <div className="ent-hero-tools">{draftTools}</div> : null}
      <div className="ent-hero-inner">
        <div className="ent-hero-main">
          <span className={`ent-badge ${badge.className}`}>
            {badgeText(kind, displayContext)}
          </span>
          <div className="ent-title-row">
            <h1 className="ent-title">{displayTitle}</h1>
            {verified ? (
              <span className="ent-verified">
                <BadgeCheck size={16} strokeWidth={2.2} aria-hidden />
                Verified
              </span>
            ) : null}
          </div>
          {displayEm ? (
            <p className="ent-subtitle">
              <em>{displayEm}</em>
            </p>
          ) : null}
          {displaySummary ? <p className="ent-summary">{displaySummary}</p> : null}
        </div>
        {thumb ? (
          <div className="ent-hero-thumb">
            <Image
              src={thumb}
              alt=""
              fill
              sizes="(max-width: 720px) 100vw, 288px"
              unoptimized
            />
          </div>
        ) : (
          <div className="ent-hero-thumb is-placeholder">
            <NgheHeroMascot thumbnailUrl={null} title={displayTitle} />
          </div>
        )}
      </div>
    </header>
  );
}
