import type { Metadata } from "next";

import { ShopComposeProvider } from "@/components/shop/ShopComposeProvider";
import { ShopKhoClient } from "@/components/shop/ShopKhoClient";
import { ShopReadyGate } from "@/components/shop/ShopReadyGate";

export const metadata: Metadata = {
  title: "Quản lý kho hàng — CINs",
  robots: { index: false, follow: false },
};

export default function BanHangKhoPage() {
  return (
    <ShopReadyGate>
      <ShopComposeProvider>
        <ShopKhoClient />
      </ShopComposeProvider>
    </ShopReadyGate>
  );
}
