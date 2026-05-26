"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { AdminArticleCreatePanel } from "@/components/admin/AdminArticleCreatePanel";
import { AdminArticleEditPanel } from "@/components/admin/AdminArticleEditPanel";
import { AdminArticleThumb } from "@/components/admin/AdminArticleThumb";
import { AdminSlideOver } from "@/components/admin/AdminSlideOver";
import { AdminTableSettings } from "@/components/admin/AdminTableSettings";
import { AdminArticleDataPreview } from "@/components/admin/AdminArticleDataPreview";
import { AdminArticleStatusSelect } from "@/components/admin/AdminArticleStatusSelect";
import { BadgeLoai } from "@/components/admin/badges";
import { hasAdminArticleThumbnail } from "@/lib/admin/article-display";
import {
  ADMIN_COLUMNS_STORAGE_KEY,
  ADMIN_FILTER_FIELDS,
  ADMIN_FILTERS_STORAGE_KEY,
  ADMIN_TABLE_COLUMNS,
  type AdminFilterFieldId,
  type AdminTableColumnId,
  defaultVisibleColumnIds,
  defaultVisibleFilterIds,
  parseStoredIds,
} from "@/lib/admin/article-fields";
import type {
  AdminArticleFilterOptions,
  AdminArticleListRow,
} from "@/lib/admin/articles-server";

const PAGE_SIZE = 30;

const LOAI_OPTIONS = [
  "",
  "nghe",
  "keyword",
  "phan_mem",
  "mon_hoc",
  "nganh_dao_tao",
  "blog",
  "event",
] as const;

const STATUS_OPTIONS = [
  "",
  "published",
  "cho_review",
  "dang_viet",
  "archived",
  "merged",
] as const;

const LOAI_NHOM_OPTIONS = [
  "",
  "bo_phan",
  "ky_thuat",
  "nhom_nganh",
  "cap_do",
] as const;

const MEDIA_OPTIONS = [
  { value: "", label: "Tất cả ảnh" },
  { value: "has_thumb", label: "Có thumbnail" },
  { value: "no_thumb", label: "Chưa có thumbnail" },
  { value: "has_cover", label: "Có cover_id" },
  { value: "no_cover", label: "Chưa có cover" },
] as const;

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatViews(n: number): string {
  return new Intl.NumberFormat("vi-VN").format(n);
}

function loaiNhomLabel(loai: string): string {
  switch (loai) {
    case "bo_phan":
      return "Bộ phận";
    case "ky_thuat":
      return "Kỹ thuật";
    case "nhom_nganh":
      return "Nhóm ngành";
    case "cap_do":
      return "Cấp độ";
    default:
      return loai || "—";
  }
}

type Props = {
  initialRows: AdminArticleListRow[];
  filterOptions: AdminArticleFilterOptions;
  totalCount: number;
};

