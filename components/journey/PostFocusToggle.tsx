"use client";

import { Focus, Minimize2 } from "lucide-react";

type Props = {
  active: boolean;
  onToggle: () => void;
};

export function PostFocusToggle({ active, onToggle }: Props) {
  return (
    <button
      type="button"
      className={`post-focus-toggle${active ? " is-active" : ""}`}
      onClick={onToggle}
      aria-pressed={active}
      aria-label={
        active
          ? "Thoát chế độ tập trung"
          : "Bật chế độ tập trung — ẩn bình luận và thông tin phụ"
      }
      title={active ? "Thoát tập trung (Esc)" : "Tập trung đọc"}
    >
      {active ? (
        <Minimize2 size={18} strokeWidth={2} aria-hidden />
      ) : (
        <Focus size={18} strokeWidth={2} aria-hidden />
      )}
    </button>
  );
}
