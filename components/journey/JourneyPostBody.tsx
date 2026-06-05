"use client";

import {
  ExternalLink,
  Globe,
  Lock,
  MoreHorizontal,
  Pencil,
  Star,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";

import {
  addMilestoneComment,
  deleteMilestoneComment,
  editMilestoneComment,
  type MilestonePostComment,
  type MilestonePostContributor,
  type MilestonePostDetail,
} from "@/app/[slug]/journey/actions";
import { PostBlockRenderer } from "@/components/journey/PostBlockRenderer";
import { PostCover } from "@/components/editor/PostRenderer";
import { JourneyMilestoneOwnerMenu } from "@/components/journey/JourneyMilestoneOwnerMenu";
import { JourneyUserPopover } from "@/components/journey/JourneyUserPopover";
import { articlePublicHref } from "@/lib/articles/article-href";
import { articleTagLoaiClass } from "@/lib/editor/article-tag";
import {
  mapCheDoToMilestoneVisibility,
  mapLoaiMocToMilestoneType,
} from "@/lib/journey/milestone-ui-map";
import { isMediaPost } from "@/lib/journey/post-media";
import { getAvatarUrl } from "@/lib/journey/profile";

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
   ║ Wrap = `main.cins-editor-page.cins-post-view.editor-canvas` — một    ║
   ║ khối duy nhất (modal + permalink), không wrapper thừa bên ngoài.  ║
   ║                                                                  ║
   ║ Cạnh phải byline: `PostActionsRail` (Thích · Lưu · BL · Chia sẻ).  ║
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
  /** Thay thế khối bình luận mặc định — dùng cho Suspense stream. */
  commentsSlot?: React.ReactNode;
  /** Ghi đè số bình luận trên action rail khi comments stream riêng. */
  commentCountOverride?: number;
  /** Sau khi owner đổi loại/hiển thị/xoá từ menu — refetch detail (modal). */
  onMilestoneUpdated?: () => void;
};

