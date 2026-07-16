"use client";

import {
  Copy,
  ImagePlus,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Pin,
  PinOff,
  Reply,
  Send,
  Smile,
  Trash2,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import {
  addMilestoneCommentV1,
  hideMilestoneCommentByOwner,
  pinMilestoneComment,
  toggleCommentReaction,
} from "@/app/[slug]/journey/comment-actions";
import {
  deleteMilestoneComment,
  editMilestoneComment,
} from "@/app/[slug]/journey/actions";
import { useOptionalAuthGate } from "@/components/auth/AuthGateProvider";
import { ChatStickerPicker } from "@/components/cins/ChatStickerPicker";
import { CommentAttachments } from "@/components/journey/CommentAttachments";
import { CommentMentionText } from "@/components/journey/CommentMentionText";
import { JourneyUserPopover } from "@/components/journey/JourneyUserPopover";
import { InlineExternalVideoEmbed } from "@/components/shared/InlineExternalVideoEmbed";
import { rememberCfAccountHashFromDeliveryUrl } from "@/lib/cloudflare/account-hash";
import { imageFilesFromClipboard } from "@/lib/files/clipboard-images";
import { isAllowedUploadImageFile } from "@/lib/files/infer-image-mime";
import { parseTextWithExternalVideoEmbed } from "@/lib/link/external-video-embed";
import {
  MAX_COMMENT_ATTACHMENTS,
  sanitizeCommentImageIds,
} from "@/lib/social/comments/attachments";
import { composeReplyMentionPrefix } from "@/lib/social/comments/mention-parse";
import {
  COMMENT_REACTION_EMOJIS,
  commentReactionLabel,
} from "@/lib/social/comments/types";
import { applyViewerReactionToggle } from "@/lib/social/comments/reactions";
import { countCommentThreads } from "@/lib/social/comments/client-tree";
import type { MilestonePostComment } from "@/lib/journey/milestone-post-types";
import { getAvatarUrl } from "@/lib/journey/profile";
import { emitNotificationsChanged } from "@/lib/journey/notifications-client";
import type { UserEmojiMuc } from "@/lib/user-emoji/types";

type CommentSubmitResult =
  | {
      ok: true;
      data: {
        id: string;
        noiDung: string;
        taoLuc: string;
        author: MilestonePostComment["author"];
        idCha?: string | null;
        anhDinhKem?: string[];
      };
    }
  | { ok: false; error: string };

type CommentAttachmentDraft = {
  localId: string;
  imageId: string | null;
  previewUrl: string;
  uploading: boolean;
  error?: string;
};

export type CommentBlockProps = {
  milestoneId: string;
  contentOwnerId: string;
  viewerIsOwner: boolean;
  comments: ReadonlyArray<MilestonePostComment>;
  viewerCanComment: boolean;
  onCommentAdded(c: MilestonePostComment): void;
  onCommentUpdated(id: string, patch: Partial<MilestonePostComment>): void;
  onCommentRemoved(id: string): void;
  onThreadsReordered(threads: MilestonePostComment[]): void;
  sectionId?: string;
  submitComment?: (
    text: string,
    replyToId?: string | null,
    anhDinhKem?: string[],
  ) => Promise<CommentSubmitResult>;
  /** Split rail — ô nhập luôn dính đáy, danh sách BL scroll phía trên. */
  pinCompose?: boolean;
  /**
   * Khi không được bình luận nhưng đã đăng nhập (vd. chưa tham gia cộng đồng).
   * Nếu không truyền: hiện thông báo trung tính thay vì CTA đăng nhập.
   */
  commentDeniedFallback?: ReactNode;
};

export function CommentBlock(props: CommentBlockProps) {
  const {
    milestoneId,
    comments,
    viewerCanComment,
    onCommentAdded,
    sectionId = "post-comments",
    submitComment,
    pinCompose = false,
    commentDeniedFallback,
  } = props;
  const authGate = useOptionalAuthGate();
  const isAuthenticated = Boolean(authGate?.isAuthenticated);
  const openAuthModal = useCallback(
    (message?: string) => {
      if (authGate) {
        authGate.openAuthModal(message);
        return;
      }
      window.location.href = "/login";
    },
    [authGate],
  );
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<MilestonePostComment | null>(null);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [composeResetKey, setComposeResetKey] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const threadCount = countCommentThreads(comments);

  useEffect(() => {
    if (!replyTo) return;
    const el = inputRef.current;
    if (!el) return;
    el.focus({ preventScroll: false });
    const end = el.value.length;
    el.setSelectionRange(end, end);
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
    el.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [replyTo?.id]);

  function cancelReply() {
    setReplyTo(null);
    setText("");
  }

  function handleReplyTarget(comment: MilestonePostComment | null) {
    if (comment && replyTo?.id === comment.id) {
      cancelReply();
      return;
    }
    setReplyTo(comment);
    if (comment) {
      setText(composeReplyMentionPrefix(comment.author?.slug));
    }
  }

  function handleSend(payload: { text: string; imageIds: string[] }) {
    const value = payload.text.trim();
    const imageIds = sanitizeCommentImageIds(payload.imageIds);
    if (!value && imageIds.length === 0) return;
    setErr(null);
    startTransition(async () => {
      const res = submitComment
        ? await submitComment(value, replyTo?.id ?? null, imageIds)
        : await addMilestoneCommentV1(milestoneId, value, {
            replyToId: replyTo?.id ?? null,
            anhDinhKem: imageIds,
          });
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      onCommentAdded({
        id: res.data.id,
        noiDung: res.data.noiDung,
        taoLuc: res.data.taoLuc,
        idCha: res.data.idCha ?? null,
        anhDinhKem: res.data.anhDinhKem ?? imageIds,
        author: res.data.author ? { ...res.data.author, badge: null } : null,
        isOwn: true,
        reactions: [],
        replies: [],
        daXoa: false,
        ghimLuc: null,
      });
      setText("");
      setReplyTo(null);
      setComposeResetKey((k) => k + 1);
      if (!submitComment) emitNotificationsChanged();
    });
  }

  const composeProps = {
    text,
    setText,
    replyTo,
    onCancelReply: cancelReply,
    onSend: handleSend,
    pending,
    inputRef,
    composeResetKey,
  };

  const commentsHead = (
    <header className="post-comments-head">
      <h2>Bình luận</h2>
      <span className="post-comments-count">{threadCount}</span>
    </header>
  );

  const commentsBody = (
    <>
      {comments.length === 0 ? (
        <div className="post-comments-empty">
          Chưa có bình luận nào. Bạn là người đầu tiên ✨
        </div>
      ) : (
        <ol className="post-comments-list">
          {comments.map((c) => (
            <CommentThread
              key={c.id}
              comment={c}
              {...props}
              allThreads={comments}
              replyTo={replyTo}
              onReply={handleReplyTarget}
              composeProps={viewerCanComment ? composeProps : null}
            />
          ))}
        </ol>
      )}
      {err ? <div className="post-comments-err">{err}</div> : null}
    </>
  );

  const composeFooter = viewerCanComment ? (
    !replyTo ? (
      <CommentComposeForm key={composeResetKey} {...composeProps} />
    ) : null
  ) : commentDeniedFallback ? (
    <div className="post-comments-login">{commentDeniedFallback}</div>
  ) : isAuthenticated ? (
    <div className="post-comments-login">
      Bạn chưa thể bình luận lúc này.
    </div>
  ) : (
    <div className="post-comments-login">
      <button
        type="button"
        className="post-comments-login-btn"
        onClick={() =>
          openAuthModal("Đăng nhập hoặc tạo tài khoản để bình luận bài viết này.")
        }
      >
        Đăng nhập
      </button>{" "}
      hoặc{" "}
      <button
        type="button"
        className="post-comments-login-btn"
        onClick={() => openAuthModal("Tạo tài khoản CINs để tham gia thảo luận.")}
      >
        tạo tài khoản
      </button>{" "}
      để bình luận.
    </div>
  );

  return (
    <section
      className={
        "post-comments post-comments-v1" +
        (pinCompose ? " post-comments--pin-compose" : "")
      }
      id={sectionId}
      aria-label="Bình luận"
    >
      {pinCompose ? (
        <>
          <div className="post-comments-scroll">
            {commentsHead}
            {commentsBody}
          </div>
          {composeFooter}
        </>
      ) : (
        <>
          {commentsHead}
          {commentsBody}
          {composeFooter}
        </>
      )}
    </section>
  );
}

type ComposeProps = {
  text: string;
  setText: (value: string) => void;
  replyTo: MilestonePostComment | null;
  onCancelReply: () => void;
  onSend: (payload: { text: string; imageIds: string[] }) => void;
  pending: boolean;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  composeResetKey?: number;
  inline?: boolean;
};

type MentionSuggestUser = {
  id: string;
  slug: string;
  ten_hien_thi: string;
  avatar_id: string | null;
};

type ActiveMention = {
  start: number;
  query: string;
};

function getActiveMention(text: string, cursor: number): ActiveMention | null {
  const before = text.slice(0, cursor);
  const match = before.match(/@([a-z0-9._-]*)$/i);
  if (!match) return null;
  return {
    start: before.length - match[0].length,
    query: (match[1] ?? "").toLowerCase(),
  };
}

function MentionSuggestMenu({
  mentionActive,
  mentionLoading,
  suggestions,
  mentionIndex,
  onPick,
  className,
  style,
}: {
  mentionActive: ActiveMention;
  mentionLoading: boolean;
  suggestions: MentionSuggestUser[];
  mentionIndex: number;
  onPick: (user: MentionSuggestUser) => void;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={className}
      style={style}
      role="listbox"
      aria-label="Gợi ý bạn bè"
    >
      {mentionLoading ? (
        <p className="post-comments-mention-hint">Đang tìm…</p>
      ) : suggestions.length === 0 ? (
        <p className="post-comments-mention-hint">
          {mentionActive.query
            ? "Không tìm thấy bạn bè phù hợp."
            : "Chưa có bạn bè để gắn thẻ — kết nối trước nhé."}
        </p>
      ) : (
        suggestions.map((user, i) => {
          const name = user.ten_hien_thi?.trim() || user.slug;
          const initial = name.charAt(0).toUpperCase();
          const avatarUrl = getAvatarUrl(user.avatar_id);
          return (
            <button
              key={user.id}
              type="button"
              role="option"
              aria-selected={i === mentionIndex}
              className={
                "post-comments-mention-opt" + (i === mentionIndex ? " is-active" : "")
              }
              onMouseDown={(e) => {
                e.preventDefault();
                onPick(user);
              }}
            >
              <span className="post-comments-mention-avatar">
                {avatarUrl ? <img src={avatarUrl} alt="" /> : initial}
              </span>
              <span className="post-comments-mention-copy">
                <strong>{name}</strong>
                <small>@{user.slug}</small>
              </span>
            </button>
          );
        })
      )}
    </div>
  );
}

function CommentComposeForm({
  text,
  setText,
  replyTo,
  onCancelReply,
  onSend,
  pending,
  inputRef,
  inline = false,
}: ComposeProps) {
  const [attachments, setAttachments] = useState<CommentAttachmentDraft[]>([]);
  const [stickerPickerOpen, setStickerPickerOpen] = useState(false);
  const [stickerPickerPos, setStickerPickerPos] = useState<{
    left: number;
    bottom: number;
    width: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const composeRef = useRef<HTMLDivElement | null>(null);
  const attachmentsRef = useRef(attachments);
  attachmentsRef.current = attachments;

  useEffect(() => {
    return () => {
      for (const item of attachmentsRef.current) {
        if (item.previewUrl.startsWith("blob:")) {
          URL.revokeObjectURL(item.previewUrl);
        }
      }
    };
  }, []);

  const uploadAttachment = useCallback(async (file: File, localId: string) => {
    if (!isAllowedUploadImageFile(file)) {
      setAttachments((prev) =>
        prev.map((item) =>
          item.localId === localId
            ? { ...item, uploading: false, error: "File không phải ảnh." }
            : item,
        ),
      );
      return;
    }

    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch("/api/post-image/upload", { method: "POST", body: form });
      const data = (await res.json()) as {
        imageId?: string;
        url?: string;
        error?: string;
      };
      if (!res.ok || !data.imageId) {
        throw new Error(data.error || "Upload thất bại.");
      }
      if (data.url) rememberCfAccountHashFromDeliveryUrl(data.url);
      setAttachments((prev) =>
        prev.map((item) => {
          if (item.localId !== localId) return item;
          if (item.previewUrl.startsWith("blob:")) {
            URL.revokeObjectURL(item.previewUrl);
          }
          return {
            ...item,
            imageId: data.imageId!,
            previewUrl: data.url?.trim() || item.previewUrl,
            uploading: false,
            error: undefined,
          };
        }),
      );
    } catch (e) {
      setAttachments((prev) =>
        prev.map((item) =>
          item.localId === localId
            ? {
                ...item,
                uploading: false,
                error: e instanceof Error ? e.message : "Upload thất bại.",
              }
            : item,
        ),
      );
    }
  }, []);

  const addAttachmentFiles = useCallback(
    (files: FileList | File[]) => {
      const list = Array.from(files).filter(isAllowedUploadImageFile);
      if (list.length === 0) return;

      setAttachments((prev) => {
        const room = MAX_COMMENT_ATTACHMENTS - prev.length;
        const batch = list.slice(0, room);
        const next = [...prev];
        for (const file of batch) {
          const localId = crypto.randomUUID();
          const previewUrl = URL.createObjectURL(file);
          next.push({
            localId,
            previewUrl,
            imageId: null,
            uploading: true,
          });
          void uploadAttachment(file, localId);
        }
        return next;
      });
    },
    [uploadAttachment],
  );

  const removeAttachment = useCallback((localId: string) => {
    setAttachments((prev) => {
      const item = prev.find((a) => a.localId === localId);
      if (item?.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(item.previewUrl);
      }
      return prev.filter((a) => a.localId !== localId);
    });
  }, []);

  const sendMeme = useCallback(
    (item: UserEmojiMuc) => {
      if (pending || !item.cloudflareId) return;
      setStickerPickerOpen(false);
      onSend({ text: "", imageIds: [item.cloudflareId] });
    },
    [onSend, pending],
  );

  const readyImageIds = attachments
    .map((a) => a.imageId)
    .filter((id): id is string => Boolean(id));
  const attachmentsUploading = attachments.some((a) => a.uploading);
  const canSend =
    (text.trim().length > 0 || readyImageIds.length > 0) &&
    !attachmentsUploading &&
    !pending;

  const [mentionActive, setMentionActive] = useState<ActiveMention | null>(null);
  const [suggestions, setSuggestions] = useState<MentionSuggestUser[]>([]);
  const [mentionLoading, setMentionLoading] = useState(false);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [mentionMenuPos, setMentionMenuPos] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useLayoutEffect(() => {
    if (!stickerPickerOpen) {
      setStickerPickerPos(null);
      return;
    }
    const update = () => {
      const el = composeRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setStickerPickerPos({
        left: rect.left,
        width: rect.width,
        bottom: Math.max(8, window.innerHeight - rect.top + 8),
      });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [stickerPickerOpen]);

  const syncMention = useCallback((value: string, cursor: number) => {
    const active = getActiveMention(value, cursor);
    setMentionActive(active);
    if (!active) {
      setSuggestions([]);
      setMentionIndex(0);
    }
  }, []);

  useEffect(() => {
    if (!mentionActive) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setMentionLoading(true);
      try {
        const qs = new URLSearchParams({
          q: mentionActive.query,
          mutual_only: "true",
        });
        const res = await fetch(`/api/users/search?${qs.toString()}`);
        const json = await res.json().catch(() => null);
        if (cancelled) return;
        if (!res.ok) {
          setSuggestions([]);
          return;
        }
        setSuggestions((json?.users ?? []) as MentionSuggestUser[]);
        setMentionIndex(0);
      } finally {
        if (!cancelled) setMentionLoading(false);
      }
    }, 180);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [mentionActive]);

  const showMentionMenu = mentionActive != null;

  useLayoutEffect(() => {
    if (!showMentionMenu) {
      setMentionMenuPos(null);
      return;
    }
    const MENTIONS_MENU_MIN_W = 280;
    const MENTIONS_MENU_MAX_W = 320;
    const update = () => {
      const el = inputRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const maxW = Math.min(MENTIONS_MENU_MAX_W, window.innerWidth - 16);
      const width = Math.min(Math.max(rect.width, MENTIONS_MENU_MIN_W), maxW);
      let left = rect.left;
      if (left + width > window.innerWidth - 8) {
        left = Math.max(8, window.innerWidth - 8 - width);
      }
      setMentionMenuPos({
        left,
        top: rect.top,
        width,
      });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [showMentionMenu, mentionLoading, suggestions.length, inputRef]);

  function insertMention(user: MentionSuggestUser) {
    if (!mentionActive || !inputRef.current) return;
    const cursor = inputRef.current.selectionStart ?? text.length;
    const before = text.slice(0, mentionActive.start);
    const after = text.slice(cursor);
    const next = `${before}@${user.slug} ${after}`;
    setText(next);
    setMentionActive(null);
    setSuggestions([]);
    const nextCursor = before.length + user.slug.length + 2;
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(nextCursor, nextCursor);
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
    });
  }

  const mentionMenuPortal =
    portalReady && showMentionMenu && mentionActive && mentionMenuPos ? (
      <MentionSuggestMenu
        mentionActive={mentionActive}
        mentionLoading={mentionLoading}
        suggestions={suggestions}
        mentionIndex={mentionIndex}
        onPick={insertMention}
        className="post-comments-mention-menu is-portal"
        style={{
          left: mentionMenuPos.left,
          top: mentionMenuPos.top,
          width: mentionMenuPos.width,
        }}
      />
    ) : null;

  const stickerPickerPortal =
    portalReady && stickerPickerOpen && stickerPickerPos ? (
      <div
        className="post-comments-sticker-portal"
        style={{
          left: stickerPickerPos.left,
          bottom: stickerPickerPos.bottom,
          width: stickerPickerPos.width,
        }}
      >
        <ChatStickerPicker
          onClose={() => setStickerPickerOpen(false)}
          disabled={pending}
          onSend={sendMeme}
        />
      </div>
    ) : null;

  return (
    <form
      className={
        "post-comments-form" + (inline ? " post-comments-form--inline" : "")
      }
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSend) return;
        onSend({ text, imageIds: readyImageIds });
      }}
    >
      <div className="post-comments-compose-row">
        <div
          ref={composeRef}
          className={
            "post-comments-compose" +
            (replyTo ? " is-replying" : "") +
            (inline ? " is-inline" : "") +
            (stickerPickerOpen ? " is-sticker-open" : "")
          }
        >
          {replyTo ? (
            <div className="post-comments-reply-context">
              <Reply size={14} strokeWidth={2} aria-hidden />
              <span className="post-comments-reply-context-text">
                Trả lời{" "}
                <strong>{replyTo.author?.tenHienThi ?? "người dùng"}</strong>
              </span>
              <button
                type="button"
                className="post-comments-reply-dismiss"
                onClick={onCancelReply}
                aria-label="Huỷ trả lời"
              >
                <X size={14} strokeWidth={2} aria-hidden />
              </button>
            </div>
          ) : null}
          {attachments.length > 0 ? (
            <div className="post-comments-compose-attachments">
              {attachments.map((item) => (
                <div
                  key={item.localId}
                  className={
                    "post-comments-compose-attachment" +
                    (item.error ? " has-error" : "")
                  }
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.previewUrl} alt="" />
                  {item.uploading ? (
                    <span className="post-comments-compose-attachment-busy" aria-busy>
                      <Loader2 size={16} strokeWidth={2} className="mc-spin" />
                    </span>
                  ) : null}
                  <button
                    type="button"
                    className="post-comments-compose-attachment-remove"
                    aria-label="Xóa ảnh đính kèm"
                    onClick={() => removeAttachment(item.localId)}
                  >
                    <X size={12} strokeWidth={2} aria-hidden />
                  </button>
                </div>
              ))}
            </div>
          ) : null}
          <div className="post-comments-compose-input-wrap">
            <textarea
              ref={inputRef}
              className="post-comments-input post-comments-textarea"
              placeholder={
                replyTo
                  ? "Viết trả lời… @ để tìm bạn bè"
                  : "Viết bình luận… @ để tìm bạn bè"
              }
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                syncMention(
                  e.target.value,
                  e.target.selectionStart ?? e.target.value.length,
                );
              }}
              maxLength={1000}
              rows={1}
              disabled={pending}
              onKeyDown={(e) => {
                if (showMentionMenu && suggestions.length > 0) {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setMentionIndex((i) => (i + 1) % suggestions.length);
                    return;
                  }
                  if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setMentionIndex(
                      (i) => (i - 1 + suggestions.length) % suggestions.length,
                    );
                    return;
                  }
                  if (e.key === "Enter" || e.key === "Tab") {
                    e.preventDefault();
                    insertMention(suggestions[mentionIndex]!);
                    return;
                  }
                }
                if (e.key === "Escape") {
                  if (stickerPickerOpen) {
                    e.preventDefault();
                    setStickerPickerOpen(false);
                    return;
                  }
                  if (mentionActive) {
                    e.preventDefault();
                    setMentionActive(null);
                    setSuggestions([]);
                    return;
                  }
                  if (replyTo) {
                    e.preventDefault();
                    onCancelReply();
                  }
                  return;
                }
                if (e.key === "Enter") {
                  if (e.shiftKey || e.ctrlKey || e.metaKey) {
                    return;
                  }
                  e.preventDefault();
                  if (!canSend) return;
                  onSend({ text, imageIds: readyImageIds });
                }
              }}
              onClick={(e) => {
                syncMention(
                  e.currentTarget.value,
                  e.currentTarget.selectionStart ?? e.currentTarget.value.length,
                );
              }}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
              }}
              onPaste={(e) => {
                if (
                  pending ||
                  attachmentsUploading ||
                  attachments.length >= MAX_COMMENT_ATTACHMENTS
                ) {
                  return;
                }
                const files = imageFilesFromClipboard(e.clipboardData);
                if (!files.length) return;
                e.preventDefault();
                addAttachmentFiles(files);
              }}
            />
            <button
              type="button"
              className="post-comments-meme-btn"
              data-sticker-trigger
              aria-label="Meme của tôi"
              aria-expanded={stickerPickerOpen}
              disabled={pending}
              onClick={() => setStickerPickerOpen((open) => !open)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="post-comments-meme-btn-icon"
                src="/assets/chat-meme-trigger.png"
                alt=""
                aria-hidden
              />
            </button>
            <button
              type="button"
              className="post-comments-attach-btn"
              aria-label="Đính kèm ảnh"
              disabled={
                pending ||
                attachmentsUploading ||
                attachments.length >= MAX_COMMENT_ATTACHMENTS
              }
              onClick={() => fileInputRef.current?.click()}
            >
              <ImagePlus size={18} strokeWidth={1.8} aria-hidden />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              hidden
              onChange={(e) => {
                if (e.target.files?.length) addAttachmentFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>
        </div>
        <button
          type="submit"
          className="post-comments-send"
          disabled={!canSend}
          aria-label={pending ? "Đang gửi bình luận" : "Gửi bình luận"}
        >
          {pending ? (
            <Loader2
              size={18}
              strokeWidth={2}
              className="post-comments-send-spin"
              aria-hidden
            />
          ) : (
            <Send size={18} strokeWidth={2} aria-hidden />
          )}
        </button>
      </div>
      {mentionMenuPortal ? createPortal(mentionMenuPortal, document.body) : null}
      {stickerPickerPortal
        ? createPortal(stickerPickerPortal, document.body)
        : null}
    </form>
  );
}

function CommentThread({
  comment,
  contentOwnerId,
  viewerIsOwner,
  viewerCanComment,
  onReply,
  onCommentUpdated,
  onCommentRemoved,
  onThreadsReordered,
  allThreads,
  replyTo,
  composeProps,
  isReply = false,
}: CommentBlockProps & {
  comment: MilestonePostComment;
  onReply: (c: MilestonePostComment | null) => void;
  replyTo: MilestonePostComment | null;
  composeProps: ComposeProps | null;
  isReply?: boolean;
  allThreads?: ReadonlyArray<MilestonePostComment>;
}) {
  const threads = allThreads ?? [comment];
  const isReplyTarget = replyTo?.id === comment.id;

  if (isReply) {
    return (
      <CommentRow
        comment={comment}
        contentOwnerId={contentOwnerId}
        viewerIsOwner={viewerIsOwner}
        viewerCanComment={viewerCanComment}
        onReply={onReply}
        onUpdated={onCommentUpdated}
        onRemoved={onCommentRemoved}
        onReordered={onThreadsReordered}
        allThreads={threads}
        isReply
        isReplyTarget={isReplyTarget}
        composeProps={isReplyTarget ? composeProps : null}
      />
    );
  }

  return (
    <li
      className={
        "post-comments-thread" +
        (comment.replies?.length ? " has-replies" : "")
      }
    >
      <CommentRow
        comment={comment}
        contentOwnerId={contentOwnerId}
        viewerIsOwner={viewerIsOwner}
        viewerCanComment={viewerCanComment}
        onReply={onReply}
        onUpdated={onCommentUpdated}
        onRemoved={onCommentRemoved}
        onReordered={onThreadsReordered}
        allThreads={threads}
        isReply={false}
        isReplyTarget={isReplyTarget}
        composeProps={isReplyTarget ? composeProps : null}
        inThread
      />
      {comment.replies && comment.replies.length > 0 ? (
        <ol className="post-comments-replies">
          {comment.replies.map((r) => (
            <CommentThread
              key={r.id}
              comment={r}
              contentOwnerId={contentOwnerId}
              viewerIsOwner={viewerIsOwner}
              viewerCanComment={viewerCanComment}
              onReply={onReply}
              onCommentUpdated={onCommentUpdated}
              onCommentRemoved={onCommentRemoved}
              onThreadsReordered={onThreadsReordered}
              allThreads={threads}
              replyTo={replyTo}
              composeProps={composeProps}
              isReply
              milestoneId=""
              comments={[]}
              onCommentAdded={() => {}}
            />
          ))}
        </ol>
      ) : null}
    </li>
  );
}

function CommentTextBody({ text }: { text: string }) {
  const { displayText, iframeSrc } = parseTextWithExternalVideoEmbed(text);
  if (!displayText && !iframeSrc) return null;

  return (
    <>
      {displayText ? <CommentMentionText text={displayText} /> : null}
      {iframeSrc ? <InlineExternalVideoEmbed src={iframeSrc} /> : null}
    </>
  );
}

function CommentRow({
  comment,
  viewerIsOwner,
  viewerCanComment,
  onReply,
  onUpdated,
  onRemoved,
  onReordered,
  allThreads,
  isReply,
  isReplyTarget,
  composeProps,
  inThread = false,
}: {
  comment: MilestonePostComment;
  viewerIsOwner: boolean;
  viewerCanComment: boolean;
  onReply: (c: MilestonePostComment | null) => void;
  onUpdated: (id: string, patch: Partial<MilestonePostComment>) => void;
  onRemoved: (id: string) => void;
  onReordered: (threads: MilestonePostComment[]) => void;
  allThreads: ReadonlyArray<MilestonePostComment>;
  isReply: boolean;
  isReplyTarget: boolean;
  composeProps: ComposeProps | null;
  inThread?: boolean;
  contentOwnerId: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [reactionErr, setReactionErr] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editDraft, setEditDraft] = useState(comment.noiDung);
  const [editErr, setEditErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const wrapRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLTextAreaElement>(null);

  const initial = (comment.author?.tenHienThi || comment.author?.slug || "?")
    .charAt(0)
    .toUpperCase();
  const avatarUrl = getAvatarUrl(comment.author?.avatarId ?? null);
  const canEditOwn =
    comment.isOwn && !comment.daXoa && Boolean(comment.noiDung?.trim());
  const canDeleteOwn = comment.isOwn && !comment.daXoa;
  const canHide = viewerIsOwner && !comment.isOwn && !comment.daXoa;
  const canPin = viewerIsOwner && !comment.idCha && !comment.daXoa;

  useEffect(() => {
    if (!editing) return;
    const el = editInputRef.current;
    if (!el) return;
    el.focus();
    const len = el.value.length;
    el.setSelectionRange(len, len);
  }, [editing]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  function runToggleReaction(emoji: string, active: boolean) {
    setReactionErr(null);
    const prev = comment.reactions ?? [];
    const optimistic = applyViewerReactionToggle(prev, emoji, active);
    onUpdated(comment.id, { reactions: optimistic });

    startTransition(async () => {
      const res = await toggleCommentReaction(comment.id, emoji, active);
      if (res.ok) {
        onUpdated(comment.id, { reactions: res.data.reactions });
        return;
      }
      onUpdated(comment.id, { reactions: prev });
      setReactionErr(res.error);
    });
  }

  const ItemTag = isReply ? "li" : inThread ? "div" : "li";

  return (
    <ItemTag
      className={
        "post-comments-item" +
        (isReply ? " is-reply" : "") +
        (comment.ghimLuc ? " is-pinned" : "") +
        (comment.daXoa ? " is-deleted" : "") +
        (isReplyTarget ? " is-reply-target" : "")
      }
    >
      <div className="post-comments-row">
        {comment.author?.slug ? (
          <JourneyUserPopover
            slug={comment.author.slug}
            fallbackName={comment.author.tenHienThi}
            fallbackAvatarUrl={avatarUrl}
          >
            <span className="post-comments-avatar la-avatar" aria-hidden>
              {avatarUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={avatarUrl} alt="" />
              ) : (
                initial
              )}
            </span>
          </JourneyUserPopover>
        ) : (
          <span className="post-comments-avatar la-avatar" aria-hidden>
            {avatarUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={avatarUrl} alt="" />
            ) : (
              initial
            )}
          </span>
        )}
        <div className="post-comments-body">
          <div className="post-comments-meta">
            {comment.author?.slug ? (
              <JourneyUserPopover
                slug={comment.author.slug}
                fallbackName={comment.author.tenHienThi}
                fallbackAvatarUrl={avatarUrl}
              >
                <span className="post-comments-name la-name">
                  {comment.author.tenHienThi}
                </span>
              </JourneyUserPopover>
            ) : (
              <span className="post-comments-name la-name">Người dùng</span>
            )}
            <span className="post-comments-time">{formatRelative(comment.taoLuc)}</span>
            {comment.ghimLuc ? (
              <span className="post-comments-pin-badge" title="Đã ghim">
                <Pin size={12} strokeWidth={2} aria-hidden />
              </span>
            ) : null}
            <div className={`post-comments-menu${menuOpen ? " open" : ""}`} ref={wrapRef}>
              <button
                type="button"
                className="post-comments-more"
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="Tuỳ chọn bình luận"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                <MoreHorizontal size={15} strokeWidth={1.8} aria-hidden />
              </button>
              {menuOpen ? (
                <div className="post-comments-menu-pop" role="menu">
                  <button
                    type="button"
                    role="menuitem"
                    className="post-comments-menu-item"
                    onClick={() => {
                      setMenuOpen(false);
                      onReply(isReplyTarget ? null : comment);
                    }}
                  >
                    <MessageCircle size={14} strokeWidth={1.7} aria-hidden />
                    <span>Trả lời</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="post-comments-menu-item"
                    onClick={() => {
                      setMenuOpen(false);
                      void navigator.clipboard.writeText(comment.noiDung);
                    }}
                  >
                    <Copy size={14} strokeWidth={1.7} aria-hidden />
                    <span>Sao chép</span>
                  </button>
                  {canEditOwn ? (
                    <button
                      type="button"
                      role="menuitem"
                      className="post-comments-menu-item"
                      onClick={() => {
                        setMenuOpen(false);
                        setPickerOpen(false);
                        setEditDraft(comment.noiDung);
                        setEditErr(null);
                        setEditing(true);
                      }}
                    >
                      <Pencil size={14} strokeWidth={1.7} aria-hidden />
                      <span>Sửa</span>
                    </button>
                  ) : null}
                  {canDeleteOwn ? (
                    <button
                      type="button"
                      role="menuitem"
                      className="post-comments-menu-item post-comments-menu-item-danger"
                      onClick={() => {
                        setMenuOpen(false);
                        if (!confirm("Xoá bình luận này?")) return;
                        startTransition(async () => {
                          const res = await deleteMilestoneComment(comment.id);
                          if (res.ok) onRemoved(comment.id);
                        });
                      }}
                    >
                      <Trash2 size={14} strokeWidth={1.7} aria-hidden />
                      <span>Xoá</span>
                    </button>
                  ) : null}
                  {canHide ? (
                    <button
                      type="button"
                      role="menuitem"
                      className="post-comments-menu-item"
                      onClick={() => {
                        setMenuOpen(false);
                        startTransition(async () => {
                          const res = await hideMilestoneCommentByOwner(comment.id);
                          if (res.ok) {
                            onUpdated(comment.id, {
                              daXoa: true,
                              noiDung: "Bình luận đã xoá",
                            });
                          }
                        });
                      }}
                    >
                      <Trash2 size={14} strokeWidth={1.7} aria-hidden />
                      <span>Ẩn bình luận</span>
                    </button>
                  ) : null}
                  {canPin ? (
                    <button
                      type="button"
                      role="menuitem"
                      className="post-comments-menu-item"
                      onClick={() => {
                        setMenuOpen(false);
                        startTransition(async () => {
                          const next = !comment.ghimLuc;
                          const res = await pinMilestoneComment(comment.id, next);
                          if (!res.ok) return;
                          const patched = allThreads.map((t) => {
                            if (t.id === comment.id) {
                              return {
                                ...t,
                                ghimLuc: next ? new Date().toISOString() : null,
                              };
                            }
                            return { ...t, ghimLuc: next ? null : t.ghimLuc };
                          });
                          onReordered(
                            [...patched].sort((a, b) => {
                              const ap = a.ghimLuc ? 1 : 0;
                              const bp = b.ghimLuc ? 1 : 0;
                              if (ap !== bp) return bp - ap;
                              return a.taoLuc.localeCompare(b.taoLuc);
                            }),
                          );
                        });
                      }}
                    >
                      {comment.ghimLuc ? (
                        <PinOff size={14} strokeWidth={1.7} aria-hidden />
                      ) : (
                        <Pin size={14} strokeWidth={1.7} aria-hidden />
                      )}
                      <span>{comment.ghimLuc ? "Bỏ ghim" : "Ghim"}</span>
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
          <div className="post-comments-text-row">
            {editing ? (
              <form
                className="post-comments-edit"
                onSubmit={(e) => {
                  e.preventDefault();
                  const next = editDraft.trim();
                  if (!next) {
                    setEditErr("Nội dung bình luận trống.");
                    return;
                  }
                  if (next === comment.noiDung.trim()) {
                    setEditing(false);
                    setEditErr(null);
                    return;
                  }
                  setEditErr(null);
                  startTransition(async () => {
                    const res = await editMilestoneComment(comment.id, next);
                    if (!res.ok) {
                      setEditErr(res.error);
                      return;
                    }
                    onUpdated(comment.id, { noiDung: res.data.noiDung });
                    setEditing(false);
                  });
                }}
              >
                <textarea
                  ref={editInputRef}
                  className="post-comments-edit-input"
                  value={editDraft}
                  rows={3}
                  maxLength={1000}
                  disabled={pending}
                  aria-label="Sửa bình luận"
                  onChange={(e) => setEditDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      e.preventDefault();
                      setEditing(false);
                      setEditDraft(comment.noiDung);
                      setEditErr(null);
                    }
                  }}
                />
                {editErr ? (
                  <span className="post-comments-edit-err" role="alert">
                    {editErr}
                  </span>
                ) : null}
                <div className="post-comments-edit-actions">
                  <button
                    type="button"
                    className="post-comments-edit-cancel"
                    disabled={pending}
                    onClick={() => {
                      setEditing(false);
                      setEditDraft(comment.noiDung);
                      setEditErr(null);
                    }}
                  >
                    Huỷ
                  </button>
                  <button
                    type="submit"
                    className="post-comments-edit-save"
                    disabled={pending || !editDraft.trim()}
                  >
                    {pending ? "Đang lưu…" : "Lưu"}
                  </button>
                </div>
              </form>
            ) : (
              <>
                {comment.noiDung ? (
                  <CommentTextBody text={comment.noiDung} />
                ) : null}
                {!comment.daXoa && (comment.anhDinhKem?.length ?? 0) > 0 ? (
                  <CommentAttachments imageIds={comment.anhDinhKem ?? []} />
                ) : null}
                {!comment.daXoa ? (
                  <div className="post-comments-actions">
                    <div className="post-comments-reactions">
                      {(comment.reactions ?? []).map((r) => (
                        <button
                          key={r.emoji}
                          type="button"
                          className={
                            "post-comments-reaction-pill" +
                            (r.viewerReacted ? " is-active" : "")
                          }
                          disabled={pending}
                          aria-label={
                            r.count > 1
                              ? `${commentReactionLabel(r.emoji)} ${r.count} lượt`
                              : commentReactionLabel(r.emoji)
                          }
                          onClick={() =>
                            runToggleReaction(r.emoji, !r.viewerReacted)
                          }
                        >
                          <span
                            className="post-comments-reaction-emoji"
                            aria-hidden
                          >
                            {commentReactionLabel(r.emoji)}
                          </span>
                          {r.count > 1 ? (
                            <span className="post-comments-reaction-count">
                              {r.count}
                            </span>
                          ) : null}
                        </button>
                      ))}
                      <div className="post-comments-reaction-add">
                        <button
                          type="button"
                          className="post-comments-reaction-picker-btn"
                          aria-label="Thêm cảm xúc"
                          onClick={() => setPickerOpen((v) => !v)}
                        >
                          <Smile size={14} strokeWidth={2} aria-hidden />
                        </button>
                        {pickerOpen ? (
                          <div
                            className="post-comments-reaction-picker"
                            role="menu"
                          >
                            {COMMENT_REACTION_EMOJIS.map((e) => {
                              const active = (comment.reactions ?? []).some(
                                (r) => r.emoji === e.key && r.viewerReacted,
                              );
                              return (
                                <button
                                  key={e.key}
                                  type="button"
                                  role="menuitem"
                                  className={
                                    "post-comments-reaction-opt" +
                                    (active ? " is-active" : "")
                                  }
                                  onClick={() => {
                                    setPickerOpen(false);
                                    runToggleReaction(
                                      e.key,
                                      active ? false : true,
                                    );
                                  }}
                                >
                                  <span
                                    className="post-comments-reaction-opt-emoji"
                                    aria-hidden
                                  >
                                    {e.label}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    </div>
                    {reactionErr ? (
                      <span className="post-comments-reaction-err" role="alert">
                        {reactionErr}
                      </span>
                    ) : null}
                    {viewerCanComment ? (
                      <button
                        type="button"
                        className={
                          "post-comments-reply-btn" +
                          (isReplyTarget ? " is-active" : "")
                        }
                        onClick={() => onReply(comment)}
                        aria-expanded={isReplyTarget}
                      >
                        Trả lời
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </>
            )}
          </div>
          {composeProps ? (
            <CommentComposeForm
              key={composeProps.composeResetKey}
              {...composeProps}
              inline
            />
          ) : null}
        </div>
      </div>
    </ItemTag>
  );
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ngày trước`;
  return new Date(iso).toLocaleDateString("vi-VN");
}
