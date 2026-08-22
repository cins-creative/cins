"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import {
  ShopDashTabs,
  type ShopDashTab,
} from "@/components/shop/ShopDashTabs";
import { ShopPhiGateBanner } from "@/components/shop/ShopPhiGateBanner";

import "./shop-dashboard.css";

function tabFromPath(pathname: string): ShopDashTab {
  const rest = pathname.startsWith("/shop/")
    ? pathname.split("/").slice(3).join("/")
    : pathname.replace(/^\/seller\/?/, "");
  if (rest.startsWith("orders")) return "don";
  if (rest.startsWith("events")) return "su-kien";
  if (rest.startsWith("store")) return "cua-hang";
  if (rest.startsWith("reports")) return "bao-cao";
  if (rest.startsWith("promotions")) return "uu-dai";
  return "kho";
}

/**
 * Khung `.shop-dash` chung — 1 hàng tab sticky.
 * `CinsShell` phải bọc ngoài ở Server Component (layout), không import ở đây.
 */
export function BanHangShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/seller/inventory";
  const active = tabFromPath(pathname);

  return (
    <div className="shop-dash">
      <ShopDashTabs active={active} />
      <ShopPhiGateBanner />
      <div className="shop-dash-body">{children}</div>
    </div>
  );
}
