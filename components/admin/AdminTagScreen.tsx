"use client";

import {
  ExternalLink,
  FileText,
  GitMerge,
  Hash,
  Loader2,
  MoreVertical,
  Pencil,
  Search,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { articlePublicHref } from "@/lib/articles/article-href";
import type {
  AdminTagListParams,
  AdminTagListResponse,
  AdminTagListRow,
  AdminTagLoaiFilter,
  AdminTagSort,
} from "@/lib/tag/admin-types";

const LOAI_FILTERS: { id: AdminTagLoaiFilter; label: string }[] = [
  { id: "all", label: "Tất cả" },
  { id: "keyword", label: "Khái niệm" },
  { id: "phan_mem", label: "Phần mềm" },
  { id: "fandom", label: "Phân loại" },
];

const SORT_OPTIONS: { id: AdminTagSort; label: string }[] = [
  { id: "pho_bien", label: "Phổ biến" },
  { id: "moi_nhat", label: "Mới nhất" },
  { id: "a_z", label: "A → Z" },
];

function loaiLabel(loai: string): string {
  if (loai === "phan_mem") return "Phần mềm";
  if (loai === "fandom") return "Phân loại";
  return "Khái niệm";
}

function loaiFilterCount(
  rows: AdminTagListRow[],
  loai: AdminTagLoaiFilter,
): number {
  if (loai === "all") return rows.length;
  return rows.filter((r) => r.loai_bai_viet === loai).length;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function buildListUrl(params: AdminTagListParams): string {
  const sp = new URLSearchParams();
  if (params.loai !== "all") sp.set("loai", params.loai);
  sp.set("trang_thai", "all");
  if (params.sort !== "pho_bien") sp.set("sort", params.sort);
  if (params.q) sp.set("q", params.q);
  if (params.page > 1) sp.set("page", String(params.page));
  if (params.limit !== 50) sp.set("limit", String(params.limit));
  const qs = sp.toString();
  return qs ? `/api/admin/tag/list?${qs}` : "/api/admin/tag/list";
}

export function AdminTagScreen() {
  const [params, setParams] = useState<AdminTagListParams>({
    loai: "all",
    trang_thai: "all",
    sort: "pho_bien",
    q: "",
    page: 1,
    limit: 50,
  });
  const [query, setQuery] = useState("");
  const [data, setData] = useState<AdminTagListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [editRow, setEditRow] = useState<AdminTagListRow | null>(null);
  const [editTomTat, setEditTomTat] = useState("");
  const [mergeSource, setMergeSource] = useState<AdminTagListRow | null>(null);
  const [mergeQuery, setMergeQuery] = useState("");
  const [mergeOptions, setMergeOptions] = useState<AdminTagListRow[]>([]);
  const [mergeLoading, setMergeLoading] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchList = useCallback(async (next: AdminTagListParams) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(buildListUrl(next), { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as
        | AdminTagListResponse
        | { error?: string }
        | null;
      if (!res.ok) {
        setError(
          json && "error" in json && json.error
            ? json.error
            : "Không tải được danh sách tag.",
        );
        setData(null);
        return;
      }
      setData(json as AdminTagListResponse);
    } catch {
      setError("Lỗi mạng khi tải danh sách tag.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchList(params);
  }, [fetchList, params]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setParams((p) => ({ ...p, q: query.trim(), page: 1 }));
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const totalPages = useMemo(() => {
    if (!data) return 1;
    return Math.max(1, Math.ceil(data.total / data.limit));
  }, [data]);

  const saveTomTat = async () => {
    if (!editRow) return;
    setPendingId(editRow.id);
    try {
      const res = await fetch(`/api/admin/tag/${editRow.id}/summary`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tom_tat: editTomTat }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Không lưu mô tả.");
        return;
      }
      setData((d) =>
        d
          ? {
              ...d,
              rows: d.rows.map((r) =>
                r.id === editRow.id ? { ...r, tom_tat: editTomTat.trim() || null } : r,
              ),
            }
          : d,
      );
      setEditRow(null);
    } catch {
      setError("Lỗi mạng khi lưu mô tả.");
    } finally {
      setPendingId(null);
    }
  };

  const loadMergeOptions = useCallback(
    async (source: AdminTagListRow, q: string) => {
      setMergeLoading(true);
      try {
        const sp = new URLSearchParams({
          loai: source.loai_bai_viet,
          trang_thai: "all",
          sort: "a_z",
          page: "1",
          limit: "20",
        });
        if (q.trim()) sp.set("q", q.trim());
        const res = await fetch(`/api/admin/tag/list?${sp.toString()}`);
        const json = (await res.json()) as AdminTagListResponse;
        setMergeOptions(
          (json.rows ?? []).filter((r) => r.id !== source.id),
        );
      } finally {
        setMergeLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!mergeSource) return;
    const t = setTimeout(() => {
      void loadMergeOptions(mergeSource, mergeQuery);
    }, 250);
    return () => clearTimeout(t);
  }, [loadMergeOptions, mergeQuery, mergeSource]);

  const runMerge = async (target: AdminTagListRow) => {
    if (!mergeSource) return;
    const ok = window.confirm(
      `Gộp "${mergeSource.tieu_de}" vào "${target.tieu_de}"? Hành động không hoàn tác.`,
    );
    if (!ok) return;
    setPendingId(mergeSource.id);
    try {
      const res = await fetch("/api/admin/tag/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_giu: target.id,
          id_gop: mergeSource.id,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Không gộp được tag.");
        return;
      }
      setMergeSource(null);
      setData((d) =>
        d
          ? {
              ...d,
              rows: d.rows.filter((r) => r.id !== mergeSource.id),
              total: Math.max(0, d.total - 1),
            }
          : d,
      );
    } catch {
      setError("Lỗi mạng khi gộp tag.");
    } finally {
      setPendingId(null);
    }
  };

  const pageRows = data?.rows ?? [];

  return (
    <div className="admin-tag-page">
      <header className="page-header admin-tag-head">
        <div className="admin-tag-head-copy">
          <h1 className="page-title">Quản lý Tag</h1>
          <p className="admin-tag-sub">
            Tag cộng đồng — gộp trùng, sửa mô tả. Không verify CINs.
          </p>
        </div>
      </header>

      <div className="page-body admin-tag-body">
        <div className="admin-tag-stats" aria-label="Tóm tắt tag">
          <article className="admin-tag-stat">
            <span className="admin-tag-stat-k">Tổng tag</span>
            <strong className="admin-tag-stat-v">
              {loading ? "—" : data?.total ?? 0}
            </strong>
          </article>
          <article className="admin-tag-stat">
            <span className="admin-tag-stat-k">Trên trang</span>
            <strong className="admin-tag-stat-v">
              {loading ? "—" : pageRows.length}
            </strong>
          </article>
          <article className="admin-tag-stat admin-tag-stat--people">
            <span className="admin-tag-stat-k">Người (trang)</span>
            <strong className="admin-tag-stat-v">
              {loading
                ? "—"
                : pageRows.reduce((n, r) => n + r.so_nguoi_tagged, 0)}
            </strong>
          </article>
          <article className="admin-tag-stat admin-tag-stat--works">
            <span className="admin-tag-stat-k">Tác phẩm (trang)</span>
            <strong className="admin-tag-stat-v">
              {loading
                ? "—"
                : pageRows.reduce((n, r) => n + r.so_tac_pham_tagged, 0)}
            </strong>
          </article>
        </div>

        <section className="admin-tag-panel">
          <div className="admin-tag-toolbar">
            <label className="admin-tag-search">
              <Search size={16} strokeWidth={2} aria-hidden />
              <input
                type="search"
                placeholder="Tìm theo tên tag…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>

            <div className="admin-tag-toolbar-row">
              <div
                className="admin-tag-filters"
                role="group"
                aria-label="Loại tag"
              >
                {LOAI_FILTERS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    className={`admin-tag-filter${params.loai === f.id ? " is-active" : ""}`}
                    onClick={() =>
                      setParams((p) => ({ ...p, loai: f.id, page: 1 }))
                    }
                  >
                    {f.label}
                    {!loading && params.loai === "all" ? (
                      <span className="admin-tag-filter-count">
                        {loaiFilterCount(pageRows, f.id)}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>

              <label className="admin-tag-sort">
                <span className="admin-tag-sort-label">Sắp xếp</span>
                <select
                  value={params.sort}
                  onChange={(e) =>
                    setParams((p) => ({
                      ...p,
                      sort: e.target.value as AdminTagSort,
                      page: 1,
                    }))
                  }
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <p className="admin-tag-result">
              {loading ? (
                <>
                  <Loader2
                    size={14}
                    strokeWidth={2}
                    className="admin-tag-spin"
                    aria-hidden
                  />{" "}
                  Đang tải…
                </>
              ) : (
                <>
                  Hiển thị <strong>{pageRows.length}</strong> / {data?.total ?? 0}
                  {params.q.trim() ? (
                    <>
                      {" "}
                      · tìm &ldquo;{params.q.trim()}&rdquo;
                    </>
                  ) : null}
                </>
              )}
            </p>
          </div>

          {error ? (
            <p className="admin-tag-error" role="alert">{error}</p>
          ) : null}

          <div className="admin-tag-table-wrap">
            <table className="admin-tag-table">
              <thead>
                <tr>
                  <th className="admin-tag-th-tag">Tag</th>
                  <th className="admin-tag-th-loai">Loại</th>
                  <th className="admin-tag-th-num">Người</th>
                  <th className="admin-tag-th-num">Tác phẩm</th>
                  <th className="admin-tag-th-desc">Mô tả</th>
                  <th className="admin-tag-th-actions">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="admin-table-empty">
                      <Loader2 size={18} className="admin-tag-spin" aria-hidden />
                      Đang tải…
                    </td>
                  </tr>
                ) : !pageRows.length ? (
                  <tr>
                    <td colSpan={6} className="admin-table-empty">
                      Không có tag phù hợp bộ lọc.
                    </td>
                  </tr>
                ) : (
                  pageRows.map((row) => (
                    <tr key={row.id} className="admin-tag-row">
                      <td>
                        <div className="admin-tag-cell-tag">
                          <span
                            className="admin-tag-cell-icon"
                            aria-hidden
                          >
                            <Hash size={14} strokeWidth={2.2} />
                          </span>
                          <span className="admin-tag-cell-copy">
                            <span className="admin-tag-cell-name">
                              {row.tieu_de}
                            </span>
                            <span className="admin-tag-cell-meta">
                              <span className="admin-tag-cell-slug">
                                @{row.slug}
                              </span>
                              <span className="admin-tag-cell-date">
                                {formatDate(row.tao_luc)}
                              </span>
                            </span>
                          </span>
                        </div>
                      </td>
                      <td>
                        <span
                          className={`admin-tag-loai admin-tag-loai--${row.loai_bai_viet}`}
                        >
                          {loaiLabel(row.loai_bai_viet)}
                        </span>
                      </td>
                      <td className="admin-tag-num">
                        <span className="admin-tag-metric">
                          <Users size={12} aria-hidden />
                          {row.so_nguoi_tagged}
                        </span>
                      </td>
                      <td className="admin-tag-num">
                        <span className="admin-tag-metric">
                          <FileText size={12} aria-hidden />
                          {row.so_tac_pham_tagged}
                        </span>
                      </td>
                      <td className="admin-tag-tom-tat">
                        {row.tom_tat?.trim() ? (
                          <span className="admin-tag-tom-tat-text">
                            {row.tom_tat.trim()}
                          </span>
                        ) : (
                          <span className="admin-tag-tom-tat-empty">
                            Chưa có mô tả
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="admin-tag-actions">
                          <button
                            type="button"
                            className="admin-tag-action"
                            aria-label={`Sửa mô tả ${row.tieu_de}`}
                            title="Sửa mô tả"
                            onClick={() => {
                              setEditRow(row);
                              setEditTomTat(row.tom_tat ?? "");
                            }}
                          >
                            <Pencil size={14} strokeWidth={2} aria-hidden />
                          </button>
                          <Link
                            href={articlePublicHref(
                              row.loai_bai_viet,
                              row.slug,
                            )}
                            className="admin-tag-action"
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Mở trang aggregation"
                            aria-label={`Mở trang ${row.tieu_de}`}
                          >
                            <ExternalLink size={14} strokeWidth={2} aria-hidden />
                          </Link>
                          <div className="admin-tag-menu-wrap">
                            <button
                              type="button"
                              className="admin-tag-action"
                              aria-label="Thêm hành động"
                              onClick={() =>
                                setMenuOpenId((id) =>
                                  id === row.id ? null : row.id,
                                )
                              }
                            >
                              <MoreVertical size={14} strokeWidth={2} aria-hidden />
                            </button>
                            {menuOpenId === row.id ? (
                              <div className="admin-tag-menu" role="menu">
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() => {
                                    setMenuOpenId(null);
                                    setMergeSource(row);
                                    setMergeQuery("");
                                    void loadMergeOptions(row, "");
                                  }}
                                >
                                  <GitMerge size={14} aria-hidden />
                                  Gộp vào tag khác
                                </button>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {data && data.total > data.limit ? (
            <footer className="admin-tag-footer">
              <button
                type="button"
                className="admin-tag-btn"
                disabled={params.page <= 1 || loading}
                onClick={() =>
                  setParams((p) => ({ ...p, page: Math.max(1, p.page - 1) }))
                }
              >
                Trước
              </button>
              <span className="admin-tag-footer-meta">
                Trang <strong>{params.page}</strong> / {totalPages}
                <span className="admin-tag-footer-total">
                  · {data.total} tag
                </span>
              </span>
              <button
                type="button"
                className="admin-tag-btn"
                disabled={params.page >= totalPages || loading}
                onClick={() =>
                  setParams((p) => ({ ...p, page: p.page + 1 }))
                }
              >
                Sau
              </button>
            </footer>
          ) : null}
        </section>
      </div>

      {editRow ? (
        <div
          className="admin-tag-modal-backdrop"
          role="presentation"
          onClick={() => setEditRow(null)}
        >
          <div
            className="admin-tag-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-tag-edit-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="admin-tag-edit-title">Sửa mô tả — {editRow.tieu_de}</h2>
            <textarea
              className="admin-tag-textarea"
              rows={4}
              value={editTomTat}
              maxLength={500}
              onChange={(e) => setEditTomTat(e.target.value)}
            />
            <div className="admin-tag-modal-actions">
              <button
                type="button"
                className="admin-tag-btn"
                onClick={() => setEditRow(null)}
              >
                Huỷ
              </button>
              <button
                type="button"
                className="admin-tag-btn admin-tag-btn--primary"
                disabled={pendingId === editRow.id}
                onClick={() => void saveTomTat()}
              >
                Lưu
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {mergeSource ? (
        <div
          className="admin-tag-modal-backdrop"
          role="presentation"
          onClick={() => setMergeSource(null)}
        >
          <div
            className="admin-tag-modal admin-tag-modal--wide"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-tag-merge-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="admin-tag-merge-title">
              Gộp &ldquo;{mergeSource.tieu_de}&rdquo; vào tag đích
            </h2>
            <input
              type="search"
              className="admin-tag-merge-search"
              placeholder="Tìm tag đích cùng loại…"
              value={mergeQuery}
              onChange={(e) => setMergeQuery(e.target.value)}
            />
            <div className="admin-tag-merge-list">
              {mergeLoading ? (
                <p className="admin-tag-merge-empty">
                  <Loader2 size={16} className="ed-spin" aria-hidden /> Đang tìm…
                </p>
              ) : mergeOptions.length === 0 ? (
                <p className="admin-tag-merge-empty">Không có tag phù hợp.</p>
              ) : (
                mergeOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className="admin-tag-merge-option"
                    disabled={pendingId === mergeSource.id}
                    onClick={() => void runMerge(opt)}
                  >
                    <span>
                      {opt.tieu_de}
                    </span>
                    <small>
                      {opt.so_nguoi_tagged} người · {opt.so_tac_pham_tagged} TP
                    </small>
                  </button>
                ))
              )}
            </div>
            <div className="admin-tag-modal-actions">
              <button
                type="button"
                className="admin-tag-btn"
                onClick={() => setMergeSource(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
