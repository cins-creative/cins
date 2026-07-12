"use client";

import { Loader2, Paperclip, Send, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ClipboardEvent,
} from "react";

import { TruongInlineModal } from "@/components/truong/inline/TruongInlineModal";
import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";
import { ChatMessageThreadItems } from "@/components/cins/ChatMessageThreadItems";
import { ChatStickerPicker } from "@/components/cins/ChatStickerPicker";
import { InboxContactRoleBadge } from "@/components/truong/InboxContactRoleBadge";
import { InboxVerificationCard } from "@/components/truong/InboxVerificationCard";
import { avatarBg, avatarHueFromSeed } from "@/lib/chat/avatar";
import {
  revokeDraftImageUrls,
  type PendingImageDraft,
} from "@/lib/chat/compose-draft";
import {
  fetchChatComposeImageUpload,
  patchPendingImageUploadResult,
  planPendingImageAdditions,
} from "@/lib/chat/compose-image-upload";
import {
  buildChatSendPlan,
  optimisticMessagesFromPlan,
  type ChatSendPayload,
} from "@/lib/chat/compose-send-plan";
import { executeComposeSendPlanInBackground } from "@/lib/chat/execute-compose-send-plan";
import {
  createOptimisticChatMessage,
  messagePreviewText,
} from "@/lib/chat/optimistic-message";
import {
  inboxThreadNeedsAction,
  type OrgInboxThread,
  type OrgInboxThreadStatus,
} from "@/lib/chat/org-inbox-types";
import { reconcileChatMessage } from "@/lib/chat/realtime";
import { replaceOptimisticAlbumWithRealMessages } from "@/lib/chat/replace-album-batch";
import type { ChatMessage } from "@/lib/chat/types";
import { userEmojiDeliveryUrl } from "@/lib/user-emoji/delivery-url";
import type { UserEmojiMuc } from "@/lib/user-emoji/types";
import { imageFilesFromClipboard } from "@/lib/files/clipboard-images";
import { formatInboxTime } from "@/lib/truong/message-inbox-mock";

function ChatIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function studentInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase() || "?";
}

function inboxStatusLabel(status: OrgInboxThreadStatus): string {
  return status === "open" ? "Chưa trả lời" : "Đã trả lời";
}

function InboxStudentAvatar({ thread }: { thread: OrgInboxThread }) {
  const size = 28;
  return (
    <span className="cins-chat-avatar-wrap">
      <span
        className={`cins-chat-avatar${thread.studentAvatarUrl ? " has-image" : ""}`}
        style={{
          width: size,
          height: size,
          fontSize: size * 0.38,
          background: thread.studentAvatarUrl
            ? "transparent"
            : avatarBg(avatarHueFromSeed(thread.studentUserId)),
        }}
        aria-hidden
      >
        {thread.studentAvatarUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={thread.studentAvatarUrl} alt="" />
        ) : (
          studentInitials(thread.studentName)
        )}
      </span>
    </span>
  );
}

type FilterKey = "all" | OrgInboxThreadStatus | "unread" | "verify";

