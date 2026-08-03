"use client";

import { Plus, X } from "lucide-react";
import { Fragment, useMemo, useState } from "react";

import {
  emptyLichCaHocDraft,
  formatLichCaHoc,
  formatLichCaHocList,
  isLichCaHocSlotReady,
  parseLichCaHocList,
  THU_OPTIONS,
  type LichCaHocDraft,
} from "@/lib/to-chuc/lich-ca-hoc-form";

type Props = {
  value: string;
  onChange: (value: string) => void;
  idPrefix?: string;
};

type HeatRow = {
  key: string;
  time: string;
  start: string;
  end: string;
  /** day value → slot index (đầu tiên nếu trùng) */
  byDay: Map<number, number>;
};

function emitSlots(
  slots: LichCaHocDraft[],
  onChange: (value: string) => void,
) {
  onChange(formatLichCaHocList(slots) ?? "");
}

function formatTimeRange(slot: LichCaHocDraft): string {
  const start = slot.gioBatDau.trim();
  const end = slot.gioKetThuc.trim();
  if (start && end) return `${start}–${end}`;
  if (start) return `${start}–`;
  if (end) return `–${end}`;
  return slot.caLabel.trim() || "Ca";
}

function timeSortKey(slot: LichCaHocDraft): string {
  return `${slot.gioBatDau.trim() || "99:99"}|${slot.gioKetThuc.trim() || "99:99"}`;
}

function buildHeatRows(slots: LichCaHocDraft[]): HeatRow[] {
  const map = new Map<string, HeatRow>();
  slots.forEach((slot, index) => {
    const time = formatTimeRange(slot);
    const key = timeSortKey(slot);
    let row = map.get(key);
    if (!row) {
      row = {
        key,
        time,
        start: slot.gioBatDau.trim(),
        end: slot.gioKetThuc.trim(),
        byDay: new Map(),
      };
      map.set(key, row);
    }
    for (const day of slot.thu) {
      if (!row.byDay.has(day)) row.byDay.set(day, index);
    }
  });
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
}

