import type { Metadata } from "next";

import { ShopDonClient } from "@/components/shop/ShopDonClient";
import { ShopReadyGate } from "@/components/shop/ShopReadyGate";

export const metadata: Metadata = {
  title: "Quản lý đơn hàng — CINs",
  robots: { index: false, follow: false },
};

export default function BanHangDonPage() {
  return (
    <ShopReadyGate allowWhenNotReady>
      <ShopDonClient />
    </ShopReadyGate>
  );
}
