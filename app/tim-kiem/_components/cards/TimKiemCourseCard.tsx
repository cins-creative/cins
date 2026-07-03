import Link from "next/link";
import { GraduationCap } from "lucide-react";

import type { SearchHit } from "@/lib/search/types";

export function TimKiemCourseCard({ hit }: { hit: SearchHit }) {
  const meta = hit.courseMeta;
  const coverUrl = meta?.coverUrl ?? null;
  const orgTen = meta?.orgTen ?? hit.subtitle ?? "—";
  const orgAvatarUrl = meta?.orgAvatarUrl ?? hit.avatarUrl;
  const orgInitial = orgTen.trim().charAt(0).toUpperCase() || "?";

  return (
    <Link href={hit.href} className="tk-course-card">
      <span className="tk-course-card-cover" aria-hidden>
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverUrl}
            alt=""
            loading="lazy"
            decoding="async"
            className="tk-course-card-cover-img"
          />
        ) : (
          <span className="tk-course-card-cover-fallback">
            <GraduationCap size={26} strokeWidth={1.6} />
          </span>
        )}
        <span className="tk-course-card-badge">Khóa học</span>
      </span>

      <span className="tk-course-card-body">
        <span className="tk-course-card-org">
          <span className="tk-course-card-org-avatar">
            {orgAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={orgAvatarUrl} alt="" loading="lazy" decoding="async" />
            ) : (
              <span>{orgInitial}</span>
            )}
          </span>
          <span className="tk-course-card-org-name">{orgTen}</span>
        </span>

        <span className="tk-course-card-title">{hit.title}</span>

        {hit.snippet ? (
          <span className="tk-course-card-snippet">{hit.snippet}</span>
        ) : null}

        <span className="tk-course-card-meta">
          <span className="tk-course-card-price">
            {meta?.hocPhi ?? "Liên hệ"}
          </span>
          {meta?.trinhDoLabel ? (
            <span className="tk-course-card-level">{meta.trinhDoLabel}</span>
          ) : null}
        </span>
      </span>
    </Link>
  );
}
