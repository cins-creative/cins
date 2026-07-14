"use client";

import { ExternalLink, GripVertical, Plus, X } from "lucide-react";
import Link from "next/link";
import {
  Fragment,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { getAdminArticleThumbDisplayUrl } from "@/lib/admin/article-display";
import { articlePublicHref } from "@/lib/articles/article-href";
import { readTruongInlineError, truongInlineFetch } from "@/lib/truong/inline-api";

type MonItem = {
  id: string;
  monHocId: string;
  label: string;
  slug: string;
  thuTu: number;
  ngungDay: boolean;
  thumbnail: string | null;
  coverId: string | null;
};

type CatalogItem = {
  id: string;
  slug: string;
  title: string;
  thumbnail: string | null;
  coverId: string | null;
};

type Props = {
  orgId: string;
  programId: string;
  busy?: boolean;
  onToast?: (msg: string) => void;
};

function monThumbInitials(title: string): string {
  const w = title.trim().split(/\s+/).filter(Boolean);
  if (w.length >= 2) {
    return `${w[0]!.slice(0, 1)}${w[1]!.slice(0, 1)}`.toUpperCase();
  }
  return title.trim().slice(0, 2).toUpperCase() || "MH";
}

function MonThumb({
  thumbnail,
  coverId,
  label,
}: {
  thumbnail?: string | null;
  coverId?: string | null;
  label: string;
}) {
  const thumbUrl = getAdminArticleThumbDisplayUrl({
    thumbnail,
    cover_id: coverId,
  });
  return (
    <span className="tdh-nganh-program-edit-mon-chuong-thumb" aria-hidden>
      {thumbUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- cùng nguồn URL với AdminArticleThumb
        <img
          src={thumbUrl}
          alt=""
          width={40}
          height={30}
          className="tdh-nganh-program-edit-mon-chuong-thumb-img"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <span className="tdh-nganh-program-edit-mon-chuong-thumb-ph">
          {monThumbInitials(label)}
        </span>
      )}
    </span>
  );
}

function normalizeMonItem(item: MonItem): MonItem {
  return {
    ...item,
    ngungDay: Boolean(item.ngungDay),
    thumbnail: item.thumbnail ?? null,
    coverId: item.coverId ?? null,
  };
}

function normalizeCatalogItem(item: CatalogItem): CatalogItem {
  return {
    ...item,
    thumbnail: item.thumbnail ?? null,
    coverId: item.coverId ?? null,
  };
}

