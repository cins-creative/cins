"use client";

import { useWorldBoostAdminOptional } from "@/components/cins/world-journey/WorldBoostAdminContext";
import type { WorldBoostLoai } from "@/lib/cins/world-boost-client";

type Props = {
  loai: WorldBoostLoai;
  id: string;
  className?: string;
  /** Compact corner mark for gallery tiles. */
  compact?: boolean;
};

/** Toggle đẩy World — chỉ hiện khi admin trong `WorldBoostAdminProvider`. */
export function WorldBoostToggle({ loai, id, className, compact }: Props) {
  const ctx = useWorldBoostAdminOptional();
  if (!ctx?.canBoost || !id) return null;

  const on = ctx.isBoosted(loai, id);
  return (
    <button
      type="button"
      className={[
        "wj-boost-toggle",
        on ? "is-on" : "",
        compact ? "is-compact" : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-pressed={on}
      aria-label={on ? "Đang đẩy lên World — bấm để tắt" : "Đẩy lên World"}
      title={on ? "Đang đẩy · bấm để tắt" : "Đẩy lên World"}
      disabled={ctx.pending}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        ctx.toggle(loai, id, !on);
      }}
    >
      <span className="wj-boost-toggle-dot" aria-hidden />
      {compact ? null : <span>{on ? "Đang đẩy" : "Đẩy World"}</span>}
    </button>
  );
}
