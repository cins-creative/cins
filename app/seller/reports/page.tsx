import type { Metadata } from "next";

import { ShopBaoCaoClient } from "@/components/shop/ShopBaoCaoClient";
import { ShopReadyGate } from "@/components/shop/ShopReadyGate";

export const metadata: Metadata = {
  title: "Báo cáo doanh thu — CINs",
  robots: { index: false, follow: false },
};

export default function BanHangBaoCaoPage() {
  return (
    <ShopReadyGate allowWhenNotReady>
      <ShopBaoCaoClient />
    </ShopReadyGate>
  );
}
