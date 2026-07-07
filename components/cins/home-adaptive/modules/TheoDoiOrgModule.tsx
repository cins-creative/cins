import { BellRing } from "lucide-react";

import { HaOrgUpcomingEventsPanel } from "@/components/cins/home-adaptive/HaOrgUpcomingEventsPanel";
import { ModuleCard, ModuleEmpty } from "@/components/cins/home-adaptive/ModuleCard";
import type { HomeModuleCtx } from "@/components/cins/home-adaptive/types";
import { loadSidebarUpcomingEvents } from "@/lib/cins/home-adaptive/sidebar-upcoming-events";
import { SU_KIEN_LOAI_BY_PERSONA } from "@/lib/cins/home-adaptive/persona";

/** Sidebar · tối đa 3 sự kiện (ưu tiên quan tâm / sẽ tham gia). */
export async function TheoDoiOrgModule({ ctx }: { ctx: HomeModuleCtx }) {
  const { items, myEventsTotal } = await loadSidebarUpcomingEvents(
    ctx.viewerId,
    SU_KIEN_LOAI_BY_PERSONA[ctx.persona],
    3,
  );

  return (
    <ModuleCard icon={BellRing} title="Sự kiện & thông báo" className="ha-card--notify">
      {items.length === 0 ? (
        <ModuleEmpty>
          Chưa có sự kiện hay mốc thông báo sắp tới — bấm Quan tâm hoặc Sẽ tham
          gia trên feed, hoặc theo dõi trường để nhận mốc tuyển sinh tại đây.
        </ModuleEmpty>
      ) : (
        <HaOrgUpcomingEventsPanel items={items} myEventsTotal={myEventsTotal} />
      )}
    </ModuleCard>
  );
}