export function JourneyPostBody({
  initialDetail,
  postSlug,
  isOwner = false,
  hideOpenLink = false,
  commentsSlot,
  commentCountOverride,
  onMilestoneUpdated,
}: Props) {
  const [detail, setDetail] = useState<MilestonePostDetail>(initialDetail);
  const { milestone, owner, posts, comments, viewerCanComment, social } = detail;

  useEffect(() => {
    queueMicrotask(() => setDetail(initialDetail));
  }, [initialDetail]);

  /* `posts[0]` là tác phẩm chính. Khi cột mốc có nhiều tác phẩm (lượt sau)
     sẽ render tuần tự — hiện tại UI editor chỉ tạo 1 tác phẩm/cột mốc. */
  const mainPost = posts[0];
  const coverSeed = mainPost?.coverId ?? null;
  const heroTitle =
    milestone.tieuDe || mainPost?.tieuDe || "Cột mốc không tiêu đề";
  const heroSub = milestone.moTa || mainPost?.moTa || null;
  const blocks = mainPost?.noiDungBlocks ?? null;
  const mediaPost = isMediaPost(blocks);

  const typeLabel = TYPE_LABEL[milestone.loaiMoc] ?? "Cột mốc";
  const vis = VIS_LABEL[milestone.cheDoHienThi] ?? VIS_LABEL.public;
  const dateLabel = formatVnDate(milestone.thoiDiem);
  const ownerInitial = (owner.tenHienThi || owner.slug)
    .charAt(0)
    .toUpperCase();
  const ownerAvatarUrl = getAvatarUrl(owner.avatarId);

  const permalinkHref =
    !hideOpenLink && postSlug ? `/${owner.slug}/p/${postSlug}` : null;
  const sharePath = postSlug ? `/${owner.slug}/p/${postSlug}` : null;

  function onCommentAdded(c: MilestonePostComment) {
    setDetail((d) => ({ ...d, comments: [...d.comments, c] }));
  }
  function onCommentDeleted(id: string) {
    setDetail((d) => ({
      ...d,
      comments: d.comments.filter((c) => c.id !== id),
    }));
  }
  function onCommentEdited(id: string, noiDung: string) {
    setDetail((d) => ({
      ...d,
      comments: d.comments.map((c) =>
        c.id === id ? { ...c, noiDung } : c,
      ),
    }));
  }

  return (
    <main
      className={`cins-editor-page cins-post-view editor-canvas post-canvas${mediaPost ? " post-canvas--media" : ""}`}
      aria-label="Bài viết"
    >
        {!mediaPost ? <PostCover seed={coverSeed} /> : null}

        {!mediaPost ? (
          <>
            <h1 className="title-in title-ro">{heroTitle}</h1>
            {heroSub ? <p className="sub-in sub-ro">{heroSub}</p> : null}
          </>
        ) : null}

        <div className="post-byline">
          <Link
            href={`/${owner.slug}`}
            className="post-byline-author"
            prefetch={false}
          >
            <span className="post-byline-avatar" aria-hidden>
              {ownerAvatarUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={ownerAvatarUrl} alt="" />
              ) : (
                ownerInitial
              )}
            </span>
            <span className="post-byline-name">
              <strong>{owner.tenHienThi}</strong>
              <span className="post-byline-handle">{dateLabel}</span>
            </span>
          </Link>
          {isOwner ? (
            <>
              <span className="post-byline-spacer" />
              <PostActionsRail
                milestoneId={milestone.id}
                initialLiked={social.viewerLiked}
                initialBookmarked={social.viewerBookmarked}
                likeCount={social.likeCount}
                bookmarkCount={social.bookmarkCount}
                commentCount={commentCountOverride ?? comments.length}
                showCounts={detail.viewerIsOwner}
                canBookmark={!isOwner}
                sharePath={sharePath}
                shareTitle={heroTitle}
              />
              <JourneyMilestoneOwnerMenu
                className="post-byline-menu"
                milestoneId={milestone.id}
                ownerSlug={owner.slug}
                currentType={mapLoaiMocToMilestoneType(milestone.loaiMoc)}
                currentVisibility={mapCheDoToMilestoneVisibility(
                  milestone.cheDoHienThi,
                )}
                postSlug={postSlug ?? null}
                onAfterChange={onMilestoneUpdated}
              />
            </>
          ) : (
            <>
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
              {permalinkHref ? (
                <Link href={permalinkHref} className="post-byline-action">
                  <ExternalLink size={13} strokeWidth={1.8} aria-hidden />
                  <span>Mở bài viết</span>
                </Link>
              ) : null}
              <PostActionsRail
                milestoneId={milestone.id}
                initialLiked={social.viewerLiked}
                initialBookmarked={social.viewerBookmarked}
                likeCount={social.likeCount}
                bookmarkCount={social.bookmarkCount}
                commentCount={commentCountOverride ?? comments.length}
                showCounts={detail.viewerIsOwner}
                canBookmark={!isOwner}
                sharePath={sharePath}
                shareTitle={heroTitle}
              />
            </>
          )}
        </div>

        {mainPost && mainPost.articleTags.length > 0 ? (
          <div className="post-art-tags" aria-label="Bài viết liên quan">
            {mainPost.articleTags.map((t) => (
              <Link
                key={t.id}
                href={articlePublicHref(t.loai_bai_viet, t.slug)}
                className={`post-art-tag ${articleTagLoaiClass(t.loai_bai_viet)}`}
                prefetch={false}
              >
                #{t.tieu_de}
              </Link>
            ))}
          </div>
        ) : null}

        {mainPost ? (
          <PostContributors contributors={mainPost.contributors} />
        ) : null}

        {blocks && blocks.length > 0 ? (
          <PostBlockRenderer blocks={blocks} />
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

        {commentsSlot ?? (
          <JourneyPostCommentsBlock
            milestoneId={milestone.id}
            comments={comments}
            viewerCanComment={viewerCanComment}
            onCommentAdded={onCommentAdded}
            onCommentDeleted={onCommentDeleted}
            onCommentEdited={onCommentEdited}
          />
        )}
      </main>
  );
}

function shouldShowPostContributors(
  contributors: ReadonlyArray<MilestonePostContributor>,
): boolean {
  if (contributors.length === 0) return false;
  if (contributors.length === 1 && contributors[0]?.laChuSoHuu) return false;
  return true;
}

function PostContributors({
  contributors,
}: {
  contributors: ReadonlyArray<MilestonePostContributor>;
}) {
  if (!shouldShowPostContributors(contributors)) return null;

  return (
    <section className="post-contributors" aria-label="Người đóng góp dự án">
      <div className="post-contributors-head">
        <span>Người đóng góp dự án</span>
        <strong>{contributors.length}</strong>
      </div>
      <div className="post-contributor-list">
        {contributors.map((c) => {
          const avatarUrl = getAvatarUrl(c.avatarId);
          const initial = (c.tenHienThi || c.slug || "?").charAt(0).toUpperCase();
          const body = (
            <>
              <span className="post-contributor-avatar" aria-hidden>
                {avatarUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={avatarUrl} alt="" />
                ) : (
                  initial
                )}
              </span>
              <span className="post-contributor-copy">
                <strong>{c.tenHienThi}</strong>
                <span>
                  {c.laChuSoHuu ? "Chủ bài viết" : c.vaiTro || "Cộng sự"}
                </span>
              </span>
            </>
          );
          return (
            <JourneyUserPopover
              key={c.id}
              slug={c.slug}
              fallbackName={c.tenHienThi}
              fallbackAvatarUrl={avatarUrl}
            >
              <span className="post-contributor-card">{body}</span>
            </JourneyUserPopover>
          );
        })}
      </div>
    </section>
  );
}

