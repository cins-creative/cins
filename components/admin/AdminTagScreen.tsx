"use client";

import {
  BadgeCheck,
  ExternalLink,
  Loader2,
  MoreVertical,
  Pencil,
  Search,
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
  AdminTagVerifyFilter,
} from "@/lib/tag/admin-types";

const LOAI_FILTERS: { id: AdminTagLoaiFilter; label: string }[] = [
  { id: "all", label: "Tất cả" },
  { id: "keyword", label: "Khái niệm" },
  { id: "phan_mem", label: "Phần mềm" },
];

const VERIFY_FILTERS: { id: AdminTagVerifyFilter; label: string }[] = [
  { id: "chua_verify", label: "Chưa verify" },
  { id: "da_verify", label: "Đã verify" },
  { id: "all", label: "Tất cả" },
];

const SORT_OPTIONS: { id: AdminTagSort; label: string }[] = [
  { id: "pho_bien", label: "Phổ biến" },
  { id: "moi_nhat", label: "Mới nhất" },
  { id: "a_z", label: "A → Z" },
];

function loaiLabel(loai: string): string {
  return loai === "phan_mem" ? "Phần mềm" : "Khái niệm";
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
  if (params.trang_thai !== "chua_verify") {
    sp.set("trang_thai", params.trang_thai);
  }
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
    trang_thai: "chua_verify",
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

  const patchVerify = async (row: AdminTagListRow, da_verify: boolean) => {
    setPendingId(row.id);
    const prev = data;
    if (data) {
      setData({
        ...data,
        rows:
          params.trang_thai === "chua_verify" && da_verify
            ? data.rows.filter((r) => r.id !== row.id)
            : data.rows.map((r) =>
                r.id === row.id ? { ...r, da_verify } : r,
              ),
      });
    }
    try {
      const res = await fetch(`/api/admin/tag/${row.id}/verify`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ da_verify }),
      });
      if (!res.ok) {
        if (prev) setData(prev);
        const json = await res.json().catch(() => ({}));
        setError(json.error ?? "Không cập nhật verify.");
      }
    } catch {
      if (prev) setData(prev);
      setError("Lỗi mạng khi verify.");
    } finally {
      setPendingId(null);
    }
  };

  const saveTomTat = async () => {
    if (!editRow) return;
    setPendingId(editRow.id);
    try {
      const res = await fetch(`/api/admin/tag/${editRow.id}/tom-tat`, {
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

  return (
    <div className="admin-tag-page">
      <header className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Quản lý Tag</h1>
          <p className="admin-page-sub">
            Verify tag keyword / phần mềm — ưu tiên tag phổ biến trước.
          </p>
        </div>
      </header>

      <div className="admin-toolbar admin-tag-toolbar">
        <div className="admin-tag-filter-row">
          <div className="admin-tag-filter-group" role="group" aria-label="Loại tag">
            {LOAI_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                className={`admin-tag-pill${params.loai === f.id ? " is-active" : ""}`}
                onClick={() =>
                  setParams((p) => ({ ...p, loai: f.id, page: 1 }))
                }
              >
                {f.label}
              </button>
            ))}
          </div>
          <div
            className="admin-tag-filter-group"
            role="group"
            aria-label="Trạng thái verify"
          >
            {VERIFY_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                className={`admin-tag-pill${params.trang_thai === f.id ? " is-active" : ""}`}
                onClick={() =>
                  setParams((p) => ({ ...p, trang_thai: f.id, page: 1 }))
                }
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div className="admin-toolbar__row">
          <label className="admin-search admin-tag-search">
            <Search size={16} aria-hidden />
            <input
              type="search"
              placeholder="Tìm tag…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <label className="admin-tag-sort">
            <span>Sort</span>
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
      </div>

      {error ? <p className="admin-tag-error">{error}</p> : null}

      <div className="admin-table-wrap">
        <table className="admin-table admin-tag-table">
          <thead>
            <tr>
              <th>Tag</th>
              <th>Loại</th>
              <th>Người</th>
              <th>Tác phẩm</th>
              <th>Mô tả</th>
              <th aria-label="Hành động" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="admin-table-empty">
                  <Loader2 size={18} className="ed-spin" aria-hidden /> Đang tải…
                </td>
              </tr>
            ) : !data?.rows.length ? (
              <tr>
                <td colSpan={6} className="admin-table-empty">
                  Không có tag phù hợp bộ lọc.
                </td>
              </tr>
            ) : (
              data.rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <div className="admin-tag-name-cell">
                      {row.da_verify ? (
                        <BadgeCheck
                          size={16}
                          className="admin-tag-verified-icon"
                          aria-label="Đã verify"
                        />
                      ) : null}
                      <span className="admin-tag-name">{row.tieu_de}</span>
                      <small className="admin-tag-date">
                        {formatDate(row.tao_luc)}
                      </small>
                    </div>
                  </td>
                  <td>{loaiLabel(row.loai_bai_viet)}</td>
                  <td>{row.so_nguoi_tagged}</td>
                  <td>{row.so_tac_pham_tagged}</td>
                  <td className="admin-tag-tom-tat">
                    {row.tom_tat?.trim() || "—"}
                  </td>
                  <td>
                    <div className="admin-tag-actions">
                      <button
                        type="button"
                        className="admin-tag-btn admin-tag-btn--primary"
                        disabled={pendingId === row.id}
                        onClick={() =>
                          void patchVerify(row, !row.da_verify)
                        }
                      >
                        {row.da_verify ? "Bỏ verify" : "Verify"}
                      </button>
                      <button
                        type="button"
                        className="admin-tag-btn"
                        aria-label="Sửa mô tả"
                        onClick={() => {
                          setEditRow(row);
                          setEditTomTat(row.tom_tat ?? "");
                        }}
                      >
                        <Pencil size={14} aria-hidden />
                      </button>
                      <div className="admin-tag-menu-wrap">
                        <button
                          type="button"
                          className="admin-tag-btn"
                          aria-label="Thêm hành động"
                          onClick={() =>
                            setMenuOpenId((id) =>
                              id === row.id ? null : row.id,
                            )
                          }
                        >
                          <MoreVertical size={14} aria-hidden />
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
                              Gộp vào tag khác
                            </button>
                            <Link
                              href={articlePublicHref(
                                row.loai_bai_viet,
                                row.slug,
                              )}
                              className="admin-tag-menu-link"
                              role="menuitem"
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => setMenuOpenId(null)}
                            >
                              <ExternalLink size={14} aria-hidden />
                              Mở trang aggregation
                            </Link>
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
        <div className="admin-tag-pagination">
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
          <span>
            Trang {params.page} / {totalPages} · {data.total} tag
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
        </div>
      ) : null}

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
                      {opt.da_verify ? (
                        <BadgeCheck
                          size={14}
                          className="admin-tag-verified-icon"
                          aria-hidden
                        />
                      ) : null}
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
