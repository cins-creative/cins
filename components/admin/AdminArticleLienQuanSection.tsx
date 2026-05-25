"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import {
  adminSearchArticlesLienQuanPicker,
  adminSyncArticleManagedLienQuan,
} from "@/app/admin/actions";
import { BadgeLoai, BadgeTrangThai } from "@/components/admin/badges";
import { AdminLienQuanModalPortal } from "@/components/admin/AdminLienQuanModalPortal";
import { getAdminArticleThumbDisplayUrl } from "@/lib/admin/article-display";
import type {
  AdminArticleLienQuanBundle,
  AdminArticleLienQuanPickerItem,
  AdminArticleLienQuanRow,
  AdminLienQuanManageMode,
} from "@/lib/admin/articles-server";
import { articlePublicHref } from "@/lib/articles/article-href";
import { LOAI_LABELS } from "@/lib/articles/labels";
import { labelLoaiQuanHe } from "@/lib/articles/quan-he-labels";

function thumbInitials(title: string): string {
  const w = title.trim().split(/\s+/).filter(Boolean);
  if (w.length >= 2) {
    return `${w[0]!.slice(0, 1)}${w[1]!.slice(0, 1)}`.toUpperCase();
  }
  return title.trim().slice(0, 2).toUpperCase() || "BV";
}

const THUMB_4X3 = { w: 4, h: 3 } as const;

function thumb4x3Height(width: number): number {
  return Math.round((width * THUMB_4X3.h) / THUMB_4X3.w);
}

function LienQuanThumb({
  row,
  size = 40,
  variant = "md",
}: {
  row: {
    tieu_de: string;
    thumbnail?: string | null;
    cover_id?: string | null;
    thumbnail_src?: string | null;
  };
  size?: number;
  /** `lg` = ảnh lớn trong popup quản lý (4:3). */
  variant?: "md" | "lg";
}) {
  const url = getAdminArticleThumbDisplayUrl(row);
  const w = variant === "lg" ? 80 : size;
  const h = thumb4x3Height(w);
  return (
    <span
      className={[
        "admin-lien-quan-thumb",
        variant === "lg" ? "admin-lien-quan-thumb--lg" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={variant === "lg" ? undefined : { width: w, height: h }}
    >
      {url ? (
        <Image
          src={url}
          alt=""
          width={w}
          height={h}
          className="admin-lien-quan-thumb__img"
          sizes={variant === "lg" ? "80px" : `${w}px`}
        />
      ) : (
        <span className="admin-lien-quan-thumb__ph" aria-hidden>
          {thumbInitials(row.tieu_de)}
        </span>
      )}
    </span>
  );
}

function ExpandTableIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
    </svg>
  );
}

