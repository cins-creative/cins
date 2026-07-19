import type { Metadata } from "next";

import { CinsShell } from "@/components/cins/CinsShell";
import { ShopCuaHangClient } from "@/components/shop/ShopCuaHangClient";

export const metadata: Metadata = {
  title: "Quản lý cửa hàng — CINs",
  robots: { index: false, follow: false },
};

export default function BanHangCuaHangPage() {
  return (
    <CinsShell data-screen-label="Ban-hang-cua-hang">
      <ShopCuaHangClient />
    </CinsShell>
  );
}
