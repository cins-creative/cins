import type { TrangThaiDongGop } from "./types";

/** Cùng giới hạn CommentBlock / Journey. */
export const DONG_GOP_COMMENT_MAX_LEN = 1000;

/** `social_binh_luan.loai_doi_tuong` cho thảo luận trên bản đóng góp. */
export const DONG_GOP_COMMENT_LOAI = "article_dong_gop" as const;

/** Bản đóng góp đang hiển thị — cộng đồng đã đăng nhập có thể bình luận. */
export function canCommentOnDongGop(trangThai: TrangThaiDongGop): boolean {
  void trangThai;
  return true;
}
