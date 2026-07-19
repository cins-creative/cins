"use client";

import { Loader2, Store } from "lucide-react";
import Link from "next/link";

import { useShopReadyGate } from "@/lib/shop/use-shop-ready-gate";

import "./shop-dashboard.css";

type Props = {
  children: React.ReactNode;
  /** Cho phép xem trang khi chưa ready (vd. đơn đã có). Mặc định: chặn. */
  allowWhenNotReady?: boolean;
};

/**
 * Bọc trang /ban-hang/* — chưa sẵn sàng Shop thì hiện màn thiết lập.
 * `allowWhenNotReady`: vẫn render children (đơn) kèm banner.
 */
export function ShopReadyGate({
  children,
  allowWhenNotReady = false,
}: Props) {
  const { loading, enabled, shopReady, shopSetupHref, err } =
    useShopReadyGate();

  if (loading) {
    return (
      <div className="shop-dash-loading" aria-busy="true">
        <Loader2 size={20} className="shop-spin" aria-hidden />
        Đang tải…
      </div>
    );
  }

  if (!enabled) {
    return (
      <div className="shop-dash">
        <h1>Bán hàng</h1>
        <p>
          Chức năng bán hàng đang tắt. Bật trong{" "}
          <strong>Cài đặt tài khoản → Bán hàng</strong>.
        </p>
        <p>
          <Link href="/">Về trang chủ</Link>
        </p>
      </div>
    );
  }

  if (!shopReady && !allowWhenNotReady) {
    const href = shopSetupHref || "/ban-hang/cua-hang";
    return (
      <div className="shop-dash">
        {err ? <p className="shop-dash-err">{err}</p> : null}
        <section className="shop-dash-intro" aria-labelledby="shop-gate-title">
          <div className="shop-dash-intro-ico" aria-hidden>
            <Store size={28} strokeWidth={1.8} />
          </div>
          <h2 id="shop-gate-title" className="shop-dash-intro-title">
            Thiết lập Shop trước khi quản lý kho
          </h2>
          <p className="shop-dash-intro-lead">
            Cần thêm tài khoản nhận tiền (STK) trước khi thêm sản phẩm, gắn hàng
            lên bài hoặc nhận đơn.
          </p>
          <div className="shop-dash-intro-cta">
            <Link href={href} className="shop-dash-intro-cta-btn">
              <Store size={18} strokeWidth={2.2} aria-hidden />
              Quản lý cửa hàng
            </Link>
          </div>
        </section>
      </div>
    );
  }

  if (!shopReady && allowWhenNotReady) {
    const href = shopSetupHref || "/ban-hang/cua-hang";
    return (
      <>
        <div className="shop-dash-ready-banner" role="status">
          <span>
            Shop chưa có tài khoản nhận tiền — đơn cũ vẫn xem được, nhưng chưa
            nhận đơn mới / thêm hàng.
          </span>
          <Link href={href} className="shop-dash-ready-banner-link">
            Thiết lập Shop
          </Link>
        </div>
        {children}
      </>
    );
  }

  return <>{children}</>;
}
