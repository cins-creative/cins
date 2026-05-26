"use client";

import {
  ExternalLink,
  Globe,
  Lock,
  Pencil,
  Star,
  Trash2,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";

import {
  addMilestoneComment,
  deleteMilestoneComment,
  type MilestonePostComment,
  type MilestonePostDetail,
} from "@/app/[slug]/journey/actions";
import {
  PostBlocksRenderer,
  PostCover,
} from "@/components/editor/PostRenderer";

import { PostActionsRail } from "./PostActionsRail";

/* ╔══════════════════════════════════════════════════════════════════╗
   ║ JourneyPostBody — view layout cho bài viết. ĐỒNG BỘ với editor   ║
   ║ canvas (`EditorView`):                                           ║
   ║                                                                  ║
   ║   • Cover full-width 200px (giống editor cover-add.has)          ║
   ║   • Title (38px, font-sans, weight 800)                          ║
   ║   • Sub (19px, font-serif italic)                                ║
   ║   • Tag chips (meta-chips row)                                   ║
   ║   • Blocks (cùng class `.block` `.b-text` `.b-imgs` …)           ║
   ║   • Byline (author chip + ngày + chế độ hiển thị)                ║
   ║   • Comments                                                     ║
   ║                                                                  ║
   ║ Wrap container = `.cins-editor-page.cins-post-view` để áp dụng   ║
   ║ editor.css; override read-only spacing trong post-view.css.     ║
   ║                                                                  ║
   ║ Cạnh phải: `PostActionsRail` (Like · Lưu · Chia sẻ + popover).   ║
   ╚══════════════════════════════════════════════════════════════════╝ */

const TYPE_LABEL: Record<string, string> = {
  hoc: "Học",
  lam_viec: "Làm việc",
  du_an: "Dự án",
  su_kien: "Sự kiện",
  thanh_tuu: "Thành tựu",
  ca_nhan: "Cá nhân",
};

const VIS_LABEL: Record<string, { Icon: LucideIcon; text: string }> = {
  feature: { Icon: Star, text: "Nổi bật" },
  public: { Icon: Globe, text: "Công khai" },
  theo_nhom: { Icon: Users, text: "Theo nhóm" },
  chi_minh: { Icon: Lock, text: "Chỉ mình tôi" },
};

type Props = {
  initialDetail: MilestonePostDetail;
  postSlug?: string | null;
  isOwner?: boolean;
  /** Khi true → không render link permalink "Mở bài viết" (đang ở permalink rồi). */
  hideOpenLink?: boolean;
};

export function JourneyPostBody({
  initialDetail,
  postSlug,
  isOwner = false,
  hideOpenLink = false,
}: Props) {
  const [detail, setDetail] = useState<MilestonePostDetail>(initialDetail);
  const { milestone, owner, posts, comments, viewerCanComment } = detail;

  /* `posts[0]` là tác phẩm chính. Khi cột mốc có nhiều tác phẩm (lượt sau)
     sẽ render tuần tự — hiện tại UI editor chỉ tạo 1 tác phẩm/cột mốc. */
  const mainPost = posts[0];
  const coverSeed = mainPost?.coverId ?? null;
  const heroTitle =
    milestone.tieuDe || mainPost?.tieuDe || "Cột mốc không tiêu đề";
  const heroSub = milestone.moTa || mainPost?.moTa || null;
  const blocks = mainPost?.noiDungBlocks ?? null;

  const typeLabel = TYPE_LABEL[milestone.loaiMoc] ?? "Cột mốc";
  const vis = VIS_LABEL[milestone.cheDoHienThi] ?? VIS_LABEL.public;
  const dateLabel = formatVnDate(milestone.thoiDiem);
  const ownerInitial = (owner.tenHienThi || owner.slug)
    .charAt(0)
    .toUpperCase();

  const editHref =
    isOwner && postSlug ? `/${owner.slug}/p/${postSlug}/edit` : null;
  const permalinkHref =
    !hideOpenLink && postSlug ? `/${owner.slug}/p/${postSlug}` : null;

  /* Absolute URL cho share targets (chỉ build client-side để có origin). */
  const [absoluteUrl, setAbsoluteUrl] = useState("");
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (postSlug) {
      setAbsoluteUrl(
        `${window.location.origin}/${owner.slug}/p/${postSlug}`,
      );
    } else {
      setAbsoluteUrl(window.location.href);
    }
  }, [owner.slug, postSlug]);

  const coverImageUrl = useMemo(() => {
    if (!coverSeed) return null;
    /* Picsum seed → URL absolute để Pinterest pin có ảnh. */
    return `https://picsum.photos/seed/${encodeURIComponent(
      coverSeed,
    )}/1200/800`;
  }, [coverSeed]);

  function onCommentAdded(c: MilestonePostComment) {
    setDetail((d) => ({ ...d, comments: [...d.comments, c] }));
  }
  function onCommentDeleted(id: string) {
    setDetail((d) => ({
      ...d,
      comments: d.comments.filter((c) => c.id !== id),
    }));
  }

  return (
    <div className="cins-editor-page cins-post-view">
      <PostActionsRail
        shareUrl={absoluteUrl}
        title={heroTitle}
        coverImageUrl={coverImageUrl}
      />

      <main className="editor-canvas post-canvas" aria-label="Bài viết">
        <PostCover seed={coverSeed} />

        <h1 className="title-in title-ro">{heroTitle}</h1>
        {heroSub ? <p className="sub-in sub-ro">{heroSub}</p> : null}

        <div className="post-byline">
          <Link
            href={`/${owner.slug}/journey`}
            className="post-byline-author"
            prefetch={false}
          >
            <span className="post-byline-avatar" aria-hidden>
              {ownerInitial}
            </span>
            <span className="post-byline-name">
              <strong>{owner.tenHienThi}</strong>
              <span className="post-byline-handle">@{owner.slug}</span>
            </span>
          </Link>
          <span className="post-byline-dot" aria-hidden>
            ·
          </span>
          <span className="post-byline-date">{dateLabel}</span>
          <span className="post-byline-dot" aria-hidden>
            ·
          </span>
          <span
            className="post-byline-type"
            aria-label={`Loại cột mốc: ${typeLabel}`}
          >
            <span aria-hidden>▦</span>
            <span>{typeLabel}</span>
          </span>
          <span
            className={`post-byline-vis post-byline-vis--${milestone.cheDoHienThi}`}
            aria-label={vis.text}
          >
            <vis.Icon
              size={13}
              strokeWidth={1.8}
              aria-hidden
              {...(milestone.cheDoHienThi === "feature"
                ? { fill: "currentColor" }
                : {})}
            />
            <span>{vis.text}</span>
          </span>
          <span className="post-byline-spacer" />
          {editHref ? (
            <Link href={editHref} className="post-byline-action">
              <Pencil size={13} strokeWidth={1.8} aria-hidden />
              <span>Sửa bài</span>
            </Link>
          ) : null}
          {permalinkHref ? (
            <Link href={permalinkHref} className="post-byline-action">
              <ExternalLink size={13} strokeWidth={1.8} aria-hidden />
              <span>Mở bài viết</span>
            </Link>
          ) : null}
        </div>

        {blocks && blocks.length > 0 ? (
          <PostBlocksRenderer blocks={blocks} />
        ) : mainPost?.noiDungHtml ? (
          /* Fallback cho bài cũ chưa có `noi_dung_blocks` — render HTML đã
             được server escape an toàn từ `blocksToHtml`. */
          <div
            className="post-html-fallback article-rich-content"
            dangerouslySetInnerHTML={{ __html: mainPost.noiDungHtml }}
          />
        ) : (
          <div className="post-empty">
            Cột mốc này chưa có nội dung chi tiết.
          </div>
        )}

        <hr className="post-divider" />

        <CommentSection
          milestoneId={milestone.id}
          comments={comments}
          viewerCanComment={viewerCanComment}
          onCommentAdded={onCommentAdded}
          onCommentDeleted={onCommentDeleted}
        />
      </main>
    </div>
  );
}