export function TruongMessageInbox() {
  const ctx = useTruongInlineEdit();
  const [open, setOpen] = useState(false);
  const [threads, setThreads] = useState<OrgInboxThread[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>("open");
  const [reply, setReply] = useState("");
  const [pending, startTransition] = useTransition();
  const [verifyPending, startVerifyTransition] = useTransition();

  const pendingVerifyCount = useMemo(
    () => threads.filter((t) => t.pendingVerification).length,
    [threads],
  );

  const unreadThreadCount = useMemo(
    () => threads.filter((t) => t.unread).length,
    [threads],
  );

  /** Badge: tin chưa đọc + yêu cầu xác thực chờ duyệt. */
  const inboxBadgeCount = useMemo(
    () =>
      threads.reduce((sum, t) => sum + (t.unread ? t.unreadCount : 0), 0) +
      pendingVerifyCount,
    [threads, pendingVerifyCount],
  );

  const filtered = useMemo(() => {
    if (filter === "all") return threads;
    if (filter === "unread") return threads.filter((t) => t.unread);
    if (filter === "verify") return threads.filter((t) => t.pendingVerification);
    return threads.filter((t) => t.status === filter);
  }, [threads, filter]);

  const selected = useMemo(
    () => threads.find((t) => t.studentUserId === selectedStudentId) ?? null,
    [threads, selectedStudentId],
  );

  const loadThreads = useCallback(async (options?: { silent?: boolean }) => {
    if (!ctx?.orgId) return;
    const silent = options?.silent ?? false;
    if (!silent) {
      setLoadingThreads(true);
      setLoadError(null);
    }
    try {
      const res = await fetch(`/api/org/${ctx.orgId}/inbox/threads`, {
        cache: "no-store",
      });
      const json = (await res.json()) as {
        threads?: OrgInboxThread[];
        error?: string;
      };
      if (!res.ok) {
        if (!silent) {
          setLoadError(json.error ?? "Không tải được hộp thư.");
          setThreads([]);
        }
        return;
      }
      const next = Array.isArray(json.threads) ? json.threads : [];
      setThreads(next);
      if (!silent) {
        setFilter((current) => {
          const hasPendingVerify = next.some((t) => t.pendingVerification);
          if (hasPendingVerify) return "verify";
          if (current === "verify") return "open";
          return current;
        });
        setSelectedStudentId((current) => {
          if (current && next.some((t) => t.studentUserId === current)) return current;
          const verifyFirst = next.find((t) => t.pendingVerification)?.studentUserId;
          if (verifyFirst) return verifyFirst;
          return (
            next.find((t) => t.status === "open")?.studentUserId ??
            next[0]?.studentUserId ??
            null
          );
        });
      }
    } catch {
      if (!silent) {
        setLoadError("Lỗi mạng.");
        setThreads([]);
      }
    } finally {
      if (!silent) {
        setLoadingThreads(false);
      }
    }
  }, [ctx?.orgId]);

  const loadMessages = useCallback(
    async (studentUserId: string, roomId?: string | null) => {
      if (!ctx?.orgId) return;
      setLoadingMessages(true);
      setMessageError(null);
      try {
        const qs = roomId
          ? `?roomId=${encodeURIComponent(roomId)}`
          : "";
        const res = await fetch(
          `/api/org/${ctx.orgId}/student-chat/${encodeURIComponent(studentUserId)}/messages${qs}`,
          { cache: "no-store" },
        );
        const json = (await res.json()) as {
          messages?: ChatMessage[];
          error?: string;
        };
        if (!res.ok) {
          setMessageError(json.error ?? "Không tải được tin nhắn.");
          setMessages([]);
          return;
        }
        setMessages(
          (Array.isArray(json.messages) ? json.messages : [])
            .slice()
            .sort(
              (a, b) =>
                new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime(),
            ),
        );
        setThreads((list) =>
          list.map((thread) =>
            thread.studentUserId === studentUserId
              ? { ...thread, unread: false, unreadCount: 0 }
              : thread,
          ),
        );
      } catch {
        setMessageError("Lỗi mạng.");
        setMessages([]);
      } finally {
        setLoadingMessages(false);
      }
    },
    [ctx?.orgId],
  );

  useEffect(() => {
    if (!ctx?.canEdit || !ctx.isEditing || !ctx.orgId) return;

    void loadThreads({ silent: true });

    const refreshBadge = () => void loadThreads({ silent: true });
    const onFocus = () => refreshBadge();
    const onVisible = () => {
      if (document.visibilityState === "visible") refreshBadge();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    const intervalId = window.setInterval(refreshBadge, 60_000);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(intervalId);
    };
  }, [ctx?.canEdit, ctx?.isEditing, ctx?.orgId, loadThreads]);

  useEffect(() => {
    if (open) {
      void loadThreads();
    } else {
      setSelectedStudentId(null);
      setMessages([]);
      setReply("");
      void loadThreads({ silent: true });
    }
  }, [open, loadThreads]);

  const selectedRoomId = selected?.roomId ?? null;

  useEffect(() => {
    if (!open || !selectedStudentId) return;
    void loadMessages(selectedStudentId, selectedRoomId);
  }, [open, selectedStudentId, selectedRoomId, loadMessages]);

  if (!ctx?.canEdit || !ctx.isEditing) return null;

  function selectThread(studentUserId: string) {
    setSelectedStudentId(studentUserId);
    setReply("");
  }

  function appendMessages(next: ChatMessage[]) {
    setMessages((prev) => {
      let merged = prev;
      for (const msg of next) {
        merged = reconcileChatMessage(merged, msg);
      }
      return merged
        .slice()
        .sort(
          (a, b) =>
            new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime(),
        );
    });
  }

  function patchThreadAfterSend(studentUserId: string, message: ChatMessage) {
    setThreads((list) =>
      list.map((thread) =>
        thread.studentUserId === studentUserId
          ? {
              ...thread,
              unread: false,
              unreadCount: 0,
              status: "replied" as const,
              preview: messagePreviewText(message).slice(0, 80),
              lastAt: message.sentAt,
            }
          : thread,
      ),
    );
  }

  async function submitInboxPayload(
    studentUserId: string,
    payload: ChatSendPayload,
    optimisticId: string,
  ): Promise<boolean> {
    if (!ctx?.orgId) return false;
    try {
      const res = await fetch(
        `/api/org/${ctx.orgId}/student-chat/${encodeURIComponent(studentUserId)}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const json = (await res.json()) as {
        message?: ChatMessage;
        error?: string;
      };
      if (!res.ok || !json.message) {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
        ctx.showToast(json.error ?? "Không gửi được tin nhắn.");
        return false;
      }
      setMessages((prev) => reconcileChatMessage(prev, json.message!));
      patchThreadAfterSend(studentUserId, json.message!);
      return true;
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      ctx.showToast("Lỗi mạng.");
      return false;
    }
  }

  function sendReply(
    text: string,
    images: PendingImageDraft[],
    filesByLocalId: Map<string, File>,
    inFlightUploads: Map<
      string,
      Promise<import("@/lib/chat/compose-image-upload").ComposeImageUploadResult>
    >,
  ) {
    if (!selected || !ctx?.orgId || pending) return;

    const plan = buildChatSendPlan({
      text,
      images: images.map((image) => ({
        localId: image.localId,
        imageId: image.imageId,
        previewUrl: image.previewUrl,
      })),
    });
    const optimistics = optimisticMessagesFromPlan(plan);
    if (optimistics.length === 0) return;

    const studentUserId = selected.studentUserId;
    appendMessages(optimistics);
    setReply("");

    const optimisticIds = new Set(optimistics.map((item) => item.id));

    startTransition(() => {
      void executeComposeSendPlanInBackground({
        plan,
        imageSnapshots: images,
        filesByLocalId,
        inFlightUploads,
        hasText: Boolean(text.trim()),
        replyToId: null,
        sendText: plan.text
          ? () =>
              submitInboxPayload(
                studentUserId,
                plan.text!.payload,
                plan.text!.optimistic.id,
              )
          : undefined,
        sendAlbum: plan.album
          ? async (payloads) => {
              const albumId = plan.album!.optimistic.id;
              const realMessages: ChatMessage[] = [];
              try {
                for (const payload of payloads) {
                  const res = await fetch(
                    `/api/org/${ctx.orgId}/student-chat/${encodeURIComponent(studentUserId)}/messages`,
                    {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(payload),
                    },
                  );
                  const json = (await res.json()) as {
                    message?: ChatMessage;
                    error?: string;
                  };
                  if (!res.ok || !json.message) {
                    throw new Error(json.error ?? "Không gửi được ảnh.");
                  }
                  realMessages.push(json.message);
                }
                setMessages((prev) =>
                  replaceOptimisticAlbumWithRealMessages(
                    prev,
                    albumId,
                    realMessages,
                  ),
                );
                const last = realMessages[realMessages.length - 1]!;
                patchThreadAfterSend(studentUserId, last);
                return true;
              } catch (error) {
                setMessages((prev) =>
                  prev.filter((m) => m.id !== albumId),
                );
                ctx.showToast(
                  error instanceof Error
                    ? error.message
                    : "Không gửi được ảnh.",
                );
                return false;
              }
            }
          : undefined,
        onFailure: () => {
          setMessages((prev) =>
            prev.filter((m) => !optimisticIds.has(m.id)),
          );
          setReply(text);
          ctx.showToast("Không gửi được tin nhắn. Hãy thử lại.");
        },
      });
    });
  }

  function sendSticker(item: UserEmojiMuc) {
    if (!selected || !ctx?.orgId || pending) return;
    const studentUserId = selected.studentUserId;
    const optimistic = createOptimisticChatMessage({
      body: "",
      kind: "sticker",
      imageId: item.cloudflareId,
      imageUrl:
        item.url ?? userEmojiDeliveryUrl(item.cloudflareId, "thumbnail"),
    });
    appendMessages([optimistic]);
    startTransition(() => {
      void submitInboxPayload(
        studentUserId,
        { id_emoji_muc: item.id },
        optimistic.id,
      );
    });
  }

  function respondVerification(action: "approve" | "reject") {
    if (!selected?.pendingVerification || !ctx?.orgId || verifyPending) return;

    startVerifyTransition(async () => {
      try {
        const res = await fetch(
          `/api/org/${ctx.orgId}/membership-milestone-requests/${selected.pendingVerification!.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action }),
          },
        );
        const json = (await res.json()) as { error?: string };
        if (!res.ok) {
          ctx.showToast(json.error ?? "Không cập nhật được.");
          return;
        }
        ctx.showToast(
          action === "approve" ? "Đã xác thực cột mốc" : "Đã từ chối yêu cầu",
        );
        setThreads((list) =>
          list.map((thread) =>
            thread.studentUserId === selected.studentUserId
              ? { ...thread, pendingVerification: null }
              : thread,
          ),
        );
        void loadThreads({ silent: true });
      } catch {
        ctx.showToast("Lỗi mạng.");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        className="ss-btn ghost ss-btn-messages"
        onClick={() => setOpen(true)}
        aria-label={
          inboxBadgeCount > 0
            ? `Tin nhắn — ${inboxBadgeCount} cần xử lý`
            : "Tin nhắn"
        }
      >
        <ChatIcon />
        <span className="ss-btn-messages-label">Tin nhắn</span>
        {inboxBadgeCount > 0 ? (
          <span className="ss-btn-messages-badge" aria-hidden>
            {inboxBadgeCount > 9 ? "9+" : inboxBadgeCount}
          </span>
        ) : null}
      </button>

      <TruongInlineModal
        open={open}
        onClose={() => setOpen(false)}
        className="tdh-inline-modal--wide tdh-message-inbox-modal"
        labelledBy="tdh-message-inbox-title"
        showClose={false}
      >
        <div className="tdh-message-inbox-hdr">
          <div>
            <h3 id="tdh-message-inbox-title" className="tdh-inline-modal-title">
              Tin nhắn tuyển sinh
            </h3>
          </div>
          <button
            type="button"
            className="tdh-inline-btn ghost"
            onClick={() => setOpen(false)}
          >
            Đóng
          </button>
        </div>

        <div className="tdh-message-inbox-layout">
          <aside className="tdh-message-inbox-list-pane">
            <div
              className="tdh-message-inbox-filters"
              role="tablist"
              aria-label="Lọc hội thoại"
            >
              {(
                [
                  ["verify", "Chờ xác thực", pendingVerifyCount],
                  ["unread", "Chưa đọc", unreadThreadCount],
                  [
                    "open",
                    "Chưa trả lời",
                    threads.filter((t) => t.status === "open").length,
                  ],
                  ["all", "Tất cả", threads.length],
                ] as const
              ).map(([key, label, count]) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={filter === key}
                  className={`tdh-message-inbox-filter${filter === key ? " on" : ""}`}
                  onClick={() => setFilter(key)}
                >
                  {label}
                  <span className="tdh-message-inbox-filter-count">{count}</span>
                </button>
              ))}
            </div>

            <ul className="tdh-message-inbox-thread-list">
              {loadingThreads ? (
                <li className="tdh-message-inbox-thread-empty">Đang tải…</li>
              ) : loadError ? (
                <li className="tdh-message-inbox-thread-empty">{loadError}</li>
              ) : filtered.length === 0 ? (
                <li className="tdh-message-inbox-thread-empty">
                  Không có hội thoại.
                </li>
              ) : (
                filtered.map((thread) => (
                  <ThreadListItem
                    key={thread.studentUserId}
                    thread={thread}
                    active={thread.studentUserId === selectedStudentId}
                    onSelect={() => selectThread(thread.studentUserId)}
                  />
                ))
              )}
            </ul>
          </aside>

          <section
            className="tdh-message-inbox-detail-pane"
            aria-label="Chi tiết hội thoại"
          >
            {selected ? (
              <ThreadDetail
                thread={selected}
                messages={messages}
                loading={loadingMessages}
                error={messageError}
                reply={reply}
                sending={pending}
                verifyResponding={verifyPending}
                onReplyChange={setReply}
                onSend={(text, images, filesByLocalId, inFlightUploads) =>
                  sendReply(text, images, filesByLocalId, inFlightUploads)
                }
                onSendSticker={sendSticker}
                onApproveVerification={() => respondVerification("approve")}
                onRejectVerification={() => respondVerification("reject")}
              />
            ) : (
              <p className="tdh-message-inbox-pick">
                Chọn một hội thoại bên trái để đọc và trả lời.
              </p>
            )}
          </section>
        </div>
      </TruongInlineModal>
    </>
  );
}

