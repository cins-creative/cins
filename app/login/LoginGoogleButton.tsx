"use client";

import { useState } from "react";

import { startGoogleLogin } from "@/lib/auth/google-oauth";

function IconGoogle() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      aria-hidden
      focusable="false"
    >
      <path
        fill="#EA4335"
        d="M12 11.04v3.7h5.18c-.22 1.17-.9 2.16-1.92 2.83v2.34h3.1c1.81-1.67 2.86-4.12 2.86-7.05 0-.66-.06-1.3-.18-1.92H12z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.6 0 4.78-.86 6.37-2.33l-3.1-2.34c-.86.58-1.96.92-3.27.92-2.52 0-4.66-1.7-5.42-3.98H3.36v2.4C4.95 19.86 8.21 22 12 22z"
      />
      <path
        fill="#FBBC05"
        d="M6.58 14.27c-.2-.58-.31-1.2-.31-1.84 0-.64.11-1.26.3-1.84V8.2H3.36A9.96 9.96 0 0 0 2 12.43c0 1.62.39 3.16 1.08 4.52l3.5-2.68z"
      />
      <path
        fill="#4285F4"
        d="M12 6.62c1.42 0 2.69.49 3.69 1.45l2.76-2.76C16.78 3.83 14.6 3 12 3 8.21 3 4.95 5.14 3.36 8.2l3.22 2.4C7.34 8.32 9.48 6.62 12 6.62z"
      />
    </svg>
  );
}

function IconSpinner() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden
      focusable="false"
      className="cins-login-spin"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="40 60"
        opacity="0.85"
      />
    </svg>
  );
}

export type LoginIntent = "register" | "login";

type Props = {
  intent: LoginIntent;
  /** UI variant — `primary` (xanh) cho đăng ký, `secondary` (trắng) cho đăng nhập. */
  variant?: "primary" | "secondary";
  label: string;
  /** Khóa loading chéo: 1 nút đang chạy → nút kia disable. */
  disabled?: boolean;
  returnTo?: string | null;
  /** Ép Google hiện picker — «Thêm tài khoản». */
  forceAccountPicker?: boolean;
  onLoadingChange?: (loading: boolean) => void;
  onError?: (message: string) => void;
};

export function LoginGoogleButton({
  intent,
  variant = "secondary",
  label,
  disabled,
  returnTo,
  forceAccountPicker = false,
  onLoadingChange,
  onError,
}: Props) {
  const [loading, setLoading] = useState(false);

  async function onClick() {
    if (loading || disabled) return;
    onError?.("");
    setLoading(true);
    onLoadingChange?.(true);
    const { error } = await startGoogleLogin(intent, {
      returnTo: returnTo ?? undefined,
      forceAccountPicker,
    });
    if (error) {
      onError?.(error);
      setLoading(false);
      onLoadingChange?.(false);
    }
    /* Không lỗi → browser sẽ điều hướng sang Google, giữ loading=true. */
  }

  const cls = [
    "cins-login-google",
    variant === "primary" ? "cins-login-google--primary" : "cins-login-google--secondary",
  ].join(" ");

  return (
    <button
      type="button"
      className={cls}
      onClick={() => void onClick()}
      disabled={loading || disabled}
      aria-busy={loading}
    >
      <span className="cins-login-google-ico" aria-hidden>
        {loading ? <IconSpinner /> : <IconGoogle />}
      </span>
      <span className="cins-login-google-label">
        {loading ? "Đang chuyển sang Google…" : label}
      </span>
    </button>
  );
}
