"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";

import { OrgTinNhanNavLink } from "@/components/to-chuc/quan-ly/OrgTinNhanNavLink";
import { TruongMilestoneTagNotify } from "@/components/truong/TruongMilestoneTagNotify";
import { orgPublicHref } from "@/lib/search/helpers";
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
  orgTen,
  active,
  isFounder = false,
  children,
}: Props) {
  const resolved = resolveOrgQuanLySection(orgKind, active);
  const isCaiDat = active === "cai-dat";
  const isTinNhan = active === "tin-nhan";
  const navGroups = ORG_QUAN_LY_NAV[orgKind];
  const showMilestone = orgQuanLyShowsMilestoneNotify(orgKind);
  const showCaiDat = orgQuanLyShowsCaiDat(orgKind) && isFounder;
  const backHref = orgPublicHref(orgKind, orgSlug);

  return (
    <div className={`cso-ql${isTinNhan ? " cso-ql--tin-nhan" : ""}`}>
      <div className="cso-ql-inner">
        {!isTinNhan ? (
          <header className="cso-ql-header">
            <div>
              <Link href={backHref} className="cso-ql-back">
                <ArrowLeft size={14} strokeWidth={2.2} aria-hidden />
                {orgTen}
              </Link>
            </div>
          </header>
        ) : null}

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

        <div className="cso-ql-body">{children}</div>
      </div>
    </div>
  );
}
