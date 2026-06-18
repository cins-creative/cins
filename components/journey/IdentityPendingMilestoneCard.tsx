"use client";

import { Pencil } from "lucide-react";

import { useJourneyCompose } from "@/components/journey/JourneyComposeContext";
import { MembershipVerifyCard } from "@/components/journey/MembershipVerifyCard";
import type {
  MembershipPendingMeta,
  MilestoneAttribution,
  MilestoneType,
  MilestoneVisibility,
} from "@/components/journey/milestone-types";

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
  title,
  year,
  month,
  type,
  attribution,
  membershipPending,
  isOwner,
}: Props) {
  const { openCompose, canCompose } = useJourneyCompose();
  const orgName = attribution?.name ?? membershipPending.orgTen;
  const avatarUrl = attribution?.avatarUrl ?? membershipPending.orgAvatarUrl;

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
        <MembershipVerifyCard
          as="div"
          variant="pending"
          cotMocId={cotMocId}
          orgName={orgName}
          orgAvatarUrl={avatarUrl}
          title={title}
          actions={
            isOwner && canCompose ? (
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
            ) : null
          }
        />
      </div>
    </article>
  );
}
