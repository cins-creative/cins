"use client";

import type { ComposePickerEntry } from "@/lib/article/compose/types";

type Props<T extends string> = {
  catalog: ComposePickerEntry[];
  onPick: (t: T) => void;
  style?: React.CSSProperties;
  pickerRef?: React.RefObject<HTMLDivElement | null>;
};

export function BlockInsertPicker<T extends string>({
  catalog,
  onPick,
  style,
  pickerRef,
}: Props<T>) {
  return (
    <div
      ref={pickerRef}
      className="picker"
      onClick={(e) => e.stopPropagation()}
      role="menu"
      style={style}
    >
      <div className="picker-lbl">Chèn block</div>
      <div className="picker-grid">
        {catalog.map((b) => (
          <button
            key={b.t}
            type="button"
            className="pick"
            aria-label={b.desc ? `${b.name} — ${b.desc}` : b.name}
            onClick={() => onPick(b.t as T)}
          >
            <span className="pic-ic" aria-hidden>
              {b.ico}
            </span>
            <span className="pic-t">{b.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