/* ─── Comments ──────────────────────────────────────────────────── */

type CommentSectionProps = {
  milestoneId: string;
  comments: ReadonlyArray<MilestonePostComment>;
  viewerCanComment: boolean;
  onCommentAdded(c: MilestonePostComment): void;
  onCommentDeleted(id: string): void;
};

function CommentSection({
  milestoneId,
  comments,
  viewerCanComment,
  onCommentAdded,
  onCommentDeleted,
}: CommentSectionProps) {
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    setErr(null);
    startTransition(async () => {
      const res = await addMilestoneComment(milestoneId, value);
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      onCommentAdded({
        id: res.data.id,
        noiDung: res.data.noiDung,
        taoLuc: res.data.taoLuc,
        author: res.data.author,
        isOwn: true,
      });
      setText("");
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Xoá bình luận này?")) return;
    startTransition(async () => {
      const res = await deleteMilestoneComment(id);
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      onCommentDeleted(id);
    });
  }

  return (
    <section className="post-comments" aria-label="Bình luận">
      <header className="post-comments-head">
        <h2>Bình luận</h2>
        <span className="post-comments-count">{comments.length}</span>
      </header>

      {viewerCanComment ? (
        <form className="post-comments-form" onSubmit={handleSubmit}>
          <input
            className="post-comments-input"
            placeholder="Viết bình luận…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={1000}
            disabled={pending}
          />
          <button
            type="submit"
            className="post-comments-send"
            disabled={pending || !text.trim()}
          >
            {pending ? "Đang gửi…" : "Gửi"}
          </button>
        </form>
      ) : (
        <div className="post-comments-login">
          <a href="/login">Đăng nhập</a> để bình luận.
        </div>
      )}

      {err ? <div className="post-comments-err">{err}</div> : null}

      {comments.length === 0 ? (
        <div className="post-comments-empty">
          Chưa có bình luận nào. Bạn là người đầu tiên ✨
        </div>
      ) : (
        <ol className="post-comments-list">
          {comments.map((c) => (
            <CommentItem key={c.id} comment={c} onDelete={handleDelete} />
          ))}
        </ol>
      )}
    </section>
  );
}

function CommentItem({
  comment,
  onDelete,
}: {
  comment: MilestonePostComment;
  onDelete(id: string): void;
}) {
  const initial = (
    comment.author?.tenHienThi ||
    comment.author?.slug ||
    "?"
  )
    .charAt(0)
    .toUpperCase();
  return (
    <li className="post-comments-item">
      <span className="post-comments-avatar" aria-hidden>
        {initial}
      </span>
      <div className="post-comments-bub">
        <div className="post-comments-top">
          <span className="post-comments-name">
            {comment.author?.tenHienThi ?? "Người dùng"}
          </span>
          <span className="post-comments-time">
            {formatRelative(comment.taoLuc)}
          </span>
          {comment.isOwn ? (
            <button
              type="button"
              className="post-comments-del"
              onClick={() => onDelete(comment.id)}
              aria-label="Xoá bình luận"
            >
              <Trash2 size={13} strokeWidth={1.7} aria-hidden />
            </button>
          ) : null}
        </div>
        <div className="post-comments-text">{comment.noiDung}</div>
      </div>
    </li>
  );
}

/* ─── Helpers ───────────────────────────────────────────────────── */

function formatVnDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

function formatRelative(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "vừa xong";
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} ngày trước`;
  return formatVnDate(iso);
}
