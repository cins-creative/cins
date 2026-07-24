"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  shopName: string;
  shopMoTa: string | null;
  shopAvatarUrl: string | null;
  shopCoverUrl: string | null;
  initials: string;
  actions?: ReactNode;
  /** Chủ shop — link «← Trang cá nhân» dưới avatar (chỉ storefront `/shop`). */
  ownerSlug?: string | null;
  /** Bật trên mặt tiền cửa hàng; tắt trên trang loại hàng. */
  showBackProfile?: boolean;
};

/** Cover + avatar + tên cửa hàng — dùng chung storefront & trang loại hàng. */
export function JourneyShopSfHero({
  shopName,
  shopMoTa,
  shopAvatarUrl,
  shopCoverUrl,
  initials,
  actions,
  ownerSlug = null,
  showBackProfile = false,
}: Props) {
  const ownerSlugTrim = ownerSlug?.trim() || null;
  const profileHref =
    showBackProfile && ownerSlugTrim
      ? `/${encodeURIComponent(ownerSlugTrim)}?view=journey`
      : null;

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
        <div className="j-shop-sf-identity">
          <div className="j-shop-sf-avatar" aria-hidden>
            {shopAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={shopAvatarUrl} alt="" />
            ) : (
              <span>{initials}</span>
            )}
          </div>
          {profileHref ? (
            <Link href={profileHref} className="j-shop-sf-back-profile">
              <ChevronLeft size={16} strokeWidth={2} aria-hidden />
              Trang cá nhân
            </Link>
          ) : null}
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
