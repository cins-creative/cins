"use client";

import { Plus } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import type { CoAuthorNgheRoleOption } from "@/lib/editor/coauthor-role-types";

const MAX_OPTIONS = 20;
const LIST_MAX_H = 280;

/** Bỏ dấu tiếng Việt + thường hóa để tìm kiếm khoan dung hơn. */
function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
}

function matchesRoleOption(option: CoAuthorNgheRoleOption, query: string): boolean {
  const q = normalizeText(query.trim());
  if (!q) return true;
  const haystack = normalizeText(
    [
      option.roleLabel,
      option.roleShort,
      option.roleEng,
      option.linhVucTen,
      option.tieuDe,
    ]
      .filter(Boolean)
      .join(" "),
  );
  // Mỗi từ khóa (cách nhau bởi khoảng trắng) phải khớp ở đâu đó.
  return q.split(/\s+/).every((token) => haystack.includes(token));
}

type Props = {
  value: string;
  onChange: (next: string) => void;
  options: CoAuthorNgheRoleOption[];
  ariaLabel: string;
  placeholder?: string;
  /**
   * Khi user chọn 1 option. Nếu truyền, dùng thay cho `onChange(label)` lúc chọn
   * (để caller tự xử lý — vd. gom nhiều vị trí). `onChange` vẫn dùng cho gõ text.
   */
  onSelect?: (option: CoAuthorNgheRoleOption) => void;
  /**
   * Cho phép thêm vai trò tự nhập (không có trong danh sách). Khi truyền, dropdown
   * hiện mục "Thêm vai trò mới: …" nếu từ khóa chưa khớp option nào sẵn có.
   */
  onAddCustom?: (label: string) => void;
};

export function CoAuthorRoleInput({
  value,
  onChange,
  options,
  ariaLabel,
  placeholder = "Tìm vị trí công việc",
  onSelect,
  onAddCustom,
}: Props) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [tipPos, setTipPos] = useState<{ top: number; left: number; width: number } | null>(
    null,
  );

  const filtered = useMemo(
    () => options.filter((opt) => matchesRoleOption(opt, value)).slice(0, MAX_OPTIONS),
    [options, value],
  );

  const trimmedValue = value.trim();
  const hasExactMatch = useMemo(() => {
    const q = normalizeText(trimmedValue);
    if (!q) return false;
    return options.some(
      (opt) =>
        normalizeText(opt.roleLabel) === q || normalizeText(opt.roleShort) === q,
    );
  }, [options, trimmedValue]);
  const canAddCustom =
    Boolean(onAddCustom) && trimmedValue.length > 0 && !hasExactMatch;
  const totalItems = filtered.length + (canAddCustom ? 1 : 0);
  const addIndex = canAddCustom ? filtered.length : -1;

  const updateTipPos = useCallback(() => {
    const node = inputRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const gutter = 12;
    const maxW = Math.max(160, window.innerWidth - gutter * 2);
    const width = Math.min(Math.max(rect.width, 280), maxW);
    const left = Math.min(
      Math.max(gutter, rect.left),
      window.innerWidth - gutter - width,
    );
    setTipPos({
      top: rect.bottom + 6,
      left,
      width,
    });
  }, []);

  const closeList = useCallback(() => {
    setOpen(false);
    setActiveIndex(0);
    setTipPos(null);
  }, []);

  const selectOption = useCallback(
    (option: CoAuthorNgheRoleOption) => {
      if (onSelect) {
        onSelect(option);
      } else {
        onChange(option.roleLabel);
      }
      closeList();
      inputRef.current?.blur();
    },
    [closeList, onChange, onSelect],
  );

  const addCustom = useCallback(() => {
    const next = value.trim();
    if (!next || !onAddCustom) return;
    onAddCustom(next);
    closeList();
    inputRef.current?.blur();
  }, [value, onAddCustom, closeList]);

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
    if (activeIndex >= totalItems) {
      setActiveIndex(Math.max(0, totalItems - 1));
    }
  }, [activeIndex, totalItems]);

  const showList = open && totalItems > 0 && tipPos;

  return (
    <div ref={rootRef} className="ed-coauthor-role-wrap">
      <input
        ref={inputRef}
        type="text"
        className="ed-coauthor-chip-role ed-coauthor-role-input"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
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
          if (!totalItems) return;
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActiveIndex((i) => Math.min(i + 1, totalItems - 1));
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActiveIndex((i) => Math.max(i - 1, 0));
          } else if (event.key === "Enter" && open) {
            event.preventDefault();
            if (canAddCustom && activeIndex === addIndex) {
              addCustom();
              return;
            }
            const picked = filtered[activeIndex];
            if (picked) selectOption(picked);
          }
        }}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={showList ? listId : undefined}
        aria-autocomplete="list"
        role="combobox"
      />
      {showList && typeof document !== "undefined"
        ? createPortal(
            <ul
              id={listId}
              className="ed-coauthor-role-list"
              role="listbox"
              style={{
                top: tipPos.top,
                left: tipPos.left,
                width: tipPos.width,
                maxHeight: LIST_MAX_H,
              }}
            >
              {filtered.map((option, index) => (
                <li key={option.slug} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={index === activeIndex}
                    className={
                      "ed-coauthor-role-option" +
                      (index === activeIndex ? " is-active" : "")
                    }
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectOption(option)}
                    onMouseEnter={() => setActiveIndex(index)}
                  >
                    {option.linhVucTen ? (
                      <span className="ed-coauthor-role-option-lv">
                        {option.linhVucTen}
                      </span>
                    ) : null}
                    <span className="ed-coauthor-role-option-body">
                      <span className="ed-coauthor-role-option-title">
                        {option.roleShort}
                      </span>
                      {option.roleEng ? (
                        <span className="ed-coauthor-role-option-eng">
                          {option.roleEng}
                        </span>
                      ) : null}
                    </span>
                    {option.tieuDe !== option.roleShort ? (
                      <span className="ed-coauthor-role-option-sub">
                        {option.tieuDe}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
              {canAddCustom ? (
                <li role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={addIndex === activeIndex}
                    className={
                      "ed-coauthor-role-option ed-coauthor-role-add-new" +
                      (addIndex === activeIndex ? " is-active" : "")
                    }
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={addCustom}
                    onMouseEnter={() => setActiveIndex(addIndex)}
                  >
                    <span className="ed-coauthor-role-add-new-ico" aria-hidden>
                      <Plus size={16} strokeWidth={2.4} />
                    </span>
                    <span className="ed-coauthor-role-add-new-text">
                      Thêm vai trò mới:{" "}
                      <strong>“{trimmedValue}”</strong>
                    </span>
                  </button>
                </li>
              ) : null}
            </ul>,
            document.body,
          )
        : null}
    </div>
  );
}
