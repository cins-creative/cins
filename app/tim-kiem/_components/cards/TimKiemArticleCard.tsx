import Link from "next/link";

import { hubLoaiDeptTheme } from "@/lib/bai-viet/hub-loai";
import type { SearchHit } from "@/lib/search/types";

export function TimKiemArticleCard({ hit }: { hit: SearchHit }) {
  const hasImg = Boolean(hit.avatarUrl?.trim());
  const dept = hubLoaiDeptTheme(hit.entityLoai);

  return (
    <Link
      href={hit.href}
      className="hn-role-card tk-knowledge-card"
      data-dept={dept}
    >
      <div
        className={
          hasImg ? "hn-role-thumb hn-role-thumb--has-img" : "hn-role-thumb"
        }
      >
        {hasImg ? (
          <span className="career-hub-card-thumb">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={hit.avatarUrl!}
              alt=""
              className="career-hub-card-img"
              loading="lazy"
              decoding="async"
            />
          </span>
        ) : (
          <span className="career-hub-card-ph" aria-hidden>
            {hit.title.trim().charAt(0).toUpperCase() || "?"}
          </span>
        )}
      </div>
      <div className="hn-role-body">
        <span className="career-hub-card-text">
          {hit.badge ? (
            <span className="hn-role-lv-badge">{hit.badge}</span>
          ) : null}
          <span className="career-hub-card-title">{hit.title}</span>
          {hit.subtitle ? (
            <span className="career-hub-card-title-vi">{hit.subtitle}</span>
          ) : null}
          {hit.snippet ? (
            <span className="career-hub-card-tooltip career-hub-card-tooltip--static">
              {hit.snippet}
            </span>
          ) : null}
        </span>
        <footer className="hn-role-foot">
          <span className="bv-hub-role-meta">Kiến thức CINs</span>
          <span className="hn-role-arrow" aria-hidden>
            →
          </span>
        </footer>
      </div>
    </Link>
  );
}
