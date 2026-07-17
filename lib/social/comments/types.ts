import type { MilestonePostAuthor } from "@/lib/journey/milestone-post-types";

/** Badge định danh — org verified hoặc giai đoạn (không dùng bio). */
export type CommentIdentityBadge =
  | {
      kind: "org";
      vaiTroLabel: string;
      orgTen: string;
      orgSlug: string;
    }
  | {
      kind: "giai_doan";
      label: string;
    };

export type CommentReactionSummary = {
  emoji: string;
  count: number;
  viewerReacted: boolean;
};

export type CommentAuthor = MilestonePostAuthor & {
  badge: CommentIdentityBadge | null;
};

export type MilestonePostCommentV1 = {
  id: string;
  noiDung: string;
  taoLuc: string;
  idCha: string | null;
  daXoa: boolean;
  ghimLuc: string | null;
  /** Cloudflare Images id — tối đa 4. */
  anhDinhKem?: string[];
  author: CommentAuthor | null;
  isOwn: boolean;
  reactions: CommentReactionSummary[];
  replies: MilestonePostCommentV1[];
};

/** Emoji key lưu DB → hiển thị UI. Like/dislike khớp cột mốc (`REACTION_EMOJI`). */
export const COMMENT_REACTION_EMOJIS = [
  { key: "heart", label: "❤️" },
  { key: "dislike", label: "👎" },
  { key: "thumbsup", label: "👍" },
  { key: "joy", label: "😂" },
  { key: "wow", label: "😮" },
  { key: "sad", label: "😢" },
  { key: "angry", label: "😡" },
  { key: "party", label: "🎉" },
  { key: "fire", label: "🔥" },
  { key: "clap", label: "👏" },
  { key: "hundred", label: "💯" },
] as const;

export type CommentReactionKey = (typeof COMMENT_REACTION_EMOJIS)[number]["key"];

export const COMMENT_REACTION_KEYS = new Set<string>(
  COMMENT_REACTION_EMOJIS.map((e) => e.key),
);

export function commentReactionLabel(key: string): string {
  return COMMENT_REACTION_EMOJIS.find((e) => e.key === key)?.label ?? key;
}
