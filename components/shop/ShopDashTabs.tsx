"use client";

import { ClipboardList, Package } from "lucide-react";
import Link from "next/link";

type ShopDashTab = "kho" | "don";

const TAB_COPY: Record<
  ShopDashTab,
  { href: string; label: string; hint: string }
> = {
  kho: {
    href: "/ban-hang/kho",
    label: "Kho hàng",
    hint: "Thêm sản phẩm, tồn kho và bảng giá theo ngữ cảnh sự kiện.",
  },
  don: {
    href: "/ban-hang/don",
    label: "Đơn hàng",
    hint: "CINs không trung gian tiền — bạn tự xác nhận khi đã nhận tiền hoặc đã giao tại sự kiện.",
  },
};

export function ShopDashTabs({ active }: { active: ShopDashTab }) {
  return (
    <header className="shop-dash-head">
      <nav className="shop-dash-tabs" aria-label="Quản lý bán hàng">
        <Link
          href={TAB_COPY.kho.href}
          className={`shop-dash-tab${active === "kho" ? " is-active" : ""}`}
          aria-current={active === "kho" ? "page" : undefined}
        >
          <Package size={18} strokeWidth={2} aria-hidden />
          {TAB_COPY.kho.label}
        </Link>
        <Link
          href={TAB_COPY.don.href}
          className={`shop-dash-tab${active === "don" ? " is-active" : ""}`}
          aria-current={active === "don" ? "page" : undefined}
        >
          <ClipboardList size={18} strokeWidth={2} aria-hidden />
          {TAB_COPY.don.label}
        </Link>
      </nav>
      <p className="shop-dash-sub">{TAB_COPY[active].hint}</p>
    </header>
  );
}
