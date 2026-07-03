import Link from "next/link";
import { ArrowUpRight, Briefcase } from "lucide-react";

import type { SearchHit } from "@/lib/search/types";

export function TimKiemJobCard({ hit }: { hit: SearchHit }) {
  const meta = hit.jobMeta;
  const orgTen = meta?.orgTen ?? hit.subtitle ?? "—";
  const orgAvatarUrl = meta?.orgAvatarUrl ?? hit.avatarUrl;
  const orgInitial = orgTen.trim().charAt(0).toUpperCase() || "?";

  const tags = [meta?.loaiHinhLabel, meta?.place].filter(Boolean).join(" · ");

  return (
    <Link href={hit.href} className="tk-job-card">
      <span className="tk-job-card-logo" aria-hidden>
        {orgAvatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={orgAvatarUrl} alt="" loading="lazy" decoding="async" />
        ) : (
          <span>{orgInitial}</span>
        )}
      </span>

      <span className="tk-job-card-main">
        <span className="tk-job-card-title">{hit.title}</span>
        <span className="tk-job-card-org">
          <Briefcase size={12} strokeWidth={2} aria-hidden />
          {orgTen}
        </span>
        {tags ? <span className="tk-job-card-tags">{tags}</span> : null}
        <span className="tk-job-card-salary">
          {meta?.salary ?? "Thỏa thuận"}
        </span>
      </span>

      <span className="tk-job-card-arrow" aria-hidden>
        <ArrowUpRight size={16} strokeWidth={2.2} />
      </span>
    </Link>
  );
}
