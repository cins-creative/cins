"use client";

import { ChevronDown, Loader2, Minus, Plus, Search, ShoppingBag, Star, X } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useAuthGate } from "@/components/auth/AuthGateProvider";
import { ShopKioskBlock } from "@/components/shop/ShopKioskBlock";
import type {
  ShopGio,
  ShopGioDong,
  ShopPostHangItem,
  ShopStorefrontItem,
} from "@/lib/shop/types";
import {
  SHOP_NHAN_PHAN_LOAI_2_DEFAULT,
  SHOP_NHAN_PHAN_LOAI_DEFAULT,
} from "@/lib/shop/types";

const FILTER_ALL = "__all";
const FILTER_KHAC = "__khac";

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

/** Giá gốc gạch ngang — chỉ số, không đơn vị. */
function formatGiaSo(gia: number): string {
  const n = Number.isFinite(gia) ? gia : 0;
  return n.toLocaleString("vi-VN", {
    maximumFractionDigits: Number.isInteger(n) ? 0 : 2,
  });
}

type HeroChrome = {
  actions: ReactNode;
};

type Props = {
  ownerSlug: string;
  ownerId: string;
  /** `shop_cua_hang.id` — giỏ / đặt hàng theo cửa hàng. */
  cuaHangId: string | null;
  shopName: string;
  shopMoTa: string | null;
  shopAvatarUrl: string | null;
  shopCoverUrl: string | null;
  initials: string;
  /** Nhãn trục phân loại 1 (vd. Loại hàng). */
  nhanPhanLoai?: string;
  /** Nhãn trục phân loại 2 (vd. Game). */
  nhanPhanLoai2?: string;
  isOwner?: boolean;
  viewerProfileId?: string | null;
  /** Chủ shop: nút Quản lý / Kho / Đơn trên hero. */
  ownerChrome?: HeroChrome | null;
  /** Khách: Chia sẻ / Nhắn tin trên hero. */
  guestChrome?: HeroChrome | null;
};

type StorefrontCartLine = ShopGioDong;

function toHangItems(items: ShopStorefrontItem[]): ShopPostHangItem[] {
  const out: ShopPostHangItem[] = [];
  for (const [idx, it] of items.entries()) {
    if (!it.idBienThe || it.giaHienThi == null) continue;
    out.push({
      id: it.hangId ?? it.idBienThe,
      idBienThe: it.idBienThe,
      idSanPham: it.sanPhamId,
      tenSanPham: it.tenSanPham,
      nhanBienThe: it.nhanBienThe ?? "Mặc định",
      phanLoai: it.phanLoai,
      phanLoai2: it.phanLoai2,
      anhUrl: it.anhUrl,
      soLuongTon: it.soLuongTon,
      soLuongBan: it.soLuongBan,
      giaHienThi: it.giaHienThi,
      tienTe: it.tienTe,
      idBangGia: null,
      thuTu: idx,
      hetHang: it.hetHang,
    });
  }
  return out;
}

type PhanLoaiGroup = {
  key: string;
  label: string;
  items: ShopStorefrontItem[];
};

type FilterOption = {
  key: string;
  label: string;
};

function groupByPhanLoai(items: ShopStorefrontItem[]): PhanLoaiGroup[] {
  const map = new Map<string, ShopStorefrontItem[]>();
  for (const item of items) {
    const key = item.phanLoai?.trim() || "";
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }

  const named = [...map.entries()]
    .filter(([k]) => k !== "")
    .sort(([a], [b]) => a.localeCompare(b, "vi", { sensitivity: "base" }))
    .map(([key, groupItems]) => ({
      key,
      label: key,
      items: groupItems,
    }));

  const other = map.get("");
  if (other && other.length > 0) {
    named.push({
      key: FILTER_KHAC,
      label: named.length > 0 ? "Khác" : "Sản phẩm",
      items: other,
    });
  }
  return named;
}

