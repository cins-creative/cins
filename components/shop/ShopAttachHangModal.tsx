"use client";

import { ChevronDown, ImagePlus, Loader2, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { createPortal } from "react-dom";

import type { ShopBangGia, ShopSanPham } from "@/lib/shop/types";
import Link from "next/link";

import "@/components/cins/user-account-settings-modal.css";
import "./shop-dashboard.css";

type Props = {
  open: boolean;
  milestoneId: string;
  onClose: () => void;
  onSaved?: () => void;
};

type FilterMenu = "loai" | "loai2" | null;

function matchesCategoryFilter(
  value: string | null | undefined,
  selected: string[],
): boolean {
  if (selected.length === 0) return true;
  const trimmed = value?.trim();
  if (!trimmed) return selected.includes("__none__");
  return selected.includes(trimmed);
}

function filterLabel(selected: string[], emptyLabel: string): string {
  if (selected.length === 0) return emptyLabel;
  const labels = selected.map((k) =>
    k === "__none__" ? "Chưa phân loại" : k,
  );
  if (labels.length <= 2) return labels.join(", ");
  return `Đã chọn ${labels.length}`;
}

function AttachGroupCheckbox({
  ids,
  selected,
  onToggle,
  ariaLabel,
}: {
  ids: string[];
  selected: Set<string>;
  onToggle: () => void;
  ariaLabel: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const allOn = ids.length > 0 && ids.every((id) => selected.has(id));
  const someOn = ids.some((id) => selected.has(id)) && !allOn;
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = someOn;
  }, [someOn]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={allOn}
      onChange={onToggle}
      aria-label={ariaLabel}
    />
  );
}

