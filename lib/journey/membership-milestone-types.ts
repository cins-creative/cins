import type { LoaiMoc } from "@/lib/editor/types";
import type { OrgAttachEvidence } from "@/lib/journey/org-milestone-tag-types";
import type { PhraseRecipeId } from "@/lib/journey/milestone-phrase-recipes";

/** Payload JSON trong `verify_yeu_cau.noi_dung` — cột mốc danh tính (Loại 1). */
export const MEMBERSHIP_MILESTONE_KIND = "membership_milestone_v1" as const;

export type MembershipMilestoneOrgLoai =
  | "truong_dai_hoc"
  | "co_so_dao_tao"
  | "studio";

export type MembershipMilestoneSlotOrg = {
  id: string;
  ten: string;
  slug: string;
  loaiToChuc: MembershipMilestoneOrgLoai;
  avatarUrl: string | null;
};

export type MembershipMilestoneSlotEnum = {
  value: string;
  label: string;
};

export type MembershipMilestoneSlotAttach = {
  id: string;
  label: string;
};

export type MembershipMilestoneSlotText = {
  value: string;
};

export type MembershipMilestoneSlotMonthYear = {
  month: number;
  year: number;
};

export type MembershipMilestoneSlotValues = {
  hanh_dong?: MembershipMilestoneSlotEnum;
  to_chuc?: MembershipMilestoneSlotOrg;
  vai_tro?: MembershipMilestoneSlotEnum;
  vi_tri?: MembershipMilestoneSlotText;
  context?: MembershipMilestoneSlotAttach;
  thoi_diem?: MembershipMilestoneSlotMonthYear;
};

export type MembershipMilestonePayload = {
  kind: typeof MEMBERSHIP_MILESTONE_KIND;
  recipeId: PhraseRecipeId;
  loaiMoc: LoaiMoc;
  tieuDe: string;
  moTa: string;
  slots: MembershipMilestoneSlotValues;
  evidence: OrgAttachEvidence[];
  /** Hiển thị sau khi org duyệt — lúc chờ luôn `chi_minh`. */
  visibilityAfterVerify: "public" | "theo_nhom" | "chi_minh";
};

export type MembershipMilestoneSearchHit = MembershipMilestoneSlotOrg & {
  dangTheoDoi: boolean;
};

export type SubmitMembershipMilestoneInput = {
  ownerSlug: string;
  recipeId: PhraseRecipeId;
  slots: MembershipMilestoneSlotValues;
  evidence: OrgAttachEvidence[];
  visibilityAfterVerify: "public" | "theo_nhom" | "chi_minh";
};

/** Yêu cầu cột mốc danh tính user đã gửi — chờ org duyệt (banner Journey). */
export type OutboundMembershipPending = {
  cotMocId: string;
  requestId: string;
  title: string;
  body: string | null;
  orgTen: string;
  orgAvatarUrl: string | null;
  orgHref: string | null;
  submittedAt: string;
};
