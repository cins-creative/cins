"use client";

import {
  Building2,
  Calendar,
  Clock3,
  ExternalLink,
  Lock,
  Pencil,
  ShieldCheck,
  Tag,
} from "lucide-react";
import Link from "next/link";

import { useJourneyCompose } from "@/components/journey/JourneyComposeContext";
import type {
  MembershipPendingMeta,
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
  membershipPending: MembershipPendingMeta;
  isOwner: boolean;
};

export function IdentityPendingMilestoneCard({
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
  visibility = "private",
  attribution,
  membershipPending,
  isOwner,
}: Props) {
  const { openCompose, canCompose } = useJourneyCompose();
  const orgName = attribution?.name ?? membershipPending.orgTen;
  const avatarUrl = attribution?.avatarUrl ?? membershipPending.orgAvatarUrl;
  const href = membershipPending.orgHref ?? attribution?.href ?? null;
  const initial = (attribution?.initial || orgName.charAt(0) || "?").toUpperCase();
  const typeOption = JOURNEY_MILESTONE_TYPE_OPTIONS.find((o) => o.ui === type);
  const TypeIcon = typeOption?.Icon ?? Tag;

  return (
    <article
      className={`${milestoneCls} j-identity-pending`}
      data-mid={milestoneId}
      data-content-kind="identity-pending"
      data-year={year}
      data-month={month}
      data-group={type}
    >
      <div className="j-m-body-wrap">
        <div className="j-m-card jcard jcard--identity-pending">
          <div className="j-verify-card">
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
                  Cột mốc chờ xác thực
                </p>
                <p className="j-verify-card-lead">
                  <Building2 size={14} strokeWidth={2} aria-hidden />
                  Đã gửi tới <strong>{orgName}</strong>
                </p>
                <p className="j-verify-card-title">{title}</p>
                {body ? (
                  <p className="j-verify-card-sub">
                    <Tag size={13} strokeWidth={2} aria-hidden />
                    {body}
                  </p>
                ) : null}
                <p className="j-verify-card-note">
                  <Clock3 size={13} strokeWidth={2.2} aria-hidden />
                  Chờ tổ chức duyệt
                  <span className="j-verify-card-note-sep" aria-hidden>
                    ·
                  </span>
                  <Lock size={13} strokeWidth={2.2} aria-hidden />
                  Chỉ bạn thấy
                </p>
              </div>

              <span className="j-verify-card-status">
                <Clock3 size={13} strokeWidth={2.2} aria-hidden />
                Chờ
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
                {canCompose ? (
                  <button
                    type="button"
                    className="j-verify-card-btn is-edit"
                    onClick={() =>
                      openCompose({ kind: "milestone-edit", cotMocId })
                    }
                  >
                    <Pencil size={14} strokeWidth={2} aria-hidden />
                    Chỉnh sửa
                  </button>
                ) : null}
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
