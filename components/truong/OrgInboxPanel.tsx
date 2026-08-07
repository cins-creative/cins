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
  type Dispatch,
  type MutableRefObject,
  type ReactNode,
  type SetStateAction,
} from "react";

import { ChatMessageThreadItems } from "@/components/cins/ChatMessageThreadItems";
import { ChatReplyComposeBar } from "@/components/cins/ChatReplyComposeBar";
import { ChatStickerPicker } from "@/components/cins/ChatStickerPicker";
import { useCinsChat } from "@/components/cins/CinsChatProvider";
import { MsIcon } from "@/components/cins/MsIcon";
import { useChatRoomMessageActions } from "@/components/cins/useChatRoomMessageActions";
import { InboxContactRoleBadge } from "@/components/truong/InboxContactRoleBadge";
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
  type OrgInboxThread,
  type OrgInboxThreadStatus,
} from "@/lib/chat/org-inbox-types";
import {
  mapRealtimeRow,
  reconcileChatMessage,
  type ChatRealtimeRow,
} from "@/lib/chat/realtime";
import { useChatRealtime } from "@/lib/chat/use-chat-realtime";
import { tinHienVoiViewer } from "@/lib/chat/visibility";
import { replaceOptimisticAlbumWithRealMessages } from "@/lib/chat/replace-album-batch";
import type { ChatMessage, ChatMessageReplyPreview } from "@/lib/chat/types";
import { userEmojiDeliveryUrl } from "@/lib/user-emoji/delivery-url";
import type { UserEmojiMuc } from "@/lib/user-emoji/types";
import { imageFilesFromClipboard } from "@/lib/files/clipboard-images";
import { formatInboxTime } from "@/lib/truong/message-inbox-mock";

function toReplyPreview(msg: ChatMessage): ChatMessageReplyPreview {
  return {
    id: msg.id,
    from: msg.from,
    body: msg.body,
    kind: msg.kind,
    imageUrl: msg.imageUrl,
    deleted: msg.deleted,
  };
}