function ThreadListItem({
  thread,
  active,
  onSelect,
}: {
  thread: OrgInboxThread;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        className={`tdh-message-inbox-thread${active ? " is-active" : ""}${thread.unread ? " is-unread" : ""}${thread.pendingVerification ? " has-verify" : ""}`}
        onClick={onSelect}
      >
        <span className="tdh-message-inbox-thread-avatar" aria-hidden>
          {thread.studentAvatarUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={thread.studentAvatarUrl} alt="" />
          ) : (
            studentInitials(thread.studentName)
          )}
        </span>
        <span className="tdh-message-inbox-thread-body">
          <span className="tdh-message-inbox-thread-top">
            <span className="tdh-message-inbox-thread-id">
              <span className="tdh-message-inbox-thread-name">{thread.studentName}</span>
              <InboxContactRoleBadge
                label={thread.studentContactLabel}
                roleKey={thread.studentContactRole}
                className="tdh-message-inbox-thread-role-badge"
              />
            </span>
            <time className="tdh-message-inbox-thread-time" dateTime={thread.lastAt}>
              {formatInboxTime(thread.lastAt)}
            </time>
          </span>
          <span className="tdh-message-inbox-thread-subject">
            {thread.pendingVerification ? (
              <span className="tdh-message-inbox-thread-verify-pill">Xác thực</span>
            ) : null}
            {thread.subject}
          </span>
          <span className="tdh-message-inbox-thread-preview">{thread.preview}</span>
        </span>
        {inboxThreadNeedsAction(thread) ? (
          <span
            className={`tdh-message-inbox-thread-dot${thread.pendingVerification && !thread.unread ? " is-verify" : ""}`}
            aria-hidden
          />
        ) : null}
      </button>
    </li>
  );
}