/* ─── Comments ──────────────────────────────────────────────────── */

type CommentSectionProps = {
  milestoneId: string;
  comments: ReadonlyArray<MilestonePostComment>;
  viewerCanComment: boolean;
  onCommentAdded(c: MilestonePostComment): void;
  onCommentDeleted(id: string): void;
  onCommentEdited(id: string, noiDung: string): void;
};

export function JourneyPostCommentsBlock({
  milestoneId,
  comments,
  viewerCanComment,
  onCommentAdded,
  onCommentDeleted,
  onCommentEdited,
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

  /* `editMilestoneComment` async — không bọc startTransition vì
     CommentItem giữ local pending state riêng (UI inline edit cần
     disable input của chính nó, không phải toàn section). */
  async function handleEdit(
    id: string,
    next: string,
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    const res = await editMilestoneComment(id, next);
    if (!res.ok) return { ok: false, error: res.error };
    onCommentEdited(id, res.data.noiDung);
    return { ok: true };
  }

  return (
    <section className="post-comments" id="post-comments" aria-label="Bình luận">
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
          <Link href="/login">Đăng nhập</Link> để bình luận.
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
            <CommentItem
              key={c.id}
              comment={c}
              onDelete={handleDelete}
              onEdit={handleEdit}
            />
          ))}
        </ol>
      )}
    </section>
  );
}

