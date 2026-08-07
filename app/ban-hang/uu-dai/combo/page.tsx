import type { Metadata } from "next";

import { ShopReadyGate } from "@/components/shop/ShopReadyGate";
import { ShopUuDaiComboClient } from "@/components/shop/ShopUuDaiComboClient";
import { ShopUuDaiSubTabs } from "@/components/shop/ShopUuDaiSubTabs";

export const metadata: Metadata = {
  title: "Combo & discount — CINs",
  robots: { index: false, follow: false },
};

export default function BanHangUuDaiComboPage() {
  return (
    <ShopReadyGate>
      <ShopUuDaiSubTabs active="combo" />
      <ShopUuDaiComboClient />
    </ShopReadyGate>
  );
}
