import { BellRing } from "lucide-react";

import { HaOrgUpcomingRow } from "@/components/cins/home-adaptive/HaOrgUpcomingRow";
import { ModuleCard, ModuleEmpty } from "@/components/cins/home-adaptive/ModuleCard";
import type { HomeModuleCtx } from "@/components/cins/home-adaptive/types";
import { loadSidebarUpcomingEvents } from "@/lib/cins/home-adaptive/sidebar-upcoming-events";
import { SU_KIEN_LOAI_BY_PERSONA } from "@/lib/cins/home-adaptive/persona";

/** Sidebar · 2 sự kiện sắp diễn ra (ưu tiên đăng ký / quan tâm / org theo dõi). */
export async function TheoDoiOrgModule({ ctx }: { ctx: HomeModuleCtx }) {
  const events = await loadSidebarUpcomingEvents(
    ctx.viewerId,
    SU_KIEN_LOAI_BY_PERSONA[ctx.persona],
    2,
  );

  return (
    <ModuleCard icon={BellRing} title="Sự kiện sắp diễn ra">
      {events.length === 0 ? (
        <ModuleEmpty>
          Chưa có sự kiện sắp diễn ra — đăng ký hoặc theo dõi org để cập nhật.
        </ModuleEmpty>
      ) : (
        <ul className="ha-org-up-list">
          {events.map((item) => (
            <HaOrgUpcomingRow key={item.id} item={item} />
          ))}
        </ul>
      )}
    </ModuleCard>
  );
}
