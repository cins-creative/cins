"use client";

import type { ReactNode } from "react";

type Props = {
  shopName: string;
  shopMoTa: string | null;
  shopAvatarUrl: string | null;
  shopCoverUrl: string | null;
  initials: string;
  actions?: ReactNode;
};

/** Cover + avatar + tên cửa hàng — dùng chung storefront & trang loại hàng. */
export function JourneyShopSfHero({
  shopName,
  shopMoTa,
  shopAvatarUrl,
  shopCoverUrl,
  initials,
  actions,
}: Props) {
  return (
    <header className="j-shop-sf-hero">
      <div
        className={`j-shop-sf-cover${shopCoverUrl ? " has-img" : ""}`}
        style={
          shopCoverUrl
            ? { backgroundImage: `url(${shopCoverUrl})` }
            : undefined
        }
        aria-hidden
      />
      <div className="j-shop-sf-hero-body">
        <div className="j-shop-sf-avatar" aria-hidden>
          {shopAvatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shopAvatarUrl} alt="" />
          ) : (
            <span>{initials}</span>
          )}
        </div>
        <div className="j-shop-sf-hero-main">
          <div className="j-shop-sf-hero-copy">
            <h2>{shopName}</h2>
            {shopMoTa ? <p>{shopMoTa}</p> : null}
          </div>
        </div>
        {actions}
      </div>
    </header>
  );
}
