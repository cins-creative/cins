import { redirect } from "next/navigation";

import { GuestHomePage } from "@/components/cins/guest-home/GuestHomePage";
import { GuestHomeThemeLight } from "@/components/cins/guest-home/GuestHomeThemeLight";
import { CinsShell } from "@/components/cins/CinsShell";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

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

  /* Link cũ `?them=1` (thêm tài khoản) — strip query, redirect sạch. */
  if (them !== undefined) {
    const params = new URLSearchParams();
    if (error) params.set("error", error);
    if (auto) params.set("auto", auto);
    if (next) params.set("next", next);
    const query = params.toString();
    redirect(query ? `/login?${query}` : "/login");
  }

  const safeNext =
    next && next.startsWith("/") && !next.startsWith("//") ? next : null;

  const session = await getCurrentSessionAndProfile();

  /* Đã có phiên → đưa về đích (?next=) hoặc trang chủ; không còn chế độ «thêm tài khoản». */
  if (session?.profile && !errorMsg) {
    redirect(safeNext || "/");
  }

  /* Khi đang hiển thị banner lỗi → không auto-trigger để user thấy thông báo trước. */
  const autoIntent =
    !errorMsg && (auto === "register" || auto === "login") ? auto : null;

  return (
    <CinsShell data-screen-label="Dang-nhap" className="cins-shell--guest-home">
      <GuestHomeThemeLight />
      <GuestHomePage
        loginPanelProps={{
          initialError: errorMsg,
          autoIntent,
          resumeAfterRedirect: Boolean(safeNext && !errorMsg),
          returnPath: safeNext,
        }}
      />
    </CinsShell>
  );
}
