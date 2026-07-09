import Link from "next/link";
import { ArrowUpRight, Briefcase, GraduationCap } from "lucide-react";

import type { MilestoneBookmarkListing } from "@/components/journey/milestone-types";

type Props = {
  title: string;
  listing: MilestoneBookmarkListing;
};

function JobBookmarkCard({ title, listing }: Props) {
  const orgInitial = listing.orgTen.trim().charAt(0).toUpperCase() || "?";
  const tags = [listing.loaiHinhLabel, listing.place, listing.linhVucTen]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link
      href={listing.href}
      className="j-bm-listing j-bm-listing--job"
      prefetch={false}
    >
      <span className="j-bm-listing-logo" aria-hidden>
        {listing.orgAvatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={listing.orgAvatarUrl} alt="" />
        ) : (
          <span>{orgInitial}</span>
        )}
      </span>

      <span className="j-bm-listing-main">
        <span className="j-bm-listing-head">
          {listing.statusLabel ? (
            <span
              className={`j-bm-listing-badge is-${listing.statusTone ?? "open"}`}
            >
              {listing.statusLabel}
            </span>
          ) : null}
          {listing.deadline ? (
            <span className="j-bm-listing-deadline">{listing.deadline}</span>
          ) : null}
        </span>
        <span className="j-bm-listing-title">{title}</span>
        <span className="j-bm-listing-org">
          <Briefcase size={12} strokeWidth={2} aria-hidden />
          {listing.orgTen}
        </span>
        {tags ? <span className="j-bm-listing-tags">{tags}</span> : null}
        {listing.snippet ? (
          <span className="j-bm-listing-snippet">{listing.snippet}</span>
        ) : null}
        <span className="j-bm-listing-salary">{listing.salary ?? "Thỏa thuận"}</span>
      </span>

      <span className="j-bm-listing-arrow" aria-hidden>
        <ArrowUpRight size={16} strokeWidth={2.2} />
      </span>
    </Link>
  );
}

function CourseBookmarkCard({ title, listing }: Props) {
  const orgInitial = listing.orgTen.trim().charAt(0).toUpperCase() || "?";

  return (
    <Link
      href={listing.href}
      className="j-bm-listing j-bm-listing--course"
      prefetch={false}
    >
      <span className="j-bm-listing-cover" aria-hidden>
        {listing.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={listing.coverUrl}
            alt=""
            className="j-bm-listing-cover-img"
          />
        ) : (
          <span className="j-bm-listing-cover-fallback">
            <GraduationCap size={26} strokeWidth={1.6} />
          </span>
        )}
        <span className="j-bm-listing-cover-badge">Khóa học</span>
      </span>

      <span className="j-bm-listing-body">
        <span className="j-bm-listing-org-row">
          <span className="j-bm-listing-org-avatar">
            {listing.orgAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={listing.orgAvatarUrl} alt="" />
            ) : (
              <span>{orgInitial}</span>
            )}
          </span>
          <span className="j-bm-listing-org-name">{listing.orgTen}</span>
        </span>

        <span className="j-bm-listing-title">{title}</span>

        {listing.snippet ? (
          <span className="j-bm-listing-snippet">{listing.snippet}</span>
        ) : null}

        <span className="j-bm-listing-meta">
          <span className="j-bm-listing-price">
            {listing.hocPhi ?? "Liên hệ"}
          </span>
          {listing.trinhDoLabel ? (
            <span className="j-bm-listing-level">{listing.trinhDoLabel}</span>
          ) : null}
        </span>
      </span>

      <span className="j-bm-listing-arrow j-bm-listing-arrow--course" aria-hidden>
        <ArrowUpRight size={16} strokeWidth={2.2} />
      </span>
    </Link>
  );
}

/** Card bookmark tin tuyển dụng / khóa học trên Journey timeline. */
export function JourneyBookmarkListingCard({ title, listing }: Props) {
  if (listing.kind === "khoa_hoc") {
    return <CourseBookmarkCard title={title} listing={listing} />;
  }
  return <JobBookmarkCard title={title} listing={listing} />;
}
