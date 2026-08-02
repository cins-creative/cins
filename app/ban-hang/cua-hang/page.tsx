import type { Metadata } from "next";

import { ShopCuaHangClient } from "@/components/shop/ShopCuaHangClient";

export const metadata: Metadata = {
  title: "Quản lý cửa hàng — CINs",
  robots: { index: false, follow: false },
};

export default function BanHangCuaHangPage() {
  return <ShopCuaHangClient />;
}
