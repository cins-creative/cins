"use client";

import { ExternalLink } from "lucide-react";
import Link from "next/link";

import { MembershipVerifyCard } from "@/components/journey/MembershipVerifyCard";
import { JourneyMilestoneOwnerMenu } from "@/components/journey/JourneyMilestoneOwnerMenu";
import type {
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
  verifiedBy?: string | null;
  orgHref?: string | null;
  isOwner: boolean;
};

export function IdentityVerifiedMilestoneCard({
  milestoneCls,
  milestoneId,
  cotMocId,
  ownerSlug,
  title,
  year,
  month,
  type,
  visibility = "public",
  attribution,
  verifiedBy,
  orgHref,
  isOwner,
}: Props) {
  const orgName =
    attribution?.name ?? verifiedBy?.replace(/^✓\s*/, "") ?? "Tổ chức";
  const avatarUrl = attribution?.avatarUrl ?? null;
  const href = orgHref ?? attribution?.href ?? null;

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
        <MembershipVerifyCard
          as="div"
          variant="approved"
          cotMocId={cotMocId}
          orgName={orgName}
          orgAvatarUrl={avatarUrl}
          title={title}
          actions={
            isOwner ? (
              <>
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
              </>
            ) : null
          }
        />
      </div>
    </article>
  );
}
