"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

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

export function SidebarOrgFlyout({
  kind,
  children,
}: {
  kind: OrgFlyoutKind;
  children: ReactNode;
}) {
  const cfg = KIND_CONFIG[kind];
  const liRef = useRef<HTMLLIElement>(null);
  const closeTimer = useRef<number | undefined>(undefined);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [orgs, setOrgs] = useState<MyOrg[] | null>(null);

  useEffect(() => setMounted(true), []);
  useEffect(
    () => () => {
      if (closeTimer.current) window.clearTimeout(closeTimer.current);
    },
    [],
  );

  const openFlyout = useCallback(() => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    const li = liRef.current;
    if (li) {
      const r = li.getBoundingClientRect();
      // Sidebar mở rộng 64px → 240px khi hover; neo panel theo mép phải mở
      // rộng (clamp 240) để không đặt panel đè lên sidebar lúc đang animate.
      const sidebar = document.getElementById("app-sidebar");
      const sidebarRight = sidebar
        ? sidebar.getBoundingClientRect().right
        : r.right;
      const left = Math.round(Math.max(sidebarRight, 240) + 8);
      const top = Math.max(12, Math.min(r.top - 6, window.innerHeight - 360));
      setPos({ top, left });
    }
    setOpen(true);
    if (orgs === null) void loadMyOrgs().then(setOrgs);
  }, [orgs]);

  const scheduleClose = useCallback(() => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpen(false), 160);
  }, []);

  const items = orgs?.filter((o) => cfg.types.includes(o.loaiToChuc)) ?? null;

  return (
    <li
      ref={liRef}
      className="sb-li-flyout"
      onMouseEnter={openFlyout}
      onMouseLeave={scheduleClose}
      onFocus={openFlyout}
      onBlur={scheduleClose}
    >
      {children}
      {mounted && open && pos
        ? createPortal(
            <div
              className="sb-flyout"
              style={{ top: pos.top, left: pos.left }}
              onMouseEnter={openFlyout}
              onMouseLeave={scheduleClose}
              role="menu"
            >
              <div className="sb-flyout-title">{cfg.title}</div>
              <div className="sb-flyout-body">
                {items === null ? (
                  <div className="sb-flyout-loading">
                    <span className="sb-flyout-spin" aria-hidden />
                    Đang tải…
                  </div>
                ) : items.length === 0 ? (
                  <div className="sb-flyout-empty">{cfg.emptyText}</div>
                ) : (
                  <ul className="sb-flyout-list">
                    {items.map((o) => (
                      <li key={o.id}>
                        <Link
                          href={o.href ?? "#"}
                          className="sb-flyout-item"
                          role="menuitem"
                        >
                          <span className="sb-flyout-ava" aria-hidden>
                            {o.avatarUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={o.avatarUrl} alt="" />
                            ) : (
                              <span className="sb-flyout-ava-txt">
                                {getNameInitials(o.ten, o.slug)}
                              </span>
                            )}
                          </span>
                          <span className="sb-flyout-meta">
                            <span className="sb-flyout-name">{o.ten}</span>
                            <span className="sb-flyout-role">
                              {o.vaiTroLabel}
                            </span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <Link href={cfg.createHref} className="sb-flyout-create">
                <Plus size={15} strokeWidth={2.2} aria-hidden />
                {cfg.createLabel}
              </Link>
            </div>,
            document.body,
          )
        : null}
    </li>
  );
}
