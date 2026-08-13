"use client";

import {
  Check,
  ChevronDown,
  ExternalLink,
  Loader2,
  Plus,
  Search,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import {
  useTagSuggestSearch,
  type TagSuggestRow,
} from "@/components/tag/useTagSuggestSearch";
import { articlePublicHref } from "@/lib/articles/article-href";
import {
  fetchTagSuggestIndex,
  titlesMatchQuery,
} from "@/lib/tag/suggest-index-client";
import type { ShopNhom } from "@/lib/shop/types";

type TagInputValue = {
  id: string;
  tieu_de: string;
  loai_bai_viet: "fandom";
  da_verify?: boolean;
};

const FANDOM_SHEET_MAX = 40;
const FANDOM_MAX_TAGS = 12;

type DanhMucOpt = {
  id: string;
  slug: string;
  ten: string;
  moTa: string | null;
  idCha?: string | null;
};

type GiaTriOpt = {
  id: string;
  slug: string;
  ten: string;
};

type FacetOpt = {
  id: string;
  slug: string;
  ten: string;
  kieu: "chon_nhieu" | "chon_mot";
  giaTri: GiaTriOpt[];
};

type TaxonomyPayload = {
  danhMuc: DanhMucOpt[];
  facets: FacetOpt[];
};

type Props = {
  nhom: ShopNhom;
  disabled?: boolean;
  onUpdated: (n: ShopNhom) => void;
  onError: (msg: string | null) => void;
};

let taxonomyCache: TaxonomyPayload | null = null;
let taxonomyPromise: Promise<TaxonomyPayload | null> | null = null;

async function loadTaxonomy(): Promise<TaxonomyPayload | null> {
  if (taxonomyCache) return taxonomyCache;
  if (!taxonomyPromise) {
    taxonomyPromise = fetch("/api/shop/danh-muc", { cache: "force-cache" })
      .then(async (res) => {
        const json = (await res.json().catch(() => null)) as
          | (TaxonomyPayload & { error?: string })
          | null;
        if (!res.ok || !json?.danhMuc || !json?.facets) return null;
        taxonomyCache = {
          danhMuc: json.danhMuc,
          facets: json.facets.filter((f) => f.slug !== "fandom"),
        };
        return taxonomyCache;
      })
      .catch(() => null)
      .finally(() => {
        taxonomyPromise = null;
      });
  }
  return taxonomyPromise;
}

function sameIdSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((id) => set.has(id));
}

type DropdownOption = {
  id: string;
  ten: string;
  moTa?: string | null;
  group?: string | null;
};

