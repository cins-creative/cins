"use client";

import { ImagePlus, Loader2, X } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import type { ShopBangGia, ShopSanPham } from "@/lib/shop/types";

import "@/components/cins/user-account-settings-modal.css";
import "./shop-dashboard.css";

type Props = {
  open: boolean;
  milestoneId: string;
  onClose: () => void;
  onSaved?: () => void;
};

export function ShopAttachHangModal({
  open,
  milestoneId,
  onClose,
  onSaved,
}: Props) {
  const titleId = useId();
  const [products, setProducts] = useState<ShopSanPham[]>([]);
  const [priceLists, setPriceLists] = useState<ShopBangGia[]>([]);
  const [bangGiaId, setBangGiaId] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filterLoai, setFilterLoai] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
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
      setFilterLoai("all");
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

  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) {
      const t = p.phanLoai?.trim();
      if (t) set.add(t);
    }
    return [...set].sort((a, b) => a.localeCompare(b, "vi"));
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (filterLoai === "all") return products;
    if (filterLoai === "__none__") {
      return products.filter((p) => !p.phanLoai?.trim());
    }
    return products.filter((p) => p.phanLoai?.trim() === filterLoai);
  }, [products, filterLoai]);

  if (!open) return null;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function resolveGia(idBienThe: string): { gia: number; tienTe: string } | null {
    const preferred = bangGiaId
      ? priceLists.find((b) => b.id === bangGiaId)
      : null;
    const ordered = preferred
      ? [preferred, ...priceLists.filter((b) => b.id !== preferred.id)]
      : priceLists;
    for (const bg of ordered) {
      const d = bg.dong.find((x) => x.idBienThe === idBienThe);
      if (d) return { gia: d.gia, tienTe: bg.tienTe };
    }
    return null;
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
      onSaved?.();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const hasUncategorized = products.some((p) => !p.phanLoai?.trim());

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
        <div style={{ padding: 16, overflow: "auto" }}>
          {loading ? (
            <p>
              <Loader2 className="shop-spin" size={16} /> Đang tải…
            </p>
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
              {products.length > 0 &&
              (categoryOptions.length > 0 || hasUncategorized) ? (
                <div
                  className="shop-filter-chips"
                  role="tablist"
                  aria-label="Lọc theo loại hàng"
                  style={{ marginTop: 12 }}
                >
                  <button
                    type="button"
                    className={`shop-filter-chip${filterLoai === "all" ? " is-active" : ""}`}
                    onClick={() => setFilterLoai("all")}
                  >
                    Tất cả
                  </button>
                  {categoryOptions.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`shop-filter-chip${filterLoai === c ? " is-active" : ""}`}
                      onClick={() => setFilterLoai(c)}
                    >
                      {c}
                    </button>
                  ))}
                  {hasUncategorized ? (
                    <button
                      type="button"
                      className={`shop-filter-chip${filterLoai === "__none__" ? " is-active" : ""}`}
                      onClick={() => setFilterLoai("__none__")}
                    >
                      Chưa phân loại
                    </button>
                  ) : null}
                </div>
              ) : null}
              <ul className="shop-dash-list shop-attach-list" style={{ marginTop: 12 }}>
                {filteredProducts.flatMap((p) =>
                  p.bienThe.map((bt) => {
                    const thumb = bt.anhUrl ?? p.anhUrl;
                    const price = resolveGia(bt.id);
                    return (
                      <li key={bt.id} className="shop-dash-item shop-attach-item">
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
                              {bt.nhan !== "Mặc định" ? ` · ${bt.nhan}` : ""}
                            </span>
                            <span className="shop-attach-sub">
                              {p.phanLoai ? `${p.phanLoai} · ` : ""}
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
              Hủy
            </button>
            <button
              type="button"
              className="uas-btn primary"
              disabled={saving}
              onClick={() => void save()}
            >
              {saving ? <Loader2 className="shop-spin" size={16} /> : "Lưu"}
            </button>
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
