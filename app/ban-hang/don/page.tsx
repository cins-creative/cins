import type { Metadata } from "next";

import { CinsShell } from "@/components/cins/CinsShell";
import { ShopDonClient } from "@/components/shop/ShopDonClient";
import { ShopReadyGate } from "@/components/shop/ShopReadyGate";

export const metadata: Metadata = {
  title: "Quản lý đơn hàng — CINs",
  robots: { index: false, follow: false },
};

export default function BanHangDonPage() {
  return (
    <CinsShell data-screen-label="Ban-hang-don">
      <ShopReadyGate allowWhenNotReady>
        <ShopDonClient />
      </ShopReadyGate>
    </CinsShell>
  );
}
