"use client";

import { Clock3 } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";

import { HaOrgUpCountdown } from "@/components/cins/home-adaptive/HaOrgUpCountdown";
import { WorldBoostToggle } from "@/components/cins/world-journey/WorldBoostToggle";
import { JourneyOrgPopover } from "@/components/journey/JourneyOrgPopover";
import { OrgSuKienFriendsChips } from "@/components/journey/OrgSuKienFriendsChips";
import type { MilestoneAttribution, MilestoneItem } from "@/components/journey/milestone-types";
import { SuKienPhanHoiActions } from "@/components/to-chuc/SuKienPhanHoiActions";
import { formatDate } from "@/lib/format";
import type { CinsLocale } from "@/lib/locale/types";
import { useLocale } from "@/lib/locale/context";
import { useImpressionTracker } from "@/lib/social/track-su-kien";
import type { LoaiPhanHoiSuKien } from "@/lib/to-chuc/su-kien-phan-hoi-types";
import { getStepStatus } from "@/lib/truong/timeline";

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

function dateBadgeParts(
  year: number,
  month: number,
  day: number,
  locale: CinsLocale,
): { month: string; day: string } {
  return {
    month: formatDate(new Date(year, month - 1, day), locale, {
      month: "short",
    }),
    day: String(day).padStart(2, "0"),
  };
}

function formatEventWhen(
  iso: string,
  locale: CinsLocale,
): { time: string; date: string } | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const time = formatDate(d, locale, {
    hour: "2-digit",
    minute: "2-digit",
  });
  const date = formatDate(d, locale, {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  return { time, date };
}

/** Card sự kiện org trên World Journey feed — banner + RSVP inline. */
export function OrgSuKienFeedMilestoneCard({
  milestone,
  entityLens = false,
}: Props) {
  const locale = useLocale();
  const ref = milestone.orgSuKienRef;
  const attr = milestone.attribution;
  const [phanHoi, setPhanHoi] = useState<LoaiPhanHoiSuKien | null>(null);
  const articleRef = useRef<HTMLElement | null>(null);

  /* Đo lượt tiếp cận sự kiện (`hien_thi`) → xếp hạng feed "chưa xem / xem ít".
     Tracker tự no-op khi thiếu id hợp lệ. */
  useImpressionTracker(
    articleRef,
    {
      loaiDoiTuong: "su_kien",
      idDoiTuong: ref?.suKienId ?? "",
      nguon: entityLens ? "entity_lens" : "journey_home",
    },
    Boolean(ref?.suKienId),
  );

  if (!ref || !attr) return null;

  const cover = milestone.media?.[0];
  const popoverKind = orgKindForPopover(attr.orgKind);
  const when = formatEventWhen(ref.batDau, locale);
  const badge = dateBadgeParts(
    milestone.year,
    milestone.month,
    milestone.day,
    locale,
  );
  const stepStatus = getStepStatus(ref.batDau, ref.ketThuc ?? null);
  const countdownStatus =
    stepStatus === "active" ? ("active" as const) : ("upcoming" as const);

  const orgRow = (
    <span className="j-osk-org-row">
      <span className="j-osk-org-logo" aria-hidden>
        {attr.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={attr.avatarUrl} alt="" loading="lazy" />
        ) : (
          <span className="j-osk-org-logo-fallback">
            {(attr.initial ?? attr.name.slice(0, 1)).toUpperCase()}
          </span>
        )}
      </span>
      <span className="j-osk-org-name">{attr.name}</span>
    </span>
  );

  const cardClass = [
    "j-milestone",
    "j-tagged",
    "j-org-su-kien",
    entityLens ? "j-entity-lens" : "",
    milestone.feedSuggestion ? "j-feed-suggestion" : "",
    phanHoi === "quan_tam" ? "j-org-su-kien--interest" : "",
    phanHoi === "se_tham_gia" ? "j-org-su-kien--rsvp" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article ref={articleRef} className={cardClass} data-mid={milestone.id}>
      <div className="j-m-card jcard j-org-su-kien-card">
        <div className="j-osk-hero">
          {cover?.src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cover.src}
              alt=""
              className="j-osk-hero-img"
              loading="lazy"
            />
          ) : (
            <span className="j-osk-hero-fallback" aria-hidden>
              {milestone.title.slice(0, 2).toUpperCase()}
            </span>
          )}
          <span className="j-osk-hero-shade" aria-hidden />
        </div>

        <div className="j-osk-body">
          <div className="j-osk-head">
            {popoverKind ? (
              <JourneyOrgPopover
                slug={ref.orgSlug}
                orgKind={popoverKind}
                href={ref.href}
                fallbackName={attr.name}
                fallbackAvatarUrl={attr.avatarUrl}
              >
                {orgRow}
              </JourneyOrgPopover>
            ) : (
              <Link href={ref.href} prefetch={false} className="j-osk-org-link">
                {orgRow}
              </Link>
            )}
            <span className="j-osk-date-badge">
              <WorldBoostToggle loai="org_su_kien" id={ref.suKienId} />
              <span className="j-osk-date-core">
                <span className="j-osk-date-month">{badge.month}</span>
                <span className="j-osk-date-day">{badge.day}</span>
              </span>
              <HaOrgUpCountdown
                batDauIso={ref.batDau}
                ketThucIso={ref.ketThuc ?? null}
                status={countdownStatus}
              />
            </span>
          </div>

          <Link href={ref.href} className="j-osk-title" prefetch={false}>
            {milestone.title}
          </Link>

          {milestone.feedFriends && milestone.feedFriends.length > 0 ? (
            <OrgSuKienFriendsChips
              friends={milestone.feedFriends}
              eventTitle={milestone.title}
            />
          ) : milestone.feedSocialHint ? (
            <p className="j-osk-social-hint">{milestone.feedSocialHint}</p>
          ) : null}

          {when ? (
            <p className="j-osk-when">
              <Clock3 size={14} strokeWidth={2} aria-hidden />
              <span>
                <strong>{when.time}</strong>
                <span className="j-osk-when-sep"> · </span>
                {when.date}
              </span>
            </p>
          ) : null}

          {milestone.body ? (
            <p className="j-osk-desc">{milestone.body}</p>
          ) : null}

          <SuKienPhanHoiActions
            orgId={ref.orgId}
            suKienId={ref.suKienId}
            className="j-osk-actions"
            onLoaiChange={setPhanHoi}
            orgTen={attr.name}
            orgAvatarUrl={attr.avatarUrl}
            nguCanh={{
              loai: "su_kien",
              id: ref.suKienId,
              tieuDe: milestone.title,
              moTa: milestone.body ?? null,
              anh: cover?.src ?? null,
              href: ref.href,
              orgTen: attr.name,
            }}
          />
        </div>
      </div>
    </article>
  );
}
