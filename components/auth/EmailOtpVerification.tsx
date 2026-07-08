"use client";

import { Loader2 } from "lucide-react";
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
  mapOtpError,
  maskEmail,
  normalizeOtpInput,
} from "@/lib/auth/email-otp";
import type { OtpVerifyType } from "@/lib/auth/send-signup-otp";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Props = {
  email: string;
  /** URL quay lại sau khi xác nhận (đăng nhập lại). */
  returnPath?: string | null;
  /** Tự gửi mã ngay khi mở màn hình (đăng ký lại / đăng nhập chưa confirm). */
  sendOnMount?: boolean;
  onBack?: () => void;
  disabled?: boolean;
};

async function requestSignupOtp(email: string): Promise<
  | { ok: true; verifyType: OtpVerifyType }
  | { ok: false; message: string }
> {
  const res = await fetch("/api/auth/resend-signup-otp", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: email.trim() }),
  });
  const json = (await res.json().catch(() => null)) as
    | { ok?: boolean; verifyType?: OtpVerifyType; error?: string }
    | null;

  if (!res.ok || !json?.ok) {
    return { ok: false, message: json?.error || "Không gửi được mã. Thử lại sau." };
  }

  return { ok: true, verifyType: json.verifyType ?? "signup" };
}

export function EmailOtpVerification({
  email,
  returnPath = null,
  sendOnMount = false,
  onBack,
  disabled = false,
}: Props) {
  const [digits, setDigits] = useState<string[]>(
    Array.from({ length: EMAIL_OTP_LENGTH }, () => ""),
  );
  const [verifyType, setVerifyType] = useState<OtpVerifyType>("signup");
  const [busy, setBusy] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);
  const [sendingInitial, setSendingInitial] = useState(sendOnMount);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(sendOnMount ? 0 : EMAIL_OTP_RESEND_COOLDOWN_SEC);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const initialSendDone = useRef(false);

  const otp = digits.join("");
  const lock = busy || resendBusy || sendingInitial || disabled;

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (!sendOnMount || initialSendDone.current) return;
    initialSendDone.current = true;

    void (async () => {
      const result = await requestSignupOtp(email);
      setSendingInitial(false);
      if (result.ok) {
        setVerifyType(result.verifyType);
        setNotice("Đã gửi mã mới. Kiểm tra hộp thư và mục Spam/Quảng cáo.");
        setCooldown(EMAIL_OTP_RESEND_COOLDOWN_SEC);
      } else {
        setError(result.message);
      }
    })();
  }, [email, sendOnMount]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((v) => v - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

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
    const text = e.clipboardData.getData("text");
    applyPastedValue(text, 0);
  }

  async function verifyOtp() {
    if (!isCompleteOtp(otp)) {
      setError(`Nhập đủ ${EMAIL_OTP_LENGTH} số trong email.`);
      return;
    }

    setBusy(true);
    setError(null);
    setNotice(null);

    const supabase = createSupabaseBrowserClient();
    const { data, error: verifyErr } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: otp,
      type: verifyType,
    });

    if (verifyErr) {
      setError(mapOtpError(verifyErr.message));
      setBusy(false);
      return;
    }

    if (data.session) {
      const { data: profile } = await supabase
        .from("user_nguoi_dung")
        .select("slug, giai_doan")
        .eq("auth_user_id", data.session.user.id)
        .maybeSingle<{ slug: string; giai_doan: string | null }>();

      if (!profile?.giai_doan) {
        window.location.assign("/onboarding");
        return;
      }

      const safeNext =
        returnPath && returnPath.startsWith("/") && !returnPath.startsWith("//")
          ? returnPath
          : "/";
      window.location.assign(safeNext);
      return;
    }

    setError("Không tạo được phiên đăng nhập. Vui lòng thử lại.");
    setBusy(false);
  }

  async function resendOtp() {
    if (cooldown > 0 || lock) return;

    setResendBusy(true);
    setError(null);
    setNotice(null);

    const result = await requestSignupOtp(email);

    setResendBusy(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setVerifyType(result.verifyType);
    setNotice("Đã gửi lại mã mới. Kiểm tra hộp thư (và cả thư rác).");
    setCooldown(EMAIL_OTP_RESEND_COOLDOWN_SEC);
    setDigits(Array.from({ length: EMAIL_OTP_LENGTH }, () => ""));
    focusInput(0);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (lock) return;
    void verifyOtp();
  }

  return (
    <form className="cins-login-otp" onSubmit={onSubmit} noValidate>
      <div className="cins-login-otp-head">
        <p className="cins-login-otp-eyebrow">Bước cuối</p>
        <h2 className="cins-login-otp-title">Nhập mã xác nhận</h2>
        <p className="cins-login-otp-desc">
          {sendingInitial ? (
            <>Đang gửi mã <strong>{EMAIL_OTP_LENGTH} số</strong> tới{" "}
            <strong>{maskEmail(email)}</strong>…</>
          ) : (
            <>
              Nhập mã <strong>{EMAIL_OTP_LENGTH} số</strong> đã gửi tới{" "}
              <strong>{maskEmail(email)}</strong>. Mã có hiệu lực khoảng 1 giờ.
              Không thấy email? Kiểm tra <strong>Spam / Quảng cáo</strong>.
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
        <span>{busy ? "Đang xác nhận…" : "Xác nhận tài khoản"}</span>
      </button>

      <div className="cins-login-otp-actions">
        <button
          type="button"
          className="cins-login-otp-link"
          onClick={() => void resendOtp()}
          disabled={lock || cooldown > 0}
        >
          {resendBusy
            ? "Đang gửi lại…"
            : cooldown > 0
              ? `Gửi lại mã (${cooldown}s)`
              : "Gửi lại mã"}
        </button>
        {onBack ? (
          <button
            type="button"
            className="cins-login-otp-link cins-login-otp-link--muted"
            onClick={onBack}
            disabled={lock}
          >
            Quay lại
          </button>
        ) : null}
      </div>
    </form>
  );
}
