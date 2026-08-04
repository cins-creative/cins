"use client";

import { Plus, X } from "lucide-react";
import {
  forwardRef,
  useImperativeHandle,
  useState,
} from "react";

import {
  commitTime24h,
  emptyLichCaHocDraft,
  formatLichCaHoc,
  formatLichCaHocList,
  formatTime24hTyping,
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

export type LichCaHocFieldsHandle = {
  /** Commit draft đang mở (nếu đủ dữ liệu) trước khi submit form. */
  flushPending: () => string;
};

function emitSlots(
  slots: LichCaHocDraft[],
  onChange: (value: string) => void,
) {
  onChange(formatLichCaHocList(slots) ?? "");
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
            type="text"
            inputMode="numeric"
            placeholder="08:00"
            autoComplete="off"
            maxLength={5}
            className="cso-kh-input cso-kh-lich-ca-time-input"
            value={draft.gioBatDau}
            onChange={(e) =>
              onChange({
                ...draft,
                gioBatDau: formatTime24hTyping(e.target.value),
              })
            }
            onBlur={() =>
              onChange({
                ...draft,
                gioBatDau: commitTime24h(draft.gioBatDau),
              })
            }
            aria-label="Giờ bắt đầu (24 giờ)"
          />
          <span className="cso-kh-lich-ca-time-sep" aria-hidden>
            —
          </span>
          <input
            type="text"
            inputMode="numeric"
            placeholder="10:00"
            autoComplete="off"
            maxLength={5}
            className="cso-kh-input cso-kh-lich-ca-time-input"
            value={draft.gioKetThuc}
            onChange={(e) =>
              onChange({
                ...draft,
                gioKetThuc: formatTime24hTyping(e.target.value),
              })
            }
            onBlur={() =>
              onChange({
                ...draft,
                gioKetThuc: commitTime24h(draft.gioKetThuc),
              })
            }
            aria-label="Giờ kết thúc (24 giờ)"
          />
        </div>
      </div>
    </div>
  );
}

export const LichCaHocFields = forwardRef<LichCaHocFieldsHandle, Props>(
  function LichCaHocFields(
    { value, onChange, idPrefix = "lich-ca" },
    ref,
  ) {
    const slots = parseLichCaHocList(value);
    const [adding, setAdding] = useState(false);
    const [draft, setDraft] = useState<LichCaHocDraft>(emptyLichCaHocDraft);
    const [editIndex, setEditIndex] = useState<number | null>(null);

    function startAdd() {
      setEditIndex(null);
      setDraft(emptyLichCaHocDraft());
      setAdding(true);
    }

    function startEdit(index: number) {
      const slot = slots[index];
      if (!slot) return;
      setAdding(false);
      setEditIndex(index);
      setDraft({ ...slot, thu: [...slot.thu] });
    }

    function closeEditor() {
      setAdding(false);
      setEditIndex(null);
      setDraft(emptyLichCaHocDraft());
    }

    /** Ghi draft vào danh sách ngay khi đủ ngày/giờ — không cần nút «Cập nhật ca». */
    function syncDraft(nextDraft: LichCaHocDraft) {
      setDraft(nextDraft);
      if (!isLichCaHocSlotReady(nextDraft)) return;

      if (editIndex != null) {
        emitSlots(
          slots.map((s, i) => (i === editIndex ? nextDraft : s)),
          onChange,
        );
        return;
      }

      if (adding) {
        const next = [...slots, nextDraft];
        emitSlots(next, onChange);
        setAdding(false);
        setEditIndex(next.length - 1);
      }
    }

    function removeSlot(index: number) {
      emitSlots(
        slots.filter((_, i) => i !== index),
        onChange,
      );
      if (editIndex === index) closeEditor();
      else if (editIndex != null && editIndex > index) {
        setEditIndex(editIndex - 1);
      }
    }

    useImperativeHandle(ref, () => ({
      flushPending() {
        const editingOpen = adding || editIndex != null;
        if (!editingOpen || !isLichCaHocSlotReady(draft)) {
          return value.trim();
        }
        const nextSlots =
          editIndex != null
            ? slots.map((s, i) => (i === editIndex ? draft : s))
            : [...slots, draft];
        const next = formatLichCaHocList(nextSlots) ?? "";
        onChange(next);
        closeEditor();
        return next;
      },
    }));

    const editing = adding || editIndex != null;

    return (
      <div className="cso-kh-lich-ca">
        {slots.length > 0 ? (
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
            Chưa có khung giờ. Bấm «Thêm ca» để chọn ngày và giờ học.
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
                onClick={closeEditor}
              >
                Xong
              </button>
            </div>
            <SlotEditor
              draft={draft}
              onChange={syncDraft}
              idPrefix={`${idPrefix}-${editIndex ?? "new"}`}
            />
          </div>
        ) : (
          <button
            type="button"
            className="cso-kh-lich-ca-add"
            onClick={startAdd}
          >
            <Plus size={15} strokeWidth={2.2} aria-hidden />
            Thêm ca
          </button>
        )}
      </div>
    );
  },
);
