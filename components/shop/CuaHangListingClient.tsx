"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, Package, Search, SlidersHorizontal, Store, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { CuaHangListCard } from "@/components/shop/CuaHangListCard";
import { ChListingImg } from "@/components/shop/ChListingImg";
import { CuaHangSanVoucher } from "@/components/shop/CuaHangSanVoucher";
import type { CuaHangHubTaxonomy } from "@/lib/shop/cua-hang-hub-taxonomy-types";
import type {
  PublicShopListingHang,
  PublicShopListingItem,
} from "@/lib/shop/cua-hang-listing-types";
import { shopLoaiHref, shopLoaiMauHref } from "@/lib/shop/cua-hang-href";
import { useChListLazyBatch } from "@/lib/shop/use-ch-list-lazy-batch";

type Props = {
  shops: PublicShopListingItem[];
  taxonomy: CuaHangHubTaxonomy;
};

type BrowseMode = "shop" | "hang";

type HangHit = {
  key: string;
  shopId: string;
  ten: string;
  anhUrl: string | null;
  shopTen: string;
  shopAvatarUrl: string | null;
  href: string;
  kind: "loai" | "mau";
  giaHienThi: number | null;
  tienTe: string;
  noiBat: boolean;
  soLuongBan: number;
  hetHang: boolean;
  danhMucSlug: string | null;
  facets: Record<string, string[]>;
  coCombo: boolean;
  comboTag: string | null;
};

/** Giới hạn khi đang gõ tìm — browse mặc định lấy hết loại đã nạp. */
const HANG_SEARCH_LIMIT = 36;

