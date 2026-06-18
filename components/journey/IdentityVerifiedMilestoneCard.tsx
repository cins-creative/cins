"use client";

import {
  Building2,
  Calendar,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Tag,
} from "lucide-react";
import Link from "next/link";

import type {
  MilestoneAttribution,
  MilestoneType,
  MilestoneVisibility,
} from "@/components/journey/milestone-types";
import { JourneyMilestoneOwnerMenu } from "@/components/journey/JourneyMilestoneOwnerMenu";
import { JOURNEY_MILESTONE_TYPE_OPTIONS } from "@/lib/journey/milestone-type-options";

type Props = {
  milestoneCls: string;
  milestoneId: string;
  cotMocId: string;
  ownerSlug: string;
  displayDate: string;
  year: number;
  month: number;
  day: number;
  title: string;
  body?: string | null;
  type: MilestoneType;
  visibility?: MilestoneVisibility;
  attribution?: MilestoneAttribution | null;
  verifiedBy?: string | null;
  orgHref?: string | null;
  isOwner: boolean;
};

export function IdentityVerifiedMilestoneCard({
  milestoneCls,
  milestoneId,
  cotMocId,
  ownerSlug,
  displayDate,
  year,
  month,
  day,
  title,
  body,
  type,
  visibility = "public",
  attribution,
  verifiedBy,
  orgHref,
  isOwner,
}: Props) {
  const orgName = attribution?.name ?? verifiedBy?.replace(/^✓\s*/, "") ?? "Tổ chức";
  const avatarUrl = attribution?.avatarUrl ?? null;
  const href = orgHref ?? attribution?.href ?? null;
  const initial = (attribution?.initial || orgName.charAt(0) || "?").toUpperCase();
  const typeOption = JOURNEY_MILESTONE_TYPE_OPTIONS.find((o) => o.ui === type);
  const TypeIcon = typeOption?.Icon ?? Tag;

  return (
    <article
      className={`${milestoneCls} j-identity-verified`}
      data-mid={milestoneId}
      data-content-kind="identity-verified"
      data-year={year}
      data-month={month}
      data-group={type}
    >
      <div className="j-m-body-wrap">
        <div className="j-m-card jcard jcard--identity-verified">
          <div className="j-verify-card j-verify-card--approved">
            <div className="j-verify-card-body">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt=""
                  className="j-verify-card-avatar"
                />
              ) : (
                <span className="j-verify-card-avatar j-verify-card-avatar--empty">
                  {initial}
                </span>
              )}

              <div className="j-verify-card-copy">
                <p className="j-verify-card-kicker">
                  <ShieldCheck size={14} strokeWidth={2.2} aria-hidden />
                  Cột mốc đã xác thực
                </p>
                <p className="j-verify-card-lead">
                  <Building2 size={14} strokeWidth={2} aria-hidden />
                  Xác nhận bởi <strong>{orgName}</strong>
                </p>
                <p className="j-verify-card-title">{title}</p>
                {body ? (
                  <p className="j-verify-card-sub">
                    <Tag size={13} strokeWidth={2} aria-hidden />
                    {body}
                  </p>
                ) : null}
              </div>

              <span className="j-verify-card-status is-approved">
                <CheckCircle2 size={13} strokeWidth={2.4} aria-hidden />
                Đã xác thực
              </span>
            </div>

            <div className="j-verify-card-meta">
              <span className="j-verify-card-meta-item">
                <Calendar size={13} strokeWidth={2} aria-hidden />
                <time
                  dateTime={`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`}
                >
                  {displayDate}
                </time>
              </span>
              <span className="j-verify-card-meta-item">
                <TypeIcon size={13} strokeWidth={2} aria-hidden />
                {typeOption?.label ?? type}
              </span>
            </div>

            {isOwner ? (
              <div className="j-verify-card-actions">
                {href ? (
                  <Link
                    href={href}
                    className="j-verify-card-btn is-view"
                    prefetch={false}
                  >
                    <ExternalLink size={14} strokeWidth={2} aria-hidden />
                    Xem tổ chức
                  </Link>
                ) : null}
                <JourneyMilestoneOwnerMenu
                  milestoneId={cotMocId}
                  ownerSlug={ownerSlug}
                  currentType={type}
                  currentVisibility={visibility}
                  postSlug={null}
                  hideEdit
                  hideTypeChange
                  className="j-verify-card-menu"
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
