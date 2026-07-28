import type { Metadata } from "next";

import { CinsShell } from "@/components/cins/CinsShell";
import { ShopBaoCaoClient } from "@/components/shop/ShopBaoCaoClient";
import { ShopReadyGate } from "@/components/shop/ShopReadyGate";

export const metadata: Metadata = {
  title: "Báo cáo doanh thu — CINs",
  robots: { index: false, follow: false },
};

export default function BanHangBaoCaoPage() {
  return (
    <CinsShell data-screen-label="Ban-hang-bao-cao">
      <ShopReadyGate allowWhenNotReady>
        <ShopBaoCaoClient />
      </ShopReadyGate>
    </CinsShell>
  );
}
