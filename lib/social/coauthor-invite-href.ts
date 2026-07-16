import type { PendingCoAuthorInvite } from "@/lib/social/types";

export function coAuthorInvitePostHref(
  inv: Pick<PendingCoAuthorInvite, "ownerSlug" | "postSlug" | "orgBaiDang">,
): string | null {
  if (inv.orgBaiDang && inv.ownerSlug) {
    return `/studio/${encodeURIComponent(inv.ownerSlug)}`;
  }
  if (!inv.ownerSlug || !inv.postSlug) return null;
  return `/${encodeURIComponent(inv.ownerSlug)}/p/${encodeURIComponent(inv.postSlug)}`;
}
