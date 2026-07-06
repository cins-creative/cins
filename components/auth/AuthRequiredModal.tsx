"use client";

import { LogIn, UserPlus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { LoginGoogleButton } from "@/app/login/LoginGoogleButton";

import "./auth-required-modal.css";

type Props = {
  open: boolean;
  message?: string;
  onClose: () => void;
};

export function AuthRequiredModal({ open, message, onClose }: Props) {
  const [mounted, setMounted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      setError(null);
      setBusy(false);
    }
  }, [open]);

  if (!open || !mounted) return null;

  const body =
    message ??
    "Đăng nhập hoặc tạo tài khoản CINs để thích, lưu và bình luận trên hành trình sáng tạo.";

  return createPortal(
    <div
      className="j-auth-modal-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="j-auth-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="j-auth-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="j-auth-modal-close"
          aria-label="Đóng"
          onClick={onClose}
        >
          <X size={16} aria-hidden />
        </button>

        <span className="j-auth-modal-icon" aria-hidden>
          <LogIn size={20} strokeWidth={1.9} />
        </span>

        <h2 id="j-auth-modal-title">Cần đăng nhập</h2>
        <p>{body}</p>

        <div className="j-auth-modal-actions">
          <LoginGoogleButton
            intent="register"
            variant="primary"
            label="Tạo tài khoản với Google"
            disabled={busy}
            onLoadingChange={setBusy}
            onError={(m) => setError(m || null)}
          />
          <LoginGoogleButton
            intent="login"
            variant="secondary"
            label="Đăng nhập với Google"
            disabled={busy}
            onLoadingChange={setBusy}
            onError={(m) => setError(m || null)}
          />
        </div>

        <p className="j-auth-modal-footnote">
          <UserPlus size={14} strokeWidth={1.8} aria-hidden />
          <span>
            Chưa có tài khoản? Chọn <strong>Tạo tài khoản</strong> ở trên.
          </span>
        </p>

        {error ? (
          <p className="j-auth-modal-error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
