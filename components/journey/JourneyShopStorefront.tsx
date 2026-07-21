"use client";

import { Camera, Loader2, Plus, Search, ShoppingBag, Star, X } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useAuthGate } from "@/components/auth/AuthGateProvider";
import { JourneyShopSfHero } from "@/components/journey/JourneyShopSfHero";
import {
  GIO_CHUNG_CHANGED_EVENT,
  GIO_CHUNG_OPEN_EVENT,
} from "@/components/shop/ShopGioChungButton";
import { ShopTamDongOverlay } from "@/components/shop/ShopTamDongOverlay";
import { writeShopCuaHangCache } from "@/lib/shop/client-fetch-cache";
import { shopLoaiHref, shopLoaiMauHref } from "@/lib/shop/cua-hang-href";
import { parseShopNhomMoTa } from "@/lib/shop/nhom-mo-ta";
import {
  SHOP_STOREFRONT_KHAC_SLUG,
  type ShopCuaHang,
  type ShopGioChung,
  type ShopStorefrontItem,
  type ShopStorefrontNhomCard,
} from "@/lib/shop/types";
import { isShopTamDongActive } from "@/lib/shop/tam-dong";

type HeroChrome = {
  actions: ReactNode;
};

type Props = {
  ownerSlug: string;
  ownerId: string;
  cuaHangId: string | null;
  shopName: string;
  shopMoTa: string | null;
  shopAvatarUrl: string | null;
  shopCoverUrl: string | null;
  shopBannerSuKienUrl?: string | null;
  shopBannerSuKienHien?: boolean;
  initials: string;
  /** Legacy — giữ prop để JourneyShopView không vỡ; UI lọc theo trục đã bỏ trên mặt tiền. */
  nhanPhanLoai?: string;
  nhanPhanLoai2?: string;
  isOwner?: boolean;
  viewerProfileId?: string | null;
  ownerChrome?: HeroChrome | null;
  guestChrome?: HeroChrome | null;
  /** Shop đang tạm đóng — khóa catalog. */
  tamDongActive?: boolean;
  tamDongTu?: string | null;
  tamDongDen?: string | null;
  tamDongLyDo?: string | null;
};

function formatGia(gia: number, tienTe: string): string {
  const n = Number.isFinite(gia) ? gia : 0;
  try {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: tienTe === "VND" ? "VND" : tienTe || "VND",
      maximumFractionDigits: tienTe === "VND" ? 0 : 2,
    }).format(n);
  } catch {
    return `${n.toLocaleString("vi-VN")} ${tienTe || "VND"}`;
  }
}

function CardMoTa({ moTa }: { moTa: string }) {
  const blocks = parseShopNhomMoTa(moTa);
  const first = blocks.find((b) => b.type === "p");
  const text =
    first && first.type === "p" ? first.text.trim() : moTa.trim();
  if (!text) return null;
  return <p className="j-shop-sf-type-desc">{text}</p>;
}

function TypeCard({
  card,
  ownerSlug,
  featureChrome = false,
}: {
  card: ShopStorefrontNhomCard;
  ownerSlug: string;
  /** Hiển thị viền/badge Feature — chỉ block «Các mặt hàng phổ biến». */
  featureChrome?: boolean;
}) {
  const giaLabel =
    card.giaMacDinh != null
      ? formatGia(card.giaMacDinh, card.tienTe)
      : card.giaTu != null
        ? card.giaDen != null && card.giaDen !== card.giaTu
          ? `Từ ${formatGia(card.giaTu, card.tienTe)}`
          : formatGia(card.giaTu, card.tienTe)
        : "Chưa có giá";
  const href =
    card.href?.trim() || shopLoaiHref(ownerSlug, card.id);
  const showFeature = featureChrome && card.noiBat;

  return (
    <Link
      href={href}
      className={`j-shop-sf-card j-shop-sf-type-card${card.hetHang ? " is-soldout" : ""}${showFeature ? " is-feature" : ""}`}
    >
      <span className="j-shop-sf-card-media" aria-hidden>
        {card.anhUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={card.anhUrl} alt="" loading="lazy" />
        ) : (
          <span className="j-shop-sf-card-ph" />
        )}
        {showFeature ? (
          <span
            className="j-shop-sf-card-feature-badge"
            title="Feature"
            aria-label="Feature"
          >
            <Star size={18} strokeWidth={2} fill="currentColor" aria-hidden />
          </span>
        ) : null}
        {card.hetHang ? (
          <span className="j-shop-sf-soldout">Hết hàng</span>
        ) : null}
      </span>
      <span className="j-shop-sf-card-body">
        <span className="j-shop-sf-card-name">{card.nhan}</span>
        {card.moTa ? <CardMoTa moTa={card.moTa} /> : null}
        <span className="j-shop-sf-type-meta">
          <span>{card.soMau} mẫu</span>
          {card.diemTrungBinh != null ? (
            <span
              className="j-shop-sf-type-rating"
              aria-label={`${card.diemTrungBinh} trên 5 sao${card.tongDanhGia > 0 ? `, ${card.tongDanhGia} đánh giá` : ""}`}
            >
              <Star size={11} strokeWidth={2} fill="currentColor" aria-hidden />
              <span>{card.diemTrungBinh}</span>
              {card.tongDanhGia > 0 ? (
                <span className="j-shop-sf-type-rating-count">
                  ({card.tongDanhGia})
                </span>
              ) : null}
            </span>
          ) : null}
        </span>
        <span
          className={`j-shop-sf-card-price${card.giaTu == null ? " is-empty" : ""}`}
        >
          {giaLabel}
        </span>
      </span>
    </Link>
  );
}