function SlotEditor({
  draft,
  onChange,
  idPrefix,
}: {
  draft: LichCaHocDraft;
  onChange: (next: LichCaHocDraft) => void;
  idPrefix: string;
}) {
  function toggleThu(day: number) {
    const has = draft.thu.includes(day);
    onChange({
      ...draft,
      thu: has ? draft.thu.filter((d) => d !== day) : [...draft.thu, day],
    });
  }

  return (
    <div className="cso-kh-lich-ca-editor">
      <div className="cso-kh-lich-ca-row">
        <span className="cso-kh-lich-ca-k" id={`${idPrefix}-thu-label`}>
          Ngày học
        </span>
        <div
          className="cso-kh-lich-ca-thu"
          role="group"
          aria-labelledby={`${idPrefix}-thu-label`}
        >
          {THU_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`cso-kh-lich-ca-chip cso-kh-lich-ca-chip--thu${draft.thu.includes(opt.value) ? " on" : ""}`}
              aria-pressed={draft.thu.includes(opt.value)}
              onClick={() => toggleThu(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="cso-kh-lich-ca-row cso-kh-lich-ca-row--time">
        <span className="cso-kh-lich-ca-k">Giờ học</span>
        <div className="cso-kh-lich-ca-time">
          <input
            type="time"
            className="cso-kh-input cso-kh-lich-ca-time-input"
            value={draft.gioBatDau}
            onChange={(e) =>
              onChange({ ...draft, gioBatDau: e.target.value })
            }
            aria-label="Giờ bắt đầu"
          />
          <span className="cso-kh-lich-ca-time-sep" aria-hidden>
            —
          </span>
          <input
            type="time"
            className="cso-kh-input cso-kh-lich-ca-time-input"
            value={draft.gioKetThuc}
            onChange={(e) =>
              onChange({ ...draft, gioKetThuc: e.target.value })
            }
            aria-label="Giờ kết thúc"
          />
        </div>
      </div>
    </div>
  );
}

export function LichCaHocFields({
  value,
  onChange,
  idPrefix = "lich-ca",
}: Props) {
  const slots = parseLichCaHocList(value);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<LichCaHocDraft>(emptyLichCaHocDraft);
  const [editIndex, setEditIndex] = useState<number | null>(null);

  const heatRows = useMemo(() => buildHeatRows(slots), [slots]);

  function startAdd(preset?: { day?: number; start?: string; end?: string }) {
    setEditIndex(null);
    setDraft({
      ...emptyLichCaHocDraft(),
      thu: preset?.day != null ? [preset.day] : [],
      gioBatDau: preset?.start ?? "",
      gioKetThuc: preset?.end ?? "",
    });
    setAdding(true);
  }

  function startEdit(index: number) {
    const slot = slots[index];
    if (!slot) return;
    setAdding(false);
    setEditIndex(index);
    setDraft({ ...slot, thu: [...slot.thu] });
  }

  function cancelEditor() {
    setAdding(false);
    setEditIndex(null);
    setDraft(emptyLichCaHocDraft());
  }

  function commitEditor() {
    if (!isLichCaHocSlotReady(draft)) return;
    if (editIndex != null) {
      const next = slots.map((s, i) => (i === editIndex ? draft : s));
      emitSlots(next, onChange);
    } else {
      emitSlots([...slots, draft], onChange);
    }
    cancelEditor();
  }

  function removeSlot(index: number) {
    emitSlots(
      slots.filter((_, i) => i !== index),
      onChange,
    );
    if (editIndex === index) cancelEditor();
  }

  const editing = adding || editIndex != null;
  const canCommit = isLichCaHocSlotReady(draft);
  const hasSlotDays = slots.some((s) => s.thu.length > 0);

  return (
    <div className="cso-kh-lich-ca">
      {slots.length > 0 && hasSlotDays ? (
        <div
          className="cso-kh-lich-ca-heat"
          role="grid"
          aria-label="Lịch ca theo tuần"
        >
          <div className="cso-kh-lich-ca-heat-corner" aria-hidden />
          {THU_OPTIONS.map((opt) => (
            <div
              key={opt.value}
              className="cso-kh-lich-ca-heat-day"
              role="columnheader"
            >
              {opt.label}
            </div>
          ))}

          {heatRows.map((row) => (
            <Fragment key={row.key}>
              <div
                className="cso-kh-lich-ca-heat-time"
                role="rowheader"
                title={row.time}
              >
                <span className="cso-kh-lich-ca-heat-time-start">
                  {row.start || "—"}
                </span>
                {row.end ? (
                  <span className="cso-kh-lich-ca-heat-time-end">{row.end}</span>
                ) : null}
              </div>
              {THU_OPTIONS.map((opt) => {
                const slotIndex = row.byDay.get(opt.value);
                const filled = slotIndex != null;
                const isEditing = filled && editIndex === slotIndex;
                const slotLabel =
                  filled && slots[slotIndex]
                    ? (formatLichCaHoc(slots[slotIndex]!) ?? row.time)
                    : `${opt.label} · ${row.time}`;

                return (
                  <div
                    key={`${row.key}-${opt.value}`}
                    className="cso-kh-lich-ca-heat-cell-wrap"
                    role="gridcell"
                  >
                    {filled ? (
                      <button
                        type="button"
                        className={`cso-kh-lich-ca-heat-cell is-on${isEditing ? " is-editing" : ""}`}
                        onClick={() => startEdit(slotIndex)}
                        title={`${slotLabel} — bấm để sửa`}
                        aria-label={`Sửa ca: ${slotLabel}`}
                      />
                    ) : (
                      <button
                        type="button"
                        className="cso-kh-lich-ca-heat-cell"
                        onClick={() =>
                          startAdd({
                            day: opt.value,
                            start: row.start,
                            end: row.end,
                          })
                        }
                        title={`Thêm ca ${opt.label} ${row.time}`}
                        aria-label={`Thêm ca ${opt.label} ${row.time}`}
                      />
                    )}
                    {filled ? (
                      <button
                        type="button"
                        className="cso-kh-lich-ca-heat-remove"
                        onClick={() => removeSlot(slotIndex)}
                        aria-label={`Xóa ca: ${slotLabel}`}
                        title="Xóa ca"
                      >
                        <X size={10} strokeWidth={2.6} aria-hidden />
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </Fragment>
          ))}
        </div>
      ) : slots.length > 0 ? (
        <ul className="cso-kh-lich-ca-list" aria-label="Khung giờ đã thêm">
          {slots.map((slot, index) => {
            const label = formatLichCaHoc(slot) ?? "Ca học";
            const isEditing = editIndex === index;
            return (
              <li
                key={`${label}-${index}`}
                className={`cso-kh-lich-ca-item${isEditing ? " is-editing" : ""}`}
              >
                <button
                  type="button"
                  className="cso-kh-lich-ca-item-main"
                  onClick={() => startEdit(index)}
                  aria-label={`Sửa ca: ${label}`}
                >
                  <span className="cso-kh-lich-ca-item-label">{label}</span>
                </button>
                <button
                  type="button"
                  className="cso-kh-lich-ca-item-remove"
                  onClick={() => removeSlot(index)}
                  aria-label={`Xóa ca: ${label}`}
                >
                  <X size={14} strokeWidth={2.2} aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      ) : !editing ? (
        <p className="cso-kh-field-hint">
          Chưa có khung giờ. Thêm ca để hiện lưới T2–CN × giờ học.
        </p>
      ) : null}

      {editing ? (
        <div className="cso-kh-lich-ca-panel">
          <div className="cso-kh-lich-ca-panel-head">
            <span className="cso-kh-lich-ca-panel-title">
              {editIndex != null ? "Sửa ca học" : "Thêm ca học"}
            </span>
            <button
              type="button"
              className="cso-kh-lich-ca-panel-cancel"
              onClick={cancelEditor}
            >
              Huỷ
            </button>
          </div>
          <SlotEditor
            draft={draft}
            onChange={setDraft}
            idPrefix={`${idPrefix}-${editIndex ?? "new"}`}
          />
          <button
            type="button"
            className="cso-kh-lich-ca-commit"
            disabled={!canCommit}
            onClick={commitEditor}
          >
            {editIndex != null ? "Cập nhật ca" : "Lưu ca này"}
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="cso-kh-lich-ca-add"
          onClick={() => startAdd()}
        >
          <Plus size={15} strokeWidth={2.2} aria-hidden />
          Thêm ca
        </button>
      )}
    </div>
  );
}
