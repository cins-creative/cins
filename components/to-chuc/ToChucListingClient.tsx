"use client";

import { UsersRound } from "lucide-react";
import { useMemo, useState } from "react";

import { StudioListingCard } from "@/components/to-chuc/StudioListingCard";
import { TruongSchoolCard } from "@/components/truong/TruongSchoolCard";
import { isListingMineOrg } from "@/lib/to-chuc/co-so-vai-tro";
import type { StudioListItem } from "@/lib/to-chuc/studio-listing";
import { truongListingFilterType } from "@/lib/truong/display";
import { truongMatchesNameSearch } from "@/lib/truong/listing-search";
import type { TruongListItem } from "@/lib/truong/types";

type FilterKey = "all" | "dh" | "csdt" | "studio";

type Props = {
  schools: TruongListItem[];
  studios: StudioListItem[];
  canFilterMine?: boolean;
};

type RenderItem =
  | { kind: "school"; item: TruongListItem; ten: string; score: number }
  | { kind: "studio"; item: StudioListItem; ten: string; score: number };

/**
 * Điểm "độ đầy đủ" — ưu tiên tổ chức nhiều bài đăng + thông tin đầy đủ.
 * Bài đăng có trọng số cao nhất; còn lại cộng theo media/mô tả/ngành/khóa/verify.
 */
function schoolScore(s: TruongListItem): number {
  return (
    (s.baiDangCount ?? 0) * 3 +
    (s.cover_src ? 4 : 0) +
    (s.avatar_src ? 3 : 0) +
    (s.mo_ta?.trim() ? 3 : 0) +
    (s.gioi_thieu_truong?.trim() ? 3 : 0) +
    (s.tinh_thanh?.trim() ? 2 : 0) +
    (s.website?.trim() ? 2 : 0) +
    (s.ma_truong?.trim() ? 1 : 0) +
    Math.min(s.nganhCount ?? 0, 12) * 1.5 +
    Math.min(s.khoaHocCount ?? 0, 12) * 1.5 +
    (s.daVerify ? 6 : 0)
  );
}

function studioScore(s: StudioListItem): number {
  return (
    (s.baiDangCount ?? 0) * 3 +
    (s.coverSrc ? 4 : 0) +
    (s.avatarSrc ? 3 : 0) +
    (s.moTa?.trim() ? 3 : 0) +
    (s.tinhThanh?.trim() ? 2 : 0) +
    (s.website?.trim() ? 2 : 0) +
    (s.tenChinhThuc?.trim() ? 1 : 0)
  );
}

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

function normalizeStudioText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

function studioMatchesSearch(studio: StudioListItem, normQuery: string): boolean {
  if (!normQuery) return true;
  const hay = normalizeStudioText(
    [studio.ten, studio.tenChinhThuc ?? "", studio.tinhThanh ?? ""].join(" "),
  );
  return hay.includes(normQuery);
}

export function ToChucListingClient({
  schools,
  studios,
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
  const studioCount = studios.length;
  const myCount = useMemo(
    () =>
      schools.filter((s) => isListingMineOrg(s)).length +
      studios.filter((s) => isListingMineOrg(s)).length,
    [schools, studios],
  );

  const items = useMemo<RenderItem[]>(() => {
    const normStudioQuery = normalizeStudioText(query);

    const matchedSchools =
      filter === "studio"
        ? []
        : schools.filter((s) => {
            if (mineOnly && !isListingMineOrg(s)) return false;
            if (
              (filter === "dh" || filter === "csdt") &&
              truongListingFilterType(s) !== filter
            ) {
              return false;
            }
            return truongMatchesNameSearch(s, query);
          });

    const matchedStudios =
      filter === "dh" || filter === "csdt"
        ? []
        : studios.filter((s) => {
            if (mineOnly && !isListingMineOrg(s)) return false;
            return studioMatchesSearch(s, normStudioQuery);
          });

    const merged: RenderItem[] = [
      ...matchedSchools.map(
        (item): RenderItem => ({
          kind: "school",
          item,
          ten: item.ten,
          score: schoolScore(item),
        }),
      ),
      ...matchedStudios.map(
        (item): RenderItem => ({
          kind: "studio",
          item,
          ten: item.ten,
          score: studioScore(item),
        }),
      ),
    ];

    /* Ưu tiên tổ chức nhiều dữ liệu / bài đăng; đồng điểm → theo tên. */
    merged.sort(
      (a, b) => b.score - a.score || a.ten.localeCompare(b.ten, "vi"),
    );
    return merged;
  }, [schools, studios, filter, query, mineOnly]);

  return (
    <div className="tdh-list">
      <div className="tdh-list-toolbar">
        <div className="cins-frost-glass" aria-hidden="true" />
        <span className="j-tlb-streak-slow" aria-hidden="true" />
        <div className="tdh-list-toolbar-inner">
          <div
            className="tdh-list-pills"
            role="tablist"
            aria-label="Lọc tổ chức"
          >
            {(
              [
                ["all", "Tất cả", schools.length + studioCount],
                ["dh", "Trường ĐH", dhCount],
                ["csdt", "Cơ sở đào tạo", csdtCount],
                ["studio", "Studio", studioCount],
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
              placeholder="Tìm tên trường, studio, mã trường…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Tìm theo tên tổ chức, tên tiếng Anh hoặc mã trường"
              autoComplete="off"
            />
          </label>
        </div>
      </div>

      <div className="tdh-list-body">
        <div className="tdh-list-grid">
          {items.length > 0 ? (
            items.map((entry, i) =>
              entry.kind === "school" ? (
                <TruongSchoolCard
                  key={`school-${entry.item.id}`}
                  school={entry.item}
                  index={i}
                />
              ) : (
                <StudioListingCard
                  key={`studio-${entry.item.id}`}
                  studio={entry.item}
                  index={i}
                />
              ),
            )
          ) : (
            <p className="tdh-list-empty">
              {mineOnly && myCount === 0
                ? "Bạn chưa thuộc hoặc theo dõi tổ chức nào trên CINs."
                : query.trim()
                  ? `Không có tổ chức nào khớp «${query.trim()}». Thử bỏ dấu hoặc đổi bộ lọc.`
                  : "Không có tổ chức trong bộ lọc này."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
