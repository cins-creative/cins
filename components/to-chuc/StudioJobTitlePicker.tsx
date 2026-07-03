"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import type { StudioNgheOption } from "@/lib/to-chuc/studio-tuyen-dung-types";

const MAX_OPTIONS = 20;
const LIST_MAX_H = 280;

/** Bỏ dấu tiếng Việt + thường hóa để tìm khoan dung hơn. */
function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
}

function matches(option: StudioNgheOption, query: string): boolean {
  const q = normalizeText(query.trim());
  if (!q) return true;
  const haystack = normalizeText(
    [option.roleShort, option.roleEng, option.linhVucTen, option.tieuDe]
      .filter(Boolean)
      .join(" "),
  );
  return q.split(/\s+/).every((token) => haystack.includes(token));
}

type Props = {
  /** Tiêu đề (text tự do). */
  value: string;
  /** Gõ text tự do — tạo vị trí mới. */
  onChangeText: (next: string) => void;
  /** Chọn một nghề có sẵn trong hệ thống. */
  onSelectNghe: (option: StudioNgheOption) => void;
  options: StudioNgheOption[];
  placeholder?: string;
  inputId?: string;
};

/** Ô tiêu đề vị trí: chọn nghề có sẵn (autocomplete) hoặc gõ vị trí mới. */
export function StudioJobTitlePicker({
  value,
  onChangeText,
  onSelectNghe,
  options,
  placeholder = "VD: 2D Animator (Junior)",
  inputId,
}: Props) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [tipPos, setTipPos] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const filtered = useMemo(
    () => options.filter((opt) => matches(opt, value)).slice(0, MAX_OPTIONS),
    [options, value],
  );

  const updateTipPos = useCallback(() => {
    const node = inputRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    setTipPos({ top: rect.bottom + 6, left: rect.left, width: rect.width });
  }, []);

  const closeList = useCallback(() => {
    setOpen(false);
    setActiveIndex(0);
    setTipPos(null);
  }, []);

  const selectOption = useCallback(
    (option: StudioNgheOption) => {
      onSelectNghe(option);
      closeList();
      inputRef.current?.blur();
    },
    [closeList, onSelectNghe],
  );

  useEffect(() => {
    if (!open) return;
    const onDocDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      const portal = document.getElementById(listId);
      if (portal?.contains(target)) return;
      closeList();
    };
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, [closeList, listId, open]);

  useEffect(() => {
    if (!open) return;
    const onReflow = () => updateTipPos();
    window.addEventListener("resize", onReflow);
    window.addEventListener("scroll", onReflow, true);
    return () => {
      window.removeEventListener("resize", onReflow);
      window.removeEventListener("scroll", onReflow, true);
    };
  }, [open, updateTipPos]);

  useEffect(() => {
    if (activeIndex >= filtered.length) {
      setActiveIndex(Math.max(0, filtered.length - 1));
    }
  }, [activeIndex, filtered.length]);

  const showList = open && filtered.length > 0 && tipPos;

  return (
    <div ref={rootRef} className="studio-job-nghe-wrap">
      <input
        ref={inputRef}
        id={inputId}
        type="text"
        className="studio-job-input"
        value={value}
        maxLength={200}
        onChange={(e) => {
          onChangeText(e.target.value);
          setOpen(true);
          setActiveIndex(0);
          requestAnimationFrame(updateTipPos);
        }}
        onFocus={() => {
          setOpen(true);
          requestAnimationFrame(updateTipPos);
        }}
        onKeyDown={(event) => {
          if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
            setOpen(true);
            requestAnimationFrame(updateTipPos);
            return;
          }
          if (event.key === "Escape") {
            closeList();
            return;
          }
          if (!filtered.length) return;
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActiveIndex((i) => Math.max(i - 1, 0));
          } else if (event.key === "Enter" && open) {
            event.preventDefault();
            const picked = filtered[activeIndex];
            if (picked) selectOption(picked);
          }
        }}
        placeholder={placeholder}
        aria-label="Tiêu đề vị trí — chọn nghề có sẵn hoặc gõ mới"
        aria-expanded={open}
        aria-controls={showList ? listId : undefined}
        aria-autocomplete="list"
        role="combobox"
      />
      {showList && typeof document !== "undefined"
        ? createPortal(
            <ul
              id={listId}
              className="studio-job-nghe-list"
              role="listbox"
              style={{
                top: tipPos.top,
                left: tipPos.left,
                width: tipPos.width,
                maxHeight: LIST_MAX_H,
              }}
            >
              {filtered.map((option, index) => (
                <li key={option.id} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={index === activeIndex}
                    className={
                      "studio-job-nghe-option" +
                      (index === activeIndex ? " is-active" : "")
                    }
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectOption(option)}
                    onMouseEnter={() => setActiveIndex(index)}
                  >
                    <span className="studio-job-nghe-option-main">
                      {option.linhVucTen ? (
                        <span className="studio-job-nghe-option-lv">
                          {option.linhVucTen}
                        </span>
                      ) : null}
                      <span className="studio-job-nghe-option-title">
                        {option.roleShort}
                      </span>
                      {option.roleEng ? (
                        <span className="studio-job-nghe-option-eng">
                          {option.roleEng}
                        </span>
                      ) : null}
                    </span>
                    {option.tieuDe !== option.roleShort ? (
                      <span className="studio-job-nghe-option-sub">
                        {option.tieuDe}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>,
            document.body,
          )
        : null}
    </div>
  );
}
