"use client";

import { Eye, EyeOff, Loader2 } from "lucide-react";
import {
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  EMAIL_OTP_LENGTH,
  EMAIL_OTP_RESEND_COOLDOWN_SEC,
  isCompleteOtp,
  maskEmail,
  normalizeOtpInput,
} from "@/lib/auth/email-otp";

type Step = "request" | "reset";

type Props = {
  /** Prefill từ form đăng nhập (email hoặc username). */
  initialIdentifier?: string;
  returnPath?: string | null;
  disabled?: boolean;
  onBusyChange?: (busy: boolean) => void;
  onBack: () => void;
  onDoneNotice?: (message: string) => void;
};

const MIN_PASSWORD = 6;

export function ForgotPasswordForm({
  initialIdentifier = "",
  returnPath = null,
  disabled = false,
  onBusyChange,
  onBack,
  onDoneNotice,
}: Props) {
  const [step, setStep] = useState<Step>("request");
  const [identifier, setIdentifier] = useState(initialIdentifier);
  const [hintEmail, setHintEmail] = useState<string | null>(null);
  const [digits, setDigits] = useState<string[]>(
    Array.from({ length: EMAIL_OTP_LENGTH }, () => ""),
  );
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const otp = digits.join("");
  const lock = busy || resendBusy || disabled;

  function setBusyState(next: boolean) {
    setBusy(next);
    onBusyChange?.(next);
  }

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((v) => v - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    if (step === "reset") {
      inputRefs.current[0]?.focus();
    }
  }, [step]);

  const setDigitAt = useCallback((index: number, value: string) => {
    setDigits((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }, []);

  function focusInput(index: number) {
    const target = inputRefs.current[Math.max(0, Math.min(index, EMAIL_OTP_LENGTH - 1))];
    target?.focus();
    target?.select();
  }

  function applyPastedValue(raw: string, startIndex = 0) {
    const chars = normalizeOtpInput(raw).split("");
    if (chars.length === 0) return;
    setDigits((prev) => {
      const next = [...prev];
      let i = startIndex;
      for (const ch of chars) {
        if (i >= EMAIL_OTP_LENGTH) break;
        next[i] = ch;
        i += 1;
      }
      return next;
    });
    focusInput(Math.min(startIndex + chars.length, EMAIL_OTP_LENGTH - 1));
  }

  function handleDigitChange(index: number, raw: string) {
    setError(null);
    setNotice(null);
    const normalized = normalizeOtpInput(raw);
    if (!normalized) {
      setDigitAt(index, "");
      return;
    }
    if (normalized.length > 1) {
      applyPastedValue(normalized, index);
      return;
    }
    setDigitAt(index, normalized);
    if (index < EMAIL_OTP_LENGTH - 1) {
      focusInput(index + 1);
    }
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      e.preventDefault();
      setDigitAt(index - 1, "");
      focusInput(index - 1);
    }
    if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      focusInput(index - 1);
    }
    if (e.key === "ArrowRight" && index < EMAIL_OTP_LENGTH - 1) {
      e.preventDefault();
      focusInput(index + 1);
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    applyPastedValue(e.clipboardData.getData("text"), 0);
  }

  async function requestReset() {
    const trimmed = identifier.trim();
    if (!trimmed) {
      setError("Vui lòng nhập email hoặc tên tài khoản.");
      return;
    }

    setBusyState(true);
    setError(null);
    setNotice(null);

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ identifier: trimmed }),
    });
    const json = (await res.json().catch(() => null)) as
      | { ok?: boolean; message?: string; hintEmail?: string | null; error?: string }
      | null;

    setBusyState(false);

    if (!res.ok || !json?.ok) {
      setError(json?.error || "Không gửi được mã. Thử lại sau.");
      return;
    }

    setHintEmail(json.hintEmail ?? null);
    setNotice(json.message || "Đã gửi mã nếu tài khoản tồn tại.");
    setCooldown(EMAIL_OTP_RESEND_COOLDOWN_SEC);
    setDigits(Array.from({ length: EMAIL_OTP_LENGTH }, () => ""));
    setPassword("");
    setPassword2("");
    setStep("reset");
  }

  async function resendCode() {
    if (cooldown > 0 || lock) return;

    setResendBusy(true);
    setError(null);
    setNotice(null);

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ identifier: identifier.trim() }),
    });
    const json = (await res.json().catch(() => null)) as
      | { ok?: boolean; message?: string; hintEmail?: string | null; error?: string }
      | null;

    setResendBusy(false);

    if (!res.ok || !json?.ok) {
      setError(json?.error || "Không gửi lại được mã.");
      return;
    }

    setHintEmail(json.hintEmail ?? null);
    setNotice("Đã gửi lại mã mới. Kiểm tra hộp thư (và cả thư rác).");
    setCooldown(EMAIL_OTP_RESEND_COOLDOWN_SEC);
    setDigits(Array.from({ length: EMAIL_OTP_LENGTH }, () => ""));
    focusInput(0);
  }

  async function submitNewPassword() {
    if (!isCompleteOtp(otp)) {
      setError(`Nhập đủ ${EMAIL_OTP_LENGTH} số trong email.`);
      return;
    }
    if (password.length < MIN_PASSWORD) {
      setError(`Mật khẩu mới cần tối thiểu ${MIN_PASSWORD} ký tự.`);
      return;
    }
    if (password !== password2) {
      setError("Hai mật khẩu không khớp.");
      return;
    }

    setBusyState(true);
    setError(null);
    setNotice(null);

    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        token: otp,
        password,
        next: returnPath,
      }),
    });
    const json = (await res.json().catch(() => null)) as
      | { ok?: boolean; redirect?: string; error?: string }
      | null;

    if (!res.ok || !json?.ok) {
      setError(json?.error || "Không đổi được mật khẩu. Vui lòng thử lại.");
      setBusyState(false);
      return;
    }

    onDoneNotice?.("Đã đặt lại mật khẩu. Đang đăng nhập…");
    window.location.assign(json.redirect || "/");
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (lock) return;
    if (step === "request") {
      void requestReset();
      return;
    }
    void submitNewPassword();
  }

  if (step === "request") {
    return (
      <form className="cins-login-pw cins-login-forgot" onSubmit={onSubmit} noValidate>
        <div className="cins-login-otp-head">
          <p className="cins-login-otp-eyebrow">Khôi phục</p>
          <h2 className="cins-login-otp-title">Quên mật khẩu</h2>
          <p className="cins-login-otp-desc">
            Nhập email hoặc tên tài khoản — chúng tôi gửi mã{" "}
            <strong>{EMAIL_OTP_LENGTH} số</strong> để đặt mật khẩu mới.
          </p>
        </div>

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
            autoFocus
          />
        </label>

        {error ? (
          <p className="cins-login-pw-error" role="alert">
            {error}
          </p>
        ) : null}

        <button type="submit" className="cins-login-pw-submit" disabled={lock} aria-busy={busy}>
          {busy ? (
            <Loader2 size={18} className="cins-login-pw-spin" aria-hidden />
          ) : null}
          <span>{busy ? "Đang gửi…" : "Gửi mã lấy lại mật khẩu"}</span>
        </button>

        <div className="cins-login-otp-actions">
          <button
            type="button"
            className="cins-login-otp-link cins-login-otp-link--muted"
            onClick={onBack}
            disabled={lock}
          >
            Quay lại đăng nhập
          </button>
        </div>
      </form>
    );
  }

  return (
    <form className="cins-login-pw cins-login-forgot" onSubmit={onSubmit} noValidate>
      <div className="cins-login-otp-head">
        <p className="cins-login-otp-eyebrow">Bước 2</p>
        <h2 className="cins-login-otp-title">Đặt mật khẩu mới</h2>
        <p className="cins-login-otp-desc">
          {hintEmail ? (
            <>
              Nhập mã <strong>{EMAIL_OTP_LENGTH} số</strong> đã gửi tới{" "}
              <strong>{maskEmail(hintEmail)}</strong>, rồi chọn mật khẩu mới.
            </>
          ) : (
            <>
              Nhập mã <strong>{EMAIL_OTP_LENGTH} số</strong> trong email liên kết
              tài khoản, rồi chọn mật khẩu mới. Không thấy thư? Kiểm tra{" "}
              <strong>Spam / Quảng cáo</strong>.
            </>
          )}
        </p>
      </div>

      <div
        className="cins-login-otp-digits"
        role="group"
        aria-label={`Mã xác nhận ${EMAIL_OTP_LENGTH} số`}
      >
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(el) => {
              inputRefs.current[index] = el;
            }}
            className="cins-login-otp-digit"
            type="text"
            inputMode="numeric"
            autoComplete={index === 0 ? "one-time-code" : "off"}
            pattern="[0-9]*"
            maxLength={1}
            value={digit}
            onChange={(e) => handleDigitChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            disabled={lock}
            aria-label={`Số thứ ${index + 1}`}
          />
        ))}
      </div>

      <label className="cins-login-pw-field">
        <span className="cins-login-pw-label">Mật khẩu mới</span>
        <div className="cins-login-pw-input-wrap">
          <input
            type={showPassword ? "text" : "password"}
            name="new-password"
            autoComplete="new-password"
            placeholder={`Tối thiểu ${MIN_PASSWORD} ký tự`}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={lock}
            minLength={MIN_PASSWORD}
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

      <label className="cins-login-pw-field">
        <span className="cins-login-pw-label">Nhập lại mật khẩu</span>
        <input
          type={showPassword ? "text" : "password"}
          name="new-password-confirm"
          autoComplete="new-password"
          placeholder="Nhập lại mật khẩu mới"
          value={password2}
          onChange={(e) => setPassword2(e.target.value)}
          disabled={lock}
          minLength={MIN_PASSWORD}
          required
        />
      </label>

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
        <span>{busy ? "Đang lưu…" : "Đặt lại mật khẩu"}</span>
      </button>

      <div className="cins-login-otp-actions">
        <button
          type="button"
          className="cins-login-otp-link"
          onClick={() => void resendCode()}
          disabled={lock || cooldown > 0}
        >
          {resendBusy
            ? "Đang gửi lại…"
            : cooldown > 0
              ? `Gửi lại mã (${cooldown}s)`
              : "Gửi lại mã"}
        </button>
        <button
          type="button"
          className="cins-login-otp-link cins-login-otp-link--muted"
          onClick={onBack}
          disabled={lock}
        >
          Quay lại đăng nhập
        </button>
      </div>
    </form>
  );
}
