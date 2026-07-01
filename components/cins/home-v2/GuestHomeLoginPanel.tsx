import Link from "next/link";

import { LoginActions } from "@/app/login/LoginActions";

import "@/app/login/login.css";
import "@/app/guest-home.css";
import "./guest-home-login.css";

const PERKS = [
  { label: "Journey", desc: "Lưu lại hành trình sáng tạo của bạn" },
  { label: "Verify", desc: "Xác thực từ tổ chức uy tín" },
  { label: "Khám phá", desc: "Gợi ý ngành nghề" },
] as const;

/** Panel đăng nhập embed trên home guest — đồng bộ CINs design tokens. */
export function GuestHomeLoginPanel() {
  return (
    <section
      className="gh-login-panel"
      id="home-login"
      aria-label="Đăng nhập C.INS"
    >
      <header className="gh-login-head">
        <p className="gh-eyebrow">tài khoản miễn phí</p>
        <h2 className="gh-login-title">
          Khám phá <em>hành trình</em> của bạn
        </h2>
        <p className="gh-login-lead">
          Đăng ký trong 30 giây — lưu portfolio, đăng ký open day và nhận gợi ý
          ngành phù hợp.
        </p>
      </header>

      <LoginActions
        showRememberedAccount={false}
        className="hg-login-actions"
      />

      <ul className="gh-login-perks" aria-label="Lợi ích tài khoản CINs">
        {PERKS.map((item) => (
          <li key={item.label}>
            <span className="gh-login-perk-ico" aria-hidden>
              ✦
            </span>
            <span className="gh-login-perk-copy">
              <strong>{item.label}</strong>
              <span>{item.desc}</span>
            </span>
          </li>
        ))}
      </ul>

      <p className="gh-login-fineprint">
        Tiếp tục đồng nghĩa đồng ý{" "}
        <Link href="/dieu-khoan">Điều khoản</Link> &amp;{" "}
        <Link href="/chinh-sach-rieng-tu">Bảo mật</Link>
      </p>
    </section>
  );
}
