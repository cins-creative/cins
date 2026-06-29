import type { CoAuthorCredit, MilestoneItem } from "@/components/journey/milestone-types";
import { joinVaiTroPositions } from "@/lib/social/vai-tro";

type ViewerProfile = {
  id: string;
  name: string;
  slug?: string | null;
  avatarUrl?: string | null;
};

/** Milestone tagged sau khi accept — sort theo thời điểm chấp nhận + credits có vị trí. */
export function buildAcceptedTaggedMilestone(
  base: MilestoneItem,
  viewer: ViewerProfile,
  positions: ReadonlyArray<string>,
): MilestoneItem {
  const role = joinVaiTroPositions(positions);
  const now = new Date().toISOString();
  const credits: CoAuthorCredit[] = [...(base.coAuthorCredits ?? [])];

  const credit: CoAuthorCredit = {
    idNguoiDung: viewer.id,
    name: viewer.name,
    role,
    slug: viewer.slug ?? null,
    avatarUrl: viewer.avatarUrl ?? null,
    initial: viewer.name.slice(0, 1).toUpperCase(),
    laChuSoHuu: false,
    trangThai: "accepted",
  };

  const existingIdx = credits.findIndex((c) => c.idNguoiDung === viewer.id);
  if (existingIdx >= 0) credits[existingIdx] = credit;
  else credits.push(credit);

  return {
    ...base,
    createdAt: now,
    canProposeCoAuthor: true,
    coAuthorCredits: credits,
  };
}

export function dispatchJourneyTimelineRefresh(ownerSlug: string): void {
  window.dispatchEvent(
    new CustomEvent("cins:journey-timeline-changed", {
      detail: { ownerSlug },
    }),
  );
}
