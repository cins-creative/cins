import type { MilestoneItem } from "@/components/journey/milestone-types";

export const COAUTHOR_INVITE_ACCEPTED_EVENT = "cins:coauthor-invite-accepted";
export const COAUTHOR_INVITE_DECLINED_EVENT = "cins:coauthor-invite-declined";
export const COAUTHOR_INVITE_FAILED_EVENT = "cins:coauthor-invite-failed";

export type CoAuthorInviteAcceptedDetail = {
  ownerSlug: string;
  tacPhamId: string;
  milestone: MilestoneItem;
};

export type CoAuthorInviteDeclinedDetail = {
  ownerSlug: string;
  tacPhamId: string;
};

export type CoAuthorInviteFailedDetail = {
  ownerSlug: string;
  tacPhamId: string;
  action: "accepted" | "declined";
  error: string;
};

export function dispatchCoAuthorInviteAccepted(
  detail: CoAuthorInviteAcceptedDetail,
): void {
  window.dispatchEvent(
    new CustomEvent<CoAuthorInviteAcceptedDetail>(COAUTHOR_INVITE_ACCEPTED_EVENT, {
      detail,
    }),
  );
}

export function dispatchCoAuthorInviteDeclined(
  detail: CoAuthorInviteDeclinedDetail,
): void {
  window.dispatchEvent(
    new CustomEvent<CoAuthorInviteDeclinedDetail>(COAUTHOR_INVITE_DECLINED_EVENT, {
      detail,
    }),
  );
}

export function dispatchCoAuthorInviteFailed(
  detail: CoAuthorInviteFailedDetail,
): void {
  window.dispatchEvent(
    new CustomEvent<CoAuthorInviteFailedDetail>(COAUTHOR_INVITE_FAILED_EVENT, {
      detail,
    }),
  );
}
