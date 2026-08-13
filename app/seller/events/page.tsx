import type { Metadata } from "next";

import { ShopReadyGate } from "@/components/shop/ShopReadyGate";
import { ShopSuKienClient } from "@/components/shop/ShopSuKienClient";

export const metadata: Metadata = {
  title: "Sự kiện — Bán hàng — CINs",
  robots: { index: false, follow: false },
};

export default function BanHangSuKienPage() {
  return (
    <ShopReadyGate allowWhenNotReady>
      <ShopSuKienClient />
    </ShopReadyGate>
  );
}
