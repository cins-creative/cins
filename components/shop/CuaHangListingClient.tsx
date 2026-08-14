"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Check,
  LayoutGrid,
  Minus,
  Package,
  Plus,
  Search,
  SlidersHorizontal,
  Store,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import { useOptionalAuthGate } from "@/components/auth/AuthGateProvider";
import { useCinsChat } from "@/components/cins/CinsChatProvider";
import { CuaHangHubDeXuatDanhMuc } from "@/components/shop/CuaHangHubDeXuatDanhMuc";
import { CuaHangListCard } from "@/components/shop/CuaHangListCard";
import { ChListingImg } from "@/components/shop/ChListingImg";
import { CuaHangSanVoucher } from "@/components/shop/CuaHangSanVoucher";
import {
  GIO_CHUNG_CHANGED_EVENT,
  notifyGioChungAdded,
} from "@/components/shop/ShopGioChungButton";
import type { ShopGioChung } from "@/lib/shop/types";
import { trackShopThemGio } from "@/lib/social/track-su-kien";
import type { CuaHangHubTaxonomy } from "@/lib/shop/cua-hang-hub-taxonomy-types";
import type {
  PublicShopListingHang,
  PublicShopListingItem,
} from "@/lib/shop/cua-hang-listing-types";
import { shopLoaiHref, shopLoaiMauHref } from "@/lib/shop/cua-hang-href";
import {
  canonicalizeDanhMucSlug,
  canonicalizeDanhMucSlugs,
} from "@/lib/shop/danh-muc-constants";
import { parseShopThumbFit, type ShopThumbFit } from "@/lib/shop/anh-thumb-fit";
import { useChListLazyBatch, CH_LIST_SHOP_LAZY_BATCH } from "@/lib/shop/use-ch-list-lazy-batch";

type BrowseMode = "shop" | "mat-hang" | "hang";

type Props = {
  shops: PublicShopListingItem[];
  taxonomy: CuaHangHubTaxonomy;
  browseMode: BrowseMode;
};

function listingTabHref(
  mode: BrowseMode,
  searchParams: URLSearchParams,
): string {
  const base =
    mode === "shop"
      ? "/shopping/shops"
      : mode === "mat-hang"
        ? "/shopping/category"
        : "/shopping/products";
  const qs = searchParams.toString();
  return qs ? `${base}?${qs}` : base;
}

type HangHit = {
  key: string;
  shopId: string;
  ten: string;
  anhUrl: string | null;
  anhThumbFit: ShopThumbFit;
  shopTen: string;
  shopAvatarUrl: string | null;
  href: string;
  kind: "loai" | "mau";
  giaHienThi: number | null;
  tienTe: string;
  noiBat: boolean;
  soLuongBan: number;
  hetHang: boolean;
  dangTamDong: boolean;
  danhMucSlug: string | null;
  facets: Record<string, string[]>;
  coCombo: boolean;
  comboTag: string | null;
  /** Tên loại (`shop_nhom.nhan`) — mẫu thuộc loại nào. */
  tenLoai: string | null;
  idBienThe: string | null;
  soLuongTon: number;
  ownerId: string | null;
};

const LISTING_SEARCH_DEBOUNCE_MS = 300;

type FilterOption = {
  slug: string;
  ten: string;
  count: number;
  title?: string;
  group?: string | null;
  groupOrder?: number;
};

function normalizeQuery(raw: string): string {
  return raw.trim().toLocaleLowerCase("vi");
}

function textMatches(hay: string, q: string): boolean {
  return hay.toLocaleLowerCase("vi").includes(q);
}

function filterOptionMatches(option: FilterOption, q: string): boolean {
  if (!q) return true;
  if (textMatches(option.ten, q)) return true;
  if (option.title && textMatches(option.title, q)) return true;
  if (option.group && textMatches(option.group, q)) return true;
  return false;
}

function clusteredFilterOptions(
  options: FilterOption[],
): Array<{ key: string; label: string | null; items: FilterOption[] }> {
  if (!options.some((o) => o.group)) {
    return [{ key: "all", label: null, items: options }];
  }
  const buckets = new Map<
    string,
    { label: string | null; order: number; items: FilterOption[] }
  >();
  for (const o of options) {
    const key = o.group ?? "";
    const cur = buckets.get(key) ?? {
      label: o.group ?? null,
      order: o.groupOrder ?? 9999,
      items: [],
    };
    cur.items.push(o);
    buckets.set(key, cur);
  }
  return [...buckets.entries()]
    .sort(
      ([, a], [, b]) =>
        a.order - b.order ||
        (a.label ?? "я").localeCompare(b.label ?? "я", "vi"),
    )
    .map(([key, g]) => ({
      key: key || "orphans",
      label: g.label,
      items: g.items,
    }));
}

type FilterSectionDef = {
  key: string;
  label: string;
  emptyMeansAll?: boolean;
  allLabel?: string;
  options: FilterOption[];
  selected: string[];
  onToggle: (slug: string) => void;
  onSelectAll?: () => void;
};

function facetDisplayLabel(facet: { slug: string; ten: string }): string {
  if (facet.slug === "fandom") return "Loại hàng";
  return facet.ten;
}

