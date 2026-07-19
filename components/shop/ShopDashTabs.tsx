"use client";

import { ArrowLeft, ClipboardList, Package, Store } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

import { prefetchBanHangClientStatus } from "@/lib/shop/client-fetch-cache";
import { shopPublicHref } from "@/lib/shop/cua-hang-href";

type ShopDashTab = "kho" | "don" | "cua-hang";

const TAB_COPY: Record<ShopDashTab, { href: string; label: string }> = {
  kho: {
    href: "/ban-hang/kho",
    label: "Kho hàng",
  },
  don: {
    href: "/ban-hang/don",
    label: "Đơn hàng",
  },
  "cua-hang": {
    href: "/ban-hang/cua-hang",
    label: "Quản lý cửa hàng",
  },
};

function TabLink({
  href,
  label,
  active,
  icon,
}: {
  href: string;
  label: string;
  active: boolean;
  icon: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`shop-dash-tab${active ? " is-active" : ""}`}
      aria-current={active ? "page" : undefined}
      onMouseEnter={prefetchBanHangClientStatus}
      onFocus={prefetchBanHangClientStatus}
    >
      {icon}
      {label}
    </Link>
  );
}

export function ShopDashTabs({
  active,
  actions,
}: {
  active: ShopDashTab;
  actions?: ReactNode;
}) {
  const [shopHref, setShopHref] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/auth/session-profile", {
          cache: "no-store",
        });
        if (!res.ok) return;
        const json = (await res.json().catch(() => null)) as {
          profile?: { slug?: string | null } | null;
        } | null;
        const slug = json?.profile?.slug?.trim();
        if (!cancelled && slug) setShopHref(shopPublicHref(slug));
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <header className="shop-dash-head">
      <div className="shop-dash-head-row">
        {shopHref ? (
          <Link href={shopHref} className="shop-dash-back">
            <ArrowLeft size={16} strokeWidth={2.2} aria-hidden />
            Về cửa hàng
          </Link>
        ) : (
          <span className="shop-dash-back is-pending" aria-hidden>
            <ArrowLeft size={16} strokeWidth={2.2} />
            Về cửa hàng
          </span>
        )}
        <nav className="shop-dash-tabs" aria-label="Quản lý bán hàng">
          <TabLink
            href={TAB_COPY.kho.href}
            label={TAB_COPY.kho.label}
            active={active === "kho"}
            icon={<Package size={18} strokeWidth={2} aria-hidden />}
          />
          <TabLink
            href={TAB_COPY.don.href}
            label={TAB_COPY.don.label}
            active={active === "don"}
            icon={<ClipboardList size={18} strokeWidth={2} aria-hidden />}
          />
          <TabLink
            href={TAB_COPY["cua-hang"].href}
            label={TAB_COPY["cua-hang"].label}
            active={active === "cua-hang"}
            icon={<Store size={18} strokeWidth={2} aria-hidden />}
          />
        </nav>
        {actions ? (
          <div className="shop-dash-head-end">
            <div className="shop-dash-head-actions">{actions}</div>
          </div>
        ) : null}
      </div>
    </header>
  );
}
