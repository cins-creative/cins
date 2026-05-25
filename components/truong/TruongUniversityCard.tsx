import Image from "next/image";
import Link from "next/link";

import { TruongOrgAvatar } from "@/components/truong/TruongOrgAvatar";
import { TruongOrgBrandMark } from "@/components/truong/TruongOrgBrandMark";
import { TruongCardCoverGeo } from "@/components/truong/TruongCardCoverGeo";
import { labelLoaiTruong } from "@/lib/nganh/truong-shared";
import { labelTinhThanh } from "@/lib/truong/contact";
import { truongCoverClass } from "@/lib/truong/display";
import { resolveSchoolCoverSrc } from "@/lib/truong/school-cover";
import type {
  TruongUniversityCardFoot,
  TruongUniversityCardSchool,
  TruongUniversityCardTag,
} from "@/lib/truong/university-card";

function normalizeTag(tag: TruongUniversityCardTag): {
  label: string;
  muted: boolean;
} {
  if (typeof tag === "string") return { label: tag, muted: false };
  return { label: tag.label, muted: Boolean(tag.muted) };
}

function LocationIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M5 12h14M13 5l7 7-7 7" />
    </svg>
  );
}

export type TruongUniversityCardProps = {
  school: TruongUniversityCardSchool;
  index: number;
  href: string;
  tags: TruongUniversityCardTag[];
  foot: TruongUniversityCardFoot;
  className?: string;
  dataType?: string;
};

export function TruongUniversityCard({
  school,
  index,
  href,
  tags,
  foot,
  className,
  dataType,
}: TruongUniversityCardProps) {
  const coverUrl = resolveSchoolCoverSrc(school);
  const loai = labelLoaiTruong(school.loai_truong);
  const locationLabel = labelTinhThanh(school.tinh_thanh);
  const cardClass = ["tdh-card", className].filter(Boolean).join(" ");

  return (
    <Link
      href={href}
      className={cardClass}
      style={{ animationDelay: `${0.05 + index * 0.05}s` }}
      data-type={dataType ?? school.loai_truong ?? ""}
    >
      <div className="tdh-card-cover" aria-hidden>
        <div
          className={`tdh-card-cover-bg ${coverUrl ? "tdh-card-cover-bg--photo" : truongCoverClass(index)}`}
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
            <TruongOrgBrandMark school={school} variant="card-cover" />
          )}
        </div>
        <div className="tdh-card-cover-noise" />
        {!coverUrl ? (
          <div className="tdh-card-cover-geo">
            <TruongCardCoverGeo variant={index} />
          </div>
        ) : (
          <div className="tdh-card-cover-shade" aria-hidden />
        )}
      </div>
      <div className="tdh-card-body">
        <div className="tdh-card-head">
          <TruongOrgAvatar school={school} size="md" className="tdh-card-avatar" />
          <div className="tdh-card-head-text">
            <h2 className="tdh-card-name">{school.ten}</h2>
            {school.ma_truong ? (
              <span className="tdh-card-code">{school.ma_truong}</span>
            ) : null}
          </div>
        </div>
        <div className="tdh-card-meta">
          {loai !== "—" ? (
            <span className="tdh-card-type">{loai}</span>
          ) : (
            <span className="tdh-card-type">Trường ĐH</span>
          )}
          {locationLabel ? (
            <span className="tdh-card-loc">
              <LocationIcon />
              {locationLabel}
            </span>
          ) : null}
        </div>
        <div className="tdh-card-tags">
          {tags.map((tag) => {
            const { label, muted } = normalizeTag(tag);
            return (
              <span
                key={label}
                className={["tdh-card-tag", muted ? "muted" : ""]
                  .filter(Boolean)
                  .join(" ")}
              >
                {label}
              </span>
            );
          })}
        </div>
        <div className="tdh-card-foot">
          <div>
            <div className="tdh-card-stat-num">
              {foot.value}
              {foot.unit ? <span className="unit">{foot.unit}</span> : null}
            </div>
            <div className="tdh-card-stat-label">{foot.label}</div>
          </div>
          <span className="tdh-card-arrow">
            <ArrowIcon />
          </span>
        </div>
      </div>
    </Link>
  );
}