type FilterOption = {
  slug: string;
  ten: string;
  count: number;
  title?: string;
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
  return false;
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
      <p className="ch-list-filter-overlay-no-match" role="status">
        {q
          ? `Không có mục khớp «${searchQuery.trim()}».`
          : `Chưa có mục lọc trong «${label}».`}
      </p>
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
        {visibleOptions.map((o) => {
          const on = selected.includes(o.slug);
          return (
            <button
              key={o.slug}
              type="button"
              role="option"
              aria-selected={on}
              title={o.title ?? o.ten}
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
                <span className="ch-list-filter-option-count">{o.count}</span>
              ) : null}
            </button>
          );
        })}
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
        options: visibleDanhMuc.map((d) => ({
          slug: d.slug,
          ten: d.ten,
          count: danhMucCounts.get(d.slug) ?? 0,
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
  if (shop.coVoucher) return true;
  const hasCombo = (items: PublicShopListingHang[]) =>
    items.some((h) => h.coCombo === true);
  return (
    hasCombo(shop.featuredHang) ||
    hasCombo(shop.catalogHang) ||
    hasCombo(shop.catalogMau)
  );
}

function shopProfileMatches(shop: PublicShopListingItem, q: string): boolean {
  return [shop.ten, shop.moTa, shop.ownerTen, shop.ownerSlug, shop.shopSlug]
    .filter(Boolean)
    .some((part) => textMatches(String(part), q));
}

function hangMatchesQuery(hang: PublicShopListingHang, q: string): boolean {
  return textMatches(hang.ten, q);
}

function shopMatchesQuery(shop: PublicShopListingItem, q: string): boolean {
  if (!q) return true;
  return shopProfileMatches(shop, q);
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
    shopTen: shop.ten,
    shopAvatarUrl: shop.avatarUrl,
    href: shopLoaiHref(shop.ownerSlug, shop.shopSlug, hang.id),
    kind: "loai",
    giaHienThi: hang.giaHienThi ?? null,
    tienTe: hang.tienTe ?? "VND",
    noiBat: hang.noiBat === true,
    soLuongBan: Math.max(0, Math.trunc(hang.soLuongBan ?? 0)),
    hetHang: hang.hetHang !== false,
    danhMucSlug: hang.danhMucSlug ?? null,
    facets: hang.facets ?? {},
    coCombo: hang.coCombo === true,
    comboTag: hang.comboTag ?? null,
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
    shopTen: shop.ten,
    shopAvatarUrl: shop.avatarUrl,
    href,
    kind: "mau",
    giaHienThi: mau.giaHienThi ?? null,
    tienTe: mau.tienTe ?? "VND",
    noiBat: false,
    soLuongBan: Math.max(0, Math.trunc(mau.soLuongBan ?? 0)),
    hetHang: mau.hetHang === true,
    danhMucSlug: mau.danhMucSlug ?? null,
    facets: mau.facets ?? {},
    coCombo: mau.coCombo === true,
    comboTag: mau.comboTag ?? null,
  };
}

/** Feature → còn hàng → có ảnh → đã bán nhiều. */
function compareHangPriority(a: HangHit, b: HangHit): number {
  if (a.noiBat !== b.noiBat) return a.noiBat ? -1 : 1;
  if (a.hetHang !== b.hetHang) return a.hetHang ? 1 : -1;
  const aImg = a.anhUrl ? 1 : 0;
  const bImg = b.anhUrl ? 1 : 0;
  if (aImg !== bImg) return bImg - aImg;
  if (a.soLuongBan !== b.soLuongBan) return b.soLuongBan - a.soLuongBan;
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

function collectHangHits(
  shops: PublicShopListingItem[],
  q: string,
): HangHit[] {
  const hits: HangHit[] = [];
  for (const shop of shops) {
    for (const hang of shop.catalogHang) {
      if (q && !hangMatchesQuery(hang, q)) continue;
      hits.push(hangFromLoai(shop, hang));
    }
    /* Search: thêm mẫu khớp tên — browse mặc định chỉ loại. */
    if (q) {
      for (const mau of shop.catalogMau) {
        if (!hangMatchesQuery(mau, q)) continue;
        hits.push(hangFromMau(shop, mau));
      }
    }
  }
  const mixed = interleaveByShop(hits);
  if (q && mixed.length > HANG_SEARCH_LIMIT) {
    return mixed.slice(0, HANG_SEARCH_LIMIT);
  }
  return mixed;
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

function hangMatchesTaxonomy(
  hit: HangHit,
  danhMuc: string[],
  facets: Record<string, string[]>,
): boolean {
  if (danhMuc.length > 0) {
    if (!hit.danhMucSlug || !danhMuc.includes(hit.danhMucSlug)) return false;
  }
  for (const [facetSlug, values] of Object.entries(facets)) {
    if (!values.length) continue;
    const hitVals = hit.facets[facetSlug] ?? [];
    if (!values.some((v) => hitVals.includes(v))) return false;
  }
  return true;
}

function HangHitCard({ hit }: { hit: HangHit }) {
  const giaLabel = formatHangGia(hit.giaHienThi, hit.tienTe);
  const sold = hit.soLuongBan > 0 ? hit.soLuongBan : 0;

  return (
    <Link
      href={hit.href}
      className={`ch-list-hang-card${hit.hetHang ? " is-soldout" : ""}`}
    >
      {hit.anhUrl ? (
        <span className="ch-list-hang-card-thumb">
          <ChListingImg src={hit.anhUrl} variant="thumbnail" />
        </span>
      ) : (
        <span className="ch-list-hang-card-thumb is-empty" aria-hidden>
          {hit.ten.charAt(0).toUpperCase()}
        </span>
      )}
      <div className="ch-list-hang-card-body">
        <div className="ch-list-hang-card-name">{hit.ten}</div>
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
        </div>
      </div>
    </Link>
  );
}

export function CuaHangListingClient({ shops, taxonomy }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [browseMode, setBrowseMode] = useState<BrowseMode>("hang");
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [discountOnly, setDiscountOnly] = useState(false);
  const [selectedDanhMuc, setSelectedDanhMuc] = useState<string[]>(() =>
    parseCsvParam(searchParams.get("danhMuc")),
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
  const showHang = browseMode === "hang";

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
    setSelectedDanhMuc(parseCsvParam(searchParams.get("danhMuc")));
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

  const visibleShops = useMemo(() => {
    if (showHang) return [];
    let list = shops.filter((shop) => shopMatchesQuery(shop, q));
    if (discountOnly) list = list.filter(shopHasUuDai);
    if (!q) return list;
    return [...list].sort((a, b) => {
      const aProfile = shopProfileMatches(a, q) ? 0 : 1;
      const bProfile = shopProfileMatches(b, q) ? 0 : 1;
      if (aProfile !== bProfile) return aProfile - bProfile;
      return 0;
    });
  }, [shops, q, showHang, discountOnly]);

  const hangHitsRaw = useMemo(
    () => (showHang ? collectHangHits(shops, q) : []),
    [shops, q, showHang],
  );

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
      counts.set(h.danhMucSlug, (counts.get(h.danhMucSlug) ?? 0) + 1);
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

  const empty = showHang
    ? hangHits.length === 0
    : searching
      ? visibleShops.length === 0
      : shops.length === 0;

  const searchPlaceholder = showHang
    ? "Tìm hàng, phân loại…"
    : "Tìm shop…";
  const searchAria = showHang
    ? "Tìm theo tên sản phẩm hoặc phân loại"
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
      `${showHang}|${q}|${discountOnly}|${selectedDanhMuc.join(",")}|${facetSig}|${hangHits.length}|${hangHits[0]?.key ?? ""}|${hangHits.at(-1)?.key ?? ""}`,
    [showHang, q, discountOnly, selectedDanhMuc, facetSig, hangHits],
  );

  const shopLazyKey = useMemo(
    () =>
      `${showHang}|${q}|${discountOnly}|${visibleShops.length}|${visibleShops[0]?.id ?? ""}|${visibleShops.at(-1)?.id ?? ""}`,
    [showHang, q, discountOnly, visibleShops],
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
  } = useChListLazyBatch(visibleShops, shopLazyKey);

  return (
    <div className="ch-list-page">
      <h1 className="ch-list-sr-only">Cửa hàng</h1>

      <CuaHangSanVoucher />

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
              <label className="ch-list-search">
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
              </label>
              {searchOpen ? (
                <button
                  type="button"
                  className="ch-list-search-close"
                  aria-label="Đóng tìm kiếm"
                  onClick={() => setSearchOpen(false)}
                >
                  <X size={18} strokeWidth={2.2} aria-hidden />
                </button>
              ) : null}

              {searchOpen && (searching || hasListFilter) ? (
                <p className="ch-list-result-meta" aria-live="polite">
                  {empty
                    ? "Không có kết quả"
                    : showHang
                      ? `${hangHits.length} hàng`
                      : `${visibleShops.length} cửa hàng`}
                </p>
              ) : null}
            </div>

            <div
              className="ch-list-toolbar-tabs"
              role="tablist"
              aria-label="Chế độ xem cửa hàng"
            >
              <button
                type="button"
                role="tab"
                aria-selected={browseMode === "shop"}
                className={`ch-list-toolbar-tab${browseMode === "shop" ? " is-active" : ""}`}
                onClick={() => setBrowseMode("shop")}
              >
                <Store size={16} strokeWidth={2} aria-hidden />
                Shop
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={browseMode === "hang"}
                className={`ch-list-toolbar-tab${browseMode === "hang" ? " is-active" : ""}`}
                onClick={() => setBrowseMode("hang")}
              >
                <Package size={16} strokeWidth={2} aria-hidden />
                Hàng
              </button>
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

            {showHang && shops.length > 0 ? (
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
        {shops.length === 0 ? (
          <div className="ch-list-empty">
            <p>Chưa có cửa hàng nào đang hiển thị.</p>
          </div>
        ) : empty ? (
          <div className="ch-list-empty">
            <p>
              {searching || hasListFilter
                ? showHang
                  ? searching
                    ? `Không tìm thấy sản phẩm khớp «${query.trim()}».`
                    : discountOnly
                      ? "Không có sản phẩm combo / ưu đãi khớp bộ lọc."
                      : "Không có sản phẩm khớp bộ lọc."
                  : searching
                    ? `Không tìm thấy cửa hàng khớp «${query.trim()}».`
                    : discountOnly
                      ? "Không có shop có combo hoặc voucher."
                      : "Không tìm thấy cửa hàng."
                : showHang
                  ? "Chưa có sản phẩm nào đang hiển thị."
                  : "Chưa có cửa hàng nào đang hiển thị."}
            </p>
          </div>
        ) : showHang ? (
          <section className="ch-list-section" aria-label="Danh sách sản phẩm">
            <div className="ch-list-hang-grid">
              {lazyHangHits.map((hit) => (
                <HangHitCard key={hit.key} hit={hit} />
              ))}
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
            <div className="ch-list-grid">
              {lazyVisibleShops.map((shop) => (
                <CuaHangListCard key={shop.id} shop={shop} query={q} />
              ))}
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
