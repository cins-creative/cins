"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronDown, Package, Search, Store, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import { CuaHangListCard } from "@/components/shop/CuaHangListCard";
import { CuaHangSanVoucher } from "@/components/shop/CuaHangSanVoucher";
import type { CuaHangHubTaxonomy } from "@/lib/shop/cua-hang-hub-taxonomy-types";
import type {
  PublicShopListingHang,
  PublicShopListingItem,
} from "@/lib/shop/cua-hang-listing-types";
import { shopLoaiHref, shopLoaiMauHref } from "@/lib/shop/cua-hang-href";

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
};

/** Giới hạn khi đang gõ tìm — browse mặc định lấy hết loại đã nạp. */
const HANG_SEARCH_LIMIT = 36;

type FilterOption = {
  slug: string;
  ten: string;
  count: number;
  title?: string;
};

function ListingFilterDropdown({
  label,
  options,
  selected,
  allLabel,
  allCount,
  emptyMeansAll = false,
  closeOnPick = false,
  onToggle,
  onSelectAll,
}: {
  label: string;
  options: FilterOption[];
  selected: string[];
  allLabel?: string;
  allCount?: number;
  /** true = không chọn gì = «Tất cả» (danh mục). */
  emptyMeansAll?: boolean;
  closeOnPick?: boolean;
  onToggle: (slug: string) => void;
  onSelectAll?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (options.length === 0 && !emptyMeansAll) return null;

  const activeCount = selected.length;
  const summary =
    activeCount === 0
      ? label
      : activeCount === 1
        ? (options.find((o) => o.slug === selected[0])?.ten ?? label)
        : `${label} · ${activeCount}`;

  function pick(slug: string) {
    onToggle(slug);
    if (closeOnPick) setOpen(false);
  }

  return (
    <div className="ch-list-filter-dd" ref={rootRef}>
      <button
        type="button"
        className={`ch-list-filter-dd-trigger${open ? " is-open" : ""}${
          activeCount > 0 ? " has-value" : ""
        }`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="ch-list-filter-dd-summary">{summary}</span>
        {activeCount > 0 ? (
          <span className="ch-list-filter-dd-badge" aria-hidden>
            {activeCount}
          </span>
        ) : null}
        <ChevronDown size={14} strokeWidth={2.2} aria-hidden />
      </button>

      {open ? (
        <div
          className="ch-list-filter-dd-panel"
          id={listId}
          role="listbox"
          aria-label={label}
          aria-multiselectable={!closeOnPick || undefined}
        >
          <div className="ch-list-filter-dd-panel-head">{label}</div>
          <div className="ch-list-filter-dd-options">
            {emptyMeansAll && onSelectAll ? (
              <button
                type="button"
                role="option"
                aria-selected={selected.length === 0}
                className={`ch-list-filter-dd-option${
                  selected.length === 0 ? " is-on" : ""
                }`}
                onClick={() => {
                  onSelectAll();
                  setOpen(false);
                }}
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
                {typeof allCount === "number" ? (
                  <span className="ch-list-filter-dd-count">{allCount}</span>
                ) : null}
              </button>
            ) : null}
            {options.map((o) => {
              const on = selected.includes(o.slug);
              return (
                <button
                  key={o.slug}
                  type="button"
                  role="option"
                  aria-selected={on}
                  title={o.title ?? o.ten}
                  className={`ch-list-filter-dd-option${on ? " is-on" : ""}`}
                  onClick={() => pick(o.slug)}
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
                  <span className="ch-list-filter-dd-count">{o.count}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function formatHangGia(gia: number | null, tienTe: string): string | null {
  if (gia == null) return null;
  return `${gia.toLocaleString("vi-VN")} ${tienTe || "VND"}`;
}

function normalizeQuery(raw: string): string {
  return raw.trim().toLocaleLowerCase("vi");
}

function textMatches(hay: string, q: string): boolean {
  return hay.toLocaleLowerCase("vi").includes(q);
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={hit.anhUrl} alt="" loading="lazy" />
        </span>
      ) : (
        <span className="ch-list-hang-card-thumb is-empty" aria-hidden>
          {hit.ten.charAt(0).toUpperCase()}
        </span>
      )}
      <div className="ch-list-hang-card-body">
        <div className="ch-list-hang-card-name">{hit.ten}</div>
        {giaLabel || sold > 0 ? (
          <div className="ch-list-hang-card-foot">
            {giaLabel ? <strong>{giaLabel}</strong> : null}
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
                // eslint-disable-next-line @next/next/no-img-element
                <img src={hit.shopAvatarUrl} alt="" loading="lazy" />
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

  const hasTaxonomyFilter =
    selectedDanhMuc.length > 0 ||
    Object.values(selectedFacets).some((v) => v.length > 0);

  const visibleShops = useMemo(() => {
    if (showHang) return [];
    const list = shops.filter((shop) => shopMatchesQuery(shop, q));
    if (!q) return list;
    return [...list].sort((a, b) => {
      const aProfile = shopProfileMatches(a, q) ? 0 : 1;
      const bProfile = shopProfileMatches(b, q) ? 0 : 1;
      if (aProfile !== bProfile) return aProfile - bProfile;
      return 0;
    });
  }, [shops, q, showHang]);

  const hangHitsRaw = useMemo(
    () => (showHang ? collectHangHits(shops, q) : []),
    [shops, q, showHang],
  );

  const hangHits = useMemo(() => {
    if (!hasTaxonomyFilter) return hangHitsRaw;
    return hangHitsRaw.filter((h) =>
      hangMatchesTaxonomy(h, selectedDanhMuc, selectedFacets),
    );
  }, [hangHitsRaw, hasTaxonomyFilter, selectedDanhMuc, selectedFacets]);

  const danhMucCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const h of hangHitsRaw) {
      if (!h.danhMucSlug) continue;
      counts.set(h.danhMucSlug, (counts.get(h.danhMucSlug) ?? 0) + 1);
    }
    return counts;
  }, [hangHitsRaw]);

  const facetCounts = useMemo(() => {
    const out: Record<string, Map<string, number>> = {};
    for (const f of taxonomy.facets) out[f.slug] = new Map();
    for (const h of hangHitsRaw) {
      for (const [facetSlug, vals] of Object.entries(h.facets)) {
        const map = out[facetSlug];
        if (!map) continue;
        for (const v of vals) map.set(v, (map.get(v) ?? 0) + 1);
      }
    }
    return out;
  }, [hangHitsRaw, taxonomy.facets]);

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

  return (
    <div className="ch-list-page">
      <h1 className="ch-list-sr-only">Cửa hàng</h1>

      <CuaHangSanVoucher />

      <div className="ch-list-body">
        <div className="ch-list-toolbar">
          <label className="ch-list-search">
            <Search size={18} strokeWidth={2} aria-hidden />
            <input
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
                onClick={() => setQuery("")}
              >
                <X size={16} strokeWidth={2.25} aria-hidden />
              </button>
            ) : null}
          </label>
          <div
            className="j-surface-view-toggle"
            role="group"
            aria-label="Chế độ xem cửa hàng"
          >
            <button
              type="button"
              className={`j-svt-btn${browseMode === "shop" ? " active" : ""}`}
              aria-pressed={browseMode === "shop"}
              title="Xem theo cửa hàng"
              onClick={() => setBrowseMode("shop")}
            >
              <Store size={15} strokeWidth={2} aria-hidden />
              Shop
            </button>
            <button
              type="button"
              className={`j-svt-btn${browseMode === "hang" ? " active" : ""}`}
              aria-pressed={browseMode === "hang"}
              title="Xem theo hàng"
              onClick={() => setBrowseMode("hang")}
            >
              <Package size={15} strokeWidth={2} aria-hidden />
              Hàng
            </button>
          </div>

          {showHang && shops.length > 0 ? (
            <div
              className="ch-list-toolbar-filters"
              role="group"
              aria-label="Bộ lọc hàng"
            >
              {visibleDanhMuc.length > 0 ? (
                <ListingFilterDropdown
                  label="Danh mục"
                  emptyMeansAll
                  allLabel="Tất cả"
                  allCount={hangHitsRaw.length}
                  options={visibleDanhMuc.map((d) => ({
                    slug: d.slug,
                    ten: d.ten,
                    count: danhMucCounts.get(d.slug) ?? 0,
                  }))}
                  selected={selectedDanhMuc}
                  onToggle={toggleDanhMuc}
                  onSelectAll={() => {
                    setSelectedDanhMuc([]);
                    syncUrl([], selectedFacets);
                  }}
                />
              ) : null}

              {taxonomy.facets.map((facet) => {
                const counts = facetCounts[facet.slug] ?? new Map();
                const visible = facet.giaTri.filter(
                  (g) => (counts.get(g.slug) ?? 0) > 0,
                );
                if (visible.length === 0) return null;
                const selected = selectedFacets[facet.slug] ?? [];
                return (
                  <ListingFilterDropdown
                    key={facet.slug}
                    label={facet.ten}
                    closeOnPick={facet.kieu === "chon_mot"}
                    options={visible.map((g) => ({
                      slug: g.slug,
                      ten: g.ten,
                      count: counts.get(g.slug) ?? 0,
                      title: g.nhom ? `${g.ten} · ${g.nhom}` : g.ten,
                    }))}
                    selected={selected}
                    onToggle={(slug) =>
                      toggleFacetValue(
                        facet.slug,
                        slug,
                        facet.kieu === "chon_mot",
                      )
                    }
                  />
                );
              })}

              {hasTaxonomyFilter ? (
                <button
                  type="button"
                  className="ch-list-filter-clear"
                  onClick={clearTaxonomy}
                >
                  Xóa lọc
                </button>
              ) : null}
            </div>
          ) : null}

          {searching || hasTaxonomyFilter ? (
            <p className="ch-list-result-meta" aria-live="polite">
              {empty
                ? "Không có kết quả"
                : showHang
                  ? `${hangHits.length} hàng`
                  : `${visibleShops.length} cửa hàng`}
            </p>
          ) : null}
        </div>

        {shops.length === 0 ? (
          <div className="ch-list-empty">
            <p>Chưa có cửa hàng nào đang hiển thị.</p>
          </div>
        ) : empty ? (
          <div className="ch-list-empty">
            <p>
              {searching || hasTaxonomyFilter
                ? showHang
                  ? searching
                    ? `Không tìm thấy sản phẩm khớp «${query.trim()}».`
                    : "Không có sản phẩm khớp bộ lọc."
                  : `Không tìm thấy cửa hàng khớp «${query.trim()}».`
                : showHang
                  ? "Chưa có sản phẩm nào đang hiển thị."
                  : "Chưa có cửa hàng nào đang hiển thị."}
            </p>
          </div>
        ) : showHang ? (
          <section className="ch-list-section" aria-label="Danh sách sản phẩm">
            <div className="ch-list-hang-grid">
              {hangHits.map((hit) => (
                <HangHitCard key={hit.key} hit={hit} />
              ))}
            </div>
          </section>
        ) : (
          <section className="ch-list-section" aria-label="Danh sách cửa hàng">
            <div className="ch-list-grid">
              {visibleShops.map((shop) => (
                <CuaHangListCard key={shop.id} shop={shop} query={q} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
