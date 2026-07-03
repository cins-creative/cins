"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { getNameInitials } from "@/lib/journey/profile";

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
 * Mục sidebar có danh sách tổ chức của người dùng — **xổ inline** ngay dưới mục
 * (accordion). Danh sách org tải ngay khi mount; nếu có tổ chức thì xổ sẵn
 * (mặc định mở) và hiện mũi tên, còn chưa có tổ chức thì không xổ / không mũi tên.
 * (Vẫn bị thu gọn theo CSS khi sidebar ở dạng rail chưa hover.)
 */
export function SidebarOrgFlyout({
  kind,
  children,
}: {
  kind: OrgFlyoutKind;
  children: ReactNode;
}) {
  const cfg = KIND_CONFIG[kind];
  const [orgs, setOrgs] = useState<MyOrg[] | null>(null);

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
  // Xổ sẵn khi đã có tổ chức. Chưa có org → không xổ, cũng không hiện mũi tên.
  const open = hasItems;

  return (
    <li className={`sb-li-flyout${open ? " is-open" : ""}`}>
      <span className="sb-flyout-anchor">
        {children}
        {hasItems ? (
          <ChevronDown
            className="sb-flyout-caret"
            size={15}
            strokeWidth={2.2}
            aria-hidden
          />
        ) : null}
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