function buildFilterOptions(
  items: ShopStorefrontItem[],
  getValue: (item: ShopStorefrontItem) => string | null | undefined,
): FilterOption[] {
  const named = new Set<string>();
  let hasOther = false;
  for (const item of items) {
    const key = getValue(item)?.trim() || "";
    if (key) named.add(key);
    else hasOther = true;
  }
  const options: FilterOption[] = [{ key: FILTER_ALL, label: "Tất cả" }];
  for (const label of [...named].sort((a, b) =>
    a.localeCompare(b, "vi", { sensitivity: "base" }),
  )) {
    options.push({ key: label, label });
  }
  if (hasOther && named.size > 0) {
    options.push({ key: FILTER_KHAC, label: "Khác" });
  }
  return options;
}

function applyAxisFilter(
  items: ShopStorefrontItem[],
  filter: string,
  getValue: (item: ShopStorefrontItem) => string | null | undefined,
): ShopStorefrontItem[] {
  if (filter === FILTER_ALL) return items;
  if (filter === FILTER_KHAC) {
    return items.filter((i) => !(getValue(i)?.trim()));
  }
  return items.filter((i) => (getValue(i)?.trim() || "") === filter);
}

function normalizeSearch(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

function applySearchFilter(
  items: ShopStorefrontItem[],
  query: string,
): ShopStorefrontItem[] {
  const q = normalizeSearch(query);
  if (!q) return items;
  return items.filter((i) => {
    const hay = normalizeSearch(
      [
        i.tenSanPham,
        i.nhanBienThe,
        i.phanLoai,
        i.phanLoai2,
      ]
        .filter(Boolean)
        .join(" "),
    );
    return hay.includes(q);
  });
}

function ProductCard({
  item,
  featured = false,
  qty,
  canShop,
  onPatchQty,
}: {
  item: ShopStorefrontItem;
  featured?: boolean;
  qty: number;
  canShop: boolean;
  onPatchQty: (item: ShopStorefrontItem, soLuong: number) => void;
}) {
  const nhanBienThe =
    item.nhanBienThe && item.nhanBienThe !== "Mặc định"
      ? item.nhanBienThe
      : null;
  const showLowStock =
    !item.hetHang &&
    Number.isFinite(item.soLuongTon) &&
    item.soLuongTon > 0 &&
    item.soLuongTon < 5;
  const canIncrease =
    canShop &&
    !item.hetHang &&
    item.idBienThe != null &&
    qty < item.soLuongTon;
  const canAddFirst =
    canShop &&
    !item.hetHang &&
    item.idBienThe != null &&
    item.soLuongTon > 0 &&
    item.giaHienThi != null;

  return (
    <div
      className={`j-shop-sf-card is-static${item.hetHang ? " is-soldout" : ""}${featured ? " is-feature" : ""}`}
    >
      <span className="j-shop-sf-card-media">
        {item.postHref ? (
          <Link
            href={item.postHref}
            className="j-shop-sf-card-media-link"
            aria-label={`Xem ${item.tenSanPham}`}
          >
            {item.anhUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.anhUrl} alt="" loading="lazy" />
            ) : (
              <span className="j-shop-sf-card-ph" aria-hidden />
            )}
          </Link>
        ) : item.anhUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.anhUrl} alt="" loading="lazy" />
        ) : (
          <span className="j-shop-sf-card-ph" aria-hidden />
        )}
        {featured ? (
          <span
            className="j-shop-sf-card-feature-badge"
            title="Ngôi sao"
            aria-label="Ngôi sao"
          >
            <Star size={18} strokeWidth={2} fill="currentColor" aria-hidden />
          </span>
        ) : null}
        {item.hetHang ? (
          <span className="j-shop-sf-soldout">Hết hàng</span>
        ) : showLowStock ? (
          <span className="j-shop-sf-low-stock">SL:{item.soLuongTon}</span>
        ) : null}
      </span>
      <span className="j-shop-sf-card-body">
        <span className="j-shop-sf-card-name">{item.tenSanPham}</span>
        {nhanBienThe ? (
          <span className="j-shop-sf-card-var">{nhanBienThe}</span>
        ) : null}
        {item.giaHienThi != null ? (
          <span className="j-shop-sf-card-price-row">
            {item.giaGoc != null ? (
              <span className="j-shop-sf-card-price-goc">
                {formatGiaSo(item.giaGoc)}
              </span>
            ) : null}
            <span
              className={`j-shop-sf-card-price${item.giaGoc != null ? " is-sale" : ""}`}
            >
              {formatGia(item.giaHienThi, item.tienTe)}
            </span>
          </span>
        ) : (
          <span className="j-shop-sf-card-price is-empty">Chưa có giá</span>
        )}
        {canShop ? (
          <span className="j-shop-sf-card-action">
            <span className="j-shop-sf-card-stock">Bán: {item.soLuongBan}</span>
            {qty > 0 ? (
              <span className="j-shop-sf-qty">
                <button
                  type="button"
                  aria-label="Bớt"
                  onClick={() => onPatchQty(item, qty - 1)}
                >
                  <Minus size={14} />
                </button>
                <span>{qty}</span>
                <button
                  type="button"
                  aria-label="Thêm"
                  disabled={!canIncrease}
                  title={
                    !canIncrease && !item.hetHang
                      ? `Tối đa ${item.soLuongTon} (tồn kho)`
                      : item.hetHang
                        ? "Hết hàng"
                        : undefined
                  }
                  onClick={() => onPatchQty(item, qty + 1)}
                >
                  <Plus size={14} />
                </button>
              </span>
            ) : (
              <button
                type="button"
                className="j-shop-sf-add"
                disabled={!canAddFirst}
                aria-label="Thêm vào giỏ"
                title={
                  item.hetHang
                    ? "Hết hàng"
                    : item.giaHienThi == null
                      ? "Chưa có giá"
                      : "Thêm vào giỏ"
                }
                onClick={() => onPatchQty(item, 1)}
              >
                <Plus size={14} strokeWidth={2.4} aria-hidden />
              </button>
            )}
          </span>
        ) : (
          <span className="j-shop-sf-card-action">
            <span className="j-shop-sf-card-stock">Bán: {item.soLuongBan}</span>
          </span>
        )}
      </span>
    </div>
  );
}

