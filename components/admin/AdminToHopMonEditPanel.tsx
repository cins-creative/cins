"use client";

import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import {
  adminCreateToHopMon,
  adminSaveToHopMon,
} from "@/app/admin/actions";
import { AdminMonThiSlotPicker } from "@/components/admin/AdminMonThiSlotPicker";
import type { AdminMonThiRow } from "@/lib/admin/mon-thi-server";
import type { AdminToHopMonRow } from "@/lib/admin/to-hop-mon-server";

type Props = {
  row?: AdminToHopMonRow;
  monCatalog: AdminMonThiRow[];
  onCancel: () => void;
  onSaved: () => void;
};

export function AdminToHopMonEditPanel({
  row,
  monCatalog,
  onCancel,
  onSaved,
}: Props) {
  const isCreate = row == null;
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: "ok" | "err"; text: string } | null>(
    null,
  );
  const [ma_to_hop, setMaToHop] = useState(row?.ma_to_hop ?? "");
  const [ten_to_hop, setTenToHop] = useState(row?.ten_to_hop ?? "");
  const [mo_ta, setMoTa] = useState(row?.mo_ta ?? "");
  const [monIds, setMonIds] = useState<string[]>(() =>
    row?.chi_tiet
      .map((s) => s.id_mon_thi)
      .filter((x): x is string => Boolean(x)) ?? ["", "", ""],
  );

  useEffect(() => {
    if (!row) {
      setMaToHop("");
      setTenToHop("");
      setMoTa("");
      setMonIds(["", "", ""]);
      setSaveMsg(null);
      return;
    }
    setMaToHop(row.ma_to_hop);
    setTenToHop(row.ten_to_hop);
    setMoTa(row.mo_ta ?? "");
    setMonIds(
      row.chi_tiet
        .map((s) => s.id_mon_thi)
        .filter((x): x is string => Boolean(x)),
    );
    setSaveMsg(null);
  }, [row?.id, row?.ma_to_hop, row?.ten_to_hop, row?.mo_ta, row?.chi_tiet]);

  const monById = useMemo(() => {
    const map = new Map<string, AdminMonThiRow>();
    for (const m of monCatalog) map.set(m.id, m);
    return map;
  }, [monCatalog]);

  const activeMon = useMemo(
    () => monCatalog.filter((m) => m.trang_thai === "active"),
    [monCatalog],
  );

  const selectedMons = useMemo(
    () =>
      monIds
        .map((id) => (id ? monById.get(id) ?? null : null))
        .filter((m): m is AdminMonThiRow => m != null),
    [monIds, monById],
  );

  const liveFormula = useMemo(() => {
    const names = monIds
      .map((id) => (id ? monById.get(id)?.ten : null))
      .filter(Boolean) as string[];
    return names.length ? names.join(" · ") : "Chưa chọn môn";
  }, [monIds, monById]);

  function setMonAt(index: number, monId: string) {
    setMonIds((prev) => {
      const next = [...prev];
      next[index] = monId;
      return next;
    });
  }

  function addMonSlot() {
    setMonIds((prev) => [...prev, ""]);
  }

  function removeMonSlot(index: number) {
    setMonIds((prev) => prev.filter((_, i) => i !== index));
  }

  function moveMonSlot(index: number, dir: -1 | 1) {
    setMonIds((prev) => {
      const next = index + dir;
      if (next < 0 || next >= prev.length) return prev;
      const copy = [...prev];
      const tmp = copy[index]!;
      copy[index] = copy[next]!;
      copy[next] = tmp;
      return copy;
    });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveMsg(null);

    const fd = new FormData();
    fd.set("ma_to_hop", ma_to_hop);
    fd.set("ten_to_hop", ten_to_hop);
    fd.set("mo_ta", mo_ta);
    fd.set("mon_ids", monIds.filter(Boolean).join(","));

    if (isCreate) {
      const res = await adminCreateToHopMon(fd);
      if (!res.ok) {
        setSaveMsg({ type: "err", text: res.message ?? "Tạo khối thất bại." });
        setSaving(false);
        return;
      }
      setSaveMsg({ type: "ok", text: "Đã tạo khối thi." });
      setSaving(false);
      onSaved();
      return;
    }

    fd.set("id", row!.id);
    const res = await adminSaveToHopMon(fd);
    if (!res.ok) {
      setSaveMsg({ type: "err", text: res.message ?? "Lưu thất bại." });
      setSaving(false);
      return;
    }
    setSaveMsg({ type: "ok", text: "Đã lưu khối thi." });
    setSaving(false);
    onSaved();
  }

  return (
    <form className="admin-edit-form admin-khoi-edit" onSubmit={(e) => void onSubmit(e)}>
      {saveMsg ? (
        <p
          className={`admin-edit-form__msg admin-edit-form__msg--${saveMsg.type === "err" ? "err" : "ok"}`}
          role={saveMsg.type === "err" ? "alert" : "status"}
        >
          {saveMsg.text}
        </p>
      ) : null}

      <div className="admin-khoi-edit-hero">
        <div className="admin-khoi-edit-hero-main">
          <span className="admin-khoi-edit-ma">{ma_to_hop.trim() || "A??"}</span>
          <div className="admin-khoi-edit-hero-text">
            <p className="admin-khoi-edit-formula">
              <span className="admin-khoi-edit-formula-eq">=</span>
              {liveFormula}
            </p>
            <p className="admin-khoi-edit-meta">
              {monIds.filter(Boolean).length} môn · thứ tự = slot tính điểm
            </p>
          </div>
        </div>
        {row && row.usage_khoi > 0 ? (
          <span className="admin-pill admin-pill--ok admin-khoi-edit-usage">
            {row.usage_khoi} trường
          </span>
        ) : null}
      </div>

      <div className="admin-edit-form__fields">
        <section className="admin-khoi-edit-sec">
          <h3 className="admin-khoi-edit-sec-title">Thông tin khối</h3>
          <div className="admin-khoi-edit-id-row">
            <div className="form-group">
              <label className="form-label" htmlFor="khoi-ma">
                Mã khối *
              </label>
              <input
                id="khoi-ma"
                className="form-input admin-khoi-edit-ma-input"
                type="text"
                value={ma_to_hop}
                onChange={(e) => setMaToHop(e.target.value.toUpperCase())}
                placeholder="A00"
                required
                maxLength={8}
              />
            </div>
            <div className="form-group admin-khoi-edit-grow">
              <label className="form-label" htmlFor="khoi-ten">
                Tên khối *
              </label>
              <input
                id="khoi-ten"
                className="form-input"
                type="text"
                value={ten_to_hop}
                onChange={(e) => setTenToHop(e.target.value)}
                placeholder="Khối A00 — Toán, Lý, Hóa"
                required
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="khoi-mota">
              Mô tả
            </label>
            <textarea
              id="khoi-mota"
              className="form-input"
              rows={2}
              value={mo_ta}
              onChange={(e) => setMoTa(e.target.value)}
              placeholder="Ghi chú ngắn (tuỳ chọn)…"
            />
          </div>
          {row ? (
            <p className="admin-khoi-edit-uuid">
              <code>{row.id}</code>
            </p>
          ) : null}
        </section>

        <section className="admin-khoi-edit-sec">
          <div className="admin-khoi-edit-sec-head">
            <div>
              <h3 className="admin-khoi-edit-sec-title">Tổ hợp môn</h3>
              <p className="form-hint admin-khoi-edit-sec-hint">
                Mỗi dòng = 1 slot · thứ tự quyết định công thức tính điểm.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm admin-khoi-add-slot"
              onClick={addMonSlot}
            >
              <Plus size={14} aria-hidden />
              Thêm môn
            </button>
          </div>

          {monIds.length === 0 ? (
            <div className="admin-khoi-slots-empty">
              <p>Chưa có môn trong khối.</p>
              <button type="button" className="btn btn-primary btn-sm" onClick={addMonSlot}>
                Thêm môn đầu tiên
              </button>
            </div>
          ) : (
            <ul className="admin-khoi-slots">
              {monIds.map((monId, index) => (
                  <li key={`slot-${index}`} className="admin-khoi-slot-card">
                    <span className="admin-khoi-slot-num">{index + 1}</span>
                    <div className="admin-khoi-slot-body">
                      <AdminMonThiSlotPicker
                        id={`khoi-mon-${index}`}
                        value={monId}
                        onChange={(id) => setMonAt(index, id)}
                        options={activeMon}
                        excludeIds={monIds.filter(
                          (id, i) => i !== index && Boolean(id),
                        )}
                        required
                      />
                    </div>
                    <div className="admin-khoi-slot-actions">
                      <button
                        type="button"
                        className="admin-khoi-slot-move"
                        disabled={index === 0}
                        aria-label={`Đưa môn ${index + 1} lên`}
                        onClick={() => moveMonSlot(index, -1)}
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        type="button"
                        className="admin-khoi-slot-move"
                        disabled={index === monIds.length - 1}
                        aria-label={`Đưa môn ${index + 1} xuống`}
                        onClick={() => moveMonSlot(index, 1)}
                      >
                        <ChevronDown size={14} />
                      </button>
                      <button
                        type="button"
                        className="admin-khoi-slot-remove"
                        aria-label={`Xóa slot ${index + 1}`}
                        onClick={() => removeMonSlot(index)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </li>
              ))}
            </ul>
          )}

          {selectedMons.length > 0 ? (
            <div className="admin-khoi-preview-chips" aria-label="Xem trước tổ hợp">
              {selectedMons.map((m) => (
                <span key={m.id} className="admin-khoi-preview-chip">
                  {m.ten}
                </span>
              ))}
            </div>
          ) : null}
        </section>
      </div>

      <div className="admin-edit-form__footer">
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={saving}>
          Hủy
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Đang lưu…" : isCreate ? "Tạo khối thi" : "Lưu khối thi"}
        </button>
      </div>
    </form>
  );
}
