"use client";

import {
  BadgeCheck,
  Building2,
  ExternalLink,
  GraduationCap,
  Loader2,
  Pencil,
  Plus,
  Search,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { BadgeTinCay } from "@/components/admin/badges";
import type {
  AdminToChucListResponse,
  AdminToChucListRow,
  AdminToChucLoaiFilter,
} from "@/lib/admin/to-chuc-types";
import { truongRootPath } from "@/lib/truong/truong-routes";

const LOAI_FILTERS: { id: AdminToChucLoaiFilter; label: string }[] = [
  { id: "all", label: "Tất cả" },
  { id: "truong_dai_hoc", label: "Trường ĐH" },
  { id: "co_so_dao_tao", label: "Cơ sở đào tạo" },
  { id: "cong_dong", label: "Cộng đồng" },
  { id: "studio", label: "Studio" },
];

const EMPTY_STATS: AdminToChucListResponse["stats"] = {
  total: 0,
  pendingVerify: 0,
  verified: 0,
  truong: 0,
  coSo: 0,
  congDong: 0,
  studio: 0,
};

function orgViewHref(row: AdminToChucListRow): string | null {
  switch (row.loai) {
    case "truong_dai_hoc":
      return truongRootPath(row.slug);
    case "co_so_dao_tao":
      return `/co-so/${row.slug}`;
    case "cong_dong":
      return `/cong-dong/${row.slug}`;
    default:
      return null;
  }
}

function LoaiIcon({ loai }: { loai: AdminToChucListRow["loai"] }) {
  const props = { size: 16, strokeWidth: 2, "aria-hidden": true as const };
  switch (loai) {
    case "truong_dai_hoc":
      return <GraduationCap {...props} />;
    case "co_so_dao_tao":
      return <Building2 {...props} />;
    case "cong_dong":
      return <Users {...props} />;
    default:
      return <Building2 {...props} />;
  }
}

function orgInitial(ten: string): string {
  const word = ten.trim().split(/\s+/).find(Boolean);
  return (word?.charAt(0) ?? "?").toUpperCase();
}

function AdminOrgLogo({ row }: { row: AdminToChucListRow }) {
  const hasImg = Boolean(row.avatarUrl);
  return (
    <span
      className={`admin-to-chuc-org-ava admin-to-chuc-org-ava--${row.loai}${hasImg ? " admin-to-chuc-org-ava--has-img" : ""}`}
      aria-hidden
    >
      {hasImg ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={row.avatarUrl!} alt="" />
      ) : (
        orgInitial(row.ten)
      )}
    </span>
  );
}