function ListingFilterSection({
  label,
  options,
  selected,
  allLabel,
  emptyMeansAll = false,
  searchQuery = "",
  hideHead = false,
  extra,
  onToggle,
  onSelectAll,
}: {
  label: string;
  options: FilterOption[];
  selected: string[];
  allLabel?: string;
  emptyMeansAll?: boolean;
  searchQuery?: string;
  hideHead?: boolean;
  extra?: ReactNode;
  onToggle: (slug: string) => void;
  onSelectAll?: () => void;
}) {
  const q = normalizeQuery(searchQuery);
  const showAll =
    emptyMeansAll &&
    onSelectAll &&
    (!q || textMatches(allLabel ?? "Tất cả", q));
  const visibleOptions = q
    ? options.filter((o) => filterOptionMatches(o, q))
    : options;

  if (options.length === 0 && !emptyMeansAll) {
    return (
      <p className="ch-list-filter-overlay-no-match" role="status">
        Chưa có mục lọc trong «{label}».
      </p>
    );
  }

  if (!showAll && visibleOptions.length === 0) {
    return (
      <section
        className={`ch-list-filter-section${hideHead ? " is-tab-panel" : ""}`}
        aria-label={label}
      >
        <p className="ch-list-filter-overlay-no-match" role="status">
          {q
            ? `Không có mục khớp «${searchQuery.trim()}».`
            : `Chưa có mục lọc trong «${label}».`}
        </p>
        {extra ? (
          <div className="ch-list-filter-section-options">{extra}</div>
        ) : null}
      </section>
    );
  }

  return (
    <section
      className={`ch-list-filter-section${hideHead ? " is-tab-panel" : ""}`}
      aria-label={label}
    >
      {!hideHead ? (
        <div className="ch-list-filter-section-head">
          <span className="ch-list-filter-section-title">{label}</span>
          {selected.length > 0 ? (
            <span className="ch-list-filter-section-count">{selected.length}</span>
          ) : null}
        </div>
      ) : null}
      <div className="ch-list-filter-section-options">
        {showAll ? (
          <button
            type="button"
            role="option"
            aria-selected={selected.length === 0}
            className={`ch-list-filter-dd-option${
              selected.length === 0 ? " is-on" : ""
            }`}
            onClick={onSelectAll}
          >
            <span
              className={`ch-list-filter-dd-check${
                selected.length === 0 ? " is-on" : ""
              }`}
              aria-hidden
            >
              {selected.length === 0 ? (
                <Check size={11} strokeWidth={3} />
              ) : null}
            </span>
            <span className="ch-list-filter-dd-option-copy">
              <strong>{allLabel ?? "Tất cả"}</strong>
            </span>
          </button>
        ) : null}
        {clusteredFilterOptions(visibleOptions).map((cluster) => (
          <section
            key={cluster.key}
            className={`ch-list-filter-tree-group${cluster.label ? " has-parent" : ""}`}
            aria-label={cluster.label ?? undefined}
          >
            {cluster.label ? (
              <header className="ch-list-filter-tree-head">
                <h3 className="ch-list-filter-tree-parent">{cluster.label}</h3>
              </header>
            ) : null}
            <div className="ch-list-filter-tree-leaves">
              {cluster.items.map((o) => {
                const on = selected.includes(o.slug);
                return (
                  <button
                    key={o.slug}
                    type="button"
                    role="option"
                    aria-selected={on}
                    title={
                      cluster.label
                        ? `${cluster.label} · ${o.ten}`
                        : (o.title ?? o.ten)
                    }
                    className={`ch-list-filter-dd-option${on ? " is-on" : ""}`}
                    onClick={() => onToggle(o.slug)}
                  >
                    <span
                      className={`ch-list-filter-dd-check${on ? " is-on" : ""}`}
                      aria-hidden
                    >
                      {on ? <Check size={11} strokeWidth={3} /> : null}
                    </span>
                    <span className="ch-list-filter-dd-option-copy">
                      <strong>{o.ten}</strong>
                    </span>
                    {o.count > 0 ? (
                      <span className="ch-list-filter-option-count">
                        {o.count}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
        {extra}
      </div>
    </section>
  );
}

function ListingFiltersPopover({
  taxonomy,
  visibleDanhMuc,
  danhMucCounts,
  facetCounts,
  selectedDanhMuc,
  selectedFacets,
  hasTaxonomyFilter,
  onToggleDanhMuc,
  onSelectAllDanhMuc,
  onToggleFacetValue,
  onClearTaxonomy,
}: {
  taxonomy: CuaHangHubTaxonomy;
  visibleDanhMuc: CuaHangHubTaxonomy["danhMuc"];
  danhMucCounts: Map<string, number>;
  facetCounts: Record<string, Map<string, number>>;
  selectedDanhMuc: string[];
  selectedFacets: Record<string, string[]>;
  hasTaxonomyFilter: boolean;
  onToggleDanhMuc: (slug: string) => void;
  onSelectAllDanhMuc: () => void;
  onToggleFacetValue: (
    facetSlug: string,
    valueSlug: string,
    single: boolean,
  ) => void;
  onClearTaxonomy: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [filterSearch, setFilterSearch] = useState("");
  const [activeTab, setActiveTab] = useState<string>("");
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const panelId = useId();
  const titleId = useId();
  const searchId = useId();
  const tabsId = useId();

  const visibleFacets = useMemo(
    () =>
      taxonomy.facets
        .map((facet) => {
          const counts = facetCounts[facet.slug] ?? new Map();
          const visible = facet.giaTri.filter(
            (g) => (counts.get(g.slug) ?? 0) > 0,
          );
          return visible.length > 0 ? { facet, visible, counts } : null;
        })
        .filter(Boolean) as Array<{
        facet: CuaHangHubTaxonomy["facets"][number];
        visible: CuaHangHubTaxonomy["facets"][number]["giaTri"];
        counts: Map<string, number>;
      }>,
    [taxonomy.facets, facetCounts],
  );

  const hasOptions = visibleDanhMuc.length > 0 || visibleFacets.length > 0;

  const activeCount = useMemo(() => {
    let n = selectedDanhMuc.length;
    for (const vals of Object.values(selectedFacets)) n += vals.length;
    return n;
  }, [selectedDanhMuc, selectedFacets]);

  const filterSections = useMemo((): FilterSectionDef[] => {
    const cols: FilterSectionDef[] = [];

    if (visibleDanhMuc.length > 0) {
      cols.push({
        key: "danh-muc",
        label: "Danh mục",
        emptyMeansAll: true,
        allLabel: "Tất cả",
        options: [...visibleDanhMuc]
          .sort(
            (a, b) =>
              (a.chaThuTu ?? 999) - (b.chaThuTu ?? 999) ||
              a.thuTu - b.thuTu ||
              a.ten.localeCompare(b.ten, "vi"),
          )
          .map((d) => ({
            slug: d.slug,
            ten: d.ten,
            count: danhMucCounts.get(d.slug) ?? 0,
            group: d.chaTen ?? "Không nhóm",
            groupOrder: d.chaThuTu ?? 999,
          })),
        selected: selectedDanhMuc,
        onToggle: onToggleDanhMuc,
        onSelectAll: onSelectAllDanhMuc,
      });
    }

    const fandomFacet = visibleFacets.find(({ facet }) => facet.slug === "fandom");
    const otherFacets = visibleFacets.filter(
      ({ facet }) => facet.slug !== "fandom",
    );

    for (const { facet, visible, counts } of [
      ...(fandomFacet ? [fandomFacet] : []),
      ...otherFacets,
    ]) {
      const selected = selectedFacets[facet.slug] ?? [];
      cols.push({
        key: facet.slug,
        label: facetDisplayLabel(facet),
        options: visible.map((g) => ({
          slug: g.slug,
          ten: g.ten,
          count: counts.get(g.slug) ?? 0,
          title: g.nhom ? `${g.ten} · ${g.nhom}` : g.ten,
          group: g.nhom,
        })),
        selected,
        onToggle: (slug) =>
          onToggleFacetValue(facet.slug, slug, facet.kieu === "chon_mot"),
      });
    }

    return cols;
  }, [
    visibleDanhMuc,
    visibleFacets,
    danhMucCounts,
    selectedDanhMuc,
    selectedFacets,
    onToggleDanhMuc,
    onSelectAllDanhMuc,
    onToggleFacetValue,
  ]);

  const activeChips = useMemo(() => {
    const chips: Array<{ key: string; label: string; onRemove: () => void }> =
      [];
    for (const slug of selectedDanhMuc) {
      const dm = visibleDanhMuc.find((d) => d.slug === slug);
      if (!dm) continue;
      chips.push({
        key: `dm:${slug}`,
        label: dm.ten,
        onRemove: () => onToggleDanhMuc(slug),
      });
    }
    for (const section of filterSections) {
      if (section.key === "danh-muc") continue;
      for (const slug of section.selected) {
        const opt = section.options.find((o) => o.slug === slug);
        if (!opt) continue;
        chips.push({
          key: `${section.key}:${slug}`,
          label: opt.ten,
          onRemove: () => section.onToggle(slug),
        });
      }
    }
    return chips;
  }, [selectedDanhMuc, visibleDanhMuc, filterSections, onToggleDanhMuc]);

  const activeSection =
    filterSections.find((s) => s.key === activeTab) ?? filterSections[0] ?? null;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setFilterSearch("");
      return;
    }
    if (
      filterSections.length > 0 &&
      !filterSections.some((s) => s.key === activeTab)
    ) {
      setActiveTab(filterSections[0]!.key);
    }
    const t = window.setTimeout(() => searchRef.current?.focus(), 48);
    return () => window.clearTimeout(t);
  }, [open, filterSections, activeTab]);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!hasOptions) return null;

  const searchPlaceholder = activeSection
    ? `Tìm trong ${activeSection.label.toLocaleLowerCase("vi")}…`
    : "Tìm trong bộ lọc…";

  const overlay =
    open && mounted
      ? createPortal(
          <div
            className="ch-list-filter-overlay-backdrop"
            role="presentation"
            onClick={(e) => {
              if (e.target === e.currentTarget) setOpen(false);
            }}
          >
            <div
              className="ch-list-filter-overlay"
              id={panelId}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              onClick={(e) => e.stopPropagation()}
            >
              <header className="ch-list-filter-overlay-head">
                <div className="ch-list-filter-overlay-head-row">
                  <h2 id={titleId} className="ch-list-filter-overlay-title">
                    Bộ lọc
                    {activeCount > 0 ? (
                      <span className="ch-list-filter-dd-badge">{activeCount}</span>
                    ) : null}
                  </h2>
                  <button
                    type="button"
                    className="ch-list-filter-overlay-close"
                    aria-label="Đóng bộ lọc"
                    onClick={() => setOpen(false)}
                  >
                    <X size={18} strokeWidth={2.2} aria-hidden />
                  </button>
                </div>

                <div
                  className="ch-list-filter-tabs"
                  role="tablist"
                  aria-label="Nhóm bộ lọc"
                  id={tabsId}
                  style={{
                    gridTemplateColumns: `repeat(${Math.max(filterSections.length, 1)}, minmax(0, 1fr))`,
                  }}
                >
                  {filterSections.map((section) => {
                    const selected = section.key === activeSection?.key;
                    const count = section.selected.length;
                    return (
                      <button
                        key={section.key}
                        type="button"
                        role="tab"
                        aria-selected={selected}
                        className={`ch-list-filter-tab${selected ? " is-active" : ""}`}
                        onClick={() => {
                          setActiveTab(section.key);
                          setFilterSearch("");
                        }}
                      >
                        <span>{section.label}</span>
                        {count > 0 ? (
                          <span className="ch-list-filter-tab-count">{count}</span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>

                <label className="ch-list-filter-overlay-search" htmlFor={searchId}>
                  <Search size={16} strokeWidth={2.2} aria-hidden />
                  <input
                    ref={searchRef}
                    id={searchId}
                    type="search"
                    value={filterSearch}
                    onChange={(e) => setFilterSearch(e.target.value)}
                    placeholder={searchPlaceholder}
                    autoComplete="off"
                    spellCheck={false}
                    aria-label={searchPlaceholder}
                  />
                  {filterSearch ? (
                    <button
                      type="button"
                      className="ch-list-filter-overlay-search-clear"
                      aria-label="Xóa tìm kiếm"
                      onClick={() => {
                        setFilterSearch("");
                        searchRef.current?.focus();
                      }}
                    >
                      <X size={14} strokeWidth={2.4} aria-hidden />
                    </button>
                  ) : null}
                </label>

                {activeChips.length > 0 ? (
                  <div
                    className="ch-list-filter-overlay-chips"
                    aria-label="Đang lọc"
                  >
                    {activeChips.map((chip) => (
                      <button
                        key={chip.key}
                        type="button"
                        className="ch-list-filter-chip"
                        onClick={chip.onRemove}
                      >
                        <span>{chip.label}</span>
                        <X size={12} strokeWidth={2.5} aria-hidden />
                      </button>
                    ))}
                  </div>
                ) : null}
              </header>

              <div
                className="ch-list-filter-overlay-body"
                role="tabpanel"
                aria-labelledby={tabsId}
              >
                {activeSection ? (
                  <ListingFilterSection
                    key={activeSection.key}
                    label={activeSection.label}
                    options={activeSection.options}
                    selected={activeSection.selected}
                    allLabel={activeSection.allLabel}
                    emptyMeansAll={activeSection.emptyMeansAll}
                    searchQuery={filterSearch}
                    hideHead
                    extra={
                      activeSection.key === "danh-muc" ? (
                        <CuaHangHubDeXuatDanhMuc searchQuery={filterSearch} />
                      ) : null
                    }
                    onToggle={activeSection.onToggle}
                    onSelectAll={activeSection.onSelectAll}
                  />
                ) : (
                  <p className="ch-list-filter-overlay-no-match" role="status">
                    Chưa có mục lọc.
                  </p>
                )}
              </div>

              <footer className="ch-list-filter-overlay-foot">
                <button
                  type="button"
                  className="ch-list-filter-foot-btn is-ghost"
                  disabled={!hasTaxonomyFilter}
                  onClick={onClearTaxonomy}
                >
                  Xóa lọc
                </button>
                <button
                  type="button"
                  className="ch-list-filter-foot-btn is-primary"
                  onClick={() => setOpen(false)}
                >
                  Xong
                </button>
              </footer>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="ch-list-filter-dd" ref={rootRef}>
      <button
        type="button"
        className={`ch-list-filter-dd-trigger${open ? " is-open" : ""}${
          activeCount > 0 ? " has-value" : ""
        }`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={activeCount > 0 ? `Bộ lọc (${activeCount})` : "Bộ lọc"}
        onClick={() => setOpen((v) => !v)}
      >
        <SlidersHorizontal size={14} strokeWidth={2.2} aria-hidden />
        <span className="ch-list-filter-dd-summary">Bộ lọc</span>
        {activeCount > 0 ? (
          <span className="ch-list-filter-dd-badge" aria-hidden>
            {activeCount}
          </span>
        ) : null}
      </button>
      {overlay}
    </div>
  );
}

function formatHangGia(gia: number | null, tienTe: string): string | null {
  if (gia == null) return null;
  return `${gia.toLocaleString("vi-VN")} ${tienTe || "VND"}`;
}

function shopHasUuDai(shop: PublicShopListingItem): boolean {
  return shop.coVoucher === true || shop.coCombo === true;
}

function shopProfileMatches(shop: PublicShopListingItem, q: string): boolean {
  return [shop.ten, shop.moTa, shop.ownerTen, shop.ownerSlug, shop.shopSlug]
    .filter(Boolean)
    .some((part) => textMatches(String(part), q));
}

function hangMatchesQuery(hang: PublicShopListingHang, q: string): boolean {
  if (textMatches(hang.ten, q)) return true;
  if (hang.tenLoai && textMatches(hang.tenLoai, q)) return true;
  return false;
}

function shopMatchesQuery(shop: PublicShopListingItem, q: string): boolean {
  if (!q) return true;
  if (shopProfileMatches(shop, q)) return true;
  if (shop.catalogHang.some((h) => hangMatchesQuery(h, q))) return true;
  if (shop.catalogMau.some((m) => hangMatchesQuery(m, q))) return true;
  return false;
}

function hangFromLoai(
  shop: PublicShopListingItem,
  hang: PublicShopListingHang,
): HangHit {
  return {
    key: `loai:${shop.id}:${hang.id}`,
    shopId: shop.id,
    ten: hang.ten,
    anhUrl: hang.anhUrl,
    anhThumbFit: parseShopThumbFit(hang.anhThumbFit),
    shopTen: shop.ten,
    shopAvatarUrl: shop.avatarUrl,
    href: shopLoaiHref(shop.ownerSlug, shop.shopSlug, hang.id),
    kind: "loai",
    giaHienThi: hang.giaHienThi ?? null,
    tienTe: hang.tienTe ?? "VND",
    noiBat: hang.noiBat === true,
    soLuongBan: Math.max(0, Math.trunc(hang.soLuongBan ?? 0)),
    hetHang: hang.hetHang === true,
    dangTamDong: shop.dangTamDong === true,
    danhMucSlug: hang.danhMucSlug ?? null,
    facets: hang.facets ?? {},
    coCombo: hang.coCombo === true,
    comboTag: hang.comboTag ?? null,
    tenLoai: null,
    idBienThe: hang.idBienThe ?? null,
    soLuongTon: Math.max(0, Math.trunc(hang.soLuongTon ?? 0)),
    ownerId: shop.ownerId ?? null,
  };
}

function hangFromMau(
  shop: PublicShopListingItem,
  mau: PublicShopListingHang,
): HangHit {
  const href = mau.idNhom
    ? shopLoaiMauHref(shop.ownerSlug, shop.shopSlug, mau.idNhom, mau.id)
    : shop.href;
  return {
    key: `mau:${shop.id}:${mau.id}`,
    shopId: shop.id,
    ten: mau.ten,
    anhUrl: mau.anhUrl,
    anhThumbFit: parseShopThumbFit(mau.anhThumbFit),
    shopTen: shop.ten,
    shopAvatarUrl: shop.avatarUrl,
    href,
    kind: "mau",
    giaHienThi: mau.giaHienThi ?? null,
    tienTe: mau.tienTe ?? "VND",
    noiBat: false,
    soLuongBan: Math.max(0, Math.trunc(mau.soLuongBan ?? 0)),
    hetHang: mau.hetHang === true,
    dangTamDong: shop.dangTamDong === true,
    danhMucSlug: mau.danhMucSlug ?? null,
    facets: mau.facets ?? {},
    coCombo: mau.coCombo === true,
    comboTag: mau.comboTag ?? null,
    tenLoai: resolveTenLoai(shop, mau),
    idBienThe: mau.idBienThe ?? null,
    soLuongTon: Math.max(0, Math.trunc(mau.soLuongTon ?? 0)),
    ownerId: shop.ownerId ?? null,
  };
}

function resolveTenLoai(
  shop: PublicShopListingItem,
  mau: PublicShopListingHang,
): string | null {
  const attached = mau.tenLoai?.trim();
  if (attached) return attached;
  const idNhom = mau.idNhom?.trim();
  if (!idNhom) return null;
  const ten = shop.catalogHang.find((h) => h.id === idNhom)?.ten?.trim();
  return ten || null;
}

/** Giống quầy: đang bán → còn hàng → bán chạy → có ảnh → nổi bật. */
function compareHangPriority(a: HangHit, b: HangHit): number {
  if (a.dangTamDong !== b.dangTamDong) return a.dangTamDong ? 1 : -1;
  if (a.hetHang !== b.hetHang) return a.hetHang ? 1 : -1;
  if (a.soLuongBan !== b.soLuongBan) return b.soLuongBan - a.soLuongBan;
  const aImg = a.anhUrl ? 0 : 1;
  const bImg = b.anhUrl ? 0 : 1;
  if (aImg !== bImg) return aImg - bImg;
  if (a.noiBat !== b.noiBat) return a.noiBat ? -1 : 1;
  return a.ten.localeCompare(b.ten, "vi", { sensitivity: "base" });
}

/**
 * Mỗi shop một hàng đợi (đã sort ưu tiên) → round-robin để không dump
 * liên tục một shop. Shop có item «tốt» hơn đi trước trong mỗi vòng.
 */
function interleaveByShop(hits: HangHit[]): HangHit[] {
  if (hits.length <= 1) return hits;

  const queues = new Map<string, HangHit[]>();
  for (const hit of hits) {
    const list = queues.get(hit.shopId) ?? [];
    list.push(hit);
    queues.set(hit.shopId, list);
  }

  const shopQueues = [...queues.values()].map((list) =>
    [...list].sort(compareHangPriority),
  );
  shopQueues.sort((a, b) => compareHangPriority(a[0]!, b[0]!));

  const out: HangHit[] = [];
  let progress = true;
  while (progress) {
    progress = false;
    for (const q of shopQueues) {
      if (q.length === 0) continue;
      out.push(q.shift()!);
      progress = true;
    }
  }
  return out;
}

function collectMatHangHits(
  shops: PublicShopListingItem[],
  q: string,
): HangHit[] {
  const hits: HangHit[] = [];
  for (const shop of shops) {
    const loai = shop.catalogHang;
    if (loai.length > 0) {
      for (const hang of loai) {
        if (q && !hangMatchesQuery(hang, q)) continue;
        hits.push(hangFromLoai(shop, hang));
      }
      if (!q) continue;
    }
    /* Browse: shop không loại → mẫu. Search: thêm mẫu khớp tên. */
    if (q || loai.length === 0) {
      for (const mau of shop.catalogMau) {
        if (q && !hangMatchesQuery(mau, q)) continue;
        hits.push(hangFromMau(shop, mau));
      }
    }
  }
  return interleaveByShop(hits);
}

function collectHangHits(
  shops: PublicShopListingItem[],
  q: string,
): HangHit[] {
  const hits: HangHit[] = [];
  for (const shop of shops) {
    for (const mau of shop.catalogMau) {
      if (q && !hangMatchesQuery(mau, q)) continue;
      hits.push(hangFromMau(shop, mau));
    }
  }
  return interleaveByShop(hits);
}

function mergeListingShops(
  base: PublicShopListingItem[],
  extra: PublicShopListingItem[],
): PublicShopListingItem[] {
  if (extra.length === 0) return base;
  const byId = new Map<string, PublicShopListingItem>();
  for (const s of base) byId.set(s.id, s);
  for (const s of extra) {
    const cur = byId.get(s.id);
    if (!cur) {
      byId.set(s.id, s);
      continue;
    }
    const hangIds = new Set(cur.catalogHang.map((h) => h.id));
    const mauIds = new Set(cur.catalogMau.map((m) => m.id));
    let catalogHang = cur.catalogHang;
    let catalogMau = cur.catalogMau;
    let changed = false;
    for (const h of s.catalogHang) {
      if (hangIds.has(h.id)) continue;
      if (!changed) {
        catalogHang = [...cur.catalogHang];
        catalogMau = [...cur.catalogMau];
        changed = true;
      }
      hangIds.add(h.id);
      catalogHang.push(h);
    }
    for (const m of s.catalogMau) {
      if (mauIds.has(m.id)) continue;
      if (!changed) {
        catalogHang = [...cur.catalogHang];
        catalogMau = [...cur.catalogMau];
        changed = true;
      }
      mauIds.add(m.id);
      catalogMau.push(m);
    }
    if (changed) byId.set(s.id, { ...cur, catalogHang, catalogMau });
  }
  return [...byId.values()];
}

function parseCsvParam(raw: string | null): string[] {
  if (!raw?.trim()) return [];
  return [
    ...new Set(
      raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ];
}

function parseDanhMucParam(raw: string | null): string[] {
  return canonicalizeDanhMucSlugs(parseCsvParam(raw));
}

function hangMatchesTaxonomy(
  hit: HangHit,
  danhMuc: string[],
  facets: Record<string, string[]>,
): boolean {
  if (danhMuc.length > 0) {
    const hitSlug = hit.danhMucSlug
      ? canonicalizeDanhMucSlug(hit.danhMucSlug)
      : null;
    if (!hitSlug || !danhMuc.includes(hitSlug)) return false;
  }
  for (const [facetSlug, values] of Object.entries(facets)) {
    if (!values.length) continue;
    const hitVals = hit.facets[facetSlug] ?? [];
    if (!values.some((v) => hitVals.includes(v))) return false;
  }
  return true;
}

function ListingSearchSkeletons({
  kind,
  count,
}: {
  kind: "hang" | "shop";
  count: number;
}) {
  const cls =
    kind === "hang"
      ? "ch-list-hang-card ch-list-hang-card--skeleton"
      : "ch-list-card ch-list-card--skeleton";
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div key={`search-sk-${i}`} className={cls} aria-hidden />
      ))}
    </>
  );
}

const LISTING_QTY_SYNC_MS = 200;

function qtyMapFromGio(gio: ShopGioChung | null | undefined): Map<string, number> {
  const map = new Map<string, number>();
  if (!gio) return map;
  for (const n of gio.nhom) {
    for (const d of n.dong) map.set(d.idBienThe, d.soLuong);
  }
  return map;
}

function useListingHangCart() {
  const { viewerProfileId } = useCinsChat();
  const authGate = useOptionalAuthGate();
  const [qtyByBt, setQtyByBt] = useState<Map<string, number>>(() => new Map());
  const pendingQtyRef = useRef(new Map<string, number>());
  const syncTimersRef = useRef(
    new Map<string, ReturnType<typeof setTimeout>>(),
  );
  const qtyEpochRef = useRef(new Map<string, number>());

  const applyGio = useCallback((gio: ShopGioChung | null | undefined) => {
    const map = qtyMapFromGio(gio);
    for (const [bt, q] of pendingQtyRef.current) {
      if (q <= 0) map.delete(bt);
      else map.set(bt, q);
    }
    setQtyByBt(map);
  }, []);

  const refreshGio = useCallback(async () => {
    if (!viewerProfileId) return;
    try {
      const res = await fetch("/api/shop/shared-cart", { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as {
        gio?: ShopGioChung;
      } | null;
      if (!res.ok || !json?.gio) return;
      applyGio(json.gio);
    } catch {
      /* ignore */
    }
  }, [viewerProfileId, applyGio]);

  useEffect(() => {
    void refreshGio();
    const onChange = () => {
      void refreshGio();
    };
    window.addEventListener(GIO_CHUNG_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(GIO_CHUNG_CHANGED_EVENT, onChange);
  }, [refreshGio]);

  useEffect(() => {
    const timers = syncTimersRef.current;
    return () => {
      for (const t of timers.values()) clearTimeout(t);
      timers.clear();
    };
  }, []);

  const flushQtySync = useCallback(async (idBienThe: string) => {
    const soLuong = pendingQtyRef.current.get(idBienThe);
    if (soLuong === undefined) return;
    pendingQtyRef.current.delete(idBienThe);
    const epoch = qtyEpochRef.current.get(idBienThe) ?? 0;
    try {
      const res = await fetch("/api/shop/shared-cart", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idBienThe, soLuong }),
      });
      const json = (await res.json().catch(() => null)) as {
        gio?: ShopGioChung;
      } | null;
      if ((qtyEpochRef.current.get(idBienThe) ?? 0) !== epoch) return;
      if (!res.ok || !json?.gio) {
        await refreshGio();
        return;
      }
      applyGio(json.gio);
      window.dispatchEvent(new Event(GIO_CHUNG_CHANGED_EVENT));
    } catch {
      if ((qtyEpochRef.current.get(idBienThe) ?? 0) !== epoch) return;
      await refreshGio();
    }
  }, [applyGio, refreshGio]);

  const patchQty = useCallback(
    (hit: HangHit, soLuong: number) => {
      if (!viewerProfileId) {
        authGate?.openAuthModal("Đăng nhập để thêm vào giỏ.");
        return;
      }
      const idBienThe = hit.idBienThe;
      if (!idBienThe) return;
      const cap = Math.max(0, hit.soLuongTon);
      const qty = Math.min(Math.max(0, Math.trunc(soLuong)), cap);
      qtyEpochRef.current.set(
        idBienThe,
        (qtyEpochRef.current.get(idBienThe) ?? 0) + 1,
      );
      let shouldNotify = false;
      setQtyByBt((prev) => {
        const prevQty = prev.get(idBienThe) ?? 0;
        shouldNotify = qty > prevQty;
        const next = new Map(prev);
        if (qty <= 0) next.delete(idBienThe);
        else next.set(idBienThe, qty);
        return next;
      });
      if (shouldNotify) {
        notifyGioChungAdded();
        if (hit.kind === "mau") {
          trackShopThemGio(hit.key.split(":").pop() ?? hit.key);
        }
      }
      pendingQtyRef.current.set(idBienThe, qty);
      const prevTimer = syncTimersRef.current.get(idBienThe);
      if (prevTimer) clearTimeout(prevTimer);
      syncTimersRef.current.set(
        idBienThe,
        setTimeout(() => {
          syncTimersRef.current.delete(idBienThe);
          void flushQtySync(idBienThe);
        }, LISTING_QTY_SYNC_MS),
      );
    },
    [viewerProfileId, authGate, flushQtySync],
  );

  return { viewerProfileId, qtyByBt, patchQty };
}

function HangHitCard({
  hit,
  qty,
  onQty,
  isOwnShop,
}: {
  hit: HangHit;
  qty: number;
  onQty: (hit: HangHit, next: number) => void;
  isOwnShop: boolean;
}) {
  const giaLabel = formatHangGia(hit.giaHienThi, hit.tienTe);
  const sold = hit.soLuongBan > 0 ? hit.soLuongBan : 0;
  const tenLoai =
    hit.kind === "mau" &&
    hit.tenLoai &&
    hit.tenLoai.localeCompare(hit.ten, "vi", { sensitivity: "base" }) !== 0
      ? hit.tenLoai
      : null;
  const showCart =
    hit.kind === "mau" && Boolean(hit.idBienThe) && !hit.dangTamDong && !isOwnShop;
  const canBuy = showCart && !hit.hetHang && hit.giaHienThi != null;
  const maxQty = Math.max(0, hit.soLuongTon);

  return (
    <article
      className={`ch-list-hang-card${hit.hetHang ? " is-soldout" : ""}`}
    >
      <Link href={hit.href} className="ch-list-hang-card-link">
        {hit.anhUrl ? (
          <span className="ch-list-hang-card-thumb">
            <ChListingImg
              src={hit.anhUrl}
              variant="thumbnail"
              fit={hit.anhThumbFit}
              protect
            />
          </span>
        ) : (
          <span className="ch-list-hang-card-thumb is-empty" aria-hidden>
            {hit.ten.charAt(0).toUpperCase()}
          </span>
        )}
        <div className="ch-list-hang-card-body">
          <div className="ch-list-hang-card-name">{hit.ten}</div>
          {tenLoai ? (
            <div className="ch-list-hang-card-loai" title={tenLoai}>
              {tenLoai}
            </div>
          ) : null}
          {giaLabel || hit.comboTag || sold > 0 ? (
            <div className="ch-list-hang-card-foot">
              {giaLabel ? <strong>{giaLabel}</strong> : null}
              {hit.comboTag ? (
                <span className="ch-list-hang-combo-tag">{hit.comboTag}</span>
              ) : null}
              {sold > 0 ? (
                <span className="ch-list-hang-card-sold">
                  Đã bán: {sold.toLocaleString("vi-VN")}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </Link>
      <div className="ch-list-hang-card-action">
        <span className="ch-list-hang-card-seller">
          <span className="ch-list-hang-card-seller-avatar" aria-hidden>
            {hit.shopAvatarUrl ? (
              <ChListingImg src={hit.shopAvatarUrl} variant="avatar" />
            ) : (
              hit.shopTen.charAt(0).toUpperCase()
            )}
          </span>
          <span className="ch-list-hang-card-seller-name">{hit.shopTen}</span>
        </span>
        {showCart ? (
          qty > 0 ? (
            <span className="ch-list-hang-qty">
              <button
                type="button"
                aria-label="Bớt"
                onClick={() => onQty(hit, qty - 1)}
              >
                <Minus size={12} strokeWidth={2.5} aria-hidden />
              </button>
              <span>{qty}</span>
              <button
                type="button"
                aria-label="Thêm"
                disabled={maxQty > 0 && qty >= maxQty}
                onClick={() => onQty(hit, qty + 1)}
              >
                <Plus size={12} strokeWidth={2.5} aria-hidden />
              </button>
            </span>
          ) : (
            <button
              type="button"
              className="ch-list-hang-add"
              disabled={!canBuy}
              aria-label={`Thêm ${hit.ten} vào giỏ`}
              title={hit.hetHang ? "Hết hàng" : "Thêm vào giỏ"}
              onClick={() => onQty(hit, 1)}
            >
              <Plus size={15} strokeWidth={2.5} aria-hidden />
            </button>
          )
        ) : null}
      </div>
    </article>
  );
}

export function CuaHangListingClient({
  shops,
  taxonomy,
  browseMode,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { viewerProfileId, qtyByBt, patchQty } = useListingHangCart();
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [discountOnly, setDiscountOnly] = useState(false);
  const [selectedDanhMuc, setSelectedDanhMuc] = useState<string[]>(() =>
    parseDanhMucParam(searchParams.get("danhMuc")),
  );
  const [selectedFacets, setSelectedFacets] = useState<
    Record<string, string[]>
  >(() => {
    const init: Record<string, string[]> = {};
    for (const f of taxonomy.facets) {
      const vals = parseCsvParam(searchParams.get(f.slug));
      if (vals.length) init[f.slug] = vals;
    }
    return init;
  });

  const q = normalizeQuery(query);
  const searching = Boolean(q);
  const showMatHang = browseMode === "mat-hang";
  const showHang = browseMode === "hang";
  const showProductGrid = showMatHang || showHang;
  const [remoteShops, setRemoteShops] = useState<PublicShopListingItem[]>([]);
  const [remoteSearching, setRemoteSearching] = useState(false);

  useEffect(() => {
    if (!searchOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSearchOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const t = window.setTimeout(() => searchInputRef.current?.focus(), 40);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.clearTimeout(t);
    };
  }, [searchOpen]);

  const syncUrl = useCallback(
    (danhMuc: string[], facets: Record<string, string[]>) => {
      const params = new URLSearchParams(searchParams.toString());
      if (danhMuc.length) params.set("danhMuc", danhMuc.join(","));
      else params.delete("danhMuc");
      for (const f of taxonomy.facets) {
        const vals = facets[f.slug] ?? [];
        if (vals.length) params.set(f.slug, vals.join(","));
        else params.delete(f.slug);
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams, taxonomy.facets],
  );

  useEffect(() => {
    setSelectedDanhMuc(parseDanhMucParam(searchParams.get("danhMuc")));
    const next: Record<string, string[]> = {};
    for (const f of taxonomy.facets) {
      const vals = parseCsvParam(searchParams.get(f.slug));
      if (vals.length) next[f.slug] = vals;
    }
    setSelectedFacets(next);
  }, [searchParams, taxonomy.facets]);

  const toggleDanhMuc = useCallback(
    (slug: string) => {
      setSelectedDanhMuc((prev) => {
        const next = prev.includes(slug)
          ? prev.filter((s) => s !== slug)
          : [...prev, slug];
        syncUrl(next, selectedFacets);
        return next;
      });
    },
    [selectedFacets, syncUrl],
  );

  const toggleFacetValue = useCallback(
    (facetSlug: string, valueSlug: string, single: boolean) => {
      setSelectedFacets((prev) => {
        const cur = prev[facetSlug] ?? [];
        let nextVals: string[];
        if (single) {
          nextVals = cur.includes(valueSlug) ? [] : [valueSlug];
        } else {
          nextVals = cur.includes(valueSlug)
            ? cur.filter((s) => s !== valueSlug)
            : [...cur, valueSlug];
        }
        const next = { ...prev };
        if (nextVals.length) next[facetSlug] = nextVals;
        else delete next[facetSlug];
        syncUrl(selectedDanhMuc, next);
        return next;
      });
    },
    [selectedDanhMuc, syncUrl],
  );

  const clearTaxonomy = useCallback(() => {
    setSelectedDanhMuc([]);
    setSelectedFacets({});
    syncUrl([], {});
  }, [syncUrl]);

  const selectAllDanhMuc = useCallback(() => {
    setSelectedDanhMuc([]);
    syncUrl([], selectedFacets);
  }, [selectedFacets, syncUrl]);

  const hasTaxonomyFilter =
    selectedDanhMuc.length > 0 ||
    Object.values(selectedFacets).some((v) => v.length > 0);

  const hasListFilter = hasTaxonomyFilter || discountOnly;

  useEffect(() => {
    const raw = query.trim();
    if (!raw) {
      setRemoteShops([]);
      setRemoteSearching(false);
      return;
    }
    setRemoteSearching(true);
    const abort = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          q: raw.slice(0, 64),
          mode: browseMode,
        });
        const res = await fetch(`/api/shop/listing/search?${params}`, {
          signal: abort.signal,
        });
        if (!res.ok) {
          if (!abort.signal.aborted) setRemoteShops([]);
          return;
        }
        const data: unknown = await res.json();
        const shopsIn =
          data &&
          typeof data === "object" &&
          Array.isArray((data as { shops?: unknown }).shops)
            ? ((data as { shops: PublicShopListingItem[] }).shops)
            : [];
        if (!abort.signal.aborted) setRemoteShops(shopsIn);
      } catch {
        if (!abort.signal.aborted) setRemoteShops([]);
      } finally {
        if (!abort.signal.aborted) setRemoteSearching(false);
      }
    }, LISTING_SEARCH_DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timer);
      abort.abort();
    };
  }, [query, browseMode]);

  const mergedShops = useMemo(
    () => mergeListingShops(shops, remoteShops),
    [shops, remoteShops],
  );

  const visibleShops = useMemo(() => {
    if (showProductGrid) return [];
    let list = mergedShops.filter((shop) => shopMatchesQuery(shop, q));
    if (discountOnly) list = list.filter(shopHasUuDai);
    /* Giống quầy Shop: đang bán → có voucher → … */
    return [...list].sort((a, b) => {
      if (a.dangTamDong !== b.dangTamDong) return a.dangTamDong ? 1 : -1;
      const aV =
        a.coVoucher === true || (a.voucherTickerLines?.length ?? 0) > 0;
      const bV =
        b.coVoucher === true || (b.voucherTickerLines?.length ?? 0) > 0;
      if (aV !== bV) return aV ? -1 : 1;
      if (!q) return 0;
      const aProfile = shopProfileMatches(a, q) ? 0 : 1;
      const bProfile = shopProfileMatches(b, q) ? 0 : 1;
      return aProfile - bProfile;
    });
  }, [mergedShops, q, showProductGrid, discountOnly]);

  const hangHitsRaw = useMemo(() => {
    if (showMatHang) return collectMatHangHits(mergedShops, q);
    if (showHang) return collectHangHits(mergedShops, q);
    return [];
  }, [mergedShops, q, showMatHang, showHang]);

  const hangHitsScoped = useMemo(() => {
    if (!discountOnly) return hangHitsRaw;
    return hangHitsRaw.filter((h) => h.coCombo);
  }, [hangHitsRaw, discountOnly]);

  const hangHits = useMemo(() => {
    if (!hasTaxonomyFilter) return hangHitsScoped;
    return hangHitsScoped.filter((h) =>
      hangMatchesTaxonomy(h, selectedDanhMuc, selectedFacets),
    );
  }, [hangHitsScoped, hasTaxonomyFilter, selectedDanhMuc, selectedFacets]);

  const danhMucCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const h of hangHitsScoped) {
      if (!h.danhMucSlug) continue;
      const slug = canonicalizeDanhMucSlug(h.danhMucSlug);
      counts.set(slug, (counts.get(slug) ?? 0) + 1);
    }
    return counts;
  }, [hangHitsScoped]);

  const facetCounts = useMemo(() => {
    const out: Record<string, Map<string, number>> = {};
    for (const f of taxonomy.facets) out[f.slug] = new Map();
    for (const h of hangHitsScoped) {
      for (const [facetSlug, vals] of Object.entries(h.facets)) {
        const map = out[facetSlug];
        if (!map) continue;
        for (const v of vals) map.set(v, (map.get(v) ?? 0) + 1);
      }
    }
    return out;
  }, [hangHitsScoped, taxonomy.facets]);

  const empty = showProductGrid
    ? hangHits.length === 0 && !remoteSearching
    : searching
      ? visibleShops.length === 0 && !remoteSearching
      : shops.length === 0;

  const searchPlaceholder = showProductGrid
    ? showMatHang
      ? "Tìm mặt hàng…"
      : "Tìm hàng…"
    : "Tìm shop…";
  const searchAria = showProductGrid
    ? showMatHang
      ? "Tìm theo tên mặt hàng"
      : "Tìm theo tên hàng"
    : "Tìm theo tên shop";

  const visibleDanhMuc = taxonomy.danhMuc.filter(
    (d) => (danhMucCounts.get(d.slug) ?? 0) > 0,
  );

  const facetSig = useMemo(
    () =>
      Object.entries(selectedFacets)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}:${v.join(",")}`)
        .join("|"),
    [selectedFacets],
  );

  const hangLazyKey = useMemo(
    () =>
      `${browseMode}|${q}|${discountOnly}|${selectedDanhMuc.join(",")}|${facetSig}|${hangHits.length}|${hangHits[0]?.key ?? ""}|${hangHits.at(-1)?.key ?? ""}`,
    [browseMode, q, discountOnly, selectedDanhMuc, facetSig, hangHits],
  );

  const shopLazyKey = useMemo(
    () =>
      `${browseMode}|${q}|${discountOnly}|${visibleShops.length}|${visibleShops[0]?.id ?? ""}|${visibleShops.at(-1)?.id ?? ""}`,
    [browseMode, q, discountOnly, visibleShops],
  );

  const {
    visible: lazyHangHits,
    sentinelRef: hangSentinelRef,
    hasMore: hasMoreHang,
  } = useChListLazyBatch(hangHits, hangLazyKey);

  const {
    visible: lazyVisibleShops,
    sentinelRef: shopSentinelRef,
    hasMore: hasMoreShops,
  } = useChListLazyBatch(visibleShops, shopLazyKey, CH_LIST_SHOP_LAZY_BATCH);

  return (
    <div className="ch-list-page">
      <h1 className="ch-list-sr-only">
        {browseMode === "shop" ? "Danh sách cửa hàng" : "Danh sách sản phẩm"}
      </h1>

      <div className="ch-list-toolbar">
        <div className="cins-frost-glass" aria-hidden />
        <span className="j-tlb-streak-slow" aria-hidden />
        <div className="ch-list-toolbar-inner">
          <div
            className={`ch-list-toolbar-main${searchOpen ? " is-search-open" : ""}`}
          >
            <div
              className={`ch-list-toolbar-search${searchOpen ? " is-open" : ""}`}
            >
              <button
                type="button"
                className={`ch-list-search-toggle${searching ? " has-query" : ""}`}
                aria-label={searchAria}
                aria-expanded={searchOpen}
                onClick={() => setSearchOpen((v) => !v)}
              >
                <Search size={18} strokeWidth={2} aria-hidden />
              </button>
              <label
                className={`ch-list-search${remoteSearching ? " is-busy" : ""}`}
                aria-busy={remoteSearching || undefined}
              >
                <Search
                  size={18}
                  strokeWidth={2}
                  aria-hidden
                  className="ch-list-search-icon-inline"
                />
                <input
                  ref={searchInputRef}
                  type="search"
                  placeholder={searchPlaceholder}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label={searchAria}
                  autoComplete="off"
                  spellCheck={false}
                />
                {query ? (
                  <button
                    type="button"
                    className="ch-list-search-clear"
                    aria-label="Xóa tìm kiếm"
                    onClick={() => {
                      setQuery("");
                      searchInputRef.current?.focus();
                    }}
                  >
                    <X size={16} strokeWidth={2.25} aria-hidden />
                  </button>
                ) : null}
                {searchOpen ? (
                  <button
                    type="button"
                    className="ch-list-search-close"
                    aria-label="Đóng tìm kiếm"
                    onClick={() => setSearchOpen(false)}
                  >
                    <X size={16} strokeWidth={2.2} aria-hidden />
                  </button>
                ) : null}
              </label>

              {searchOpen && (searching || hasListFilter) ? (
                <p className="ch-list-result-meta" aria-live="polite">
                  {remoteSearching &&
                  (showProductGrid
                    ? hangHits.length === 0
                    : visibleShops.length === 0)
                    ? "Đang tìm…"
                    : empty
                      ? "Không có kết quả"
                      : showProductGrid
                        ? `${hangHits.length} ${showMatHang ? "mặt hàng" : "hàng"}${remoteSearching ? "…" : ""}`
                        : `${visibleShops.length} cửa hàng${remoteSearching ? "…" : ""}`}
                </p>
              ) : null}
            </div>

            <div
              className="ch-list-toolbar-tabs"
              role="tablist"
              aria-label="Chế độ xem cửa hàng"
            >
              <Link
                href={listingTabHref("shop", searchParams)}
                scroll={false}
                role="tab"
                aria-selected={browseMode === "shop"}
                aria-label="Shop"
                className={`ch-list-toolbar-tab${browseMode === "shop" ? " is-active" : ""}`}
              >
                <Store size={16} strokeWidth={2} aria-hidden />
                <span className="ch-list-toolbar-tab-label">Shop</span>
              </Link>
              <Link
                href={listingTabHref("mat-hang", searchParams)}
                scroll={false}
                role="tab"
                aria-selected={browseMode === "mat-hang"}
                aria-label="Mặt hàng"
                className={`ch-list-toolbar-tab${browseMode === "mat-hang" ? " is-active" : ""}`}
              >
                <LayoutGrid size={16} strokeWidth={2} aria-hidden />
                <span className="ch-list-toolbar-tab-label">Mặt hàng</span>
              </Link>
              <Link
                href={listingTabHref("hang", searchParams)}
                scroll={false}
                role="tab"
                aria-selected={browseMode === "hang"}
                aria-label="Hàng"
                className={`ch-list-toolbar-tab${browseMode === "hang" ? " is-active" : ""}`}
              >
                <Package size={16} strokeWidth={2} aria-hidden />
                <span className="ch-list-toolbar-tab-label">Hàng</span>
              </Link>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={discountOnly}
              aria-label="Chỉ hiện combo và voucher"
              className={`ch-list-discount-switch${discountOnly ? " is-on" : ""}`}
              onClick={() => setDiscountOnly((v) => !v)}
            >
              <span className="ch-list-discount-switch-track" aria-hidden>
                <span className="ch-list-discount-switch-thumb" />
              </span>
              <span className="ch-list-discount-switch-label">Discount</span>
            </button>

            {showProductGrid && shops.length > 0 ? (
              <div
                className="ch-list-toolbar-filters"
                role="group"
                aria-label="Bộ lọc hàng"
              >
                <ListingFiltersPopover
                  taxonomy={taxonomy}
                  visibleDanhMuc={visibleDanhMuc}
                  danhMucCounts={danhMucCounts}
                  facetCounts={facetCounts}
                  selectedDanhMuc={selectedDanhMuc}
                  selectedFacets={selectedFacets}
                  hasTaxonomyFilter={hasTaxonomyFilter}
                  onToggleDanhMuc={toggleDanhMuc}
                  onSelectAllDanhMuc={selectAllDanhMuc}
                  onToggleFacetValue={toggleFacetValue}
                  onClearTaxonomy={clearTaxonomy}
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="ch-list-body">
        <CuaHangSanVoucher />
        {shops.length === 0 ? (
          <div className="ch-list-empty">
            <p>Chưa có cửa hàng nào đang hiển thị.</p>
          </div>
        ) : empty ? (
          <div className="ch-list-empty">
            <p>
              {searching || hasListFilter
                ? showProductGrid
                  ? searching
                    ? `Không tìm thấy ${showMatHang ? "mặt hàng" : "hàng"} khớp «${query.trim()}».`
                    : discountOnly
                      ? "Không có sản phẩm combo / ưu đãi khớp bộ lọc."
                      : "Không có sản phẩm khớp bộ lọc."
                  : searching
                    ? `Không tìm thấy cửa hàng khớp «${query.trim()}».`
                    : discountOnly
                      ? "Không có shop có combo hoặc voucher."
                      : "Không tìm thấy cửa hàng."
                : showProductGrid
                  ? showMatHang
                    ? "Chưa có mặt hàng nào đang hiển thị."
                    : "Chưa có hàng nào đang hiển thị."
                  : "Chưa có cửa hàng nào đang hiển thị."}
            </p>
          </div>
        ) : showProductGrid ? (
          <section
            className="ch-list-section"
            aria-label={
              showMatHang ? "Danh sách mặt hàng" : "Danh sách hàng"
            }
          >
            {remoteSearching && lazyHangHits.length > 0 ? (
              <div
                className="ch-list-hang-grid ch-list-search-pending"
                aria-hidden
              >
                <ListingSearchSkeletons kind="hang" count={4} />
              </div>
            ) : null}
            <div
              className="ch-list-hang-grid"
              aria-busy={remoteSearching || undefined}
            >
              {lazyHangHits.map((hit) => (
                <HangHitCard
                  key={hit.key}
                  hit={hit}
                  qty={hit.idBienThe ? (qtyByBt.get(hit.idBienThe) ?? 0) : 0}
                  onQty={patchQty}
                  isOwnShop={
                    Boolean(viewerProfileId) &&
                    Boolean(hit.ownerId) &&
                    viewerProfileId === hit.ownerId
                  }
                />
              ))}
              {remoteSearching && lazyHangHits.length === 0 ? (
                <ListingSearchSkeletons kind="hang" count={8} />
              ) : null}
            </div>
            {hasMoreHang ? (
              <div
                ref={hangSentinelRef}
                className="ch-list-lazy-sentinel"
                aria-hidden
              />
            ) : null}
          </section>
        ) : (
          <section className="ch-list-section" aria-label="Danh sách cửa hàng">
            {remoteSearching && lazyVisibleShops.length > 0 ? (
              <div className="ch-list-grid ch-list-search-pending" aria-hidden>
                <ListingSearchSkeletons kind="shop" count={3} />
              </div>
            ) : null}
            <div
              className="ch-list-grid"
              aria-busy={remoteSearching || undefined}
            >
              {lazyVisibleShops.map((shop) => (
                <CuaHangListCard key={shop.id} shop={shop} query={q} />
              ))}
              {remoteSearching && lazyVisibleShops.length === 0 ? (
                <ListingSearchSkeletons kind="shop" count={6} />
              ) : null}
            </div>
            {hasMoreShops ? (
              <div
                ref={shopSentinelRef}
                className="ch-list-lazy-sentinel"
                aria-hidden
              />
            ) : null}
          </section>
        )}
      </div>
    </div>
  );
}
