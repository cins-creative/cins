/**
 * Không gắn sidebar/topbar/feed skeleton.
 * `/` khách không được HTML loading mang chrome app (CSS/JS nav).
 * Soft-nav sau đăng nhập: `AuthEnterOverlayHost` + `LoggedInChromeSkeleton`.
 */
export default function HomeLoading() {
  return (
    <div
      className="min-h-dvh w-full"
      style={{ background: "var(--bg-page, #fff)" }}
      aria-busy="true"
      aria-label="Đang tải"
    />
  );
}
