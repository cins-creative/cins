import { UserRoundPlus } from "lucide-react";

import { HaUserSuggestionRow } from "@/components/cins/home-adaptive/HaUserSuggestionRow";
import { ModuleCard, ModuleEmpty } from "@/components/cins/home-adaptive/ModuleCard";
import type { HomeModuleCtx } from "@/components/cins/home-adaptive/types";
import { loadFollowSuggestions } from "@/lib/cins/home-adaptive/suggestions";
import { giaiDoanLabel } from "@/lib/cins/home-adaptive/labels";

/** Module "Gợi ý theo dõi" — chỉ người dùng (brief §5). Org → module riêng theo persona. */
export async function GoiYTheoDoiModule({ ctx }: { ctx: HomeModuleCtx }) {
  const people = await loadFollowSuggestions(ctx.viewerId, 4);

  if (people.length === 0) {
    return (
      <ModuleCard icon={UserRoundPlus} title="Gợi ý theo dõi">
        <ModuleEmpty>
          Chưa có gợi ý — theo dõi vài người để CINs hiểu bạn hơn.
        </ModuleEmpty>
      </ModuleCard>
    );
  }

  return (
    <ModuleCard icon={UserRoundPlus} title="Gợi ý theo dõi">
      {people.map((s) => (
        <HaUserSuggestionRow
          key={s.id}
          slug={s.slug}
          name={s.name}
          avatarUrl={s.avatarUrl}
          targetUserId={s.id}
          viewerProfileId={ctx.viewerId}
          isFriend={s.isFriend}
          subtitle={
            s.mutualCount > 0
              ? `${s.mutualCount} bạn chung`
              : giaiDoanLabel(s.giaiDoan)
          }
        />
      ))}
    </ModuleCard>
  );
}