function ItemCard({
  item,
  ownerSlug,
  canShop,
  adding,
  onAdd,
  featured = false,
}: {
  item: ShopStorefrontItem;
  ownerSlug: string;
  canShop: boolean;
  adding: boolean;
  onAdd: (item: ShopStorefrontItem) => void;
  featured?: boolean;
}) {
  const nhomId = item.idNhom?.trim() || SHOP_STOREFRONT_KHAC_SLUG;
  const href = shopLoaiMauHref(ownerSlug, nhomId, item.sanPhamId);
  const giaLabel =
    item.giaHienThi != null
      ? formatGia(item.giaHienThi, item.tienTe)
      : "Chưa có giá";
  const sub = [item.phanLoai, item.nhanBienThe]
    .map((t) => t?.trim())
    .filter((t): t is string => Boolean(t) && t !== "Mặc định")
    .join(" · ");
  const canBuy =
    canShop &&
    Boolean(item.idBienThe) &&
    !item.hetHang &&
    item.giaHienThi != null;
  /** Badge ngôi sao — không dùng stroke chạy (`.is-feature`). */
  const showBadge = featured || item.noiBat;

  return (
    <article
      className={`j-shop-sf-card j-shop-sf-item-card${item.hetHang ? " is-soldout" : ""}`}
    >
      <Link href={href} className="j-shop-sf-card-media-link">
        <span className="j-shop-sf-card-media" aria-hidden>
          {item.anhUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.anhUrl} alt="" loading="lazy" />
          ) : (
            <span className="j-shop-sf-card-ph" />
          )}
          {showBadge ? (
            <span
              className="j-shop-sf-card-feature-badge"
              title="Feature"
              aria-label="Feature"
            >
              <Star size={18} strokeWidth={2} fill="currentColor" aria-hidden />
            </span>
          ) : null}
          {item.hetHang ? (
            <span className="j-shop-sf-soldout">Hết hàng</span>
          ) : null}
        </span>
      </Link>
      <span className="j-shop-sf-card-body">
        <Link href={href} className="j-shop-sf-card-name">
          {item.tenSanPham}
        </Link>
        {sub ? <span className="j-shop-sf-type-meta">{sub}</span> : null}
        <span className="j-shop-sf-card-action">
          <span className="j-shop-sf-card-price-row">
            {item.giaGoc != null ? (
              <span className="j-shop-sf-card-price-goc">
                {formatGia(item.giaGoc, item.tienTe)}
              </span>
            ) : null}
            <span
              className={`j-shop-sf-card-price${item.giaHienThi == null ? " is-empty" : ""}${item.giaGoc != null ? " is-sale" : ""}`}
            >
              {giaLabel}
            </span>
          </span>
          {canShop ? (
            <button
              type="button"
              className="j-shop-sf-add"
              disabled={!canBuy || adding}
              aria-label={`Thêm ${item.tenSanPham} vào giỏ`}
              onClick={() => onAdd(item)}
            >
              {adding ? (
                <Loader2 size={14} className="shop-spin" aria-hidden />
              ) : (
                <Plus size={15} strokeWidth={2.5} aria-hidden />
              )}
            </button>
          ) : null}
        </span>
      </span>
    </article>
  );
}

