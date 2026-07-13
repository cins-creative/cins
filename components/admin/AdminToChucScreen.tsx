"use client";

import {
  BadgeCheck,
  Building2,
  ExternalLink,
  GraduationCap,
  Loader2,
  Plus,
  Search,
  Shield,
  ShieldCheck,
  Trash2,
  UserCog,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AdminToChucDeleteDialog } from "@/components/admin/AdminToChucDeleteDialog";
import { AdminToChucMembersModal } from "@/components/admin/AdminToChucMembersModal";
import { AdminToChucOwnerDialog } from "@/components/admin/AdminToChucOwnerDialog";
import { BadgeTinCay } from "@/components/admin/badges";
import type {
  AdminToChucListResponse,
  AdminToChucListRow,
  AdminToChucLoaiFilter,
} from "@/lib/admin/to-chuc-types";
import { orgPublicHref } from "@/lib/search/helpers";

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
    case "co_so_dao_tao":
    case "cong_dong":
      return orgPublicHref(row.loai, row.slug);
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

export function AdminToChucScreen({
  canDelegateOrgMembers = false,
}: {
  canDelegateOrgMembers?: boolean;
}) {
  const [loaiFilter, setLoaiFilter] = useState<AdminToChucLoaiFilter>("all");
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<AdminToChucListRow[]>([]);
  const [stats, setStats] = useState(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingRow, setDeletingRow] = useState<AdminToChucListRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [membersOrg, setMembersOrg] = useState<AdminToChucListRow | null>(null);
  const [ownerOrg, setOwnerOrg] = useState<AdminToChucListRow | null>(null);

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

  /** Toggle Verified: chưa verify → cấp (POST), đã verify → gỡ (DELETE). */
  async function handleToggleVerify(row: AdminToChucListRow) {
    if (verifyingId) return;
    const revoke = Boolean(row.isVerified);
    setVerifyingId(row.id);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/to-chuc/${encodeURIComponent(row.id)}/verify`,
        { method: revoke ? "DELETE" : "POST" },
      );
      const json = (await res.json()) as {
        row?: AdminToChucListRow;
        error?: string;
      };
      if (!res.ok || !json.row) {
        throw new Error(
          json.error ?? (revoke ? "Không gỡ được Verified." : "Không cấp được Verified."),
        );
      }
      const updated = json.row;
      setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      void load();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : revoke
            ? "Không gỡ được Verified."
            : "Không cấp được Verified.",
      );
    } finally {
      setVerifyingId(null);
    }
  }

  async function confirmDelete(delegationPassword: string) {
    if (!deletingRow) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(
        `/api/admin/to-chuc/${encodeURIComponent(deletingRow.id)}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ delegationPassword }),
        },
      );
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(json.error ?? "Không xóa được tổ chức.");
      }
      setRows((prev) => prev.filter((r) => r.id !== deletingRow.id));
      setDeletingRow(null);
      void load();
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "Không xóa được tổ chức.");
    } finally {
      setDeleting(false);
    }
  }

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
                  <th>Chủ trang</th>
                  <th>Người tạo</th>
                  <th className="admin-to-chuc-th-actions">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {!loading && rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="admin-table-empty">
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
                        <td className="admin-to-chuc-chu-trang">
                          {canDelegateOrgMembers ? (
                            <button
                              type="button"
                              className="admin-to-chuc-owner-edit"
                              title="Đổi chủ trang (cần mật khẩu ủy quyền)"
                              aria-label="Đổi chủ trang"
                              onClick={() => setOwnerOrg(row)}
                            >
                              <span className="admin-to-chuc-owner-edit-name">
                                {row.chuTrang ? (
                                  row.chuTrang.ten
                                ) : (
                                  <span className="admin-to-chuc-muted">
                                    Chưa gán
                                  </span>
                                )}
                              </span>
                              <UserCog
                                size={13}
                                strokeWidth={2.2}
                                className="admin-to-chuc-owner-edit-icon"
                                aria-hidden
                              />
                            </button>
                          ) : row.chuTrang ? (
                            row.chuTrang.slug ? (
                              <Link
                                href={`/${row.chuTrang.slug}`}
                                className="admin-to-chuc-creator-link"
                                target="_blank"
                                rel="noopener noreferrer"
                                title={`@${row.chuTrang.slug}`}
                              >
                                {row.chuTrang.ten}
                              </Link>
                            ) : (
                              <span>{row.chuTrang.ten}</span>
                            )
                          ) : (
                            <span className="admin-to-chuc-muted">Chưa gán</span>
                          )}
                        </td>
                        <td className="admin-to-chuc-creator">
                          {row.nguoiTao ? (
                            row.nguoiTao.slug ? (
                              <Link
                                href={`/${row.nguoiTao.slug}`}
                                className="admin-to-chuc-creator-link"
                                target="_blank"
                                rel="noopener noreferrer"
                                title={`@${row.nguoiTao.slug}`}
                              >
                                {row.nguoiTao.ten}
                              </Link>
                            ) : (
                              <span>{row.nguoiTao.ten}</span>
                            )
                          ) : (
                            <span className="admin-to-chuc-muted">—</span>
                          )}
                        </td>
                        <td>
                          <div className="admin-to-chuc-actions">
                            {canDelegateOrgMembers ? (
                              <button
                                type="button"
                                className="admin-to-chuc-act admin-to-chuc-act--icon admin-to-chuc-act--delegate"
                                aria-label="Phân quyền"
                                title="Phân quyền tổ chức"
                                onClick={() => setMembersOrg(row)}
                              >
                                <Shield size={15} strokeWidth={2.2} aria-hidden />
                              </button>
                            ) : null}
                            {row.showVerify ? (
                              <button
                                type="button"
                                className={`admin-to-chuc-act admin-to-chuc-act--icon ${
                                  row.isVerified
                                    ? "admin-to-chuc-act--verified"
                                    : "admin-to-chuc-act--verify"
                                }`}
                                aria-label={
                                  row.isVerified ? "Gỡ Verified" : "Cấp Verified"
                                }
                                title={
                                  row.isVerified
                                    ? "Đã Verified — bấm để gỡ"
                                    : "Cấp Verified"
                                }
                                aria-pressed={row.isVerified}
                                disabled={verifyingId === row.id}
                                onClick={() => void handleToggleVerify(row)}
                              >
                                {verifyingId === row.id ? (
                                  <Loader2
                                    size={15}
                                    strokeWidth={2.2}
                                    className="admin-to-chuc-spin"
                                    aria-hidden
                                  />
                                ) : row.isVerified ? (
                                  <ShieldCheck size={15} strokeWidth={2.2} aria-hidden />
                                ) : (
                                  <BadgeCheck size={15} strokeWidth={2.2} aria-hidden />
                                )}
                              </button>
                            ) : null}
                            <button
                              type="button"
                              className="admin-to-chuc-act admin-to-chuc-act--icon admin-to-chuc-act--delete"
                              aria-label="Xóa"
                              title="Xóa"
                              onClick={() => {
                                setDeleteError(null);
                                setDeletingRow(row);
                              }}
                            >
                              <Trash2 size={15} strokeWidth={2.2} aria-hidden />
                            </button>
                            {viewHref ? (
                              <Link
                                href={viewHref}
                                className="admin-to-chuc-act admin-to-chuc-act--icon admin-to-chuc-act--view"
                                aria-label="Xem trang công khai"
                                title="Xem trang công khai"
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink size={15} strokeWidth={2.2} aria-hidden />
                              </Link>
                            ) : (
                              <button
                                type="button"
                                className="admin-to-chuc-act admin-to-chuc-act--icon"
                                aria-label="Xem trang công khai"
                                title="Không có trang công khai"
                                disabled
                              >
                                <ExternalLink size={15} strokeWidth={2.2} aria-hidden />
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

      <AdminToChucMembersModal
        orgId={membersOrg?.id ?? null}
        open={Boolean(membersOrg)}
        onClose={() => setMembersOrg(null)}
        onOwnerChanged={() => void load()}
      />

      <AdminToChucOwnerDialog
        open={Boolean(ownerOrg)}
        org={
          ownerOrg
            ? { id: ownerOrg.id, ten: ownerOrg.ten, slug: ownerOrg.slug }
            : null
        }
        currentOwnerName={ownerOrg?.chuTrang?.ten ?? null}
        onClose={() => setOwnerOrg(null)}
        onSaved={() => void load()}
      />

      <AdminToChucDeleteDialog
        open={Boolean(deletingRow)}
        orgName={deletingRow?.ten ?? ""}
        confirming={deleting}
        error={deleteError}
        onClose={() => {
          if (deleting) return;
          setDeletingRow(null);
          setDeleteError(null);
        }}
        onConfirm={(pwd) => void confirmDelete(pwd)}
      />
    </div>
  );
}
