import type { Metadata } from "next";

import { ShopComposeProvider } from "@/components/shop/ShopComposeProvider";
import { ShopKhoClient } from "@/components/shop/ShopKhoClient";
import { ShopReadyGate } from "@/components/shop/ShopReadyGate";

export const metadata: Metadata = {
  title: "Quản lý kho hàng — CINs",
  robots: { index: false, follow: false },
};

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function BanHangKhoLoaiPage({ params }: Props) {
  const { slug } = await params;
  return (
    <ShopReadyGate>
      <ShopComposeProvider>
        <ShopKhoClient initialLoaiSlug={slug} />
      </ShopComposeProvider>
    </ShopReadyGate>
  );
}