function ProductGrid({
  items,
  featured = false,
  qtyByBienThe,
  canShop,
  onPatchQty,
}: {
  items: ShopStorefrontItem[];
  featured?: boolean;
  qtyByBienThe: Map<string, number>;
  canShop: boolean;
  onPatchQty: (item: ShopStorefrontItem, soLuong: number) => void;
}) {
  return (
    <ul className={`j-shop-sf-grid${featured ? " j-shop-sf-grid--feature" : ""}`}>
      {items.map((item) => (
        <li key={item.sanPhamId}>
          <ProductCard
            item={item}
            featured={featured}
            qty={
              item.idBienThe ? (qtyByBienThe.get(item.idBienThe) ?? 0) : 0
            }
            canShop={canShop}
            onPatchQty={onPatchQty}
          />
        </li>
      ))}
    </ul>
  );
}

function FilterDropdown({
  axisLabel,
  options,
  value,
  onChange,
}: {
  axisLabel: string;
  options: FilterOption[];
  value: string;
  onChange: (key: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected =
    options.find((o) => o.key === value) ?? options[0] ?? { key: FILTER_ALL, label: "Tất cả" };
  const isFiltered = value !== FILTER_ALL;

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      const t = e.target;
      if (!(t instanceof Element)) return;
      if (t.closest(`[data-sf-filter="${axisLabel}"]`)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, axisLabel]);

  return (
    <div
      className="j-shop-sf-dd"
      data-sf-filter={axisLabel}
    >
      <button
        type="button"
        className={`j-shop-sf-dd-trigger${isFiltered ? " is-active" : ""}${open ? " is-open" : ""}`}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`Lọc theo ${axisLabel}`}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="j-shop-sf-dd-axis">{axisLabel}</span>
        <span className="j-shop-sf-dd-value">{selected.label}</span>
        <ChevronDown size={14} strokeWidth={2.25} aria-hidden />
      </button>
      {open ? (
        <div
          className="j-shop-sf-dd-panel"
          role="listbox"
          aria-label={axisLabel}
        >
          {options.map((opt) => (
            <button
              key={opt.key}
              type="button"
              role="option"
              aria-selected={value === opt.key}
              className={`j-shop-sf-dd-opt${value === opt.key ? " is-active" : ""}`}
              onClick={() => {
                onChange(opt.key);
                setOpen(false);
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
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
  initials,
  nhanPhanLoai = SHOP_NHAN_PHAN_LOAI_DEFAULT,
  nhanPhanLoai2 = SHOP_NHAN_PHAN_LOAI_2_DEFAULT,
  isOwner = false,
  viewerProfileId = null,
  ownerChrome = null,
  guestChrome = null,
}: Props) {
  const { openAuthModal } = useAuthGate();
  const [items, setItems] = useState<ShopStorefrontItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterLoai, setFilterLoai] = useState(FILTER_ALL);
  const [filterLoai2, setFilterLoai2] = useState(FILTER_ALL);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [cartLines, setCartLines] = useState<StorefrontCartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartErr, setCartErr] = useState<string | null>(null);
  const canShop = !isOwner && Boolean(cuaHangId);

  const applyGio = useCallback((gio: ShopGio) => {
    setCartLines(gio.dong);
  }, []);

  const refreshGio = useCallback(async () => {
    if (!canShop || !viewerProfileId || !cuaHangId) return;
    try {
      const gRes = await fetch(
        `/api/shop/gio?cuaHangId=${encodeURIComponent(cuaHangId)}`,
        { cache: "no-store" },
      );
      const gJson = (await gRes.json().catch(() => null)) as {
        gio?: ShopGio;
      } | null;
      if (gRes.ok && gJson?.gio) applyGio(gJson.gio);
    } catch {
      /* ignore */
    }
  }, [canShop, viewerProfileId, cuaHangId, applyGio]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setFilterLoai(FILTER_ALL);
      setFilterLoai2(FILTER_ALL);
      setSearch("");
      setCartLines([]);
      setCartErr(null);
      try {
        const res = await fetch(
          `/api/shop/cua-hang/mat-hang?slug=${encodeURIComponent(ownerSlug)}`,
          { cache: "no-store" },
        );
        const json = (await res.json().catch(() => null)) as {
          items?: ShopStorefrontItem[];
        } | null;
        const next = res.ok ? (json?.items ?? []) : [];
        if (!cancelled) setItems(next);

        if (
          !cancelled &&
          canShop &&
          viewerProfileId &&
          cuaHangId &&
          next.length > 0
        ) {
          try {
            const gRes = await fetch(
              `/api/shop/gio?cuaHangId=${encodeURIComponent(cuaHangId)}`,
              { cache: "no-store" },
            );
            const gJson = (await gRes.json().catch(() => null)) as {
              gio?: ShopGio;
            } | null;
            if (gRes.ok && gJson?.gio && !cancelled) {
              applyGio(gJson.gio);
            }
          } catch {
            /* ignore */
          }
        }
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ownerSlug, canShop, viewerProfileId, cuaHangId, applyGio]);

  const qtyByBienThe = useMemo(() => {
    const map = new Map<string, number>();
    for (const line of cartLines) map.set(line.idBienThe, line.soLuong);
    return map;
  }, [cartLines]);

  const cartCount = useMemo(
    () => cartLines.reduce((s, l) => s + l.soLuong, 0),
    [cartLines],
  );

  const hangItems = useMemo(() => toHangItems(items ?? []), [items]);

  const patchQty = useCallback(
    (item: ShopStorefrontItem, soLuong: number) => {
      if (!canShop || !cuaHangId) return;
      if (!viewerProfileId) {
        openAuthModal("Đăng nhập để thêm vào giỏ.");
        return;
      }
      if (!item.idBienThe || item.giaHienThi == null) {
        setCartErr("Sản phẩm chưa có giá — chưa thêm giỏ được.");
        return;
      }
      const qty = Math.max(0, Math.trunc(soLuong));
      const capped = item.soLuongTon > 0 ? Math.min(qty, item.soLuongTon) : 0;
      const idBienThe = item.idBienThe;

      setCartErr(null);
      setCartLines((prev) => {
        const without = prev.filter((l) => l.idBienThe !== idBienThe);
        if (capped <= 0) return without;
        return [
          ...without,
          {
            idBienThe,
            soLuong: capped,
            tenSanPham: item.tenSanPham,
            nhanBienThe: item.nhanBienThe ?? "Mặc định",
            giaHienThi: item.giaHienThi ?? 0,
            tienTe: item.tienTe,
            anhUrl: item.anhUrl,
            soLuongTon: item.soLuongTon,
          },
        ];
      });

      void (async () => {
        try {
          const res = await fetch("/api/shop/gio", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              cuaHangId,
              idBienThe,
              soLuong: capped,
            }),
          });
          const json = (await res.json().catch(() => null)) as {
            gio?: ShopGio;
            error?: string;
          } | null;
          if (!res.ok || !json?.gio) {
            setCartErr(json?.error ?? "Không cập nhật giỏ.");
            await refreshGio();
            return;
          }
          applyGio(json.gio);
        } catch {
          setCartErr("Không cập nhật giỏ.");
        }
      })();
    },
    [
      canShop,
      cuaHangId,
      viewerProfileId,
      openAuthModal,
      applyGio,
      refreshGio,
    ],
  );

  const openCartDialog = useCallback(() => {
    if (!viewerProfileId) {
      openAuthModal("Đăng nhập để xem giỏ.");
      return;
    }
    setCartOpen(true);
  }, [viewerProfileId, openAuthModal]);

  const filterOptions1 = useMemo(
    () => buildFilterOptions(items ?? [], (i) => i.phanLoai),
    [items],
  );
  const filterOptions2 = useMemo(
    () => buildFilterOptions(items ?? [], (i) => i.phanLoai2),
    [items],
  );

  const showFilter1 = filterOptions1.length > 2;
  const showFilter2 = filterOptions2.length > 2;
  const showFilters = showFilter1 || showFilter2;

  const { featured, groups, filteredCount } = useMemo(() => {
    const list = items ?? [];
    const afterSearch = applySearchFilter(list, deferredSearch);
    const after1 = applyAxisFilter(afterSearch, filterLoai, (i) => i.phanLoai);
    const filtered = applyAxisFilter(after1, filterLoai2, (i) => i.phanLoai2);
    const feat = filtered.filter((i) => i.noiBat);
    const rest = filtered.filter((i) => !i.noiBat);
    return {
      featured: feat,
      groups: groupByPhanLoai(rest),
      filteredCount: filtered.length,
    };
  }, [items, filterLoai, filterLoai2, deferredSearch]);

  const hasProducts = (items?.length ?? 0) > 0;
  const searchActive = deferredSearch.trim().length > 0;
  const showGroupHeads =
    filterLoai === FILTER_ALL &&
    filterLoai2 === FILTER_ALL &&
    !searchActive;

  return (
    <div className="j-shop-storefront">
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
            {ownerChrome?.actions ?? guestChrome?.actions}
          </div>
        </div>
      </header>

      <div className="j-shop-sf-section-head">
        <span className="j-tlb-streak-slow" aria-hidden="true" />
        <div className="j-shop-sf-section-tools">
          {!loading && hasProducts ? (
            <div className="j-shop-sf-dd-row">
              <label className="j-shop-sf-search">
                <Search size={14} strokeWidth={2.25} aria-hidden />
                <input
                  type="search"
                  value={search}
                  placeholder="Tìm sản phẩm…"
                  aria-label="Tìm sản phẩm"
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
              {showFilters ? (
                <>
                  {showFilter1 ? (
                    <FilterDropdown
                      axisLabel={nhanPhanLoai}
                      options={filterOptions1}
                      value={filterLoai}
                      onChange={setFilterLoai}
                    />
                  ) : null}
                  {showFilter2 ? (
                    <FilterDropdown
                      axisLabel={nhanPhanLoai2}
                      options={filterOptions2}
                      value={filterLoai2}
                      onChange={setFilterLoai2}
                    />
                  ) : null}
                </>
              ) : null}
            </div>
          ) : null}
          {canShop ? (
            <button
              type="button"
              className={`j-shop-sf-cart-btn${cartCount > 0 ? " has-items" : ""}${cartOpen ? " is-open" : ""}`}
              aria-expanded={cartOpen}
              aria-label="Giỏ hàng"
              onClick={openCartDialog}
            >
              <ShoppingBag size={33} strokeWidth={2} aria-hidden />
              {cartCount > 0 ? (
                <span className="j-shop-sf-cart-count">{cartCount}</span>
              ) : null}
            </button>
          ) : null}
        </div>
      </div>

      {cartErr ? (
        <p className="j-shop-sf-cart-err" role="alert">
          {cartErr}
        </p>
      ) : null}

      {canShop && cuaHangId ? (
        <ShopKioskBlock
          dialogOnly
          open={cartOpen}
          onOpenChange={(next) => {
            setCartOpen(next);
            if (!next) void refreshGio();
          }}
          initialTab="gio"
          cuaHangId={cuaHangId}
          hangItems={hangItems}
          sellerUserId={ownerId}
          viewerProfileId={viewerProfileId}
          sellerAvatarUrl={shopAvatarUrl}
          sellerName={shopName}
          sellerSlug={ownerSlug}
        />
      ) : null}

      {loading ? (
        <div className="j-shop-sf-loading" aria-busy="true">
          <Loader2 size={18} className="shop-spin" aria-hidden />
          Đang tải hàng…
        </div>
      ) : hasProducts ? (
        filteredCount > 0 ? (
          <div className="j-shop-sf-catalog">
            {featured.length > 0 ? (
              <section className="j-shop-sf-group j-shop-sf-group--feature">
                <div className="j-shop-sf-group-head">
                  <Star size={14} strokeWidth={2.25} aria-hidden />
                  <h4>Ngôi sao</h4>
                </div>
                <ProductGrid
                  items={featured}
                  featured
                  qtyByBienThe={qtyByBienThe}
                  canShop={canShop}
                  onPatchQty={patchQty}
                />
              </section>
            ) : null}

            {groups.map((group) => (
              <section key={group.key} className="j-shop-sf-group">
                {(groups.length > 1 || featured.length > 0) &&
                showGroupHeads ? (
                  <div className="j-shop-sf-group-head">
                    <h4>{group.label}</h4>
                  </div>
                ) : null}
                <ProductGrid
                  items={group.items}
                  qtyByBienThe={qtyByBienThe}
                  canShop={canShop}
                  onPatchQty={patchQty}
                />
              </section>
            ))}
          </div>
        ) : (
          <p className="j-shop-sf-empty">
            {searchActive
              ? "Không tìm thấy sản phẩm khớp."
              : "Không có sản phẩm trong mục này."}
          </p>
        )
      ) : (
        <p className="j-shop-sf-empty">
          Cửa hàng chưa có sản phẩm đang bán.
        </p>
      )}
    </div>
  );
}
