"use client";

import { ClipboardPaste, ImagePlus, Loader2, Plus, Save, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  imageFilesFromClipboard,
  readImageFileFromClipboard,
} from "@/lib/files/clipboard-images";
import type { ShopBangGia, ShopSanPham } from "@/lib/shop/types";

import { ShopDashTabs } from "./ShopDashTabs";
import { ShopPhanLoaiInput } from "./ShopPhanLoaiInput";
import { ShopTienTeSelect } from "./ShopTienTeSelect";
import "./shop-dashboard.css";

type RowDraft = {
  phanLoai: string;
  ton: string;
  gia: string;
  /** Ảnh mới chờ lưu (đã upload CF). */
  anhId?: string | null;
  anhUrl?: string | null;
};

export function ShopKhoClient() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [products, setProducts] = useState<ShopSanPham[]>([]);
  const [priceLists, setPriceLists] = useState<ShopBangGia[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [ten, setTen] = useState("");
  const [ton, setTon] = useState("0");
  const [gia, setGia] = useState("");
  const [phanLoai, setPhanLoai] = useState("");
  const [anhId, setAnhId] = useState<string | null>(null);
  const [anhUrl, setAnhUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [bangGiaId, setBangGiaId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [newBangTen, setNewBangTen] = useState("Bảng giá mặc định");
  const [newBangTienTe, setNewBangTienTe] = useState("VND");
  const [filterLoai, setFilterLoai] = useState<string>("all");
  const [drafts, setDrafts] = useState<Record<string, RowDraft>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [thumbMenuKey, setThumbMenuKey] = useState<string | null>(null);

  useEffect(() => {
    if (!thumbMenuKey) return;
    function onPointerDown(e: PointerEvent) {
      const t = e.target;
      if (!(t instanceof Element)) return;
      if (t.closest(`[data-thumb-menu="${thumbMenuKey}"]`)) return;
      setThumbMenuKey(null);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [thumbMenuKey]);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true;
    if (!silent) {
      setLoading(true);
      setErr(null);
    }
    try {
      const [sRes, pRes, bRes] = await Promise.all([
        fetch("/api/user/ban-hang", { cache: "no-store" }),
        fetch("/api/shop/san-pham", { cache: "no-store" }),
        fetch("/api/shop/bang-gia", { cache: "no-store" }),
      ]);
      const sJson = (await sRes.json().catch(() => null)) as {
        enabled?: boolean;
        error?: string;
      } | null;
      if (!sRes.ok) {
        setErr(sJson?.error ?? "Không tải được.");
        return;
      }
      setEnabled(sJson?.enabled === true);
      if (!sJson?.enabled) return;

      const pJson = (await pRes.json().catch(() => null)) as {
        items?: ShopSanPham[];
      } | null;
      const bJson = (await bRes.json().catch(() => null)) as {
        items?: ShopBangGia[];
      } | null;
      setProducts(pJson?.items ?? []);
      const lists = bJson?.items ?? [];
      setPriceLists(lists);
      if (lists[0] && !bangGiaId) setBangGiaId(lists[0].id);
    } catch {
      setErr("Không tải được kho.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [bangGiaId]);

  useEffect(() => {
    void load();
  }, [load]);

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

  function parseGiaInput(raw: string): number | null {
    const cleaned = raw.trim().replace(/\s/g, "").replace(/,/g, "");
    if (!cleaned) return null;
    // 80.000 / 1.200.000 → nghìn VN
    if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) {
      const n = Number.parseInt(cleaned.replace(/\./g, ""), 10);
      return Number.isFinite(n) ? n : null;
    }
    const n = Number.parseFloat(cleaned);
    return Number.isFinite(n) && n >= 0 ? n : null;
  }

  function resolveGiaBienThe(idBienThe: string | undefined): number | null {
    if (!idBienThe) return null;
    const preferred = bangGiaId
      ? priceLists.find((b) => b.id === bangGiaId)
      : null;
    const ordered = preferred
      ? [preferred, ...priceLists.filter((b) => b.id !== preferred.id)]
      : priceLists;
    for (const bg of ordered) {
      const d = bg.dong.find((x) => x.idBienThe === idBienThe);
      if (d) return d.gia;
    }
    return null;
  }

  function baseDraftForProduct(p: ShopSanPham): RowDraft {
    const bt = p.bienThe[0];
    const giaDong = resolveGiaBienThe(bt?.id);
    return {
      phanLoai: p.phanLoai ?? "",
      ton: String(bt?.soLuongTon ?? 0),
      gia: giaDong != null ? String(giaDong) : "",
    };
  }

  function getDraft(p: ShopSanPham): RowDraft {
    return drafts[p.id] ?? baseDraftForProduct(p);
  }

  function patchDraft(id: string, patch: Partial<RowDraft>, base: RowDraft) {
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? base), ...patch },
    }));
  }

  function isRowDirty(p: ShopSanPham): boolean {
    const d = getDraft(p);
    const base = baseDraftForProduct(p);
    if (d.anhId !== undefined) return true;
    return (
      d.phanLoai.trim() !== base.phanLoai.trim() ||
      d.ton.trim() !== base.ton.trim() ||
      parseGiaInput(d.gia) !== parseGiaInput(base.gia)
    );
  }

  async function ensureBangGiaId(
    lists: ShopBangGia[] = priceLists,
    tienTe = "VND",
  ): Promise<string | null> {
    if (bangGiaId) return bangGiaId;
    if (lists[0]) {
      setBangGiaId(lists[0].id);
      return lists[0].id;
    }
    const res = await fetch("/api/shop/bang-gia", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ten: "Bảng giá mặc định",
        tienTe: tienTe.trim() || "VND",
      }),
    });
    const json = (await res.json().catch(() => null)) as {
      item?: ShopBangGia;
      error?: string;
    } | null;
    if (!res.ok || !json?.item) {
      setErr(json?.error ?? "Không tạo được bảng giá để gắn giá.");
      return null;
    }
    setPriceLists((prev) => [json.item!, ...prev]);
    setBangGiaId(json.item.id);
    return json.item.id;
  }

  function currentTienTe(): string {
    return (
      priceLists.find((b) => b.id === bangGiaId)?.tienTe ??
      priceLists[0]?.tienTe ??
      "VND"
    );
  }

  const knownTienTe = useMemo(() => {
    const set = new Set<string>();
    for (const b of priceLists) {
      const t = b.tienTe?.trim().toUpperCase();
      if (t) set.add(t);
    }
    return [...set];
  }, [priceLists]);

  async function setBangGiaTienTe(tienTeRaw: string) {
    const tienTe = tienTeRaw.trim().toUpperCase() || "VND";
    setErr(null);
    const targetId = await ensureBangGiaId(priceLists, tienTe);
    if (!targetId) return;
    const existing = priceLists.find((b) => b.id === targetId);
    if (existing?.tienTe === tienTe) return;

    const res = await fetch(`/api/shop/bang-gia/${targetId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tienTe }),
    });
    if (!res.ok) {
      const json = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      setErr(json?.error ?? "Không đổi được đơn vị tiền tệ.");
      return;
    }
    setPriceLists((prev) =>
      prev.map((b) => (b.id === targetId ? { ...b, tienTe } : b)),
    );
  }

  async function saveGiaForBienThe(
    idBienThe: string,
    giaNum: number,
    lists: ShopBangGia[] = priceLists,
  ): Promise<boolean> {
    const targetBang = await ensureBangGiaId(lists);
    if (!targetBang) return false;
    const bg =
      lists.find((b) => b.id === targetBang) ??
      priceLists.find((b) => b.id === targetBang);
    const dong = [
      ...(bg?.dong.filter((d) => d.idBienThe !== idBienThe) ?? []),
      { idBienThe, gia: giaNum },
    ];
    const res = await fetch(`/api/shop/bang-gia/${targetBang}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dong }),
    });
    if (!res.ok) {
      const json = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      setErr(json?.error ?? "Không lưu được giá.");
      return false;
    }
    return true;
  }

  async function createBangGia() {
    setSaving(true);
    setErr(null);
    try {
      const tienTe = newBangTienTe.trim().toUpperCase() || "VND";
      const res = await fetch("/api/shop/bang-gia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ten: newBangTen.trim() || "Bảng giá",
          tienTe,
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        item?: ShopBangGia;
        error?: string;
      } | null;
      if (!res.ok || !json?.item) {
        setErr(json?.error ?? "Không tạo bảng giá.");
        return;
      }
      setPriceLists((prev) => [json.item!, ...prev]);
      setBangGiaId(json.item.id);
      setNewBangTen("Bảng giá mặc định");
      setNewBangTienTe("VND");
    } finally {
      setSaving(false);
    }
  }

  async function removeBangGia() {
    const bg = priceLists.find((b) => b.id === bangGiaId);
    if (!bg) {
      setErr("Chọn bảng giá cần xóa.");
      return;
    }
    const dongCount = bg.dong.length;
    const ok = window.confirm(
      [
        `Xóa bảng giá «${bg.ten}» (${bg.tienTe})?`,
        "",
        dongCount > 0
          ? `Bảng này đang có ${dongCount} dòng giá. Giá gắn với bảng này sẽ không còn dùng được cho hàng bán / post.`
          : "Bảng này chưa có dòng giá.",
        "",
        "Hành động không hoàn tác trên giao diện. Bạn chắc chắn muốn xóa?",
      ].join("\n"),
    );
    if (!ok) return;

    setSaving(true);
    setErr(null);
    try {
      const res = await fetch(`/api/shop/bang-gia/${bg.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setErr(json?.error ?? "Không xóa được bảng giá.");
        return;
      }
      const next = priceLists.filter((b) => b.id !== bg.id);
      setPriceLists(next);
      setBangGiaId(next[0]?.id ?? "");
    } finally {
      setSaving(false);
    }
  }

  async function onPickThumb(file: File | null) {
    if (!file) return;
    setUploading(true);
    setErr(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/post-image/upload", {
        method: "POST",
        body: form,
      });
      const json = (await res.json().catch(() => null)) as {
        imageId?: string;
        url?: string;
        error?: string;
      } | null;
      if (!res.ok || !json?.imageId || !json.url) {
        setErr(json?.error ?? "Không tải ảnh được.");
        return;
      }
      setAnhId(json.imageId);
      setAnhUrl(json.url);
    } finally {
      setUploading(false);
    }
  }

  async function createProduct() {
    if (!ten.trim()) {
      setErr("Nhập tên sản phẩm.");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      const soLuongTon = Number.parseInt(ton, 10) || 0;
      const res = await fetch("/api/shop/san-pham", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ten: ten.trim(),
          anhId,
          phanLoai: phanLoai.trim() || null,
          bienThe: [{ nhan: "Mặc định", soLuongTon }],
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        item?: ShopSanPham;
        error?: string;
      } | null;
      if (!res.ok || !json?.item) {
        setErr(json?.error ?? "Không tạo sản phẩm.");
        return;
      }

      const giaNum = parseGiaInput(gia);
      const bt = json.item.bienThe[0];
      if (bt && giaNum != null) {
        const ok = await saveGiaForBienThe(bt.id, giaNum);
        if (!ok) return;
      }

      setTen("");
      setTon("0");
      setGia("");
      setPhanLoai("");
      setAnhId(null);
      setAnhUrl(null);
      setProducts((prev) => [json.item!, ...prev.filter((x) => x.id !== json.item!.id)]);
      await load({ silent: true });
    } finally {
      setSaving(false);
    }
  }

  async function removeProduct(id: string) {
    if (!confirm("Xóa sản phẩm này?")) return;
    await fetch(`/api/shop/san-pham/${id}`, { method: "DELETE" });
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setProducts((prev) => prev.filter((p) => p.id !== id));
    await load({ silent: true });
  }

  async function saveRow(p: ShopSanPham) {
    const bt = p.bienThe[0];
    if (!bt) {
      setErr("Sản phẩm thiếu biến thể.");
      return;
    }
    const draft = getDraft(p);
    const tonNum = Number.parseInt(draft.ton, 10);
    if (!Number.isFinite(tonNum)) {
      setErr("Tồn kho không hợp lệ.");
      return;
    }
    const giaRaw = draft.gia.trim();
    const giaNum = giaRaw ? parseGiaInput(giaRaw) : null;
    if (giaRaw && giaNum == null) {
      setErr("Giá không hợp lệ.");
      return;
    }

    setSavingId(p.id);
    setErr(null);
    try {
      const patchBody: Record<string, unknown> = {
        phanLoai: draft.phanLoai.trim() || null,
      };
      if (draft.anhId !== undefined) {
        patchBody.anhId = draft.anhId;
      }
      const patchRes = await fetch(`/api/shop/san-pham/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patchBody),
      });
      if (!patchRes.ok) {
        const json = (await patchRes.json().catch(() => null)) as {
          error?: string;
        } | null;
        setErr(json?.error ?? "Không lưu được sản phẩm.");
        return;
      }

      if (tonNum !== bt.soLuongTon) {
        const tonRes = await fetch(`/api/shop/san-pham/${p.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "upsertBienThe",
            bienTheId: bt.id,
            nhan: bt.nhan || "Mặc định",
            soLuongTon: tonNum,
          }),
        });
        if (!tonRes.ok) {
          setErr("Không lưu được tồn kho.");
          return;
        }
      }

      const oldGia = resolveGiaBienThe(bt.id);
      if (giaNum != null && giaNum !== oldGia) {
        const ok = await saveGiaForBienThe(bt.id, giaNum);
        if (!ok) return;
      }

      setDrafts((prev) => {
        const next = { ...prev };
        delete next[p.id];
        return next;
      });
      await load({ silent: true });
    } finally {
      setSavingId(null);
    }
  }

  async function pickRowThumb(p: ShopSanPham, file: File) {
    setUploading(true);
    setErr(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/post-image/upload", {
        method: "POST",
        body: form,
      });
      const json = (await res.json().catch(() => null)) as {
        imageId?: string;
        url?: string;
        error?: string;
      } | null;
      if (!res.ok || !json?.imageId || !json.url) {
        setErr(json?.error ?? "Không tải ảnh được.");
        return;
      }
      patchDraft(
        p.id,
        { anhId: json.imageId, anhUrl: json.url },
        baseDraftForProduct(p),
      );
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return (
      <div className="shop-dash-loading">
        <Loader2 className="shop-spin" size={20} /> Đang tải…
      </div>
    );
  }

  if (!enabled) {
    return (
      <div className="shop-dash">
        <h1>Quản lý kho hàng</h1>
        <p>
          Chức năng bán hàng đang tắt. Bật trong{" "}
          <strong>Cài đặt tài khoản → Bán hàng</strong>, hoặc{" "}
          <Link href="/">về trang chủ</Link> rồi mở menu tài khoản.
        </p>
      </div>
    );
  }

  return (
    <div className="shop-dash">
      <ShopDashTabs active="kho" />

      {err ? <p className="shop-dash-err">{err}</p> : null}

      <section className="shop-dash-card">
        <h2>Bảng giá</h2>
        <div className="shop-dash-row shop-dash-row--bang-gia">
          <input
            value={newBangTen}
            onChange={(e) => setNewBangTen(e.target.value)}
            placeholder="Tên bảng giá (VD: Hoyofes Tokyo)"
            aria-label="Tên bảng giá"
          />
          <ShopTienTeSelect
            value={newBangTienTe}
            knownCodes={knownTienTe}
            onChange={setNewBangTienTe}
            aria-label="Đơn vị tiền tệ bảng giá mới"
            title="Đơn vị tiền tệ của bảng giá mới"
          />
          <button type="button" disabled={saving} onClick={() => void createBangGia()}>
            <Plus size={16} /> Tạo bảng giá
          </button>
        </div>
        {priceLists.length > 0 ? (
          <label className="shop-dash-field">
            Bảng giá đang dùng khi thêm hàng (quyết định đơn vị tiền tệ)
            <div className="shop-dash-bang-gia-pick">
              <select
                value={bangGiaId}
                onChange={(e) => setBangGiaId(e.target.value)}
              >
                {priceLists.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.ten} ({b.tienTe}) — {b.dong.length} dòng
                  </option>
                ))}
              </select>
              <ShopTienTeSelect
                value={currentTienTe()}
                knownCodes={knownTienTe}
                disabled={saving || !bangGiaId}
                onChange={(v) => void setBangGiaTienTe(v)}
                aria-label="Đơn vị tiền tệ bảng đang chọn"
                title="Đổi đơn vị tiền tệ của bảng giá đang chọn"
              />
              <button
                type="button"
                className="shop-dash-bang-gia-del"
                disabled={saving || !bangGiaId}
                onClick={() => void removeBangGia()}
                aria-label="Xóa bảng giá đang chọn"
                title="Xóa bảng giá"
              >
                <Trash2 size={16} strokeWidth={2} />
              </button>
            </div>
          </label>
        ) : (
          <p className="shop-dash-hint">Tạo ít nhất một bảng giá trước khi gắn giá.</p>
        )}
      </section>

      <section className="shop-dash-card">
        <div className="shop-dash-kho-head">
          <h2>
            Kho hàng (
            {filteredProducts.length}
            {filterLoai !== "all" ? ` / ${products.length}` : ""})
          </h2>
          {products.length > 0 ? (
            <div
              className="shop-filter-chips"
              role="tablist"
              aria-label="Lọc theo phân loại"
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
              {products.some((p) => !p.phanLoai?.trim()) ? (
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
        </div>

        <div className="shop-grid-wrap">
          <table className="shop-grid">
            <thead>
              <tr>
                <th scope="col" className="shop-grid-col-thumb">
                  Ảnh
                </th>
                <th scope="col" className="shop-grid-col-name">
                  Tên sản phẩm
                </th>
                <th scope="col" className="shop-grid-col-loai">
                  Phân loại
                </th>
                <th scope="col" className="shop-grid-col-ton">
                  Tồn kho
                </th>
                <th scope="col" className="shop-grid-col-gia">
                  Giá ({currentTienTe()})
                </th>
                <th scope="col" className="shop-grid-col-actions">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                className="shop-grid-row shop-grid-row--add"
                onPaste={(e) => {
                  if (uploading) return;
                  const file = imageFilesFromClipboard(e.clipboardData)[0];
                  if (!file) return;
                  e.preventDefault();
                  void onPickThumb(file);
                }}
              >
                <td className="shop-grid-col-thumb">
                  <div
                    className={`shop-thumb-pick${thumbMenuKey === "__new__" ? " is-open" : ""}`}
                    data-thumb-menu="__new__"
                    tabIndex={0}
                    onPaste={(e) => {
                      if (uploading) return;
                      const file = imageFilesFromClipboard(e.clipboardData)[0];
                      if (!file) return;
                      e.preventDefault();
                      e.stopPropagation();
                      void onPickThumb(file);
                    }}
                  >
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={(e) => {
                        const f = e.target.files?.[0] ?? null;
                        e.target.value = "";
                        void onPickThumb(f);
                        setThumbMenuKey(null);
                      }}
                    />
                    <div className={`shop-thumb-frame${anhUrl ? " has-img" : ""}`}>
                      {anhUrl ? (
                        <button
                          type="button"
                          className="shop-thumb-img-btn"
                          aria-label="Tùy chọn ảnh"
                          aria-expanded={thumbMenuKey === "__new__"}
                          title="Tùy chọn ảnh"
                          onClick={() =>
                            setThumbMenuKey((k) =>
                              k === "__new__" ? null : "__new__",
                            )
                          }
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={anhUrl} alt="" />
                        </button>
                      ) : uploading ? (
                        <Loader2 className="shop-spin" size={18} />
                      ) : (
                        <button
                          type="button"
                          className="shop-thumb-placeholder shop-thumb-placeholder--pick"
                          aria-label="Tùy chọn ảnh"
                          aria-expanded={thumbMenuKey === "__new__"}
                          title="Tùy chọn ảnh"
                          onClick={() =>
                            setThumbMenuKey((k) =>
                              k === "__new__" ? null : "__new__",
                            )
                          }
                        >
                          Ảnh
                        </button>
                      )}
                      {anhUrl ? (
                        <button
                          type="button"
                          className="shop-thumb-clear"
                          aria-label="Xóa ảnh"
                          title="Xóa ảnh"
                          onClick={() => {
                            setAnhId(null);
                            setAnhUrl(null);
                          }}
                        >
                          <X size={12} />
                        </button>
                      ) : null}
                    </div>
                    {thumbMenuKey === "__new__" ? (
                      <div className="shop-thumb-acts" role="toolbar" aria-label="Thao tác ảnh">
                        <button
                          type="button"
                          className="shop-thumb-act"
                          disabled={uploading}
                          onClick={() => fileRef.current?.click()}
                          aria-label="Chọn ảnh từ máy"
                          title="Đổi ảnh"
                        >
                          <ImagePlus size={14} strokeWidth={2} />
                        </button>
                        <button
                          type="button"
                          className="shop-thumb-act"
                          disabled={uploading}
                          onClick={() => {
                            void (async () => {
                              const file = await readImageFileFromClipboard();
                              if (!file) {
                                setErr(
                                  "Không đọc được ảnh từ bộ nhớ tạm. Hãy copy ảnh rồi thử lại, hoặc Ctrl+V khi focus ô ảnh.",
                                );
                                return;
                              }
                              void onPickThumb(file);
                              setThumbMenuKey(null);
                            })();
                          }}
                          aria-label="Dán ảnh từ bộ nhớ tạm"
                          title="Dán ảnh"
                        >
                          <ClipboardPaste size={14} strokeWidth={2} />
                        </button>
                      </div>
                    ) : null}
                  </div>
                </td>
                <td className="shop-grid-col-name">
                  <input
                    value={ten}
                    onChange={(e) => setTen(e.target.value)}
                    placeholder="VD: Key Tinh Hồn"
                    aria-label="Tên sản phẩm"
                  />
                </td>
                <td className="shop-grid-col-loai">
                  <ShopPhanLoaiInput
                    value={phanLoai}
                    options={categoryOptions}
                    onChange={setPhanLoai}
                    placeholder="VD: keychain"
                    aria-label="Phân loại"
                  />
                </td>
                <td className="shop-grid-col-ton">
                  <input
                    value={ton}
                    onChange={(e) => setTon(e.target.value)}
                    placeholder="0"
                    inputMode="numeric"
                    aria-label="Tồn kho"
                  />
                </td>
                <td className="shop-grid-col-gia">
                  <div className="shop-gia-cell">
                    <input
                      value={gia}
                      onChange={(e) => setGia(e.target.value)}
                      placeholder="Tuỳ chọn"
                      inputMode="decimal"
                      aria-label={`Giá (${currentTienTe()})`}
                    />
                    <span className="shop-tien-te-badge" title="Theo bảng giá đang chọn">
                      {currentTienTe()}
                    </span>
                  </div>
                </td>
                <td className="shop-grid-col-actions">
                  <button
                    type="button"
                    disabled={saving || uploading}
                    onClick={() => void createProduct()}
                  >
                    {saving ? (
                      <Loader2 className="shop-spin" size={16} />
                    ) : (
                      <Plus size={16} />
                    )}
                    Thêm
                  </button>
                </td>
              </tr>

              {filteredProducts.length === 0 ? (
                <tr className="shop-grid-row shop-grid-row--empty">
                  <td colSpan={6}>
                    {products.length === 0
                      ? "Chưa có sản phẩm — điền dòng trên rồi bấm Thêm."
                      : "Không có sản phẩm trong nhóm này."}
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const bt = p.bienThe[0];
                  const draft = getDraft(p);
                  const dirty = isRowDirty(p);
                  const displayAnh =
                    draft.anhId !== undefined ? draft.anhUrl : p.anhUrl;
                  const rowSaving = savingId === p.id;
                  const rowFileId = `shop-row-thumb-${p.id}`;
                  return (
                    <tr
                      key={p.id}
                      className={`shop-grid-row${dirty ? " is-dirty" : ""}`}
                    >
                      <td className="shop-grid-col-thumb">
                        <div
                          className={`shop-thumb-pick${thumbMenuKey === p.id ? " is-open" : ""}`}
                          data-thumb-menu={p.id}
                          tabIndex={0}
                          onPaste={(e) => {
                            if (uploading || rowSaving) return;
                            const file =
                              imageFilesFromClipboard(e.clipboardData)[0];
                            if (!file) return;
                            e.preventDefault();
                            e.stopPropagation();
                            void pickRowThumb(p, file);
                          }}
                        >
                          <input
                            id={rowFileId}
                            type="file"
                            accept="image/*"
                            hidden
                            disabled={uploading || rowSaving}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              e.target.value = "";
                              if (f) void pickRowThumb(p, f);
                              setThumbMenuKey(null);
                            }}
                          />
                          <div
                            className={`shop-thumb-frame${displayAnh ? " has-img" : ""}`}
                          >
                            {displayAnh ? (
                              <button
                                type="button"
                                className="shop-thumb-img-btn"
                                disabled={uploading || rowSaving}
                                aria-label="Tùy chọn ảnh"
                                aria-expanded={thumbMenuKey === p.id}
                                title="Tùy chọn ảnh"
                                onClick={() =>
                                  setThumbMenuKey((k) =>
                                    k === p.id ? null : p.id,
                                  )
                                }
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={displayAnh} alt="" />
                              </button>
                            ) : uploading || rowSaving ? (
                              <Loader2 className="shop-spin" size={18} />
                            ) : (
                              <button
                                type="button"
                                className="shop-thumb-placeholder shop-thumb-placeholder--pick"
                                aria-label="Tùy chọn ảnh"
                                aria-expanded={thumbMenuKey === p.id}
                                title="Tùy chọn ảnh"
                                disabled={uploading || rowSaving}
                                onClick={() =>
                                  setThumbMenuKey((k) =>
                                    k === p.id ? null : p.id,
                                  )
                                }
                              >
                                Ảnh
                              </button>
                            )}
                            {displayAnh ? (
                              <button
                                type="button"
                                className="shop-thumb-clear"
                                aria-label="Xóa ảnh"
                                title="Xóa ảnh"
                                disabled={uploading || rowSaving}
                                onClick={() =>
                                  patchDraft(
                                    p.id,
                                    { anhId: null, anhUrl: null },
                                    baseDraftForProduct(p),
                                  )
                                }
                              >
                                <X size={12} />
                              </button>
                            ) : null}
                          </div>
                          {thumbMenuKey === p.id ? (
                            <div
                              className="shop-thumb-acts"
                              role="toolbar"
                              aria-label="Thao tác ảnh"
                            >
                              <label
                                htmlFor={rowFileId}
                                className="shop-thumb-act"
                                aria-label="Chọn ảnh từ máy"
                                title="Đổi ảnh"
                              >
                                <ImagePlus size={14} strokeWidth={2} />
                              </label>
                              <button
                                type="button"
                                className="shop-thumb-act"
                                disabled={uploading || rowSaving}
                                onClick={() => {
                                  void (async () => {
                                    const file =
                                      await readImageFileFromClipboard();
                                    if (!file) {
                                      setErr(
                                        "Không đọc được ảnh từ bộ nhớ tạm. Hãy copy ảnh rồi thử lại, hoặc Ctrl+V khi focus ô ảnh.",
                                      );
                                      return;
                                    }
                                    void pickRowThumb(p, file);
                                    setThumbMenuKey(null);
                                  })();
                                }}
                                aria-label="Dán ảnh từ bộ nhớ tạm"
                                title="Dán ảnh"
                              >
                                <ClipboardPaste size={14} strokeWidth={2} />
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </td>
                      <td className="shop-grid-col-name">
                        <strong>{p.ten}</strong>
                        {bt && Number.parseInt(draft.ton, 10) <= 0 ? (
                          <div className="shop-dash-hint">Đợi restock</div>
                        ) : null}
                      </td>
                      <td className="shop-grid-col-loai">
                        <ShopPhanLoaiInput
                          className="shop-phan-loai-inline"
                          value={draft.phanLoai}
                          options={categoryOptions}
                          placeholder="—"
                          aria-label={`Phân loại ${p.ten}`}
                          disabled={rowSaving}
                          onChange={(v) =>
                            patchDraft(
                              p.id,
                              { phanLoai: v },
                              baseDraftForProduct(p),
                            )
                          }
                        />
                      </td>
                      <td className="shop-grid-col-ton">
                        {bt ? (
                          <input
                            className="shop-dash-ton"
                            type="number"
                            value={draft.ton}
                            disabled={rowSaving}
                            onChange={(e) =>
                              patchDraft(
                                p.id,
                                { ton: e.target.value },
                                baseDraftForProduct(p),
                              )
                            }
                            aria-label={`Tồn kho ${p.ten}`}
                          />
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="shop-grid-col-gia">
                        {bt ? (
                          <div className="shop-gia-cell">
                            <input
                              value={draft.gia}
                              placeholder="—"
                              inputMode="decimal"
                              disabled={rowSaving}
                              aria-label={`Giá ${p.ten} (${currentTienTe()})`}
                              onChange={(e) =>
                                patchDraft(
                                  p.id,
                                  { gia: e.target.value },
                                  baseDraftForProduct(p),
                                )
                              }
                            />
                            <span
                              className="shop-tien-te-badge"
                              title="Theo bảng giá đang chọn"
                            >
                              {currentTienTe()}
                            </span>
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="shop-grid-col-actions">
                        <div className="shop-grid-actions">
                          {dirty ? (
                            <button
                              type="button"
                              className="shop-btn-save"
                              disabled={rowSaving || uploading}
                              onClick={() => void saveRow(p)}
                              aria-label="Lưu thay đổi"
                              title="Lưu"
                            >
                              {rowSaving ? (
                                <Loader2 className="shop-spin" size={16} />
                              ) : (
                                <Save size={16} strokeWidth={2} />
                              )}
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className="shop-dash-danger"
                            disabled={rowSaving}
                            onClick={() => void removeProduct(p.id)}
                            aria-label={`Xóa ${p.ten}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

