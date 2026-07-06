"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";

import { SidebarNavIcon } from "@/components/cins/SidebarNavIcon";
import { getNameInitials } from "@/lib/journey/profile";
import type { MainNavItem } from "@/lib/cins/mainNav";

export type OrgFlyoutKind = "education" | "community" | "studio";

type MyOrg = {
  id: string;
  slug: string;
  ten: string;
  loaiToChuc: string;
  loaiLabel: string;
  avatarUrl: string | null;
  href: string | null;
  vaiTro: string;
  vaiTroLabel: string;
};

const KIND_CONFIG: Record<
  OrgFlyoutKind,
  {
    types: readonly string[];
    title: string;
    emptyText: string;
    createHref: string;
    createLabel: string;
  }
> = {
  education: {
    types: ["co_so_dao_tao", "truong_dai_hoc"],
    title: "Tổ chức giáo dục của bạn",
    emptyText: "Bạn chưa quản lý cơ sở đào tạo nào.",
    createHref: "/tao-to-chuc/co-so",
    createLabel: "Tạo cơ sở đào tạo",
  },
  community: {
    types: ["cong_dong"],
    title: "Cộng đồng của bạn",
    emptyText: "Bạn chưa tham gia cộng đồng nào.",
    createHref: "/cong-dong/tao",
    createLabel: "Tạo cộng đồng",
  },
  studio: {
    types: ["studio", "doanh_nghiep"],
    title: "Studio của bạn",
    emptyText: "Bạn chưa có studio nào.",
    createHref: "/tao-to-chuc/studio",
    createLabel: "Tạo studio",
  },
};

let orgsCache: Promise<MyOrg[]> | null = null;

function loadMyOrgs(): Promise<MyOrg[]> {
  if (!orgsCache) {
    orgsCache = fetch("/api/me/organizations", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : { orgs: [] }))
      .then((d: { orgs?: MyOrg[] }) => (Array.isArray(d.orgs) ? d.orgs : []))
      .catch(() => [] as MyOrg[]);
  }
  return orgsCache;
}

/**
 * Mục sidebar có danh sách tổ chức — xổ inline (accordion) ngay dưới mục.
 * Có org → nhãn/icon link tới hub listing; mũi tên thu/mở danh sách org.
 * Chưa có org → hàng chính link tới hub như nav thường.
 */
export function SidebarOrgFlyout({
  kind,
  item,
  pathname,
}: {
  kind: OrgFlyoutKind;
  item: MainNavItem;
  pathname: string;
}) {
  const cfg = KIND_CONFIG[kind];
  const [orgs, setOrgs] = useState<MyOrg[] | null>(null);
  /** Mặc định xổ — bấm hàng chính hoặc mũi tên để thu lại. */
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    let alive = true;
    void loadMyOrgs().then((list) => {
      if (alive) setOrgs(list);
    });
    return () => {
      alive = false;
    };
  }, []);

  const items = orgs?.filter((o) => cfg.types.includes(o.loaiToChuc)) ?? null;
  const hasItems = (items?.length ?? 0) > 0;
  const open = hasItems && expanded;
  const active = item.isActive(pathname);

  const liClass = [
    "sb-li-flyout",
    hasItems ? "has-items" : "",
    open ? "is-open" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <li className={liClass}>
      <span className="sb-flyout-anchor">
        {hasItems ? (
          <div
            className={`sb-item sb-item--flyout${active ? " active" : ""}`}
          >
            <Link
              href={item.href}
              className="sb-flyout-main"
              data-tip={item.tip}
              aria-current={active ? "page" : undefined}
            >
              <span className="sb-ico">
                <SidebarNavIcon name={item.icon} />
              </span>
              <span className="sb-label">{item.label}</span>
            </Link>
            <button
              type="button"
              className="sb-flyout-toggle"
              aria-expanded={expanded}
              aria-label={
                expanded
                  ? `${item.label} — thu gọn danh sách`
                  : `${item.label} — mở rộng danh sách`
              }
              onClick={() => setExpanded((v) => !v)}
            >
              <ChevronDown
                className="sb-flyout-caret"
                size={15}
                strokeWidth={2.2}
                aria-hidden
              />
            </button>
          </div>
        ) : (
          <Link
            href={item.href}
            className={`sb-item${active ? " active" : ""}`}
            data-tip={item.tip}
            aria-current={active ? "page" : undefined}
          >
            <span className="sb-ico">
              <SidebarNavIcon name={item.icon} />
            </span>
            <span className="sb-label">{item.label}</span>
          </Link>
        )}
      </span>

      <div className={`sb-sublist-wrap${open ? " is-open" : ""}`}>
        <div className="sb-sublist-inner">
          <ul className="sb-sublist" role="menu">
            {items && items.length > 0
              ? items.map((o) => (
                  <li key={o.id}>
                    <Link
                      href={o.href ?? "#"}
                      className="sb-subitem"
                      role="menuitem"
                    >
                      <span className="sb-subitem-ava" aria-hidden>
                        {o.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={o.avatarUrl} alt="" />
                        ) : (
                          <span className="sb-subitem-ava-txt">
                            {getNameInitials(o.ten, o.slug)}
                          </span>
                        )}
                      </span>
                      <span className="sb-subitem-meta">
                        <span className="sb-subitem-name">{o.ten}</span>
                        <span className="sb-subitem-role">{o.vaiTroLabel}</span>
                      </span>
                    </Link>
                  </li>
                ))
              : null}
          </ul>
        </div>
      </div>
    </li>
  );
}
