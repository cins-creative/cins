"use client";

import {
  Loader2,
  Pencil,
  Plus,
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
import { MAX_COMBO_DIEU_KIEN } from "@/lib/shop/uu-dai";
import type {
  ShopCombo,
  ShopComboPhamVi,
  ShopLoaiGiam,
  ShopNhom,
  ShopSanPham,
} from "@/lib/shop/types";

import {
  ShopComboDieuKienPicker,
  type ShopComboPickerOption,
} from "./ShopComboDieuKienPicker";
import { ShopComboCard } from "./ShopComboCard";
import "./shop-dashboard.css";

type DieuKienDraft = {
  key: string;
  phamVi: ShopComboPhamVi;
  idNhoms: string[];
  idSanPhams: string[];
  idBienThe: string;
  soLuong: number;
};

type ComboFormState = {
  ten: string;
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
  idNhoms: [],
  idSanPhams: [],
  idBienThe: "",
  soLuong: 1,
});

function nhomThumb(n: ShopNhom): string | null {
  return n.anhUrl ?? n.anhPhuUrls[0] ?? null;
}

const EMPTY_FORM = (): ComboFormState => ({
  ten: "",
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

function comboToForm(combo: ShopCombo): ComboFormState {
  return {
    ten: combo.ten,
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
            idNhoms:
              dk.phamVi === "loai_hang" && dk.idNhom ? [dk.idNhom] : [],
            idSanPhams:
              dk.phamVi === "san_pham" && dk.idSanPham ? [dk.idSanPham] : [],
            idBienThe: dk.idBienThe ?? "",
            soLuong: dk.soLuong,
          }))
        : [EMPTY_DK()],
  };
}

function dieuKienPayload(rows: DieuKienDraft[]) {
  const out: Array<{
    phamVi: ShopComboPhamVi;
    idNhom: string | null;
    idSanPham: string | null;
    idBienThe: string | null;
    soLuong: number;
  }> = [];
  for (const row of rows) {
    if (row.phamVi === "loai_hang") {
      for (const idNhom of row.idNhoms) {
        out.push({
          phamVi: "loai_hang",
          idNhom,
          idSanPham: null,
          idBienThe: null,
          soLuong: row.soLuong,
        });
      }
      continue;
    }
    if (row.phamVi === "san_pham") {
      for (const idSanPham of row.idSanPhams) {
        out.push({
          phamVi: "san_pham",
          idNhom: null,
          idSanPham,
          idBienThe: null,
          soLuong: row.soLuong,
        });
      }
      continue;
    }
    out.push({
      phamVi: row.phamVi,
      idNhom: null,
      idSanPham: null,
      idBienThe: row.phamVi === "bien_the" ? row.idBienThe || null : null,
      soLuong: row.soLuong,
    });
  }
  return out;
}

