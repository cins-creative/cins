"use client";

import Link from "next/link";
import { Search, X } from "lucide-react";
import { useMemo, useState } from "react";

import { CuaHangListCard } from "@/components/shop/CuaHangListCard";
import type {
  PublicShopListingHang,
  PublicShopListingItem,
} from "@/lib/shop/cua-hang-listing-types";
import { shopLoaiHref, shopLoaiMauHref } from "@/lib/shop/cua-hang-href";

type Props = {
  shops: PublicShopListingItem[];
};

type HangHit = {
  key: string;
  ten: string;
  anhUrl: string | null;
  shopTen: string;
  href: string;
  kind: "loai" | "mau";
  giaHienThi: number | null;
  tienTe: string;
};

const HANG_HIT_LIMIT = 36;

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
  return shop.searchHaystack.includes(q);
}

function collectHangHits(
  shops: PublicShopListingItem[],
  q: string,
): HangHit[] {
  if (!q) return [];
  const hits: HangHit[] = [];
  for (const shop of shops) {
    for (const hang of shop.catalogHang) {
      if (!hangMatchesQuery(hang, q)) continue;
      hits.push({
        key: `loai:${shop.id}:${hang.id}`,
        ten: hang.ten,
        anhUrl: hang.anhUrl,
        shopTen: shop.ten,
        href: shopLoaiHref(shop.ownerSlug, shop.shopSlug, hang.id),
        kind: "loai",
        giaHienThi: hang.giaHienThi ?? null,
        tienTe: hang.tienTe ?? "VND",
      });
      if (hits.length >= HANG_HIT_LIMIT) return hits;
    }
    for (const mau of shop.catalogMau) {
      if (!hangMatchesQuery(mau, q)) continue;
      const href = mau.idNhom
        ? shopLoaiMauHref(shop.ownerSlug, shop.shopSlug, mau.idNhom, mau.id)
        : shop.href;
      hits.push({
        key: `mau:${shop.id}:${mau.id}`,
        ten: mau.ten,
        anhUrl: mau.anhUrl,
        shopTen: shop.ten,
        href,
        kind: "mau",
        giaHienThi: mau.giaHienThi ?? null,
        tienTe: mau.tienTe ?? "VND",
      });
      if (hits.length >= HANG_HIT_LIMIT) return hits;
    }
  }
  return hits;
}

function HangHitCard({ hit }: { hit: HangHit }) {
  const giaLabel = formatHangGia(hit.giaHienThi, hit.tienTe);

  return (
    <Link href={hit.href} className="ch-list-hang-card">
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
        {giaLabel ? (
          <div className="ch-list-hang-card-foot">
            <strong>{giaLabel}</strong>
          </div>
        ) : null}
        <div className="ch-list-hang-card-action">
          <span className="ch-list-hang-card-seller">{hit.shopTen}</span>
        </div>
      </div>
    </Link>
  );
}

export function CuaHangListingClient({ shops }: Props) {
  const [query, setQuery] = useState("");
  const q = normalizeQuery(query);

  const visibleShops = useMemo(() => {
    const list = shops.filter((shop) => shopMatchesQuery(shop, q));
    if (!q) return list;
    return [...list].sort((a, b) => {
      const aProfile = shopProfileMatches(a, q) ? 0 : 1;
      const bProfile = shopProfileMatches(b, q) ? 0 : 1;
      if (aProfile !== bProfile) return aProfile - bProfile;
      return 0;
    });
  }, [shops, q]);

  const hangHits = useMemo(() => collectHangHits(shops, q), [shops, q]);

  const searching = Boolean(q);
  const empty =
    searching && visibleShops.length === 0 && hangHits.length === 0;

  return (
    <div className="ch-list-page">
      <h1 className="ch-list-sr-only">Cửa hàng</h1>

      <div className="ch-list-body">
        <div className="ch-list-toolbar">
          <label className="ch-list-search">
            <Search size={18} strokeWidth={2} aria-hidden />
            <input
              type="search"
              placeholder="Tìm cửa hàng hoặc sản phẩm…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Tìm cửa hàng hoặc sản phẩm"
              autoComplete="off"
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
          {searching ? (
            <p className="ch-list-result-meta" aria-live="polite">
              {empty
                ? "Không có kết quả"
                : [
                    visibleShops.length > 0
                      ? `${visibleShops.length} cửa hàng`
                      : null,
                    hangHits.length > 0 ? `${hangHits.length} hàng` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
            </p>
          ) : null}
        </div>

        {shops.length === 0 ? (
          <div className="ch-list-empty">
            <p>Chưa có cửa hàng nào đang hiển thị.</p>
          </div>
        ) : empty ? (
          <div className="ch-list-empty">
            <p>Không tìm thấy cửa hàng hoặc sản phẩm khớp «{query.trim()}».</p>
          </div>
        ) : (
          <>
            {searching && hangHits.length > 0 ? (
              <section className="ch-list-section" aria-label="Sản phẩm khớp">
                <h2 className="ch-list-section-title">Sản phẩm</h2>
                <div className="ch-list-hang-grid">
                  {hangHits.map((hit) => (
                    <HangHitCard key={hit.key} hit={hit} />
                  ))}
                </div>
              </section>
            ) : null}

            {visibleShops.length > 0 ? (
              <section
                className="ch-list-section"
                aria-label={searching ? "Cửa hàng khớp" : "Danh sách cửa hàng"}
              >
                {searching ? (
                  <h2 className="ch-list-section-title">Cửa hàng</h2>
                ) : null}
                <div className="ch-list-grid">
                  {visibleShops.map((shop) => (
                    <CuaHangListCard
                      key={shop.id}
                      shop={shop}
                      query={q}
                    />
                  ))}
                </div>
              </section>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
