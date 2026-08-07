"use client";

import Link from "next/link";

type Props = {
  active: "combo" | "voucher";
};

export function ShopUuDaiSubTabs({ active }: Props) {
  return (
    <nav className="shop-dash-subtabs" aria-label="Combo và voucher">
      <Link
        href="/ban-hang/uu-dai/combo"
        className={`shop-dash-subtab${active === "combo" ? " is-active" : ""}`}
        aria-current={active === "combo" ? "page" : undefined}
      >
        Combo & discount
      </Link>
      <Link
        href="/ban-hang/uu-dai/voucher"
        className={`shop-dash-subtab${active === "voucher" ? " is-active" : ""}`}
        aria-current={active === "voucher" ? "page" : undefined}
      >
        Voucher toàn shop
      </Link>
    </nav>
  );
}
