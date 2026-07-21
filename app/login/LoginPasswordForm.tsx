"use client";

import { Eye, EyeOff, Loader2 } from "lucide-react";
import { type FormEvent, useState } from "react";

import { ForgotPasswordForm } from "@/app/login/ForgotPasswordForm";
import { EmailOtpVerification } from "@/components/auth/EmailOtpVerification";
import { authOriginMismatchMessage } from "@/lib/auth/auth-origin";
import { stashOAuthIntent } from "@/lib/auth/oauth-intent-client";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Mode = "login" | "register";
type Step = "credentials" | "verify-otp" | "forgot";

type Props = {
  /** URL quay lại sau đăng nhập (từ `?next=`). */
  returnPath?: string | null;
  /** Khóa chéo với các nút Google khi một luồng đang chạy. */
  disabled?: boolean;
  onBusyChange?: (busy: boolean) => void;
};

const MIN_PASSWORD = 6;

function mapAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login credentials")) {
    return "Sai tài khoản hoặc mật khẩu.";
  }
  if (lower.includes("email not confirmed")) {
    return "Email chưa được xác nhận. Nhập mã 6 số đã gửi tới email của bạn.";
  }
  if (lower.includes("password should be")) {
    return `Mật khẩu cần tối thiểu ${MIN_PASSWORD} ký tự.`;
  }
  if (lower.includes("unable to validate email") || lower.includes("invalid email")) {
    return "Địa chỉ email không hợp lệ.";
  }
  if (lower.includes("rate limit") || lower.includes("too many")) {
    return "Bạn thao tác quá nhanh. Vui lòng đợi một lát rồi thử lại.";
  }
  return message;
}

