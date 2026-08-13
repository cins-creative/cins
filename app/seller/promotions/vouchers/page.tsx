import type { Metadata } from "next";

import { ShopReadyGate } from "@/components/shop/ShopReadyGate";
import { ShopUuDaiSubTabs } from "@/components/shop/ShopUuDaiSubTabs";
import { ShopUuDaiVoucherClient } from "@/components/shop/ShopUuDaiVoucherClient";

export const metadata: Metadata = {
  title: "Voucher — CINs",
  robots: { index: false, follow: false },
};

export default function BanHangUuDaiVoucherPage() {
  return (
    <ShopReadyGate>
      <ShopUuDaiSubTabs active="voucher" />
      <ShopUuDaiVoucherClient />
    </ShopReadyGate>
  );
}
