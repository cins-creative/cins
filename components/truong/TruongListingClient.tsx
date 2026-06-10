"use client";

import { useMemo, useState } from "react";

import { TruongSchoolCard } from "@/components/truong/TruongSchoolCard";
import { truongListingFilterType } from "@/lib/truong/display";
import { truongMatchesNameSearch } from "@/lib/truong/listing-search";
import type { TruongListItem } from "@/lib/truong/types";

type FilterKey = "all" | "dh" | "csdt";

type Props = {
  schools: TruongListItem[];
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

export function TruongListingClient({ schools }: Props) {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [query, setQuery] = useState("");

  const dhCount = useMemo(
    () => schools.filter((s) => truongListingFilterType(s) === "dh").length,
    [schools],
  );
  const csdtCount = useMemo(
    () => schools.filter((s) => truongListingFilterType(s) === "csdt").length,
    [schools],
  );
  const programCount = useMemo(
    () => schools.reduce((n, s) => n + s.nganhCount, 0),
    [schools],
  );

  const visible = useMemo(() => {
    return schools.filter((s) => {
      if (filter !== "all" && truongListingFilterType(s) !== filter) {
        return false;
      }
      return truongMatchesNameSearch(s, query);
    });
  }, [schools, filter, query]);

  return (
    <div className="tdh-list">
      <section className="tdh-list-hero">
        <div className="tdh-list-hero-bg" aria-hidden>
          <div className="blob-v" />
          <div className="blob-y" />
          <div className="blob-m" />
        </div>
        <div className="tdh-list-hero-inner">
          <div className="tdh-list-kicker">
            Hướng nghiệp
            <span className="tdh-list-kicker-divider" aria-hidden />
            <span className="tdh-list-kicker-code">trường đào tạo</span>
          </div>
          <h1 className="tdh-list-title">
            Trường <em>đào tạo</em>
          </h1>
          <p className="tdh-list-lead">
            Danh sách trường đại học và cơ sở đào tạo ngành sáng tạo tại Việt Nam —
            so sánh chương trình, mã trường và ngành đang tuyển trên CINs.
          </p>
        </div>
      </section>

      <div className="tdh-list-stats">
        <div className="tdh-list-stats-grid">
          <div className="tdh-list-stat">
            <div className="tdh-list-stat-label">Trường đại học</div>
            <div className="tdh-list-stat-value">
              {dhCount || schools.length}
              <span className="unit">trường</span>
            </div>
          </div>
          <div className="tdh-list-stat">
            <div className="tdh-list-stat-label">Cơ sở đào tạo</div>
            <div className="tdh-list-stat-value">
              {csdtCount}
              <span className="unit">cơ sở</span>
            </div>
          </div>
          <div className="tdh-list-stat">
            <div className="tdh-list-stat-label">Chương trình tuyển</div>
            <div className="tdh-list-stat-value">
              {programCount}
              <span className="unit">ngành</span>
            </div>
          </div>
        </div>
      </div>

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
              {query.trim()
                ? `Không có trường nào khớp tên «${query.trim()}». Thử bỏ dấu hoặc đổi bộ lọc.`
                : "Không có trường trong bộ lọc này."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
