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
  reactions?: CommentReactionSummary[];
  replies?: MilestonePostComment[];
};

export type MilestonePostDetail = {
  milestone: {
    id: string;
    tieuDe: string;
    moTa: string | null;
    thoiDiem: string;
    loaiMoc: string;
    cheDoHienThi: "public" | "theo_nhom" | "chi_minh" | "feature";
  };
  owner: MilestonePostAuthor;
  posts: MilestonePostContent[];
  comments: MilestonePostComment[];
  viewerCanComment: boolean;
  /** True khi viewer chính là owner của cột mốc. Dùng để render nút "Sửa bài". */
  viewerIsOwner: boolean;
  social: {
    viewerLiked: boolean;
    viewerBookmarked: boolean;
    likeCount: number;
    bookmarkCount: number;
    commentCount: number;
  };
};
