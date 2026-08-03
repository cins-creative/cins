"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { OrgTinNhanNavLink } from "@/components/to-chuc/quan-ly/OrgTinNhanNavLink";
import { TruongMilestoneTagNotify } from "@/components/truong/TruongMilestoneTagNotify";
import {
  ORG_QUAN_LY_NAV,
  orgQuanLyPath,
  orgQuanLyShowsCaiDat,
  orgQuanLyShowsMilestoneNotify,
  resolveOrgQuanLySection,
  type OrgQuanLyKind,
  type OrgQuanLySection,
} from "@/lib/to-chuc/org-quan-ly-routes";

type Props = {
  orgKind: OrgQuanLyKind;
  orgId: string;
  orgSlug: string;
  /** Giữ prop cho gate / metadata; không còn hiện header tên. */
  orgTen: string;
  active: OrgQuanLySection;
  /** Founder tier (owner/admin) — hiện link Cài đặt tối cao (chỉ cơ sở). */
  isFounder?: boolean;
  children: ReactNode;
};

export function OrgQuanLyShell({
  orgKind,
  orgId,
  orgSlug,
  active,
  isFounder = false,
  children,
}: Props) {
  const resolved = resolveOrgQuanLySection(orgKind, active);
  const isCaiDat = active === "cai-dat";
  const isTinNhan = active === "tin-nhan";
  const isWideLayout = active === "hoc-phi" || active === "lop-hoc";
  const navGroups = ORG_QUAN_LY_NAV[orgKind];
  const showMilestone = orgQuanLyShowsMilestoneNotify(orgKind);
  const showCaiDat = orgQuanLyShowsCaiDat(orgKind) && isFounder;

  return (
    <div
      className={[
        "cso-ql",
        isTinNhan ? "cso-ql--tin-nhan" : null,
        isWideLayout ? "cso-ql--wide" : null,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <nav className="cso-ql-nav" aria-label="Mục quản lý">
        {navGroups.map((group, groupIndex) => (
          <div
            key={group.id}
            className={`cso-ql-nav-group${groupIndex > 0 ? " cso-ql-nav-group--sep" : ""}`}
          >
            <div className="cso-ql-nav-group-links">
              {group.items.map((tab) => {
                const href = orgQuanLyPath(orgKind, orgSlug, tab.id);
                const isActive = resolved === tab.id;
                return (
                  <Link
                    key={tab.id}
                    href={href}
                    className={`cso-ql-nav-link${isActive ? " is-active" : ""}`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {tab.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
        <div className="cso-ql-nav-group cso-ql-nav-group--trail">
          <div className="cso-ql-nav-group-links cso-ql-nav-tools">
            <OrgTinNhanNavLink
              orgKind={orgKind}
              orgId={orgId}
              orgSlug={orgSlug}
              active={isTinNhan}
            />
            {showMilestone ? (
              <TruongMilestoneTagNotify
                orgId={orgId}
                variant="nav"
                alwaysAvailable
                showWallAdmin={
                  orgKind === "co_so_dao_tao" || orgKind === "truong_dai_hoc"
                }
              />
            ) : null}
            {showCaiDat ? (
              <Link
                href={orgQuanLyPath(orgKind, orgSlug, "cai-dat")}
                className={`cso-ql-nav-link${isCaiDat ? " is-active" : ""}`}
                aria-current={isCaiDat ? "page" : undefined}
              >
                Cài đặt tối cao
              </Link>
            ) : null}
          </div>
        </div>
      </nav>

      <div className="cso-ql-inner">
        <div className="cso-ql-body">{children}</div>
      </div>
    </div>
  );
}