export function studentInitials(name: string): string {
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

export type OrgInboxFilterKey =
  | "all"
  | OrgInboxThreadStatus
  | "unread"
  | "verify"
  | "pending_pay";

export type OrgInboxPanelHandle = {
  reload: (silent?: boolean) => void;
};

type Props = {
  orgId: string;
  /** Lọc mặc định khi mở. */
  initialFilter?: OrgInboxFilterKey;
  /**
   * Chọn hội thoại theo roomId khi mở (deep link Noti / chip overlay).
   * Map sang studentUserId sau khi load threads.
   */
  initialRoomId?: string | null;
  /**
   * Chọn hội thoại theo user học viên (deep link từ trang Học viên).
   * Nếu chưa có thread (phòng trống), tạo phòng + stub inbox.
   */
  initialStudentUserId?: string | null;
  /** Ẩn filter tab (parent tự lọc). */
  hideFilters?: boolean;
  /** Filter khóa từ parent — nếu set, panel không tự lọc nội bộ. */
  filterOverride?: OrgInboxFilterKey;
  /** Header phụ trong pane detail (CTA staff). */
  renderDetailActions?: (thread: OrgInboxThread) => ReactNode;
  onToast?: (message: string) => void;
  /** Báo badge/list ra ngoài (nav). */
  onThreadsChange?: (threads: OrgInboxThread[]) => void;
  /** Expose reload cho parent (ghi danh / gửi đơn). */
  panelRef?: MutableRefObject<OrgInboxPanelHandle | null>;
  className?: string;
  /** Staff có quyền đối soát HP — hiện CTA xác nhận trên card học phí. */
  canConfirmHocPhi?: boolean;
  /** Brand CSĐT — fallback logo/tên trên card học phí cũ. */
  orgBrand?: { ten?: string | null; anh?: string | null } | null;
  /** Toast trạng thái — hiện trong cột chat (dưới header). */
  statusFlash?: string | null;
};

export function OrgInboxPanel({
  orgId,
  initialFilter = "open",
  initialRoomId = null,
  initialStudentUserId = null,
  hideFilters = false,
  filterOverride,
  renderDetailActions,
  onToast,
  onThreadsChange,
  panelRef,
  className,
  canConfirmHocPhi = false,
  orgBrand = null,
  statusFlash = null,
}: Props) {
  const toast = useCallback(
    (message: string) => {
      onToast?.(message);
    },
    [onToast],
  );

  const [threads, setThreads] = useState<OrgInboxThread[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [filter, setFilter] = useState<OrgInboxFilterKey>(initialFilter);
  const [reply, setReply] = useState("");
  const [pending, startTransition] = useTransition();

  const activeFilter = filterOverride ?? filter;

  const unreadThreadCount = useMemo(
    () => threads.filter((t) => t.unread).length,
    [threads],
  );

  const filtered = useMemo(() => {
    if (activeFilter === "all") return threads;
    if (activeFilter === "unread") return threads.filter((t) => t.unread);
    if (activeFilter === "verify")
      return threads.filter((t) => t.pendingVerification);
    if (activeFilter === "pending_pay")
      return threads.filter((t) => t.pendingDonHocPhi);
    return threads.filter((t) => t.status === activeFilter);
  }, [threads, activeFilter]);

  const selected = useMemo(
    () => threads.find((t) => t.studentUserId === selectedStudentId) ?? null,
    [threads, selectedStudentId],
  );

  const { viewerProfileId } = useCinsChat();
  const threadsRef = useRef(threads);
  threadsRef.current = threads;
  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  useChatRealtime(viewerProfileId, (row: ChatRealtimeRow) => {
    if (!viewerProfileId) return;
    if (!tinHienVoiViewer(row.chi_hien_cho, viewerProfileId)) return;
    const hit = threadsRef.current.find((t) => t.roomId === row.id_phong);
    if (!hit) return;

    const mapped = mapRealtimeRow(row, viewerProfileId);
    const isActive = selectedRef.current?.roomId === row.id_phong;
    const fromStudent = row.id_nguoi_gui === hit.studentUserId;

    if (isActive) {
      setMessages((prev) => reconcileChatMessage(prev, mapped));
    }

    setThreads((list) => {
      const next = list.map((t) => {
        if (t.roomId !== row.id_phong) return t;
        const unreadBump = !isActive && fromStudent;
        return {
          ...t,
          preview: messagePreviewText(mapped).slice(0, 80),
          lastAt: mapped.sentAt,
          unread: isActive ? false : unreadBump ? true : t.unread,
          unreadCount: isActive
            ? 0
            : unreadBump
              ? t.unreadCount + 1
              : t.unreadCount,
          status: fromStudent ? ("open" as const) : t.status,
        };
      });
      return [...next].sort(
        (a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime(),
      );
    });
  });

  const loadThreads = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false;
      if (!silent) {
        setLoadingThreads(true);
        setLoadError(null);
      }
      try {
        const res = await fetch(`/api/org/${orgId}/inbox/threads`, {
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
        onThreadsChange?.(next);
        if (!silent) {
          setFilter((current) => {
            if (filterOverride) return current;
            if (current === "verify" || current === "pending_pay") return "open";
            return current;
          });
          setSelectedStudentId((current) => {
            if (current && next.some((t) => t.studentUserId === current))
              return current;
            if (
              initialStudentUserId &&
              next.some((t) => t.studentUserId === initialStudentUserId)
            ) {
              return initialStudentUserId;
            }
            if (initialRoomId) {
              const byRoom = next.find((t) => t.roomId === initialRoomId);
              if (byRoom) return byRoom.studentUserId;
            }
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
        if (!silent) setLoadingThreads(false);
      }
    },
    [
      orgId,
      onThreadsChange,
      filterOverride,
      initialRoomId,
      initialStudentUserId,
    ],
  );

  const loadMessages = useCallback(
    async (studentUserId: string, roomId?: string | null) => {
      setLoadingMessages(true);
      setMessageError(null);
      try {
        const qs = roomId ? `?roomId=${encodeURIComponent(roomId)}` : "";
        const res = await fetch(
          `/api/org/${orgId}/student-chat/${encodeURIComponent(studentUserId)}/messages${qs}`,
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
    [orgId],
  );

  useEffect(() => {
    void loadThreads();
  }, [loadThreads]);

  const deepLinkUserHandled = useRef(false);
  useEffect(() => {
    if (!initialStudentUserId || deepLinkUserHandled.current || loadingThreads) {
      return;
    }
    if (threads.some((t) => t.studentUserId === initialStudentUserId)) {
      deepLinkUserHandled.current = true;
      setSelectedStudentId(initialStudentUserId);
      return;
    }

    deepLinkUserHandled.current = true;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(
          `/api/org/${orgId}/student-chat/${encodeURIComponent(initialStudentUserId)}/messages`,
          { cache: "no-store" },
        );
        const json = (await res.json()) as {
          roomId?: string;
          peer?: {
            tenHienThi?: string;
            slug?: string;
            avatarUrl?: string | null;
          };
          error?: string;
        };
        if (!res.ok || !json.roomId || cancelled) return;

        const stub: OrgInboxThread = {
          roomId: json.roomId,
          studentUserId: initialStudentUserId,
          studentName: json.peer?.tenHienThi?.trim() || "Học viên",
          studentSlug: json.peer?.slug?.trim() || "",
          studentAvatarUrl: json.peer?.avatarUrl ?? null,
          studentContactLabel: "Học viên",
          studentContactRole: "hoc_vien",
          studentRole: "Thành viên CINs",
          subject: "Hội thoại",
          preview: "Chưa có tin nhắn",
          lastAt: new Date().toISOString(),
          unread: false,
          unreadCount: 0,
          status: "open",
          pendingVerification: null,
          pendingDonHocPhi: false,
          enrollments: [],
        };

        setThreads((prev) => {
          if (prev.some((t) => t.studentUserId === initialStudentUserId)) {
            return prev;
          }
          return [stub, ...prev];
        });
        setSelectedStudentId(initialStudentUserId);
      } catch {
        /* giữ inbox như cũ nếu không mở được phòng */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [initialStudentUserId, loadingThreads, threads, orgId]);

  const selectedRoomId = selected?.roomId ?? null;

  useEffect(() => {
    if (!selectedStudentId) return;
    void loadMessages(selectedStudentId, selectedRoomId);
  }, [selectedStudentId, selectedRoomId, loadMessages]);

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
    try {
      const roomId = selected?.roomId ?? null;
      const res = await fetch(
        `/api/org/${orgId}/student-chat/${encodeURIComponent(studentUserId)}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...payload,
            ...(roomId ? { roomId } : {}),
          }),
        },
      );
      const json = (await res.json()) as {
        message?: ChatMessage;
        roomId?: string;
        error?: string;
      };
      if (!res.ok || !json.message) {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
        toast(json.error ?? "Không gửi được tin nhắn.");
        return false;
      }
      setMessages((prev) => reconcileChatMessage(prev, json.message!));
      if (json.roomId) {
        setThreads((list) =>
          list.map((thread) =>
            thread.studentUserId === studentUserId
              ? { ...thread, roomId: json.roomId! }
              : thread,
          ),
        );
      }
      patchThreadAfterSend(studentUserId, json.message!);
      return true;
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      toast("Lỗi mạng.");
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
    replyTo: ChatMessage | null,
  ) {
    if (!selected || pending) return;

    const plan = buildChatSendPlan({
      text,
      images: images.map((image) => ({
        localId: image.localId,
        imageId: image.imageId,
        previewUrl: image.previewUrl,
      })),
      replyTo: replyTo ? toReplyPreview(replyTo) : null,
    });
    const optimistics = optimisticMessagesFromPlan(plan);
    if (optimistics.length === 0) return;

    const studentUserId = selected.studentUserId;
    const replyToId = replyTo?.id ?? null;
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
        replyToId,
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
                const roomIdForAlbum = selected?.roomId ?? null;
                for (const payload of payloads) {
                  const res = await fetch(
                    `/api/org/${orgId}/student-chat/${encodeURIComponent(studentUserId)}/messages`,
                    {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        ...payload,
                        ...(roomIdForAlbum ? { roomId: roomIdForAlbum } : {}),
                      }),
                    },
                  );
                  const json = (await res.json()) as {
                    message?: ChatMessage;
                    roomId?: string;
                    error?: string;
                  };
                  if (!res.ok || !json.message) {
                    throw new Error(json.error ?? "Không gửi được ảnh.");
                  }
                  realMessages.push(json.message);
                  if (json.roomId) {
                    setThreads((list) =>
                      list.map((thread) =>
                        thread.studentUserId === studentUserId
                          ? { ...thread, roomId: json.roomId! }
                          : thread,
                      ),
                    );
                  }
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
                setMessages((prev) => prev.filter((m) => m.id !== albumId));
                toast(
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
          toast("Không gửi được tin nhắn. Hãy thử lại.");
        },
      });
    });
  }

  function sendSticker(item: UserEmojiMuc) {
    if (!selected || pending) return;
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

  useEffect(() => {
    if (!panelRef) return;
    panelRef.current = {
      reload: (silent = true) => void loadThreads({ silent }),
    };
    return () => {
      panelRef.current = null;
    };
  }, [panelRef, loadThreads]);

  return (
    <div className={`tdh-message-inbox-layout${className ? ` ${className}` : ""}`}>
      <aside className="tdh-message-inbox-list-pane">
        {!hideFilters ? (
          <div
            className="tdh-message-inbox-filters"
            role="tablist"
            aria-label="Lọc hội thoại"
          >
            {(
              [
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
                aria-selected={activeFilter === key}
                className={`tdh-message-inbox-filter${activeFilter === key ? " on" : ""}`}
                onClick={() => setFilter(key)}
              >
                {label}
                <span className="tdh-message-inbox-filter-count">{count}</span>
              </button>
            ))}
          </div>
        ) : null}

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
            setMessages={setMessages}
            loading={loadingMessages}
            error={messageError}
            reply={reply}
            sending={pending}
            detailActions={renderDetailActions?.(selected)}
            canConfirmHocPhi={canConfirmHocPhi}
            orgBrand={orgBrand}
            statusFlash={statusFlash}
            onToast={toast}
            onReplyChange={setReply}
            onSend={(text, images, filesByLocalId, inFlightUploads, replyTo) =>
              sendReply(text, images, filesByLocalId, inFlightUploads, replyTo)
            }
            onSendSticker={sendSticker}
            onRefresh={() => void loadThreads({ silent: true })}
          />
        ) : (
          <p className="tdh-message-inbox-pick">
            Chọn một hội thoại bên trái để đọc và trả lời.
          </p>
        )}
      </section>
    </div>
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
        className={`tdh-message-inbox-thread${active ? " is-active" : ""}${thread.unread ? " is-unread" : ""}`}
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
              <span className="tdh-message-inbox-thread-name">
                {thread.studentName}
              </span>
              <InboxContactRoleBadge
                label={thread.studentContactLabel}
                roleKey={thread.studentContactRole}
                className="tdh-message-inbox-thread-role-badge"
              />
            </span>
            <time
              className="tdh-message-inbox-thread-time"
              dateTime={thread.lastAt}
            >
              {formatInboxTime(thread.lastAt)}
            </time>
          </span>
          <span className="tdh-message-inbox-thread-subject">
            {thread.subject}
          </span>
          <span className="tdh-message-inbox-thread-preview">
            {thread.preview}
          </span>
        </span>
        {thread.unread ? (
          <span className="tdh-message-inbox-thread-dot" aria-hidden />
        ) : null}
      </button>
    </li>
  );
}

function ThreadDetail({
  thread,
  messages,
  setMessages,
  loading,
  error,
  reply,
  sending,
  detailActions,
  canConfirmHocPhi = false,
  orgBrand = null,
  statusFlash = null,
  onToast,
  onReplyChange,
  onSend,
  onSendSticker,
  onRefresh,
}: {
  thread: OrgInboxThread;
  messages: ChatMessage[];
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  loading: boolean;
  error: string | null;
  reply: string;
  sending: boolean;
  detailActions?: ReactNode;
  canConfirmHocPhi?: boolean;
  orgBrand?: { ten?: string | null; anh?: string | null } | null;
  statusFlash?: string | null;
  onToast: (message: string) => void;
  onReplyChange: (v: string) => void;
  onSend: (
    text: string,
    images: PendingImageDraft[],
    filesByLocalId: Map<string, File>,
    inFlightUploads: Map<
      string,
      Promise<import("@/lib/chat/compose-image-upload").ComposeImageUploadResult>
    >,
    replyTo: ChatMessage | null,
  ) => void;
  onSendSticker: (item: UserEmojiMuc) => void;
  onRefresh: () => void;
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

  const {
    actionHandlers,
    replyTarget,
    setReplyTarget,
    editingMessageId,
    editingDraft,
    setEditingDraft,
    handleSaveEdit,
    handleCancelEdit,
    clearComposeExtras,
  } = useChatRoomMessageActions({
    roomId: thread.roomId,
    setMessages,
    onError: onToast,
  });

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
    clearComposeExtras();
  }, [thread.studentUserId, clearComposeExtras]);

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
  const canSend = Boolean(reply.trim()) || sendableImages.length > 0;

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
    const replyTo = replyTarget;
    onSend(reply, images, files, uploads, replyTo);
    setReplyTarget(null);
    revokeDraftImageUrls(pendingImages);
    setPendingImages([]);
    pendingFilesByLocalIdRef.current.clear();
    inFlightUploadsRef.current.clear();
    setStickerPickerOpen(false);
  }

  return (
    <>
      <header className="tdh-message-inbox-detail-hdr">
        <div>
          <h4 className="tdh-message-inbox-detail-title">
            {thread.studentName}
          </h4>
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
        {detailActions ? (
          <div className="tdh-message-inbox-detail-actions">
            {detailActions}
          </div>
        ) : null}
      </header>

      {statusFlash ? (
        <p className="cso-tin-nhan-flash cso-tin-nhan-flash--in-chat" role="status">
          {statusFlash}
        </p>
      ) : null}

      {loading ? (
        <p className="tdh-message-inbox-pick">
          <Loader2
            size={16}
            className="tdh-milestone-tag-org-msg-spin"
            aria-hidden
          />
          Đang tải tin nhắn…
        </p>
      ) : error ? (
        <p className="tdh-message-inbox-pick">{error}</p>
      ) : (
        <div
          ref={messagesContainerRef}
          className="tdh-message-inbox-messages cins-chat-messages"
          onClick={(e) => {
            const t = e.target as HTMLElement;
            if (t.closest(".cins-chat-don-card-cta")) {
              window.setTimeout(() => onRefresh(), 600);
            }
          }}
        >
          {messages.length === 0 ? (
            <p className="tdh-message-inbox-thread-empty">Chưa có tin nhắn.</p>
          ) : (
            <ChatMessageThreadItems
              messages={messages}
              roomId={thread.roomId}
              actionHandlers={actionHandlers}
              editingMessageId={editingMessageId}
              editingDraft={editingDraft}
              onEditingDraftChange={setEditingDraft}
              onSaveEdit={handleSaveEdit}
              onCancelEdit={handleCancelEdit}
              canConfirmHocPhi={canConfirmHocPhi}
              orgBrand={orgBrand}
              renderTheirAvatar={() => <InboxStudentAvatar thread={thread} />}
            />
          )}
          <div ref={messagesEndRef} />
        </div>
      )}

      <div className="tdh-message-inbox-compose cins-chat-compose">
        {replyTarget ? (
          <ChatReplyComposeBar
            target={replyTarget}
            onCancel={() => setReplyTarget(null)}
          />
        ) : null}
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
            <MsIcon name="comedy_mask" className="cins-chat-attach-meme-icon" />
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
              <Loader2
                size={16}
                className="tdh-milestone-tag-org-msg-spin"
                aria-hidden
              />
            ) : (
              <Send size={16} strokeWidth={2.2} aria-hidden />
            )}
          </button>
        </div>
      </div>
    </>
  );
}