function BaoThieuDanhMucForm({
  nhomId,
  tuKhoa,
  ganNhat,
  disabled,
  onSubmitted,
  onError,
  onDone,
}: {
  nhomId: string;
  tuKhoa: string;
  ganNhat: DropdownOption[];
  disabled?: boolean;
  onSubmitted: (n: ShopNhom) => void;
  onError: (msg: string | null) => void;
  onDone: () => void;
}) {
  const [moTa, setMoTa] = useState("");
  const [ganNhatId, setGanNhatId] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    onError(null);
    try {
      const res = await fetch("/api/shop/danh-muc/yeu-cau", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idNhom: nhomId,
          moTa,
          tuKhoa,
          idDanhMucGanNhat: ganNhatId || null,
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        item?: ShopNhom;
        error?: string;
      } | null;
      if (!res.ok || !json?.item) {
        onError(json?.error ?? "Không gửi được yêu cầu.");
        return;
      }
      onSubmitted(json.item);
      onDone();
    } catch {
      onError("Không gửi được yêu cầu.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="shop-kho-loai-dd-missing">
      <p className="shop-kho-loai-dd-empty">
        Đề xuất «{tuKhoa.trim() || "danh mục mới"}»
      </p>
      <p className="shop-kho-loai-dd-missing-lead">
        Danh mục này chưa có trên CINs. Gửi đề xuất — hàng vẫn bán, chưa lên bộ
        lọc.
      </p>
      <textarea
        value={moTa}
        disabled={disabled || busy}
        placeholder="Nó là cái gì / dùng để làm gì? (tối thiểu 20 ký tự)"
        rows={3}
        onChange={(e) => setMoTa(e.target.value)}
      />
      {ganNhat.length > 0 ? (
        <label className="shop-kho-loai-dd-missing-near">
          Gần giống (không bắt buộc)
          <select
            value={ganNhatId}
            disabled={disabled || busy}
            onChange={(e) => setGanNhatId(e.target.value)}
          >
            <option value="">Không thuộc mục nào đang có</option>
            {ganNhat.map((o) => (
              <option key={o.id} value={o.id}>
                {o.ten}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <button
        type="button"
        className="shop-kho-loai-dd-sheet-done"
        disabled={disabled || busy || moTa.trim().length < 20}
        onClick={() => void submit()}
      >
        {busy ? "Đang gửi…" : "Gửi đề xuất"}
      </button>
    </div>
  );
}

function TaxSelectDropdown({
  label,
  placeholder,
  options,
  selectedIds,
  multiple,
  searchable = true,
  searchPlaceholder = "Tìm…",
  disabled,
  onToggle,
  onClear,
  missingCategory,
  pendingLabel,
}: {
  label: string;
  placeholder: string;
  options: DropdownOption[];
  selectedIds: string[];
  multiple: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  disabled?: boolean;
  onToggle: (id: string) => void;
  onClear?: () => void;
  missingCategory?: {
    nhomId: string;
    onSubmitted: (n: ShopNhom) => void;
    onError: (msg: string | null) => void;
  };
  /** Tên đề xuất đang chờ — hiện thay option «Khác». */
  pendingLabel?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [q, setQ] = useState("");
  const [deXuatOpen, setDeXuatOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const titleId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setQ("");
      setDeXuatOpen(false);
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const t = window.setTimeout(() => searchRef.current?.focus(), 40);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
      window.clearTimeout(t);
    };
  }, [open]);

  const selected = useMemo(() => {
    const map = new Map(options.map((o) => [o.id, o]));
    return selectedIds
      .map((id) => map.get(id))
      .filter((o): o is DropdownOption => Boolean(o));
  }, [options, selectedIds]);

  const pendingTen = pendingLabel?.trim() || "";
  const hasPending = selected.length === 0 && Boolean(pendingTen);
  const hasValue = selected.length > 0 || hasPending;

  const filtered = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase("vi");
    if (!needle) return options;
    return options.filter((o) => {
      const hay = `${o.ten} ${o.moTa ?? ""} ${o.group ?? ""}`;
      return hay.toLocaleLowerCase("vi").includes(needle);
    });
  }, [options, q]);

  const exactMatch = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase("vi");
    if (!needle) return false;
    return options.some((o) => o.ten.toLocaleLowerCase("vi") === needle);
  }, [options, q]);

  const canDeXuat = Boolean(missingCategory && q.trim() && !exactMatch);

  const summary =
    selected.length === 0
      ? pendingTen || placeholder
      : selected.length === 1
        ? selected[0]!.ten
        : `${selected[0]!.ten} +${selected.length - 1}`;

  function pick(id: string) {
    onToggle(id);
    if (!multiple) setOpen(false);
  }

  const overlay =
    open && mounted
      ? createPortal(
          <div
            className="shop-kho-loai-dd-overlay"
            role="presentation"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setOpen(false);
            }}
          >
            <div
              className="shop-kho-loai-dd-sheet"
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <header className="shop-kho-loai-dd-sheet-head">
                <div className="shop-kho-loai-dd-sheet-titles">
                  <h3 id={titleId}>{label}</h3>
                  <p>
                    {multiple
                      ? selected.length > 0
                        ? `Đã chọn ${selected.length}`
                        : "Chọn một hoặc nhiều"
                      : hasPending
                        ? "Đã gửi đề xuất — chọn mục có sẵn nếu thấy đúng"
                        : "Chọn một mục, hoặc đề xuất nếu chưa có"}
                  </p>
                </div>
                <button
                  type="button"
                  className="shop-kho-loai-dd-sheet-close"
                  aria-label="Đóng"
                  onClick={() => setOpen(false)}
                >
                  <X size={18} strokeWidth={2.2} aria-hidden />
                </button>
              </header>

              {searchable ? (
                <label className="shop-kho-loai-dd-search shop-kho-loai-dd-search--sheet">
                  <Search size={15} strokeWidth={2.2} aria-hidden />
                  <input
                    ref={searchRef}
                    type="search"
                    value={q}
                    placeholder={
                      missingCategory
                        ? "Tìm hoặc gõ tên rồi bấm +"
                        : searchPlaceholder
                    }
                    disabled={disabled}
                    onChange={(e) => {
                      setQ(e.target.value);
                      if (!e.target.value.trim()) setDeXuatOpen(false);
                    }}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === "Enter" && canDeXuat) {
                        e.preventDefault();
                        setDeXuatOpen(true);
                      }
                    }}
                  />
                  {q ? (
                    <button
                      type="button"
                      className="shop-kho-loai-dd-search-clear"
                      aria-label="Xóa tìm kiếm"
                      onClick={() => {
                        setQ("");
                        setDeXuatOpen(false);
                        searchRef.current?.focus();
                      }}
                    >
                      <X size={14} strokeWidth={2.4} aria-hidden />
                    </button>
                  ) : null}
                  {missingCategory ? (
                    <button
                      type="button"
                      className="shop-kho-loai-dd-search-add"
                      aria-label={
                        canDeXuat
                          ? `Đề xuất danh mục «${q.trim()}»`
                          : "Gõ tên danh mục chưa có rồi bấm +"
                      }
                      title={
                        exactMatch
                          ? "Danh mục này đã có — chọn trong danh sách"
                          : "Đề xuất danh mục hàng chưa có"
                      }
                      disabled={disabled || !canDeXuat}
                      onClick={() => setDeXuatOpen(true)}
                    >
                      <Plus size={16} strokeWidth={2.4} aria-hidden />
                    </button>
                  ) : null}
                </label>
              ) : null}

              <div
                className="shop-kho-loai-dd-options shop-kho-loai-dd-options--sheet"
                id={listId}
                role="listbox"
                aria-multiselectable={multiple || undefined}
                aria-label={label}
              >
                {filtered.map((o, i) => {
                  const on = selectedIds.includes(o.id);
                  const prev = i > 0 ? filtered[i - 1] : null;
                  const showGroup =
                    Boolean(o.group) && o.group !== prev?.group;
                  return (
                    <div key={o.id}>
                      {showGroup ? (
                        <p className="shop-kho-loai-dd-group">{o.group}</p>
                      ) : null}
                      <button
                        type="button"
                        role="option"
                        aria-selected={on}
                        className={`shop-kho-loai-dd-option${on ? " is-on" : ""}`}
                        disabled={disabled}
                        onClick={() => pick(o.id)}
                      >
                        <span
                          className={`shop-kho-loai-dd-check${on ? " is-on" : ""}`}
                          aria-hidden
                        >
                          {on ? <Check size={12} strokeWidth={3} /> : null}
                        </span>
                        <span className="shop-kho-loai-dd-option-copy">
                          <strong>{o.ten}</strong>
                          {o.moTa ? <em>{o.moTa}</em> : null}
                        </span>
                      </button>
                    </div>
                  );
                })}
                {canDeXuat && !deXuatOpen ? (
                  <button
                    type="button"
                    className="shop-kho-loai-dd-option shop-kho-loai-dd-option--create"
                    disabled={disabled}
                    onClick={() => setDeXuatOpen(true)}
                  >
                    <span
                      className="shop-kho-loai-dd-check shop-kho-loai-dd-check--plus"
                      aria-hidden
                    >
                      <Plus size={12} strokeWidth={3} />
                    </span>
                    <span className="shop-kho-loai-dd-option-copy">
                      <strong>Đề xuất «{q.trim()}»</strong>
                      <em>Danh mục này chưa có trên CINs</em>
                    </span>
                  </button>
                ) : null}
                {deXuatOpen && missingCategory && q.trim() ? (
                  <BaoThieuDanhMucForm
                    nhomId={missingCategory.nhomId}
                    tuKhoa={q}
                    ganNhat={options}
                    disabled={disabled}
                    onSubmitted={missingCategory.onSubmitted}
                    onError={missingCategory.onError}
                    onDone={() => setOpen(false)}
                  />
                ) : null}
                {filtered.length === 0 && !canDeXuat && !deXuatOpen ? (
                  <p className="shop-kho-loai-dd-empty">Không khớp.</p>
                ) : null}
              </div>

              <footer className="shop-kho-loai-dd-sheet-foot">
                {onClear && hasValue ? (
                  <button
                    type="button"
                    className="shop-kho-loai-dd-sheet-ghost"
                    disabled={disabled}
                    onClick={onClear}
                  >
                    Xóa chọn
                  </button>
                ) : (
                  <span />
                )}
                <button
                  type="button"
                  className="shop-kho-loai-dd-sheet-done"
                  onClick={() => setOpen(false)}
                >
                  {multiple ? "Xong" : "Đóng"}
                </button>
              </footer>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="shop-kho-loai-dd">
      <span className="shop-kho-loai-dd-label">{label}</span>
      <button
        type="button"
        className={`shop-kho-loai-dd-trigger${open ? " is-open" : ""}${
          hasValue ? " has-value" : ""
        }`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        <span className="shop-kho-loai-dd-summary">{summary}</span>
        <ChevronDown size={16} strokeWidth={2.2} aria-hidden />
      </button>

      {hasValue ? (
        <div className="shop-kho-loai-dd-tags">
          {selected.map((o) => (
            <button
              key={o.id}
              type="button"
              className="shop-kho-loai-dd-tag"
              disabled={disabled}
              onClick={() => onToggle(o.id)}
              title={`Bỏ «${o.ten}»`}
            >
              <span>{o.ten}</span>
              <X size={12} strokeWidth={2.4} aria-hidden />
            </button>
          ))}
          {hasPending ? (
            <button
              type="button"
              className="shop-kho-loai-dd-tag"
              disabled={disabled || !onClear}
              onClick={() => onClear?.()}
              title={`Bỏ đề xuất «${pendingTen}»`}
            >
              <span>{pendingTen}</span>
              <X size={12} strokeWidth={2.4} aria-hidden />
            </button>
          ) : null}
          {onClear && selected.length > 1 ? (
            <button
              type="button"
              className="shop-kho-loai-dd-clear"
              disabled={disabled}
              onClick={onClear}
            >
              Xóa hết
            </button>
          ) : null}
        </div>
      ) : null}

      {overlay}
    </div>
  );
}

