"use client";

import { GraduationCap } from "lucide-react";
import Link from "next/link";

import { JourneyMilestoneOwnerMenu } from "@/components/journey/JourneyMilestoneOwnerMenu";
import type {
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
  khoaTen: string;
  orgTen: string;
  orgAvatarUrl?: string | null;
  thumbnailUrl?: string | null;
  khoaHref?: string | null;
  orgHref?: string | null;
  type: MilestoneType;
  visibility?: MilestoneVisibility;
  isOwner: boolean;
};

export function BatDauHocMilestoneCard({
  milestoneCls,
  milestoneId,
  cotMocId,
  ownerSlug,
  displayDate,
  year,
  month,
  khoaTen,
  orgTen,
  thumbnailUrl,
  khoaHref,
  orgHref,
  type,
  visibility = "public",
  isOwner,
}: Props) {
  const href = khoaHref ?? orgHref ?? null;
  const ctaLabel = khoaHref ? "Xem khóa học" : "Xem cơ sở đào tạo";

  return (
    <article
      className={`${milestoneCls} j-bat-dau-hoc`}
      data-mid={milestoneId}
      data-content-kind="bat-dau-hoc"
      data-year={year}
      data-month={month}
      data-group="hoc"
    >
      <div className="j-m-body-wrap">
        <div className="j-m-card jcard jcard--bat-dau-hoc">
          <div className={`jbh-panel${thumbnailUrl ? " has-thumb" : ""}`}>
            <div
              className={`jbh-thumb${thumbnailUrl ? " has-img" : ""}`}
              aria-hidden
            >
              {thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumbnailUrl} alt="" />
              ) : (
                <GraduationCap
                  size={36}
                  strokeWidth={1.5}
                  className="jbh-thumb-ico"
                />
              )}
              <span className="ctx-badge j-type-hoc jbh-badge">Học viên</span>
            </div>

            <div className="jbh-body">
              <p className="jbh-copy">
                Bắt đầu khóa <strong>{khoaTen}</strong> tại{" "}
                <strong>{orgTen}</strong>,{" "}
                <time dateTime={`${year}-${String(month).padStart(2, "0")}`}>
                  {displayDate}
                </time>
              </p>
              <div className="jbh-actions">
                {href ? (
                  <Link href={href} className="jbh-cta" prefetch={false}>
                    {ctaLabel}
                  </Link>
                ) : null}
                {isOwner ? (
                  <JourneyMilestoneOwnerMenu
                    milestoneId={cotMocId}
                    ownerSlug={ownerSlug}
                    currentType={type}
                    currentVisibility={visibility}
                    postSlug={null}
                    hideEdit
                    hideTypeChange
                    className="jbh-menu"
                  />
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
