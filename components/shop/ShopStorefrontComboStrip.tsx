"use client";

import Link from "next/link";
import { Layers, Package, ShoppingBag, Tag } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ShopComboCard } from "@/components/shop/ShopComboCard";
import { ShopStorefrontCardRail } from "@/components/shop/ShopStorefrontCardRail";
import { ShopVoucherCard } from "@/components/shop/ShopVoucherCard";
import {
  comboMuaNgayHref,
  comboTrangThaiPublic,
  rememberActiveCombo,
} from "@/lib/shop/combo-storefront";
import type {
  ShopCombo,
  ShopLoaiGiam,
  ShopVoucherCongKhaiItem,
} from "@/lib/shop/types";

import "@/components/shop/shop-dashboard.css";

type ComboPublic = Pick<
  ShopCombo,
  | "id"
  | "ten"
  | "moTa"
  | "loaiGiam"
  | "giaTri"
  | "giamToiDa"
  | "apDungLap"
  | "dieuKien"
  | "kichHoat"
  | "batDau"
  | "ketThuc"
  | "dieuKienLoi"
>;

type Tab = "combo" | "voucher";

type Props = {
  sellerId: string;
  ownerSlug: string;
  shopName?: string | null;
  shopAvatarUrl?: string | null;
  shopBannerUrl?: string | null;
};

function mapComboFromApi(
  c: {
    id: string;
    ten: string;
    moTa: string | null;
    loaiGiam: ShopLoaiGiam;
    giaTri: number;
    giamToiDa: number | null;
    apDungLap: boolean;
    dieuKien: Array<{
      id: string;
      phamVi: ShopCombo["dieuKien"][number]["phamVi"];
      idNhom: string | null;
      idSanPham: string | null;
      idBienThe: string | null;
      soLuong: number;
      nhan: string | null;
      anhUrl: string | null;
    }>;
  },
): ComboPublic {
  return {
    id: c.id,
    ten: c.ten,
    moTa: c.moTa,
    loaiGiam: c.loaiGiam,
    giaTri: c.giaTri,
    giamToiDa: c.giamToiDa,
    apDungLap: c.apDungLap,
    kichHoat: true,
    batDau: null,
    ketThuc: null,
    dieuKienLoi: false,
    dieuKien: c.dieuKien.map((dk) => ({
      id: dk.id,
      idCombo: c.id,
      phamVi: dk.phamVi,
      idNhom: dk.idNhom,
      idSanPham: dk.idSanPham,
      idBienThe: dk.idBienThe,
      soLuong: dk.soLuong,
      nhan: dk.nhan,
      anhUrl: dk.anhUrl,
    })),
  };
}

/**
 * Mặt tiền shop — Combo & Voucher (GET cong-khai).
 */
