"use client";

import { useEffect, useState } from "react";

import {
  formatShopCountdown,
  formatShopMoLaiLuc,
  hasShopTamDongCountdown,
  isShopTamDongActive,
  shopTamDongRemainingMs,
  type ShopTamDongFields,
} from "@/lib/shop/tam-dong";

type Props = {
  shop: ShopTamDongFields | null | undefined;
  /** Gọi khi hết giờ đóng (mở lại). */
  onReopen?: () => void;
  className?: string;
  /** `banner` = thông báo catalog; `badge` = góc card sidebar (chỉ khi có countdown). */
  variant?: "banner" | "badge";
};

export function ShopTamDongOverlay({
  shop,
  onReopen,
  className = "",
  variant = "banner",
}: Props) {
  const [now, setNow] = useState(() => Date.now());
  const active = isShopTamDongActive(shop, now);
  const showCountdown = hasShopTamDongCountdown(shop, now);
  const remaining = shopTamDongRemainingMs(shop, now);

  useEffect(() => {
    if (!shop?.tamDong || !shop.tamDongDen) return;
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(tick);
  }, [shop?.tamDong, shop?.tamDongDen]);

  useEffect(() => {
    if (!shop?.tamDong) return;
    if (active) return;
    if (!shop.tamDongTu || !shop.tamDongDen) return;
    const den = Date.parse(shop.tamDongDen);
    if (!Number.isFinite(den) || Date.now() < den) return;
    onReopen?.();
  }, [active, shop, onReopen]);

  if (!active) return null;

  const lyDo = shop?.tamDongLyDo?.trim() || null;

  /* Badge sidebar: chỉ khi có ngày mở lại + countdown. */
  if (variant === "badge") {
    if (!showCountdown || !shop?.tamDongDen) return null;
    const countdown = formatShopCountdown(remaining);
    const moLai = formatShopMoLaiLuc(shop.tamDongDen);
    return (
      <span
        className={`j-shop-tam-dong-badge ${className}`.trim()}
        title={
          lyDo
            ? `Shop tạm đóng — ${lyDo}. Mở lại ${moLai}`
            : `Shop tạm đóng — mở lại ${moLai}`
        }
        aria-label={`Mở lại sau ${countdown}`}
      >
        <span className="j-shop-tam-dong-badge-count" aria-hidden>
          Mở lại {countdown}
        </span>
      </span>
    );
  }

  if (showCountdown && shop?.tamDongDen) {
    const countdown = formatShopCountdown(remaining);
    const moLai = formatShopMoLaiLuc(shop.tamDongDen);
    return (
      <div
        className={`j-shop-tam-dong-banner ${className}`.trim()}
        role="status"
        aria-live="polite"
      >
        <p className="j-shop-tam-dong-banner-text">
          Shop tạm đóng cửa, mở lại vào{" "}
          <time dateTime={shop.tamDongDen}>{moLai}</time>
        </p>
        {lyDo ? (
          <p className="j-shop-tam-dong-banner-ly-do">{lyDo}</p>
        ) : null}
        <p
          className="j-shop-tam-dong-banner-count"
          aria-label={`Còn ${countdown}`}
        >
          {countdown}
        </p>
      </div>
    );
  }

  return (
    <div
      className={`j-shop-tam-dong-banner ${className}`.trim()}
      role="status"
      aria-live="polite"
    >
      <p className="j-shop-tam-dong-banner-text">Shop tạm đóng cửa</p>
      {lyDo ? <p className="j-shop-tam-dong-banner-ly-do">{lyDo}</p> : null}
    </div>
  );
}
