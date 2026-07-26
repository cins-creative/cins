import type { Metadata } from "next";

import { CinsShell } from "@/components/cins/CinsShell";
import { ShopReadyGate } from "@/components/shop/ShopReadyGate";
import { ShopSuKienClient } from "@/components/shop/ShopSuKienClient";

export const metadata: Metadata = {
  title: "Sự kiện — Bán hàng — CINs",
  robots: { index: false, follow: false },
};

export default function BanHangSuKienPage() {
  return (
    <CinsShell data-screen-label="Ban-hang-su-kien">
      <ShopReadyGate allowWhenNotReady>
        <ShopSuKienClient />
      </ShopReadyGate>
    </CinsShell>
  );
}