function ShopEventBanner({
  ownerSlug,
  bannerUrl,
  bannerHien = true,
  isOwner,
}: {
  ownerSlug: string;
  bannerUrl: string | null;
  bannerHien?: boolean;
  isOwner: boolean;
}) {
  const [url, setUrl] = useState(bannerUrl);
  const [hien, setHien] = useState(bannerHien);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<string | null>(null);

  useEffect(() => {
    setUrl(bannerUrl);
  }, [bannerUrl]);

  useEffect(() => {
    setHien(bannerHien);
  }, [bannerHien]);

  useEffect(() => {
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    };
  }, []);

  async function patchShop(body: {
    bannerSuKienId?: string | null;
    bannerSuKienHien?: boolean;
  }) {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/shop/cua-hang", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => null)) as {
        shop?: ShopCuaHang;
        error?: string;
      } | null;
      if (!res.ok || !json?.shop) {
        setErr(json?.error ?? "Không lưu được banner.");
        setUrl(bannerUrl);
        setHien(bannerHien);
        return;
      }
      const next = json.shop;
      setUrl(next.bannerSuKienUrl);
      setHien(next.bannerSuKienHien);
      writeShopCuaHangCache(next, { slug: ownerSlug, isOwner: true });
      window.dispatchEvent(
        new CustomEvent("cins:shop-profile-changed", {
          detail: { ownerId: next.idNguoiDung, shop: next },
        }),
      );
    } catch {
      setErr("Không lưu được banner.");
      setUrl(bannerUrl);
      setHien(bannerHien);
    } finally {
      setBusy(false);
      if (previewRef.current) {
        URL.revokeObjectURL(previewRef.current);
        previewRef.current = null;
      }
    }
  }

  async function onPick(file: File | undefined) {
    if (!file || !isOwner) return;
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    const local = URL.createObjectURL(file);
    previewRef.current = local;
    setUrl(local);
    setBusy(true);
    setErr(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const up = await fetch("/api/post-image/upload", {
        method: "POST",
        body: fd,
      });
      const upJson = (await up.json().catch(() => null)) as {
        imageId?: string;
        url?: string;
        error?: string;
      } | null;
      if (!up.ok || !upJson?.imageId) {
        setErr(upJson?.error ?? "Upload thất bại.");
        setUrl(bannerUrl);
        setBusy(false);
        return;
      }
      await patchShop({ bannerSuKienId: upJson.imageId, bannerSuKienHien: true });
    } catch {
      setErr("Upload thất bại.");
      setUrl(bannerUrl);
      setBusy(false);
    }
  }

  /* Khách: chỉ hiện khi có ảnh + đang bật. Owner luôn thấy để chỉnh. */
  if (!isOwner && (!url || !hien)) return null;

  return (
    <section className="j-shop-sf-group j-shop-sf-group--banner">
      <div
        className={`j-shop-sf-event-banner${url ? " has-img" : ""}${isOwner ? " is-editable" : ""}${busy ? " is-busy" : ""}${isOwner && url && !hien ? " is-hidden" : ""}`}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="Banner sự kiện" />
        ) : (
          <span className="j-shop-sf-event-banner-ph">
            <Camera size={22} aria-hidden />
            Thêm ảnh banner sự kiện
          </span>
        )}
        {isOwner ? (
          <>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                void onPick(f);
              }}
            />
            <div className="j-shop-sf-event-banner-actions">
              <button
                type="button"
                className={`j-shop-sf-event-banner-switch${hien ? " is-on" : ""}`}
                disabled={busy || !url}
                role="switch"
                aria-checked={hien}
                aria-label={hien ? "Ẩn banner" : "Hiện banner"}
                title={hien ? "Ẩn banner" : "Hiện banner"}
                onClick={() => {
                  const next = !hien;
                  setHien(next);
                  void patchShop({ bannerSuKienHien: next });
                }}
              >
                <span className="j-shop-sf-event-banner-switch-knob" aria-hidden />
              </button>
              <button
                type="button"
                className="j-shop-sf-event-banner-btn"
                disabled={busy}
                onClick={() => fileRef.current?.click()}
              >
                {busy ? (
                  <Loader2 size={14} className="shop-spin" aria-hidden />
                ) : (
                  <Camera size={14} aria-hidden />
                )}
                {url ? "Đổi ảnh" : "Thêm ảnh"}
              </button>
              {url ? (
                <button
                  type="button"
                  className="j-shop-sf-event-banner-btn is-muted"
                  disabled={busy}
                  onClick={() => void patchShop({ bannerSuKienId: null })}
                >
                  Xóa
                </button>
              ) : null}
            </div>
          </>
        ) : null}
      </div>
      {err ? (
        <p className="j-shop-sf-empty" role="alert">
          {err}
        </p>
      ) : null}
    </section>
  );
}

