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
  writeShopCuaHangCache,
} from "@/lib/shop/client-fetch-cache";
import { isShopTamDongActive } from "@/lib/shop/tam-dong";
import { ShopTamDongOverlay } from "@/components/shop/ShopTamDongOverlay";
import {
  DEFAULT_SHOP_SWITCH,
  resolveShopSwitchDto,
  SHOP_SWITCH_PREVIEW_EVENT,
  shopSwitchCardStyle,
  type ShopSwitchDto,
  type ShopSwitchPreviewDetail,
} from "@/lib/journey/shop-switch";

type Props = {
  slug: string;
  friendCount?: number;
  orgCount?: number;
  /** Hiện nút Shop khi chủ đã bật bán hàng (hoặc chính chủ đang xem). */
  showShop?: boolean;
  /** Hydrate từ SSR — tránh chờ client fetch mới hiện avatar. */
  initialShop?: ShopCuaHang | null;
  /** Khối Shop customize (giao_dien.shopSwitch). */
  initialShopSwitch?: ShopSwitchDto | null;
};

export function JourneySidebarSwitchNav({
  slug,
  friendCount,
  orgCount,
  showShop = false,
  initialShop = null,
  initialShopSwitch = null,
}: Props) {
  const { view: activeView, setView } = useJourneyView();

  return (
    <div className="j-profile-switch-stack">
      {showShop ? (
        <ShopSwitchCard
          slug={slug}
          active={activeView === "shop"}
          initialShop={initialShop}
          initialShopSwitch={initialShopSwitch}
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
  initialShop = null,
  initialShopSwitch = null,
}: {
  slug: string;
  active: boolean;
  onSelect: () => void;
  initialShop?: ShopCuaHang | null;
  initialShopSwitch?: ShopSwitchDto | null;
}) {
  const [shop, setShop] = useState<ShopCuaHang | null>(() => {
    if (initialShop) {
      writeShopCuaHangCache(initialShop, { slug });
    }
    return initialShop;
  });
  const [now, setNow] = useState(() => Date.now());
  const [shopSwitch, setShopSwitch] = useState<ShopSwitchDto>(
    () => initialShopSwitch ?? resolveShopSwitchDto(DEFAULT_SHOP_SWITCH),
  );

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
    if (!initialShop) return;
    writeShopCuaHangCache(initialShop, { slug });
    setShop((prev) => prev ?? initialShop);
  }, [slug, initialShop]);

  useEffect(() => {
    if (initialShopSwitch) setShopSwitch(initialShopSwitch);
  }, [initialShopSwitch]);

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

  useEffect(() => {
    const onPreview = (event: Event) => {
      const detail = (event as CustomEvent<ShopSwitchPreviewDetail>).detail;
      if (detail?.dto) setShopSwitch(detail.dto);
    };
    window.addEventListener(SHOP_SWITCH_PREVIEW_EVENT, onPreview);
    return () =>
      window.removeEventListener(SHOP_SWITCH_PREVIEW_EVENT, onPreview);
  }, []);

  useEffect(() => {
    if (!shop?.tamDong || !shop.tamDongDen) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [shop?.tamDong, shop?.tamDongDen]);

  const shopName = shop?.ten?.trim() || null;
  const href = journeyHrefForView(slug, "shop");
  const tamDong = isShopTamDongActive(shop, now);
  const hasCustomImage = Boolean(shopSwitch.imageUrl);
  const showName = shopSwitch.showName;
  const coverUrl = hasCustomImage ? shopSwitch.imageUrl : shop?.coverUrl;
  const posterStyle = shopSwitchCardStyle(shopSwitch);
  const faceClass = [
    "j-profile-shop-switch-btn",
    "is-poster",
    active ? "is-active" : "",
    tamDong ? "is-tam-dong" : "",
    showName ? "show-name" : "",
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
        style={posterStyle}
        aria-current={active ? "page" : undefined}
        aria-label={
          shopName
            ? tamDong
              ? `Shop ${shopName} — tạm đóng`
              : `Shop ${shopName}`
            : tamDong
              ? "Shop — tạm đóng"
              : "Shop"
        }
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
          className={`j-profile-shop-switch-cover${coverUrl ? " has-img" : ""}`}
          style={
            coverUrl
              ? { backgroundImage: `url(${coverUrl})` }
              : undefined
          }
          aria-hidden
        />
        {showName ? (
          <span className="j-profile-shop-switch-scrim" aria-hidden />
        ) : null}
        {showName ? (
          <span className="j-profile-shop-switch-row">
            <span className="j-profile-shop-switch-avatar" aria-hidden>
              {shop?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={shop.avatarUrl}
                  alt=""
                  width={44}
                  height={44}
                  decoding="async"
                  fetchPriority="high"
                />
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
        ) : null}
        {tamDong ? (
          <ShopTamDongOverlay shop={shop} variant="badge" />
        ) : null}
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
