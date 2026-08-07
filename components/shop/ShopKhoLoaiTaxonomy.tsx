"use client";

import { Check, ChevronDown, Loader2, Search, X } from "lucide-react";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import type { ShopNhom } from "@/lib/shop/types";

type DanhMucOpt = {
  id: string;
  slug: string;
  ten: string;
  moTa: string | null;
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
          facets: json.facets,
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

type DropdownOption = { id: string; ten: string; hint?: string | null };

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
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [q, setQ] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const titleId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setQ("");
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

  const filtered = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase("vi");
    if (!needle) return options;
    return options.filter(
      (o) =>
        o.ten.toLocaleLowerCase("vi").includes(needle) ||
        (o.hint?.toLocaleLowerCase("vi").includes(needle) ?? false),
    );
  }, [options, q]);

  const summary =
    selected.length === 0
      ? placeholder
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
                      : "Chọn một mục"}
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
                    placeholder={searchPlaceholder}
                    disabled={disabled}
                    onChange={(e) => setQ(e.target.value)}
                    onKeyDown={(e) => e.stopPropagation()}
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
                </label>
              ) : null}

              <div
                className="shop-kho-loai-dd-options shop-kho-loai-dd-options--sheet"
                id={listId}
                role="listbox"
                aria-multiselectable={multiple || undefined}
                aria-label={label}
              >
                {filtered.map((o) => {
                  const on = selectedIds.includes(o.id);
                  return (
                    <button
                      key={o.id}
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
                        {o.hint ? <em>{o.hint}</em> : null}
                      </span>
                    </button>
                  );
                })}
                {filtered.length === 0 ? (
                  <p className="shop-kho-loai-dd-empty">Không khớp.</p>
                ) : null}
              </div>

              <footer className="shop-kho-loai-dd-sheet-foot">
                {onClear && selected.length > 0 ? (
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
          selected.length ? " has-value" : ""
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

      {selected.length > 0 ? (
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

/**
 * Form gắn danh mục CINs + facet (Fandom / Chất liệu) trên loại hàng Kho.
 * Facet = dropdown multi-select; danh mục CINs = chọn 1 (schema FK đơn).
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
  const [suggestions, setSuggestions] = useState<DanhMucOpt[]>([]);
  const suggestTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setIdDanhMuc(nhom.idDanhMuc ?? "");
    setGiaTriIds([...(nhom.giaTriIds ?? [])]);
  }, [nhom.id, nhom.idDanhMuc, nhom.giaTriIds]);

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

  const fandomFacet = useMemo(
    () => tax?.facets.find((f) => f.slug === "fandom") ?? null,
    [tax],
  );
  const chatLieuFacet = useMemo(
    () => tax?.facets.find((f) => f.slug === "chat-lieu") ?? null,
    [tax],
  );

  const danhMucOptions = useMemo<DropdownOption[]>(
    () =>
      (tax?.danhMuc ?? []).map((d) => ({
        id: d.id,
        ten: d.ten,
        hint: d.moTa,
      })),
    [tax],
  );

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

  const busy = disabled || saving || loadingTax;
  const selectedDm = tax?.danhMuc.find((d) => d.id === idDanhMuc) ?? null;
  const selectedFacetIds = (facet: FacetOpt) => {
    const inFacet = new Set(facet.giaTri.map((g) => g.id));
    return giaTriIds.filter((id) => inFacet.has(id));
  };

  return (
    <div className="shop-kho-loai-tax">
      <div className="shop-kho-loai-tax-head">
        <strong>Phân loại hàng mới</strong>
        <span>Gắn danh mục & thuộc tính để khách lọc trên /cua-hang</span>
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
          <TaxSelectDropdown
            label="Danh mục CINs"
            placeholder="Chọn danh mục…"
            options={danhMucOptions}
            selectedIds={idDanhMuc ? [idDanhMuc] : []}
            multiple={false}
            searchable
            searchPlaceholder="Tìm danh mục…"
            disabled={busy}
            onToggle={(id) => void onDanhMucPick(id)}
            onClear={() => void onDanhMucPick("")}
          />
          {selectedDm?.moTa ? (
            <p className="shop-kho-loai-tax-hint">{selectedDm.moTa}</p>
          ) : null}

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
                  <span>Gợi ý: {s.ten}</span>
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

          <div className="shop-kho-loai-tax-facets">
            {fandomFacet ? (
              <TaxSelectDropdown
                label={fandomFacet.ten}
                placeholder={`Chọn ${fandomFacet.ten.toLowerCase()}…`}
                options={fandomFacet.giaTri.map((g) => ({
                  id: g.id,
                  ten: g.ten,
                }))}
                selectedIds={selectedFacetIds(fandomFacet)}
                multiple={fandomFacet.kieu === "chon_nhieu"}
                searchable
                searchPlaceholder="Tìm fandom…"
                disabled={busy}
                onToggle={(id) => toggleGiaTri(id, fandomFacet)}
                onClear={() => clearFacet(fandomFacet)}
              />
            ) : null}

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
          </div>
        </div>
      )}
    </div>
  );
}