export function JourneyShopStorefront({
  ownerSlug,
  ownerId,
  cuaHangId,
  shopName,
  shopMoTa,
  shopAvatarUrl,
  shopCoverUrl,
  shopBannerSuKienUrl = null,
  shopBannerSuKienHien = true,
  initials,
  isOwner = false,
  viewerProfileId = null,
  ownerChrome = null,
  guestChrome = null,
  tamDongActive = false,
  tamDongTu = null,
  tamDongDen = null,
  tamDongLyDo = null,
}: Props) {
  const { openAuthModal } = useAuthGate();
  const [cards, setCards] = useState<ShopStorefrontNhomCard[] | null>(null);
  const [items, setItems] = useState<ShopStorefrontItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [cartCount, setCartCount] = useState(0);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addErr, setAddErr] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const tamDongFields = {
    tamDong: tamDongActive,
    tamDongTu,
    tamDongDen,
    tamDongLyDo,
  };
  const shopClosed = isShopTamDongActive(tamDongFields, now);
  const canShop = !isOwner && Boolean(cuaHangId) && !shopClosed;

  useEffect(() => {
    if (!tamDongActive || !tamDongDen) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [tamDongActive, tamDongDen]);

  const applyGioCount = useCallback(
    (gio: ShopGioChung | null | undefined) => {
      if (!gio) return;
      const nhom = gio.nhom.find((n) => n.idNguoiBan === ownerId);
      const n = nhom
        ? nhom.dong.reduce((s, d) => s + d.soLuong, 0)
        : 0;
      setCartCount(n);
    },
    [ownerId],
  );

  const refreshGioCount = useCallback(async () => {
    if (!canShop || !viewerProfileId) return;
    try {
      const gRes = await fetch("/api/shop/gio-chung", { cache: "no-store" });
      const gJson = (await gRes.json().catch(() => null)) as {
        gio?: ShopGioChung;
      } | null;
      if (!gRes.ok || !gJson?.gio) return;
      applyGioCount(gJson.gio);
    } catch {
      /* ignore */
    }
  }, [canShop, viewerProfileId, applyGioCount]);

  const addItemToCart = useCallback(
    async (item: ShopStorefrontItem) => {
      if (!viewerProfileId) {
        openAuthModal("Đăng nhập để thêm vào giỏ.");
        return;
      }
      if (!item.idBienThe || item.hetHang || item.giaHienThi == null) return;
      setAddingId(item.sanPhamId);
      setAddErr(null);
      setCartCount((c) => c + 1);
      try {
        const res = await fetch("/api/shop/gio-chung", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idBienThe: item.idBienThe, delta: 1 }),
        });
        const json = (await res.json().catch(() => null)) as {
          gio?: ShopGioChung;
          error?: string;
        } | null;
        if (!res.ok) {
          setCartCount((c) => Math.max(0, c - 1));
          setAddErr(json?.error ?? "Không thêm vào giỏ.");
          return;
        }
        applyGioCount(json?.gio);
        window.dispatchEvent(new Event(GIO_CHUNG_CHANGED_EVENT));
      } catch {
        setCartCount((c) => Math.max(0, c - 1));
        setAddErr("Không thêm vào giỏ.");
      } finally {
        setAddingId(null);
      }
    },
    [viewerProfileId, openAuthModal, applyGioCount],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setSearch("");
      try {
        const res = await fetch(
          `/api/shop/cua-hang/mat-hang?slug=${encodeURIComponent(ownerSlug)}`,
          { cache: "no-store" },
        );
        const json = (await res.json().catch(() => null)) as {
          nhomCards?: ShopStorefrontNhomCard[];
          items?: ShopStorefrontItem[];
        } | null;
        if (!cancelled) {
          setCards(res.ok ? (json?.nhomCards ?? []) : []);
          setItems(res.ok ? (json?.items ?? []) : []);
        }
        if (!cancelled && canShop && viewerProfileId) {
          await refreshGioCount();
        }
      } catch {
        if (!cancelled) {
          setCards([]);
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ownerSlug, canShop, viewerProfileId, refreshGioCount]);

  useEffect(() => {
    if (!canShop || !viewerProfileId) return;
    const onChanged = () => void refreshGioCount();
    window.addEventListener(GIO_CHUNG_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(GIO_CHUNG_CHANGED_EVENT, onChanged);
  }, [canShop, viewerProfileId, refreshGioCount]);

  const openCartDialog = useCallback(() => {
    if (!viewerProfileId) {
      openAuthModal("Đăng nhập để xem giỏ.");
      return;
    }
    window.dispatchEvent(new Event(GIO_CHUNG_OPEN_EVENT));
  }, [viewerProfileId, openAuthModal]);

  const searchActive = deferredSearch.trim().length > 0;
  const searchQ = deferredSearch.trim().toLowerCase();

  const filteredCards = useMemo(() => {
    const list = cards ?? [];
    const filtered = !searchQ
      ? list
      : list.filter((c) => {
          const hay = [c.nhan, c.moTa].filter(Boolean).join(" ").toLowerCase();
          return hay.includes(searchQ);
        });
    return [...filtered].sort(
      (a, b) => Number(b.noiBat) - Number(a.noiBat),
    );
  }, [cards, searchQ]);

  const featuredTypeCards = useMemo(
    () => filteredCards.filter((c) => c.noiBat),
    [filteredCards],
  );

  const filteredItems = useMemo(() => {
    if (!searchQ) return [];
    return items
      .filter((i) => {
        const hay = [i.tenSanPham, i.nhanBienThe, i.phanLoai, i.phanLoai2]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(searchQ);
      })
      .sort((a, b) => Number(b.noiBat) - Number(a.noiBat));
  }, [items, searchQ]);

  const featuredItems = useMemo(
    () => items.filter((i) => i.noiBat),
    [items],
  );

  useEffect(() => {
    setAddErr(null);
  }, [deferredSearch]);

  const hasCards = (cards?.length ?? 0) > 0;
  const showItemResults = searchActive && filteredItems.length > 0;
  const hasFeaturedTypes = !searchActive && featuredTypeCards.length > 0;
  const hasFeaturedItems = !searchActive && featuredItems.length > 0;
  const hasAllTypes = !searchActive && filteredCards.length > 0;
  const showSearchTypeResults =
    searchActive && !showItemResults && filteredCards.length > 0;
  const showBanner = !searchActive;
  const hasCatalog =
    hasCards || featuredItems.length > 0 || items.length > 0;
  const catalogEmpty = searchActive
    ? filteredItems.length === 0 && filteredCards.length === 0
    : !hasCards && featuredItems.length === 0;

  return (
    <div className="j-shop-storefront">
      <JourneyShopSfHero
        shopName={shopName}
        shopMoTa={shopMoTa}
        shopAvatarUrl={shopAvatarUrl}
        shopCoverUrl={shopCoverUrl}
        initials={initials}
      />

      <div className="j-shop-sf-section-head">
        <span className="j-tlb-streak-slow" aria-hidden="true" />
        <div className="j-shop-sf-section-tools">
          {!loading && hasCards && !shopClosed ? (
            <div className="j-shop-sf-dd-row">
              <label className="j-shop-sf-search">
                <Search size={14} strokeWidth={2.25} aria-hidden />
                <input
                  type="search"
                  value={search}
                  placeholder="Tìm hàng…"
                  aria-label="Tìm hàng bán"
                  autoComplete="off"
                  spellCheck={false}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search ? (
                  <button
                    type="button"
                    className="j-shop-sf-search-clear"
                    aria-label="Xóa tìm kiếm"
                    onClick={() => setSearch("")}
                  >
                    <X size={13} strokeWidth={2.25} aria-hidden />
                  </button>
                ) : null}
              </label>
            </div>
          ) : (
            <span className="j-shop-sf-section-spacer" aria-hidden />
          )}
          {ownerChrome?.actions ?? guestChrome?.actions}
          {canShop ? (
            <button
              type="button"
              className={`j-shop-sf-cart-btn${cartCount > 0 ? " has-items" : ""}`}
              aria-label={
                cartCount > 0
                  ? `Giỏ chờ mua, ${cartCount} món`
                  : "Giỏ chờ mua"
              }
              onClick={openCartDialog}
            >
              <ShoppingBag size={18} strokeWidth={2} aria-hidden />
              {cartCount > 0 ? (
                <span className="j-shop-sf-cart-count" aria-hidden>
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              ) : null}
            </button>
          ) : null}
        </div>
      </div>

      {loading ? (
        <div className="j-shop-sf-loading" aria-busy="true">
          <Loader2 size={18} className="shop-spin" aria-hidden />
          Đang tải hàng…
        </div>
      ) : hasCatalog ? (
        catalogEmpty && !shopClosed ? (
          <p className="j-shop-sf-empty">
            {searchActive
              ? "Không tìm thấy hàng khớp."
              : "Không có loại hàng."}
          </p>
        ) : (
          <div
            className={`j-shop-sf-catalog${shopClosed ? " is-tam-dong" : ""}`}
          >
            {shopClosed ? (
              <ShopTamDongOverlay shop={tamDongFields} />
            ) : null}
            <div
              className="j-shop-sf-catalog-body"
              inert={shopClosed ? true : undefined}
              aria-hidden={shopClosed || undefined}
            >
            {hasFeaturedTypes ? (
              <section className="j-shop-sf-group j-shop-sf-group--feature">
                <div className="j-shop-sf-group-head">
                  <p className="j-shop-sf-group-kicker">
                    Các mặt hàng phổ biến
                  </p>
                </div>
                <ul className="j-shop-sf-grid">
                  {featuredTypeCards.map((card) => (
                    <li key={card.id}>
                      <TypeCard
                        card={card}
                        ownerSlug={ownerSlug}
                        featureChrome
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            {showBanner ? (
              <ShopEventBanner
                ownerSlug={ownerSlug}
                bannerUrl={shopBannerSuKienUrl}
                bannerHien={shopBannerSuKienHien}
                isOwner={isOwner}
              />
            ) : null}
            {hasFeaturedItems ? (
              <section className="j-shop-sf-group j-shop-sf-group--feature-items">
                <div className="j-shop-sf-group-head">
                  <p className="j-shop-sf-group-kicker">Sản phẩm nổi bật</p>
                </div>
                {addErr && !showItemResults ? (
                  <p className="j-shop-sf-empty" role="alert">
                    {addErr}
                  </p>
                ) : null}
                <ul className="j-shop-sf-grid j-shop-sf-grid--feature">
                  {featuredItems.map((item) => (
                    <li key={item.sanPhamId}>
                      <ItemCard
                        item={item}
                        ownerSlug={ownerSlug}
                        canShop={canShop}
                        adding={addingId === item.sanPhamId}
                        onAdd={addItemToCart}
                        featured
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            {showItemResults ? (
              <>
                {addErr ? (
                  <p className="j-shop-sf-empty" role="alert">
                    {addErr}
                  </p>
                ) : null}
                <ul className="j-shop-sf-grid j-shop-sf-grid--feature">
                  {filteredItems.map((item) => (
                    <li key={item.sanPhamId}>
                      <ItemCard
                        item={item}
                        ownerSlug={ownerSlug}
                        canShop={canShop}
                        adding={addingId === item.sanPhamId}
                        onAdd={addItemToCart}
                      />
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            {hasAllTypes || showSearchTypeResults ? (
              <section className="j-shop-sf-group">
                <div className="j-shop-sf-group-head">
                  <p className="j-shop-sf-group-kicker">
                    {searchActive ? "Các loại hàng" : "Các hàng bán chạy"}
                  </p>
                </div>
                <ul className="j-shop-sf-grid">
                  {filteredCards.map((card) => (
                    <li key={card.id}>
                      <TypeCard card={card} ownerSlug={ownerSlug} />
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            </div>
          </div>
        )
      ) : shopClosed ? (
        <div className="j-shop-sf-catalog is-tam-dong is-empty-closed">
          <ShopTamDongOverlay shop={tamDongFields} />
        </div>
      ) : (
        <p className="j-shop-sf-empty">
          Cửa hàng chưa có sản phẩm đang bán.
        </p>
      )}
    </div>
  );
}
