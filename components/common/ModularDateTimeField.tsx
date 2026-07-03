"use client";

import { Clock, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";

import styles from "./ModularDateTimeField.module.css";

/**
 * Giá trị của một mốc thời gian "theo module":
 * - `start` / `end`: chuỗi cho input (`YYYY-MM-DD` khi chỉ có ngày,
 *   `YYYY-MM-DDTHH:mm` khi có kèm giờ). `end` rỗng = chưa có ngày kết thúc.
 * - `withTime`: user có bật "thêm giờ cụ thể" hay không.
 */
export type ModularWhen = {
  start: string;
  end: string;
  withTime: boolean;
};

export const emptyModularWhen = (): ModularWhen => ({
  start: "",
  end: "",
  withTime: false,
});

function hasTimePart(v: string): boolean {
  return /T\d{2}:\d{2}/.test(v);
}

function toDateOnly(v: string): string {
  return v ? v.slice(0, 10) : "";
}

function toDateTime(v: string): string {
  if (!v) return "";
  return hasTimePart(v) ? v.slice(0, 16) : `${v.slice(0, 10)}T00:00`;
}

/** Chuỗi input (ngày hoặc ngày+giờ) → ISO UTC theo giờ trình duyệt. */
export function localDateToIso(v: string | null | undefined): string | null {
  const raw = v?.trim();
  if (!raw) return null;
  const norm = hasTimePart(raw) ? raw : `${raw.slice(0, 10)}T00:00`;
  const d = new Date(norm);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** ISO UTC → chuỗi `datetime-local` "YYYY-MM-DDTHH:mm" (giờ trình duyệt). */
export function isoToLocalDateTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
    d.getDate(),
  )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Dựng `ModularWhen` từ 2 ISO khi mở form ở chế độ sửa. */
export function isoRangeToModularWhen(
  startIso: string | null | undefined,
  endIso: string | null | undefined,
): ModularWhen {
  const start = isoToLocalDateTime(startIso);
  const end = isoToLocalDateTime(endIso);
  const startHasTime = Boolean(start) && start.slice(11) !== "00:00";
  const endHasTime = Boolean(end) && end.slice(11) !== "00:00";
  const withTime = startHasTime || endHasTime;
  return {
    start: withTime ? start : toDateOnly(start),
    end: withTime ? end : toDateOnly(end),
    withTime,
  };
}

type Props = {
  value: ModularWhen;
  onChange: (next: ModularWhen) => void;
  startLabel?: string;
  endLabel?: string;
  startRequired?: boolean;
  /** Cho phép nút "thêm ngày kết thúc". */
  allowEnd?: boolean;
  /** Luôn hiện ô kết thúc & bắt buộc (mốc dạng khoảng thời gian). */
  endRequired?: boolean;
  timeToggleLabel?: string;
  addEndLabel?: string;
  removeEndLabel?: string;
  /** Class cho `<label>` bao mỗi ô (kế thừa style của modal). */
  fieldClassName?: string;
  /** Class cho `<span>` nhãn (kế thừa style của modal). */
  labelClassName?: string;
  /** Class cho `<input>` (kế thừa style của modal). */
  inputClassName?: string;
};

export function ModularDateTimeField({
  value,
  onChange,
  startLabel = "Bắt đầu",
  endLabel = "Kết thúc",
  startRequired = true,
  allowEnd = true,
  endRequired = false,
  timeToggleLabel = "Thêm giờ cụ thể",
  addEndLabel = "Thêm ngày kết thúc",
  removeEndLabel = "Bỏ ngày kết thúc",
  fieldClassName,
  labelClassName,
  inputClassName,
}: Props) {
  const [endOpen, setEndOpen] = useState(endRequired || Boolean(value.end));

  useEffect(() => {
    if (value.end) setEndOpen(true);
    else if (!value.start && !value.end) setEndOpen(endRequired);
  }, [value.start, value.end, endRequired]);

  const showEnd = endRequired || endOpen;
  const inputType = value.withTime ? "datetime-local" : "date";
  const toInput = (v: string) =>
    value.withTime ? toDateTime(v) : toDateOnly(v);

  function toggleTime(next: boolean) {
    const conv = next ? toDateTime : toDateOnly;
    onChange({
      start: conv(value.start),
      end: conv(value.end),
      withTime: next,
    });
  }

  function openEnd() {
    setEndOpen(true);
  }

  function removeEnd() {
    setEndOpen(false);
    onChange({ ...value, end: "" });
  }

  return (
    <div className={styles.field}>
      <div
        className={`${styles.dates} ${showEnd ? styles.datesRange : styles.datesSingle}`}
      >
        <label className={fieldClassName}>
          <span className={labelClassName}>{startLabel}</span>
          <input
            type={inputType}
            className={inputClassName}
            value={toInput(value.start)}
            onChange={(e) => onChange({ ...value, start: e.target.value })}
            required={startRequired}
          />
        </label>
        {showEnd ? (
          <label className={fieldClassName}>
            <span className={labelClassName}>{endLabel}</span>
            <input
              type={inputType}
              className={inputClassName}
              value={toInput(value.end)}
              min={value.start ? toInput(value.start) : undefined}
              onChange={(e) => onChange({ ...value, end: e.target.value })}
              required={endRequired}
            />
          </label>
        ) : null}
      </div>
      <div className={styles.toggles}>
        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={value.withTime}
            onChange={(e) => toggleTime(e.target.checked)}
          />
          <Clock size={13} strokeWidth={2} aria-hidden />
          <span>{timeToggleLabel}</span>
        </label>
        {allowEnd && !endRequired ? (
          showEnd ? (
            <button
              type="button"
              className={styles.toggleBtn}
              onClick={removeEnd}
            >
              <X size={13} strokeWidth={2.2} aria-hidden />
              {removeEndLabel}
            </button>
          ) : (
            <button
              type="button"
              className={styles.toggleBtn}
              onClick={openEnd}
            >
              <Plus size={13} strokeWidth={2.2} aria-hidden />
              {addEndLabel}
            </button>
          )
        ) : null}
      </div>
    </div>
  );
}
