/** Màu khung card «Lưu về» — theo loại tổ chức / nguồn ngoài. */
export type BookmarkFrameKind =
  | "truong_dai_hoc"
  | "co_so_dao_tao"
  | "studio"
  | "cong_dong"
  | "user";

export const BOOKMARK_FRAME_LABEL: Record<BookmarkFrameKind, string> = {
  truong_dai_hoc: "Trường ĐH",
  co_so_dao_tao: "Cơ sở đào tạo",
  studio: "Studio",
  cong_dong: "Cộng đồng",
  user: "Người khác",
};

export function bookmarkFrameCssKind(kind: BookmarkFrameKind): string {
  return kind.replace(/_/g, "-");
}

export function mapOrgLoaiToBookmarkFrameKind(
  loai: string | null | undefined,
): BookmarkFrameKind {
  switch (loai) {
    case "truong_dai_hoc":
      return "truong_dai_hoc";
    case "co_so_dao_tao":
      return "co_so_dao_tao";
    case "studio":
    case "doanh_nghiep":
      return "studio";
    case "cong_dong":
      return "cong_dong";
    default:
      return "user";
  }
}

export function resolveBookmarkFrameKind(input: {
  bookmark?: { sourceKind?: BookmarkFrameKind | null } | null;
  orgBaiDangRef?: unknown | null;
  congDongOrg?: unknown | null;
}): BookmarkFrameKind {
  if (input.bookmark?.sourceKind) return input.bookmark.sourceKind;
  if (input.congDongOrg) return "cong_dong";
  if (input.orgBaiDangRef) return "truong_dai_hoc";
  return "user";
}
