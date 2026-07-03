"use client";

import { Check, ChevronDown } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

export type StudioSelectOption = {
  value: string;
  label: string;
  icon?: ReactNode;
};

type BaseProps = {
  options: StudioSelectOption[];
  placeholder?: string;
  ariaLabel?: string;
  id?: string;
};

type SingleProps = BaseProps & {
  multiple?: false;
  value: string;
  onChange: (value: string) => void;
};

type MultiProps = BaseProps & {
  multiple: true;
  values: string[];
  onChange: (values: string[]) => void;
};

type Props = SingleProps | MultiProps;

const PANEL_MAX_H = 300;

/**
 * Dropdown có icon cho từng option. Hỗ trợ chọn 1 (single) hoặc nhiều
 * (multiple). Panel render qua portal + fixed position để không bị clip bởi
 * modal có `overflow: auto`.
 */
export function StudioIconSelect(props: Props) {
  const { options, placeholder = "— Chưa chọn —", ariaLabel, id } = props;
  const isMulti = props.multiple === true;
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const selectedValues = isMulti
    ? (props as MultiProps).values
    : (props as SingleProps).value
      ? [(props as SingleProps).value]
      : [];
  const selectedSet = new Set(selectedValues);
  const selectedOptions = options.filter((o) => selectedSet.has(o.value));

  const updatePos = useCallback(() => {
    const node = triggerRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    setPos({ top: rect.bottom + 6, left: rect.left, width: rect.width });
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setPos(null);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDocDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (document.getElementById(listId)?.contains(target)) return;
      close();
    };
    const onReflow = () => updatePos();
    document.addEventListener("mousedown", onDocDown);
    window.addEventListener("resize", onReflow);
    window.addEventListener("scroll", onReflow, true);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      window.removeEventListener("resize", onReflow);
      window.removeEventListener("scroll", onReflow, true);
    };
  }, [open, close, listId, updatePos]);

  function handlePick(value: string) {
    if (isMulti) {
      const current = (props as MultiProps).values;
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      (props as MultiProps).onChange(next);
    } else {
      (props as SingleProps).onChange(value);
      close();
    }
  }

  function toggleOpen() {
    if (open) {
      close();
    } else {
      setOpen(true);
      requestAnimationFrame(updatePos);
    }
  }

  return (
    <div ref={rootRef} className="studio-iselect">
      <button
        ref={triggerRef}
        type="button"
        id={id}
        className={`studio-iselect-trigger${open ? " is-open" : ""}`}
        onClick={toggleOpen}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
      >
        <span className="studio-iselect-value">
          {selectedOptions.length === 0 ? (
            <span className="studio-iselect-placeholder">{placeholder}</span>
          ) : isMulti ? (
            <span className="studio-iselect-tags">
              {selectedOptions.map((o) => (
                <span key={o.value} className="studio-iselect-tag">
                  {o.icon ? (
                    <span className="studio-iselect-tag-ic" aria-hidden>
                      {o.icon}
                    </span>
                  ) : null}
                  {o.label}
                </span>
              ))}
            </span>
          ) : (
            <span className="studio-iselect-single">
              {selectedOptions[0].icon ? (
                <span className="studio-iselect-single-ic" aria-hidden>
                  {selectedOptions[0].icon}
                </span>
              ) : null}
              {selectedOptions[0].label}
            </span>
          )}
        </span>
        <ChevronDown
          className="studio-iselect-caret"
          size={16}
          strokeWidth={2.2}
          aria-hidden
        />
      </button>

      {open && pos && typeof document !== "undefined"
        ? createPortal(
            <ul
              id={listId}
              className="studio-iselect-panel"
              role="listbox"
              aria-multiselectable={isMulti}
              style={{
                top: pos.top,
                left: pos.left,
                width: pos.width,
                maxHeight: PANEL_MAX_H,
              }}
            >
              {options.map((o) => {
                const active = selectedSet.has(o.value);
                return (
                  <li key={o.value || "none"} role="presentation">
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      className={`studio-iselect-option${active ? " is-active" : ""}`}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handlePick(o.value)}
                    >
                      {o.icon ? (
                        <span className="studio-iselect-option-ic" aria-hidden>
                          {o.icon}
                        </span>
                      ) : null}
                      <span className="studio-iselect-option-label">
                        {o.label}
                      </span>
                      {active ? (
                        <Check
                          className="studio-iselect-option-check"
                          size={15}
                          strokeWidth={3}
                          aria-hidden
                        />
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>,
            document.body,
          )
        : null}
    </div>
  );
}