export function AdminToChucScreen() {
  const [loaiFilter, setLoaiFilter] = useState<AdminToChucLoaiFilter>("all");
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<AdminToChucListRow[]>([]);
  const [stats, setStats] = useState(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (loaiFilter !== "all") qs.set("loai", loaiFilter);
      if (query.trim()) qs.set("q", query.trim());
      const res = await fetch(`/api/admin/to-chuc/list?${qs.toString()}`);
      if (!res.ok) {
        throw new Error("Không tải được danh sách tổ chức.");
      }
      const data = (await res.json()) as AdminToChucListResponse;
      setRows(data.rows ?? []);
      setStats(data.stats ?? EMPTY_STATS);
    } catch (e) {
      setRows([]);
      setStats(EMPTY_STATS);
      setError(e instanceof Error ? e.message : "Lỗi không xác định.");
    } finally {
      setLoading(false);
    }
  }, [loaiFilter, query]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, query.trim() ? 220 : 0);
    return () => window.clearTimeout(timer);
  }, [load, query]);

  const filterCounts = useMemo(
    () => ({
      all: stats.total,
      truong_dai_hoc: stats.truong,
      co_so_dao_tao: stats.coSo,
      cong_dong: stats.congDong,
      studio: stats.studio,
    }),
    [stats],
  );

  return (
    <div className="admin-to-chuc-page">
      <header className="page-header admin-to-chuc-head">
        <div className="admin-to-chuc-head-copy">
          <h1 className="page-title">Tổ chức</h1>
          <p className="admin-to-chuc-sub">
            Trường, cơ sở đào tạo, cộng đồng và studio — verify, tin cậy và liên
            kết Journey.
          </p>
        </div>
        <div className="page-header-actions">
          <button type="button" className="btn btn-primary admin-to-chuc-add" disabled>
            <Plus size={16} strokeWidth={2.2} aria-hidden />
            Thêm tổ chức
          </button>
        </div>
      </header>

      <div className="page-body admin-to-chuc-body">
        <div className="admin-to-chuc-stats" aria-label="Tóm tắt tổ chức">
          <article className="admin-to-chuc-stat">
            <span className="admin-to-chuc-stat-k">Tổng số</span>
            <strong className="admin-to-chuc-stat-v">{stats.total}</strong>
          </article>
          <article className="admin-to-chuc-stat admin-to-chuc-stat--warn">
            <span className="admin-to-chuc-stat-k">Chờ verify</span>
            <strong className="admin-to-chuc-stat-v">{stats.pendingVerify}</strong>
          </article>
          <article className="admin-to-chuc-stat admin-to-chuc-stat--ok">
            <span className="admin-to-chuc-stat-k">Đã verify</span>
            <strong className="admin-to-chuc-stat-v">{stats.verified}</strong>
          </article>
          <article className="admin-to-chuc-stat">
            <span className="admin-to-chuc-stat-k">Trường · Cơ sở · CĐ</span>
            <strong className="admin-to-chuc-stat-v">
              {stats.truong} · {stats.coSo} · {stats.congDong}
            </strong>
          </article>
        </div>

        <section className="admin-to-chuc-panel">
          <div className="admin-to-chuc-toolbar">
            <label className="admin-to-chuc-search">
              <Search size={16} strokeWidth={2} aria-hidden />
              <input
                type="search"
                placeholder="Tìm theo tên, slug, loại…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>

            <div
              className="admin-to-chuc-filters"
              role="group"
              aria-label="Loại tổ chức"
            >
              {LOAI_FILTERS.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  className={`admin-to-chuc-filter${loaiFilter === filter.id ? " is-active" : ""}`}
                  onClick={() => setLoaiFilter(filter.id)}
                >
                  {filter.label}
                  <span className="admin-to-chuc-filter-count">
                    {filterCounts[filter.id]}
                  </span>
                </button>
              ))}
            </div>

            <p className="admin-to-chuc-result">
              {loading ? (
                <>
                  <Loader2
                    size={14}
                    strokeWidth={2}
                    className="admin-to-chuc-spin"
                    aria-hidden
                  />{" "}
                  Đang tải…
                </>
              ) : (
                <>
                  Hiển thị <strong>{rows.length}</strong> / {stats.total}
                </>
              )}
            </p>
          </div>

          {error ? (
            <p className="admin-to-chuc-error" role="alert">
              {error}
            </p>
          ) : null}

          <div className="admin-to-chuc-table-wrap">
            <table className="admin-to-chuc-table">
              <thead>
                <tr>
                  <th>Tổ chức</th>
                  <th>Loại</th>
                  <th>Khu vực</th>
                  <th>Tin cậy</th>
                  <th>Journey</th>
                  <th className="admin-to-chuc-th-actions">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {!loading && rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="admin-table-empty">
                      Không có tổ chức phù hợp bộ lọc.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => {
                    const viewHref = orgViewHref(row);
                    return (
                      <tr key={row.id}>
                        <td>
                          <div className="admin-to-chuc-org">
                            <AdminOrgLogo row={row} />
                            <span className="admin-to-chuc-org-copy">
                              <span className="admin-to-chuc-org-name">{row.ten}</span>
                              <span className="admin-to-chuc-org-slug">@{row.slug}</span>
                            </span>
                          </div>
                        </td>
                        <td>
                          <span
                            className={`admin-to-chuc-loai admin-to-chuc-loai--${row.loai}`}
                          >
                            <LoaiIcon loai={row.loai} />
                            {row.loaiLabel}
                          </span>
                        </td>
                        <td className="admin-to-chuc-muted">{row.tinhThanh}</td>
                        <td>
                          <BadgeTinCay status={row.tinCay} />
                        </td>
                        <td className="admin-to-chuc-journey">{row.journey}</td>
                        <td>
                          <div className="admin-to-chuc-actions">
                            {row.showVerify ? (
                              <button
                                type="button"
                                className="admin-to-chuc-act admin-to-chuc-act--verify"
                              >
                                <BadgeCheck size={14} strokeWidth={2.2} aria-hidden />
                                Cấp Verified
                              </button>
                            ) : null}
                            <button
                              type="button"
                              className="admin-to-chuc-act admin-to-chuc-act--edit"
                            >
                              <Pencil size={14} strokeWidth={2.2} aria-hidden />
                              Sửa
                            </button>
                            {viewHref ? (
                              <Link
                                href={viewHref}
                                className="admin-to-chuc-act admin-to-chuc-act--view"
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink size={14} strokeWidth={2.2} aria-hidden />
                                Xem
                              </Link>
                            ) : (
                              <button
                                type="button"
                                className="admin-to-chuc-act"
                                disabled
                              >
                                <ExternalLink size={14} strokeWidth={2.2} aria-hidden />
                                Xem
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
