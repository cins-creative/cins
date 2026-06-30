import Link from "next/link";
import { redirect } from "next/navigation";

import { LoginActions } from "@/app/login/LoginActions";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";

type SearchParams = Promise<{
  error?: string;
  auto?: string;
  next?: string;
}>;

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="cins-login-banner cins-login-banner--err" role="alert">
      <span className="cins-login-banner-dot" aria-hidden />
      <div>
        <strong>Đăng nhập chưa hoàn tất.</strong>
        <p>{message}</p>
      </div>
    </div>
  );
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { error, auto, next } = await searchParams;
  const errorMsg = error?.trim() || null;

  const safeNext =
    next && next.startsWith("/") && !next.startsWith("//") ? next : null;

  const session = await getCurrentSessionAndProfile();
  if (session?.profile && !errorMsg) {
    redirect(safeNext ?? `/${encodeURIComponent(session.profile.slug)}`);
  }

  /* Khi đang hiển thị banner lỗi → không auto-trigger để user thấy thông báo trước. */
  const autoIntent =
    !errorMsg && (auto === "register" || auto === "login") ? auto : null;

  return (
    <div className="cins-login-page">
      <div className="cins-login-bg-deco" aria-hidden>
        <span className="cins-login-blob cins-login-blob--y" />
        <span className="cins-login-blob cins-login-blob--m" />
        <span className="cins-login-blob cins-login-blob--o" />
        <span className="cins-login-blob cins-login-blob--v" />
      </div>

      <nav className="cins-login-top">
        <Link href="/" className="cins-login-logo" aria-label="C.INS trang chủ">
          <img
            src="/assets/logo-cins-wide.svg"
            alt="C.INS"
            className="cins-login-logo-img"
          />
        </Link>
        <Link href="/" className="cins-login-back">
          ← Về trang chủ
        </Link>
      </nav>

      <main className="cins-login-main">
        <section className="cins-login-card" aria-label="Đăng nhập C.INS">
          <p className="cins-login-eyebrow">khám phá hành trình của bạn</p>

          {errorMsg ? <ErrorBanner message={errorMsg} /> : null}

          <LoginActions
            initialError={errorMsg}
            autoIntent={autoIntent}
            resumeAfterRedirect={Boolean(safeNext && !errorMsg)}
            returnPath={safeNext}
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
            <Link href="/chinh-sach-rieng-tu">Chính sách bảo mật</Link> của
            C.INS.
          </p>
        </section>
      </main>

      <footer className="cins-login-footer">
        <span>© {new Date().getFullYear()} C.INS Vietnam · Creative hub</span>
        <div className="cins-login-footer-links">
          <Link href="/lien-he">Liên hệ</Link>
          <Link href="/ho-tro">Trợ giúp</Link>
        </div>
      </footer>
    </div>
  );
}
