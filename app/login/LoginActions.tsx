"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { LoginGoogleButton } from "@/app/login/LoginGoogleButton";
import { LoginPasswordForm } from "@/app/login/LoginPasswordForm";
import { startGoogleLogin, type LoginIntent } from "@/lib/auth/google-oauth";
import {
  readRememberedAccount,
  type RememberedAccount,
} from "@/lib/auth/remembered-account";
import { getAvatarUrl, getNameInitials } from "@/lib/journey/profile";

type Props = {
  /** Thông báo lỗi ban đầu từ query param (?error=...). */
  initialError?: string | null;
  /**
   * Tự khởi tạo OAuth flow ngay khi mount — vd từ nút topbar "Đăng ký →"
   * (`/login?auto=register`). Server đọc query rồi pass xuống đây để tránh
   * `useSearchParams` (cần Suspense boundary).
   */
  autoIntent?: LoginIntent | null;
  /** Middleware redirect về login kèm `?next=` — cho phép tự đăng nhập lại. */
  resumeAfterRedirect?: boolean;
  /** URL quay lại sau OAuth (từ `?next=`). */
  returnPath?: string | null;
  /** Ẩn nút "Tiếp tục với …" — dùng trên home guest (chỉ /login mới hiện). */
  showRememberedAccount?: boolean;
  className?: string;
};

function RememberedAccountCard({
  account,
  busy,
  onContinue,
}: {
  account: RememberedAccount;
  busy: boolean;
  onContinue: () => void;
}) {
  const displayName = account.tenHienThi?.trim() || `@${account.slug}`;
  const avatarUrl = getAvatarUrl(account.avatarId);

  return (
    <div className="cins-login-remembered">
      <button
        type="button"
        className="cins-login-remembered-btn"
        disabled={busy}
        onClick={onContinue}
      >
        <span className="cins-login-remembered-ava" aria-hidden>
          {avatarUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={avatarUrl} alt="" />
          ) : (
            getNameInitials(account.tenHienThi, account.slug)
          )}
        </span>
        <span className="cins-login-remembered-copy">
          <strong>Tiếp tục với {displayName}</strong>
          <span>@{account.slug}</span>
        </span>
        {busy ? (
          <Loader2
            size={18}
            strokeWidth={2}
            className="cins-login-remembered-spin"
            aria-hidden
          />
        ) : null}
      </button>
    </div>
  );
}

/** Bọc 2 nút Đăng ký / Đăng nhập + state lỗi chung — khóa chéo khi 1 nút đang chạy. */
export function LoginActions({
  initialError = null,
  autoIntent = null,
  resumeAfterRedirect = false,
  returnPath = null,
  showRememberedAccount = true,
  className,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [remembered, setRemembered] = useState<RememberedAccount | null>(null);
  /* Lỗi từ nút OAuth — lỗi từ `?error=` do banner trên page hiển thị. */
  const [error, setError] = useState<string | null>(null);
  const triggered = useRef(false);

  useEffect(() => {
    setRemembered(readRememberedAccount());
  }, []);

  const runLogin = (intent: LoginIntent) => {
    if (triggered.current || busy) return;
    triggered.current = true;
    setBusy(true);
    setError(null);
    void startGoogleLogin(intent, {
      returnTo: returnPath ?? undefined,
    }).then(({ error: oauthErr }) => {
      if (oauthErr) {
        setError(oauthErr);
        setBusy(false);
        triggered.current = false;
      }
    });
  };

  useEffect(() => {
    if (triggered.current || initialError) return;
    if (autoIntent === "register") return;

    const account = readRememberedAccount();
    const shouldAuto =
      autoIntent === "login" || (resumeAfterRedirect && account !== null);
    if (!shouldAuto) return;

    runLogin("login");
  }, [autoIntent, initialError, resumeAfterRedirect]);

  return (
    <div
      className={["cins-login-actions", className].filter(Boolean).join(" ")}
    >
      {showRememberedAccount && remembered ? (
        <RememberedAccountCard
          account={remembered}
          busy={busy}
          onContinue={() => runLogin("login")}
        />
      ) : null}

      <LoginGoogleButton
        intent="register"
        variant="primary"
        label="Đăng ký với Google"
        disabled={busy}
        returnTo={returnPath}
        onLoadingChange={setBusy}
        onError={(m) => setError(m || null)}
      />
      <LoginGoogleButton
        intent="login"
        variant="secondary"
        label="Đăng nhập với Google"
        disabled={busy}
        returnTo={returnPath}
        onLoadingChange={setBusy}
        onError={(m) => setError(m || null)}
      />
      {error ? (
        <p className="cins-login-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="cins-login-divider" role="separator">
        <span>hoặc dùng email</span>
      </div>

      <LoginPasswordForm
        returnPath={returnPath}
        disabled={busy}
        onBusyChange={setBusy}
      />
    </div>
  );
}
