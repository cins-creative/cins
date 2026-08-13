import Link from "next/link";
import { ArrowUpRight, FileText } from "lucide-react";

import type { SearchHit } from "@/lib/search/types";

type Props = {
  hit: SearchHit;
  variant: "journey" | "org";
};

export function TimKiemPostCard({ hit, variant }: Props) {
  const isOrg = variant === "org";
  const meta = hit.postMeta;
  const coverUrl = meta?.coverUrl ?? null;
  const authorName = meta?.authorName ?? hit.subtitle ?? "—";
  const authorAvatarUrl = meta?.authorAvatarUrl ?? hit.avatarUrl;
  const authorHandle = meta?.authorHandle ?? null;
  const authorInitial = authorName.trim().charAt(0).toUpperCase() || "?";

  return (
    <Link
      href={hit.href}
      className={`tk-post-card${isOrg ? " tk-post-card--org" : " tk-post-card--journey"}`}
    >
      <span
        className={`tk-post-card-cover${coverUrl ? " has-img" : ""}`}
        aria-hidden
      >
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverUrl}
            alt=""
            loading="lazy"
            decoding="async"
            className="tk-post-card-cover-img"
          />
        ) : (
          <span className="tk-post-card-cover-fallback">
            <FileText size={22} strokeWidth={1.6} />
          </span>
        )}
      </span>

      <span className="tk-post-card-main">
        <span className="tk-post-card-author">
          <span className="tk-post-card-author-avatar">
            {authorAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={authorAvatarUrl} alt="" loading="lazy" decoding="async" />
            ) : (
              <span>{authorInitial}</span>
            )}
          </span>
          <span className="tk-post-card-author-text">
            <span className="tk-post-card-author-name">{authorName}</span>
            {authorHandle ? (
              <span className="tk-post-card-author-handle">{authorHandle}</span>
            ) : null}
          </span>
          {hit.badge ? (
            <span className="tk-post-card-badge">{hit.badge}</span>
          ) : null}
        </span>

        <span className="tk-post-card-title">{hit.title}</span>

        {hit.snippet ? (
          <span className="tk-post-card-snippet">{hit.snippet}</span>
        ) : null}
      </span>

      <span className="tk-post-card-arrow" aria-hidden>
        <ArrowUpRight size={16} strokeWidth={2.2} />
      </span>
    </Link>
  );
}
