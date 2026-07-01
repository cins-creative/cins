"use client";

import { Calendar } from "lucide-react";
import Link from "next/link";

import { JourneyOrgPopover } from "@/components/journey/JourneyOrgPopover";
import type { MilestoneAttribution, MilestoneItem } from "@/components/journey/milestone-types";
import { labelLoaiSuKien } from "@/lib/to-chuc/su-kien-constants";

type Props = {
  milestone: MilestoneItem;
  entityLens?: boolean;
};

function orgKindForPopover(
  kind: MilestoneAttribution["orgKind"],
): "cong_dong" | "truong" | "co_so_dao_tao" | undefined {
  if (kind === "cong_dong" || kind === "truong" || kind === "co_so_dao_tao") {
    return kind;
  }
  return undefined;
}

function formatDisplayDate(year: number, month: number, day: number): string {
  return `${String(day).padStart(2, "0")}-${String(month).padStart(2, "0")}-${year}`;
}

function formatEventWhen(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/** Card sự kiện org trên World Journey feed — không dùng unfold cột mốc. */
export function OrgSuKienFeedMilestoneCard({
  milestone,
  entityLens = false,
}: Props) {
  const ref = milestone.orgSuKienRef;
  const attr = milestone.attribution;
  if (!ref || !attr) return null;

  const displayDate = formatDisplayDate(
    milestone.year,
    milestone.month,
    milestone.day,
  );
  const eventWhen = formatEventWhen(ref.batDau);
  const cover = milestone.media?.[0];
  const popoverKind = orgKindForPopover(attr.orgKind);
  const loaiLabel = labelLoaiSuKien(ref.loaiSuKien);

  const orgChip = (
    <span className="org-chip">
      <span className="org-logo is-square" aria-hidden>
        {attr.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={attr.avatarUrl} alt="" />
        ) : (
          (attr.initial ?? attr.name.slice(0, 1)).toUpperCase()
        )}
      </span>
      <span className="org-copy">
        <strong>{attr.name}</strong>
        <small>{displayDate}</small>
      </span>
    </span>
  );

  return (
    <article
      className={[
        "j-milestone",
        "j-tagged",
        "j-org-su-kien",
        entityLens ? "j-entity-lens" : "",
        milestone.feedSuggestion ? "j-feed-suggestion" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      data-mid={milestone.id}
    >
      <div className="j-m-card jcard">
        <div
          className={
            "jcard-datebar" +
            (entityLens ? " jcard-datebar--entity-lens" : " jcard-datebar--guest")
          }
        >
          {popoverKind ? (
            <JourneyOrgPopover
              slug={ref.orgSlug}
              orgKind={popoverKind}
              href={ref.href}
              fallbackName={attr.name}
              fallbackAvatarUrl={attr.avatarUrl}
            >
              {orgChip}
            </JourneyOrgPopover>
          ) : (
            <Link href={ref.href} prefetch={false}>
              {orgChip}
            </Link>
          )}
          <span className="badge-row">
            {milestone.feedSuggestion ? (
              <span className="ctx-badge j-feed-suggestion-badge">Gợi ý</span>
            ) : null}
            <span className="ctx-badge j-type-su-kien">
              <Calendar size={11} strokeWidth={1.8} aria-hidden />
              Sự kiện
            </span>
          </span>
        </div>

        <div className="jcard-body j-org-su-kien-body">
          <Link href={ref.href} className="j-org-su-kien-title" prefetch={false}>
            {milestone.title}
          </Link>
          {milestone.feedSocialHint ? (
            <p className="j-org-su-kien-social-hint">{milestone.feedSocialHint}</p>
          ) : null}
          {eventWhen ? (
            <p className="j-org-su-kien-when">{eventWhen}</p>
          ) : null}
          {milestone.body ? (
            <p className="j-org-su-kien-desc">{milestone.body}</p>
          ) : null}
          {cover?.src ? (
            <Link
              href={ref.href}
              className="j-org-su-kien-cover"
              prefetch={false}
              aria-label={`Xem sự kiện: ${milestone.title}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cover.src} alt="" loading="lazy" />
              <span className="j-org-su-kien-cover-tag">{loaiLabel}</span>
            </Link>
          ) : (
            <p className="j-org-su-kien-meta">
              <span className="j-org-su-kien-meta-tag">{loaiLabel}</span>
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
