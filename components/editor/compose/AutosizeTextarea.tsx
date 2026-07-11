"use client";

import {
  useCallback,
  useEffect,
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

  useEffect(() => {
    resize();
  }, [value, resize]);

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
