"use client";

import { ClipboardList, Loader2, Package, Settings2, Wallet } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import type { ShopCuaHang } from "@/lib/shop/types";
import {
  resolveShopNhanPhanLoai,
  resolveShopNhanPhanLoai2,
} from "@/lib/shop/types";
import { getNameInitials } from "@/lib/journey/profile";
import {
  fetchShopCuaHangClient,
  prefetchBanHangClientStatus,
  writeShopCuaHangCache,
} from "@/lib/shop/client-fetch-cache";
import { isShopTamDongActive } from "@/lib/shop/tam-dong";
import { JourneyShopGuestActions } from "@/components/journey/JourneyShopGuestActions";
import { JourneyShopStorefront } from "@/components/journey/JourneyShopStorefront";
import { useJourneyViewOptional } from "@/components/journey/JourneyViewContext";
import {
  shopPublicHref,
  shopSlugFromTen,
} from "@/lib/shop/cua-hang-href";

import "@/components/shop/shop-dashboard.css";
import "./journey-shop-view.css";

type Props = {
  ownerId: string;
  ownerSlug: string;
  ownerName: string;
  isOwner: boolean;
  viewerProfileId?: string | null;
  /** Avatar chủ shop (chat preview) — ưu tiên hơn avatar cửa hàng. */
  ownerAvatarUrl?: string | null;
};

function warmPrefetchBanHang() {
  prefetchBanHangClientStatus();
}