export function TruongNganhMonChuongTrinh({
  orgId,
  programId,
  busy = false,
  onToast,
}: Props) {
  const dialogId = useId();
  const searchRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<MonItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [mounted, setMounted] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  /** Vị trí chèn: 0 = trước item đầu, n = sau item cuối. */
  const [insertAt, setInsertAt] = useState<number | null>(null);
  const orderPersistGenRef = useRef(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/truong/${encodeURIComponent(orgId)}/nganh/${encodeURIComponent(programId)}/mon`,
        { cache: "no-store" },
      );
      const json = (await res.json()) as { items?: MonItem[]; error?: string };
      if (!res.ok) {
        setItems([]);
        setError(json.error ?? "Không tải được môn học.");
        return;
      }
      setItems(
        Array.isArray(json.items) ? json.items.map(normalizeMonItem) : [],
      );
    } catch {
      setItems([]);
      setError("Lỗi mạng khi tải môn học.");
    } finally {
      setLoading(false);
    }
  }, [orgId, programId]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    try {
      const res = await truongInlineFetch(
        orgId,
        `/nganh/${encodeURIComponent(programId)}/mon/catalog`,
      );
      if (!res.ok) {
        setCatalog([]);
        return;
      }
      const json = (await res.json()) as { items?: CatalogItem[] };
      setCatalog(
        Array.isArray(json.items) ? json.items.map(normalizeCatalogItem) : [],
      );
    } catch {
      setCatalog([]);
    } finally {
      setCatalogLoading(false);
    }
  }, [orgId, programId]);

  const openPicker = () => {
    setPickerOpen(true);
    setQuery("");
    setSelectedIds(new Set());
    void loadCatalog();
    window.requestAnimationFrame(() => searchRef.current?.focus());
  };

  const closePicker = useCallback(() => {
    setPickerOpen(false);
    setQuery("");
    setSelectedIds(new Set());
  }, []);

  useEffect(() => {
    if (!pickerOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closePicker();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [pickerOpen, closePicker]);

  const trimmedQuery = query.trim();

  const visibleItems = useMemo(() => {
    const q = trimmedQuery.toLowerCase();
    if (!q) return catalog;
    return catalog.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.slug.toLowerCase().includes(q),
    );
  }, [catalog, trimmedQuery]);

  const hasExactCatalogMatch = useMemo(() => {
    const q = trimmedQuery.toLowerCase();
    if (!q) return false;
    return catalog.some((item) => item.title.toLowerCase() === q);
  }, [catalog, trimmedQuery]);

  /** Tên gõ chưa khớp exact trong catalog → cho tạo `mon_hoc` mới (API `tenMonMoi`). */
  const canCreateNew =
    trimmedQuery.length > 0 &&
    trimmedQuery.length <= 120 &&
    !catalogLoading &&
    !hasExactCatalogMatch;

  const selectedCount = selectedIds.size;

  function toggleItem(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const saveSelection = async () => {
    if (saving || busy || selectedCount === 0) return;
    const monHocIds = [...selectedIds];
    setSaving(true);
    setError(null);
    try {
      const res = await truongInlineFetch(
        orgId,
        `/nganh/${encodeURIComponent(programId)}/mon`,
        {
          method: "POST",
          body: JSON.stringify({ monHocIds }),
        },
      );
      if (!res.ok) {
        setError(await readTruongInlineError(res));
        return;
      }
      const json = (await res.json()) as { items?: MonItem[] };
      const added = Array.isArray(json.items)
        ? json.items.map(normalizeMonItem)
        : [];
      if (added.length === 0) {
        setError("Không thêm được môn.");
        return;
      }
      setItems((prev) => [...prev, ...added]);
      onToast?.(
        added.length === 1
          ? `Đã thêm môn «${added[0]!.label}»`
          : `Đã thêm ${added.length} môn`,
      );
      closePicker();
    } catch {
      setError("Lỗi mạng khi thêm môn.");
    } finally {
      setSaving(false);
    }
  };

  const createNewMon = async () => {
    const ten = trimmedQuery;
    if (saving || busy || !ten || !canCreateNew) return;
    setSaving(true);
    setError(null);
    try {
      const res = await truongInlineFetch(
        orgId,
        `/nganh/${encodeURIComponent(programId)}/mon`,
        {
          method: "POST",
          body: JSON.stringify({ tenMonMoi: ten }),
        },
      );
      if (!res.ok) {
        setError(await readTruongInlineError(res));
        return;
      }
      const json = (await res.json()) as { item?: MonItem };
      if (!json.item) {
        setError("Không tạo được môn.");
        return;
      }
      const added = normalizeMonItem(json.item);
      setItems((prev) => [...prev, added]);
      onToast?.(`Đã tạo và thêm môn «${added.label}»`);
      closePicker();
    } catch {
      setError("Lỗi mạng khi tạo môn.");
    } finally {
      setSaving(false);
    }
  };

  const setNgungDay = async (item: MonItem, ngungDay: boolean) => {
    if (saving || busy) return;
    setSaving(true);
    setError(null);
    try {
      const res = await truongInlineFetch(
        orgId,
        `/nganh/${encodeURIComponent(programId)}/mon/${encodeURIComponent(item.monHocId)}`,
        {
          method: "PATCH",
          body: JSON.stringify({ ngungDay }),
        },
      );
      if (!res.ok) {
        setError(await readTruongInlineError(res));
        return;
      }
      const json = (await res.json()) as { item?: MonItem };
      if (!json.item) {
        setError("Không cập nhật được trạng thái môn.");
        return;
      }
      const next = normalizeMonItem(json.item);
      setItems((prev) =>
        prev.map((m) => (m.monHocId === item.monHocId ? next : m)),
      );
      onToast?.(
        ngungDay
          ? `Đã ngưng dạy «${next.label}» — ẩn khỏi form xác thực, vẫn còn trong bộ lọc`
          : `Đã cho dạy lại «${next.label}»`,
      );
    } catch {
      setError("Lỗi mạng khi cập nhật trạng thái môn.");
    } finally {
      setSaving(false);
    }
  };

  const clearDragState = () => {
    setDragIndex(null);
    setInsertAt(null);
  };

  /** Cập nhật UI ngay; PATCH chạy ngầm — gen mới hơn thắng, lỗi thì reload. */
  const schedulePersistOrder = useCallback(
    (ordered: MonItem[]) => {
      const gen = ++orderPersistGenRef.current;
      const monHocIds = ordered.map((m) => m.monHocId);
      void (async () => {
        try {
          const res = await truongInlineFetch(
            orgId,
            `/nganh/${encodeURIComponent(programId)}/mon`,
            {
              method: "PATCH",
              body: JSON.stringify({ monHocIds }),
            },
          );
          if (gen !== orderPersistGenRef.current) return;
          if (!res.ok) {
            setError(await readTruongInlineError(res));
            void load();
          }
        } catch {
          if (gen !== orderPersistGenRef.current) return;
          setError("Lỗi mạng khi sắp xếp môn.");
          void load();
        }
      })();
    },
    [orgId, programId, load],
  );

  /** `gap` = chỉ số khe chèn (0..length). Cùng chỗ với from / from+1 → không đổi. */
  const reorderToGap = (from: number, gap: number) => {
    if (busy) return;
    if (gap === from || gap === from + 1) return;
    let ordered: MonItem[] | null = null;
    setItems((prev) => {
      if (from < 0 || from >= prev.length || gap < 0 || gap > prev.length) {
        return prev;
      }
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      if (!moved) return prev;
      const insertIndex = gap > from ? gap - 1 : gap;
      next.splice(insertIndex, 0, moved);
      ordered = next.map((m, i) => ({ ...m, thuTu: i }));
      return ordered;
    });
    if (ordered) {
      setError(null);
      schedulePersistOrder(ordered);
    }
  };

  const updateInsertGap = (
    index: number,
    clientY: number,
    target: HTMLElement,
  ) => {
    const rect = target.getBoundingClientRect();
    const before = clientY < rect.top + rect.height / 2;
    setInsertAt(before ? index : index + 1);
  };

  const removeMon = async (monHocId: string, label: string) => {
    if (saving || busy) return;
    if (
      !confirm(
        `Gỡ hẳn môn «${label}» khỏi chương trình?\nMôn biến mất khỏi bộ lọc đồ án; bài đã gắn và xác thực vẫn giữ.\nƯu tiên chọn «Ngưng dạy» nếu chỉ muốn ẩn khỏi form xin xác thực.`,
      )
    ) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await truongInlineFetch(
        orgId,
        `/nganh/${encodeURIComponent(programId)}/mon/${encodeURIComponent(monHocId)}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        setError(await readTruongInlineError(res));
        return;
      }
      setItems((prev) => prev.filter((m) => m.monHocId !== monHocId));
      onToast?.(`Đã gỡ môn «${label}»`);
    } catch {
      setError("Lỗi mạng khi gỡ môn.");
    } finally {
      setSaving(false);
    }
  };

  const picker =
    mounted && pickerOpen
      ? createPortal(
          <div
            className="tdh-nganh-mon-picker-backdrop"
            role="presentation"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) closePicker();
            }}
          >
            <div
              className="tdh-nganh-mon-picker-modal"
              id={dialogId}
              role="dialog"
              aria-modal="true"
              aria-labelledby={`${dialogId}-title`}
            >
              <div className="tdh-nganh-mon-picker-head">
                <h5 className="tdh-nganh-mon-picker-title" id={`${dialogId}-title`}>
                  Thêm môn chuyên ngành
                </h5>
                <button
                  type="button"
                  className="tdh-nganh-mon-picker-close"
                  aria-label="Đóng"
                  onClick={closePicker}
                >
                  <X size={16} strokeWidth={2} aria-hidden />
                </button>
              </div>
              <input
                ref={searchRef}
                type="search"
                className="tdh-nganh-program-edit-input tdh-nganh-mon-picker-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  e.preventDefault();
                  if (canCreateNew && selectedCount === 0) {
                    void createNewMon();
                  }
                }}
                placeholder="Tìm theo tên môn…"
                aria-label="Tìm môn học"
                autoComplete="off"
              />
              <p className="tdh-nganh-mon-picker-meta" aria-live="polite">
                {catalogLoading
                  ? "Đang tải danh sách…"
                  : `${visibleItems.length} môn${trimmedQuery ? " khớp" : " có thể thêm"}`}
                {selectedCount > 0 ? ` · đã chọn ${selectedCount}` : null}
                {canCreateNew ? " · có thể tạo mới" : null}
              </p>
              <div
                className="tdh-nganh-mon-picker-list"
                role="listbox"
                aria-multiselectable="true"
                aria-busy={catalogLoading}
              >
                {catalogLoading ? (
                  <p className="tdh-nganh-mon-picker-status">Đang tải…</p>
                ) : (
                  <>
                    {visibleItems.length === 0 ? (
                      <p className="tdh-nganh-mon-picker-status">
                        {trimmedQuery
                          ? "Không có môn khớp bộ lọc."
                          : "Không còn môn để thêm."}
                      </p>
                    ) : (
                      visibleItems.map((item) => {
                        const checked = selectedIds.has(item.id);
                        return (
                          <button
                            key={item.id}
                            type="button"
                            role="option"
                            aria-selected={checked}
                            className={[
                              "tdh-nganh-mon-picker-option",
                              checked ? "is-selected" : "",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                            onClick={() => toggleItem(item.id)}
                          >
                            <span
                              className="tdh-nganh-mon-picker-check"
                              aria-hidden
                              data-checked={checked ? "1" : undefined}
                            />
                            <MonThumb
                              thumbnail={item.thumbnail}
                              coverId={item.coverId}
                              label={item.title}
                            />
                            <span className="tdh-nganh-mon-picker-option-text">
                              <span className="tdh-nganh-mon-picker-option-title">
                                {item.title}
                              </span>
                              <span className="tdh-nganh-mon-picker-option-slug">
                                {item.slug}
                              </span>
                            </span>
                          </button>
                        );
                      })
                    )}
                    {canCreateNew ? (
                      <button
                        type="button"
                        className="tdh-nganh-mon-picker-create"
                        disabled={busy || saving}
                        onClick={() => void createNewMon()}
                      >
                        <Plus size={16} strokeWidth={2.25} aria-hidden />
                        <span>
                          Tạo môn mới «{trimmedQuery}»
                        </span>
                      </button>
                    ) : null}
                  </>
                )}
              </div>
              <div className="tdh-nganh-mon-picker-footer">
                <button
                  type="button"
                  className="tdh-inline-btn ghost"
                  disabled={saving}
                  onClick={closePicker}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className="tdh-inline-btn primary"
                  disabled={busy || saving || selectedCount === 0}
                  onClick={() => void saveSelection()}
                >
                  {saving
                    ? "Đang lưu…"
                    : selectedCount > 0
                      ? `Lưu (${selectedCount})`
                      : "Lưu"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="tdh-nganh-program-edit-mon-chuong">
      <div className="tdh-nganh-program-edit-mon-chuong-head">
        <div className="tdh-nganh-program-edit-mon-chuong-head-row">
          <h4 className="tdh-nganh-program-edit-mon-chuong-title">
            Môn chuyên ngành
          </h4>
          <button
            type="button"
            className="tdh-nganh-program-edit-mon-chuong-add-btn"
            disabled={busy || saving}
            aria-label="Thêm môn chuyên ngành"
            title="Thêm môn chuyên ngành — chọn từ danh sách hoặc tạo mới để sinh viên gắn đồ án"
            aria-haspopup="dialog"
            aria-expanded={pickerOpen}
            aria-controls={pickerOpen ? dialogId : undefined}
            onClick={() => (pickerOpen ? closePicker() : openPicker())}
          >
            <Plus size={18} strokeWidth={2.25} aria-hidden />
          </button>
        </div>
        <p className="tdh-nganh-program-edit-mon-chuong-lead">
          Hỗ trợ sinh viên chọn môn khi gắn đồ án — kéo tay nắm để sắp thứ tự
          (hiện trong bộ lọc / form xác thực).
        </p>
      </div>

      {loading ? (
        <p className="tdh-nganh-program-edit-mon-chuong-hint">Đang tải…</p>
      ) : items.length === 0 ? (
        <p className="tdh-nganh-program-edit-mon-chuong-hint">
          Chưa có môn — bấm + để chọn từ danh sách.
        </p>
      ) : (
        <ul className="tdh-nganh-program-edit-mon-chuong-list">
          {items.map((item, index) => {
            const showInsertBefore =
              dragIndex != null &&
              insertAt === index &&
              insertAt !== dragIndex &&
              insertAt !== dragIndex + 1;
            return (
              <Fragment key={item.id}>
                {showInsertBefore ? (
                  <li
                    className="tdh-nganh-program-edit-mon-chuong-insert"
                    aria-hidden
                  />
                ) : null}
                <li
                  className={[
                    "tdh-nganh-program-edit-mon-chuong-item",
                    item.ngungDay ? "is-ngung-day" : "",
                    dragIndex === index ? "is-dragging" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    updateInsertGap(index, e.clientY, e.currentTarget);
                  }}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    updateInsertGap(index, e.clientY, e.currentTarget);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const from =
                      dragIndex ??
                      Number.parseInt(e.dataTransfer.getData("text/plain"), 10);
                    const gap =
                      insertAt ??
                      (e.clientY <
                      e.currentTarget.getBoundingClientRect().top +
                        e.currentTarget.getBoundingClientRect().height / 2
                        ? index
                        : index + 1);
                    if (!Number.isNaN(from)) reorderToGap(from, gap);
                    clearDragState();
                  }}
                >
                  <button
                    type="button"
                    className="tdh-nganh-program-edit-mon-chuong-drag"
                    draggable={!busy}
                    aria-label={`Kéo để sắp xếp ${item.label}`}
                    title="Kéo để đổi thứ tự — ảnh hưởng bộ lọc và form xin xác thực"
                    disabled={busy}
                    onDragStart={(e) => {
                      if (busy) {
                        e.preventDefault();
                        return;
                      }
                      setDragIndex(index);
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("text/plain", String(index));
                    }}
                    onDragEnd={clearDragState}
                  >
                    <GripVertical size={16} strokeWidth={2} aria-hidden />
                  </button>
                  <span className="tdh-nganh-program-edit-mon-chuong-item-main">
                    <span
                      className="tdh-nganh-program-edit-mon-chuong-index"
                      aria-hidden
                    >
                      {index + 1}
                    </span>
                    <MonThumb
                      thumbnail={item.thumbnail}
                      coverId={item.coverId}
                      label={item.label}
                    />
                    {item.slug ? (
                      <Link
                        href={articlePublicHref("mon_hoc", item.slug)}
                        className="tdh-nganh-program-edit-mon-chuong-item-label is-link"
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Mở trang môn học"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {item.label}
                        <ExternalLink
                          size={12}
                          strokeWidth={2.2}
                          aria-hidden
                          className="tdh-nganh-program-edit-mon-chuong-item-ext"
                        />
                      </Link>
                    ) : (
                      <span className="tdh-nganh-program-edit-mon-chuong-item-label">
                        {item.label}
                      </span>
                    )}
                  </span>
                  <span className="tdh-nganh-program-edit-mon-chuong-item-actions">
                    <select
                      className={[
                        "tdh-nganh-program-edit-mon-chuong-status-select",
                        item.ngungDay ? "is-ngung-day" : "is-active",
                      ].join(" ")}
                      value={item.ngungDay ? "ngung_day" : "hoat_dong"}
                      disabled={busy || saving}
                      aria-label={`Trạng thái môn ${item.label}`}
                      title={
                        item.ngungDay
                          ? "Ngưng dạy — ẩn khỏi form xin xác thực; vẫn hiện trong bộ lọc đồ án. Chọn Hoạt động để mở lại."
                          : "Hoạt động — sinh viên có thể chọn môn khi xin xác thực. Chọn Ngưng dạy để ẩn khỏi form, vẫn giữ trong bộ lọc."
                      }
                      onChange={(e) => {
                        const nextNgung = e.target.value === "ngung_day";
                        if (nextNgung === item.ngungDay) return;
                        void setNgungDay(item, nextNgung);
                      }}
                    >
                      <option value="hoat_dong">Hoạt động</option>
                      <option value="ngung_day">Ngưng dạy</option>
                    </select>
                    <button
                      type="button"
                      className="tdh-nganh-program-edit-mon-chuong-remove"
                      aria-label={`Gỡ hẳn ${item.label}`}
                      title="Gỡ hẳn khỏi chương trình và bộ lọc đồ án. Bài đã gắn / xác thực vẫn giữ — ưu tiên Ngưng dạy nếu chỉ muốn ẩn form."
                      disabled={busy || saving}
                      onClick={() => void removeMon(item.monHocId, item.label)}
                    >
                      <X size={14} strokeWidth={2} aria-hidden />
                    </button>
                  </span>
                </li>
              </Fragment>
            );
          })}
          {dragIndex != null &&
          insertAt === items.length &&
          insertAt !== dragIndex &&
          insertAt !== dragIndex + 1 ? (
            <li
              className="tdh-nganh-program-edit-mon-chuong-insert"
              aria-hidden
            />
          ) : null}
        </ul>
      )}

      {error ? (
        <p className="tdh-nganh-program-edit-error" role="alert">
          {error}
        </p>
      ) : null}

      {picker}
    </div>
  );
}
