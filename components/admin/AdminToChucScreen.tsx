"use client";

import {
  BadgeCheck,
  Building2,
  ExternalLink,
  GraduationCap,
  Pencil,
  Plus,
  Search,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { BadgeTinCay } from "@/components/admin/badges";
import { truongRootPath } from "@/lib/truong/truong-routes";

type LoaiToChuc =
  | "all"
  | "truong_dai_hoc"
  | "co_so_dao_tao"
  | "cong_dong"
  | "studio";

type MockOrgRow = {
  ten: string;
  slug: string;
  loai: Exclude<LoaiToChuc, "all">;
  loaiLabel: string;
  tinhThanh: string;
  tinCay: "verified_official" | "binh_thuong";
  journey: string;
  showVerify?: boolean;
};

const LOAI_FILTERS: { id: LoaiToChuc; label: string }[] = [
  { id: "all", label: "Tất cả" },
  { id: "truong_dai_hoc", label: "Trường ĐH" },
  { id: "co_so_dao_tao", label: "Cơ sở đào tạo" },
  { id: "cong_dong", label: "Cộng đồng" },
  { id: "studio", label: "Studio" },
];

const ROWS: MockOrgRow[] = [
  {
    ten: "Trường ĐH Mỹ thuật TP.HCM",
    slug: "dai-hoc-my-thuat-tp-hcm",
    loai: "truong_dai_hoc",
    loaiLabel: "Trường ĐH",
    tinhThanh: "TP.HCM",
    tinCay: "verified_official",
    journey: "—",
  },
  {
    ten: "Sine Art",
    slug: "sine-art",
    loai: "co_so_dao_tao",
    loaiLabel: "Cơ sở đào tạo",
    tinhThanh: "TP.HCM",
    tinCay: "binh_thuong",
    journey: "520",
    showVerify: true,
  },
  {
    ten: "Cộng đồng Game Art VN",
    slug: "game-art-vn",
    loai: "cong_dong",
    loaiLabel: "Cộng đồng",
    tinhThanh: "—",
    tinCay: "binh_thuong",
    journey: "1.2k",
  },
];

function orgViewHref(row: MockOrgRow): string | null {
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

function LoaiIcon({ loai }: { loai: MockOrgRow["loai"] }) {
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

export function AdminToChucScreen() {
  const [loaiFilter, setLoaiFilter] = useState<LoaiToChuc>("all");
  const [query, setQuery] = useState("");

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ROWS.filter((row) => {
      if (loaiFilter !== "all" && row.loai !== loaiFilter) return false;
      if (!q) return true;
      return (
        row.ten.toLowerCase().includes(q) ||
        row.slug.toLowerCase().includes(q) ||
        row.loaiLabel.toLowerCase().includes(q) ||
        row.tinhThanh.toLowerCase().includes(q)
      );
    });
  }, [loaiFilter, query]);

  const stats = useMemo(() => {
    const pendingVerify = ROWS.filter((row) => row.showVerify).length;
    const verified = ROWS.filter((row) => row.tinCay === "verified_official").length;
    const byLoai = (loai: MockOrgRow["loai"]) =>
      ROWS.filter((row) => row.loai === loai).length;
    return {
      total: ROWS.length,
      pendingVerify,
      verified,
      truong: byLoai("truong_dai_hoc"),
      coSo: byLoai("co_so_dao_tao"),
      congDong: byLoai("cong_dong"),
    };
  }, []);

  const filterCounts = useMemo(() => {
    const counts: Record<LoaiToChuc, number> = {
      all: ROWS.length,
      truong_dai_hoc: stats.truong,
      co_so_dao_tao: stats.coSo,
      cong_dong: stats.congDong,
      studio: ROWS.filter((row) => row.loai === "studio").length,
    };
    return counts;
  }, [stats]);

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
              Hiển thị <strong>{filteredRows.length}</strong> / {ROWS.length}
            </p>
          </div>

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
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="admin-table-empty">
                      Không có tổ chức phù hợp bộ lọc.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => {
                    const viewHref = orgViewHref(row);
                    return (
                      <tr key={row.slug}>
                        <td>
                          <div className="admin-to-chuc-org">
                            <span
                              className={`admin-to-chuc-org-ava admin-to-chuc-org-ava--${row.loai}`}
                              aria-hidden
                            >
                              {orgInitial(row.ten)}
                            </span>
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

        <p className="admin-to-chuc-footnote">
          Mock UI — chưa nối API <code>org_to_chuc</code>.
        </p>
      </div>
    </div>
  );
}
