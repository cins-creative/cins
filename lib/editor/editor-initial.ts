import type { ArticleTagRef } from "@/lib/editor/article-tag";
import type { Block, LoaiMoc, Visibility } from "@/lib/editor/types";
import type { CoAuthorDraft } from "@/lib/social/types";
import type { BaiDangLoai } from "@/lib/truong/bai-dang";

/**
 * Snapshot bài viết hiện tại (mode="edit"). EditorView seed state từ đây.
 * `blocks` ở dạng server canonical (`Block` schema từ `lib/editor/types`) —
 * EditorView tự convert sang local Block shape ở init state.
 *
 * Type sống ở lib (không import từ client `EditorView`) để API route `/edit`
 * bundle được trên server.
 */
export type EditorInitial = {
  tacPhamId: string;
  cotMocId: string;
  tieuDe: string;
  moTa: string | null;
  coverSeed: string | null;
  /** Danh sách `article_bai_viet` đã tag (xem `article_gan_tac_pham`). */
  tags: ArticleTagRef[];
  visibility: Visibility;
  loaiMoc: LoaiMoc;
  thoiDiem: string;
  blocks: Block[];
  ownerVaiTro?: string;
  coAuthors?: CoAuthorDraft[];
  /** Nhãn cá nhân gắn trên cột mốc (`filter_nhan`). */
  personalFilterIds?: string[];
  /** `org_bai_dang.loai_bai_dang` khi sửa bài trường. */
  orgBaiDangLoai?: BaiDangLoai;
  /** Giờ hẹn đăng (`nhap` + `tao_luc` tương lai). */
  orgBaiDangSchedulePublishAt?: string | null;
};
