import { JourneySidebarSwitchNavSkeleton } from "@/app/[slug]/_components/JourneySidebarSwitchNav.skeleton";
import { JourneyTimelineSectionSkeleton } from "@/app/[slug]/_components/JourneyTimelineSection.skeleton";
import { JourneyFeaturedAsideSectionSkeleton } from "@/app/[slug]/_components/JourneyFeaturedAsideSection.skeleton";

export function JourneyProfilePageSkeleton() {
  return (
    <div className="cins-journey-page" aria-busy="true" aria-label="Đang tải Journey">
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
        <JourneyTimelineSectionSkeleton />
        <JourneyFeaturedAsideSectionSkeleton />
      </div>
    </div>
  );
}
