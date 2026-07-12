"use client";

import { UsersRound } from "lucide-react";
import { useMemo, useState } from "react";

import { TruongSchoolCard } from "@/components/truong/TruongSchoolCard";
import { isListingMineOrg } from "@/lib/to-chuc/co-so-vai-tro";
import { truongListingFilterType } from "@/lib/truong/display";
import { truongMatchesNameSearch } from "@/lib/truong/listing-search";
import type { TruongListItem } from "@/lib/truong/types";

type FilterKey = "all" | "dh" | "csdt";

type Props = {
  schools: TruongListItem[];
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

export function TruongListingClient({
  schools,
  canFilterMine = false,
}: Props) {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [mineOnly, setMineOnly] = useState(false);
  const [query, setQuery] = useState("");

  const dhCount = useMemo(
    () => schools.filter((s) => truongListingFilterType(s) === "dh").length,
    [schools],
  );
  const csdtCount = useMemo(
    () => schools.filter((s) => truongListingFilterType(s) === "csdt").length,
    [schools],
  );
  const myCount = useMemo(
    () => schools.filter((s) => isListingMineOrg(s)).length,
    [schools],
  );

  const visible = useMemo(() => {
    return schools.filter((s) => {
      if (mineOnly && !isListingMineOrg(s)) return false;
      if (filter !== "all" && truongListingFilterType(s) !== filter) {
        return false;
      }
      return truongMatchesNameSearch(s, query);
    });
  }, [schools, filter, query, mineOnly]);

  return (
    <div className="tdh-list">
      <div className="tdh-list-toolbar">
        <div className="tdh-list-toolbar-inner">
          <div
            className="tdh-list-pills"
            role="tablist"
            aria-label="Lọc trường"
          >
            {(
              [
                ["all", "Tất cả", schools.length],
                ["dh", "Trường ĐH", dhCount],
                ["csdt", "Cơ sở đào tạo", csdtCount],
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
                Tổ chức của tôi
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
              placeholder="Tìm tên, tên tiếng Anh, mã trường…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Tìm theo tên, tên tiếng Anh hoặc mã trường"
              autoComplete="off"
            />
          </label>
        </div>
      </div>

      <div className="tdh-list-body">
        <div className="tdh-list-grid">
          {visible.length > 0 ? (
            visible.map((school, i) => (
              <TruongSchoolCard key={school.id} school={school} index={i} />
            ))
          ) : (
            <p className="tdh-list-empty">
              {mineOnly && myCount === 0
                ? "Bạn chưa thuộc hoặc theo dõi tổ chức giáo dục nào trên CINs."
                : query.trim()
                  ? `Không có trường nào khớp tên «${query.trim()}». Thử bỏ dấu hoặc đổi bộ lọc.`
                  : "Không có trường trong bộ lọc này."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