function detectNestedWarning(
  rows: DieuKienDraft[],
  sanPham: ShopSanPham[],
): boolean {
  const nhomIds = new Set(
    rows
      .filter((r) => r.phamVi === "loai_hang")
      .flatMap((r) => r.idNhoms),
  );
  if (nhomIds.size === 0) return false;
  const spById = new Map(sanPham.map((sp) => [sp.id, sp]));
  for (const row of rows) {
    if (row.phamVi !== "san_pham") continue;
    for (const idSanPham of row.idSanPhams) {
      const sp = spById.get(idSanPham);
      if (sp?.idNhom && nhomIds.has(sp.idNhom)) return true;
    }
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
        fetch("/api/shop/groups?truc=1", { cache: "no-store" }),
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

  const expandedDieuKienCount = useMemo(
    () => dieuKienPayload(form.dieuKien).length,
    [form.dieuKien],
  );
  const canAddDieuKien = form.dieuKien.length < MAX_COMBO_DIEU_KIEN;

  const nestedWarning = useMemo(
    () => detectNestedWarning(form.dieuKien, sanPham),
    [form.dieuKien, sanPham],
  );

  const nhomPickerOptions = useMemo(
    (): ShopComboPickerOption[] =>
      nhomList.map((n) => ({
        id: n.id,
        label: n.nhan,
        thumbUrl: nhomThumb(n),
        hint: n.soMau > 0 ? `${n.soMau} mẫu` : null,
      })),
    [nhomList],
  );

  const sanPhamPickerOptions = useMemo(
    (): ShopComboPickerOption[] =>
      sanPham.map((sp) => ({
        id: sp.id,
        label: sp.ten,
        thumbUrl: sp.anhUrl,
        hint: sp.phanLoai,
      })),
    [sanPham],
  );

  const bienThePickerOptions = useMemo((): ShopComboPickerOption[] => {
    const out: ShopComboPickerOption[] = [];
    for (const sp of sanPham) {
      for (const bt of sp.bienThe) {
        out.push({
          id: bt.id,
          label: `${sp.ten} — ${bt.nhan}`,
          thumbUrl: bt.anhUrl ?? sp.anhUrl,
          hint: sp.phanLoai,
        });
      }
    }
    return out;
  }, [sanPham]);

  async function handleToggle(combo: ShopCombo) {
    setToggleBusy(combo.id);
    setErr(null);
    try {
      const res = await fetch(`/api/shop/combos/${combo.id}`, {
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
      const res = await fetch(`/api/shop/combos/${combo.id}`, {
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
    for (const row of form.dieuKien) {
      if (row.phamVi === "loai_hang" && row.idNhoms.length === 0) {
        setFormErr("Chọn ít nhất một loại hàng cho mỗi điều kiện.");
        setSaving(false);
        return;
      }
      if (row.phamVi === "san_pham" && row.idSanPhams.length === 0) {
        setFormErr("Chọn ít nhất một mặt hàng cho mỗi điều kiện.");
        setSaving(false);
        return;
      }
      if (row.phamVi === "bien_the" && !row.idBienThe) {
        setFormErr("Chọn biến thể cho mỗi điều kiện.");
        setSaving(false);
        return;
      }
    }
    const expandedDieuKien = dieuKienPayload(form.dieuKien);
    if (expandedDieuKien.length > MAX_COMBO_DIEU_KIEN) {
      setFormErr(
        `Tối đa ${MAX_COMBO_DIEU_KIEN} điều kiện mua. Hiện có ${expandedDieuKien.length} — bớt dòng hoặc bớt mục đã chọn.`,
      );
      setSaving(false);
      return;
    }
    const payload = {
      ten: form.ten.trim(),
      loaiGiam: form.loaiGiam,
      giaTri: Number(form.giaTri),
      giamToiDa:
        form.loaiGiam === "phan_tram" && form.giamToiDa.trim()
          ? Number(form.giamToiDa)
          : null,
      apDungLap: form.apDungLap,
      batDau: datetimeLocalToIso(form.batDau),
      ketThuc: datetimeLocalToIso(form.ketThuc),
      dieuKien: expandedDieuKien,
    };
    try {
      const url = editingId
        ? `/api/shop/combos/${editingId}`
        : "/api/shop/combos";
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
          >
            <div
              className="shop-kho-nhom-dialog shop-uu-dai-dialog shop-uu-dai-dialog--wide"
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
                <div className="shop-uu-dai-form-body">
                  {formErr ? (
                    <p className="shop-dash-err-inline">{formErr}</p>
                  ) : null}

                  <section className="shop-uu-dai-form-section">
                    <h4 className="shop-uu-dai-form-section-title">Thông tin</h4>
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
                  </section>

                  <section className="shop-uu-dai-form-section">
                    <div className="shop-uu-dai-dk-head">
                      <h4 className="shop-uu-dai-form-section-title">
                        Điều kiện mua
                      </h4>
                      {catalogLoading ? (
                        <Loader2 size={14} className="shop-spin" aria-hidden />
                      ) : null}
                    </div>
                    <p className="shop-uu-dai-form-section-lead">
                      Khách cần có đủ các món sau trong giỏ để được giảm. Tối
                      đa {MAX_COMBO_DIEU_KIEN} điều kiện
                      {expandedDieuKienCount > 0
                        ? ` (${expandedDieuKienCount}/${MAX_COMBO_DIEU_KIEN})`
                        : ""}
                      .
                    </p>
                    {expandedDieuKienCount > MAX_COMBO_DIEU_KIEN ? (
                      <p className="shop-uu-dai-warn">
                        Quá {MAX_COMBO_DIEU_KIEN} điều kiện — bớt dòng hoặc bớt
                        mục đã chọn.
                      </p>
                    ) : null}
                    {nestedWarning ? (
                      <p className="shop-uu-dai-warn">
                        Điều kiện lồng nhau — mỗi món chỉ tính cho một điều kiện.
                      </p>
                    ) : null}
                    <div className="shop-uu-dai-dk-block">
                      {form.dieuKien.map((row, idx) => (
                        <div key={row.key} className="shop-uu-dai-dk-row">
                          <select
                            value={row.phamVi}
                            onChange={(ev) =>
                              updateDk(row.key, {
                                phamVi: ev.target.value as ShopComboPhamVi,
                                idNhoms: [],
                                idSanPhams: [],
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
                            <ShopComboDieuKienPicker
                              label={`Loại hàng ${idx + 1}`}
                              placeholder="Chọn loại hàng…"
                              options={nhomPickerOptions}
                              selectedIds={row.idNhoms}
                              multiple
                              disabled={catalogLoading}
                              onChange={(idNhoms) =>
                                updateDk(row.key, { idNhoms })
                              }
                            />
                          ) : null}
                          {row.phamVi === "san_pham" ? (
                            <ShopComboDieuKienPicker
                              label={`Mặt hàng ${idx + 1}`}
                              placeholder="Chọn mặt hàng…"
                              options={sanPhamPickerOptions}
                              selectedIds={row.idSanPhams}
                              multiple
                              disabled={catalogLoading}
                              onChange={(idSanPhams) =>
                                updateDk(row.key, { idSanPhams })
                              }
                            />
                          ) : null}
                          {row.phamVi === "bien_the" ? (
                            <ShopComboDieuKienPicker
                              label={`Biến thể ${idx + 1}`}
                              placeholder="Chọn biến thể…"
                              options={bienThePickerOptions}
                              selectedIds={
                                row.idBienThe ? [row.idBienThe] : []
                              }
                              multiple={false}
                              disabled={catalogLoading}
                              onChange={(ids) =>
                                updateDk(row.key, {
                                  idBienThe: ids[0] ?? "",
                                })
                              }
                            />
                          ) : null}
                          <input
                            type="number"
                            min={1}
                            required
                            value={row.soLuong}
                            onChange={(ev) =>
                              updateDk(row.key, {
                                soLuong: Math.max(
                                  1,
                                  Number(ev.target.value) || 1,
                                ),
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
                        disabled={!canAddDieuKien}
                        onClick={() => {
                          if (!canAddDieuKien) return;
                          setForm((p) => ({
                            ...p,
                            dieuKien: [...p.dieuKien, EMPTY_DK()],
                          }));
                        }}
                      >
                        <Plus size={16} aria-hidden />
                        {canAddDieuKien
                          ? "Thêm điều kiện"
                          : `Tối đa ${MAX_COMBO_DIEU_KIEN} dòng`}
                      </button>
                    </div>
                  </section>

                  <section className="shop-uu-dai-form-section">
                    <h4 className="shop-uu-dai-form-section-title">Mức giảm</h4>
                    <div
                      className="shop-uu-dai-loai-giam-toggle"
                      role="radiogroup"
                      aria-label="Loại giảm"
                    >
                      <button
                        type="button"
                        role="radio"
                        aria-checked={form.loaiGiam === "phan_tram"}
                        className={
                          form.loaiGiam === "phan_tram" ? "is-on" : undefined
                        }
                        onClick={() =>
                          setForm((p) => ({ ...p, loaiGiam: "phan_tram" }))
                        }
                      >
                        Phần trăm (%)
                      </button>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={form.loaiGiam === "so_tien"}
                        className={
                          form.loaiGiam === "so_tien" ? "is-on" : undefined
                        }
                        onClick={() =>
                          setForm((p) => ({ ...p, loaiGiam: "so_tien" }))
                        }
                      >
                        Số tiền (₫)
                      </button>
                    </div>
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
                              setForm((p) => ({
                                ...p,
                                giamToiDa: ev.target.value,
                              }))
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
                          setForm((p) => ({
                            ...p,
                            apDungLap: ev.target.checked,
                          }))
                        }
                      />
                      Áp dụng nhiều lần (VD: Mua 5 combo → giảm ×5)
                    </label>
                  </section>

                  <section className="shop-uu-dai-form-section">
                    <h4 className="shop-uu-dai-form-section-title">Thời gian</h4>
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
                  </section>
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
              return (
                <li
                  key={combo.id}
                  className={`shop-uu-dai-combo-item${
                    status === "Đang chạy" ? " is-live" : ""
                  }${!combo.kichHoat ? " is-off" : ""}`}
                >
                  <ShopComboCard combo={combo} status={status} />
                  <div className="shop-uu-dai-voucher-toolbar">
                    <div className="shop-uu-dai-voucher-toolbar-actions">
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
                        <Pencil size={16} aria-hidden />
                      </button>
                      <button
                        type="button"
                        className="shop-uu-dai-icon-btn is-danger"
                        onClick={() => void handleDelete(combo)}
                        aria-label="Xóa combo"
                      >
                        <Trash2 size={16} aria-hidden />
                      </button>
                    </div>
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
