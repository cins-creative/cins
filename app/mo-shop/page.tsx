import type { Metadata } from "next";

import { MoShopBodyFlat } from "@/components/shop/MoShopBodyFlat";
import { MoShopFoot, MoShopLayout } from "@/components/shop/MoShopLayout";
import { CinsShell } from "@/components/cins/CinsShell";
import { getPhiDangApDungShop } from "@/lib/billing/phi-chinh-sach";
import { getShopDangKyMoSlotStatus } from "@/lib/shop/dang-ky-mo-slots";

import "@/app/mo-shop/mo-shop.css";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function oneParam(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return (v[0] ?? "").trim();
  return (v ?? "").trim();
}

function buildDesc(tyLePercent: number): string {
  return `Gửi link hàng — CINs dựng shop hộ bạn. ${tyLePercent}% phí nền tảng, tiền khách chuyển thẳng STK của bạn, shop chỉ public sau khi bạn duyệt.`;
}

export async function generateMetadata(): Promise<Metadata> {
  const phi = await getPhiDangApDungShop();
  const title = "CINs dựng shop hộ bạn";
  const description = buildDesc(phi.tyLePercent);
  return {
    title: `${title} | CINs`,
    description,
    alternates: { canonical: "/mo-shop" },
    openGraph: {
      type: "website",
      siteName: "CINs",
      locale: "vi_VN",
      url: "/mo-shop",
      title,
      description,
      images: [{ url: "/mo-shop/opengraph-image", alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/mo-shop/opengraph-image"],
    },
  };
}

export default async function MoShopPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const gt = oneParam(sp.gt).slice(0, 120);
  const tu = oneParam(sp.tu).slice(0, 80);

  const phi = await getPhiDangApDungShop();
  const slots = await getShopDangKyMoSlotStatus();

  return (
    <CinsShell className="cins-shell--mo-shop" data-screen-label="Mo-shop">
      <MoShopBodyFlat>
        <div className="mo-shop-page">
          <MoShopLayout
            initialGt={gt}
            initialTu={tu}
            phiTyLePercent={phi.tyLePercent}
            initialSlots={slots}
          />

          <MoShopFoot />
        </div>
      </MoShopBodyFlat>
    </CinsShell>
  );
}