/** Phân loại (fandom) — cùng sheet overlay như TaxSelectDropdown, search + tạo thẻ. */
function FandomTaxSelect({
  value,
  onChange,
  disabled,
  maxTags = FANDOM_MAX_TAGS,
  onError,
}: {
  value: TagInputValue[];
  onChange: (next: TagInputValue[]) => void;
  disabled?: boolean;
  maxTags?: number;
  onError?: (msg: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [q, setQ] = useState("");
  const [browse, setBrowse] = useState<TagSuggestRow[]>([]);
  const [creating, setCreating] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const titleId = useId();

  const selectedIds = useMemo(() => new Set(value.map((t) => t.id)), [value]);
  const atMax = value.length >= maxTags;
  const trimmed = q.trim();

  const {
    suggestions,
    loading,
    refining,
    hasExactSuggestion,
    ensureIndex,
  } = useTagSuggestSearch({
    enabled: open && trimmed.length > 0,
    query: q,
    loaiFilter: "fandom",
    excludeIds: selectedIds,
    max: FANDOM_SHEET_MAX,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setQ("");
      return;
    }
    ensureIndex();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const t = window.setTimeout(() => searchRef.current?.focus(), 40);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
      window.clearTimeout(t);
    };
    // Chỉ theo `open` — tránh reset sheet khi ensureIndex đổi identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open-only
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void (async () => {
      const rows = await fetchTagSuggestIndex();
      if (cancelled) return;
      const fandoms = rows
        .filter((r) => r.loai_bai_viet === "fandom")
        .sort(
          (a, b) =>
            (b.so_gan ?? 0) - (a.so_gan ?? 0) ||
            a.tieu_de.localeCompare(b.tieu_de, "vi"),
        )
        .slice(0, FANDOM_SHEET_MAX);
      setBrowse(fandoms);
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const listRows = useMemo(() => {
    if (trimmed) {
      return suggestions.filter((r) => !selectedIds.has(r.id));
    }
    return browse.filter((r) => !selectedIds.has(r.id));
  }, [trimmed, suggestions, browse, selectedIds]);

  const canCreate =
    Boolean(trimmed) &&
    !hasExactSuggestion &&
    !listRows.some((r) => titlesMatchQuery(r, trimmed)) &&
    !atMax;

  const summary =
    value.length === 0
      ? "Chọn phân loại…"
      : value.length === 1
        ? value[0]!.tieu_de
        : `${value[0]!.tieu_de} +${value.length - 1}`;

  const addTag = useCallback(
    (tag: TagInputValue) => {
      if (value.some((t) => t.id === tag.id)) return;
      if (value.length >= maxTags) return;
      onChange([...value, tag]);
    },
    [maxTags, onChange, value],
  );

  const removeTag = useCallback(
    (id: string) => {
      onChange(value.filter((t) => t.id !== id));
    },
    [onChange, value],
  );

  const clearAll = useCallback(() => {
    onChange([]);
  }, [onChange]);

  const createTag = useCallback(async () => {
    const ten = trimmed;
    if (!ten || creating || atMax) return;
    setCreating(true);
    onError?.(null);
    try {
      const res = await fetch("/api/tag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ten, loai: "fandom" }),
      });
      const json = (await res.json().catch(() => null)) as
        | { id?: string; error?: string }
        | null;
      if (!res.ok || !json?.id) {
        onError?.(json?.error ?? "Không tạo được phân loại.");
        return;
      }
      addTag({
        id: json.id,
        tieu_de: ten,
        loai_bai_viet: "fandom",
        da_verify: false,
      });
      setQ("");
    } finally {
      setCreating(false);
    }
  }, [addTag, atMax, creating, onError, trimmed]);

  const showLoading =
    trimmed.length > 0 && loading && listRows.length === 0 && !canCreate;

  const overlay =
    open && mounted
      ? createPortal(
          <div
            className="shop-kho-loai-dd-overlay"
            role="presentation"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setOpen(false);
            }}
          >
            <div
              className="shop-kho-loai-dd-sheet"
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <header className="shop-kho-loai-dd-sheet-head">
                <div className="shop-kho-loai-dd-sheet-titles">
                  <h3 id={titleId}>Phân loại</h3>
                  <p>
                    {atMax
                      ? `Đã đạt tối đa ${maxTags}`
                      : value.length > 0
                        ? `Đã chọn ${value.length}/${maxTags}`
                        : `Chọn tối đa ${maxTags} · gõ để tìm hoặc tạo`}
                  </p>
                </div>
                <button
                  type="button"
                  className="shop-kho-loai-dd-sheet-close"
                  aria-label="Đóng"
                  onClick={() => setOpen(false)}
                >
                  <X size={18} strokeWidth={2.2} aria-hidden />
                </button>
              </header>

              <label className="shop-kho-loai-dd-search shop-kho-loai-dd-search--sheet">
                <Search size={15} strokeWidth={2.2} aria-hidden />
                <input
                  ref={searchRef}
                  type="search"
                  value={q}
                  placeholder="Tìm hoặc gõ tên rồi bấm +"
                  disabled={disabled}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === "Enter" && canCreate) {
                      e.preventDefault();
                      void createTag();
                    }
                  }}
                />
                {q ? (
                  <button
                    type="button"
                    className="shop-kho-loai-dd-search-clear"
                    aria-label="Xóa tìm kiếm"
                    onClick={() => {
                      setQ("");
                      searchRef.current?.focus();
                    }}
                  >
                    <X size={14} strokeWidth={2.4} aria-hidden />
                  </button>
                ) : null}
                <button
                  type="button"
                  className="shop-kho-loai-dd-search-add"
                  aria-label={
                    canCreate
                      ? `Tạo phân loại «${trimmed}»`
                      : "Gõ tên phân loại chưa có rồi bấm +"
                  }
                  title={
                    atMax
                      ? `Đã đạt tối đa ${maxTags}`
                      : trimmed && !canCreate
                        ? "Phân loại này đã có — chọn trong danh sách"
                        : "Tạo phân loại mới"
                  }
                  disabled={disabled || creating || !canCreate}
                  onClick={() => void createTag()}
                >
                  <Plus size={16} strokeWidth={2.4} aria-hidden />
                </button>
              </label>

              <div
                className="shop-kho-loai-dd-options shop-kho-loai-dd-options--sheet"
                id={listId}
                role="listbox"
                aria-multiselectable
                aria-label="Phân loại"
              >
                {showLoading || (refining && listRows.length === 0) ? (
                  <p className="shop-kho-loai-dd-empty shop-kho-loai-dd-empty--loading">
                    <Loader2 size={14} className="shop-spin" aria-hidden />
                    {refining ? "Đang tinh chỉnh…" : "Đang tìm…"}
                  </p>
                ) : null}

                {canCreate ? (
                  <button
                    type="button"
                    className="shop-kho-loai-dd-option shop-kho-loai-dd-option--create"
                    disabled={disabled || creating}
                    onClick={() => void createTag()}
                  >
                    <span
                      className="shop-kho-loai-dd-check shop-kho-loai-dd-check--plus"
                      aria-hidden
                    >
                      <Plus size={12} strokeWidth={3} />
                    </span>
                    <span className="shop-kho-loai-dd-option-copy">
                      <strong>Tạo «{trimmed}»</strong>
                      <em>Phân loại mới</em>
                    </span>
                  </button>
                ) : !trimmed && !atMax ? (
                  <button
                    type="button"
                    className="shop-kho-loai-dd-option shop-kho-loai-dd-option--create"
                    disabled={disabled}
                    onClick={() => searchRef.current?.focus()}
                  >
                    <span
                      className="shop-kho-loai-dd-check shop-kho-loai-dd-check--plus"
                      aria-hidden
                    >
                      <Plus size={12} strokeWidth={3} />
                    </span>
                    <span className="shop-kho-loai-dd-option-copy">
                      <strong>Tạo phân loại mới</strong>
                      <em>Gõ tên rồi bấm + hoặc Enter</em>
                    </span>
                  </button>
                ) : null}

                {listRows.map((tag) => {
                  const nguoi = tag.so_nguoi_tagged ?? 0;
                  const slug = tag.slug?.trim() || "";
                  const href = slug
                    ? articlePublicHref("fandom", slug)
                    : null;
                  const nguoiLabel =
                    nguoi <= 0
                      ? ""
                      : nguoi === 1
                        ? "1 người gắn phân loại này"
                        : `${nguoi} người gắn phân loại này`;
                  return (
                    <div
                      key={tag.id}
                      className="shop-kho-loai-dd-option-row"
                    >
                      <button
                        type="button"
                        role="option"
                        aria-selected={false}
                        className="shop-kho-loai-dd-option"
                        disabled={disabled || atMax}
                        onClick={() =>
                          addTag({
                            id: tag.id,
                            tieu_de: tag.tieu_de,
                            loai_bai_viet: "fandom",
                            da_verify: tag.da_verify,
                          })
                        }
                      >
                        <span className="shop-kho-loai-dd-check" aria-hidden />
                        <span className="shop-kho-loai-dd-option-copy">
                          <strong className="shop-kho-loai-dd-option-title">
                            {tag.tieu_de}
                          </strong>
                        </span>
                        {nguoi > 0 ? (
                          <span
                            className="shop-kho-loai-dd-gan"
                            title={nguoiLabel}
                            aria-label={nguoiLabel}
                          >
                            <span className="shop-kho-loai-dd-gan-num">
                              {nguoi}
                            </span>
                            <span className="shop-kho-loai-dd-gan-hint">
                              người gắn
                            </span>
                          </span>
                        ) : (
                          <span className="shop-kho-loai-dd-gan is-empty" />
                        )}
                      </button>
                      {href ? (
                        <a
                          className="shop-kho-loai-dd-open"
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={`Mở bài «${tag.tieu_de}» tab mới`}
                          aria-label={`Mở bài «${tag.tieu_de}» tab mới`}
                          onClick={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                        >
                          <ExternalLink size={14} strokeWidth={2.2} aria-hidden />
                        </a>
                      ) : null}
                    </div>
                  );
                })}

                {!showLoading &&
                !refining &&
                listRows.length === 0 &&
                !canCreate &&
                (trimmed || atMax) ? (
                  <p className="shop-kho-loai-dd-empty">
                    {trimmed ? "Không khớp." : "Chưa có phân loại để chọn."}
                  </p>
                ) : null}
              </div>

              <footer className="shop-kho-loai-dd-sheet-foot">
                {value.length > 0 ? (
                  <button
                    type="button"
                    className="shop-kho-loai-dd-sheet-ghost"
                    disabled={disabled}
                    onClick={clearAll}
                  >
                    Xóa chọn
                  </button>
                ) : (
                  <span />
                )}
                <button
                  type="button"
                  className="shop-kho-loai-dd-sheet-done"
                  onClick={() => setOpen(false)}
                >
                  Xong
                </button>
              </footer>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="shop-kho-loai-dd shop-kho-loai-fandom">
      <span className="shop-kho-loai-dd-label">Phân loại</span>
      <button
        type="button"
        className={`shop-kho-loai-dd-trigger${open ? " is-open" : ""}${
          value.length ? " has-value" : ""
        }`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        <span className="shop-kho-loai-dd-summary">{summary}</span>
        <ChevronDown size={16} strokeWidth={2.2} aria-hidden />
      </button>

      {value.length > 0 ? (
        <div className="shop-kho-loai-dd-tags">
          {value.map((t) => (
            <button
              key={t.id}
              type="button"
              className="shop-kho-loai-dd-tag"
              disabled={disabled}
              onClick={() => removeTag(t.id)}
              title={`Bỏ «${t.tieu_de}»`}
            >
              <span>{t.tieu_de}</span>
              <X size={12} strokeWidth={2.4} aria-hidden />
            </button>
          ))}
          {value.length > 1 ? (
            <button
              type="button"
              className="shop-kho-loai-dd-clear"
              disabled={disabled}
              onClick={clearAll}
            >
              Xóa hết
            </button>
          ) : null}
        </div>
      ) : null}

      {overlay}
    </div>
  );
}

