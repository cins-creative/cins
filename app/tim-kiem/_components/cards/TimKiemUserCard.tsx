import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { SearchHit } from "@/lib/search/types";

export function TimKiemUserCard({ hit }: { hit: SearchHit }) {
  const meta = hit.userMeta;
  const coverUrl = meta?.coverUrl ?? null;
  const initial = (hit.title || hit.slug || "?").trim().slice(0, 1).toUpperCase();
  const bio = meta?.bio ?? hit.snippet;
  const stats = meta?.stats;

  return (
    <Link href={hit.href} className="tk-user-card">
      <div
        className={`tk-user-card-cover${coverUrl ? " has-img" : ""}`}
        aria-hidden
      >
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverUrl} alt="" loading="lazy" decoding="async" />
        ) : null}
      </div>
      <div className="tk-user-card-avatar">
        {hit.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={hit.avatarUrl} alt="" loading="lazy" decoding="async" />
        ) : (
          <span>{initial}</span>
        )}
      </div>
      <div className="tk-user-card-body">
        <h3 className="tk-user-card-name">{hit.title}</h3>
        {hit.subtitle ? (
          <p className="tk-user-card-slug">{hit.subtitle}</p>
        ) : null}
        {bio ? <p className="tk-user-card-bio">{bio}</p> : null}
        {stats ? (
          <div className="tk-user-card-stats" aria-label="Thống kê hồ sơ">
            <span>
              <strong>{stats.cotMoc}</strong>
              Journey
            </span>
            <span>
              <strong>{stats.tacPham}</strong>
              Gallery
            </span>
            <span>
              <strong>{stats.banBe}</strong>
              Bạn bè
            </span>
          </div>
        ) : null}
        {meta?.giaiDoanLabel || meta?.locationLabel ? (
          <div className="tk-user-card-meta">
            {meta.giaiDoanLabel ? <span>{meta.giaiDoanLabel}</span> : null}
            {meta.locationLabel ? <span>{meta.locationLabel}</span> : null}
          </div>
        ) : null}
        <span className="tk-user-card-cta">
          Mở Journey
          <ArrowRight size={16} strokeWidth={2.2} aria-hidden />
        </span>
      </div>
    </Link>
  );
}
