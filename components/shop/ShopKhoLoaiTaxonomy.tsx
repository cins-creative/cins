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
import { webHref } from "@/lib/cins/manage-site";
import {
  loadTagSuggestIndexClient,
  titlesMatchQuery,
} from "@/lib/tag/suggest-index-client";
import type { ShopNhom } from "@/lib/shop/types";
import {
  ID_NHOM_MOI,
  matchParentByTen,
  moTaDeXuatDanhMuc,
} from "@/lib/shop/danh-muc-yeu-cau-text";

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
  id_cha?: string | null;
  thuTu?: number;
  chaTen?: string | null;
  chaThuTu?: number | null;
};

function idChaOf(d: DanhMucOpt): string | null {
  const v = d.idCha ?? d.id_cha;
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

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

/** Payload thiếu row cha → không join được tên nhóm (mọi lá rơi vào «Không nhóm»). */
function taxonomyCanGroupByCha(p: TaxonomyPayload): boolean {
  const ids = new Set(p.danhMuc.map((d) => d.id));
  for (const d of p.danhMuc) {
    const cha = idChaOf(d);
    if (cha && !d.chaTen && !ids.has(cha)) return false;
  }
  return true;
}

async function loadTaxonomy(): Promise<TaxonomyPayload | null> {
  if (taxonomyCache && taxonomyCanGroupByCha(taxonomyCache)) {
    return taxonomyCache;
  }
  if (!taxonomyPromise) {
    taxonomyPromise = fetch("/api/shop/catalog", { cache: "no-store" })
      .then(async (res) => {
        const json = (await res.json().catch(() => null)) as
          | (TaxonomyPayload & { error?: string })
          | null;
        if (!res.ok || !json?.danhMuc || !json?.facets) return null;
        taxonomyCache = {
          danhMuc: json.danhMuc.map((d) => ({
            ...d,
            idCha: idChaOf(d),
          })),
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

/** Lá ảo trên Kho khi chờ admin — không phải UUID `shop_danh_muc`. */
const PENDING_DANH_MUC_ID = "__pending__";

function pendingDeXuatTen(n: ShopNhom): string {
  return n.danhMucDeXuat?.trim() || "";
}

type DropdownOption = {
  id: string;
  ten: string;
  moTa?: string | null;
  group?: string | null;
  groupOrder?: number;
  idCha?: string | null;
  pending?: boolean;
};

function clusterDropdownOptions(
  options: DropdownOption[],
): Array<{ key: string; label: string | null; items: DropdownOption[] }> {
  if (!options.some((o) => o.group)) {
    return [{ key: "all", label: null, items: options }];
  }
  const buckets = new Map<
    string,
    { label: string | null; order: number; items: DropdownOption[] }
  >();
  for (const o of options) {
    const key = o.group ?? "";
    const cur = buckets.get(key) ?? {
      label: o.group ?? null,
      order: o.groupOrder ?? 9999,
      items: [],
    };
    cur.items.push(o);
    buckets.set(key, cur);
  }
  return [...buckets.entries()]
    .sort(
      ([, a], [, b]) =>
        a.order - b.order ||
        (a.label ?? "я").localeCompare(b.label ?? "я", "vi"),
    )
    .map(([key, g]) => ({
      key: key || "orphans",
      label: g.label,
      items: g.items,
    }));
}

function BaoThieuDanhMucForm({
  nhomId,
  tuKhoa,
  parents,
  disabled,
  onSubmitted,
  onError,
  onDone,
  onCancel,
}: {
  nhomId: string;
  tuKhoa: string;
  parents: Array<{ id: string; ten: string }>;
  disabled?: boolean;
  onSubmitted: (n: ShopNhom) => void;
  onError: (msg: string | null) => void;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [chaId, setChaId] = useState("");
  const [tenLa, setTenLa] = useState(tuKhoa.trim());
  const [tenNhomMoi, setTenNhomMoi] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setTenLa(tuKhoa.trim());
  }, [tuKhoa]);

  const deXuatNhomMoi = chaId === ID_NHOM_MOI;
  const chaTen = deXuatNhomMoi
    ? null
    : (parents.find((p) => p.id === chaId)?.ten ?? null);
  const locked = disabled || busy;
  const tenLaTrim = tenLa.trim();
  const tenNhomMoiTrim = tenNhomMoi.trim();
  const canSubmit =
    tenLaTrim.length >= 2 &&
    (!deXuatNhomMoi || tenNhomMoiTrim.length >= 2);

  async function submit() {
    setBusy(true);
    setErr(null);
    onError(null);
    try {
      const matched = deXuatNhomMoi
        ? matchParentByTen(parents, tenNhomMoiTrim)
        : null;
      const idChaGui = matched?.id ?? (deXuatNhomMoi ? null : chaId || null);
      const tenMoi = deXuatNhomMoi && !matched ? tenNhomMoiTrim : null;
      const res = await fetch("/api/shop/catalog/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(20_000),
        body: JSON.stringify({
          idNhom: nhomId,
          moTa: moTaDeXuatDanhMuc({
            tuKhoa: tenLaTrim,
            chaTen: matched?.ten ?? chaTen,
            laTen: null,
            tenNhomMoi: tenMoi,
          }),
          tuKhoa: tenLaTrim,
          idDanhMucGanNhat: idChaGui,
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        item?: ShopNhom;
        error?: string;
      } | null;
      if (!res.ok || !json?.item) {
        const msg = json?.error ?? "Không gửi được yêu cầu.";
        setErr(msg);
        onError(msg);
        return;
      }
      onSubmitted(json.item);
      onDone();
    } catch (e) {
      const timedOut =
        e instanceof DOMException && e.name === "TimeoutError";
      const msg = timedOut
        ? "Hết thời gian chờ. Thử lại."
        : "Không gửi được yêu cầu. Thử lại.";
      setErr(msg);
      onError(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="shop-kho-loai-dd-missing">
      <header className="shop-kho-loai-dd-missing-head">
        <p className="shop-kho-loai-dd-missing-kicker">Đề xuất danh mục</p>
        <h4 className="shop-kho-loai-dd-missing-name">
          <span>{tenLaTrim || "danh mục mới"}</span>
        </h4>
        <p className="shop-kho-loai-dd-missing-lead">
          Danh mục mới này sẽ chờ admin duyệt, Hàng của bạn vẫn sẽ bán được bình
          thường nhé!
        </p>
      </header>

      <label className="shop-kho-loai-dd-missing-field">
        Tên danh mục
        <input
          type="text"
          value={tenLa}
          maxLength={80}
          disabled={locked}
          placeholder="vd. Pad chuột"
          aria-label="Tên danh mục muốn thêm"
          onChange={(e) => setTenLa(e.target.value)}
        />
      </label>

      <label className="shop-kho-loai-dd-missing-field">
        Thuộc nhóm
        <select
          value={chaId}
          disabled={locked}
          aria-label="Thuộc nhóm nào"
          onChange={(e) => {
            setChaId(e.target.value);
            if (e.target.value !== ID_NHOM_MOI) setTenNhomMoi("");
          }}
        >
          <option value={ID_NHOM_MOI}>+ Đề xuất nhóm mới…</option>
          <option value="">Chưa rõ</option>
          {parents.map((p) => (
            <option key={p.id} value={p.id}>
              {p.ten}
            </option>
          ))}
        </select>
      </label>

      {deXuatNhomMoi ? (
        <label className="shop-kho-loai-dd-missing-field">
          Tên nhóm mới
          <input
            type="text"
            value={tenNhomMoi}
            maxLength={80}
            disabled={locked}
            placeholder="vd. Phụ kiện bàn phím"
            aria-label="Tên nhóm mới"
            onChange={(e) => setTenNhomMoi(e.target.value)}
          />
          <span className="shop-kho-loai-dd-missing-hint">
            Admin duyệt — không tạo ngay. Trùng tên nhóm có sẵn thì gộp vào nhóm
            đó.
          </span>
        </label>
      ) : null}

      {err ? (
        <p className="shop-kho-loai-dd-missing-err" role="alert">
          {err}
        </p>
      ) : null}

      <div className="shop-kho-loai-dd-missing-actions">
        <button
          type="button"
          className="shop-kho-loai-dd-sheet-ghost"
          disabled={locked}
          onClick={onCancel}
        >
          Hủy
        </button>
        <button
          type="button"
          className="shop-kho-loai-dd-sheet-done"
          disabled={locked || !canSubmit}
          onClick={() => void submit()}
        >
          {busy ? "Đang gửi…" : "Gửi đề xuất"}
        </button>
      </div>
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
    parents: Array<{ id: string; ten: string }>;
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
  const hasPending =
    selected.some((o) => o.pending) ||
    (selected.length === 0 && Boolean(pendingTen));
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

  const canDeXuat = Boolean(missingCategory) && !exactMatch;

  const summary =
    selected.length === 0
      ? pendingTen || placeholder
      : selected.length === 1
        ? selected[0]!.ten
        : `${selected[0]!.ten} +${selected.length - 1}`;

  function pick(id: string) {
    const opt = options.find((o) => o.id === id);
    if (!opt?.pending) onToggle(id);
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
                    {deXuatOpen
                      ? "Chọn nhóm rồi gửi — không cần mô tả"
                      : multiple
                        ? selected.length > 0
                          ? `Đã chọn ${selected.length}`
                          : "Chọn một hoặc nhiều"
                        : hasPending
                          ? "Đã gửi đề xuất — chọn mục có sẵn nếu thấy đúng"
                          : "Chọn một mục, hoặc thêm nếu chưa có"}
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
                    type="text"
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
                        exactMatch
                          ? "Danh mục này đã có — chọn trong danh sách"
                          : q.trim()
                            ? `Thêm danh mục «${q.trim()}»`
                            : "Thêm danh mục mới"
                      }
                      title={
                        exactMatch
                          ? "Danh mục này đã có — chọn trong danh sách"
                          : "Thêm danh mục mới"
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
                className={`shop-kho-loai-dd-options shop-kho-loai-dd-options--sheet${
                  deXuatOpen ? " is-dexuat" : ""
                }`}
                id={listId}
                role={deXuatOpen ? undefined : "listbox"}
                aria-multiselectable={
                  deXuatOpen ? undefined : multiple || undefined
                }
                aria-label={label}
              >
                {deXuatOpen && missingCategory ? (
                  <BaoThieuDanhMucForm
                    nhomId={missingCategory.nhomId}
                    tuKhoa={q}
                    parents={missingCategory.parents}
                    disabled={disabled}
                    onSubmitted={missingCategory.onSubmitted}
                    onError={missingCategory.onError}
                    onDone={() => {
                      setDeXuatOpen(false);
                      setOpen(false);
                    }}
                    onCancel={() => setDeXuatOpen(false)}
                  />
                ) : (
                  <>
                {clusterDropdownOptions(filtered).map((cluster) => (
                  <section
                    key={cluster.key}
                    className={`shop-kho-loai-dd-tree-group${cluster.label ? " has-parent" : ""}`}
                    aria-label={cluster.label ?? undefined}
                  >
                    {cluster.label ? (
                      <h3 className="shop-kho-loai-dd-tree-parent">
                        {cluster.label}
                      </h3>
                    ) : null}
                    <div className="shop-kho-loai-dd-tree-leaves">
                    {cluster.items.map((o) => {
                      const on = selectedIds.includes(o.id);
                      return (
                        <button
                          key={o.id}
                          type="button"
                          role="option"
                          aria-selected={on}
                          title={
                            o.pending
                              ? `${o.ten} — chờ admin duyệt`
                              : cluster.label
                                ? `${cluster.label} · ${o.ten}`
                                : o.ten
                          }
                          className={`shop-kho-loai-dd-option${on ? " is-on" : ""}${
                            o.pending ? " is-pending" : ""
                          }`}
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
                            {o.pending ? <em>Chờ admin duyệt</em> : null}
                          </span>
                        </button>
                      );
                    })}
                    </div>
                  </section>
                ))}
                {canDeXuat ? (
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
                      <strong>
                        {q.trim()
                          ? `Thêm «${q.trim()}»`
                          : "Thêm danh mục mới"}
                      </strong>
                      <em>Gửi đề xuất — hàng vẫn bán bình thường</em>
                    </span>
                  </button>
                ) : null}
                {filtered.length === 0 && !canDeXuat ? (
                  <p className="shop-kho-loai-dd-empty">Không khớp.</p>
                ) : null}
                  </>
                )}
              </div>

              {deXuatOpen ? null : (
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
              )}
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
              disabled={disabled || (o.pending && !onClear)}
              onClick={() => (o.pending ? onClear?.() : onToggle(o.id))}
              title={o.pending ? `Bỏ đề xuất «${o.ten}»` : `Bỏ «${o.ten}»`}
            >
              <span>{o.ten}</span>
              <X size={12} strokeWidth={2.4} aria-hidden />
            </button>
          ))}
          {hasPending && selected.length === 0 ? (
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
      const rows = await loadTagSuggestIndexClient();
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
                    ? webHref(articlePublicHref("fandom", slug))
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
  const [tax, setTax] = useState<TaxonomyPayload | null>(() =>
    taxonomyCache && taxonomyCanGroupByCha(taxonomyCache)
      ? taxonomyCache
      : null,
  );
  const [loadingTax, setLoadingTax] = useState(
    () => !(taxonomyCache && taxonomyCanGroupByCha(taxonomyCache)),
  );
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
  const [dismissedPending, setDismissedPending] = useState(false);
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
    setDismissedPending(false);
  }, [nhom.id, nhom.danhMucDeXuat]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoadingTax(
        !(taxonomyCache && taxonomyCanGroupByCha(taxonomyCache)),
      );
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
            `/api/shop/catalog?q=${encodeURIComponent(q)}`,
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
      all.map((d) => idChaOf(d)).filter((id): id is string => Boolean(id)),
    );
    const byId = new Map(all.map((d) => [d.id, d]));
    const leaves: DropdownOption[] = all
      .filter((d) => !parentIds.has(d.id) && d.slug !== "khac")
      .map((d) => {
        const idCha = idChaOf(d);
        const cha = idCha ? byId.get(idCha) : null;
        return {
          id: d.id,
          ten: d.ten,
          group: d.chaTen ?? cha?.ten ?? "Không nhóm",
          groupOrder: d.chaThuTu ?? cha?.thuTu ?? (idCha ? 50 : 999),
          idCha,
        };
      });

    const pendingTen = dismissedPending ? "" : pendingDeXuatTen(nhom);
    if (pendingTen) {
      const idCha = nhom.danhMucDeXuatIdCha?.trim() || null;
      const cha = idCha ? byId.get(idCha) : null;
      const group =
        cha?.ten ?? (nhom.danhMucDeXuatChaTen?.trim() || "Không nhóm");
      leaves.push({
        id: PENDING_DANH_MUC_ID,
        ten: pendingTen,
        group,
        groupOrder:
          cha?.thuTu ?? (idCha || nhom.danhMucDeXuatChaTen ? 50 : 999),
        idCha,
        pending: true,
      });
    }

    return leaves.sort(
      (a, b) =>
        (a.groupOrder ?? 999) - (b.groupOrder ?? 999) ||
        (a.group ?? "").localeCompare(b.group ?? "", "vi") ||
        Number(Boolean(b.pending)) - Number(Boolean(a.pending)) ||
        a.ten.localeCompare(b.ten, "vi"),
    );
  }, [
    tax,
    nhom.danhMucSlug,
    nhom.danhMucDeXuat,
    nhom.danhMucDeXuatIdCha,
    nhom.danhMucDeXuatChaTen,
    dismissedPending,
  ]);

  const danhMucParents = useMemo(() => {
    const all = tax?.danhMuc ?? [];
    const parentIds = new Set(
      all.map((d) => idChaOf(d)).filter((id): id is string => Boolean(id)),
    );
    return all
      .filter((d) => parentIds.has(d.id))
      .map((d) => ({ id: d.id, ten: d.ten }));
  }, [tax]);

  async function patchTaxonomy(body: Record<string, unknown>) {
    setSaving(true);
    onError(null);
    try {
      const res = await fetch(`/api/shop/groups/${encodeURIComponent(nhom.id)}`, {
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
    if (nextId === PENDING_DANH_MUC_ID) return;
    if (nextId) setDismissedPending(true);
    else setDismissedPending(false);
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

  const pendingTen = dismissedPending ? "" : pendingDeXuatTen(nhom);
  const busy = disabled || saving || loadingTax;
  const selectedFacetIds = (facet: FacetOpt) => {
    const inFacet = new Set(facet.giaTri.map((g) => g.id));
    return giaTriIds.filter((id) => inFacet.has(id));
  };

  return (
    <div className="shop-kho-loai-tax">
      <div className="shop-kho-loai-tax-head">
        <strong>Phân loại</strong>
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
              selectedIds={
                pendingTen
                  ? [PENDING_DANH_MUC_ID]
                  : idDanhMuc
                    ? [idDanhMuc]
                    : []
              }
              multiple={false}
              searchable
              searchPlaceholder="Tìm danh mục…"
              disabled={busy}
              onToggle={(id) => void onDanhMucPick(id)}
              onClear={() => void onDanhMucPick("")}
              missingCategory={{
                nhomId: nhom.id,
                parents: danhMucParents,
                onSubmitted: onUpdated,
                onError,
              }}
              pendingLabel={pendingTen || null}
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