function ThreadDetail({
  thread,
  messages,
  loading,
  error,
  reply,
  sending,
  verifyResponding,
  onReplyChange,
  onSend,
  onSendSticker,
  onApproveVerification,
  onRejectVerification,
}: {
  thread: OrgInboxThread;
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  reply: string;
  sending: boolean;
  verifyResponding: boolean;
  onReplyChange: (v: string) => void;
  onSend: (
    text: string,
    images: PendingImageDraft[],
    filesByLocalId: Map<string, File>,
    inFlightUploads: Map<
      string,
      Promise<import("@/lib/chat/compose-image-upload").ComposeImageUploadResult>
    >,
  ) => void;
  onSendSticker: (item: UserEmojiMuc) => void;
  onApproveVerification: () => void;
  onRejectVerification: () => void;
}) {
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingImages, setPendingImages] = useState<PendingImageDraft[]>([]);
  const [stickerPickerOpen, setStickerPickerOpen] = useState(false);
  const pendingFilesByLocalIdRef = useRef<Map<string, File>>(new Map());
  const inFlightUploadsRef = useRef<
    Map<
      string,
      Promise<import("@/lib/chat/compose-image-upload").ComposeImageUploadResult>
    >
  >(new Map());
  const pendingImagesRef = useRef(pendingImages);
  pendingImagesRef.current = pendingImages;

  useEffect(() => {
    return () => {
      revokeDraftImageUrls(pendingImagesRef.current);
    };
  }, []);

  useEffect(() => {
    revokeDraftImageUrls(pendingImagesRef.current);
    setPendingImages([]);
    pendingFilesByLocalIdRef.current.clear();
    inFlightUploadsRef.current.clear();
    setStickerPickerOpen(false);
  }, [thread.studentUserId]);

  useEffect(() => {
    if (loading || messages.length === 0) return;
    const el = messagesContainerRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
      return;
    }
    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [loading, messages]);

  const sendableImages = pendingImages.filter((image) => !image.error);
  const canSend =
    Boolean(reply.trim()) || sendableImages.length > 0;

  function queueUploads(files: File[]) {
    const planned = planPendingImageAdditions(files, pendingImagesRef.current);
    if (planned.length === 0) return;

    setPendingImages((prev) => [...prev, ...planned.map((item) => item.draft)]);

    for (const { file, draft } of planned) {
      pendingFilesByLocalIdRef.current.set(draft.localId, file);
      const promise = fetchChatComposeImageUpload(file).then((result) => {
        setPendingImages((prev) =>
          patchPendingImageUploadResult(prev, draft.localId, result),
        );
        return result;
      });
      inFlightUploadsRef.current.set(draft.localId, promise);
    }
  }

  function removePendingImage(localId: string) {
    setPendingImages((prev) => {
      const target = prev.find((image) => image.localId === localId);
      if (target) revokeDraftImageUrls([target]);
      return prev.filter((image) => image.localId !== localId);
    });
    pendingFilesByLocalIdRef.current.delete(localId);
    inFlightUploadsRef.current.delete(localId);
  }

  function handleComposePaste(e: ClipboardEvent<HTMLTextAreaElement>) {
    const files = imageFilesFromClipboard(e.clipboardData);
    if (files.length === 0) return;
    e.preventDefault();
    queueUploads(files);
  }

  function handleSend() {
    if (!canSend || sending) return;
    const images = sendableImages;
    const files = new Map(pendingFilesByLocalIdRef.current);
    const uploads = new Map(inFlightUploadsRef.current);
    onSend(reply, images, files, uploads);
    revokeDraftImageUrls(pendingImages);
    setPendingImages([]);
    pendingFilesByLocalIdRef.current.clear();
    inFlightUploadsRef.current.clear();
    setStickerPickerOpen(false);
  }

  const verification = thread.pendingVerification;

  return (
    <>
      {verification ? (
        <InboxVerificationCard
          request={verification}
          studentContactLabel={thread.studentContactLabel}
          studentContactRole={thread.studentContactRole}
          responding={verifyResponding}
          onApprove={onApproveVerification}
          onReject={onRejectVerification}
        />
      ) : (
        <header className="tdh-message-inbox-detail-hdr">
          <div>
            <h4 className="tdh-message-inbox-detail-title">{thread.studentName}</h4>
            <p className="tdh-message-inbox-detail-meta">
              <InboxContactRoleBadge
                label={thread.studentContactLabel}
                roleKey={thread.studentContactRole}
              />
              {thread.studentRole &&
              thread.studentRole !== thread.studentContactLabel ? (
                <> · {thread.studentRole}</>
              ) : null}{" "}
              ·{" "}
              <span
                className={`tdh-message-inbox-status tdh-message-inbox-status--${thread.status}`}
              >
                {inboxStatusLabel(thread.status)}
              </span>
            </p>
          </div>
        </header>
      )}

      {loading ? (
        <p className="tdh-message-inbox-pick">
          <Loader2 size={16} className="tdh-milestone-tag-org-msg-spin" aria-hidden />
          Đang tải tin nhắn…
        </p>
      ) : error ? (
        <p className="tdh-message-inbox-pick">{error}</p>
      ) : (
        <div
          ref={messagesContainerRef}
          className="tdh-message-inbox-messages cins-chat-messages"
        >
          {messages.length === 0 ? (
            <p className="tdh-message-inbox-thread-empty">Chưa có tin nhắn.</p>
          ) : (
            <ChatMessageThreadItems
              messages={messages}
              renderTheirAvatar={() => <InboxStudentAvatar thread={thread} />}
            />
          )}
          <div ref={messagesEndRef} />
        </div>
      )}

      <div className="tdh-message-inbox-compose cins-chat-compose">
        {pendingImages.length > 0 ? (
          <div className="j-chat-mini-compose-attach-list cins-chat-compose-attach-list">
            {pendingImages.map((image) => (
              <div key={image.localId} className="j-chat-mini-compose-attach">
                <div className="j-chat-mini-compose-preview">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image.previewUrl} alt="" />
                  <button
                    type="button"
                    className="j-chat-mini-compose-remove"
                    aria-label="Bỏ ảnh đính kèm"
                    onClick={() => removePendingImage(image.localId)}
                  >
                    <X size={12} strokeWidth={2.5} aria-hidden />
                  </button>
                  {image.error ? (
                    <p className="j-chat-mini-compose-error">{image.error}</p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : null}
        {stickerPickerOpen ? (
          <ChatStickerPicker
            onClose={() => setStickerPickerOpen(false)}
            disabled={sending}
            onSend={(item) => {
              setStickerPickerOpen(false);
              onSendSticker(item);
            }}
          />
        ) : null}
        <div className="tdh-message-inbox-compose-row cins-chat-compose-row">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            className="j-chat-mini-compose-file"
            tabIndex={-1}
            aria-hidden
            onChange={(e) => {
              const files = [...(e.target.files ?? [])];
              if (files.length > 0) queueUploads(files);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            className="cins-chat-attach cins-chat-attach-meme"
            data-sticker-trigger
            aria-label="Meme của tôi"
            aria-expanded={stickerPickerOpen}
            disabled={sending}
            onClick={() => setStickerPickerOpen((open) => !open)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="cins-chat-attach-meme-icon"
              src="/assets/chat-meme-trigger.png"
              alt=""
              aria-hidden
            />
          </button>
          <button
            type="button"
            className="j-chat-mini-attach"
            aria-label="Đính kèm ảnh"
            disabled={sending}
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip size={17} strokeWidth={1.9} aria-hidden />
          </button>
          <textarea
            id="tdh-inbox-reply"
            className="tdh-message-inbox-textarea"
            rows={1}
            placeholder="Trả lời…"
            value={reply}
            disabled={sending}
            onChange={(e) => onReplyChange(e.target.value)}
            onPaste={handleComposePaste}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            aria-label="Trả lời"
          />
          <button
            type="button"
            className="tdh-inline-btn primary tdh-message-inbox-send"
            disabled={!canSend || sending}
            onClick={handleSend}
            aria-label={sending ? "Đang gửi" : "Gửi"}
          >
            {sending ? (
              <Loader2 size={16} className="tdh-milestone-tag-org-msg-spin" aria-hidden />
            ) : (
              <Send size={16} strokeWidth={2.2} aria-hidden />
            )}
          </button>
        </div>
      </div>
    </>
  );
}
