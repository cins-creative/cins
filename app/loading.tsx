import { HomeWorldJourneySkeleton } from "@/components/cins/home-v2/HomeWorldJourney.skeleton";

/**
 * Skeleton segment `/` — hiện ngay khi điều hướng (trước khi RSC xong).
 * Shell/topbar thuộc layout khác; đây chỉ khung feed trang chủ.
 */
export default function HomeLoading() {
  return (
    <div className="cins-shell" data-screen-label="Trang-chu">
      <div className="cins-shell-column">
        <main className="cins-main">
          <HomeWorldJourneySkeleton />
        </main>
      </div>
    </div>
  );
}