function LienQuanCompactTable({
  rows,
  scroll = "compact",
}: {
  rows: AdminArticleLienQuanRow[];
  scroll?: "compact" | "full";
}) {
  if (!rows.length) {
    return <p className="admin-lien-quan-empty">Không có bài.</p>;
  }
  const wrapClass =
    scroll === "full"
      ? "admin-lien-quan-table-wrap admin-lien-quan-table-wrap--manage"
      : "admin-lien-quan-table-wrap admin-lien-quan-table-wrap--scroll";
  return (
    <div className={wrapClass}>
      <table className="admin-lien-quan-table admin-lien-quan-table--compact">
        <thead>
          <tr>
            <th className="admin-lien-quan-table__col-thumb" aria-label="Ảnh" />
            <th>Bài viết</th>
            <th>Loại</th>
            <th>TT</th>
            <th>Quan hệ</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.loai_quan_he}-${row.id}`}>
              <td className="admin-lien-quan-table__col-thumb">
                <LienQuanThumb row={row} size={36} />
              </td>
              <td className="admin-lien-quan-table__col-title">
                <Link
                  href={articlePublicHref(row.loai_bai_viet, row.slug)}
                  className="admin-lien-quan-title"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {row.tieu_de}
                </Link>
                <span className="admin-lien-quan-slug">{row.slug}</span>
              </td>
              <td>
                <BadgeLoai loai={row.loai_bai_viet} />
              </td>
              <td>
                <BadgeTrangThai status={row.trang_thai_noi_dung} />
              </td>
              <td>
                <span className="admin-lien-quan-rel">
                  {labelLoaiQuanHe(row.loai_quan_he)}
                </span>
                {row.cap_do ? (
                  <span className="admin-lien-quan-cap"> · {row.cap_do}</span>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type IncomingViewPanelProps = {
  open: boolean;
  rows: AdminArticleLienQuanRow[];
  onClose: () => void;
};

function AdminLienQuanIncomingViewPanel({
  open,
  rows,
  onClose,
}: IncomingViewPanelProps) {
  const titleId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (row) =>
        row.tieu_de.toLowerCase().includes(q) ||
        row.slug.toLowerCase().includes(q) ||
        row.loai_quan_he.toLowerCase().includes(q) ||
        labelLoaiQuanHe(row.loai_quan_he).toLowerCase().includes(q),
    );
  }, [rows, query]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      window.requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  return (
    <AdminLienQuanModalPortal open={open}>
      <div className="cins-admin">
        <div
          className="admin-lien-quan-manage-backdrop open"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <div
            className="admin-lien-quan-manage-dialog admin-lien-quan-manage-dialog--view admin-lien-quan-manage-dialog--popup"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onClick={(e) => e.stopPropagation()}
          >
        <div className="admin-lien-quan-manage-dialog__header">
          <h3 id={titleId} className="admin-lien-quan-manage-dialog__title">
            Bài trỏ tới đây (A → bài hiện tại)
          </h3>
          <button
            type="button"
            className="admin-lien-quan-manage-dialog__close"
            aria-label="Đóng"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <p className="form-hint admin-lien-quan-manage-dialog__hint">
          Chỉ xem — {rows.length} cạnh từ bài khác. Sửa liên quan tại bài nguồn
          (cột A).
        </p>

        <div className="admin-lien-quan-manage-toolbar">
          <input
            ref={inputRef}
            type="search"
            className="form-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Lọc theo tên, slug hoặc quan hệ…"
            aria-label="Lọc bài trỏ tới"
            autoComplete="off"
          />
          <span className="admin-lien-quan-manage-toolbar__count" aria-live="polite">
            {filtered.length}/{rows.length}
          </span>
        </div>

        <LienQuanCompactTable rows={filtered} scroll="full" />

        <div className="admin-lien-quan-manage-dialog__footer">
          <button type="button" className="btn-primary" onClick={onClose}>
            Đóng
          </button>
        </div>
          </div>
        </div>
      </div>
    </AdminLienQuanModalPortal>
  );
}

const LOAI_TAB_ORDER = [
  "mon_hoc",
  "nghe",
  "keyword",
  "phan_mem",
  "nganh_dao_tao",
  "blog",
  "event",
  "linh_vuc",
] as const;

function loaiTabLabel(loai: string): string {
  return LOAI_LABELS[loai as keyof typeof LOAI_LABELS] ?? loai;
}

function rowToPickerItem(row: AdminArticleLienQuanRow): AdminArticleLienQuanPickerItem {
  return {
    id: row.id,
    slug: row.slug,
    tieu_de: row.tieu_de,
    loai_bai_viet: row.loai_bai_viet,
    trang_thai_noi_dung: row.trang_thai_noi_dung,
    cover_id: row.cover_id,
    thumbnail: row.thumbnail,
    thumbnail_src: row.thumbnail_src,
  };
}

function ManagePickerRow({
  item,
  mode,
  busy,
  onAction,
  showCapDo = false,
  capDo,
}: {
  item: AdminArticleLienQuanPickerItem;
  mode: "selected" | "available";
  busy: boolean;
  onAction: () => void;
  showCapDo?: boolean;
  capDo?: string | null;
}) {
  return (
    <tr className={mode === "selected" ? "admin-lien-quan-table__row--selected" : ""}>
      <td className="admin-lien-quan-table__col-thumb">
        <LienQuanThumb row={item} variant="lg" />
      </td>
      <td className="admin-lien-quan-table__col-title">
        <span className="admin-lien-quan-title admin-lien-quan-title--plain">
          {item.tieu_de}
        </span>
        <span className="admin-lien-quan-slug">{item.slug}</span>
      </td>
      <td>
        <BadgeLoai loai={item.loai_bai_viet} />
      </td>
      <td>
        <BadgeTrangThai status={item.trang_thai_noi_dung} />
      </td>
      {showCapDo ? (
        <td>
          {capDo ? (
            <span className="admin-lien-quan-cap">{capDo}</span>
          ) : (
            <span className="admin-lien-quan-cap admin-lien-quan-cap--muted">—</span>
          )}
        </td>
      ) : null}
      <td className="admin-lien-quan-table__col-actions">
        {mode === "selected" ? (
          <button
            type="button"
            className="admin-lien-quan-row-btn admin-lien-quan-row-btn--remove"
            disabled={busy}
            onClick={onAction}
          >
            Gỡ
          </button>
        ) : (
          <button
            type="button"
            className="admin-lien-quan-row-btn admin-lien-quan-row-btn--add"
            disabled={busy}
            onClick={onAction}
          >
            + Thêm
          </button>
        )}
      </td>
    </tr>
  );
}

type ManagePanelProps = {
  open: boolean;
  articleId: string;
  loaiBaiViet: string;
  manageMode: AdminLienQuanManageMode;
  draftIds: Set<string>;
  initialManaged: AdminArticleLienQuanRow[];
  busy: boolean;
  onClose: () => void;
  onApply: (ids: string[]) => void;
};

function AdminLienQuanManagePanel({
  open,
  articleId,
  loaiBaiViet,
  manageMode,
  draftIds,
  initialManaged,
  busy,
  onClose,
  onApply,
}: ManagePanelProps) {
  const isNganhMon = manageMode === "nganh_mon_hoc";
  const titleId = useId();
  const addSearchRef = useRef<HTMLInputElement>(null);
  const savedIdsRef = useRef<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [allItems, setAllItems] = useState<AdminArticleLienQuanPickerItem[]>([]);
  const [itemById, setItemById] = useState<
    Map<string, AdminArticleLienQuanPickerItem>
  >(() => new Map());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [selectedLoaiTab, setSelectedLoaiTab] = useState<string>("all");

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    const r = await adminSearchArticlesLienQuanPicker(
      articleId,
      query,
      loaiBaiViet,
    );
    setLoading(false);
    if (r.ok) setAllItems(r.items);
    else setAllItems([]);
  }, [articleId, query, loaiBaiViet]);

  useEffect(() => {
    if (!open) return;
    const ids = new Set(draftIds);
    setSelectedIds(ids);
    savedIdsRef.current = new Set(ids);
    setQuery("");
    const seed = new Map<string, AdminArticleLienQuanPickerItem>();
    for (const row of initialManaged) {
      seed.set(row.id, rowToPickerItem(row));
    }
    setItemById(seed);
    setSelectedLoaiTab("all");
  }, [open, draftIds, initialManaged]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      void loadCatalog();
    }, query.trim() ? 220 : 0);
    return () => window.clearTimeout(t);
  }, [open, loadCatalog, query]);

  useEffect(() => {
    if (!allItems.length) return;
    setItemById((prev) => {
      const next = new Map(prev);
      for (const item of allItems) next.set(item.id, item);
      return next;
    });
  }, [allItems]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onClose]);

  useEffect(() => {
    if (open) {
      window.requestAnimationFrame(() => addSearchRef.current?.focus());
    }
  }, [open]);

  const selectedCount = selectedIds.size;

  const selectedItems = useMemo((): AdminArticleLienQuanRow[] => {
    return [...selectedIds]
      .map((id) => {
        const existing = initialManaged.find((r) => r.id === id);
        if (existing) return existing;
        const pick = itemById.get(id);
        if (!pick) return null;
        return {
          ...pick,
          loai_quan_he: isNganhMon ? "DUNG_TRONG_NGANH" : "LIEN_QUAN",
          cap_do: null,
        };
      })
      .filter((x): x is AdminArticleLienQuanRow => Boolean(x))
      .sort((a, b) => a.tieu_de.localeCompare(b.tieu_de, "vi"));
  }, [selectedIds, itemById, initialManaged, isNganhMon]);

  const selectedLoaiTabs = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of selectedItems) {
      const loai = row.loai_bai_viet || "khac";
      counts.set(loai, (counts.get(loai) ?? 0) + 1);
    }
    const tabs: { id: string; label: string; count: number }[] = [];
    for (const loai of LOAI_TAB_ORDER) {
      const count = counts.get(loai);
      if (count) tabs.push({ id: loai, label: loaiTabLabel(loai), count });
    }
    for (const [loai, count] of counts) {
      if (!(LOAI_TAB_ORDER as readonly string[]).includes(loai)) {
        tabs.push({ id: loai, label: loaiTabLabel(loai), count });
      }
    }
    return tabs;
  }, [selectedItems]);

  const filteredSelectedItems = useMemo(() => {
    if (selectedLoaiTab === "all") return selectedItems;
    return selectedItems.filter((r) => r.loai_bai_viet === selectedLoaiTab);
  }, [selectedItems, selectedLoaiTab]);

  useEffect(() => {
    if (selectedLoaiTab === "all") return;
    if (!selectedLoaiTabs.some((t) => t.id === selectedLoaiTab)) {
      setSelectedLoaiTab("all");
    }
  }, [selectedLoaiTab, selectedLoaiTabs]);

  const availableItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allItems
      .filter((item) => !selectedIds.has(item.id))
      .filter(
        (item) =>
          !q ||
          item.tieu_de.toLowerCase().includes(q) ||
          item.slug.toLowerCase().includes(q),
      );
  }, [allItems, selectedIds, query]);

  const changeStats = useMemo(() => {
    const saved = savedIdsRef.current;
    let added = 0;
    let removed = 0;
    for (const id of selectedIds) {
      if (!saved.has(id)) added += 1;
    }
    for (const id of saved) {
      if (!selectedIds.has(id)) removed += 1;
    }
    return { added, removed, dirty: added > 0 || removed > 0 };
  }, [selectedIds]);

  function addItem(id: string) {
    setSelectedIds((prev) => new Set(prev).add(id));
  }

  function removeItem(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  function clearAllSelected() {
    setSelectedIds(new Set());
  }

  function addAllVisible() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const item of availableItems) next.add(item.id);
      return next;
    });
  }

  return (
    <AdminLienQuanModalPortal open={open}>
      <div className="cins-admin">
        <div
          className="admin-lien-quan-manage-backdrop open"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget && !busy) onClose();
          }}
        >
          <div
            className="admin-lien-quan-manage-dialog admin-lien-quan-manage-dialog--popup"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="admin-lien-quan-manage-dialog__header">
              <h3 id={titleId} className="admin-lien-quan-manage-dialog__title">
                {isNganhMon
                  ? "Môn học trong ngành"
                  : "Quản lý bài liên quan (A → B)"}
              </h3>
              <button
                type="button"
                className="admin-lien-quan-manage-dialog__close"
                aria-label="Đóng"
                disabled={busy}
                onClick={onClose}
              >
                ×
              </button>
            </div>

            <p className="form-hint admin-lien-quan-manage-dialog__hint">
              {isNganhMon ? (
                <>
                  Trái: môn đã gán vào ngành (môn → ngành,{" "}
                  <code>DUNG_TRONG_NGANH</code>). Phải: môn chưa gán — + Thêm.
                  Chỉnh <code>cap_do</code> trên trang ngành nếu cần.
                </>
              ) : (
                <>
                  Trái: bài <strong>đã gán</strong> (A → B). Phải: bài chưa gán — +
                  Thêm. Bài mới dùng <code>LIEN_QUAN</code>.
                </>
              )}{" "}
              <strong>Lưu</strong> để ghi DB.
            </p>

            <div className="admin-lien-quan-manage-split">
              <section
                className="admin-lien-quan-manage-pane admin-lien-quan-manage-pane--selected"
                aria-label="Đã gán"
              >
                <div className="admin-lien-quan-manage-pane__head">
                  <div className="admin-lien-quan-manage-pane__head-row">
                    <span className="admin-lien-quan-manage-pane__title">
                      {isNganhMon ? "Môn đã gán" : "Đã gán"}
                    </span>
                    <span className="admin-lien-quan-manage-pane__badge admin-lien-quan-manage-pane__badge--on">
                      {selectedCount}
                    </span>
                    <button
                      type="button"
                      className="admin-lien-quan-manage-pane__link"
                      disabled={busy || selectedCount === 0}
                      onClick={clearAllSelected}
                    >
                      Gỡ hết
                    </button>
                  </div>
                  {selectedCount > 0 && selectedLoaiTabs.length > 0 ? (
                    <div
                      className="admin-lien-quan-loai-tabs"
                      role="tablist"
                      aria-label="Lọc theo loại bài đã gán"
                    >
                      <button
                        type="button"
                        role="tab"
                        aria-selected={selectedLoaiTab === "all"}
                        className={[
                          "admin-lien-quan-loai-tabs__tab",
                          selectedLoaiTab === "all"
                            ? "admin-lien-quan-loai-tabs__tab--active"
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        onClick={() => setSelectedLoaiTab("all")}
                      >
                        Tất cả
                        <span className="admin-lien-quan-loai-tabs__count">
                          {selectedCount}
                        </span>
                      </button>
                      {selectedLoaiTabs.map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          role="tab"
                          aria-selected={selectedLoaiTab === tab.id}
                          className={[
                            "admin-lien-quan-loai-tabs__tab",
                            selectedLoaiTab === tab.id
                              ? "admin-lien-quan-loai-tabs__tab--active"
                              : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          onClick={() => setSelectedLoaiTab(tab.id)}
                        >
                          {tab.label}
                          <span className="admin-lien-quan-loai-tabs__count">
                            {tab.count}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="admin-lien-quan-table-wrap admin-lien-quan-table-wrap--pane">
                  <table className="admin-lien-quan-table admin-lien-quan-table--manage">
                    <thead>
                      <tr>
                        <th
                          className="admin-lien-quan-table__col-thumb"
                          aria-label="Ảnh"
                        />
                        <th>Bài viết</th>
                        <th>Loại</th>
                        <th>TT</th>
                        {isNganhMon ? <th>cap_do</th> : null}
                        <th className="admin-lien-quan-table__col-actions">
                          Thao tác
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedItems.length === 0 ? (
                        <tr>
                          <td
                            colSpan={isNganhMon ? 6 : 5}
                            className="admin-lien-quan-table__status"
                          >
                            {isNganhMon
                              ? "Chưa có môn nào. Thêm từ cột bên phải."
                              : "Chưa gán bài nào. Thêm từ cột bên phải."}
                          </td>
                        </tr>
                      ) : filteredSelectedItems.length === 0 ? (
                        <tr>
                          <td
                            colSpan={isNganhMon ? 6 : 5}
                            className="admin-lien-quan-table__status"
                          >
                            Không có bài thuộc loại đang chọn.
                          </td>
                        </tr>
                      ) : (
                        filteredSelectedItems.map((row) => (
                          <ManagePickerRow
                            key={row.id}
                            item={rowToPickerItem(row)}
                            mode="selected"
                            busy={busy}
                            showCapDo={isNganhMon}
                            capDo={row.cap_do}
                            onAction={() => removeItem(row.id)}
                          />
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <section
                className="admin-lien-quan-manage-pane admin-lien-quan-manage-pane--available"
                aria-label="Thêm bài"
              >
                <div className="admin-lien-quan-manage-pane__head">
                  <span className="admin-lien-quan-manage-pane__title">
                    {isNganhMon ? "Thêm môn" : "Thêm bài"}
                  </span>
                  <span className="admin-lien-quan-manage-pane__badge">
                    {availableItems.length}
                  </span>
                </div>
                <div className="admin-lien-quan-manage-pane__search">
                  <input
                    ref={addSearchRef}
                    type="search"
                    className="form-input"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={
                      isNganhMon ? "Tìm môn chưa gán…" : "Tìm bài chưa gán…"
                    }
                    aria-label={isNganhMon ? "Tìm môn chưa gán" : "Tìm bài chưa gán"}
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={busy || loading || !availableItems.length}
                    onClick={addAllVisible}
                  >
                    + Tất cả ({availableItems.length})
                  </button>
                </div>
                <div
                  className="admin-lien-quan-table-wrap admin-lien-quan-table-wrap--pane"
                  aria-busy={loading}
                >
                  <table className="admin-lien-quan-table admin-lien-quan-table--manage">
                    <thead>
                      <tr>
                        <th
                          className="admin-lien-quan-table__col-thumb"
                          aria-label="Ảnh"
                        />
                        <th>Bài viết</th>
                        <th>Loại</th>
                        <th>TT</th>
                        <th className="admin-lien-quan-table__col-actions">
                          Thao tác
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="admin-lien-quan-table__status"
                          >
                            Đang tải…
                          </td>
                        </tr>
                      ) : availableItems.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="admin-lien-quan-table__status"
                          >
                            {query.trim()
                              ? "Không có bài khớp (hoặc đã gán hết)."
                              : "Không còn bài để thêm trong danh mục."}
                          </td>
                        </tr>
                      ) : (
                        availableItems.map((item) => (
                          <ManagePickerRow
                            key={item.id}
                            item={item}
                            mode="available"
                            busy={busy}
                            onAction={() => addItem(item.id)}
                          />
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>

            <div className="admin-lien-quan-manage-dialog__footer">
              <span className="admin-lien-quan-manage-dialog__changes">
                {changeStats.dirty ? (
                  <>
                    Thay đổi chưa lưu:
                    {changeStats.added > 0 ? (
                      <> +{changeStats.added} thêm</>
                    ) : null}
                    {changeStats.removed > 0 ? (
                      <> −{changeStats.removed} gỡ</>
                    ) : null}
                  </>
                ) : (
                  <>Không có thay đổi</>
                )}
              </span>
              <div className="admin-lien-quan-manage-dialog__footer-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={busy}
                  onClick={onClose}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={busy || !changeStats.dirty}
                  onClick={() => onApply([...selectedIds])}
                >
                  {busy ? "Đang lưu…" : `Lưu (${selectedCount} bài)`}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLienQuanModalPortal>
  );
}

type Props = {
  articleId: string;
  loaiBaiViet: string;
  outgoing: AdminArticleLienQuanRow[];
  incoming: AdminArticleLienQuanRow[];
  managed: AdminArticleLienQuanRow[];
  manageMode: AdminLienQuanManageMode;
  loading?: boolean;
  error?: string | null;
  onBundleUpdated?: (bundle: AdminArticleLienQuanBundle) => void;
};

export function AdminArticleLienQuanSection({
  articleId,
  loaiBaiViet,
  outgoing,
  incoming,
  managed,
  manageMode,
  loading = false,
  error = null,
  onBundleUpdated,
}: Props) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [incomingPanelOpen, setIncomingPanelOpen] = useState(false);
  const [syncBusy, setSyncBusy] = useState(false);
  const [syncMsg, setSyncMsg] = useState<{ type: "ok" | "err"; text: string } | null>(
    null,
  );
  const [draftIds, setDraftIds] = useState<Set<string>>(() => new Set());

  const managedKey = managed.map((r) => r.id).join(",");

  useEffect(() => {
    setDraftIds(new Set(managed.map((r) => r.id)));
  }, [managedKey]);

  async function applyManaged(ids: string[]) {
    setSyncBusy(true);
    setSyncMsg(null);
    const res = await adminSyncArticleManagedLienQuan(
      articleId,
      loaiBaiViet,
      ids,
    );
    setSyncBusy(false);
    if (!res.ok) {
      setSyncMsg({ type: "err", text: res.message });
      return;
    }
    setDraftIds(new Set(res.bundle.managed.map((r) => r.id)));
    onBundleUpdated?.(res.bundle);
    setSyncMsg({
      type: "ok",
      text:
        manageMode === "nganh_mon_hoc"
          ? "Đã cập nhật môn học trong ngành."
          : "Đã cập nhật bài liên quan.",
    });
    setPanelOpen(false);
  }

  const isNganhMon = manageMode === "nganh_mon_hoc";
  const otherIncomingCount = isNganhMon
    ? incoming.filter(
        (r) =>
          !(
            r.loai_quan_he.toUpperCase() === "DUNG_TRONG_NGANH" &&
            r.loai_bai_viet === "mon_hoc"
          ),
      ).length
    : incoming.length;

  const busy = loading || syncBusy;

  return (
    <div className="admin-lien-quan">
      <div className="form-section">Bài viết liên quan</div>

      {syncMsg ? (
        <p
          className={
            syncMsg.type === "ok"
              ? "admin-edit-form__msg admin-edit-form__msg--ok"
              : "admin-edit-form__msg admin-edit-form__msg--err"
          }
          role="status"
        >
          {syncMsg.text}
        </p>
      ) : null}

      {loading ? (
        <p className="form-hint">Đang tải liên quan…</p>
      ) : error ? (
        <p className="admin-edit-form__msg admin-edit-form__msg--err" role="alert">
          {error}
        </p>
      ) : (
        <>
          <div className="admin-lien-quan-summary">
            <p className="admin-lien-quan-count">
              {isNganhMon ? (
                <>
                  <strong>{managed.length}</strong> môn học trong ngành
                </>
              ) : (
                <>
                  <strong>{managed.length}</strong> đã gán (A → B)
                </>
              )}
              {otherIncomingCount > 0 ? (
                <>
                  {" "}
                  · <strong>{otherIncomingCount}</strong> liên kết khác trỏ tới
                  bài này
                </>
              ) : null}
            </p>
            <button
              type="button"
              className="btn-secondary admin-lien-quan-manage-btn"
              disabled={busy}
              onClick={() => setPanelOpen(true)}
            >
              Quản lý liên quan…
            </button>
          </div>

          {managed.length > 0 ? (
            <LienQuanCompactTable rows={managed.slice(0, 5)} />
          ) : (
            <p className="admin-lien-quan-empty">
              {isNganhMon
                ? "Chưa có môn học trong ngành."
                : "Chưa gán bài liên quan đi ra."}
            </p>
          )}
          {managed.length > 5 ? (
            <p className="form-hint admin-lien-quan-more-hint">
              +{managed.length - 5} bài nữa — mở «Quản lý liên quan» để xem và sửa
              đầy đủ.
            </p>
          ) : null}

          {otherIncomingCount > 0 ? (
            <div className="admin-lien-quan-incoming-bar">
              <span className="admin-lien-quan-incoming-bar__label">
                Liên kết khác trỏ tới bài ({otherIncomingCount}) — chỉ xem
              </span>
              <button
                type="button"
                className="admin-lien-quan-expand-btn"
                aria-label={`Mở bảng ${otherIncomingCount} liên kết trỏ tới bài này`}
                title="Mở bảng đầy đủ"
                onClick={() => setIncomingPanelOpen(true)}
              >
                <ExpandTableIcon />
              </button>
            </div>
          ) : null}
        </>
      )}

      <AdminLienQuanManagePanel
        open={panelOpen}
        articleId={articleId}
        loaiBaiViet={loaiBaiViet}
        manageMode={manageMode}
        draftIds={draftIds}
        initialManaged={managed}
        busy={busy}
        onClose={() => setPanelOpen(false)}
        onApply={applyManaged}
      />

      <AdminLienQuanIncomingViewPanel
        open={incomingPanelOpen}
        rows={
          isNganhMon
            ? incoming.filter(
                (r) =>
                  !(
                    r.loai_quan_he.toUpperCase() === "DUNG_TRONG_NGANH" &&
                    r.loai_bai_viet === "mon_hoc"
                  ),
              )
            : incoming
        }
        onClose={() => setIncomingPanelOpen(false)}
      />
    </div>
  );
}
