"use client";

import { ArrowUpRight, MapPin, Phone } from "lucide-react";
import Link from "next/link";

import { TruongOrgAvatar } from "@/components/truong/TruongOrgAvatar";
import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";
import { coSoRootPath } from "@/lib/to-chuc/co-so-routes";
import {
  formatChiNhanhAddress,
  resolveTruongChiNhanh,
} from "@/lib/truong/chi-nhanh";
import type { TruongDetail } from "@/lib/truong/types";

type Props = {
  /** Fallback khi không có `TruongInlineEditProvider`. */
  school?: TruongDetail;
  orgId?: string;
};

/** Footer chi tiết khóa — gradient + danh sách cơ sở. */
export function CoSoKhoaHocOrgFooter({ school: schoolProp }: Props) {
  const ctx = useTruongInlineEdit();
  const school = ctx?.school ?? schoolProp;

  if (!school) return null;

  const branches = resolveTruongChiNhanh(school);

  return (
    <footer className="cso-khd-org-foot" aria-label="Thông tin cơ sở đào tạo">
      <div className="cso-khd-org-foot-glow" aria-hidden />
      <div className="cso-khd-org-foot-inner">
        <Link
          href={coSoRootPath(school.slug)}
          scroll={false}
          className="cso-khd-org-foot-brand"
        >
          <TruongOrgAvatar
            school={school}
            size="md"
            className="cso-khd-org-foot-ava"
          />
          <span className="cso-khd-org-foot-brand-copy">
            <span className="cso-khd-org-foot-eyebrow">Cơ sở đào tạo</span>
            <span className="cso-khd-org-foot-name">{school.ten}</span>
          </span>
          <ArrowUpRight
            size={18}
            strokeWidth={2}
            className="cso-khd-org-foot-brand-go"
            aria-hidden
          />
        </Link>

        {branches.length > 0 ? (
          <div className="cso-khd-org-foot-addr-section">
            <p className="cso-khd-org-foot-addr-label">
              Hệ thống cơ sở
              <span className="cso-khd-org-foot-addr-count">{branches.length}</span>
            </p>
            <ul className="cso-khd-org-foot-addr-grid" aria-label="Địa chỉ cơ sở">
              {branches.map((branch) => {
                const phone = branch.dien_thoai?.trim();
                return (
                  <li key={branch.id} className="cso-khd-org-foot-addr-card">
                    <div className="cso-khd-org-foot-addr-card-head">
                      <MapPin size={14} strokeWidth={2.2} aria-hidden />
                      <span>{branch.ten}</span>
                    </div>
                    <p className="cso-khd-org-foot-addr-text">
                      {formatChiNhanhAddress(branch)}
                    </p>
                    {phone ? (
                      <a
                        className="cso-khd-org-foot-addr-phone"
                        href={`tel:${phone.replace(/\s+/g, "")}`}
                      >
                        <Phone size={13} strokeWidth={2} aria-hidden />
                        {phone}
                      </a>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </div>
    </footer>
  );
}
