import type { ForeignJourneyVisibility } from "@/lib/journey/foreign-milestone-visibility";

/** `social_luu.che_do_hien_thi` — enum `che_do_luu_enum` (private | public). */
export type BookmarkCheDoLuu = "private" | "public";

export function mapBookmarkUiToCheDoLuu(
  visibility: string | undefined,
): BookmarkCheDoLuu {
  return visibility === "private" ? "private" : "public";
}

/** Map lưu DB → hiển thị trên Journey viewer (khi chưa có `che_do_hien_thi_journey`). */
export function mapCheDoLuuToForeignJourney(
  cheDo: string | null | undefined,
): ForeignJourneyVisibility {
  return cheDo === "private" ? "chi_minh" : "public";
}

/** Ưu tiên `che_do_hien_thi_journey`; fallback enum cũ `che_do_hien_thi`. */
export function resolveBookmarkJourneyVisibility(
  cheDoHienThiJourney: string | null | undefined,
  cheDoHienThi: string | null | undefined,
): ForeignJourneyVisibility {
  if (
    cheDoHienThiJourney === "feature" ||
    cheDoHienThiJourney === "public" ||
    cheDoHienThiJourney === "chi_minh"
  ) {
    return cheDoHienThiJourney;
  }
  return mapCheDoLuuToForeignJourney(cheDoHienThi);
}

/**
 * Bookmark «Chỉ mình tôi» — ẩn với khách; chủ Journey vẫn thấy trên tab Lưu về / timeline của mình.
 */
export function isBookmarkHiddenOnViewerJourney(
  journeyVisibility: string | null | undefined,
  isOwner: boolean,
): boolean {
  if (isOwner) return false;
  return journeyVisibility === "chi_minh";
}
