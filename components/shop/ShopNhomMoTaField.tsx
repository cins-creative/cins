"use client";

import { List, ListOrdered } from "lucide-react";
import {
  useRef,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";

import { handleMinimalBodyFormatKeyDown } from "@/components/editor/compose/MinimalBodyFormatBar";
import {
  applyLinePrefix,
  continueListOnEnter,
} from "@/lib/editor/textarea-format";
import { normalizeShopNhomMoTaInput } from "@/lib/shop/nhom-mo-ta";
import { SHOP_NHOM_MO_TA_MAX } from "@/lib/shop/types";

type Props = {
  value: string;
  onChange: (next: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  placeholder?: string;
  "aria-label"?: string;
  className?: string;
  rows?: number;
};

export function ShopNhomMoTaField({
  value,
  onChange,
  onBlur,
  disabled,
  placeholder = "Mô tả ngắn… Enter xuống dòng; nút danh sách để gạch đầu dòng",
  "aria-label": ariaLabel,
  className,
  rows = 3,
}: Props) {
  const taRef = useRef<HTMLTextAreaElement>(null);

  function commit(next: string, selStart?: number, selEnd?: number) {
    let out = normalizeShopNhomMoTaInput(next);
    if (out.length > SHOP_NHOM_MO_TA_MAX) {
      out = out.slice(0, SHOP_NHOM_MO_TA_MAX);
    }
    onChange(out);
    const ta = taRef.current;
    if (ta && selStart != null && selEnd != null) {
      requestAnimationFrame(() => {
        ta.focus();
        const a = Math.min(selStart, out.length);
        const b = Math.min(selEnd, out.length);
        ta.setSelectionRange(a, b);
      });
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    // Đảm bảo Enter không bị form / handler ngoài nuốt
    if (e.key === "Enter" && !e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.stopPropagation();
      const listResult = continueListOnEnter(
        value,
        e.currentTarget.selectionStart,
        e.currentTarget.selectionEnd,
      );
      if (listResult) {
        e.preventDefault();
        commit(
          listResult.value,
          listResult.selectionStart,
          listResult.selectionEnd,
        );
        return;
      }
      // Để mặc định: xuống dòng trong textarea
      return;
    }

    handleMinimalBodyFormatKeyDown(e, {
      value,
      onChange: (next) => commit(next),
      maxLength: SHOP_NHOM_MO_TA_MAX,
    });
  }

  function applyList(kind: "bullet" | "ordered", e: ReactMouseEvent) {
    e.preventDefault();
    const ta = taRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const result = applyLinePrefix(value, start, end, kind);
    commit(result.value, result.selectionStart, result.selectionEnd);
  }

  return (
    <div className={`shop-kho-nhom-mota-field${className ? ` ${className}` : ""}`}>
      <div className="shop-kho-nhom-mota-toolbar" role="toolbar" aria-label="Định dạng mô tả">
        <button
          type="button"
          className="shop-kho-nhom-mota-fmt"
          title="Danh sách gạch đầu dòng"
          aria-label="Danh sách gạch đầu dòng"
          disabled={disabled}
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => applyList("bullet", e)}
        >
          <List size={14} strokeWidth={2.25} aria-hidden />
        </button>
        <button
          type="button"
          className="shop-kho-nhom-mota-fmt"
          title="Danh sách số"
          aria-label="Danh sách đánh số"
          disabled={disabled}
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => applyList("ordered", e)}
        >
          <ListOrdered size={14} strokeWidth={2.25} aria-hidden />
        </button>
      </div>
      <textarea
        ref={taRef}
        className="shop-kho-nhom-mota"
        rows={rows}
        maxLength={SHOP_NHOM_MO_TA_MAX}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        aria-label={ariaLabel}
        onChange={(e) => commit(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
      />
    </div>
  );
}
