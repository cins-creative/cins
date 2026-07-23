import Link from "next/link";

import { LoginActions } from "@/app/login/LoginActions";

type Props = {
  id?: string;
  className?: string;
  initialError?: string | null;
  autoIntent?: "login" | "register" | null;
  resumeAfterRedirect?: boolean;
  returnPath?: string | null;
  /** «Thêm tài khoản» từ menu user — `/login?them=1`. */
  addAccount?: boolean;
};

/** Thẻ đăng nhập dùng chung — trang /login và cột sticky trên home guest. */
export function HomeLoginCard({
  id = "home-login",
  className,
  initialError = null,
  autoIntent = null,
  resumeAfterRedirect = false,
  returnPath = null,
  addAccount = false,
}: Props) {
  return (
    <section
      className={["cins-login-card", className].filter(Boolean).join(" ")}
      id={id}
      aria-label="Đăng nhập C.INS"
    >
      <p className="cins-login-eyebrow">khám phá hành trình của bạn</p>

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
        addAccount={addAccount}
      />

      <ul className="cins-login-bullets" aria-label="Lợi ích tài khoản CINs">
        <li>
          <span className="cins-login-bullet-ico" aria-hidden>
            ✦
          </span>
          <span>
            <strong>Journey cá nhân</strong> — ghi lại hành trình sáng tạo,
            tự động liên kết tác phẩm vào timeline.
          </span>
        </li>
        <li>
          <span className="cins-login-bullet-ico" aria-hidden>
            ✦
          </span>
          <span>
            <strong>Verify</strong> — milestone gắn cờ xác thực từ trường,
            tổ chức, dự án thực.
          </span>
        </li>
        <li>
          <span className="cins-login-bullet-ico" aria-hidden>
            ✦
          </span>
          <span>
            <strong>Khám phá ngành nghề</strong> — gợi ý ngành đào tạo &amp;
            nghề sáng tạo phù hợp với bạn.
          </span>
        </li>
      </ul>

      <p className="cins-login-fineprint">
        Bằng việc tiếp tục, bạn đồng ý với{" "}
        <Link href="/dieu-khoan">Điều khoản sử dụng</Link> và{" "}
        <Link href="/chinh-sach-rieng-tu">Chính sách bảo mật</Link> của C.INS.
      </p>
    </section>
  );
}
