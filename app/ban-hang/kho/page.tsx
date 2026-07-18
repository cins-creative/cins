import type { Metadata } from "next";

import { CinsShell } from "@/components/cins/CinsShell";
import { ShopKhoClient } from "@/components/shop/ShopKhoClient";

export const metadata: Metadata = {
  title: "Quản lý kho hàng — CINs",
  robots: { index: false, follow: false },
};

export default function BanHangKhoPage() {
  return (
    <CinsShell data-screen-label="Ban-hang-kho">
      <ShopKhoClient />
    </CinsShell>
  );
}
