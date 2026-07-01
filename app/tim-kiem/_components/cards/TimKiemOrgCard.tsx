import Link from "next/link";
import { ArrowRight, GraduationCap, MapPin } from "lucide-react";

import type { SearchHit } from "@/lib/search/types";

function orgAccentClass(loai: string | null): string {
  switch (loai) {
    case "truong_dai_hoc":
      return "tk-org-card--truong";
    case "co_so_dao_tao":
      return "tk-org-card--coso";
    case "studio":
    case "doanh_nghiep":
      return "tk-org-card--studio";
    case "cong_dong":
      return "tk-org-card--congdong";
    default:
      return "tk-org-card--default";
  }
}

function orgKickerIcon(loai: string | null) {
  if (loai === "truong_dai_hoc" || loai === "co_so_dao_tao") {
    return <GraduationCap size={14} strokeWidth={2} aria-hidden />;
  }
  return null;
}

export function TimKiemOrgCard({ hit }: { hit: SearchHit }) {
  const meta = hit.orgMeta;
  const initial = hit.title.trim().charAt(0).toUpperCase() || "?";
  const coverUrl = meta?.coverUrl ?? null;
  const officialName = meta?.officialName ?? null;
  const locationLabel = meta?.locationLabel ?? null;
  const typeLabel = meta?.typeLabel ?? null;
  const desc = meta?.moTa ?? hit.snippet;
  const footLabel = meta?.footLabel ?? "Xem trang";

  return (
    <Link
      href={hit.href}
      className={`tk-org-card ${orgAccentClass(hit.entityLoai)}`}
    >
      <div className="tk-org-card-cover" aria-hidden>
        <div
          className={`tk-org-card-cover-bg${coverUrl ? " tk-org-card-cover-bg--photo" : ""}`}
        >
          {coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverUrl}
              alt=""
              loading="lazy"
              decoding="async"
              className="tk-org-card-cover-photo"
            />
          ) : (
            <div className="tk-org-card-cover-pattern" />
          )}
        </div>
        <div className="tk-org-card-cover-shade" />
        {hit.badge ? (
          <span className="tk-org-card-cover-kicker">
            {orgKickerIcon(hit.entityLoai)}
            {hit.badge}
          </span>
        ) : null}
      </div>

      <div className="tk-org-card-body">
        <div className="tk-org-card-head">
          <span className="tk-org-card-avatar">
            {hit.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={hit.avatarUrl} alt="" loading="lazy" decoding="async" />
            ) : (
              initial
            )}
          </span>
          <div className="tk-org-card-head-text">
            <div className="tk-org-card-title-block">
              <h3 className="tk-org-card-title">{hit.title}</h3>
              {officialName ? (
                <p className="tk-org-card-subtitle">{officialName}</p>
              ) : hit.subtitle ? (
                <p className="tk-org-card-subtitle">{hit.subtitle}</p>
              ) : null}
            </div>
            {typeLabel ? (
              <span className="tk-org-card-type">{typeLabel}</span>
            ) : null}
          </div>
        </div>

        {locationLabel ? (
          <div className="tk-org-card-meta">
            <span className="tk-org-card-loc">
              <MapPin size={14} strokeWidth={2} aria-hidden />
              {locationLabel}
            </span>
          </div>
        ) : null}

        {desc ? <p className="tk-org-card-desc">{desc}</p> : null}

        <div className="tk-org-card-foot">
          <span className="tk-org-card-foot-label">{footLabel}</span>
          <span className="tk-org-card-foot-arrow" aria-hidden>
            <ArrowRight size={18} strokeWidth={2.2} />
          </span>
        </div>
      </div>
    </Link>
  );
}
