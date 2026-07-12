"use client";

import { UsersRound } from "lucide-react";
import { useMemo, useState } from "react";

import { StudioListingCard } from "@/components/to-chuc/StudioListingCard";
import { isListingMineOrg } from "@/lib/to-chuc/co-so-vai-tro";
import type { StudioListItem } from "@/lib/to-chuc/studio-listing";

type FilterKey = "all" | "studio" | "doanh_nghiep";

type Props = {
  studios: StudioListItem[];
  canFilterMine?: boolean;
};

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

export function StudioListingClient({
  studios,
  canFilterMine = false,
}: Props) {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [mineOnly, setMineOnly] = useState(false);
  const [query, setQuery] = useState("");

  const studioCount = useMemo(
    () => studios.filter((s) => s.loaiToChuc === "studio").length,
    [studios],
  );
  const doanhNghiepCount = useMemo(
    () => studios.filter((s) => s.loaiToChuc === "doanh_nghiep").length,
    [studios],
  );
  const myCount = useMemo(
    () => studios.filter((s) => isListingMineOrg(s)).length,
    [studios],
  );

  const visible = useMemo(() => {
    const q = normalize(query);
    return studios.filter((s) => {
      if (mineOnly && !isListingMineOrg(s)) return false;
      if (filter !== "all" && s.loaiToChuc !== filter) return false;
      if (!q) return true;
      const haystack = normalize(
        [s.ten, s.tenChinhThuc ?? "", s.tinhThanh ?? ""].join(" "),
      );
      return haystack.includes(q);
    });
  }, [studios, filter, query, mineOnly]);

  return (
    <div className="tdh-list">
      <div className="tdh-list-toolbar">
        <div className="tdh-list-toolbar-inner">
          <div
            className="tdh-list-pills"
            role="tablist"
            aria-label="Lọc studio"
          >
            {(
              [
                ["all", "Tất cả", studios.length],
                ["studio", "Studio", studioCount],
                ["doanh_nghiep", "Doanh nghiệp", doanhNghiepCount],
              ] as const
            ).map(([key, label, count]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={filter === key}
                className={`tdh-list-pill${filter === key ? " on" : ""}`}
                onClick={() => setFilter(key)}
              >
                {label}
                {count > 0 ? ` · ${count}` : ""}
              </button>
            ))}
            {canFilterMine ? (
              <button
                type="button"
                className={`tdh-list-mine-chip${mineOnly ? " is-active" : ""}`}
                aria-pressed={mineOnly}
                onClick={() => setMineOnly((v) => !v)}
              >
                <UsersRound size={14} strokeWidth={2.25} aria-hidden />
                Studio của tôi
                {myCount > 0 ? (
                  <span className="tdh-list-mine-chip-count">{myCount}</span>
                ) : null}
              </button>
            ) : null}
          </div>
          <label className="tdh-list-search">
            <SearchIcon />
            <input
              type="search"
              placeholder="Tìm tên studio, doanh nghiệp…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Tìm theo tên studio hoặc doanh nghiệp"
              autoComplete="off"
            />
          </label>
        </div>
      </div>

      <div className="tdh-list-body">
        <div className="tdh-list-grid">
          {visible.length > 0 ? (
            visible.map((studio, i) => (
              <StudioListingCard key={studio.id} studio={studio} index={i} />
            ))
          ) : (
            <p className="tdh-list-empty">
              {mineOnly && myCount === 0
                ? "Bạn chưa thuộc hoặc theo dõi studio / doanh nghiệp nào trên CINs."
                : query.trim()
                  ? `Không có studio nào khớp «${query.trim()}». Thử đổi từ khoá hoặc bộ lọc.`
                  : "Chưa có studio nào trong bộ lọc này."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