export function AdminBaiVietScreen({
  initialRows,
  filterOptions,
  totalCount,
}: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [loaiFilter, setLoaiFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [linhVucFilter, setLinhVucFilter] = useState("");
  const [nhomFilter, setNhomFilter] = useState("");
  const [loaiNhomFilter, setLoaiNhomFilter] = useState("");
  const [mediaFilter, setMediaFilter] = useState("");
  const [page, setPage] = useState(1);
  const [editId, setEditId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Set<AdminTableColumnId>>(() => {
    if (typeof window === "undefined") return new Set(defaultVisibleColumnIds());
    return new Set(
      parseStoredIds(
        localStorage.getItem(ADMIN_COLUMNS_STORAGE_KEY),
        ADMIN_TABLE_COLUMNS.map((c) => c.id),
        defaultVisibleColumnIds(),
      ),
    );
  });
  const [visibleFilters, setVisibleFilters] = useState<Set<AdminFilterFieldId>>(() => {
    if (typeof window === "undefined") return new Set(defaultVisibleFilterIds());
    return new Set(
      parseStoredIds(
        localStorage.getItem(ADMIN_FILTERS_STORAGE_KEY),
        ADMIN_FILTER_FIELDS.map((f) => f.id),
        defaultVisibleFilterIds(),
      ),
    );
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(
      ADMIN_COLUMNS_STORAGE_KEY,
      JSON.stringify([...visibleColumns]),
    );
  }, [visibleColumns]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(
      ADMIN_FILTERS_STORAGE_KEY,
      JSON.stringify([...visibleFilters]),
    );
  }, [visibleFilters]);

  const colVisible = (id: AdminTableColumnId) => visibleColumns.has(id);
  const filterVisible = (id: AdminFilterFieldId) => visibleFilters.has(id);
  const visibleColCount = ADMIN_TABLE_COLUMNS.filter((c) =>
    visibleColumns.has(c.id),
  ).length;

  const editListRow = useMemo(
    () => initialRows.find((r) => r.id === editId) ?? null,
    [initialRows, editId],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return initialRows.filter((r) => {
      if (loaiFilter && r.loai_bai_viet !== loaiFilter) return false;
      if (statusFilter && r.trang_thai_noi_dung !== statusFilter) return false;
      if (linhVucFilter && r.id_linh_vuc !== linhVucFilter) return false;
      if (nhomFilter && !r.nhom.some((n) => n.id === nhomFilter)) return false;
      if (
        loaiNhomFilter &&
        !r.nhom.some((n) => n.loai_nhom === loaiNhomFilter)
      ) {
        return false;
      }
      const hasThumb = hasAdminArticleThumbnail(r);
      const hasCover = Boolean(r.cover_id?.trim());
      if (mediaFilter === "has_thumb" && !hasThumb) return false;
      if (mediaFilter === "no_thumb" && hasThumb) return false;
      if (mediaFilter === "has_cover" && !hasCover) return false;
      if (mediaFilter === "no_cover" && hasCover) return false;
      if (!q) return true;
      const nhomText = r.nhom.map((n) => n.ten).join(" ");
      return (
        r.slug.toLowerCase().includes(q) ||
        r.tieu_de.toLowerCase().includes(q) ||
        (r.linh_vuc_ten ?? "").toLowerCase().includes(q) ||
        nhomText.toLowerCase().includes(q)
      );
    });
  }, [
    initialRows,
    query,
    loaiFilter,
    statusFilter,
    linhVucFilter,
    nhomFilter,
    loaiNhomFilter,
    mediaFilter,
  ]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  const editTitle =
    initialRows.find((r) => r.id === editId)?.tieu_de ?? "Chỉnh sửa bài viết";

  const nhomByLoai = useMemo(() => {
    const map = new Map<string, typeof filterOptions.nhom>();
    for (const n of filterOptions.nhom) {
      const key = n.loai_nhom || "khac";
      const arr = map.get(key) ?? [];
      arr.push(n);
      map.set(key, arr);
    }
    return map;
  }, [filterOptions.nhom]);

  return (
    <>
      <header className="page-header">
        <h1 className="page-title">Bài viết & Tag</h1>
        <div className="page-header-actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => router.refresh()}
          >
            Refresh
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setEditId(null);
              setCreateOpen(true);
            }}
          >
            + Tạo mới
          </button>
        </div>
      </header>

      <div className="page-body">
        <div className="admin-toolbar">
          <div className="admin-toolbar__row">
            <div className="filter-search filter-search--toolbar">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="search"
              placeholder="Tiêu đề, slug, lĩnh vực, nhóm…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
            />
            </div>
            <AdminTableSettings
              columns={ADMIN_TABLE_COLUMNS.map((c) => ({
                id: c.id,
                label: c.label,
                locked: c.locked,
              }))}
              visibleColumns={visibleColumns}
              onColumnsChange={(ids) =>
                setVisibleColumns(new Set(ids) as Set<AdminTableColumnId>)
              }
              filters={ADMIN_FILTER_FIELDS.map((f) => ({
                id: f.id,
                label: f.label,
              }))}
              visibleFilters={visibleFilters}
              onFiltersChange={(ids) =>
                setVisibleFilters(new Set(ids) as Set<AdminFilterFieldId>)
              }
            />
          </div>
          <div className="filter-bar filter-bar--articles">
          {filterVisible("loai") ? (
          <select
            className="filter-select"
            value={loaiFilter}
            onChange={(e) => {
              setLoaiFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Lọc loại bài"
          >
            <option value="">Tất cả loại</option>
            {LOAI_OPTIONS.filter(Boolean).map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
          ) : null}
          {filterVisible("status") ? (
          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Lọc trạng thái"
          >
            <option value="">Tất cả trạng thái</option>
            {STATUS_OPTIONS.filter(Boolean).map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
          ) : null}
          {filterVisible("linhVuc") ? (
          <select
            className="filter-select"
            value={linhVucFilter}
            onChange={(e) => {
              setLinhVucFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Lọc lĩnh vực"
          >
            <option value="">Tất cả lĩnh vực</option>
            {filterOptions.linhVuc.map((lv) => (
              <option key={lv.id} value={lv.id}>
                {lv.ten}
              </option>
            ))}
          </select>
          ) : null}
          {filterVisible("loaiNhom") ? (
          <select
            className="filter-select"
            value={loaiNhomFilter}
            onChange={(e) => {
              setLoaiNhomFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Lọc loại nhóm"
          >
            <option value="">Loại nhóm (tất cả)</option>
            {LOAI_NHOM_OPTIONS.filter(Boolean).map((v) => (
              <option key={v} value={v}>
                {loaiNhomLabel(v)}
              </option>
            ))}
          </select>
          ) : null}
          {filterVisible("nhom") ? (
          <select
            className="filter-select filter-select--wide"
            value={nhomFilter}
            onChange={(e) => {
              setNhomFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Lọc nhóm"
          >
            <option value="">Tất cả nhóm</option>
            {[...nhomByLoai.entries()].map(([loai, items]) => (
              <optgroup
                key={loai}
                label={loaiNhomLabel(loai === "khac" ? "" : loai)}
              >
                {items.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.ten}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          ) : null}
          {filterVisible("media") ? (
          <select
            className="filter-select"
            value={mediaFilter}
            onChange={(e) => {
              setMediaFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Lọc ảnh"
          >
            {MEDIA_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          ) : null}
          <span className="filter-count">
            {totalCount.toLocaleString("vi-VN")} bài viết
          </span>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {colVisible("thumb") ? <th className="col-thumb">Ảnh</th> : null}
                {colVisible("title") ? <th>Tiêu đề</th> : null}
                {colVisible("loai") ? <th>Loại</th> : null}
                {colVisible("meta") ? <th>Lĩnh vực / Nhóm</th> : null}
                {colVisible("noi_dung") ? <th>Nội dung</th> : null}
                {colVisible("meta_json") ? <th>Meta</th> : null}
                {colVisible("status") ? <th>Trạng thái</th> : null}
                {colVisible("views") ? <th>Lượt xem</th> : null}
                {colVisible("date") ? <th>Ngày tạo</th> : null}
                {colVisible("actions") ? <th /> : null}
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={visibleColCount || 1}>
                    <div className="empty-state">
                      <div className="empty-title">Không có bài viết</div>
                      <div className="empty-desc">
                        Thử đổi bộ lọc hoặc từ khóa tìm kiếm.
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                pageRows.map((r) => (
                  <tr
                    key={r.id}
                    className={editId === r.id ? "admin-table-row--active" : "admin-table-row--clickable"}
                    onClick={() => {
                      setCreateOpen(false);
                      setEditId(r.id);
                    }}
                  >
                    {colVisible("thumb") ? (
                    <td className="cell-thumb" onClick={(e) => e.stopPropagation()}>
                      <AdminArticleThumb row={r} />
                    </td>
                    ) : null}
                    {colVisible("title") ? (
                    <td className="cell-title">
                      {r.tieu_de}
                      <small>{r.slug}</small>
                    </td>
                    ) : null}
                    {colVisible("loai") ? (
                    <td>
                      <BadgeLoai loai={r.loai_bai_viet} />
                    </td>
                    ) : null}
                    {colVisible("meta") ? (
                    <td className="cell-meta-tags">
                      {r.linh_vuc_ten ? (
                        <span className="admin-tag admin-tag--lv">
                          {r.linh_vuc_ten}
                        </span>
                      ) : null}
                      {r.nhom.length > 0 ? (
                        <span className="admin-tag-row">
                          {r.nhom.slice(0, 3).map((n) => (
                            <span
                              key={n.id}
                              className="admin-tag admin-tag--nhom"
                              title={loaiNhomLabel(n.loai_nhom)}
                            >
                              {n.ten}
                            </span>
                          ))}
                          {r.nhom.length > 3 ? (
                            <span className="admin-tag admin-tag--more">
                              +{r.nhom.length - 3}
                            </span>
                          ) : null}
                        </span>
                      ) : (
                        !r.linh_vuc_ten ? (
                          <span className="cell-meta-empty">—</span>
                        ) : null
                      )}
                    </td>
                    ) : null}
                    {colVisible("noi_dung") ? (
                    <td className="cell-preview" onClick={(e) => e.stopPropagation()}>
                      <AdminArticleDataPreview
                        hasData={r.has_noi_dung}
                        preview={r.noi_dung_preview}
                        emptyLabel="trống"
                        title={
                          r.has_noi_dung
                            ? `${r.noi_dung_chars} ký tự — bấm Sửa để mở đầy đủ`
                            : "Chưa có nội dung"
                        }
                      />
                    </td>
                    ) : null}
                    {colVisible("meta_json") ? (
                    <td className="cell-preview" onClick={(e) => e.stopPropagation()}>
                      <AdminArticleDataPreview
                        hasData={r.has_meta}
                        preview={r.meta_preview}
                        emptyLabel="trống"
                        title={r.meta_preview ?? "Chưa có meta"}
                      />
                    </td>
                    ) : null}
                    {colVisible("status") ? (
                    <td onClick={(e) => e.stopPropagation()}>
                      <AdminArticleStatusSelect
                        articleId={r.id}
                        slug={r.slug}
                        loaiBaiViet={r.loai_bai_viet}
                        status={r.trang_thai_noi_dung}
                      />
                    </td>
                    ) : null}
                    {colVisible("views") ? (
                    <td className="cell-num">{formatViews(r.luot_xem ?? 0)}</td>
                    ) : null}
                    {colVisible("date") ? (
                    <td className="cell-date">{formatDate(r.tao_luc)}</td>
                    ) : null}
                    {colVisible("actions") ? (
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="action-btn edit"
                          onClick={() => {
                      setCreateOpen(false);
                      setEditId(r.id);
                    }}
                        >
                          ✏ Sửa
                        </button>
                        {r.trang_thai_noi_dung === "published" ? (
                          <Link
                            href={
                              r.loai_bai_viet === "nganh_dao_tao"
                                ? `/nganh-hoc/${r.slug}`
                                : `/bai-viet/${r.slug}`
                            }
                            className="action-btn view"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            ↗ Xem
                          </Link>
                        ) : (
                          <span
                            className="action-btn view"
                            style={{ opacity: 0.45 }}
                          >
                            ↗ Xem
                          </span>
                        )}
                      </div>
                    </td>
                    ) : null}
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {filtered.length > 0 ? (
            <div className="pagination">
              <span className="pagination-info">
                Hiển thị {(safePage - 1) * PAGE_SIZE + 1}–
                {Math.min(safePage * PAGE_SIZE, filtered.length)}
              </span>
              <div className="pagination-btns">
                <button
                  type="button"
                  className="page-btn"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  ←
                </button>
                <button type="button" className="page-btn active">
                  {safePage}
                </button>
                <button
                  type="button"
                  className="page-btn"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  →
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <AdminSlideOver
        open={createOpen}
        title="Tạo bài viết mới"
        onClose={() => setCreateOpen(false)}
      >
        {createOpen ? (
          <AdminArticleCreatePanel
            filterOptions={filterOptions}
            onCancel={() => setCreateOpen(false)}
            onCreated={(id) => {
              setCreateOpen(false);
              setEditId(id);
              router.refresh();
            }}
          />
        ) : null}
      </AdminSlideOver>

      <AdminSlideOver
        open={editId != null}
        title={editTitle}
        onClose={() => setEditId(null)}
      >
        {editId ? (
          <AdminArticleEditPanel
            articleId={editId}
            listRow={editListRow}
            onCancel={() => setEditId(null)}
            onDeleted={() => setEditId(null)}
          />
        ) : null}
      </AdminSlideOver>
    </>
  );
}
