import type { Metadata } from "next";
import Link from "next/link";
import { Receipt } from "lucide-react";

import { MoShopForm } from "@/components/shop/MoShopForm";
import { MoShopBodyFlat } from "@/components/shop/MoShopBodyFlat";
import { CinsShell } from "@/components/cins/CinsShell";
import { getPhiDangApDungShop } from "@/lib/billing/phi-chinh-sach";

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

  return (
    <CinsShell className="cins-shell--mo-shop" data-screen-label="Mo-shop">
      <MoShopBodyFlat>
        <div className="mo-shop-page">
          <div className="mo-shop-layout">
            <aside className="mo-shop-aside">
              <header className="mo-shop-intro">
                <p className="mo-shop-kicker">Mở shop · CINs dựng hộ</p>
                <h1 className="mo-shop-title">
                  Gửi link hàng, CINs lo phần còn lại
                </h1>
                <p className="mo-shop-sub">
                  Form ~2 phút. Chi tiết shop, ảnh, giá — trao đổi qua inbox
                  như bạn vẫn hay làm.
                </p>
              </header>

              <h2 className="mo-shop-aside-heading">
                <Receipt size={15} strokeWidth={2.1} aria-hidden />
                Thông tin nhanh
              </h2>
              <dl className="mo-shop-facts">
                <div>
                  <dt>Phí nền tảng</dt>
                  <dd>{phi.tyLePercent}%</dd>
                </div>
                <div>
                  <dt>Thanh toán</dt>
                  <dd>Khách chuyển thẳng STK bạn</dd>
                </div>
                <div>
                  <dt>Quyền sở hữu</dt>
                  <dd>Shop thuộc bạn; duyệt xong mới public</dd>
                </div>
              </dl>
            </aside>

            <div className="mo-shop-main">
              <MoShopForm initialGt={gt} initialTu={tu} />
            </div>
          </div>

          <nav className="mo-shop-foot" aria-label="Liên kết phụ">
            <Link href="/chinh-sach/phi-san">Chính sách phí</Link>
            <Link href="/termandservice">Điều khoản</Link>
            <Link href="/ho-tro">Trợ giúp</Link>
          </nav>
        </div>
      </MoShopBodyFlat>
    </CinsShell>
  );
}
