export type PendingContentVerifyItem = {
  requestId: string;
  cotMocId: string;
  orgId: string;
  studentName: string;
  studentSlug: string;
  projectTitle: string;
  milestoneTitle: string;
  orgTen: string;
  orgSlug: string;
  orgLoai: "truong_dai_hoc" | "co_so_dao_tao";
  nganhLabel: string | null;
  monHocLabel: string | null;
  nam: number;
  thumbUrl: string | null;
  submittedAt: string;
  postUrl: string | null;
  orgUrl: string | null;
};
