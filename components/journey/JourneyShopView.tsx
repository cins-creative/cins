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
import { JourneyShopGuestActions } from "@/components/journey/JourneyShopGuestActions";
import { JourneyShopStorefront } from "@/components/journey/JourneyShopStorefront";

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
  const [shop, setShop] = useState<ShopCuaHang | null>(null);
  const [banHangBat, setBanHangBat] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const data = await fetchShopCuaHangClient({ slug: ownerSlug });
      setBanHangBat(data.banHangBat);
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

  if (!isOwner && !banHangBat) {
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
          Bán hàng đang tắt — bật trong Cài đặt tài khoản → Bán hàng để khách thấy
          Shop và đặt đơn.
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
          cuaHangId={shop?.id ?? null}
          shopName={shopLabel}
          shopMoTa={shop?.moTa ?? null}
          shopAvatarUrl={shop?.avatarUrl ?? null}
          shopCoverUrl={shop?.coverUrl ?? null}
          initials={initials}
          nhanPhanLoai={resolveShopNhanPhanLoai(shop)}
          nhanPhanLoai2={resolveShopNhanPhanLoai2(shop)}
          isOwner={isOwner}
          viewerProfileId={viewerProfileId}
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
                        onMouseEnter={warmPrefetchBanHang}
                        onFocus={warmPrefetchBanHang}
                      >
                        <Settings2 size={13} aria-hidden />
                        Quản lý cửa hàng
                      </Link>
                      {ready ? (
                        <>
                          <Link
                            href="/ban-hang/kho"
                            className="j-shop-action-btn"
                            onMouseEnter={warmPrefetchBanHang}
                            onFocus={warmPrefetchBanHang}
                          >
                            <Package size={13} aria-hidden />
                            Kho hàng
                          </Link>
                          <Link
                            href="/ban-hang/don"
                            className="j-shop-action-btn"
                            onMouseEnter={warmPrefetchBanHang}
                            onFocus={warmPrefetchBanHang}
                          >
                            <ClipboardList size={13} aria-hidden />
                            Đơn hàng
                          </Link>
                        </>
                      ) : (
                        <span
                          className="j-shop-action-btn is-disabled"
                          aria-disabled="true"
                        >
                          <Package size={13} aria-hidden />
                          Kho (cần STK)
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