export function JourneyShopView({
  ownerId,
  ownerSlug,
  ownerName,
  isOwner,
  viewerProfileId = null,
  ownerAvatarUrl = null,
}: Props) {
  const journeyView = useJourneyViewOptional();
  const setShopSlugCtx = journeyView?.setShopSlug;
  const [shop, setShop] = useState<ShopCuaHang | null>(null);
  const [banHangBat, setBanHangBat] = useState(false);
  const [shopVisible, setShopVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const shopSlug = shopSlugFromTen(shop?.ten, ownerSlug);

  useEffect(() => {
    if (loading) return;
    setShopSlugCtx?.(shopSlug);
    if (typeof window === "undefined") return;
    const canon = shopPublicHref(ownerSlug, shopSlug);
    const path = window.location.pathname.replace(/\/+$/, "");
    const entry = `/${encodeURIComponent(ownerSlug)}/shop`;
    if (path.includes("/loai/")) return;
    const onEntry = path === entry;
    const onWrongSlug =
      path.startsWith(`${entry}/`) && path !== canon;
    if (onEntry || onWrongSlug) {
      window.history.replaceState(
        { journeyView: "shop", shopSlug },
        "",
        canon,
      );
      window.dispatchEvent(
        new CustomEvent("cins:journey-path", {
          detail: { pathname: canon },
        }),
      );
    }
  }, [loading, setShopSlugCtx, ownerSlug, shopSlug]);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const data = await fetchShopCuaHangClient({ slug: ownerSlug });
      setBanHangBat(data.banHangBat);
      setShopVisible(data.shopVisible);
      setShop(data.shop);
      window.dispatchEvent(
        new CustomEvent("cins:shop-profile-changed", {
          detail: { ownerId, shop: data.shop },
        }),
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Không tải được cửa hàng.");
      setShop(null);
      setBanHangBat(false);
      setShopVisible(false);
    } finally {
      setLoading(false);
    }
  }, [ownerId, ownerSlug]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onChanged = (ev: Event) => {
      const detail = (
        ev as CustomEvent<{ ownerId?: string; shop?: ShopCuaHang | null }>
      ).detail;
      if (detail?.ownerId && detail.ownerId !== ownerId) return;
      if (detail && "shop" in detail) {
        const next = detail.shop ?? null;
        setShop(next);
        writeShopCuaHangCache(next, {
          slug: ownerSlug,
          isOwner: true,
        });
      }
    };
    window.addEventListener("cins:shop-profile-changed", onChanged);
    return () =>
      window.removeEventListener("cins:shop-profile-changed", onChanged);
  }, [ownerId, ownerSlug]);

  const shopLabel = shop?.ten?.trim() || `${ownerName} — cửa hàng`;
  const initials = getNameInitials(shop?.ten, ownerSlug);
  const ready = shop?.sanSangNhanDon === true;

  if (loading) {
    return (
      <section className="j-shop" aria-busy="true">
        <div className="j-shop-loading">
          <Loader2 size={18} className="shop-spin" aria-hidden />
          Đang tải cửa hàng…
        </div>
      </section>
    );
  }

  if (!isOwner && !shopVisible) {
    return (
      <section className="j-shop">
        <p className="j-shop-empty">Cửa hàng chưa mở.</p>
      </section>
    );
  }

  return (
    <section className="j-shop" aria-label="Cửa hàng">
      {!banHangBat && isOwner ? (
        <p className="j-shop-banner-warn">
          Bán hàng đang tắt — bật trong Cài đặt tài khoản → Bán hàng để dùng kho
          và nhận đơn.
        </p>
      ) : null}

      {banHangBat && !shopVisible && isOwner ? (
        <p className="j-shop-banner-warn">
          Shop chưa hiện với người khác — bật «Hiển thị shop» trong Cài đặt tài
          khoản → Bán hàng.
        </p>
      ) : null}

      {err ? (
        <p className="j-shop-err" role="alert">
          {err}
        </p>
      ) : null}

      {isOwner && !ready ? (
        <div className="j-shop-setup-callout">
          <Wallet size={18} aria-hidden />
          <div>
            <strong>Cần lưu tài khoản nhận tiền</strong>
            <p>
              Mở{" "}
              <Link
                href="/ban-hang/cua-hang"
                onMouseEnter={warmPrefetchBanHang}
                onFocus={warmPrefetchBanHang}
              >
                Quản lý cửa hàng
              </Link>{" "}
              để thêm STK — sau đó mới mở kho và gắn hàng lên bài.
            </p>
          </div>
        </div>
      ) : null}

      {banHangBat || isOwner ? (
        <JourneyShopStorefront
          ownerSlug={ownerSlug}
          ownerId={ownerId}
          shopSlug={shopSlug}
          cuaHangId={shop?.id ?? null}
          shopName={shopLabel}
          shopMoTa={shop?.moTa ?? null}
          shopAvatarUrl={shop?.avatarUrl ?? null}
          shopCoverUrl={shop?.coverUrl ?? null}
          shopBannerSuKienUrl={shop?.bannerSuKienUrl ?? null}
          shopBannerSuKienHien={shop?.bannerSuKienHien !== false}
          initials={initials}
          nhanPhanLoai={resolveShopNhanPhanLoai(shop)}
          nhanPhanLoai2={resolveShopNhanPhanLoai2(shop)}
          isOwner={isOwner}
          viewerProfileId={viewerProfileId}
          tamDongActive={isShopTamDongActive(shop)}
          tamDongTu={shop?.tamDongTu ?? null}
          tamDongDen={shop?.tamDongDen ?? null}
          tamDongLyDo={shop?.tamDongLyDo ?? null}
          ownerChrome={
            isOwner
              ? {
                  actions: (
                    <nav
                      className="j-shop-sf-actions"
                      aria-label="Quản lý bán hàng"
                    >
                      <Link
                        href="/ban-hang/cua-hang"
                        className="j-shop-action-btn"
                        aria-label="Quản lý cửa hàng"
                        onMouseEnter={warmPrefetchBanHang}
                        onFocus={warmPrefetchBanHang}
                      >
                        <Settings2 size={13} aria-hidden />
                        <span className="j-shop-action-btn-label">
                          Quản lý cửa hàng
                        </span>
                      </Link>
                      {ready ? (
                        <>
                          <Link
                            href="/ban-hang/kho"
                            className="j-shop-action-btn"
                            aria-label="Kho hàng"
                            onMouseEnter={warmPrefetchBanHang}
                            onFocus={warmPrefetchBanHang}
                          >
                            <Package size={13} aria-hidden />
                            <span className="j-shop-action-btn-label">
                              Kho hàng
                            </span>
                          </Link>
                          <Link
                            href="/ban-hang/don"
                            className="j-shop-action-btn"
                            aria-label="Đơn hàng"
                            onMouseEnter={warmPrefetchBanHang}
                            onFocus={warmPrefetchBanHang}
                          >
                            <ClipboardList size={13} aria-hidden />
                            <span className="j-shop-action-btn-label">
                              Đơn hàng
                            </span>
                          </Link>
                        </>
                      ) : (
                        <span
                          className="j-shop-action-btn is-disabled"
                          aria-disabled="true"
                          aria-label="Kho (cần STK)"
                          title="Kho (cần STK)"
                        >
                          <Package size={13} aria-hidden />
                          <span className="j-shop-action-btn-label">
                            Kho (cần STK)
                          </span>
                        </span>
                      )}
                    </nav>
                  ),
                }
              : null
          }
          guestChrome={
            !isOwner
              ? {
                  actions: (
                    <JourneyShopGuestActions
                      ownerId={ownerId}
                      ownerSlug={ownerSlug}
                      shopSlug={shopSlug}
                      ownerName={ownerName}
                      ownerAvatarUrl={ownerAvatarUrl ?? shop?.avatarUrl ?? null}
                      viewerProfileId={viewerProfileId}
                      shareTitle={shopLabel}
                    />
                  ),
                }
              : null
          }
        />
      ) : null}
    </section>
  );
}
