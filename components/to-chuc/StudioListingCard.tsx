import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Briefcase, MapPin } from "lucide-react";

import { labelTinhThanh } from "@/lib/truong/contact";
import { listingOrgRelationBadge } from "@/lib/to-chuc/co-so-vai-tro";
import type { StudioListItem } from "@/lib/to-chuc/studio-listing";

type Props = {
  studio: StudioListItem;
  index: number;
};

export function StudioListingCard({ studio, index }: Props) {
  const href = `/studio/${studio.slug}`;
  const coverUrl = studio.coverSrc;
  const avatarUrl = studio.avatarSrc;
  const locationLabel = labelTinhThanh(studio.tinhThanh);
  const kindLabel = studio.loaiToChuc === "doanh_nghiep" ? "Doanh nghiệp" : "Studio";
  const relationBadge = listingOrgRelationBadge(studio);
  const subtitle =
    studio.tenChinhThuc && studio.tenChinhThuc.trim() !== studio.ten.trim()
      ? studio.tenChinhThuc.trim()
      : null;
  const desc = studio.moTa?.trim() || null;
  const initials = studio.ten.slice(0, 2).toUpperCase();
  const websiteLabel = studio.website
    ? studio.website.replace(/^https?:\/\//, "").replace(/\/$/, "")
    : null;

  return (
    <Link
      href={href}
      className="tdh-card tdh-coso-card"
      style={{ animationDelay: `${0.05 + index * 0.05}s` }}
      data-type={studio.loaiToChuc}
    >
      <div className="tdh-coso-cover" aria-hidden>
        <div
          className={`tdh-coso-cover-bg${coverUrl ? " tdh-coso-cover-bg--photo" : ""}`}
        >
          {coverUrl ? (
            <Image
              src={coverUrl}
              alt=""
              fill
              className="tdh-card-cover-photo"
              sizes="(max-width: 640px) 100vw, 320px"
              unoptimized={coverUrl.includes("imagedelivery.net")}
            />
          ) : (
            <div className="tdh-coso-cover-pattern" />
          )}
        </div>
        <div className="tdh-coso-cover-shade" />
        <span className="tdh-coso-kicker">
          <Briefcase size={14} strokeWidth={2} aria-hidden />
          {kindLabel}
        </span>
        {relationBadge ? (
          <span className="tdh-coso-role-badge">{relationBadge}</span>
        ) : null}
      </div>

      <div className="tdh-coso-body">
        <div className="tdh-coso-head">
          <span className="tdh-card-avatar tdh-coso-avatar">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt=""
                width={76}
                height={76}
                className="tdh-card-avatar-img"
                unoptimized={avatarUrl.includes("imagedelivery.net")}
              />
            ) : (
              <span className="tdh-card-avatar-ph">{initials}</span>
            )}
          </span>
          <div className="tdh-coso-head-text">
            <div className="tdh-coso-title-block">
              <h2 className="tdh-coso-name">{studio.ten}</h2>
              {subtitle ? (
                <p className="tdh-coso-subtitle">{subtitle}</p>
              ) : null}
            </div>
            <span className="tdh-coso-type">{kindLabel}</span>
          </div>
        </div>

        {locationLabel ? (
          <div className="tdh-coso-meta">
            <span className="tdh-coso-loc">
              <MapPin size={14} strokeWidth={2} aria-hidden />
              {locationLabel}
            </span>
          </div>
        ) : null}

        {desc ? <p className="tdh-coso-desc">{desc}</p> : null}

        <div className="tdh-coso-foot">
          <span className="tdh-coso-foot-label">
            {websiteLabel ?? "Xem studio"}
          </span>
          <span className="tdh-coso-foot-arrow" aria-hidden>
            <ArrowRight size={18} strokeWidth={2.2} />
          </span>
        </div>
      </div>
    </Link>
  );
}
