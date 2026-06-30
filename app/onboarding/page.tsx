import Link from "next/link";
import { redirect } from "next/navigation";

import { OnboardingForm } from "@/components/onboarding/OnboardingForm";
import { OnboardingSignOut } from "@/components/onboarding/OnboardingSignOut";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ intent?: string }>;

/**
 * /onboarding — full-page welcome cho user mới sign up.
 *
 * Sử dụng CINs design system (`--cins-*` tokens + Be Vietnam Pro + Crimson Pro)
 * — background gradient blobs nhất quán với `/login`.
 *
 * Luồng:
 *  - Chưa có session → /login (auth error)
 *  - Profile chưa kịp tạo → /login (race với trigger handle_new_user)
 *  - Đã có giai_doan → admin → /admin · user thường → /{slug}/journey
 *  - Còn lại → render form 2 bước trong trang này
 */
export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await searchParams;

  const session = await getCurrentSessionAndProfile();

  if (!session) {
    redirect("/login?error=Phiên đăng nhập không hợp lệ. Vui lòng thử lại.");
  }

  if (!session.profile) {
    redirect(
      "/login?error=Đang khởi tạo hồ sơ — vui lòng đăng nhập lại sau vài giây.",
    );
  }

  if (session.profile.giai_doan) {
    redirect("/");
  }

  const initialName = session.profile.ten_hien_thi?.trim() || "";
  const initialSlug = session.profile.slug;
  const year = new Date().getFullYear();

  return (
    <main className="cins-onb-page">
      <div className="cins-onb-bg-deco" aria-hidden>
        <span className="cins-onb-blob cins-onb-blob--y" />
        <span className="cins-onb-blob cins-onb-blob--m" />
        <span className="cins-onb-blob cins-onb-blob--o" />
        <span className="cins-onb-blob cins-onb-blob--v" />
      </div>

      <header className="cins-onb-top">
        <Link href="/" className="cins-onb-logo" aria-label="Về trang chủ CINs">
          <span className="cins-onb-logo-mark">C</span>
          <span className="cins-onb-logo-text">
            C<span className="cins-onb-logo-dot">.</span>INS
          </span>
        </Link>
        <OnboardingSignOut />
      </header>

      <section className="cins-onb-main">
        <div className="cins-onb-greet">
          <p className="cins-onb-greet-eyebrow">làm quen tí nào</p>
          <h1 className="cins-onb-greet-h1">
            Chào bạn, mình là <em>C.INS</em>.
          </h1>
          <p className="cins-onb-greet-sub">
            Hai bước siêu nhanh để mình thiết kế Journey hợp với bạn. Mọi thứ
            đều có thể chỉnh lại sau — không cần lo nhé.
          </p>
        </div>

        <OnboardingForm
          initialTenHienThi={initialName}
          initialSlug={initialSlug}
        />
      </section>

      <footer className="cins-onb-footer">
        <span>© {year} C.INS Vietnam · Creative hub</span>
        <div className="cins-onb-footer-links">
          <Link href="/ho-tro">Trợ giúp</Link>
          <Link href="/chinh-sach-rieng-tu">Bảo mật</Link>
          <Link href="/dieu-khoan">Điều khoản</Link>
        </div>
      </footer>
    </main>
  );
}
