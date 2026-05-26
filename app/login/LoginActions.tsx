"use client";

import { useEffect, useRef, useState } from "react";

import { LoginGoogleButton } from "@/app/login/LoginGoogleButton";
import { startGoogleLogin, type LoginIntent } from "@/lib/auth/google-oauth";

type Props = {
  /** Thông báo lỗi ban đầu từ query param (?error=...). */
  initialError?: string | null;
  /**
   * Tự khởi tạo OAuth flow ngay khi mount — vd từ nút topbar "Đăng ký →"
   * (`/login?auto=register`). Server đọc query rồi pass xuống đây để tránh
   * `useSearchParams` (cần Suspense boundary).
   */
  autoIntent?: LoginIntent | null;
};

/** Bọc 2 nút Đăng ký / Đăng nhập + state lỗi chung — khóa chéo khi 1 nút đang chạy. */
export function LoginActions({
  initialError = null,
  autoIntent = null,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(initialError);
  const triggered = useRef(false);

  useEffect(() => {
    if (triggered.current) return;
    if (initialError) return;
    if (autoIntent !== "register" && autoIntent !== "login") return;

    triggered.current = true;
    setBusy(true);
    setError(null);
    void startGoogleLogin(autoIntent).then(({ error: oauthErr }) => {
      if (oauthErr) {
        setError(oauthErr);
        setBusy(false);
        triggered.current = false;
      }
      /* success → browser redirect to Google, giữ busy=true cho tới khi quay lại. */
    });
  }, [autoIntent, initialError]);

  return (
    <div className="cins-login-actions">
      <LoginGoogleButton
        intent="register"
        variant="primary"
        label="Đăng ký với Google"
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
      {error ? (
        <p className="cins-login-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
