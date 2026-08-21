"use client";

import { Package, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";

import {
  ModuleCard,
  ModuleEmpty,
} from "@/components/cins/home-adaptive/ModuleCard";
import {
  HANG_FEATURE_SEEN_COOKIE,
  HANG_FEATURE_SEEN_MAX,
  type HangFeatureItem,
} from "@/lib/cins/home-adaptive/hang-feature-types";

function formatGia(n: number | null): string | null {
  if (n == null || !Number.isFinite(n)) return null;
  return new Intl.NumberFormat("vi-VN").format(n) + "đ";
}

function mergeSeenCookie(ids: string[]) {
  if (typeof document === "undefined" || ids.length === 0) return;
  const prev = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${HANG_FEATURE_SEEN_COOKIE}=`))
    ?.slice(HANG_FEATURE_SEEN_COOKIE.length + 1);
  const existing = prev
    ? decodeURIComponent(prev)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  const merged = [...ids, ...existing.filter((id) => !ids.includes(id))].slice(
    0,
    HANG_FEATURE_SEEN_MAX,
  );
  const maxAge = 60 * 60 * 24 * 7;
  document.cookie = `${HANG_FEATURE_SEEN_COOKIE}=${encodeURIComponent(merged.join(","))}; path=/; max-age=${maxAge}; samesite=lax`;
}

function HangFeatureList({ items }: { items: HangFeatureItem[] }) {
  useEffect(() => {
    mergeSeenCookie(items.map((it) => it.sanPhamId));
  }, [items]);

  return (
    <ul className="ha-hang-list">
      {items.map((it) => {
        const gia = formatGia(it.giaHienThi);
        const shop = it.shopTen || it.ownerName || it.ownerSlug;
        const title = it.tenNhom?.trim() || it.tenSanPham;
        const sub = [shop, it.fromFriend ? "Bạn bè" : "Gợi ý"]
          .filter(Boolean)
          .join(" · ");
        return (
          <li key={it.sanPhamId} className="ha-hang-cell">
            <Link
              href={it.href}
              className="ha-hang-card"
              prefetch={false}
              title={title}
            >
              <span className="ha-hang-thumb" aria-hidden>
                {it.anhUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.anhUrl} alt="" width={160} height={160} />
                ) : (
                  <span className="ha-hang-thumb-fallback">
                    {title.slice(0, 1).toUpperCase()}
                  </span>
                )}
              </span>
              <span className="ha-hang-meta">
                <span className="ha-hang-title">{title}</span>
                {gia ? <span className="ha-hang-gia">{gia}</span> : null}
                <span className="ha-hang-sub">{sub}</span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

type PanelProps = {
  initialItems: HangFeatureItem[];
  limit: number;
};

/** Card «Hàng feature» + nút tải lại để lấy batch khác. */
export function HangFeaturePanel({ initialItems, limit }: PanelProps) {
  const [items, setItems] = useState(initialItems);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const refresh = useCallback(() => {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      try {
        const exclude = [
          ...items.map((it) => it.sanPhamId),
          ...parseSeenFromDocument(),
        ];
        const uniq = [...new Set(exclude)].slice(0, HANG_FEATURE_SEEN_MAX);
        const qs = new URLSearchParams({
          limit: String(limit),
          exclude: uniq.join(","),
        });
        const res = await fetch(`/api/home/product-feature?${qs}`, {
          credentials: "include",
        });
        const data = (await res.json().catch(() => null)) as {
          items?: HangFeatureItem[];
          error?: string;
        } | null;
        if (!res.ok) {
          setError(data?.error ?? "Không đổi được gợi ý.");
          return;
        }
        const next = data?.items ?? [];
        if (next.length === 0) {
          setError("Hết gợi ý khác — thử lại sau.");
          return;
        }
        setItems(next);
      } catch {
        setError("Không đổi được gợi ý.");
      }
    });
  }, [items, limit, pending]);

  return (
    <ModuleCard
      icon={Package}
      moduleId="hang_feature"
      title="Hàng feature"
      moreHref="/shopping"
      moreLabel="Khám phá cửa hàng"
      className="ha-card--hang"
      headTrailing={
        <button
          type="button"
          className="ha-hang-refresh"
          aria-label="Đổi gợi ý hàng"
          title="Đổi gợi ý"
          disabled={pending}
          onClick={refresh}
        >
          <RefreshCw
            size={15}
            strokeWidth={2.2}
            className={pending ? "ha-spin" : undefined}
            aria-hidden
          />
        </button>
      }
    >
      {items.length === 0 ? (
        <ModuleEmpty>
          Chưa có hàng nổi bật — kết bạn với người bán hoặc xem cửa hàng công
          khai.
        </ModuleEmpty>
      ) : (
        <HangFeatureList items={items} />
      )}
      {error ? (
        <p className="ha-hang-refresh-err" role="status">
          {error}
        </p>
      ) : null}
    </ModuleCard>
  );
}

function parseSeenFromDocument(): string[] {
  if (typeof document === "undefined") return [];
  const prev = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${HANG_FEATURE_SEEN_COOKIE}=`))
    ?.slice(HANG_FEATURE_SEEN_COOKIE.length + 1);
  if (!prev) return [];
  try {
    return decodeURIComponent(prev)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}
