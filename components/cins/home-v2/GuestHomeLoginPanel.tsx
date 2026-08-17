import Link from "next/link";

import { LoginActions } from "@/app/login/LoginActions";

import "@/app/login/login.css";
import "@/app/guest-home.css";
import "./guest-home-login.css";

export type GuestHomeLoginPanelProps = {
  initialError?: string | null;
  autoIntent?: "login" | "register" | null;
  resumeAfterRedirect?: boolean;
  returnPath?: string | null;
};

/** Panel đăng nhập embed trên home guest — đồng bộ CINs design tokens. */
export function GuestHomeLoginPanel({
  initialError = null,
  autoIntent = null,
  resumeAfterRedirect = false,
  returnPath = null,
}: GuestHomeLoginPanelProps = {}) {
  return (
    <section
      className="gh-login-panel"
      id="home-login"
      aria-label="Đăng nhập C.INS"
    >
      <Link href="/" className="gh-login-brand" aria-label="Về trang chủ C.INS">
        <img
          src="/assets/logo-cins-wide.svg"
          alt="C.INS"
          className="gh-login-brand-img"
        />
      </Link>

      {initialError ? (
        <div className="cins-login-banner cins-login-banner--err" role="alert">
          <span className="cins-login-banner-dot" aria-hidden />
          <div>
            <strong>Đăng nhập chưa hoàn tất.</strong>
            <p>{initialError}</p>
          </div>
        </div>
      ) : null}

      <LoginActions
        initialError={initialError}
        autoIntent={autoIntent}
        resumeAfterRedirect={resumeAfterRedirect}
        returnPath={returnPath}
        showRememberedAccount={false}
        googleLoginAfterPassword
        className="hg-login-actions"
      />

      <p className="gh-login-fineprint">
        Tiếp tục đồng nghĩa đồng ý{" "}
        <Link href="/dieu-khoan">Điều khoản</Link> &amp;{" "}
        <Link href="/chinh-sach-rieng-tu">Bảo mật</Link>
      </p>
    </section>
  );
}
