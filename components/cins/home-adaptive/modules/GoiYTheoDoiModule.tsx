import { UserRoundPlus } from "lucide-react";
import Link from "next/link";

import { ModuleCard, ModuleEmpty } from "@/components/cins/home-adaptive/ModuleCard";
import { OrgFollowButton } from "@/components/cins/home-adaptive/OrgFollowButton";
import type { HomeModuleCtx } from "@/components/cins/home-adaptive/types";
import { JourneyUserFollowButton } from "@/components/journey/JourneyUserFollowButton";
import {
  loadFollowSuggestions,
  loadOrgFollowSuggestions,
} from "@/lib/cins/home-adaptive/suggestions";
import { giaiDoanLabel } from "@/lib/cins/home-adaptive/labels";

/** Module "Gợi ý theo dõi" — luôn có ở mọi persona (brief §5; org: L21 #1). */
export async function GoiYTheoDoiModule({ ctx }: { ctx: HomeModuleCtx }) {
  const [people, orgs] = await Promise.all([
    loadFollowSuggestions(ctx.viewerId, 4),
    loadOrgFollowSuggestions(ctx.viewerId, 3),
  ]);

  if (people.length === 0 && orgs.length === 0) {
    return (
      <ModuleCard icon={UserRoundPlus} title="Gợi ý theo dõi" constant>
        <ModuleEmpty>
          Chưa có gợi ý — theo dõi vài người để CINs hiểu bạn hơn.
        </ModuleEmpty>
      </ModuleCard>
    );
  }

  return (
    <ModuleCard icon={UserRoundPlus} title="Gợi ý theo dõi" constant>
      {people.map((s) => (
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
            </Link>
            <div className="ha-row-sub">
              {s.mutualCount > 0
                ? `${s.mutualCount} bạn chung`
                : giaiDoanLabel(s.giaiDoan)}
            </div>
          </div>
          <JourneyUserFollowButton
            targetUserId={s.id}
            viewerProfileId={ctx.viewerId}
            compact
          />
        </div>
      ))}

      {orgs.map((o) => (
        <div key={o.id} className="ha-row">
          <Link href={o.href} className="ha-row-av" prefetch={false}>
            {o.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={o.avatarUrl} alt="" width={40} height={40} />
            ) : (
              <span className="ha-row-av-fallback" aria-hidden>
                {o.name.slice(0, 2).toUpperCase()}
              </span>
            )}
          </Link>
          <div className="ha-row-meta">
            <Link href={o.href} className="ha-row-name" prefetch={false}>
              {o.name}
            </Link>
            <div className="ha-row-sub">{o.reason}</div>
          </div>
          <OrgFollowButton orgId={o.id} compact />
        </div>
      ))}
    </ModuleCard>
  );
}
