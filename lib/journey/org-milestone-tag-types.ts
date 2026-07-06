/** Payload JSON trong `verify_yeu_cau.noi_dung` — tag milestone vào org. */

export const ORG_MILESTONE_TAG_KIND = "org_milestone_tag_v1" as const;

export type OrgMilestoneTagStatus = "pending" | "approved" | "rejected" | "detached";

export type OrgAttachEvidence = {
  label: string;
  href?: string | null;
  kind: "link" | "file" | "text";
  detail?: string | null;
};

export type OrgMilestoneTagAlbum = {
  title: string;
  href: string;
  excerpt?: string | null;
  coverSrc?: string | null;
  coverAlt?: string | null;
  photoCount?: number | null;
  coverGradient?: string | null;
};

export type OrgMilestoneTagPayload = {
  kind: typeof ORG_MILESTONE_TAG_KIND;
  tacPhamId: string;
  orgLoai: "truong_dai_hoc" | "co_so_dao_tao";
  orgTen: string;
  orgSlug: string;
  orgAvatarUrl?: string | null;
  nam: number;
  khoaHocId?: string | null;
  khoaHocTen?: string | null;
  nganhId?: string | null;
  nganhLabel?: string | null;
  milestoneTitle: string;
  milestoneKind: string;
  projectTitle: string;
  studentName: string;
  studentSlug: string;
  studentAvatarUrl?: string | null;
  album: OrgMilestoneTagAlbum;
  evidence: OrgAttachEvidence[];
  /** ISO — org gỡ sau khi đã duyệt (`verify_yeu_cau.trang_thai` = tu_choi). */
  unlinkedAt?: string | null;
  /** Org bật hiển thị tab Sản phẩm học viên (duyệt ≠ tự hiện). */
  hienThiSanPham?: boolean;
  /** Điểm sắp xếp trên tab công khai — cao hơn = trước. */
  diemSapXep?: number;
};

export type OrgSearchHit = {
  id: string;
  ten: string;
  slug: string;
  loaiToChuc: "truong_dai_hoc" | "co_so_dao_tao";
  avatarUrl: string | null;
  dangTheoDoi: boolean;
};

export type OrgAttachOption = {
  id: string;
  label: string;
  slug?: string | null;
};

export type OrgMilestoneTagRequestItem = {
  id: string;
  status: OrgMilestoneTagStatus;
  taggedAt: string;
  studentUserId: string;
  studentName: string;
  studentSlug: string;
  studentAvatarUrl: string | null;
  projectTitle: string;
  milestoneTitle: string;
  milestoneKind: string;
  nganhLabel: string | null;
  khoaHocTen: string | null;
  nam: number;
  album: OrgMilestoneTagAlbum;
  evidence: OrgAttachEvidence[];
};

/** Yêu cầu gắn org — góc nhìn chủ bài trên Journey. */
export type OrgMilestoneTagOwnerItem = {
  id: string;
  status: OrgMilestoneTagStatus;
  submittedAt: string;
  reviewedAt: string | null;
  orgId: string;
  orgTen: string;
  orgSlug: string;
  orgLoai: "truong_dai_hoc" | "co_so_dao_tao";
  orgAvatarUrl: string | null;
  nam: number;
  khoaHocId: string | null;
  khoaHocTen: string | null;
  nganhId: string | null;
  nganhLabel: string | null;
  milestoneTitle: string;
  projectTitle: string;
  album: OrgMilestoneTagAlbum;
  evidence: OrgAttachEvidence[];
};

export type OrgDoanProjectItem = {
  id: string;
  cotMocId: string;
  nam: number;
  projectTitle: string;
  studentName: string;
  studentSlug: string;
  studentAvatarUrl: string | null;
  nganhLabel: string | null;
  milestoneTitle: string;
  href: string;
  submittedAt: string;
  reactionCount: number;
  coverSrc?: string | null;
  coverAlt?: string | null;
  coverGradient?: string | null;
  photoCount?: number | null;
  tile: "short" | "tall" | "square";
  isVideo?: boolean;
  khoaHocId?: string | null;
  khoaHocTen?: string | null;
  /** Org đã bật hiển thị trên tab Sản phẩm. */
  hienThiSanPham: boolean;
  /** Điểm sắp xếp công khai. */
  diemSapXep: number;
};
