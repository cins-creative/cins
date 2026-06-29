import { BadgeCheck, UserRoundPlus } from "lucide-react";
import Link from "next/link";

import { ModuleCard, ModuleEmpty } from "@/components/cins/home-adaptive/ModuleCard";
import type { HomeModuleCtx } from "@/components/cins/home-adaptive/types";
import { JourneyUserFollowButton } from "@/components/journey/JourneyUserFollowButton";
import { loadFollowSuggestions } from "@/lib/cins/home-adaptive/suggestions";
import { giaiDoanLabel } from "@/lib/cins/home-adaptive/labels";

/** Module "Gợi ý theo dõi" — luôn có ở mọi persona (brief §5). */
export async function GoiYTheoDoiModule({ ctx }: { ctx: HomeModuleCtx }) {
  const suggestions = await loadFollowSuggestions(ctx.viewerId, 4);

  return (
    <ModuleCard icon={UserRoundPlus} title="Gợi ý theo dõi" constant>
      {suggestions.length === 0 ? (
        <ModuleEmpty>Chưa có gợi ý — theo dõi vài người để CINs hiểu bạn hơn.</ModuleEmpty>
      ) : (
        suggestions.map((s) => (
          <div key={s.id} className="ha-row">
            <Link href={`/${s.slug}`} className="ha-row-av" prefetch={false}>
              {s.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.avatarUrl} alt="" width={40} height={40} />
              ) : (
                <span className="ha-row-av-fallback" aria-hidden>
                  {s.name.slice(0, 2).toUpperCase()}
                </span>
              )}
            </Link>
            <div className="ha-row-meta">
              <Link href={`/${s.slug}`} className="ha-row-name" prefetch={false}>
                {s.name}
                <BadgeCheck size={12} strokeWidth={2} aria-hidden />
              </Link>
              <div className="ha-row-sub">{giaiDoanLabel(s.giaiDoan)}</div>
            </div>
            <JourneyUserFollowButton
              targetUserId={s.id}
              viewerProfileId={ctx.viewerId}
              compact
            />
          </div>
        ))
      )}
    </ModuleCard>
  );
}
