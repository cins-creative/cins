import type { ArticleTagRef } from "@/lib/editor/article-tag";
import type { Block as ServerBlock } from "@/lib/editor/types";
import type {
  CommentIdentityBadge,
  CommentReactionSummary,
} from "@/lib/social/comments/types";

export type MilestonePostAuthor = {
  id: string;
  slug: string;
  tenHienThi: string;
  avatarId: string | null;
};

export type MilestonePostContent = {
  id: string;
  slug: string;
  tieuDe: string;
  moTa: string | null;
  noiDungHtml: string | null;
  /**
   * Canonical block array (server schema `{id, loai, thu_tu, config}`) — dùng
   * cho client-side renderer (`PostRenderer`) để render bài viết theo đúng
   * layout của editor canvas. `null` khi bài chưa có blocks (legacy posts hoặc
   * lỗi parse).
   */
  noiDungBlocks: ServerBlock[] | null;
  coverId: string | null;
  /**
   * Article tags — bài viết (`article_bai_viet`) được tác giả gắn vào post
   * này qua `article_gan_tac_pham`. Render dưới byline trong view, click vào
   * sẽ điều hướng tới trang article tương ứng theo `loai_bai_viet`.
   */
  articleTags: ArticleTagRef[];
  contributors: MilestonePostContributor[];
};

export type MilestonePostContributor = {
  id: string;
  slug: string;
  tenHienThi: string;
  avatarId: string | null;
  vaiTro: string | null;
  laChuSoHuu: boolean;
};

export type MilestonePostComment = {
  id: string;
  noiDung: string;
  taoLuc: string;
  author: (MilestonePostAuthor & { badge?: CommentIdentityBadge | null }) | null;
  isOwn: boolean;
  /** Comment Block v1 */
  idCha?: string | null;
  daXoa?: boolean;
  ghimLuc?: string | null;
  anhDinhKem?: string[];
  reactions?: CommentReactionSummary[];
  replies?: MilestonePostComment[];
};

/** Tổ chức đã xác thực cột mốc — dùng highlight trên PostMetaRail / byline. */
export type MilestonePostVerifier = {
  name: string;
  slug: string | null;
  avatarUrl: string | null;
  href: string | null;
  role: string | null;
  orgKind: "cong_dong" | "truong" | "co_so_dao_tao" | "studio" | null;
};

export type MilestonePostDetail = {
  milestone: {
    id: string;
    tieuDe: string;
    moTa: string | null;
    thoiDiem: string;
    loaiMoc: string;
    cheDoHienThi: "public" | "theo_nhom" | "chi_minh" | "feature" | "cong_dong";
    /**
     * Org đã xác thực cột mốc (`verify_xac_nhan`) — chuỗi hiển thị kiểu `✓ Tên org`
     * (đồng bộ timeline `verifiedBy`). `null` khi chưa xác thực.
     */
    verifiedBy?: string | null;
    /** Chi tiết org xác thực — avatar / link / loại. */
    verifier?: MilestonePostVerifier | null;
  };
  owner: MilestonePostAuthor;
  posts: MilestonePostContent[];
  comments: MilestonePostComment[];
  viewerCanComment: boolean;
  /** True khi viewer chính là owner của cột mốc. Dùng để render nút "Sửa bài". */
  viewerIsOwner: boolean;
  social: {
    viewerLiked: boolean;
    viewerDisliked: boolean;
    viewerBookmarked: boolean;
    /** True khi viewer còn ít nhất một bình luận chưa xóa trên cột mốc. */
    viewerCommented: boolean;
    /** Emoji cảm xúc tích cực của viewer (`heart`, `joy`, …). */
    viewerReactionEmoji?: string | null;
    /** Emoji được thả nhiều nhất trên cột mốc. */
    topReactionEmoji?: string | null;
    likeCount: number;
    dislikeCount: number;
    bookmarkCount: number;
    commentCount: number;
  };
};
