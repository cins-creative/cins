"use client";

import { AlertTriangle } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

type Props = {
  open: boolean;
  title: string;
  /** Nội dung cảnh báo — có thể JSX. */
  warning: ReactNode;
  /** Tên tổ chức người dùng phải gõ lại (`ten`). */
  confirmTen: string;
  confirmButtonLabel: string;
  pending?: boolean;
  error?: string | null;
  onConfirm: (confirmTen: string) => void;
  onClose: () => void;
};

/**
 * Modal xác nhận hành động nguy hiểm của owner — gõ đúng tên tổ chức.
 * Dùng cho chuyển nhượng / tạm dừng / đóng cửa studio.
 */
export function OrgOwnerDangerConfirmModal({
  open,
  title,
  warning,
  confirmTen,
  confirmButtonLabel,
  pending = false,
  error,
  onConfirm,
  onClose,
}: Props) {
  const [typed, setTyped] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTyped("");
      const t = setTimeout(() => inputRef.current?.focus(), 40);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !pending) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, pending]);

  if (!open || typeof document === "undefined") return null;

  const matches =
    typed.trim().toLowerCase() === confirmTen.trim().toLowerCase();
  const canConfirm = matches && !pending;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={overlayStyle}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !pending) onClose();
      }}
    >
      <div style={cardStyle}>
        <div style={iconWrapStyle}>
          <AlertTriangle size={22} strokeWidth={2.2} aria-hidden />
        </div>
        <h3 style={titleStyle}>{title}</h3>
        <div style={bodyStyle}>{warning}</div>
        <label style={labelStyle}>
          Nhập tên tổ chức <code style={codeStyle}>{confirmTen}</code> để xác nhận
          <input
            ref={inputRef}
            type="text"
            value={typed}
            disabled={pending}
            placeholder={confirmTen}
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => setTyped(e.target.value)}
            style={inputStyle}
            onKeyDown={(e) => {
              if (e.key === "Enter" && canConfirm) onConfirm(typed.trim());
            }}
          />
        </label>
        {error ? <p style={errorStyle}>{error}</p> : null}
        <div style={actionsStyle}>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            style={ghostBtnStyle}
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={() => canConfirm && onConfirm(typed.trim())}
            disabled={!canConfirm}
            style={{
              ...dangerBtnStyle,
              opacity: canConfirm ? 1 : 0.5,
              cursor: canConfirm ? "pointer" : "not-allowed",
            }}
          >
            {pending ? "Đang xử lý…" : confirmButtonLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 1000,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
  background: "rgba(15, 23, 42, 0.45)",
  backdropFilter: "blur(2px)",
};

const cardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 420,
  background: "#fff",
  borderRadius: 16,
  padding: "22px 22px 18px",
  boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
  fontFamily: "var(--font-sans)",
};

const iconWrapStyle: React.CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 12,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#fff1f0",
  color: "#d4380d",
  marginBottom: 12,
};

const titleStyle: React.CSSProperties = {
  margin: "0 0 8px",
  fontSize: 18,
  fontWeight: 800,
  color: "var(--ink, #1c1c1e)",
};

const bodyStyle: React.CSSProperties = {
  margin: "0 0 16px",
  fontSize: 13.5,
  lineHeight: 1.55,
  color: "var(--ink2, #444)",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12.5,
  fontWeight: 600,
  color: "var(--ink2, #444)",
};

const codeStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono, monospace)",
  background: "var(--neutral-100, #f1f2f5)",
  padding: "1px 6px",
  borderRadius: 6,
  fontSize: 12.5,
};

const inputStyle: React.CSSProperties = {
  marginTop: 6,
  width: "100%",
  height: 38,
  padding: "0 12px",
  borderRadius: 10,
  border: "1px solid var(--border, #e4e6eb)",
  fontSize: 14,
  fontFamily: "var(--font-sans)",
  boxSizing: "border-box",
};

const errorStyle: React.CSSProperties = {
  margin: "10px 0 0",
  fontSize: 12.5,
  color: "#d4380d",
};

const actionsStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
  marginTop: 18,
};

const ghostBtnStyle: React.CSSProperties = {
  height: 40,
  padding: "0 16px",
  borderRadius: 10,
  border: "1px solid var(--border, #e4e6eb)",
  background: "#fff",
  color: "var(--ink, #1c1c1e)",
  fontSize: 13.5,
  fontWeight: 600,
  fontFamily: "var(--font-sans)",
  cursor: "pointer",
};

const dangerBtnStyle: React.CSSProperties = {
  height: 40,
  padding: "0 16px",
  borderRadius: 10,
  border: "none",
  background: "#d4380d",
  color: "#fff",
  fontSize: 13.5,
  fontWeight: 700,
  fontFamily: "var(--font-sans)",
};