export function LoginPasswordForm({
  returnPath = null,
  disabled = false,
  onBusyChange,
}: Props) {
  const [mode, setMode] = useState<Mode>("login");
  const [step, setStep] = useState<Step>("credentials");
  const [pendingEmail, setPendingEmail] = useState("");
  const [otpSendOnMount, setOtpSendOnMount] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const lock = busy || disabled;

  function setBusyState(next: boolean) {
    setBusy(next);
    onBusyChange?.(next);
  }

  function switchMode(next: Mode) {
    if (next === mode) return;
    setMode(next);
    setStep("credentials");
    setPendingEmail("");
    setOtpSendOnMount(false);
    setError(null);
    setNotice(null);
  }

  function openForgot() {
    setStep("forgot");
    setError(null);
    setNotice(null);
    setBusyState(false);
  }

  function backFromForgot() {
    setStep("credentials");
    setMode("login");
    setError(null);
    setNotice(null);
    setBusyState(false);
  }

  function openOtpStep(targetEmail: string) {
    setPendingEmail(targetEmail.trim());
    setOtpSendOnMount(true);
    setStep("verify-otp");
    setError(null);
    setNotice(null);
    setBusyState(false);
  }

  function backToCredentials() {
    setStep("credentials");
    setPendingEmail("");
    setOtpSendOnMount(false);
    setError(null);
    setNotice(null);
  }

  async function handleLogin() {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ identifier: identifier.trim(), password, next: returnPath }),
    });
    const json = (await res.json().catch(() => null)) as
      | {
          ok?: boolean;
          redirect?: string;
          error?: string;
          code?: string;
          email?: string;
        }
      | null;

    if (!res.ok || !json?.ok) {
      if (json?.code === "email_not_confirmed" && json.email) {
        openOtpStep(json.email);
        return;
      }
      setError(json?.error || "Không đăng nhập được. Vui lòng thử lại.");
      setBusyState(false);
      return;
    }
    /* Reload đầy đủ để SSR nhận session cookie mới. Giữ busy=true khi đang điều hướng. */
    window.location.assign(json.redirect || "/");
  }

  async function handleRegister() {
    const mismatch = authOriginMismatchMessage();
    if (mismatch) {
      setError(mismatch);
      setBusyState(false);
      return;
    }

    stashOAuthIntent("register");
    const supabase = createSupabaseBrowserClient();

    const { data, error: signUpErr } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    if (signUpErr) {
      setError(mapAuthError(signUpErr.message));
      setBusyState(false);
      return;
    }

    /* Confirmation tắt → có session ngay → vào onboarding. */
    if (data.session) {
      window.location.assign("/onboarding");
      return;
    }

    openOtpStep(email.trim());
    setPassword("");
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (lock) return;
    setError(null);
    setNotice(null);

    if (mode === "login") {
      if (!identifier.trim() || !password) {
        setError("Vui lòng nhập tài khoản và mật khẩu.");
        return;
      }
    } else {
      if (!email.trim()) {
        setError("Vui lòng nhập email.");
        return;
      }
      if (password.length < MIN_PASSWORD) {
        setError(`Mật khẩu cần tối thiểu ${MIN_PASSWORD} ký tự.`);
        return;
      }
    }

    setBusyState(true);
    void (mode === "login" ? handleLogin() : handleRegister());
  }

  if (step === "verify-otp" && pendingEmail) {
    return (
      <EmailOtpVerification
        email={pendingEmail}
        returnPath={returnPath}
        sendOnMount={otpSendOnMount}
        onBack={backToCredentials}
        disabled={disabled}
      />
    );
  }

  if (step === "forgot") {
    return (
      <ForgotPasswordForm
        initialIdentifier={identifier}
        returnPath={returnPath}
        disabled={disabled}
        onBusyChange={onBusyChange}
        onBack={backFromForgot}
        onDoneNotice={setNotice}
      />
    );
  }

  return (
    <form className="cins-login-pw" onSubmit={onSubmit} noValidate>
      <div className="cins-login-pw-tabs" role="tablist" aria-label="Chọn cách dùng email">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "login"}
          className={`cins-login-pw-tab${mode === "login" ? " is-active" : ""}`}
          onClick={() => switchMode("login")}
          disabled={lock}
        >
          Đăng nhập
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "register"}
          className={`cins-login-pw-tab${mode === "register" ? " is-active" : ""}`}
          onClick={() => switchMode("register")}
          disabled={lock}
        >
          Đăng ký
        </button>
      </div>

      {mode === "login" ? (
        <label className="cins-login-pw-field">
          <span className="cins-login-pw-label">Email hoặc tên tài khoản</span>
          <input
            type="text"
            name="identifier"
            autoComplete="username"
            inputMode="email"
            placeholder="ban@email.com hoặc tên-tai-khoan"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            disabled={lock}
            required
          />
        </label>
      ) : (
        <label className="cins-login-pw-field">
          <span className="cins-login-pw-label">Email</span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            placeholder="ban@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={lock}
            required
          />
        </label>
      )}

      <label className="cins-login-pw-field">
        <span className="cins-login-pw-label">Mật khẩu</span>
        <div className="cins-login-pw-input-wrap">
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            placeholder={mode === "register" ? `Tối thiểu ${MIN_PASSWORD} ký tự` : "Mật khẩu"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={lock}
            minLength={mode === "register" ? MIN_PASSWORD : undefined}
            required
          />
          <button
            type="button"
            className="cins-login-pw-toggle"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            tabIndex={-1}
            disabled={lock}
          >
            {showPassword ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
          </button>
        </div>
      </label>

      {mode === "login" ? (
        <div className="cins-login-pw-forgot-row">
          <button
            type="button"
            className="cins-login-pw-forgot"
            onClick={openForgot}
            disabled={lock}
          >
            Quên mật khẩu?
          </button>
        </div>
      ) : null}

      {error ? (
        <p className="cins-login-pw-error" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="cins-login-pw-notice" role="status">
          {notice}
        </p>
      ) : null}

      <button type="submit" className="cins-login-pw-submit" disabled={lock} aria-busy={busy}>
        {busy ? (
          <Loader2 size={18} className="cins-login-pw-spin" aria-hidden />
        ) : null}
        <span>
          {busy
            ? "Đang xử lý…"
            : mode === "login"
              ? "Đăng nhập"
              : "Tạo tài khoản"}
        </span>
      </button>
    </form>
  );
}
