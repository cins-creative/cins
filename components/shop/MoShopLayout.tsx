"use client";

import Link from "next/link";
import { Receipt } from "lucide-react";
import { useState } from "react";

import { MoShopForm } from "@/components/shop/MoShopForm";
import type { ShopDangKyMoSlotStatus } from "@/lib/shop/dang-ky-mo-types";

type Props = {
  initialGt: string;
  initialTu: string;
  phiTyLePercent: number;
  initialSlots: ShopDangKyMoSlotStatus;
};

export function MoShopLayout({
  initialGt,
  initialTu,
  phiTyLePercent,
  initialSlots,
}: Props) {
  const [slotsRemaining, setSlotsRemaining] = useState(initialSlots.remaining);

  return (
    <div className="mo-shop-layout">
      <aside className="mo-shop-aside">
        <header className="mo-shop-intro">
          <p className="mo-shop-kicker">Mở shop · CINs dựng hộ</p>
          <h1 className="mo-shop-title">
            Gửi link hàng, CINs lo phần còn lại
          </h1>
          <p className="mo-shop-sub">
            Form ~2 phút. Chi tiết shop, ảnh, giá — trao đổi qua inbox như bạn
            vẫn hay làm.
          </p>
        </header>

        <div
          className={`mo-shop-slot${slotsRemaining <= 0 ? " is-full" : ""}${
            slotsRemaining > 0 && slotsRemaining <= 5 ? " is-low" : ""
          }`}
          role="status"
        >
          <p className="mo-shop-slot-label">Suất đăng ký</p>
          <p className="mo-shop-slot-value">
            Còn <strong>{slotsRemaining}</strong>
            <span className="mo-shop-slot-total">/{initialSlots.limit}</span>
          </p>
        </div>

        <h2 className="mo-shop-aside-heading">
          <Receipt size={15} strokeWidth={2.1} aria-hidden />
          Thông tin nhanh
        </h2>
        <dl className="mo-shop-facts">
          <div>
            <dt>Phí nền tảng</dt>
            <dd>{phiTyLePercent}%</dd>
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
        <MoShopForm
          initialGt={initialGt}
          initialTu={initialTu}
          slotsRemaining={slotsRemaining}
          slotsLimit={initialSlots.limit}
          onSubmitted={() =>
            setSlotsRemaining((prev) => Math.max(0, prev - 1))
          }
        />
      </div>
    </div>
  );
}

export function MoShopFoot() {
  return (
    <nav className="mo-shop-foot" aria-label="Liên kết phụ">
      <Link href="/chinh-sach/phi-san">Chính sách phí</Link>
      <Link href="/termandservice">Điều khoản</Link>
      <Link href="/ho-tro">Trợ giúp</Link>
    </nav>
  );
}
