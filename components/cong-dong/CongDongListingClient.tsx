"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronDown, Lock, Plus, Search, UsersRound, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import {
  CONG_DONG_CHE_DO,
  congDongCheDoLabel,
} from "@/lib/cong-dong/constants";
import { getCoverUrl } from "@/lib/articles/cover";
import { getAvatarUrl } from "@/lib/journey/profile";
import type { CongDongListingFacet, CongDongOrg } from "@/lib/cong-dong/types";
import { listingRoleLabel } from "@/lib/cong-dong/vai-tro";
import { labelTinhThanh } from "@/lib/truong/contact";

type Props = {
  communities: CongDongOrg[];
  linhVucFacets: CongDongListingFacet[];
  nganhFacets: CongDongListingFacet[];
  initialLinhVucSlug?: string | null;
  initialNganhSlug?: string | null;
  initialMine?: boolean;
  /** Hiện filter «Cộng đồng của tôi» khi đã đăng nhập. */
  canFilterMine?: boolean;
};

function formatMemberCount(count: number): string {
  if (count < 1000) return String(count);
  return `${(count / 1000).toFixed(1).replace(/\.0$/, "")}k`;
}

type FilterDropdownProps = {
  label: string;
  ariaLabel: string;
  facets: CongDongListingFacet[];
  valueSlug: string | null;
  onChange: (slug: string | null) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function CongDongFilterDropdown({
  label,
  ariaLabel,
  facets,
  valueSlug,
  onChange,
  open,
  onOpenChange,
}: FilterDropdownProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const active = facets.find((f) => f.slug === valueSlug) ?? null;
  const display = active?.ten ?? "Tất cả";

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        onOpenChange(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onOpenChange]);

  return (
    <div
      ref={rootRef}
      className={
        open
          ? "cd-list-dd is-open"
          : active
            ? "cd-list-dd is-active"
            : "cd-list-dd"
      }
    >
      <button
        type="button"
        className="cd-list-dd-trigger"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => onOpenChange(!open)}
      >
        <span className="cd-list-dd-copy">
          <span className="cd-list-dd-label">{label}</span>
          <span className="cd-list-dd-value">{display}</span>
        </span>
        <ChevronDown size={15} strokeWidth={2.25} aria-hidden />
      </button>

      {open ? (
        <div className="cd-list-dd-menu" role="listbox" id={listId} aria-label={ariaLabel}>
          <button
            type="button"
            role="option"
            aria-selected={!active}
            className={
              !active ? "cd-list-dd-option is-selected" : "cd-list-dd-option"
            }
            onClick={() => {
              onChange(null);
              onOpenChange(false);
            }}
          >
            <span className="cd-list-dd-option-name">Tất cả</span>
            {!active ? (
              <Check size={15} strokeWidth={2.5} aria-hidden />
            ) : null}
          </button>
          {facets.map((facet) => {
            const selected = facet.slug === valueSlug;
            return (
              <button
                key={facet.id}
                type="button"
                role="option"
                aria-selected={selected}
                className={
                  selected
                    ? "cd-list-dd-option is-selected"
                    : "cd-list-dd-option"
                }
                onClick={() => {
                  onChange(facet.slug);
                  onOpenChange(false);
                }}
              >
                <span className="cd-list-dd-option-name">{facet.ten}</span>
                <span className="cd-list-dd-option-meta">
                  <span className="cd-list-dd-option-count">{facet.count}</span>
                  {selected ? (
                    <Check size={15} strokeWidth={2.5} aria-hidden />
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function CongDongListCard({ org }: { org: CongDongOrg }) {
  const coverUrl = getCoverUrl(org.coverId);
  const avatarUrl = getAvatarUrl(org.avatarId);
  const location = labelTinhThanh(org.tinhThanh);
  const showPrivacyBadge = org.cheDo !== CONG_DONG_CHE_DO.CONG_KHAI;
  const roleLabel = listingRoleLabel(org.viewerVaiTro);

  return (
    <Link href={`/cong-dong/${org.slug}`} className="cd-list-card">
      <div className="cd-list-card-cover" aria-hidden>
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverUrl} alt="" />
        ) : null}
      </div>

      <div className="cd-list-card-body">
        <div className="cd-list-card-avatar" aria-hidden>
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" />
          ) : (
            <span>{org.ten.charAt(0).toUpperCase()}</span>
          )}
        </div>

        {roleLabel || showPrivacyBadge ? (
          <div className="cd-list-card-badges">
            {roleLabel ? (
              <span className="cd-list-card-badge cd-list-card-badge--role">
                {roleLabel}
              </span>
            ) : null}
            {showPrivacyBadge ? (
              <span className="cd-list-card-badge">
                <Lock size={11} strokeWidth={2} aria-hidden />
                {congDongCheDoLabel(org.cheDo)}
              </span>
            ) : null}
          </div>
        ) : null}

        <h2 className="cd-list-card-title">{org.ten}</h2>
        {location ? <p className="cd-list-card-location">{location}</p> : null}
        {org.moTa ? <p className="cd-list-card-desc">{org.moTa}</p> : null}

        <div className="cd-list-card-foot">
          <div className="cd-list-card-metric">
            <strong>{formatMemberCount(org.soThanhVien)}</strong>
            <span>thành viên</span>
          </div>
          <span className="cd-list-card-metric-sep" aria-hidden />
          <div
            className="cd-list-card-metric"
          >
            <strong>{org.soBaiMoi7Ngay} bài viết</strong>
            <span>trong 7 ngày qua</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function resolveFacetId(
  facets: CongDongListingFacet[],
  slugOrId: string | null,
): string | null {
  if (!slugOrId) return null;
  const key = slugOrId.trim();
  if (!key) return null;
  const hit = facets.find((f) => f.slug === key || f.id === key);
  return hit?.id ?? null;
}

export function CongDongListingClient({
  communities,
  linhVucFacets,
  nganhFacets,
  initialLinhVucSlug = null,
  initialNganhSlug = null,
  initialMine = false,
  canFilterMine = false,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [openFilter, setOpenFilter] = useState<"linh_vuc" | "nganh" | null>(
    null,
  );

  const linhVucSlug =
    searchParams.get("linh_vuc")?.trim() || initialLinhVucSlug?.trim() || null;
  const nganhSlug =
    searchParams.get("nganh")?.trim() || initialNganhSlug?.trim() || null;
  const mineOnly =
    canFilterMine &&
    (searchParams.get("mine") === "1" ||
      searchParams.get("mine") === "true" ||
      initialMine);

  const activeLinhVucId = resolveFacetId(linhVucFacets, linhVucSlug);
  const activeNganhId = resolveFacetId(nganhFacets, nganhSlug);

  const setFilterParam = (
    key: "linh_vuc" | "nganh" | "mine",
    value: string | null,
  ) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return communities.filter((org) => {
      if (mineOnly && !org.viewerVaiTro) return false;
      if (activeLinhVucId && !org.linhVucIds.includes(activeLinhVucId)) {
        return false;
      }
      if (activeNganhId && !org.nganhIds.includes(activeNganhId)) {
        return false;
      }
      if (!q) return true;
      const haystack = [org.ten, org.moTa ?? "", labelTinhThanh(org.tinhThanh) ?? ""]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [communities, query, activeLinhVucId, activeNganhId, mineOnly]);

  const myCommunityCount = useMemo(
    () => communities.filter((org) => org.viewerVaiTro).length,
    [communities],
  );

  const activeLinhVuc = linhVucFacets.find((f) => f.id === activeLinhVucId);
  const activeNganh = nganhFacets.find((f) => f.id === activeNganhId);
  const hasActiveFilters = Boolean(activeLinhVucId || activeNganhId || mineOnly);

  const clearFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("linh_vuc");
    params.delete("nganh");
    params.delete("mine");
    const qs = params.toString();
    setOpenFilter(null);
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  return (
    <>
      <div className="cd-list-toolbar">
        <div className="cd-list-toolbar-primary">
          <label className="cd-list-search">
            <Search size={16} strokeWidth={2} aria-hidden />
            <input
              type="search"
              placeholder="Tìm cộng đồng..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Tìm cộng đồng"
            />
          </label>
          <Link href="/cong-dong/tao" className="cd-list-create-btn">
            <Plus size={16} strokeWidth={2.25} aria-hidden />
            Tạo cộng đồng
          </Link>
        </div>

        {canFilterMine ||
        linhVucFacets.length > 0 ||
        nganhFacets.length > 0 ? (
          <div className="cd-list-toolbar-filters" role="toolbar" aria-label="Bộ lọc cộng đồng">
            {canFilterMine ? (
              <button
                type="button"
                className={
                  mineOnly
                    ? "cd-list-mine-chip is-active"
                    : "cd-list-mine-chip"
                }
                aria-pressed={mineOnly}
                onClick={() => setFilterParam("mine", mineOnly ? null : "1")}
              >
                <UsersRound size={14} strokeWidth={2.25} aria-hidden />
                Cộng đồng của tôi
                {myCommunityCount > 0 ? (
                  <span className="cd-list-mine-chip-count">
                    {myCommunityCount}
                  </span>
                ) : null}
              </button>
            ) : null}

            {linhVucFacets.length > 0 ? (
              <CongDongFilterDropdown
                label="Lĩnh vực"
                ariaLabel="Lọc theo lĩnh vực"
                facets={linhVucFacets}
                valueSlug={activeLinhVuc?.slug ?? null}
                open={openFilter === "linh_vuc"}
                onOpenChange={(next) =>
                  setOpenFilter(next ? "linh_vuc" : null)
                }
                onChange={(slug) => setFilterParam("linh_vuc", slug)}
              />
            ) : null}

            {nganhFacets.length > 0 ? (
              <CongDongFilterDropdown
                label="Ngành"
                ariaLabel="Lọc theo ngành đào tạo"
                facets={nganhFacets}
                valueSlug={activeNganh?.slug ?? null}
                open={openFilter === "nganh"}
                onOpenChange={(next) =>
                  setOpenFilter(next ? "nganh" : null)
                }
                onChange={(slug) => setFilterParam("nganh", slug)}
              />
            ) : null}

            {hasActiveFilters ? (
              <button
                type="button"
                className="cd-list-clear-chip"
                onClick={clearFilters}
              >
                <X size={14} strokeWidth={2} aria-hidden />
                Xóa lọc
              </button>
            ) : null}
          </div>
        ) : null}

        {hasActiveFilters ? (
          <p className="cd-list-toolbar-meta-text">
            {visible.length} kết quả
            {mineOnly ? " · Cộng đồng của tôi" : ""}
            {activeLinhVuc ? ` · ${activeLinhVuc.ten}` : ""}
            {activeNganh ? ` · ${activeNganh.ten}` : ""}
          </p>
        ) : null}
      </div>

      {visible.length === 0 ? (
        <div className="cd-list-empty">
          <p>
            {communities.length === 0
              ? "Chưa có cộng đồng nào. Hãy là người đầu tiên tạo cộng đồng nghề trên CINs."
              : mineOnly && myCommunityCount === 0
                ? "Bạn chưa tham gia cộng đồng nào."
                : hasActiveFilters || query.trim()
                  ? "Không tìm thấy cộng đồng phù hợp với bộ lọc hiện tại."
                  : "Không tìm thấy cộng đồng phù hợp."}
          </p>
          {communities.length === 0 ? (
            <Link
              href="/cong-dong/tao"
              className="cd-list-create-btn cd-list-create-btn--inline"
            >
              <Plus size={16} strokeWidth={2.25} aria-hidden />
              Tạo cộng đồng
            </Link>
          ) : hasActiveFilters ? (
            <button
              type="button"
              className="cd-list-clear-filters cd-list-clear-filters--empty"
              onClick={clearFilters}
            >
              Xóa bộ lọc
            </button>
          ) : null}
        </div>
      ) : (
        <div className="cd-list-grid">
          {visible.map((org) => (
            <CongDongListCard key={org.id} org={org} />
          ))}
        </div>
      )}
    </>
  );
}
