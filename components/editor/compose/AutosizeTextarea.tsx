"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";

export function AutosizeTextarea({
  className,
  value,
  onChange,
  placeholder,
  maxRows,
  rows = 1,
}: {
  className?: string;
  value: string;
  onChange: (s: string) => void;
  placeholder?: string;
  maxRows?: number;
  rows?: number;
}) {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  const resize = useCallback(() => {
    const ta = ref.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${ta.scrollHeight + 2}px`;
  }, []);

  // Đo trước khi vẽ để tránh nháy 1 dòng rồi mới giãn ra.
  useLayoutEffect(() => {
    resize();
  }, [value, resize]);

  // Đo lại khi web-font tải xong (font thật cao hơn fallback → tránh cắt chữ)
  // và khi bề rộng textarea đổi (mở overlay, xoay màn hình, wrap dòng lại).
  useEffect(() => {
    const ta = ref.current;
    if (!ta) return;

    if (typeof document !== "undefined" && document.fonts?.ready) {
      document.fonts.ready.then(() => resize()).catch(() => {});
    }

    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver !== "undefined") {
      // Chỉ đo lại khi BỀ RỘNG đổi; bỏ qua thay đổi chiều cao do chính ta gây ra
      // để tránh vòng lặp ResizeObserver.
      let lastWidth = ta.clientWidth;
      ro = new ResizeObserver(() => {
        const w = ta.clientWidth;
        if (w !== lastWidth) {
          lastWidth = w;
          resize();
        }
      });
      ro.observe(ta);
    } else {
      window.addEventListener("resize", resize);
    }
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, [resize]);

  const onChangeRaw = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
    },
    [onChange],
  );

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (maxRows && e.key === "Enter") {
        const ta = e.currentTarget;
        const lines = ta.value.split("\n").length;
        if (lines >= maxRows) e.preventDefault();
      }
    },
    [maxRows],
  );

  return (
    <textarea
      ref={ref}
      className={className}
      value={value}
      onChange={onChangeRaw}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      rows={rows}
    />
  );
}