export function ShopAttachHangModal({
  open,
  milestoneId,
  onClose,
  onSaved,
}: Props) {
  const titleId = useId();
  const selectAllRef = useRef<HTMLInputElement>(null);
  const [products, setProducts] = useState<ShopSanPham[]>([]);
  const [priceLists, setPriceLists] = useState<ShopBangGia[]>([]);
  const [bangGiaId, setBangGiaId] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filterLoai, setFilterLoai] = useState<string[]>([]);
  const [filterLoai2, setFilterLoai2] = useState<string[]>([]);
  const [filterMenuOpen, setFilterMenuOpen] = useState<FilterMenu>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [shopReady, setShopReady] = useState(true);
  const [shopSetupHref, setShopSetupHref] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const readyRes = await fetch("/api/user/ban-hang", { cache: "no-store" });
      const readyJson = (await readyRes.json().catch(() => null)) as {
        shopReady?: boolean;
        shopSetupHref?: string | null;
        error?: string;
      } | null;
      const ready = readyJson?.shopReady === true;
      setShopReady(ready);
      setShopSetupHref(
        typeof readyJson?.shopSetupHref === "string"
          ? readyJson.shopSetupHref
          : null,
      );
      if (!ready) {
        setProducts([]);
        setPriceLists([]);
        setErr(null);
        return;
      }

      const [pRes, bRes, hRes] = await Promise.all([
        fetch("/api/shop/san-pham", { cache: "no-store" }),
        fetch("/api/shop/bang-gia", { cache: "no-store" }),
        fetch(`/api/milestone/${milestoneId}/shop-hang`, { cache: "no-store" }),
      ]);
      const pJson = (await pRes.json()) as { items?: ShopSanPham[] };
      const bJson = (await bRes.json()) as { items?: ShopBangGia[] };
      const hJson = (await hRes.json()) as {
        items?: Array<{ idBienThe: string; idBangGia: string | null }>;
      };
      setProducts(pJson.items ?? []);
      const lists = bJson.items ?? [];
      setPriceLists(lists);
      setBangGiaId(lists[0]?.id ?? "");
      const sel = new Set((hJson.items ?? []).map((i) => i.idBienThe));
      setSelected(sel);
      const firstBg = hJson.items?.find((i) => i.idBangGia)?.idBangGia;
      if (firstBg) setBangGiaId(firstBg);
      setFilterLoai([]);
      setFilterLoai2([]);
      setFilterMenuOpen(null);
    } catch {
      setErr("Không tải kho.");
    } finally {
      setLoading(false);
    }
  }, [milestoneId]);

  useEffect(() => {
    if (!open) return;
    void load();
  }, [open, load]);

  useEffect(() => {
    if (!filterMenuOpen) return;
    function onPointerDown(e: PointerEvent) {
      const t = e.target;
      if (!(t instanceof Element)) return;
      if (t.closest("[data-shop-filter-menu]")) return;
      setFilterMenuOpen(null);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [filterMenuOpen]);

  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) {
      const t = p.phanLoai?.trim();
      if (t) set.add(t);
    }
    return [...set].sort((a, b) => a.localeCompare(b, "vi"));
  }, [products]);

  const categoryOptions2 = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) {
      const t = p.phanLoai2?.trim();
      if (t) set.add(t);
    }
    return [...set].sort((a, b) => a.localeCompare(b, "vi"));
  }, [products]);

  const hasUncategorized = useMemo(
    () => products.some((p) => !p.phanLoai?.trim()),
    [products],
  );
  const hasUncategorized2 = useMemo(
    () => products.some((p) => !p.phanLoai2?.trim()),
    [products],
  );

  const showFilterLoai =
    categoryOptions.length > 0 || hasUncategorized;
  const showFilterLoai2 =
    categoryOptions2.length > 0 || hasUncategorized2;

  const filteredProducts = useMemo(() => {
    return products.filter(
      (p) =>
        matchesCategoryFilter(p.phanLoai, filterLoai) &&
        matchesCategoryFilter(p.phanLoai2, filterLoai2),
    );
  }, [products, filterLoai, filterLoai2]);

  const filteredBienTheIds = useMemo(
    () => filteredProducts.flatMap((p) => p.bienThe.map((bt) => bt.id)),
    [filteredProducts],
  );

  /** Nhóm theo loại hàng (truc=1) — parent tick = mọi biến thể trong nhóm. */
  const productGroups = useMemo(() => {
    type Group = {
      key: string;
      label: string;
      products: ShopSanPham[];
      bienTheIds: string[];
    };
    const map = new Map<string, Group>();
    for (const p of filteredProducts) {
      const idNhom = p.idNhom?.trim();
      const label = p.phanLoai?.trim() || null;
      const key = idNhom || (label ? `l:${label}` : "__none__");
      let g = map.get(key);
      if (!g) {
        g = {
          key,
          label: label ?? "Chưa phân loại",
          products: [],
          bienTheIds: [],
        };
        map.set(key, g);
      }
      g.products.push(p);
      for (const bt of p.bienThe) g.bienTheIds.push(bt.id);
    }
    return [...map.values()].sort((a, b) => {
      if (a.key === "__none__") return 1;
      if (b.key === "__none__") return -1;
      return a.label.localeCompare(b.label, "vi");
    });
  }, [filteredProducts]);

  const allFilteredSelected =
    filteredBienTheIds.length > 0 &&
    filteredBienTheIds.every((id) => selected.has(id));
  const someFilteredSelected =
    filteredBienTheIds.some((id) => selected.has(id)) && !allFilteredSelected;

  useEffect(() => {
    const el = selectAllRef.current;
    if (el) el.indeterminate = someFilteredSelected;
  }, [someFilteredSelected]);

  function toggleFilter(
    key: string,
    setter: Dispatch<SetStateAction<string[]>>,
  ) {
    if (key === "all") {
      setter([]);
      return;
    }
    setter((prev) => {
      if (prev.includes(key)) return prev.filter((x) => x !== key);
      return [...prev, key];
    });
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleIds(ids: string[]) {
    if (ids.length === 0) return;
    setSelected((prev) => {
      const allOn = ids.every((id) => prev.has(id));
      const next = new Set(prev);
      if (allOn) {
        for (const id of ids) next.delete(id);
      } else {
        for (const id of ids) next.add(id);
      }
      return next;
    });
  }

  function toggleSelectAll() {
    toggleIds(filteredBienTheIds);
  }

  function resolveGia(idBienThe: string): { gia: number; tienTe: string } | null {
    // Chỉ lấy giá trong bảng đang chọn — không fallback sang bảng khác
    // (tránh hiện 3.000 VND khi đang chọn bảng IDR chưa có dòng).
    const bg = bangGiaId
      ? priceLists.find((b) => b.id === bangGiaId)
      : priceLists[0];
    if (!bg) return null;
    const d = bg.dong.find((x) => x.idBienThe === idBienThe);
    if (!d) return null;
    return {
      gia: d.giaGiam != null ? d.giaGiam : d.gia,
      tienTe: bg.tienTe,
    };
  }

  async function save() {
    if (!bangGiaId) {
      setErr("Chọn bảng giá.");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      const items = [...selected].map((idBienThe, thuTu) => ({
        idBienThe,
        idBangGia: bangGiaId,
        thuTu,
      }));
      const res = await fetch(`/api/milestone/${milestoneId}/shop-hang`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const json = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) {
        setErr(json?.error ?? "Không lưu được.");
        return;
      }
      window.dispatchEvent(
        new CustomEvent("cins:shop-hang-changed", {
          detail: { milestoneId },
        }),
      );
      onSaved?.();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  function renderFilterDropdown(opts: {
    menuKey: "loai" | "loai2";
    selected: string[];
    setter: Dispatch<SetStateAction<string[]>>;
    options: string[];
    hasNone: boolean;
    emptyLabel: string;
    ariaLabel: string;
  }) {
    const openMenu = filterMenuOpen === opts.menuKey;
    return (
      <div className="shop-filter-dropdown" data-shop-filter-menu>
        <button
          type="button"
          className={`shop-filter-dropdown-trigger${opts.selected.length > 0 ? " is-active" : ""}${openMenu ? " is-open" : ""}`}
          aria-expanded={openMenu}
          aria-haspopup="listbox"
          aria-label={opts.ariaLabel}
          onClick={() =>
            setFilterMenuOpen((cur) =>
              cur === opts.menuKey ? null : opts.menuKey,
            )
          }
        >
          <span>{filterLabel(opts.selected, opts.emptyLabel)}</span>
          <ChevronDown size={15} strokeWidth={2.25} aria-hidden />
        </button>
        {openMenu ? (
          <div
            className="shop-filter-dropdown-panel"
            role="listbox"
            aria-multiselectable
            aria-label={opts.ariaLabel}
          >
            <label className="shop-filter-dropdown-opt">
              <input
                type="checkbox"
                checked={opts.selected.length === 0}
                onChange={() => toggleFilter("all", opts.setter)}
              />
              <span>Tất cả</span>
            </label>
            {opts.options.map((c) => (
              <label key={c} className="shop-filter-dropdown-opt">
                <input
                  type="checkbox"
                  checked={opts.selected.includes(c)}
                  onChange={() => toggleFilter(c, opts.setter)}
                />
                <span>{c}</span>
              </label>
            ))}
            {opts.hasNone ? (
              <label className="shop-filter-dropdown-opt">
                <input
                  type="checkbox"
                  checked={opts.selected.includes("__none__")}
                  onChange={() => toggleFilter("__none__", opts.setter)}
                />
                <span>Chưa phân loại</span>
              </label>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  return createPortal(
    <div className="uas-backdrop" role="presentation" onClick={onClose}>
      <div
        className="uas-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 520 }}
      >
        <header className="uas-head">
          <h2 id={titleId} className="uas-title">
            Thêm hàng bán vào bài
          </h2>
          <button type="button" className="uas-close" onClick={onClose}>
            <X size={18} />
          </button>
        </header>
        <div className="shop-attach-body">
          {loading ? (
            <p>
              <Loader2 className="shop-spin" size={16} /> Đang tải…
            </p>
          ) : !shopReady ? (
            <div className="shop-attach-gate">
              <p>
                Cần thêm tài khoản nhận tiền trong Shop trước khi gắn hàng lên
                bài.
              </p>
              {shopSetupHref ? (
                <Link
                  href={shopSetupHref}
                  className="uas-btn primary"
                  onClick={onClose}
                >
                  Thiết lập Shop
                </Link>
              ) : null}
            </div>
          ) : (
            <>
              {err ? (
                <p style={{ color: "#b42318", fontSize: 13 }}>{err}</p>
              ) : null}
              <label className="shop-dash-field">
                Bảng giá
                <select
                  value={bangGiaId}
                  onChange={(e) => setBangGiaId(e.target.value)}
                >
                  {priceLists.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.ten} ({b.tienTe})
                    </option>
                  ))}
                </select>
              </label>
              {products.length > 0 && (showFilterLoai || showFilterLoai2) ? (
                <div className="shop-attach-filters">
                  {showFilterLoai
                    ? renderFilterDropdown({
                        menuKey: "loai",
                        selected: filterLoai,
                        setter: setFilterLoai,
                        options: categoryOptions,
                        hasNone: hasUncategorized,
                        emptyLabel: "Tất cả phân loại",
                        ariaLabel: "Lọc theo phân loại",
                      })
                    : null}
                  {showFilterLoai2
                    ? renderFilterDropdown({
                        menuKey: "loai2",
                        selected: filterLoai2,
                        setter: setFilterLoai2,
                        options: categoryOptions2,
                        hasNone: hasUncategorized2,
                        emptyLabel: "Tất cả phân loại 2",
                        ariaLabel: "Lọc theo phân loại 2",
                      })
                    : null}
                </div>
              ) : null}
              {filteredBienTheIds.length > 0 ? (
                <label className="shop-attach-select-all">
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleSelectAll}
                    aria-label="Chọn tất cả sản phẩm đang hiện"
                  />
                  <span>
                    Chọn tất cả
                    {filteredBienTheIds.length > 0
                      ? ` (${filteredBienTheIds.length} đang hiện)`
                      : ""}
                  </span>
                </label>
              ) : null}
              <ul className="shop-dash-list shop-attach-list">
                {productGroups.map((group) => (
                  <li
                    key={group.key}
                    className="shop-attach-group"
                  >
                    <label className="shop-attach-group-head">
                      <AttachGroupCheckbox
                        ids={group.bienTheIds}
                        selected={selected}
                        onToggle={() => toggleIds(group.bienTheIds)}
                        ariaLabel={`Chọn cả loại ${group.label}`}
                      />
                      <span className="shop-attach-group-name">
                        {group.label}
                      </span>
                      <span className="shop-attach-group-count">
                        {group.bienTheIds.length} hàng
                      </span>
                    </label>
                    <ul className="shop-attach-group-items">
                      {group.products.flatMap((p) =>
                        p.bienThe.map((bt) => {
                          const thumb = bt.anhUrl ?? p.anhUrl;
                          const price = resolveGia(bt.id);
                          const loai2 = p.phanLoai2?.trim();
                          return (
                            <li
                              key={bt.id}
                              className="shop-dash-item shop-attach-item"
                            >
                              <label className="shop-attach-label">
                                <input
                                  type="checkbox"
                                  checked={selected.has(bt.id)}
                                  onChange={() => toggle(bt.id)}
                                />
                                {thumb ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={thumb}
                                    alt=""
                                    className="shop-attach-thumb"
                                  />
                                ) : (
                                  <span
                                    className="shop-attach-thumb shop-attach-thumb--empty"
                                    aria-hidden
                                  >
                                    <ImagePlus size={16} />
                                  </span>
                                )}
                                <span className="shop-attach-meta">
                                  <span className="shop-attach-name">
                                    {p.ten}
                                    {bt.nhan !== "Mặc định"
                                      ? ` · ${bt.nhan}`
                                      : ""}
                                  </span>
                                  <span className="shop-attach-sub">
                                    {loai2 ? `${loai2} · ` : ""}
                                    tồn {bt.soLuongTon}
                                  </span>
                                </span>
                                <span className="shop-attach-price">
                                  {price
                                    ? `${price.gia.toLocaleString("vi-VN")} ${price.tienTe}`
                                    : "Chưa có giá"}
                                </span>
                              </label>
                            </li>
                          );
                        }),
                      )}
                    </ul>
                  </li>
                ))}
              </ul>
              {products.length === 0 ? (
                <p className="shop-dash-hint">
                  Chưa có sản phẩm. Vào Quản lý kho để thêm.
                </p>
              ) : filteredProducts.length === 0 ? (
                <p className="shop-dash-hint">Không có hàng trong nhóm này.</p>
              ) : null}
            </>
          )}
        </div>
        <footer className="uas-foot" style={{ justifyContent: "flex-end" }}>
          <div className="uas-foot-actions">
            <button type="button" className="uas-btn ghost" onClick={onClose}>
              {shopReady ? "Hủy" : "Đóng"}
            </button>
            {shopReady ? (
              <button
                type="button"
                className="uas-btn primary"
                disabled={saving}
                onClick={() => void save()}
              >
                {saving ? <Loader2 className="shop-spin" size={16} /> : "Lưu"}
              </button>
            ) : null}
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
