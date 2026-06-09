import Image from "next/image";
import Link from "next/link";
import { ArrowRight, GraduationCap, MapPin } from "lucide-react";

import { TruongOrgAvatar } from "@/components/truong/TruongOrgAvatar";
import { labelLoaiCoSo } from "@/lib/to-chuc/constants";
import { labelTinhThanh } from "@/lib/truong/contact";
import { resolveSchoolCoverSrc } from "@/lib/truong/school-cover";
import type { TruongListItem } from "@/lib/truong/types";
import { truongListingHref } from "@/lib/truong/listing-href";

type Props = {
  school: TruongListItem;
  index: number;
};

export function CoSoListingCard({ school, index }: Props) {
  const href = truongListingHref(school);
  const coverUrl = resolveSchoolCoverSrc(school);
  const locationLabel = labelTinhThanh(school.tinh_thanh);
  const loaiLabel = labelLoaiCoSo(school.loai_truong);
  const subtitle =
    school.ten_chinh_thuc &&
    school.ten_chinh_thuc.trim() !== school.ten.trim()
      ? school.ten_chinh_thuc.trim()
      : null;
  const desc = school.mo_ta?.trim() || null;

  return (
    <Link
      href={href}
      className="tdh-card tdh-coso-card"
      style={{ animationDelay: `${0.05 + index * 0.05}s` }}
      data-type="co_so_dao_tao"
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
          <GraduationCap size={14} strokeWidth={2} aria-hidden />
          Cơ sở đào tạo
        </span>
      </div>

      <div className="tdh-coso-body">
        <div className="tdh-coso-head">
          <TruongOrgAvatar
            school={school}
            size="md"
            className="tdh-card-avatar tdh-coso-avatar"
          />
          <div className="tdh-coso-head-text">
            <div className="tdh-coso-title-block">
              <h2 className="tdh-coso-name">{school.ten}</h2>
              {subtitle ? (
                <p className="tdh-coso-subtitle">{subtitle}</p>
              ) : null}
            </div>
            <span className="tdh-coso-type">{loaiLabel}</span>
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
          <span className="tdh-coso-foot-label">Xem trang cơ sở</span>
          <span className="tdh-coso-foot-arrow" aria-hidden>
            <ArrowRight size={18} strokeWidth={2.2} />
          </span>
        </div>
      </div>
    </Link>
  );
}
