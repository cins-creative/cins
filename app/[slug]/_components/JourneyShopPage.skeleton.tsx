import { JourneySidebarSwitchNavSkeleton } from "@/app/[slug]/_components/JourneySidebarSwitchNav.skeleton";

/** Skeleton mặt tiền shop — không dùng timeline/composer. */
export function JourneyShopPageSkeleton() {
  return (
    <div className="cins-journey-page" aria-busy="true" aria-label="Đang tải cửa hàng">
      <div className="j-shell">
        <aside className="j-sidebar j-skel-sidebar" aria-hidden>
          <div className="j-skel j-skel-cover" />
          <div className="j-skel j-skel-avatar" />
          <div className="j-skel j-skel-name" />
          <div className="j-skel j-skel-role" />
          <div className="j-skel j-skel-handle" />
          <div className="j-skel j-skel-actions" />
          <div className="j-skel j-skel-summary" />
          <JourneySidebarSwitchNavSkeleton />
        </aside>
        <section className="j-shop" aria-hidden>
          <div className="j-skel j-skel-name" />
          <div className="j-skel j-skel-cover" />
          <div className="j-skel j-skel-cover" />
          <div className="j-skel j-skel-cover" />
          <div className="j-skel j-skel-cover" />
          <div className="j-skel j-skel-cover" />
          <div className="j-skel j-skel-cover" />
        </section>
      </div>
    </div>
  );
}
