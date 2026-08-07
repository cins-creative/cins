"use client";

import {
  Layers,
  Loader2,
  Package,
  Pencil,
  Plus,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { createPortal } from "react-dom";

import {
  fetchSanPhamCached,
  fetchUuDaiCached,
  invalidateUuDaiCache,
  peekUuDai,
} from "@/lib/shop/client-fetch-cache";
import type {
  ShopCombo,
  ShopComboPhamVi,
  ShopLoaiGiam,
  ShopNhom,
  ShopSanPham,
} from "@/lib/shop/types";

import "./shop-dashboard.css";

type DieuKienDraft = {
  key: string;
  phamVi: ShopComboPhamVi;
  idNhom: string;
  idSanPham: string;
  idBienThe: string;
  soLuong: number;
};

type ComboFormState = {
  ten: string;
  moTa: string;
  loaiGiam: ShopLoaiGiam;
  giaTri: string;
  giamToiDa: string;
  apDungLap: boolean;
  batDau: string;
  ketThuc: string;
  dieuKien: DieuKienDraft[];
};

const EMPTY_DK = (): DieuKienDraft => ({
  key: crypto.randomUUID(),
  phamVi: "loai_hang",
  idNhom: "",
  idSanPham: "",
  idBienThe: "",
  soLuong: 1,
});

const EMPTY_FORM = (): ComboFormState => ({
  ten: "",
  moTa: "",
  loaiGiam: "phan_tram",
  giaTri: "",
  giamToiDa: "",
  apDungLap: false,
  batDau: "",
  ketThuc: "",
  dieuKien: [EMPTY_DK()],
});

function isoToDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function datetimeLocalToIso(local: string): string | null {
  const t = local.trim();
  if (!t) return null;
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function formatGiam(combo: ShopCombo): string {
  if (combo.loaiGiam === "phan_tram") {
    const cap =
      combo.giamToiDa != null
        ? ` (tối đa ${combo.giamToiDa.toLocaleString("vi-VN")} ₫)`
        : "";
    return `${combo.giaTri}%${cap}`;
  }
  return `${combo.giaTri.toLocaleString("vi-VN")} ₫`;
}

function formatGiamHero(combo: ShopCombo): { figure: string; unit: string } {
  if (combo.loaiGiam === "phan_tram") {
    return { figure: String(combo.giaTri), unit: "%" };
  }
  const n = combo.giaTri;
  if (n >= 1_000_000) {
    return {
      figure: (n / 1_000_000).toLocaleString("vi-VN", {
        maximumFractionDigits: 1,
      }),
      unit: "triệu ₫",
    };
  }
  if (n >= 1000) {
    return {
      figure: Math.round(n / 1000).toLocaleString("vi-VN"),
      unit: "k ₫",
    };
  }
  return { figure: n.toLocaleString("vi-VN"), unit: "₫" };
}

function comboTrangThai(combo: ShopCombo): string {
  if (!combo.kichHoat) return "Tắt";
  const now = Date.now();
  if (combo.batDau) {
    const start = new Date(combo.batDau).getTime();
    if (!Number.isNaN(start) && start > now) return "Hẹn giờ";
  }
  if (combo.ketThuc) {
    const end = new Date(combo.ketThuc).getTime();
    if (!Number.isNaN(end) && end <= now) return "Hết hạn";
  }
  return "Đang chạy";
}

function phamViIcon(phamVi: ShopComboPhamVi) {
  if (phamVi === "loai_hang") return <Layers size={12} aria-hidden />;
  if (phamVi === "san_pham") return <Package size={12} aria-hidden />;
  return <Tag size={12} aria-hidden />;
}

function phamViLabel(phamVi: ShopComboPhamVi): string {
  if (phamVi === "loai_hang") return "Loại hàng";
  if (phamVi === "san_pham") return "Mặt hàng";
  return "Biến thể";
}

function comboToForm(combo: ShopCombo): ComboFormState {
  return {
    ten: combo.ten,
    moTa: combo.moTa ?? "",
    loaiGiam: combo.loaiGiam,
    giaTri: String(combo.giaTri),
    giamToiDa: combo.giamToiDa != null ? String(combo.giamToiDa) : "",
    apDungLap: combo.apDungLap,
    batDau: isoToDatetimeLocal(combo.batDau),
    ketThuc: isoToDatetimeLocal(combo.ketThuc),
    dieuKien:
      combo.dieuKien.length > 0
        ? combo.dieuKien.map((dk) => ({
            key: dk.id,
            phamVi: dk.phamVi,
            idNhom: dk.idNhom ?? "",
            idSanPham: dk.idSanPham ?? "",
            idBienThe: dk.idBienThe ?? "",
            soLuong: dk.soLuong,
          }))
        : [EMPTY_DK()],
  };
}

function dieuKienPayload(rows: DieuKienDraft[]) {
  return rows.map((row) => ({
    phamVi: row.phamVi,
    idNhom: row.phamVi === "loai_hang" ? row.idNhom || null : null,
    idSanPham: row.phamVi === "san_pham" ? row.idSanPham || null : null,
    idBienThe: row.phamVi === "bien_the" ? row.idBienThe || null : null,
    soLuong: row.soLuong,
  }));
}

function detectNestedWarning(
  rows: DieuKienDraft[],
  sanPham: ShopSanPham[],
): boolean {
  const nhomIds = new Set(
    rows
      .filter((r) => r.phamVi === "loai_hang" && r.idNhom)
      .map((r) => r.idNhom),
  );
  if (nhomIds.size === 0) return false;
  const spById = new Map(sanPham.map((sp) => [sp.id, sp]));
  for (const row of rows) {
    if (row.phamVi !== "san_pham" || !row.idSanPham) continue;
    const sp = spById.get(row.idSanPham);
    if (sp?.idNhom && nhomIds.has(sp.idNhom)) return true;
  }
  return false;
}

export function ShopUuDaiComboClient() {
  const [combos, setCombos] = useState<ShopCombo[]>(
    () => peekUuDai()?.combos ?? [],
  );
  const [loading, setLoading] = useState(!peekUuDai());
  const [err, setErr] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ComboFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);
  const [toggleBusy, setToggleBusy] = useState<string | null>(null);
  const [nhomList, setNhomList] = useState<ShopNhom[]>([]);
  const [sanPham, setSanPham] = useState<ShopSanPham[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);

  const load = useCallback(async (force = false) => {
    setLoading(true);
    setErr(null);
    try {
      const data = await fetchUuDaiCached(force ? { force: true } : undefined);
      setCombos(data.combos);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Không tải được combo.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    try {
      const [nhomRes, spItems] = await Promise.all([
        fetch("/api/shop/nhom?truc=1", { cache: "no-store" }),
        fetchSanPhamCached(),
      ]);
      const nhomJson = (await nhomRes.json().catch(() => null)) as {
        items?: ShopNhom[];
      } | null;
      if (nhomRes.ok) setNhomList(nhomJson?.items ?? []);
      setSanPham(spItems);
    } catch {
      /* catalog optional for display */
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM());
    setFormErr(null);
    setDialogOpen(true);
    void loadCatalog();
  };

  const openEdit = (combo: ShopCombo) => {
    setEditingId(combo.id);
    setForm(comboToForm(combo));
    setFormErr(null);
    setDialogOpen(true);
    void loadCatalog();
  };

  const closeDialog = () => {
    if (saving) return;
    setDialogOpen(false);
    setEditingId(null);
    setFormErr(null);
  };

  const nestedWarning = useMemo(
    () => detectNestedWarning(form.dieuKien, sanPham),
    [form.dieuKien, sanPham],
  );

  const bienTheOptions = useMemo(() => {
    const out: Array<{ id: string; label: string }> = [];
    for (const sp of sanPham) {
      for (const bt of sp.bienThe) {
        out.push({ id: bt.id, label: `${sp.ten} — ${bt.nhan}` });
      }
    }
    return out;
  }, [sanPham]);

  async function handleToggle(combo: ShopCombo) {
    setToggleBusy(combo.id);
    setErr(null);
    try {
      const res = await fetch(`/api/shop/combo/${combo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kichHoat: !combo.kichHoat }),
      });
      const json = (await res.json().catch(() => null)) as {
        item?: ShopCombo;
        error?: string;
      } | null;
      if (!res.ok) throw new Error(json?.error ?? "Không cập nhật được.");
      invalidateUuDaiCache();
      setCombos((prev) =>
        prev.map((c) =>
          c.id === combo.id
            ? { ...c, kichHoat: json?.item?.kichHoat ?? !combo.kichHoat }
            : c,
        ),
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Không cập nhật được.");
    } finally {
      setToggleBusy(null);
    }
  }

  async function handleDelete(combo: ShopCombo) {
    if (!window.confirm(`Xóa combo «${combo.ten}»?`)) return;
    setErr(null);
    try {
      const res = await fetch(`/api/shop/combo/${combo.id}`, {
        method: "DELETE",
      });
      const json = (await res.json().catch(() => null)) as { error?: string };
      if (!res.ok) throw new Error(json?.error ?? "Không xóa được.");
      invalidateUuDaiCache();
      setCombos((prev) => prev.filter((c) => c.id !== combo.id));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Không xóa được.");
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormErr(null);
    const payload = {
      ten: form.ten.trim(),
      moTa: form.moTa.trim() || null,
      loaiGiam: form.loaiGiam,
      giaTri: Number(form.giaTri),
      giamToiDa:
        form.loaiGiam === "phan_tram" && form.giamToiDa.trim()
          ? Number(form.giamToiDa)
          : null,
      apDungLap: form.apDungLap,
      batDau: datetimeLocalToIso(form.batDau),
      ketThuc: datetimeLocalToIso(form.ketThuc),
      dieuKien: dieuKienPayload(form.dieuKien),
    };
    try {
      const url = editingId
        ? `/api/shop/combo/${editingId}`
        : "/api/shop/combo";
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => null)) as {
        item?: ShopCombo;
        error?: string;
      } | null;
      if (!res.ok) throw new Error(json?.error ?? "Không lưu được.");
      invalidateUuDaiCache();
      if (json?.item) {
        setCombos((prev) => {
          const idx = prev.findIndex((c) => c.id === json.item!.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = json.item!;
            return next;
          }
          return [json.item!, ...prev];
        });
      } else {
        await load(true);
      }
      closeDialog();
    } catch (e) {
      setFormErr(e instanceof Error ? e.message : "Không lưu được.");
    } finally {
      setSaving(false);
    }
  }

  function updateDk(
    key: string,
    patch: Partial<Omit<DieuKienDraft, "key">>,
  ) {
    setForm((prev) => ({
      ...prev,
      dieuKien: prev.dieuKien.map((row) =>
        row.key === key ? { ...row, ...patch } : row,
      ),
    }));
  }

  const dialog =
    dialogOpen && typeof document !== "undefined"
      ? createPortal(
          <div
            className="shop-kho-nhom-backdrop"
            role="presentation"
            onClick={closeDialog}
          >
            <div
              className="shop-kho-nhom-dialog shop-uu-dai-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="shop-combo-dialog-title"
              onClick={(ev) => ev.stopPropagation()}
            >
              <header className="shop-kho-nhom-dialog-head">
                <h3 id="shop-combo-dialog-title">
                  {editingId ? "Sửa combo" : "Tạo combo"}
                </h3>
                <button
                  type="button"
                  className="shop-kho-nhom-dialog-close"
                  onClick={closeDialog}
                  aria-label="Đóng"
                >
                  <X size={18} aria-hidden />
                </button>
              </header>
              <form
                className="shop-kho-nhom-panel shop-uu-dai-form"
                onSubmit={handleSubmit}
              >
                {formErr ? (
                  <p className="shop-dash-err-inline">{formErr}</p>
                ) : null}
                <label className="shop-dash-field">
                  Tên combo
                  <input
                    required
                    value={form.ten}
                    onChange={(ev) =>
                      setForm((p) => ({ ...p, ten: ev.target.value }))
                    }
                    maxLength={120}
                  />
                </label>
                <label className="shop-dash-field">
                  Mô tả (tùy chọn)
                  <textarea
                    rows={2}
                    value={form.moTa}
                    onChange={(ev) =>
                      setForm((p) => ({ ...p, moTa: ev.target.value }))
                    }
                    className="shop-uu-dai-textarea"
                  />
                </label>
                <fieldset className="shop-uu-dai-fieldset">
                  <legend>Loại giảm</legend>
                  <label className="shop-uu-dai-radio">
                    <input
                      type="radio"
                      name="loaiGiam"
                      checked={form.loaiGiam === "phan_tram"}
                      onChange={() =>
                        setForm((p) => ({ ...p, loaiGiam: "phan_tram" }))
                      }
                    />
                    Phần trăm (%)
                  </label>
                  <label className="shop-uu-dai-radio">
                    <input
                      type="radio"
                      name="loaiGiam"
                      checked={form.loaiGiam === "so_tien"}
                      onChange={() =>
                        setForm((p) => ({ ...p, loaiGiam: "so_tien" }))
                      }
                    />
                    Số tiền (₫)
                  </label>
                </fieldset>
                <div className="shop-dash-form">
                  <label className="shop-dash-field">
                    Giá trị
                    <input
                      required
                      type="number"
                      min={form.loaiGiam === "phan_tram" ? 1 : 1000}
                      max={form.loaiGiam === "phan_tram" ? 100 : undefined}
                      step={form.loaiGiam === "phan_tram" ? 1 : 1000}
                      value={form.giaTri}
                      onChange={(ev) =>
                        setForm((p) => ({ ...p, giaTri: ev.target.value }))
                      }
                    />
                  </label>
                  {form.loaiGiam === "phan_tram" ? (
                    <label className="shop-dash-field">
                      Trần giảm (₫)
                      <input
                        type="number"
                        min={0}
                        step={1000}
                        value={form.giamToiDa}
                        onChange={(ev) =>
                          setForm((p) => ({ ...p, giamToiDa: ev.target.value }))
                        }
                        placeholder="Không giới hạn"
                      />
                    </label>
                  ) : null}
                </div>
                <label className="shop-uu-dai-check">
                  <input
                    type="checkbox"
                    checked={form.apDungLap}
                    onChange={(ev) =>
                      setForm((p) => ({ ...p, apDungLap: ev.target.checked }))
                    }
                  />
                  Áp dụng bội số (mua 2× tổ hợp → giảm 2×)
                </label>
                <div className="shop-dash-form">
                  <label className="shop-dash-field">
                    Bắt đầu
                    <input
                      type="datetime-local"
                      value={form.batDau}
                      onChange={(ev) =>
                        setForm((p) => ({ ...p, batDau: ev.target.value }))
                      }
                    />
                  </label>
                  <label className="shop-dash-field">
                    Kết thúc
                    <input
                      type="datetime-local"
                      value={form.ketThuc}
                      onChange={(ev) =>
                        setForm((p) => ({ ...p, ketThuc: ev.target.value }))
                      }
                    />
                  </label>
                </div>
                <div className="shop-uu-dai-dk-block">
                  <div className="shop-uu-dai-dk-head">
                    <strong>Điều kiện</strong>
                    {catalogLoading ? (
                      <Loader2 size={14} className="shop-spin" aria-hidden />
                    ) : null}
                  </div>
                  {nestedWarning ? (
                    <p className="shop-uu-dai-warn">
                      Điều kiện lồng nhau — mỗi món chỉ tính cho một điều kiện.
                    </p>
                  ) : null}
                  {form.dieuKien.map((row, idx) => (
                    <div key={row.key} className="shop-uu-dai-dk-row">
                      <select
                        value={row.phamVi}
                        onChange={(ev) =>
                          updateDk(row.key, {
                            phamVi: ev.target.value as ShopComboPhamVi,
                            idNhom: "",
                            idSanPham: "",
                            idBienThe: "",
                          })
                        }
                        aria-label={`Phạm vi điều kiện ${idx + 1}`}
                      >
                        <option value="loai_hang">Loại hàng</option>
                        <option value="san_pham">Mặt hàng</option>
                        <option value="bien_the">Biến thể</option>
                      </select>
                      {row.phamVi === "loai_hang" ? (
                        <select
                          required
                          value={row.idNhom}
                          onChange={(ev) =>
                            updateDk(row.key, { idNhom: ev.target.value })
                          }
                          aria-label={`Loại hàng ${idx + 1}`}
                        >
                          <option value="">Chọn loại hàng…</option>
                          {nhomList.map((n) => (
                            <option key={n.id} value={n.id}>
                              {n.nhan}
                            </option>
                          ))}
                        </select>
                      ) : null}
                      {row.phamVi === "san_pham" ? (
                        <select
                          required
                          value={row.idSanPham}
                          onChange={(ev) =>
                            updateDk(row.key, { idSanPham: ev.target.value })
                          }
                          aria-label={`Mặt hàng ${idx + 1}`}
                        >
                          <option value="">Chọn mặt hàng…</option>
                          {sanPham.map((sp) => (
                            <option key={sp.id} value={sp.id}>
                              {sp.ten}
                            </option>
                          ))}
                        </select>
                      ) : null}
                      {row.phamVi === "bien_the" ? (
                        <select
                          required
                          value={row.idBienThe}
                          onChange={(ev) =>
                            updateDk(row.key, { idBienThe: ev.target.value })
                          }
                          aria-label={`Biến thể ${idx + 1}`}
                        >
                          <option value="">Chọn biến thể…</option>
                          {bienTheOptions.map((bt) => (
                            <option key={bt.id} value={bt.id}>
                              {bt.label}
                            </option>
                          ))}
                        </select>
                      ) : null}
                      <input
                        type="number"
                        min={1}
                        required
                        value={row.soLuong}
                        onChange={(ev) =>
                          updateDk(row.key, {
                            soLuong: Math.max(1, Number(ev.target.value) || 1),
                          })
                        }
                        aria-label={`Số lượng điều kiện ${idx + 1}`}
                        className="shop-uu-dai-dk-qty"
                      />
                      {form.dieuKien.length > 1 ? (
                        <button
                          type="button"
                          className="shop-uu-dai-icon-btn"
                          onClick={() =>
                            setForm((p) => ({
                              ...p,
                              dieuKien: p.dieuKien.filter(
                                (r) => r.key !== row.key,
                              ),
                            }))
                          }
                          aria-label="Xóa điều kiện"
                        >
                          <Trash2 size={16} aria-hidden />
                        </button>
                      ) : null}
                    </div>
                  ))}
                  <button
                    type="button"
                    className="shop-uu-dai-add-dk"
                    onClick={() =>
                      setForm((p) => ({
                        ...p,
                        dieuKien: [...p.dieuKien, EMPTY_DK()],
                      }))
                    }
                  >
                    <Plus size={16} aria-hidden />
                    Thêm điều kiện
                  </button>
                </div>
                <div className="shop-uu-dai-dialog-actions">
                  <button type="button" onClick={closeDialog} disabled={saving}>
                    Hủy
                  </button>
                  <button type="submit" disabled={saving}>
                    {saving ? (
                      <Loader2 size={16} className="shop-spin" aria-hidden />
                    ) : null}
                    {editingId ? "Lưu" : "Tạo combo"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )
      : null;

  if (loading && combos.length === 0) {
    return (
      <div className="shop-dash-loading" aria-busy="true">
        <Loader2 size={20} className="shop-spin" aria-hidden />
        Đang tải…
      </div>
    );
  }

  const liveCount = combos.filter((c) => comboTrangThai(c) === "Đang chạy").length;

  return (
    <>
      {err ? <p className="shop-dash-err">{err}</p> : null}
      <section className="shop-dash-card shop-uu-dai-panel shop-uu-dai-combo-panel">
        <header className="shop-uu-dai-combo-hero">
          <div className="shop-uu-dai-combo-hero-copy">
            <p className="shop-uu-dai-combo-kicker">Combo & discount</p>
            <h2>Giảm thêm khi khách mua đủ tổ hợp</h2>
            <p className="shop-uu-dai-combo-lead">
              Ghép loại hàng, mặt hàng hoặc biến thể thành một bộ điều kiện.
              Đủ bộ trong giỏ thì hệ thống tự trừ % hoặc số tiền — không cần mã.
            </p>
          </div>
          <div className="shop-uu-dai-combo-hero-aside">
            {combos.length > 0 ? (
              <dl className="shop-uu-dai-combo-stats" aria-label="Tóm tắt combo">
                <div>
                  <dt>Tổng</dt>
                  <dd>{combos.length}</dd>
                </div>
                <div>
                  <dt>Đang chạy</dt>
                  <dd>{liveCount}</dd>
                </div>
              </dl>
            ) : null}
            <button
              type="button"
              className="shop-uu-dai-combo-cta"
              onClick={openCreate}
            >
              <Plus size={18} strokeWidth={2.2} aria-hidden />
              Tạo combo
            </button>
          </div>
        </header>

        {combos.length === 0 ? (
          <div className="shop-uu-dai-combo-empty">
            <div className="shop-uu-dai-combo-empty-art" aria-hidden>
              <span className="shop-uu-dai-combo-empty-stack is-a" />
              <span className="shop-uu-dai-combo-empty-stack is-b" />
              <span className="shop-uu-dai-combo-empty-stack is-c">
                <span className="shop-uu-dai-combo-empty-pct">−%</span>
              </span>
            </div>
            <div className="shop-uu-dai-combo-empty-body">
              <h3>Chưa có combo nào</h3>
              <p>
                Ví dụ: mua 1 áo + 1 tote → giảm 15%. Khách thấy giá đã trừ ngay
                trong giỏ khi đủ điều kiện.
              </p>
              <button
                type="button"
                className="shop-uu-dai-combo-cta is-secondary"
                onClick={openCreate}
              >
                <Plus size={18} strokeWidth={2.2} aria-hidden />
                Tạo combo đầu tiên
              </button>
            </div>
          </div>
        ) : (
          <ul className="shop-uu-dai-combo-list">
            {combos.map((combo) => {
              const status = comboTrangThai(combo);
              const hero = formatGiamHero(combo);
              return (
                <li
                  key={combo.id}
                  className={`shop-uu-dai-combo-card${
                    status === "Đang chạy" ? " is-live" : ""
                  }${!combo.kichHoat ? " is-off" : ""}`}
                >
                  <div className="shop-uu-dai-combo-discount" aria-hidden>
                    <span className="shop-uu-dai-combo-discount-fig">
                      {hero.figure}
                    </span>
                    <span className="shop-uu-dai-combo-discount-unit">
                      {hero.unit}
                    </span>
                    <span className="shop-uu-dai-combo-discount-label">
                      giảm
                    </span>
                  </div>
                  <div className="shop-uu-dai-combo-main">
                    <div className="shop-uu-dai-combo-title-row">
                      <h3>{combo.ten}</h3>
                      <span
                        className={`shop-uu-dai-status${
                          status === "Đang chạy" ? " is-live" : ""
                        }${status === "Hết hạn" || status === "Tắt" ? " is-muted" : ""}`}
                      >
                        {status}
                      </span>
                    </div>
                    {combo.moTa ? (
                      <p className="shop-uu-dai-combo-desc">{combo.moTa}</p>
                    ) : null}
                    <p className="shop-uu-dai-combo-recipe-label">
                      Điều kiện mua
                    </p>
                    <div className="shop-uu-dai-combo-badges">
                      {combo.dieuKien.map((dk, i) => (
                        <span key={dk.id} className="shop-uu-dai-combo-badge">
                          {i > 0 ? (
                            <span
                              className="shop-uu-dai-combo-badge-join"
                              aria-hidden
                            >
                              +
                            </span>
                          ) : null}
                          <span
                            className="shop-uu-dai-combo-badge-core"
                            title={phamViLabel(dk.phamVi)}
                          >
                            {phamViIcon(dk.phamVi)}
                            <span>
                              {dk.nhan ?? phamViLabel(dk.phamVi)}
                              <em>×{dk.soLuong}</em>
                            </span>
                          </span>
                        </span>
                      ))}
                    </div>
                    <div className="shop-uu-dai-combo-meta">
                      <span className="shop-uu-dai-combo-giam-full">
                        {formatGiam(combo)}
                      </span>
                      {combo.dieuKienLoi ? (
                        <span className="shop-uu-dai-status is-error">
                          Điều kiện lỗi
                        </span>
                      ) : null}
                      {combo.apDungLap ? (
                        <span className="shop-uu-dai-tag">Áp dụng bội số</span>
                      ) : null}
                    </div>
                  </div>
                  <div className="shop-uu-dai-combo-actions">
                    <button
                      type="button"
                      className={`shop-dash-switch${combo.kichHoat ? " on" : ""}`}
                      role="switch"
                      aria-checked={combo.kichHoat}
                      aria-label={
                        combo.kichHoat ? "Tắt combo" : "Bật combo"
                      }
                      disabled={toggleBusy === combo.id}
                      onClick={() => void handleToggle(combo)}
                    >
                      <span className="shop-dash-switch-knob" aria-hidden />
                    </button>
                    <button
                      type="button"
                      className="shop-uu-dai-icon-btn"
                      onClick={() => openEdit(combo)}
                      aria-label="Sửa combo"
                    >
                      <Pencil size={18} aria-hidden />
                    </button>
                    <button
                      type="button"
                      className="shop-uu-dai-icon-btn is-danger"
                      onClick={() => void handleDelete(combo)}
                      aria-label="Xóa combo"
                    >
                      <Trash2 size={18} aria-hidden />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      {dialog}
    </>
  );
}
