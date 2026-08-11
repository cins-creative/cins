"use client";

import Link from "next/link";

import { ChListingImg } from "@/components/shop/ChListingImg";
import { ChListVoucherTicker } from "@/components/shop/ChListVoucherTicker";
import type {
  PublicShopListingHang,
  PublicShopListingItem,
} from "@/lib/shop/cua-hang-listing-types";

const PREVIEW_HANG = 3;

function textMatches(hay: string, q: string): boolean {
  return hay.toLocaleLowerCase("vi").includes(q);
}

function hangMatchesQuery(hang: PublicShopListingHang, q: string): boolean {
  return textMatches(hang.ten, q);
}

function pickCardHang(
  shop: PublicShopListingItem,
  q: string,
): PublicShopListingHang[] {
  if (!q) return shop.featuredHang;
  const matched = [
    ...shop.catalogHang.filter((h) => hangMatchesQuery(h, q)),
    ...shop.catalogMau.filter((m) => hangMatchesQuery(m, q)),
  ];
  if (matched.length === 0) return shop.featuredHang;
  const seen = new Set<string>();
  const out: PublicShopListingHang[] = [];
  for (const item of matched) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
    if (out.length >= PREVIEW_HANG) break;
  }
  return out;
}

export function CuaHangListCard({
  shop,
  query = "",
}: {
  shop: PublicShopListingItem;
  query?: string;
}) {
  const hang = pickCardHang(shop, query);
  const voucherLines = shop.voucherTickerLines ?? [];
  const showVoucherTicker = hang.length > 0 && voucherLines.length >= 1;

  return (
    <Link
      href={shop.href}
      className={`ch-list-card${shop.dangTamDong ? " is-paused" : ""}${
        showVoucherTicker ? " has-voucher-strip" : ""
      }`}
    >
      <div className="ch-list-card-cover" aria-hidden>
        <ChListingImg src={shop.coverUrl} variant="gridsm" />
      </div>

      <div className="ch-list-card-body">
        <div className="ch-list-card-identity">
          <div className="ch-list-card-avatar" aria-hidden>
            {shop.avatarUrl ? (
              <ChListingImg src={shop.avatarUrl} variant="avatar" />
            ) : (
              <span>{shop.ten.charAt(0).toUpperCase()}</span>
            )}
          </div>

          {shop.dangTamDong ? (
            <div className="ch-list-card-badges">
              <span className="ch-list-card-badge ch-list-card-badge--paused">
                Tạm dừng
              </span>
            </div>
          ) : null}

          <h2 className="ch-list-card-title">{shop.ten}</h2>
          {shop.ownerTen ? (
            <p className="ch-list-card-owner">{shop.ownerTen}</p>
          ) : null}
        </div>

        {shop.moTa ? <p className="ch-list-card-desc">{shop.moTa}</p> : null}
        {shop.dangTamDong && shop.tamDongLyDo ? (
          <p className="ch-list-card-pause-reason">{shop.tamDongLyDo}</p>
        ) : null}

        {hang.length > 0 ? (
          <ul className="ch-list-card-hang" aria-label="Mặt hàng">
            {hang.map((item) => (
              <li key={item.id} className="ch-list-card-hang-item">
                <div className="ch-list-card-hang-thumb" aria-hidden>
                  {item.anhUrl ? (
                    <ChListingImg src={item.anhUrl} variant="thumbnail" />
                  ) : (
                    <span>{item.ten.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <span className="ch-list-card-hang-name">{item.ten}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {showVoucherTicker ? (
        <ChListVoucherTicker lines={voucherLines} />
      ) : null}
    </Link>
  );
}
