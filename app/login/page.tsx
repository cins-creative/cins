import Link from "next/link";
import { redirect } from "next/navigation";

import { HomeLoginCard } from "@/components/auth/HomeLoginCard";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";

type SearchParams = Promise<{
  error?: string;
  auto?: string;
  next?: string;
  them?: string;
}>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { error, auto, next, them } = await searchParams;
  const errorMsg = error?.trim() || null;

  /* "Thêm tài khoản" từ menu user: cho phép đăng nhập tài khoản khác dù đang
   * có phiên (không auto-redirect về trang cá nhân hiện tại). */
  const addAccount = them === "1" || them === "true";

  const safeNext =
    next && next.startsWith("/") && !next.startsWith("//") ? next : null;

  const session = await getCurrentSessionAndProfile();
  if (session?.profile && !errorMsg && !addAccount) {
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
        <HomeLoginCard
          id="login-card"
          initialError={errorMsg}
          autoIntent={autoIntent}
          resumeAfterRedirect={Boolean(safeNext && !errorMsg)}
          returnPath={safeNext}
        />
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
