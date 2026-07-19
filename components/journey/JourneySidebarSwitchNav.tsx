"use client";

import {
  Building2,
  Grid3X3,
  Store,
  UserRound,
  Waypoints,
} from "lucide-react";
import { useEffect, useState } from "react";

import type { JourneyProfileView } from "@/components/journey/JourneySidebar";
import {
  journeyHrefForView,
  useJourneyView,
} from "@/components/journey/JourneyViewContext";
import {
  prefetchJourneyFriendsView,
  prefetchJourneyGalleryView,
  prefetchJourneyOrganizationsView,
  prefetchJourneyShopView,
} from "@/components/journey/journey-profile-lazy-views";
import type { ShopCuaHang } from "@/lib/shop/types";
import {
  fetchShopCuaHangClient,
  prefetchShopCuaHangClient,
} from "@/lib/shop/client-fetch-cache";

type Props = {
  slug: string;
  friendCount?: number;
  orgCount?: number;
  /** Hiện nút Shop khi chủ đã bật bán hàng (hoặc chính chủ đang xem). */
  showShop?: boolean;
};

export function JourneySidebarSwitchNav({
  slug,
  friendCount,
  orgCount,
  showShop = false,
}: Props) {
  const { view: activeView, setView } = useJourneyView();

  return (
    <div className="j-profile-switch-stack">
      {showShop ? (
        <ShopSwitchCard
          slug={slug}
          active={activeView === "shop"}
          onSelect={() => {
            if (activeView !== "shop") setView("shop");
          }}
        />
      ) : null}

      <nav className="j-profile-switch" aria-label="Chuyển giao diện hồ sơ">
        <ProfileFeedToggle
          slug={slug}
          activeView={activeView}
          onSelect={setView}
        />
        <ProfileSwitchButton
          slug={slug}
          view="friends"
          activeView={activeView}
          onSelect={setView}
          onPrefetch={prefetchJourneyFriendsView}
          icon={<UserRound size={15} aria-hidden />}
          label="Friends"
          count={friendCount}
        />
        <ProfileSwitchButton
          slug={slug}
          view="organizations"
          activeView={activeView}
          onSelect={setView}
          onPrefetch={prefetchJourneyOrganizationsView}
          icon={<Building2 size={15} aria-hidden />}
          label="Tổ chức"
          count={orgCount}
        />
      </nav>
    </div>
  );
}

function ShopSwitchCard({
  slug,
  active,
  onSelect,
}: {
  slug: string;
  active: boolean;
  onSelect: () => void;
}) {
  const [shop, setShop] = useState<ShopCuaHang | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await fetchShopCuaHangClient({ slug });
        if (!cancelled) setShop(data.shop);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    const onShop = (event: Event) => {
      const detail = (
        event as CustomEvent<{ shop?: ShopCuaHang | null }>
      ).detail;
      if (detail?.shop !== undefined) setShop(detail.shop);
    };
    window.addEventListener("cins:shop-profile-changed", onShop);
    return () =>
      window.removeEventListener("cins:shop-profile-changed", onShop);
  }, []);

  const shopName = shop?.ten?.trim() || null;
  const href = journeyHrefForView(slug, "shop");
  const faceClass = [
    "j-profile-shop-switch-btn",
    active ? "is-active" : "",
  ]
    .filter(Boolean)
    .join(" ");

  function warmShop() {
    prefetchJourneyShopView();
    prefetchShopCuaHangClient(slug);
  }

  return (
    <nav className="j-profile-shop-switch" aria-label="Cửa hàng">
      <a
        href={href}
        className={faceClass}
        aria-current={active ? "page" : undefined}
        aria-label={shopName ? `Shop ${shopName}` : "Shop"}
        onMouseEnter={warmShop}
        onFocus={warmShop}
        onClick={(event) => {
          if (
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey ||
            event.button !== 0
          ) {
            return;
          }
          event.preventDefault();
          onSelect();
        }}
      >
        <span
          className={`j-profile-shop-switch-cover${shop?.coverUrl ? " has-img" : ""}`}
          style={
            shop?.coverUrl
              ? { backgroundImage: `url(${shop.coverUrl})` }
              : undefined
          }
          aria-hidden
        />
        <span className="j-profile-shop-switch-scrim" aria-hidden />
        <span className="j-profile-shop-switch-row">
          <span className="j-profile-shop-switch-avatar" aria-hidden>
            {shop?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={shop.avatarUrl} alt="" />
            ) : (
              <Store size={16} strokeWidth={2} />
            )}
          </span>
          <span className="j-profile-shop-switch-copy">
            <span className="j-profile-shop-switch-label">
              <Store size={12} strokeWidth={2.25} aria-hidden />
              Shop
            </span>
            <span className="j-profile-shop-switch-name">
              {shopName || "chưa đặt tên"}
            </span>
          </span>
        </span>
      </a>
    </nav>
  );
}

function ProfileFeedToggle({
  slug,
  activeView,
  onSelect,
}: {
  slug: string;
  activeView: JourneyProfileView;
  onSelect: (view: JourneyProfileView) => void;
}) {
  const targetView: "journey" | "gallery" =
    activeView === "journey" ? "gallery" : "journey";
  const label = targetView === "gallery" ? "Gallery" : "Journey";
  const icon =
    targetView === "gallery" ? (
      <Grid3X3 size={15} aria-hidden />
    ) : (
      <Waypoints size={15} aria-hidden />
    );
  const href = journeyHrefForView(slug, targetView);
  const prefetch =
    targetView === "gallery" ? prefetchJourneyGalleryView : undefined;

  return (
    <a
      href={href}
      className="j-profile-switch-btn"
      aria-label={`Chuyển sang ${label}`}
      onMouseEnter={prefetch}
      onFocus={prefetch}
      onClick={(event) => {
        event.preventDefault();
        if (activeView !== targetView) onSelect(targetView);
      }}
    >
      <span className="j-profile-switch-ico">{icon}</span>
      <span className="j-profile-switch-label" aria-hidden>
        <span className="j-profile-switch-label-text">{label}</span>
      </span>
    </a>
  );
}

function ProfileSwitchButton({
  slug,
  view,
  activeView,
  onSelect,
  onPrefetch,
  icon,
  label,
  count,
}: {
  slug: string;
  view: JourneyProfileView;
  activeView: JourneyProfileView;
  onSelect: (view: JourneyProfileView) => void;
  onPrefetch?: () => void;
  icon: React.ReactNode;
  label: string;
  count?: number;
}) {
  const href = journeyHrefForView(slug, view);
  const active = view === activeView;
  const countLabel =
    count != null ? count.toLocaleString("vi-VN") : null;

  return (
    <a
      href={href}
      className={`j-profile-switch-btn${active ? " is-active" : ""}`}
      aria-current={active ? "page" : undefined}
      aria-label={
        countLabel != null ? `${label}, ${countLabel}` : label
      }
      onMouseEnter={onPrefetch}
      onFocus={onPrefetch}
      onClick={(event) => {
        event.preventDefault();
        if (!active) onSelect(view);
      }}
    >
      <span className="j-profile-switch-ico">{icon}</span>
      <span className="j-profile-switch-label" aria-hidden>
        <span className="j-profile-switch-label-text">{label}</span>
        {countLabel != null ? (
          <span className="j-profile-switch-count">{countLabel}</span>
        ) : null}
      </span>
    </a>
  );
}
