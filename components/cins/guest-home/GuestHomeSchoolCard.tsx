import Image from "next/image";
import Link from "next/link";

import { TruongCardCoverGeo } from "@/components/truong/TruongCardCoverGeo";
import { labelLoaiTruong } from "@/lib/nganh/truong-shared";
import { labelTinhThanh } from "@/lib/truong/contact";
import { truongCoverClass } from "@/lib/truong/display";
import {
  resolveSchoolAvatarSrc,
  schoolInitials,
} from "@/lib/truong/school-avatar";
import { resolveSchoolCoverSrc } from "@/lib/truong/school-cover";
import type { TruongListItem } from "@/lib/truong/types";

type Props = {
  school: TruongListItem;
  index: number;
  href: string;
};

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

/** Card trường / cơ sở trên home guest — cover + logo, đồng bộ listing trường. */
export function GuestHomeSchoolCard({ school, index, href }: Props) {
  const cover = resolveSchoolCoverSrc(school);
  const avatarSrc = resolveSchoolAvatarSrc(school);
  const logoInitials = schoolInitials(school.ten);
  const typeLabel = labelLoaiTruong(school.loai_truong);
  const locationLabel = labelTinhThanh(school.tinh_thanh);
  const branchCount = school.chi_nhanh?.length ?? 0;
  const tags = school.nganhTags.slice(0, 2);
  const extraTags =
    school.nganhCount > tags.length ? school.nganhCount - tags.length : 0;

  return (
    <Link href={href} className="gh-school-card">
      <div className="gh-school-cover" aria-hidden>
        <div
          className={`gh-school-cover-bg ${cover ? "gh-school-cover-bg--photo" : truongCoverClass(index)}`}
        >
          {cover ? (
            <Image
              src={cover}
              alt=""
              fill
              className="gh-school-cover-img"
              sizes="(max-width:640px) 100vw, 320px"
              unoptimized={cover.includes("imagedelivery.net")}
            />
          ) : avatarSrc ? (
            <div className="gh-school-cover-logo">
              <Image
                src={avatarSrc}
                alt=""
                width={72}
                height={72}
                className="gh-school-cover-logo-img"
                unoptimized={avatarSrc.includes("imagedelivery.net")}
              />
            </div>
          ) : null}
        </div>
        {!cover ? <div className="gh-school-cover-noise" /> : null}
        {cover ? (
          <div className="gh-school-cover-shade" />
        ) : (
          <div className="gh-school-cover-geo">
            <TruongCardCoverGeo variant={index} />
          </div>
        )}
      </div>

      <div className="gh-school-body">
        <div className="gh-school-logo">
          {avatarSrc ? (
            <Image
              src={avatarSrc}
              alt=""
              width={64}
              height={64}
              className="gh-school-logo-img"
              unoptimized={avatarSrc.includes("imagedelivery.net")}
            />
          ) : (
            <span className="gh-school-logo-initials" aria-hidden>
              {logoInitials}
            </span>
          )}
        </div>
        <div className="gh-school-head-text">
          <h3 className="gh-school-name">{school.ten}</h3>
          {school.ten_tieng_anh?.trim() ? (
            <p className="gh-school-en">{school.ten_tieng_anh.trim()}</p>
          ) : null}
          {school.ma_truong || typeLabel !== "—" ? (
            <div className="gh-school-head-tags">
              {school.ma_truong ? (
                <span className="gh-school-code">{school.ma_truong}</span>
              ) : null}
              {typeLabel !== "—" ? (
                <span className="gh-school-type">{typeLabel}</span>
              ) : null}
            </div>
          ) : null}
        </div>

        {tags.length > 0 ? (
          <ul className="gh-school-tags" aria-label="Ngành đào tạo nổi bật">
            {tags.map((tag) => (
              <li key={tag} className="gh-school-tag">
                {tag}
              </li>
            ))}
            {extraTags > 0 ? (
              <li className="gh-school-tag gh-school-tag--muted">+{extraTags}</li>
            ) : null}
          </ul>
        ) : null}

        {locationLabel || branchCount > 0 ? (
          <div className="gh-school-locbar">
            {locationLabel ? (
              <span className="gh-school-loc">
                <LocationIcon />
                {locationLabel}
              </span>
            ) : null}
            {branchCount > 0 ? (
              <span className="gh-school-branch">{branchCount} chi nhánh</span>
            ) : null}
          </div>
        ) : null}

        <div className="gh-school-foot">
          <div className="gh-school-stat-block">
            <div className="gh-school-stat-num">
              {school.nganhCount > 0 ? school.nganhCount : "—"}
              {school.nganhCount > 0 ? (
                <span className="gh-school-stat-unit">ngành</span>
              ) : null}
            </div>
            <div className="gh-school-stat-label">
              {school.nganhCount > 0 ? "Đang tuyển" : "Đang cập nhật"}
            </div>
          </div>
          <span className="gh-school-arrow">
            <ArrowIcon />
          </span>
        </div>
      </div>
    </Link>
  );
}
