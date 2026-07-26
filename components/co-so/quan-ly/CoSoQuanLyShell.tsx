"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";

import { CoSoTinNhanNavLink } from "@/components/co-so/quan-ly/CoSoTinNhanNavLink";
import { TruongMilestoneTagNotify } from "@/components/truong/TruongMilestoneTagNotify";
import {
  coSoQuanLyPath,
  resolveCoSoQuanLySection,
  type CoSoQuanLySection,
} from "@/lib/to-chuc/co-so-routes";

type NavItem = {
  id: Exclude<CoSoQuanLySection, "marketing" | "tin-nhan" | "cai-dat">;
  label: string;
};

type NavGroup = {
  id: string;
  items: NavItem[];
};

/** IA hướng A: 4 cụm — Tổng quan | Thiết lập | Học | Tiền (Marketing gộp Tổng quan). Ranh giới cụm chỉ thể hiện qua khoảng cách/đường kẻ, không có caption. */
const NAV_GROUPS: NavGroup[] = [
  {
    id: "tong-quan",
    items: [{ id: "tong-quan", label: "Tổng quan" }],
  },
  {
    id: "thiet-lap",
    items: [{ id: "co-so", label: "Cơ sở" }],
  },
  {
    id: "hoc",
    items: [
      { id: "lop-hoc", label: "Khóa & lớp" },
      { id: "giao-trinh", label: "Giáo trình" },
      { id: "hoc-vien", label: "Học viên" },
      { id: "diem-danh", label: "Điểm danh" },
    ],
  },
  {
    id: "tien",
    items: [{ id: "doanh-thu", label: "Doanh thu" }],
  },
];

type Props = {
  orgId: string;
  orgSlug: string;
  orgTen: string;
  active: CoSoQuanLySection;
  /** Founder tier (owner/admin) — hiện link Cài đặt tối cao bên phải nav. */
  isFounder?: boolean;
  children: ReactNode;
};

export function CoSoQuanLyShell({
  orgId,
  orgSlug,
  orgTen,
  active,
  isFounder = false,
  children,
}: Props) {
  const resolved = resolveCoSoQuanLySection(active);
  const isCaiDat = active === "cai-dat";
  const isTinNhan = active === "tin-nhan";

  return (
    <div className={`cso-ql${isTinNhan ? " cso-ql--tin-nhan" : ""}`}>
      <div className="cso-ql-inner">
        {!isTinNhan ? (
          <header className="cso-ql-header">
            <div>
              <Link
                href={`/co-so/${encodeURIComponent(orgSlug)}`}
                className="cso-ql-back"
              >
                <ArrowLeft size={14} strokeWidth={2.2} aria-hidden />
                {orgTen}
              </Link>
            </div>
          </header>
        ) : null}

        <nav className="cso-ql-nav" aria-label="Mục quản lý">
          {NAV_GROUPS.map((group, groupIndex) => (
            <div
              key={group.id}
              className={`cso-ql-nav-group${groupIndex > 0 ? " cso-ql-nav-group--sep" : ""}`}
            >
              <div className="cso-ql-nav-group-links">
                {group.items.map((tab) => {
                  const href = coSoQuanLyPath(orgSlug, tab.id);
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
              <CoSoTinNhanNavLink
                orgId={orgId}
                orgSlug={orgSlug}
                active={isTinNhan}
              />
              <TruongMilestoneTagNotify
                orgId={orgId}
                variant="nav"
                alwaysAvailable
              />
              {isFounder ? (
                <Link
                  href={coSoQuanLyPath(orgSlug, "cai-dat")}
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
