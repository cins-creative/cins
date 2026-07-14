"use client";

import { Plus, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { getAdminArticleThumbDisplayUrl } from "@/lib/admin/article-display";
import { readTruongInlineError, truongInlineFetch } from "@/lib/truong/inline-api";

type MonItem = {
  id: string;
  monHocId: string;
  label: string;
  slug: string;
  thuTu: number;
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

  const visibleItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return catalog;
    return catalog.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.slug.toLowerCase().includes(q),
    );
  }, [catalog, query]);

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

  const removeMon = async (monHocId: string, label: string) => {
    if (saving || busy) return;
    if (!confirm(`Gỡ môn «${label}» khỏi chương trình này?`)) return;
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
                placeholder="Tìm theo tên môn…"
                aria-label="Tìm môn học"
                autoComplete="off"
              />
              <p className="tdh-nganh-mon-picker-meta" aria-live="polite">
                {catalogLoading
                  ? "Đang tải danh sách…"
                  : `${visibleItems.length} môn${query.trim() ? " khớp" : " có thể thêm"}`}
                {selectedCount > 0 ? ` · đã chọn ${selectedCount}` : null}
              </p>
              <div
                className="tdh-nganh-mon-picker-list"
                role="listbox"
                aria-multiselectable="true"
                aria-busy={catalogLoading}
              >
                {catalogLoading ? (
                  <p className="tdh-nganh-mon-picker-status">Đang tải…</p>
                ) : visibleItems.length === 0 ? (
                  <p className="tdh-nganh-mon-picker-status">
                    {query.trim()
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
            aria-haspopup="dialog"
            aria-expanded={pickerOpen}
            aria-controls={pickerOpen ? dialogId : undefined}
            onClick={() => (pickerOpen ? closePicker() : openPicker())}
          >
            <Plus size={18} strokeWidth={2.25} aria-hidden />
          </button>
        </div>
        <p className="tdh-nganh-program-edit-mon-chuong-lead">
          Sinh viên chọn môn khi gắn đồ án — tác phẩm hiện trên trang môn học.
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
          {items.map((item) => (
            <li key={item.id}>
              <span className="tdh-nganh-program-edit-mon-chuong-item-main">
                <MonThumb
                  thumbnail={item.thumbnail}
                  coverId={item.coverId}
                  label={item.label}
                />
                <span>{item.label}</span>
              </span>
              <button
                type="button"
                className="tdh-nganh-program-edit-mon-chuong-remove"
                aria-label={`Gỡ ${item.label}`}
                disabled={busy || saving}
                onClick={() => void removeMon(item.monHocId, item.label)}
              >
                <X size={14} strokeWidth={2} aria-hidden />
              </button>
            </li>
          ))}
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