function CommentItem({
  comment,
  onDelete,
  onEdit,
}: {
  comment: MilestonePostComment;
  onDelete(id: string): void;
  onEdit(
    id: string,
    next: string,
  ): Promise<{ ok: true } | { ok: false; error: string }>;
}) {
  const initial = (
    comment.author?.tenHienThi ||
    comment.author?.slug ||
    "?"
  )
    .charAt(0)
    .toUpperCase();
  const avatarUrl = getAvatarUrl(comment.author?.avatarId ?? null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.noiDung);
  const [saving, setSaving] = useState(false);
  const [editErr, setEditErr] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  /* Sync draft khi comment.noiDung đổi từ ngoài (sau save thành công
     parent state cập nhật → comment prop mới flow vào đây). */
  useEffect(() => {
    if (!editing) queueMicrotask(() => setDraft(comment.noiDung));
  }, [comment.noiDung, editing]);

  /* Đóng kebab menu khi click outside / nhấn Esc — chỉ active khi mở
     để tránh attach listener không cần thiết cho hàng loạt comment. */
  useEffect(() => {
    if (!menuOpen) return;
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  /* Auto-focus + đặt caret cuối khi enter edit mode. */
  useEffect(() => {
    if (!editing) return;
    const el = textareaRef.current;
    if (!el) return;
    el.focus();
    const len = el.value.length;
    el.setSelectionRange(len, len);
  }, [editing]);

  function startEdit() {
    setMenuOpen(false);
    setEditErr(null);
    setDraft(comment.noiDung);
    setEditing(true);
  }
  function cancelEdit() {
    setEditing(false);
    setDraft(comment.noiDung);
    setEditErr(null);
  }
  async function saveEdit() {
    const next = draft.trim();
    if (!next) {
      setEditErr("Nội dung bình luận trống.");
      return;
    }
    if (next === comment.noiDung) {
      setEditing(false);
      return;
    }
    setSaving(true);
    setEditErr(null);
    const res = await onEdit(comment.id, next);
    setSaving(false);
    if (!res.ok) {
      setEditErr(res.error);
      return;
    }
    setEditing(false);
  }

  return (
    <li className="post-comments-item">
      <div className="post-comments-bub">
        <div className="post-comments-top">
          <span className="post-comments-avatar" aria-hidden>
            {avatarUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={avatarUrl} alt="" />
            ) : (
              initial
            )}
          </span>
          <span className="post-comments-author">
            <span className="post-comments-name">
              {comment.author?.tenHienThi ?? "Người dùng"}
            </span>
            <span className="post-comments-time">
              {formatRelative(comment.taoLuc)}
            </span>
          </span>
          {comment.isOwn && !editing ? (
            <div
              className={`post-comments-menu${menuOpen ? " open" : ""}`}
              ref={wrapRef}
            >
              <button
                type="button"
                className="post-comments-more"
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="Hành động bình luận"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                <MoreHorizontal size={15} strokeWidth={1.8} aria-hidden />
              </button>
              {menuOpen ? (
                <div
                  className="post-comments-menu-pop"
                  role="menu"
                >
                  <button
                    type="button"
                    role="menuitem"
                    className="post-comments-menu-item"
                    onClick={startEdit}
                  >
                    <Pencil size={14} strokeWidth={1.7} aria-hidden />
                    <span>Sửa</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="post-comments-menu-item post-comments-menu-item-danger"
                    onClick={() => {
                      setMenuOpen(false);
                      onDelete(comment.id);
                    }}
                  >
                    <span>Xoá</span>
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
        {editing ? (
          <div className="post-comments-edit">
            <textarea
              ref={textareaRef}
              className="post-comments-edit-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={1000}
              rows={Math.min(6, Math.max(2, draft.split("\n").length))}
              disabled={saving}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault();
                  cancelEdit();
                } else if (
                  e.key === "Enter" &&
                  (e.metaKey || e.ctrlKey)
                ) {
                  e.preventDefault();
                  void saveEdit();
                }
              }}
            />
            {editErr ? (
              <div className="post-comments-edit-err">{editErr}</div>
            ) : null}
            <div className="post-comments-edit-actions">
              <button
                type="button"
                className="post-comments-edit-cancel"
                onClick={cancelEdit}
                disabled={saving}
              >
                Huỷ
              </button>
              <button
                type="button"
                className="post-comments-edit-save"
                onClick={() => void saveEdit()}
                disabled={saving || !draft.trim()}
              >
                {saving ? "Đang lưu…" : "Lưu"}
              </button>
            </div>
          </div>
        ) : (
          <div className="post-comments-text">{comment.noiDung}</div>
        )}
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