/**
 * Form gắn danh mục CINs + facet (Chất liệu) + Fandom entity trên loại hàng Kho.
 * Fandom = sheet creatable (đồng bộ TaxSelectDropdown); danh mục CINs = chọn 1.
 */
export function ShopKhoLoaiTaxonomy({
  nhom,
  disabled = false,
  onUpdated,
  onError,
}: Props) {
  const [tax, setTax] = useState<TaxonomyPayload | null>(taxonomyCache);
  const [loadingTax, setLoadingTax] = useState(!taxonomyCache);
  const [saving, setSaving] = useState(false);
  const [idDanhMuc, setIdDanhMuc] = useState(nhom.idDanhMuc ?? "");
  const [giaTriIds, setGiaTriIds] = useState<string[]>(() => [
    ...(nhom.giaTriIds ?? []),
  ]);
  const [fandomTags, setFandomTags] = useState<TagInputValue[]>(() =>
    (nhom.fandoms ?? []).map((f) => ({
      id: f.id,
      tieu_de: f.ten,
      loai_bai_viet: "fandom" as const,
      da_verify: f.daVerify,
    })),
  );
  const [suggestions, setSuggestions] = useState<DanhMucOpt[]>([]);
  const suggestTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setIdDanhMuc(nhom.idDanhMuc ?? "");
    setGiaTriIds([...(nhom.giaTriIds ?? [])]);
    setFandomTags(
      (nhom.fandoms ?? []).map((f) => ({
        id: f.id,
        tieu_de: f.ten,
        loai_bai_viet: "fandom" as const,
        da_verify: f.daVerify,
      })),
    );
  }, [nhom.id, nhom.idDanhMuc, nhom.giaTriIds, nhom.fandoms]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoadingTax(!taxonomyCache);
      const data = await loadTaxonomy();
      if (cancelled) return;
      setTax(data);
      setLoadingTax(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (suggestTimer.current) clearTimeout(suggestTimer.current);
    const q = nhom.nhan.trim();
    if (!q || (nhom.idDanhMuc && nhom.danhMucXacNhan)) {
      setSuggestions([]);
      return;
    }
    suggestTimer.current = setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch(
            `/api/shop/danh-muc?q=${encodeURIComponent(q)}`,
          );
          const json = (await res.json().catch(() => null)) as {
            suggestions?: DanhMucOpt[];
          } | null;
          if (res.ok && json?.suggestions) setSuggestions(json.suggestions);
        } catch {
          /* ignore */
        }
      })();
    }, 280);
    return () => {
      if (suggestTimer.current) clearTimeout(suggestTimer.current);
    };
  }, [nhom.nhan, nhom.idDanhMuc, nhom.danhMucXacNhan]);

  const chatLieuFacet = useMemo(
    () => tax?.facets.find((f) => f.slug === "chat-lieu") ?? null,
    [tax],
  );

  const danhMucOptions = useMemo<DropdownOption[]>(() => {
    const all = tax?.danhMuc ?? [];
    const parentIds = new Set(
      all.map((d) => d.idCha).filter((id): id is string => Boolean(id)),
    );
    const byId = new Map(all.map((d) => [d.id, d]));
    return all
      .filter((d) => !parentIds.has(d.id) && d.slug !== "khac")
      .map((d) => {
        const cha = d.idCha ? byId.get(d.idCha) : null;
        return { id: d.id, ten: d.ten, moTa: d.moTa, group: cha?.ten ?? null };
      });
  }, [tax]);

  async function patchTaxonomy(body: Record<string, unknown>) {
    setSaving(true);
    onError(null);
    try {
      const res = await fetch(`/api/shop/nhom/${encodeURIComponent(nhom.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => null)) as {
        item?: ShopNhom;
        error?: string;
      } | null;
      if (!res.ok || !json?.item) {
        onError(json?.error ?? "Không lưu được phân loại.");
        return false;
      }
      onUpdated(json.item);
      setIdDanhMuc(json.item.idDanhMuc ?? "");
      setGiaTriIds([...(json.item.giaTriIds ?? [])]);
      return true;
    } catch {
      onError("Không lưu được phân loại.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function onDanhMucPick(nextId: string) {
    const prev = nhom.idDanhMuc ?? "";
    const cleared = idDanhMuc === nextId ? "" : nextId;
    setIdDanhMuc(cleared);
    if (cleared === prev && (cleared === "" || nhom.danhMucXacNhan)) return;
    await patchTaxonomy({
      idDanhMuc: cleared || null,
      danhMucXacNhan: cleared ? true : false,
    });
  }

  async function confirmSuggested(dm: DanhMucOpt) {
    setIdDanhMuc(dm.id);
    await patchTaxonomy({ idDanhMuc: dm.id, danhMucXacNhan: true });
  }

  async function confirmCurrent() {
    if (!nhom.idDanhMuc || nhom.danhMucXacNhan) return;
    await patchTaxonomy({ danhMucXacNhan: true });
  }

  function toggleGiaTri(id: string, facet: FacetOpt) {
    setGiaTriIds((prev) => {
      const inFacet = new Set(facet.giaTri.map((g) => g.id));
      let next: string[];
      if (facet.kieu === "chon_mot") {
        const without = prev.filter((x) => !inFacet.has(x));
        next = prev.includes(id) ? without : [...without, id];
      } else if (prev.includes(id)) {
        next = prev.filter((x) => x !== id);
      } else {
        next = [...prev, id];
      }
      void (async () => {
        if (sameIdSet(next, nhom.giaTriIds ?? [])) return;
        const ok = await patchTaxonomy({ giaTriIds: next });
        if (!ok) setGiaTriIds([...(nhom.giaTriIds ?? [])]);
      })();
      return next;
    });
  }

  function clearFacet(facet: FacetOpt) {
    const inFacet = new Set(facet.giaTri.map((g) => g.id));
    const next = giaTriIds.filter((id) => !inFacet.has(id));
    setGiaTriIds(next);
    void (async () => {
      if (sameIdSet(next, nhom.giaTriIds ?? [])) return;
      const ok = await patchTaxonomy({ giaTriIds: next });
      if (!ok) setGiaTriIds([...(nhom.giaTriIds ?? [])]);
    })();
  }

  async function onFandomChange(next: TagInputValue[]) {
    setFandomTags(next);
    const nextIds = next.map((t) => t.id);
    if (sameIdSet(nextIds, nhom.fandomIds ?? [])) return;
    const ok = await patchTaxonomy({ fandomIds: nextIds });
    if (!ok) {
      setFandomTags(
        (nhom.fandoms ?? []).map((f) => ({
          id: f.id,
          tieu_de: f.ten,
          loai_bai_viet: "fandom" as const,
          da_verify: f.daVerify,
        })),
      );
    }
  }

  const busy = disabled || saving || loadingTax;
  const selectedFacetIds = (facet: FacetOpt) => {
    const inFacet = new Set(facet.giaTri.map((g) => g.id));
    return giaTriIds.filter((id) => inFacet.has(id));
  };

  return (
    <div className="shop-kho-loai-tax">
      <div className="shop-kho-loai-tax-head">
        <strong>Phân loại hàng mới</strong>
      </div>

      {loadingTax ? (
        <p className="shop-kho-loai-tax-loading">
          <Loader2 size={14} className="shop-spin" aria-hidden />
          Đang tải danh mục…
        </p>
      ) : !tax ? (
        <p className="shop-kho-loai-tax-loading">Không tải được danh mục.</p>
      ) : (
        <div className="shop-kho-loai-tax-body">
          <div className="shop-kho-loai-tax-row">
            <TaxSelectDropdown
              label="Danh mục hàng"
              placeholder="Chọn danh mục…"
              options={danhMucOptions}
              selectedIds={idDanhMuc ? [idDanhMuc] : []}
              multiple={false}
              searchable
              searchPlaceholder="Tìm danh mục…"
              disabled={busy}
              onToggle={(id) => void onDanhMucPick(id)}
              onClear={() => void onDanhMucPick("")}
              missingCategory={{
                nhomId: nhom.id,
                onSubmitted: onUpdated,
                onError,
              }}
              pendingLabel={
                nhom.danhMucSlug === "khac" ? nhom.danhMucDeXuat : null
              }
            />

            {chatLieuFacet ? (
              <TaxSelectDropdown
                label={chatLieuFacet.ten}
                placeholder={`Chọn ${chatLieuFacet.ten.toLowerCase()}…`}
                options={chatLieuFacet.giaTri.map((g) => ({
                  id: g.id,
                  ten: g.ten,
                }))}
                selectedIds={selectedFacetIds(chatLieuFacet)}
                multiple={chatLieuFacet.kieu === "chon_nhieu"}
                searchable
                searchPlaceholder="Tìm chất liệu…"
                disabled={busy}
                onToggle={(id) => toggleGiaTri(id, chatLieuFacet)}
                onClear={() => clearFacet(chatLieuFacet)}
              />
            ) : null}

            <FandomTaxSelect
              value={fandomTags}
              onChange={(next) => void onFandomChange(next)}
              disabled={busy}
              maxTags={FANDOM_MAX_TAGS}
              onError={onError}
            />
          </div>

          {nhom.idDanhMuc && !nhom.danhMucXacNhan ? (
            <div className="shop-kho-loai-tax-suggest">
              <span>Hệ thống đã gợi ý danh mục — xác nhận nếu đúng.</span>
              <button
                type="button"
                disabled={busy}
                onClick={() => void confirmCurrent()}
              >
                Xác nhận
              </button>
            </div>
          ) : null}

          {!nhom.idDanhMuc && suggestions.length > 0 ? (
            <div className="shop-kho-loai-tax-suggest-list" role="list">
              {suggestions.slice(0, 3).map((s) => (
                <div
                  key={s.id}
                  className="shop-kho-loai-tax-suggest"
                  role="listitem"
                >
                  <span>
                    Gợi ý: {s.ten}
                    {s.moTa ? ` — ${s.moTa}` : ""}
                  </span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void confirmSuggested(s)}
                  >
                    Dùng
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