export function ShopStorefrontComboStrip({
  sellerId,
  ownerSlug,
  shopName,
  shopAvatarUrl,
  shopBannerUrl,
}: Props) {
  const [tab, setTab] = useState<Tab>("combo");
  const [combos, setCombos] = useState<ComboPublic[]>([]);
  const [vouchers, setVouchers] = useState<ShopVoucherCongKhaiItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!sellerId) return;
    let cancelled = false;
    const ac = new AbortController();
    void (async () => {
      try {
        const [comboRes, voucherRes] = await Promise.all([
          fetch(
            `/api/shop/combo/cong-khai?sellerId=${encodeURIComponent(sellerId)}`,
            { signal: ac.signal, credentials: "same-origin" },
          ),
          fetch(
            `/api/shop/voucher/cong-khai?sellerId=${encodeURIComponent(sellerId)}`,
            { signal: ac.signal, credentials: "same-origin" },
          ),
        ]);
        if (cancelled) return;
        if (comboRes.ok) {
          const json = (await comboRes.json()) as {
            items?: Parameters<typeof mapComboFromApi>[0][];
          };
          setCombos((json.items ?? []).slice(0, 8).map(mapComboFromApi));
        }
        if (voucherRes.ok) {
          const json = (await voucherRes.json()) as {
            items?: ShopVoucherCongKhaiItem[];
          };
          setVouchers((json.items ?? []).slice(0, 8));
        }
      } catch {
        /* abort / network */
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [sellerId]);

  const defaultTab = useMemo<Tab>(() => {
    if (combos.length > 0) return "combo";
    if (vouchers.length > 0) return "voucher";
    return "combo";
  }, [combos.length, vouchers.length]);

  useEffect(() => {
    if (loaded) setTab(defaultTab);
  }, [loaded, defaultTab]);

  const onMuaNgay = useCallback(
    (comboId: string) => {
      rememberActiveCombo(sellerId, comboId);
    },
    [sellerId],
  );

  if (!loaded) return null;
  if (combos.length === 0 && vouchers.length === 0) return null;

  const shopTen = shopName?.trim() || null;

  return (
    <section className="j-shop-sf-uu-dai-strip" aria-label="Combo và voucher">
      <div className="j-shop-sf-uu-dai-head">
        <p className="j-shop-sf-uu-dai-kicker">
          <ShoppingBag size={14} strokeWidth={2.25} aria-hidden />
          Combo &amp; voucher
        </p>
        <div className="j-shop-sf-uu-dai-tabs" role="tablist">
          {combos.length > 0 ? (
            <button
              type="button"
              role="tab"
              aria-selected={tab === "combo"}
              className={`j-shop-sf-uu-dai-tab${tab === "combo" ? " is-active" : ""}`}
              onClick={() => setTab("combo")}
            >
              <Layers size={14} aria-hidden />
              Combo
              <span className="j-shop-sf-uu-dai-tab-count">{combos.length}</span>
            </button>
          ) : null}
          {vouchers.length > 0 ? (
            <button
              type="button"
              role="tab"
              aria-selected={tab === "voucher"}
              className={`j-shop-sf-uu-dai-tab${tab === "voucher" ? " is-active" : ""}`}
              onClick={() => setTab("voucher")}
            >
              <Tag size={14} aria-hidden />
              Voucher
              <span className="j-shop-sf-uu-dai-tab-count">
                {vouchers.length}
              </span>
            </button>
          ) : null}
        </div>
      </div>

      {tab === "combo" && combos.length > 0 ? (
        <ShopStorefrontCardRail ariaLabel="Combo khuyến mãi">
          <ul className="shop-uu-dai-combo-list j-shop-sf-combo-list">
            {combos.map((combo) => {
              const status = comboTrangThaiPublic(combo as ShopCombo);
              const buyHref = comboMuaNgayHref(
                combo as ShopCombo,
                ownerSlug,
                shopName,
              );
              return (
                <li
                  key={combo.id}
                  className={`shop-uu-dai-combo-item is-live j-shop-sf-combo-item${
                    status !== "Đang chạy" ? " is-off" : ""
                  }`}
                >
                  <ShopComboCard
                    combo={combo as ShopCombo}
                    status={status}
                    storefront={{
                      ownerSlug,
                      shopName,
                      sellerId,
                    }}
                    actions={
                      buyHref ? (
                        <Link
                          href={buyHref}
                          className="j-shop-sf-combo-buy"
                          draggable={false}
                          onDragStart={(ev) => ev.preventDefault()}
                          onClick={() => onMuaNgay(combo.id)}
                        >
                          Mua ngay
                        </Link>
                      ) : null
                    }
                  />
                </li>
              );
            })}
          </ul>
        </ShopStorefrontCardRail>
      ) : null}

      {tab === "voucher" && vouchers.length > 0 ? (
        <ShopStorefrontCardRail ariaLabel="Voucher khuyến mãi">
          <div className="j-shop-sf-voucher-rail" role="list">
            {vouchers.map((v) => (
              <div key={v.id} className="j-shop-sf-voucher-item" role="listitem">
                <ShopVoucherCard
                ma={v.ma}
                ten={v.ten}
                loaiGiam={v.loaiGiam}
                giaTri={v.giaTri}
                designKieu={v.designKieu}
                designMauNen={v.designMauNen}
                designMauChu={v.designMauChu}
                designNhan={v.designNhan}
                designAnhUrl={v.designAnhUrl}
                donToiThieu={v.donToiThieu}
                soLuongTong={v.soLuongTong}
                soLuongDaDung={v.soLuongDaDung}
                soLuongDaLuu={v.soLuongDaLuu}
                ketThuc={v.ketThuc}
                tenCuaHang={v.tenCuaHang ?? shopTen}
                shopAvatarUrl={v.shopAvatarUrl ?? shopAvatarUrl}
                shopBannerUrl={v.shopBannerUrl ?? shopBannerUrl}
                onCopy={() => {
                  void navigator.clipboard?.writeText(v.ma);
                }}
              />
            </div>
            ))}
          </div>
        </ShopStorefrontCardRail>
      ) : null}
    </section>
  );
}
