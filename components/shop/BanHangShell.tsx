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
  if (pathname.includes("/ban-hang/don")) return "don";
  if (pathname.includes("/ban-hang/su-kien")) return "su-kien";
  if (pathname.includes("/ban-hang/cua-hang")) return "cua-hang";
  if (pathname.includes("/ban-hang/bao-cao")) return "bao-cao";
  return "kho";
}

/**
 * Khung `.shop-dash` chung — 1 hàng tab sticky.
 * `CinsShell` phải bọc ngoài ở Server Component (layout), không import ở đây.
 */
export function BanHangShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/ban-hang/kho";
  const active = tabFromPath(pathname);

  return (
    <div className="shop-dash">
      <ShopDashTabs active={active} />
      <ShopPhiGateBanner />
      <div className="shop-dash-body">{children}</div>
    </div>
  );
}
