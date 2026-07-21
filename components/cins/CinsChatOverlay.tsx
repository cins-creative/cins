"use client";

import {
  BellOff,
  Bookmark,
  CalendarDays,
  ChevronDown,
  Frame,
  MessageSquareQuote,
  PanelRightOpen,
  Pin,
  PictureInPicture2,
  PinOff,
  Plus,
  Search,
  Send,
  Settings2,
  Users,
  X,
  Maximize2,
  Minimize2,
} from "lucide-react";
import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type DragEvent as ReactDragEvent,
} from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";

const ChatCanvasBoard = dynamic(
  () => import("@/components/cins/canvas/ChatCanvasBoard"),
  {
    ssr: false,
    loading: () => <p className="cins-chat-side-empty">Đang tải canvas…</p>,
  },
);

import { ChatCreateGroupModal } from "@/components/cins/ChatCreateGroupModal";
import { ChatGroupMembersPopover } from "@/components/cins/ChatGroupMembersPopover";
import {
  ChatAtMentionMenu,
  filterChatAtMembers,
  isChatAtMentionAll,
} from "@/components/cins/ChatAtMentionMenu";
import { ChatComposeToolsMenu } from "@/components/cins/ChatComposeToolsMenu";
import { ChatGroupAvatar } from "@/components/cins/ChatGroupAvatar";
import { ChatGroupManageModal } from "@/components/cins/ChatGroupManageModal";
import { ChatRenameGroupModal } from "@/components/cins/ChatRenameGroupModal";
import { ChatMessageThreadItems } from "@/components/cins/ChatMessageThreadItems";
import { ChatRoomMocsPanel } from "@/components/cins/ChatRoomWorkspacePanels";
import { ChatStickerPicker } from "@/components/cins/ChatStickerPicker";
import { ChatReplyComposeBar } from "@/components/cins/ChatReplyComposeBar";
import {
  buildThreadMenuActions,
  ChatThreadRowMenu,
  useThreadLongPress,
} from "@/components/cins/ChatThreadRowMenu";
import type { ChatMessageActionHandlers } from "@/components/cins/ChatMessageActions";
import { canvasBridge } from "@/components/cins/canvas/canvas-bridge";
import { addChatMessageToCanvas } from "@/lib/chat/canvas/add-message-client";
import { useCinsChat } from "@/components/cins/CinsChatProvider";
import {
  avatarBg,
  avatarHueFromSeed,
  avatarInitialFromName,
  formatChatTime,
} from "@/lib/chat/avatar";
import { writeChatThreadsCache, writeRoomMessagesCache } from "@/lib/chat/chat-session-cache";
import {
  expandedParentIdsFromRecord,
  expandedParentsRecordFromIds,
  readExpandedProjectParentIds,
  writeExpandedProjectParentIds,
} from "@/lib/chat/expanded-project-parents-storage";
import {
  readChatSidePanel,
  writeChatSidePanel,
} from "@/lib/chat/side-panel-storage";
import {
  revokeDraftImageUrls,
  type PendingImageDraft,
  type RoomComposeDraft,
} from "@/lib/chat/compose-draft";
import {
  fetchChatComposeImageUpload,
  normalizeRestoredComposeImages,
  patchPendingImageUploadResult,
  planPendingImageAdditions,
} from "@/lib/chat/compose-image-upload";
import { buildChatSendPlan, optimisticMessagesFromPlan, type ChatSendPayload } from "@/lib/chat/compose-send-plan";
import { executeComposeSendPlanInBackground } from "@/lib/chat/execute-compose-send-plan";
import {
  fetchPinnedMessages,
  patchChatMessage,
  toggleChatReaction,
} from "@/lib/chat/message-actions-client";
import { fetchRoomMessagesPage } from "@/lib/chat/messages-client";
import {
  mentionsIncludeUser,
  resolveMentionsAgainstMembers,
} from "@/lib/chat/mentions";
import {
  applyOrgRoomReadCursorRealtime,
  patchChatReadCursorMessage,
  upsertChatReadCursor,
} from "@/lib/chat/read-cursors-client";
import { useChatReadCursorsRealtime } from "@/lib/chat/use-chat-read-cursors-realtime";
import {
  patchThreadMessages,
  updateMessageInList,
} from "@/lib/chat/patch-thread-messages";
import {
  preserveThreadMessages,
  threadLikelyHasMessages,
} from "@/lib/chat/thread-merge";
import { applyOptimisticReaction } from "@/lib/chat/optimistic-reactions";
import {
  createOptimisticChatMessage,
  messagePreviewText,
} from "@/lib/chat/optimistic-message";
import {
  appendChatMessageIfNew,
  mergeChatMessageUpdate,
  reconcileChatMessage,
  realtimeMentionsViewer,
} from "@/lib/chat/realtime";
import { applyChatViewerPerspective } from "@/lib/chat/message-perspective";
import { applyKnownGroupSender } from "@/lib/chat/apply-known-group-sender";
import { replaceOptimisticAlbumWithRealMessages } from "@/lib/chat/replace-album-batch";
import {
  isPendingRoomId,
  pendingDirectRoomId,
} from "@/lib/chat/optimistic-thread";
import {
  getAtHashTrigger,
  type AtHashTrigger,
} from "@/lib/editor/use-at-hash-trigger";
import type { UserEmojiMuc } from "@/lib/user-emoji/types";
import { userEmojiDeliveryUrl } from "@/lib/user-emoji/delivery-url";
import { imageFilesFromClipboard } from "@/lib/files/clipboard-images";
import { isAllowedUploadImageFile } from "@/lib/files/infer-image-mime";
import {
  hasShareDragData,
  readShareDragData,
  type CinsSharePayload,
} from "@/lib/cins/share-drag";
import { chatImageDeliveryUrl } from "@/lib/chat/image-url";
import {
  CHAT_ORG_KIND_LABEL,
  CHAT_PARTICIPANT_KIND_LABEL,
  CHAT_THREAD_GROUP_LABEL,
  CHAT_THREAD_GROUP_ORDER,
  type ChatContextCard,
  type ChatGroupMember,
  type ChatMessage,
  type ChatMessageReplyPreview,
  type ChatLaunchState,
  type ChatParticipantKind,
  type ChatPollSummary,
  type ChatReadCursor,
  type ChatThread,
  type ChatThreadGroup,
} from "@/lib/chat/types";

type Props = {
  launch: ChatLaunchState | null;
  onClose: () => void;
  onUnreadChange: (count: number) => void;
};

/** Stub roomId-only từ openChat — không được đè tên/nhóm/avatar đã hydrate. */
function isSparseLaunchThread(thread: ChatThread): boolean {
  return (
    thread.name === "Hội thoại" &&
    thread.avatarInitial === "?" &&
    thread.messages.length === 0 &&
    !thread.isGroup &&
    !thread.peerUserId &&
    !thread.orgId &&
    !thread.isSelf
  );
}

function mergeLaunchThread(
  prev: ChatThread[],
  incoming: ChatThread,
): ChatThread[] {
  const existing = prev.find(
    (thread) =>
      thread.roomId === incoming.roomId ||
      thread.id === incoming.id ||
      (incoming.peerUserId != null && thread.peerUserId === incoming.peerUserId) ||
      (incoming.kind === "org" &&
        thread.kind === "org" &&
        incoming.orgId != null &&
        thread.orgId === incoming.orgId) ||
      (incoming.isGroup && thread.isGroup && thread.roomId === incoming.roomId),
  );
  const merged: ChatThread = !existing
    ? incoming
    : isSparseLaunchThread(incoming)
      ? {
          ...incoming,
          ...existing,
          id: existing.id,
          roomId: existing.roomId || incoming.roomId,
          messages:
            existing.messages.length > 0
              ? existing.messages
              : incoming.messages,
        }
      : {
          ...existing,
          ...incoming,
          messages:
            incoming.messages.length > 0
              ? incoming.messages
              : existing.messages,
        };
  // Chỉ loại trùng identity — KHÔNG so sánh peerUserId khi cả hai undefined
  // (nhóm/org không có peer → trước đây xóa sạch mọi nhóm khi merge 1 project).
  const rest = prev.filter((thread) => {
    if (thread.id === merged.id || thread.roomId === merged.roomId) return false;
    if (
      merged.peerUserId != null &&
      thread.peerUserId === merged.peerUserId
    ) {
      return false;
    }
    if (
      merged.peerUserId &&
      thread.roomId === pendingDirectRoomId(merged.peerUserId)
    ) {
      return false;
    }
    if (
      merged.kind === "org" &&
      thread.kind === "org" &&
      merged.orgId != null &&
      thread.orgId === merged.orgId
    ) {
      return false;
    }
    return true;
  });
  return [merged, ...rest];
}

type ChatSidePanel = "pin" | "mocs" | "canvas";

type BanBeListFilter = "all" | "nhom" | "ca_nhan";

const BAN_BE_FILTER_ORDER: BanBeListFilter[] = ["all", "nhom", "ca_nhan"];

const BAN_BE_FILTER_LABEL: Record<BanBeListFilter, string> = {
  all: "Tất cả",
  nhom: "Nhóm",
  ca_nhan: "Cá nhân",
};

const SIDE_PANEL_LABEL: Record<ChatSidePanel, string> = {
  pin: "Tin đã ghim",
  mocs: "Mốc",
  canvas: "Canvas",
};

const SIDE_PANEL_ORDER: ChatSidePanel[] = [
  "pin",
  "mocs",
  "canvas",
];

function sidePanelIcon(panel: ChatSidePanel) {
  switch (panel) {
    case "pin":
      return Pin;
    case "mocs":
      return CalendarDays;
    case "canvas":
      return Frame;
  }
}

/** Sắp list: nhóm cha rồi project con indent ngay dưới. */
function nestGroupThreads(
  list: ChatThread[],
  options?: { expandedParentIds?: Set<string> },
): ChatThread[] {
  const childrenByParent = new Map<string, ChatThread[]>();
  const roots: ChatThread[] = [];

  for (const t of list) {
    const parentId = t.parentRoomId?.trim();
    if (t.isGroup && parentId) {
      const arr = childrenByParent.get(parentId) ?? [];
      arr.push(t);
      childrenByParent.set(parentId, arr);
    } else {
      roots.push(t);
    }
  }

  const out: ChatThread[] = [];
  const usedChildIds = new Set<string>();
  const expanded = options?.expandedParentIds;

  for (const root of roots) {
    out.push(root);
    const kids = childrenByParent.get(root.roomId);
    if (!kids?.length) continue;
    if (expanded && !expanded.has(root.roomId)) continue;
    kids.sort(
      (a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime(),
    );
    for (const kid of kids) {
      out.push(kid);
      usedChildIds.add(kid.roomId);
    }
  }

  // Project mà cha không có trong list (lọc / ẩn) — vẫn hiện ở cuối
  for (const [parentId, kids] of childrenByParent) {
    if (roots.some((r) => r.roomId === parentId)) continue;
    for (const kid of kids) {
      if (!usedChildIds.has(kid.roomId)) out.push(kid);
    }
  }

  return out;
}

/** Số project đang hoạt động (không ẩn) theo id nhóm cha. */
function countActiveProjectsByParent(
  threads: ChatThread[],
): Map<string, number> {
  const map = new Map<string, number>();
  for (const t of threads) {
    const parentId = t.parentRoomId?.trim();
    if (!t.isGroup || !parentId) continue;
    if (t.roomTrangThai === "an") continue;
    map.set(parentId, (map.get(parentId) ?? 0) + 1);
  }
  return map;
}

function threadKindLabel(thread: ChatThread): string {
  if (thread.kind === "org" && thread.orgKind) {
    return CHAT_ORG_KIND_LABEL[thread.orgKind];
  }
  return CHAT_PARTICIPANT_KIND_LABEL[thread.kind];
}

/** Khớp tên hội thoại hoặc tên/slug thành viên nhóm (khi nhóm đổi tên riêng). */
function threadMatchesQuery(thread: ChatThread, q: string): boolean {
  if (!q) return true;
  if (
    thread.name.toLowerCase().includes(q) ||
    thread.preview.toLowerCase().includes(q) ||
    thread.role.toLowerCase().includes(q) ||
    threadKindLabel(thread).toLowerCase().includes(q)
  ) {
    return true;
  }
  if (!thread.isGroup || !thread.memberAvatars?.length) return false;
  return thread.memberAvatars.some((member) => {
    const name = member.name?.toLowerCase() ?? "";
    const slug = member.slug?.toLowerCase() ?? "";
    return name.includes(q) || slug.includes(q);
  });
}

function threadKindClass(thread: ChatThread): string {
  if (thread.kind === "org" && thread.orgKind) {
    return ` is-org is-${thread.orgKind}`;
  }
  return thread.kind === "org" ? " is-org" : " is-user";
}

function ChatAvatar({
  initial,
  hue,
  size = 40,
  kind = "user",
  verified = false,
  avatarUrl = null,
}: {
  initial: string;
  hue: number;
  size?: number;
  kind?: ChatParticipantKind;
  verified?: boolean;
  avatarUrl?: string | null;
}) {
  return (
    <span className="cins-chat-avatar-wrap">
      <span
        className={`cins-chat-avatar${kind === "org" ? " is-org" : ""}${avatarUrl ? " has-image" : ""}`}
        style={{
          width: size,
          height: size,
          fontSize: size * 0.38,
          background: avatarUrl ? "transparent" : avatarBg(hue),
        }}
        aria-hidden
      >
        {avatarUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={avatarUrl} alt="" />
        ) : (
          initial
        )}
      </span>
      {kind === "org" && verified ? (
        <span className="cins-chat-avatar-verified" aria-label="Verified">
          ✓
        </span>
      ) : null}
    </span>
  );
}

function ChatKindPill({ thread }: { thread: ChatThread }) {
  if (thread.kind === "user") return null;
  return (
    <span className={`cins-chat-kind-pill${threadKindClass(thread)}`}>
      {threadKindLabel(thread)}
    </span>
  );
}

function ChatThreadRow({
  thread,
  isActive,
  isListPinned,
  isMuted,
  canShowMenu,
  isMenuOpen,
  onMenuOpenChange,
  onSelect,
  onViewProfile,
  onToggleListPin,
  onToggleMute,
  onManageGroup,
  onRenameGroup,
  onCreateProject,
  onLeaveGroup,
  onDeleteGroup,
  onHideThread,
  onBlockUser,
  activeProjectCount = 0,
  projectsExpanded = false,
  onToggleProjects,
  shareDropActive = false,
  onShareDrop,
}: {
  thread: ChatThread;
  isActive: boolean;
  isListPinned: boolean;
  isMuted: boolean;
  canShowMenu: boolean;
  isMenuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
  onSelect: (thread: ChatThread) => void;
  onViewProfile: (thread: ChatThread) => void;
  onToggleListPin: (thread: ChatThread) => void;
  onToggleMute: (thread: ChatThread) => void;
  onManageGroup: (thread: ChatThread) => void;
  onRenameGroup: (thread: ChatThread) => void;
  onCreateProject: (thread: ChatThread) => void;
  onLeaveGroup: (thread: ChatThread) => void;
  onDeleteGroup: (thread: ChatThread) => void;
  onHideThread: (thread: ChatThread) => void;
  onBlockUser: (thread: ChatThread) => void;
  /** Số project active dưới nhóm gốc. */
  activeProjectCount?: number;
  projectsExpanded?: boolean;
  onToggleProjects?: () => void;
  /** Drop mode chia sẻ — row nhận thả để gửi vào phòng. */
  shareDropActive?: boolean;
  onShareDrop?: (thread: ChatThread, payload: CinsSharePayload) => void;
}) {
  const [isShareTarget, setIsShareTarget] = useState(false);
  const preview = thread.typing ? "… đang gõ" : thread.preview;
  const { touchHandlers, consumeLongPress } = useThreadLongPress(
    () => onMenuOpenChange(true),
    !canShowMenu,
  );

  const canViewProfile =
    !thread.isGroup &&
    thread.kind === "user" &&
    Boolean(thread.peerSlug?.trim());

  const canBlock =
    !thread.isGroup &&
    thread.kind === "user" &&
    Boolean(thread.peerUserId?.trim());

  const canCreateProject =
    Boolean(thread.isGroup) &&
    Boolean(thread.isGroupAdmin) &&
    !thread.parentRoomId;

  const isProjectChild = Boolean(thread.parentRoomId);
  const isProjectParent =
    Boolean(thread.isGroup) && !thread.parentRoomId && activeProjectCount > 0;

  const menuActions = buildThreadMenuActions({
    isListPinned,
    isMuted,
    isGroup: Boolean(thread.isGroup),
    isGroupAdmin: Boolean(thread.isGroupAdmin),
    isGroupOwner: Boolean(thread.isGroupOwner),
    isProjectChild,
    canViewProfile,
    onViewProfile: () => onViewProfile(thread),
    canBlock,
    onBlockUser: () => onBlockUser(thread),
    onToggleListPin: () => onToggleListPin(thread),
    onToggleMute: () => onToggleMute(thread),
    canRenameGroup: Boolean(thread.isGroup && thread.isGroupAdmin),
    onRenameGroup: () => onRenameGroup(thread),
    canCreateProject,
    onCreateProject: () => onCreateProject(thread),
    onManageGroup: thread.isGroupAdmin
      ? () => onManageGroup(thread)
      : undefined,
    onLeaveGroup: () => onLeaveGroup(thread),
    onDeleteGroup: () => onDeleteGroup(thread),
    onHideThread: () => onHideThread(thread),
  });

  const nameStatusIcons = isMuted ? (
    <BellOff
      size={12}
      strokeWidth={2.4}
      className="cins-chat-thread-muted-inline"
      aria-hidden
    />
  ) : null;

  return (
    <li
      className={`cins-chat-thread-item${thread.isSelf ? " is-self-item" : ""}${isListPinned ? " is-list-pinned" : ""}${isMenuOpen ? " is-menu-open" : ""}${isMuted ? " is-muted" : ""}${isProjectChild ? " is-project-child" : ""}${isProjectParent ? " is-project-parent" : ""}${isProjectParent && projectsExpanded ? " is-projects-expanded" : ""}${isShareTarget ? " is-share-target" : ""}`}
      onContextMenu={(event) => {
        if (canShowMenu) event.preventDefault();
      }}
      {...(shareDropActive
        ? {
            onDragOver: (event: ReactDragEvent<HTMLLIElement>) => {
              if (!hasShareDragData(event.dataTransfer)) return;
              event.preventDefault();
              event.dataTransfer.dropEffect = "copy";
              if (!isShareTarget) setIsShareTarget(true);
            },
            onDragLeave: (event: ReactDragEvent<HTMLLIElement>) => {
              if (event.currentTarget.contains(event.relatedTarget as Node)) {
                return;
              }
              setIsShareTarget(false);
            },
            onDrop: (event: ReactDragEvent<HTMLLIElement>) => {
              setIsShareTarget(false);
              const payload = readShareDragData(event.dataTransfer);
              if (!payload) return;
              event.preventDefault();
              onShareDrop?.(thread, payload);
            },
          }
        : {})}
      {...touchHandlers}
    >
      <div
        className={`cins-chat-thread-row${thread.isGroup && !isProjectChild ? " is-group-row" : ""}${isProjectParent ? " has-project-toggle" : ""}`}
      >
        {isListPinned ? (
          <Pin
            size={12}
            strokeWidth={2.2}
            className="cins-chat-thread-list-pin-corner"
            aria-hidden
          />
        ) : null}
        <button
          type="button"
          className={`cins-chat-thread${isActive ? " is-active" : ""}${thread.kind === "org" ? " is-org-thread" : " is-user-thread"}${thread.isSelf ? " is-self-thread" : ""}${thread.isGroup ? " is-group-thread" : ""}${isProjectChild ? " is-project-thread" : ""}${isProjectParent ? " is-project-parent-thread" : ""}`}
          onClick={() => {
            if (consumeLongPress()) return;
            onSelect(thread);
          }}
        >
          {isProjectChild ? (
            <span className="cins-chat-thread-main is-project-simple">
              <span className="cins-chat-project-branch" aria-hidden>
                <span className="cins-chat-project-branch-stem" />
                <span className="cins-chat-project-branch-elbow" />
              </span>
              <span className="cins-chat-thread-name">
                {nameStatusIcons}
                {thread.avatarUrl ? (
                  <span className="cins-chat-project-thumb" aria-hidden>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={thread.avatarUrl} alt="" />
                  </span>
                ) : (
                  <span className="cins-chat-project-hash">#</span>
                )}
                <strong>{thread.name}</strong>
              </span>
              {thread.unread > 0 && !isMuted ? (
                <span className="cins-chat-unread">{thread.unread}</span>
              ) : null}
              {(thread.unreadMentions ?? 0) > 0 && !isMuted ? (
                <span className="cins-chat-mention-badge" title="Có tin nhắc bạn">
                  @
                </span>
              ) : null}
            </span>
          ) : thread.isGroup ? (
            <>
              <ChatGroupAvatar
                size={44}
                avatarUrl={thread.avatarUrl}
                members={thread.memberAvatars ?? []}
              />
              <span className="cins-chat-thread-main is-group-card">
                <span className="cins-chat-thread-top">
                  <span className="cins-chat-thread-name">
                    {nameStatusIcons}
                    <Users
                      size={13}
                      strokeWidth={2.3}
                      className="cins-chat-group-name-icon"
                      aria-hidden
                    />
                    <strong>{thread.name}</strong>
                  </span>
                  <time dateTime={thread.lastAt}>
                    {formatChatTime(thread.lastAt)}
                  </time>
                </span>
                <span className="cins-chat-thread-bottom">
                  <span className="cins-chat-thread-preview">{preview}</span>
                  <span className="cins-chat-thread-badges">
                    {(thread.unreadMentions ?? 0) > 0 && !isMuted ? (
                      <span
                        className="cins-chat-mention-badge"
                        title="Có tin nhắc bạn"
                      >
                        @
                      </span>
                    ) : null}
                    {thread.unread > 0 && !isMuted ? (
                      <span className="cins-chat-unread">{thread.unread}</span>
                    ) : null}
                  </span>
                </span>
              </span>
            </>
          ) : (
            <>
              {thread.isSelf ? (
                <span className="cins-chat-self-avatar" aria-hidden>
                  <Bookmark size={20} strokeWidth={2.2} />
                </span>
              ) : (
                <ChatAvatar
                  initial={thread.avatarInitial}
                  hue={thread.avatarHue}
                  kind={thread.kind}
                  verified={thread.verified}
                  avatarUrl={thread.avatarUrl}
                />
              )}
              <span className="cins-chat-thread-main">
                <span className="cins-chat-thread-top">
                  <span className="cins-chat-thread-name">
                    {nameStatusIcons}
                    <strong>{thread.name}</strong>
                    <ChatKindPill thread={thread} />
                  </span>
                  <time dateTime={thread.lastAt}>
                    {formatChatTime(thread.lastAt)}
                  </time>
                </span>
                <span className="cins-chat-thread-bottom">
                  <span className="cins-chat-thread-preview">{preview}</span>
                  {thread.unread > 0 && !isMuted ? (
                    <span className="cins-chat-unread">{thread.unread}</span>
                  ) : null}
                </span>
              </span>
            </>
          )}
        </button>
        {isProjectParent && onToggleProjects ? (
          <div className="cins-chat-thread-aside">
            {canShowMenu ? (
              <ChatThreadRowMenu
                open={isMenuOpen}
                onOpenChange={onMenuOpenChange}
                actions={menuActions}
              />
            ) : null}
            <button
              type="button"
              className={`cins-chat-project-toggle${projectsExpanded ? " is-expanded" : ""}`}
              aria-expanded={projectsExpanded}
              title={
                projectsExpanded
                  ? `Thu gọn ${activeProjectCount} nhóm`
                  : `Xổ ${activeProjectCount} nhóm`
              }
              aria-label={
                projectsExpanded
                  ? `Thu gọn ${activeProjectCount} nhóm`
                  : `Xổ ${activeProjectCount} nhóm`
              }
              onClick={(event) => {
                event.stopPropagation();
                onToggleProjects();
              }}
            >
              <span className="cins-chat-project-toggle-count" aria-hidden>
                {activeProjectCount} nhóm
                <ChevronDown
                  size={10}
                  strokeWidth={2.6}
                  className="cins-chat-project-toggle-chevron"
                />
              </span>
            </button>
          </div>
        ) : canShowMenu ? (
          <ChatThreadRowMenu
            open={isMenuOpen}
            onOpenChange={onMenuOpenChange}
            actions={menuActions}
          />
        ) : null}
      </div>
    </li>
  );
}

function messageToReplyPreview(msg: ChatMessage): ChatMessageReplyPreview {
  return {
    id: msg.id,
    from: msg.from,
    body: msg.body,
    kind: msg.kind,
    imageUrl: msg.imageUrl,
    deleted: msg.deleted,
  };
}

export function CinsChatOverlay({ launch, onClose, onUnreadChange }: Props) {
  const router = useRouter();
  const {
    subscribeChatMessages,
    setChatFocus,
    viewerProfileId,
    getCachedThreads,
    getCachedRoomMessages,
    prefetchChatData,
    isRoomPinned,
    togglePinRoom,
    popOutRoomToBubble,
    pinnedListRoomIds,
    isListPinned,
    toggleListPin,
    unpinListRoom,
    unpinRoom,
    isRoomMuted,
    toggleMuteRoom,
    hiddenRoomIds,
    hideRoom,
    unhideRoom,
    shareDropMode,
    completeShareDrop,
  } = useCinsChat();
  const [threads, setThreads] = useState<ChatThread[]>(() =>
    launch?.thread ? [launch.thread] : [],
  );
  const [activeId, setActiveId] = useState(() => launch?.thread?.id ?? "");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [atMentionTrigger, setAtMentionTrigger] = useState<AtHashTrigger | null>(
    null,
  );
  const [atMentionIndex, setAtMentionIndex] = useState(0);
  const [groupMembersByRoom, setGroupMembersByRoom] = useState<
    Record<string, ChatGroupMember[]>
  >({});
  const [mentionBanner, setMentionBanner] = useState<{
    roomId: string;
    messageId: string;
    senderName: string;
  } | null>(null);
  const [pendingImages, setPendingImages] = useState<PendingImageDraft[]>([]);
  /** Card ngữ cảnh "chờ" theo phòng — chèn vào ô soạn, chỉ gửi khi user gửi tin. */
  const [pendingCardByRoom, setPendingCardByRoom] = useState<
    Record<string, ChatContextCard>
  >({});
  /** Tránh gửi 2 lần khi launch.autoSendNguCanh. */
  const autoSentNguCanhRef = useRef<string | null>(null);
  const [mobileShowThread, setMobileShowThread] = useState(() => Boolean(launch?.thread));
  const [sidePanel, setSidePanel] = useState<ChatSidePanel | null>(null);
  const [chatFullscreen, setChatFullscreen] = useState(false);
  const [membersPopoverOpen, setMembersPopoverOpen] = useState(false);
  const skipPersistSidePanelRef = useRef(true);
  /** Tab cuối khi panel đang mở — dùng khi bấm "Mở rộng" lại sau khi đóng. */
  const lastSidePanelRef = useRef<ChatSidePanel>("mocs");
  const [composeToolsOpen, setComposeToolsOpen] = useState(false);
  const [mocFormOpenKey, setMocFormOpenKey] = useState(0);
  const [replyTarget, setReplyTarget] = useState<ChatMessage | null>(null);
  const [stickerPickerOpen, setStickerPickerOpen] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState("");
  const [pinnedByRoom, setPinnedByRoom] = useState<Record<string, ChatMessage[]>>({});
  const [readCursorsByRoom, setReadCursorsByRoom] = useState<
    Record<string, ChatReadCursor[]>
  >({});
  const [activeTab, setActiveTab] = useState<ChatThreadGroup>(
    () => launch?.tab ?? launch?.thread?.group ?? "ban_be",
  );
  const [banBeFilter, setBanBeFilter] = useState<BanBeListFilter>("all");
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [manageGroupThread, setManageGroupThread] = useState<ChatThread | null>(
    null,
  );
  const [manageGroupSection, setManageGroupSection] = useState<
    "thong_tin" | "thanh_vien" | "project"
  >("thong_tin");
  const [manageDeleteConfirm, setManageDeleteConfirm] = useState(false);
  const [renameGroupThread, setRenameGroupThread] = useState<ChatThread | null>(
    null,
  );
  /** roomId nhóm gốc → đã xổ project con (mặc định thu; nhớ theo viewer). */
  const [expandedProjectParents, setExpandedProjectParents] = useState<
    Record<string, boolean>
  >({});
  const skipPersistExpandedParentsRef = useRef(true);
  const [threadMenuRoomId, setThreadMenuRoomId] = useState<string | null>(null);
  const [uploadingGroupAvatar, setUploadingGroupAvatar] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const [loadingThreads, setLoadingThreads] = useState(() => !launch?.thread);
  const [loadingOlderRoomId, setLoadingOlderRoomId] = useState<string | null>(null);
  const [roomStatus, setRoomStatus] = useState<
    Record<string, "idle" | "loading" | "ready" | "error">
  >({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [canvasNotice, setCanvasNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!canvasNotice) return;
    const t = window.setTimeout(() => setCanvasNotice(null), 3200);
    return () => window.clearTimeout(t);
  }, [canvasNotice]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const chatRootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const groupAvatarInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const roomStatusRef = useRef<Record<string, "idle" | "loading" | "ready" | "error">>(
    {},
  );
  const hasMoreByRoomRef = useRef<Map<string, boolean>>(new Map());
  const [hasMoreByRoom, setHasMoreByRoom] = useState<Record<string, boolean>>({});
  const composeByRoomRef = useRef<Map<string, RoomComposeDraft>>(new Map());
  const mentionBannerExpectRef = useRef<string | null>(null);
  const pendingImagesRef = useRef<PendingImageDraft[]>([]);
  const pendingFilesByLocalIdRef = useRef<Map<string, File>>(new Map());
  const inFlightUploadsRef = useRef<
    Map<string, Promise<import("@/lib/chat/compose-image-upload").ComposeImageUploadResult>>
  >(new Map());
  /** roomId → optimistic album id — set đồng bộ khi gửi, trước khi React render optimistic. */
  const pendingAlbumByRoomRef = useRef(new Map<string, string>());
  const activeRoomIdRef = useRef<string | null>(null);
  const shouldScrollToBottomRef = useRef(true);

  const scrollMessagesToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
    const el = messagesContainerRef.current;
    if (!el) return;
    if (behavior === "auto") {
      el.scrollTop = el.scrollHeight;
      return;
    }
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);
  const scrollMessagesToBottomRef = useRef(scrollMessagesToBottom);
  scrollMessagesToBottomRef.current = scrollMessagesToBottom;
  const forcedEmptyReloadRef = useRef<Set<string>>(new Set());
  const highlightTimerRef = useRef<number | null>(null);

  pendingImagesRef.current = pendingImages;

  // Giữ launch mới nhất cho effect prefetch (deps []) — tránh closure cũ đọc
  // thread optimistic `org:` rồi ghi đè activeId về phòng tạm sau khi đã resolve.
  const launchRef = useRef(launch);
  launchRef.current = launch;

  const active = useMemo(() => {
    const byId = threads.find((t) => t.id === activeId);
    if (byId) return byId;
    /* Launch stub dùng roomId làm id — khớp cả roomId khi list API khác id. */
    return threads.find((t) => t.roomId === activeId) ?? null;
  }, [threads, activeId]);

  useEffect(() => {
    if (!canvasBridge.pendingOpenCanvas) return;
    canvasBridge.pendingOpenCanvas = false;
    setSidePanel("canvas");
  }, [active?.roomId, portalReady]);

  useEffect(() => {
    setReplyTarget(null);
    setEditingMessageId(null);
    setEditingDraft("");
  }, [active?.roomId]);

  useEffect(() => {
    if (!active && sidePanel) {
      // Chỉ ẩn panel UI — không ghi null vào preference (canvas vẫn nhớ khi expand lại).
      skipPersistSidePanelRef.current = true;
      setSidePanel(null);
    }
  }, [active, sidePanel]);

  useEffect(() => {
    if (!sidePanel) setChatFullscreen(false);
  }, [sidePanel]);

  activeRoomIdRef.current = active?.roomId ?? null;

  const handleReadCursorRealtime = useCallback(
    (row: {
      id_phong: string;
      id_nguoi_dung: string;
      id_tin_nhan_cuoi_doc: string | null;
    }) => {
      const roomId = row.id_phong;
      const messageId = row.id_tin_nhan_cuoi_doc?.trim();
      if (!messageId) return;

      setReadCursorsByRoom((prev) => {
        const current = prev[roomId] ?? [];
        const thread = threads.find((t) => t.roomId === roomId);

        if (thread) {
          const orgApplied = applyOrgRoomReadCursorRealtime(
            current,
            thread,
            row.id_nguoi_dung,
            messageId,
          );
          if (orgApplied) {
            return { ...prev, [roomId]: orgApplied };
          }
        }

        const patched = patchChatReadCursorMessage(
          current,
          row.id_nguoi_dung,
          messageId,
        );
        if (patched) {
          return { ...prev, [roomId]: patched };
        }

        const member = thread?.memberAvatars?.find(
          (m) => m.userId === row.id_nguoi_dung,
        );
        const name =
          member?.name?.trim() ||
          (thread &&
          !thread.isGroup &&
          thread.peerUserId === row.id_nguoi_dung
            ? thread.name
            : null) ||
          "Thành viên";
        const nextCursor: ChatReadCursor = {
          userId: row.id_nguoi_dung,
          messageId,
          name,
          slug: member?.slug,
          avatarUrl:
            member?.avatarUrl ??
            (thread &&
            !thread.isGroup &&
            thread.peerUserId === row.id_nguoi_dung
              ? thread.avatarUrl
              : null),
          initial: member?.initial ?? avatarInitialFromName(name),
          hue: member?.hue ?? avatarHueFromSeed(row.id_nguoi_dung),
        };
        return {
          ...prev,
          [roomId]: upsertChatReadCursor(current, nextCursor),
        };
      });
    },
    [threads],
  );

  useChatReadCursorsRealtime(
    active?.roomId,
    viewerProfileId,
    handleReadCursorRealtime,
  );

  const activeRoomStatus = active?.roomId ? roomStatus[active.roomId] : undefined;
  const isPendingRoom = active?.roomId != null && isPendingRoomId(active.roomId);
  const loadingMessages =
    active?.roomId != null &&
    !isPendingRoom &&
    (activeRoomStatus === "idle" || activeRoomStatus === "loading");
  const messagesLoaded = activeRoomStatus === "ready";
  const messagesLoadError = activeRoomStatus === "error";
  const connecting = Boolean(launch?.resolving && isPendingRoom);

  const patchRoomStatus = useCallback(
    (roomId: string, status: "idle" | "loading" | "ready" | "error") => {
      roomStatusRef.current = { ...roomStatusRef.current, [roomId]: status };
      setRoomStatus((prev) => ({ ...prev, [roomId]: status }));
    },
    [],
  );

  useEffect(() => {
    return () => {
      revokeDraftImageUrls(pendingImagesRef.current);
    };
  }, []);

  const saveComposeForRoom = useCallback(
    (roomId: string) => {
      composeByRoomRef.current.set(roomId, {
        text: draft,
        images: pendingImages,
      });
    },
    [draft, pendingImages],
  );

  const restoreComposeForRoom = useCallback((roomId: string) => {
    const saved = composeByRoomRef.current.get(roomId);
    setDraft(saved?.text ?? "");
    setPendingImages(normalizeRestoredComposeImages(saved?.images ?? []));
  }, []);

  const applyUploadResultToRoom = useCallback(
    (roomId: string | null, localId: string, result: Awaited<ReturnType<typeof fetchChatComposeImageUpload>>) => {
      if (roomId) {
        const saved = composeByRoomRef.current.get(roomId);
        if (saved?.images.some((item) => item.localId === localId)) {
          composeByRoomRef.current.set(roomId, {
            ...saved,
            images: patchPendingImageUploadResult(saved.images, localId, result),
          });
        }
      }

      if (activeRoomIdRef.current !== roomId) return;

      setPendingImages((prev) => {
        if (!prev.some((item) => item.localId === localId)) return prev;
        return patchPendingImageUploadResult(prev, localId, result);
      });
    },
    [],
  );

  const clearPendingImages = useCallback(() => {
    setPendingImages((prev) => {
      revokeDraftImageUrls(prev);
      return [];
    });
  }, []);

  const removePendingImage = useCallback((localId: string) => {
    pendingFilesByLocalIdRef.current.delete(localId);
    setPendingImages((prev) => {
      const target = prev.find((item) => item.localId === localId);
      if (target?.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((item) => item.localId !== localId);
    });
  }, []);

  const uploadPendingImage = useCallback(
    async (file: File, localId: string, roomId: string | null) => {
      const promise = fetchChatComposeImageUpload(file);
      inFlightUploadsRef.current.set(localId, promise);
      try {
        const result = await promise;
        applyUploadResultToRoom(roomId, localId, result);
      } finally {
        inFlightUploadsRef.current.delete(localId);
      }
    },
    [applyUploadResultToRoom],
  );

  const addImageFiles = useCallback(
    (files: File[]) => {
      const roomId = activeRoomIdRef.current;
      const planned = planPendingImageAdditions(files, pendingImagesRef.current);
      if (planned.length === 0) return;

      setPendingImages((prev) => [...prev, ...planned.map((item) => item.draft)]);

      for (const { file, draft } of planned) {
        pendingFilesByLocalIdRef.current.set(draft.localId, file);
        void uploadPendingImage(file, draft.localId, roomId);
      }
    },
    [uploadPendingImage],
  );

  const handleComposePaste = useCallback(
    (event: ClipboardEvent<HTMLTextAreaElement>) => {
      const files = imageFilesFromClipboard(event.clipboardData);
      if (files.length === 0) return;
      event.preventDefault();
      addImageFiles(files);
    },
    [addImageFiles],
  );

  const hasMoreOlder = active?.roomId
    ? hasMoreByRoom[active.roomId] ?? false
    : false;
  const loadingOlder =
    active?.roomId != null && loadingOlderRoomId === active.roomId;

  const projectCountByParent = useMemo(
    () => countActiveProjectsByParent(threads),
    [threads],
  );

  const expandedProjectParentIds = useMemo(() => {
    const set = new Set<string>();
    for (const [roomId, open] of Object.entries(expandedProjectParents)) {
      if (open) set.add(roomId);
    }
    // Đang mở project con → luôn xổ cha để thấy ngữ cảnh
    const activeParent = active?.parentRoomId?.trim();
    if (activeParent) set.add(activeParent);
    return set;
  }, [expandedProjectParents, active?.parentRoomId]);

  const toggleProjectParentExpanded = useCallback((parentRoomId: string) => {
    setExpandedProjectParents((prev) => ({
      ...prev,
      [parentRoomId]: !prev[parentRoomId],
    }));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    // «Gửi riêng cho tôi» — không lọc theo tab/sub-filter/ẩn, luôn đầu danh sách.
    const selfThread = threads.find(
      (t) => t.isSelf && threadMatchesQuery(t, q),
    );
    const list = threads.filter((t) => {
      if (t.isSelf) return false;
      if (t.group !== activeTab) return false;
      if (hiddenRoomIds.includes(t.roomId)) return false;
      if (activeTab === "ban_be") {
        if (banBeFilter === "nhom" && !t.isGroup) return false;
        if (banBeFilter === "ca_nhan" && t.isGroup) return false;
      }
      return threadMatchesQuery(t, q);
    });

    const nested = nestGroupThreads(
      [...list].sort((a, b) => {
        const aIdx = pinnedListRoomIds.indexOf(a.roomId);
        const bIdx = pinnedListRoomIds.indexOf(b.roomId);
        const aPinned = aIdx >= 0;
        const bPinned = bIdx >= 0;
        if (aPinned !== bPinned) return aPinned ? -1 : 1;
        if (aPinned && bPinned && aIdx !== bIdx) return aIdx - bIdx;
        return new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime();
      }),
      // Đang tìm kiếm → hiện hết project khớp query
      q ? undefined : { expandedParentIds: expandedProjectParentIds },
    );
    return selfThread ? [selfThread, ...nested] : nested;
  }, [
    threads,
    query,
    activeTab,
    banBeFilter,
    pinnedListRoomIds,
    hiddenRoomIds,
    expandedProjectParentIds,
  ]);

  const banBeFilterCounts = useMemo(() => {
    const q = query.trim().toLowerCase();
    const inTab = threads.filter(
      (t) => !t.isSelf && t.group === "ban_be" && threadMatchesQuery(t, q),
    );
    return {
      all: inTab.length,
      nhom: inTab.filter((t) => t.isGroup).length,
      ca_nhan: inTab.filter((t) => !t.isGroup).length,
    };
  }, [threads, query]);

  const tabUnread = useMemo(() => {
    const counts = Object.fromEntries(
      CHAT_THREAD_GROUP_ORDER.map((group) => [group, 0]),
    ) as Record<ChatThreadGroup, number>;

    for (const thread of threads) {
      counts[thread.group] += thread.unread;
    }

    return counts;
  }, [threads]);

  const totalUnread = useMemo(
    () => threads.reduce((sum, t) => sum + t.unread, 0),
    [threads],
  );

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!viewerProfileId) {
      skipPersistExpandedParentsRef.current = true;
      setExpandedProjectParents({});
      skipPersistSidePanelRef.current = true;
      setSidePanel(null);
      return;
    }
    skipPersistExpandedParentsRef.current = true;
    setExpandedProjectParents(
      expandedParentsRecordFromIds(
        readExpandedProjectParentIds(viewerProfileId),
      ),
    );
    skipPersistSidePanelRef.current = true;
    const restored = readChatSidePanel(viewerProfileId);
    if (restored) lastSidePanelRef.current = restored;
    // Không mở canvas/side khi chưa chọn hội thoại — `.has-canvas` ẩn list
    // và chỉ còn "Chọn hội thoại…". Preference vẫn ở lastSidePanelRef (nút expand).
    setSidePanel(null);
  }, [viewerProfileId]);

  useEffect(() => {
    if (sidePanel) lastSidePanelRef.current = sidePanel;
  }, [sidePanel]);

  useEffect(() => {
    if (!viewerProfileId) return;
    if (skipPersistExpandedParentsRef.current) {
      skipPersistExpandedParentsRef.current = false;
      return;
    }
    writeExpandedProjectParentIds(
      viewerProfileId,
      expandedParentIdsFromRecord(expandedProjectParents),
    );
  }, [viewerProfileId, expandedProjectParents]);

  useEffect(() => {
    if (!viewerProfileId) return;
    if (skipPersistSidePanelRef.current) {
      skipPersistSidePanelRef.current = false;
      return;
    }
    writeChatSidePanel(viewerProfileId, sidePanel);
  }, [viewerProfileId, sidePanel]);

  useEffect(() => {
    setComposeToolsOpen(false);
    setMembersPopoverOpen(false);
  }, [activeId]);

  useEffect(() => {
    setAtMentionTrigger(null);
    setAtMentionIndex(0);
  }, [activeId]);

  /** Load members nhóm để gợi ý @. */
  useEffect(() => {
    const roomId = active?.roomId;
    if (!roomId || !active?.isGroup || isPendingRoomId(roomId)) return;

    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/chat/rooms/${roomId}/members`, {
          cache: "no-store",
        });
        if (!res.ok || cancelled) return;
        const json = (await res.json()) as { members?: ChatGroupMember[] };
        if (cancelled || !json.members) return;
        setGroupMembersByRoom((prev) => ({ ...prev, [roomId]: json.members! }));
      } catch {
        /* ignore */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [active?.roomId, active?.isGroup]);

  /** Banner nhắc khi vào phòng nhóm còn unreadMentions. */
  useEffect(() => {
    if (!active?.isGroup || !viewerProfileId) {
      setMentionBanner(null);
      return;
    }
    const expectRoom = mentionBannerExpectRef.current;
    if (expectRoom !== active.roomId) return;
    if (active.messages.length === 0) return;

    const mentioned = [...active.messages]
      .reverse()
      .find(
        (m) =>
          !m.deleted &&
          m.from === "them" &&
          mentionsIncludeUser(m.mentions, viewerProfileId),
      );
    if (!mentioned) {
      mentionBannerExpectRef.current = null;
      return;
    }

    setMentionBanner({
      roomId: active.roomId,
      messageId: mentioned.id,
      senderName: mentioned.senderName?.trim() || "Ai đó",
    });
    mentionBannerExpectRef.current = null;
  }, [active?.isGroup, active?.messages, active?.roomId, viewerProfileId]);

  useEffect(() => {
    setChatFocus(active?.roomId ?? null, "full");
    return () => setChatFocus(null, null);
  }, [active?.roomId, setChatFocus]);

  /** Quét mốc tới hạn nhắc / đến giờ khi đang mở hội thoại nhóm. */
  useEffect(() => {
    const roomId = active?.roomId;
    if (!roomId || !active?.isGroup || isPendingRoomId(roomId)) return;

    let cancelled = false;

    const runTick = async () => {
      try {
        const res = await fetch("/api/chat/mocs/tick", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomId }),
        });
        if (!res.ok || cancelled) return;
        const json = (await res.json().catch(() => null)) as {
          messages?: ChatMessage[];
          removedMessageIds?: string[];
        } | null;
        const msgs = json?.messages ?? [];
        const removedIds = json?.removedMessageIds ?? [];
        if ((!msgs.length && !removedIds.length) || cancelled) return;
        setThreads((prev) =>
          prev.map((t) => {
            if (t.roomId !== roomId) return t;
            let messages = t.messages;
            if (removedIds.length) {
              const removeSet = new Set(removedIds);
              messages = messages.filter((m) => !removeSet.has(m.id));
            }
            let lastAt = t.lastAt;
            let preview = t.preview;
            for (const raw of msgs) {
              const message = applyChatViewerPerspective(
                [raw],
                viewerProfileId,
              )[0]!;
              const enriched = t.isGroup
                ? applyKnownGroupSender(message, t.memberAvatars)
                : message;
              messages = appendChatMessageIfNew(messages, enriched);
              preview = messagePreviewText(enriched);
              lastAt = enriched.sentAt;
            }
            return {
              ...t,
              messages,
              preview,
              lastAt,
            };
          }),
        );
      } catch {
        /* ignore */
      }
    };

    void runTick();
    const timer = window.setInterval(() => void runTick(), 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [active?.roomId, active?.isGroup, viewerProfileId]);

  useEffect(() => {
    return subscribeChatMessages((event) => {
      if (event.event === "insert") {
        unhideRoom(event.roomId);
      }

      const message = applyChatViewerPerspective(
        [event.message],
        viewerProfileId,
      )[0]!;

      let missingThread = false;

      setThreads((prev) => {
        let found = false;
        const next = prev.map((t) => {
          if (t.roomId !== event.roomId) return t;
          found = true;
          const enriched = t.isGroup
            ? applyKnownGroupSender(message, t.memberAvatars)
            : message;
          const isActive = t.roomId === activeRoomIdRef.current;
          const pendingAlbumId =
            pendingAlbumByRoomRef.current.get(event.roomId) ?? null;
          const donHangBump =
            event.event === "update" &&
            enriched.from === "them" &&
            enriched.nguCanh?.loai === "don_hang" &&
            event.lastAt > t.lastAt;
          return {
            ...t,
            preview: event.preview,
            lastAt: event.lastAt,
            messages: isActive
              ? event.event === "update"
                ? mergeChatMessageUpdate(t.messages, enriched)
                : appendChatMessageIfNew(t.messages, enriched, {
                    pendingAlbumOptimisticId: pendingAlbumId,
                  })
              : t.messages,
            unread: isActive
              ? 0
              : (event.event === "insert" && enriched.from === "them") ||
                  donHangBump
                ? t.unread + 1
                : t.unread,
            unreadMentions: isActive
              ? 0
              : event.event === "insert" &&
                  enriched.from === "them" &&
                  realtimeMentionsViewer(enriched, viewerProfileId)
                ? (t.unreadMentions ?? 0) + 1
                : t.unreadMentions,
          };
        });

        if (!found) missingThread = true;
        return next;
      });

      if (
        event.event === "insert" &&
        message.from === "them" &&
        event.roomId === activeRoomIdRef.current &&
        realtimeMentionsViewer(message, viewerProfileId)
      ) {
        setMentionBanner({
          roomId: event.roomId,
          messageId: message.id,
          senderName: message.senderName?.trim() || "Ai đó",
        });
      }

      if (missingThread) {
        void (async () => {
          try {
            const res = await fetch("/api/chat/threads", { cache: "no-store" });
            if (!res.ok) return;
            const json = (await res.json()) as { threads?: ChatThread[] };
            const incoming = json.threads?.find((t) => t.roomId === event.roomId);
            if (!incoming) return;
            setThreads((prev) => mergeLaunchThread(prev, incoming));
          } catch {
            /* ignore */
          }
        })();
      }

      if (
        event.roomId === activeRoomIdRef.current &&
        message.from === "them"
      ) {
        void fetch(`/api/chat/rooms/${event.roomId}/read`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id_tin_nhan_cuoi: message.id }),
        });
      }

      if (event.roomId === activeRoomIdRef.current) {
        const container = messagesContainerRef.current;
        const nearBottom = container
          ? container.scrollHeight - container.scrollTop - container.clientHeight < 80
          : true;
        if (nearBottom) {
          shouldScrollToBottomRef.current = true;
          requestAnimationFrame(() =>
            scrollMessagesToBottomRef.current("smooth"),
          );
        }
      }

      if (
        event.event === "insert" &&
        message.kind === "binh_chon" &&
        !message.poll
      ) {
        void (async () => {
          try {
            const res = await fetch(
              `/api/chat/rooms/${event.roomId}/polls?messageIds=${encodeURIComponent(message.id)}`,
              { cache: "no-store" },
            );
            if (!res.ok) return;
            const json = (await res.json()) as {
              polls?: Record<string, ChatPollSummary>;
            };
            const poll = json.polls?.[message.id];
            if (!poll) return;
            setThreads((prev) =>
              prev.map((t) =>
                t.roomId !== event.roomId
                  ? t
                  : {
                      ...t,
                      messages: updateMessageInList(t.messages, message.id, {
                        poll,
                      }),
                    },
              ),
            );
          } catch {
            /* ignore */
          }
        })();
      }
    });
  }, [subscribeChatMessages, unhideRoom, viewerProfileId]);

  useEffect(() => {
    if (!launch?.thread) return;

    const incoming = launch.thread;
    setThreads((prev) => mergeLaunchThread(prev, incoming));
    setActiveId(incoming.id);
    setActiveTab(launch.tab ?? incoming.group);
    setMobileShowThread(true);

    if (incoming.peerUserId) {
      const pendingId = pendingDirectRoomId(incoming.peerUserId);
      if (roomStatusRef.current[pendingId]) {
        const next = { ...roomStatusRef.current };
        delete next[pendingId];
        roomStatusRef.current = next;
        setRoomStatus(next);
      }
    }
  }, [launch?.thread, launch?.tab]);

  // Card ngữ cảnh chờ: gắn theo phòng THỰC của hội thoại vừa mở. Dùng
  // active.roomId (không phải launch.thread.roomId) vì org room có thể resolve
  // sang roomId canonical khác — nếu key theo launch cũ, card sẽ mất khi
  // active đổi sang roomId thật. Chỉ gắn khi active đúng là hội thoại đã launch.
  useEffect(() => {
    const card = launch?.nguCanh;
    const launchThread = launch?.thread;
    if (!card || !launchThread || !active) return;
    const roomId = active.roomId;
    if (!roomId || isPendingRoomId(roomId)) return;
    const sameThread =
      active.id === launchThread.id ||
      (active.orgId != null && active.orgId === launchThread.orgId) ||
      (active.peerUserId != null &&
        active.peerUserId === launchThread.peerUserId);
    if (!sameThread) return;
    setPendingCardByRoom((prev) =>
      prev[roomId] ? prev : { ...prev, [roomId]: card },
    );
  }, [launch?.nguCanh, launch?.thread, active]);

  useEffect(() => {
    void (async () => {
      setLoadError(null);

      const cached = getCachedThreads();
      if (cached?.threads.length) {
        setThreads((prev) => {
          let next = preserveThreadMessages(prev, cached.threads);
          const launchThread = launchRef.current?.thread;
          if (launchThread) {
            next = mergeLaunchThread(next, launchThread);
          }
          return next;
        });
        onUnreadChange(cached.totalUnread);
        setLoadingThreads(false);
        // Không set activeId — FAB chỉ mở list; launch effect chọn thread khi có target.
      } else if (!launchRef.current?.thread) {
        setLoadingThreads(true);
      }

      try {
        const snapshot = await prefetchChatData();
        if (!snapshot) {
          if (!cached?.threads.length && !launchRef.current?.thread) {
            throw new Error("Không tải được hội thoại.");
          }
          return;
        }

        if (viewerProfileId) {
          writeChatThreadsCache(viewerProfileId, snapshot);
        }

        setThreads((prev) => {
          let next = preserveThreadMessages(prev, snapshot.threads);
          const launchThread = launchRef.current?.thread;
          if (launchThread) {
            next = mergeLaunchThread(next, launchThread);
          }
          return next;
        });
        onUnreadChange(snapshot.totalUnread);
        // activeId chỉ đổi qua launch effect hoặc user chọn trong list.
      } catch (error) {
        if (!launchRef.current?.thread && !cached?.threads.length) {
          setLoadError(
            error instanceof Error ? error.message : "Không tải được hội thoại.",
          );
        }
      } finally {
        setLoadingThreads(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (shareDropMode) {
      document.body.style.overflow = "";
      return;
    }
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [shareDropMode]);

  /** Share-drop: thu hẹp shell + rail full-height; gỡ khi hết kéo. */
  useEffect(() => {
    if (!shareDropMode) return;
    const root = document.documentElement;
    root.classList.add("is-cins-share-dropping");
    return () => {
      root.classList.remove("is-cins-share-dropping");
    };
  }, [shareDropMode]);

  /** Mobile keyboard — neo overlay theo visualViewport để không đẩy mất header/tin. */
  useEffect(() => {
    if (!portalReady) return;
    const root = chatRootRef.current;
    if (!root) return;

    const syncVisualViewport = () => {
      const vv = window.visualViewport;
      const height = Math.round(vv?.height ?? window.innerHeight);
      const offsetTop = Math.round(vv?.offsetTop ?? 0);
      root.style.setProperty("--cins-chat-vv-height", `${height}px`);
      root.style.setProperty("--cins-chat-vv-top", `${offsetTop}px`);
      const layoutH = window.innerHeight;
      root.classList.toggle("is-vv-shrunk", height < layoutH - 60);
    };

    syncVisualViewport();
    const vv = window.visualViewport;
    vv?.addEventListener("resize", syncVisualViewport);
    vv?.addEventListener("scroll", syncVisualViewport);
    window.addEventListener("resize", syncVisualViewport);
    return () => {
      vv?.removeEventListener("resize", syncVisualViewport);
      vv?.removeEventListener("scroll", syncVisualViewport);
      window.removeEventListener("resize", syncVisualViewport);
      root.classList.remove("is-vv-shrunk");
      root.style.removeProperty("--cins-chat-vv-height");
      root.style.removeProperty("--cins-chat-vv-top");
    };
  }, [portalReady]);

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) {
        window.clearTimeout(highlightTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (chatFullscreen) {
        setChatFullscreen(false);
        return;
      }
      if (sidePanel) {
        setSidePanel(null);
        return;
      }
      onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, sidePanel, chatFullscreen]);

  const loadMessages = useCallback(
    async (roomId: string, options?: { force?: boolean }) => {
      if (isPendingRoomId(roomId)) return;

      const status = roomStatusRef.current[roomId] ?? "idle";
      if (!options?.force && (status === "loading" || status === "ready")) {
        return;
      }

      patchRoomStatus(roomId, "loading");
      setLoadError(null);
      shouldScrollToBottomRef.current = true;

      const cached = getCachedRoomMessages(roomId);
      if (cached?.length) {
        setThreads((prev) => {
          const next = prev.map((t) => {
            if (t.roomId !== roomId) return t;
            const cachedView = applyChatViewerPerspective(
              cached,
              viewerProfileId,
            ).map((msg) =>
              t.isGroup ? applyKnownGroupSender(msg, t.memberAvatars) : msg,
            );
            return { ...t, messages: cachedView, unread: 0, unreadMentions: 0 };
          });
          onUnreadChange(next.reduce((sum, t) => sum + t.unread, 0));
          return next;
        });
        if (activeRoomIdRef.current === roomId && shouldScrollToBottomRef.current) {
          requestAnimationFrame(() => scrollMessagesToBottom("auto"));
        }
      }

      try {
        const page = await fetchRoomMessagesPage(roomId);
        if (!page) {
          throw new Error("Không tải được tin nhắn.");
        }

        const baseMessages = applyChatViewerPerspective(
          page.messages,
          viewerProfileId,
        );
        hasMoreByRoomRef.current.set(roomId, page.hasMore);
        setHasMoreByRoom((prev) => ({ ...prev, [roomId]: page.hasMore }));
        setThreads((prev) => {
          const thread = prev.find((t) => t.roomId === roomId);
          const messages =
            thread?.isGroup
              ? baseMessages.map((msg) =>
                  applyKnownGroupSender(msg, thread.memberAvatars),
                )
              : baseMessages;
          if (viewerProfileId) {
            writeRoomMessagesCache(viewerProfileId, roomId, messages);
          }
          const next = prev.map((t) =>
            t.roomId === roomId ? { ...t, messages, unread: 0, unreadMentions: 0 } : t,
          );
          onUnreadChange(next.reduce((sum, t) => sum + t.unread, 0));
          return next;
        });
        setPinnedByRoom((prev) => ({
          ...prev,
          [roomId]: page.pinnedMessages ?? [],
        }));
        setReadCursorsByRoom((prev) => ({
          ...prev,
          [roomId]: page.readCursors ?? [],
        }));
        patchRoomStatus(roomId, "ready");
      } catch (error) {
        if (cached?.length) {
          patchRoomStatus(roomId, "ready");
        } else {
          patchRoomStatus(roomId, "error");
          setLoadError(
            error instanceof Error ? error.message : "Không tải được tin nhắn.",
          );
        }
      } finally {
        if (
          activeRoomIdRef.current === roomId &&
          shouldScrollToBottomRef.current
        ) {
          requestAnimationFrame(() => scrollMessagesToBottom("auto"));
        }
      }
    },
    [
      getCachedRoomMessages,
      onUnreadChange,
      patchRoomStatus,
      scrollMessagesToBottom,
      viewerProfileId,
    ],
  );

  const loadOlderMessages = useCallback(
    async (roomId: string) => {
      if (loadingOlderRoomId || !hasMoreByRoomRef.current.get(roomId)) return;

      const thread = threads.find((t) => t.roomId === roomId);
      const before = thread?.messages[0]?.id;
      if (!thread || !before) return;

      const container = messagesContainerRef.current;
      const prevHeight = container?.scrollHeight ?? 0;

      setLoadingOlderRoomId(roomId);
      shouldScrollToBottomRef.current = false;
      try {
        const page = await fetchRoomMessagesPage(roomId, { before });
        if (!page) return;

        hasMoreByRoomRef.current.set(roomId, page.hasMore);
        setHasMoreByRoom((prev) => ({ ...prev, [roomId]: page.hasMore }));
        setThreads((prev) =>
          prev.map((t) =>
            t.roomId === roomId
              ? { ...t, messages: [...page.messages, ...t.messages] }
              : t,
          ),
        );

        requestAnimationFrame(() => {
          const el = messagesContainerRef.current;
          if (!el) return;
          el.scrollTop = el.scrollHeight - prevHeight;
        });
      } finally {
        setLoadingOlderRoomId((current) => (current === roomId ? null : current));
      }
    },
    [loadingOlderRoomId, threads],
  );

  const handleMessagesScroll = useCallback(() => {
    const el = messagesContainerRef.current;
    const roomId = activeRoomIdRef.current;
    if (!el || !roomId || loadingOlderRoomId || !hasMoreByRoomRef.current.get(roomId)) {
      return;
    }
    if (el.scrollTop > 72) return;
    void loadOlderMessages(roomId);
  }, [loadOlderMessages, loadingOlderRoomId]);

  useEffect(() => {
    const roomId = active?.roomId;
    if (!roomId || isPendingRoomId(roomId)) return;

    const status = roomStatusRef.current[roomId] ?? "idle";
    const staleEmpty =
      status === "ready" &&
      active.messages.length === 0 &&
      threadLikelyHasMessages(active) &&
      !forcedEmptyReloadRef.current.has(roomId);

    if (staleEmpty) {
      forcedEmptyReloadRef.current.add(roomId);
      void loadMessages(roomId, { force: true });
      return;
    }

    void loadMessages(roomId);
  }, [
    active?.messages.length,
    active?.preview,
    active?.roomId,
    loadMessages,
  ]);

  const selectThread = useCallback(
    (thread: ChatThread) => {
      const prevRoomId = activeRoomIdRef.current;
      if (prevRoomId && prevRoomId !== thread.roomId) {
        composeByRoomRef.current.set(prevRoomId, {
          text: draft,
          images: pendingImages,
        });
      }

      shouldScrollToBottomRef.current = true;
      setActiveId(thread.id);
      setMobileShowThread(true);
      setActiveTab(thread.group);
      restoreComposeForRoom(thread.roomId);
      if (thread.isGroup && (thread.unreadMentions ?? 0) > 0) {
        mentionBannerExpectRef.current = thread.roomId;
      } else {
        mentionBannerExpectRef.current = null;
        setMentionBanner((prev) =>
          prev?.roomId === thread.roomId ? null : prev,
        );
      }
      setThreads((prev) =>
        prev.map((t) =>
          t.id === thread.id ? { ...t, unread: 0, unreadMentions: 0 } : t,
        ),
      );
      const forceReload =
        thread.messages.length === 0 ||
        roomStatusRef.current[thread.roomId] === "error";
      void loadMessages(thread.roomId, { force: forceReload });
      if (
        !forceReload &&
        thread.messages.length > 0 &&
        roomStatusRef.current[thread.roomId] === "ready"
      ) {
        requestAnimationFrame(() => scrollMessagesToBottom("auto"));
      }

      if (thread.messages.length > 0) {
        void fetch(`/api/chat/rooms/${thread.roomId}/read`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id_tin_nhan_cuoi: thread.messages.at(-1)?.id,
          }),
        });
      }
    },
    [draft, loadMessages, pendingImages, restoreComposeForRoom, scrollMessagesToBottom],
  );

  const removeThreadFromSidebar = useCallback(
    (thread: ChatThread) => {
      unpinListRoom(thread.roomId);
      unpinRoom(thread.roomId);
      setThreadMenuRoomId((prev) => (prev === thread.roomId ? null : prev));
      setThreads((prev) => {
        const next = prev.filter((t) => t.roomId !== thread.roomId);
        setActiveId((currentActive) => {
          if (currentActive !== thread.id) return currentActive;
          setMobileShowThread(false);
          const remaining = next.filter(
            (t) =>
              t.group === thread.group && !hiddenRoomIds.includes(t.roomId),
          );
          return remaining[0]?.id ?? "";
        });
        return next;
      });
    },
    [hiddenRoomIds, unpinListRoom, unpinRoom],
  );

  const handleHideThread = useCallback(
    (thread: ChatThread) => {
      hideRoom(thread.roomId);
      setThreadMenuRoomId((prev) => (prev === thread.roomId ? null : prev));
      setActiveId((currentActive) => {
        if (currentActive !== thread.id) return currentActive;
        setMobileShowThread(false);
        const remaining = threads.filter(
          (t) =>
            t.roomId !== thread.roomId &&
            t.group === thread.group &&
            !hiddenRoomIds.includes(t.roomId),
        );
        return remaining[0]?.id ?? "";
      });
    },
    [hiddenRoomIds, hideRoom, threads],
  );

  const handleViewProfile = useCallback(
    (thread: ChatThread) => {
      const slug = thread.peerSlug?.trim();
      if (!slug) return;
      setThreadMenuRoomId(null);
      onClose();
      router.push(`/${slug}`);
    },
    [onClose, router],
  );

  const handleLeaveGroup = useCallback(
    async (thread: ChatThread) => {
      if (
        !window.confirm(`Rời nhóm "${thread.name}"? Bạn sẽ không nhận tin nhắn từ nhóm này.`)
      ) {
        return;
      }
      try {
        const res = await fetch(`/api/chat/rooms/${thread.roomId}/leave`, {
          method: "POST",
        });
        const json = (await res.json()) as { error?: string };
        if (!res.ok) {
          window.alert(json.error ?? "Không rời được nhóm.");
          return;
        }
        setManageGroupThread(null);
        removeThreadFromSidebar(thread);
      } catch {
        window.alert("Không rời được nhóm.");
      }
    },
    [removeThreadFromSidebar],
  );

  const handleDeleteGroup = useCallback(
    async (thread: ChatThread, opts?: { confirmed?: boolean }) => {
      const isMainGroup = !thread.parentRoomId;
      if (!opts?.confirmed) {
        if (isMainGroup) {
          setThreadMenuRoomId(null);
          setManageGroupSection("thong_tin");
          setManageDeleteConfirm(true);
          setManageGroupThread(thread);
          return;
        }
        if (
          !window.confirm(
            `Xóa nhóm "${thread.name}"? Mọi tin nhắn sẽ mất và không thể hoàn tác.`,
          )
        ) {
          return;
        }
      }
      try {
        const res = await fetch(`/api/chat/rooms/${thread.roomId}`, {
          method: "DELETE",
        });
        const json = (await res.json()) as { error?: string };
        if (!res.ok) {
          window.alert(json.error ?? "Không xóa được nhóm.");
          return;
        }
        setManageDeleteConfirm(false);
        setManageGroupThread(null);
        removeThreadFromSidebar(thread);
      } catch {
        window.alert("Không xóa được nhóm.");
      }
    },
    [removeThreadFromSidebar],
  );

  const handleBlockUser = useCallback(
    async (thread: ChatThread) => {
      const targetUserId = thread.peerUserId?.trim();
      if (!targetUserId) return;
      if (
        !window.confirm(
          `Chặn ${thread.name}? Hai bạn sẽ không nhắn tin cho nhau được nữa và hội thoại này sẽ bị ẩn.`,
        )
      ) {
        return;
      }
      try {
        const res = await fetch(`/api/ket-ban/${targetUserId}/block`, {
          method: "POST",
        });
        const json = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        if (!res.ok) {
          window.alert(json?.error ?? "Không chặn được người dùng.");
          return;
        }
        hideRoom(thread.roomId);
        removeThreadFromSidebar(thread);
      } catch {
        window.alert("Không chặn được người dùng.");
      }
    },
    [hideRoom, removeThreadFromSidebar],
  );

  const handleGroupCreated = useCallback(
    (thread: ChatThread) => {
      setThreads((prev) => mergeLaunchThread(prev, thread));
      selectThread(thread);
    },
    [selectThread],
  );

  const handleManageGroup = useCallback((thread: ChatThread) => {
    if (!thread.isGroup) return;
    setThreadMenuRoomId(null);
    setManageDeleteConfirm(false);
    setManageGroupSection("thong_tin");
    setManageGroupThread(thread);
  }, []);

  /** Đổi tên nhóm/project nhanh — modal gọn, không mở full quản lý. */
  const handleRenameGroupQuick = useCallback((thread: ChatThread) => {
    if (!thread.isGroup || !thread.isGroupAdmin) return;
    setThreadMenuRoomId(null);
    setRenameGroupThread(thread);
  }, []);

  /** Mở modal quản lý → tab Project (không dùng window.prompt — hay bị chặn / im lặng). */
  const handleCreateProjectQuick = useCallback((thread: ChatThread) => {
    if (!thread.isGroup || !thread.isGroupAdmin || thread.parentRoomId) return;
    setThreadMenuRoomId(null);
    setManageDeleteConfirm(false);
    setExpandedProjectParents((prev) => ({ ...prev, [thread.roomId]: true }));
    setManageGroupSection("project");
    setManageGroupThread(thread);
  }, []);

  const handleGroupManaged = useCallback((thread: ChatThread) => {
    setThreads((prev) => mergeLaunchThread(prev, thread));
    setManageGroupThread((cur) =>
      cur && cur.roomId === thread.roomId ? { ...cur, ...thread } : cur,
    );
  }, []);

  const handleGroupAvatarFile = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const roomId = active?.roomId;
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!roomId || !file || !active?.isGroup || !active.isGroupAdmin) return;
      if (!isAllowedUploadImageFile(file)) return;

      setUploadingGroupAvatar(true);
      try {
        const form = new FormData();
        form.append("file", file);
        const uploadRes = await fetch("/api/avatar/upload", {
          method: "POST",
          body: form,
        });
        const uploadJson = (await uploadRes.json()) as {
          imageId?: string;
          error?: string;
        };
        if (!uploadRes.ok || !uploadJson.imageId) {
          throw new Error(uploadJson.error ?? "Upload thất bại.");
        }

        const patchRes = await fetch(`/api/chat/rooms/${roomId}/avatar`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ avatarId: uploadJson.imageId }),
        });
        const patchJson = (await patchRes.json()) as {
          thread?: ChatThread;
          error?: string;
        };
        if (!patchRes.ok || !patchJson.thread) {
          throw new Error(patchJson.error ?? "Không lưu được ảnh nhóm.");
        }

        setThreads((prev) => mergeLaunchThread(prev, patchJson.thread!));
      } catch {
        /* ignore — có thể thêm toast sau */
      } finally {
        setUploadingGroupAvatar(false);
      }
    },
    [active?.isGroup, active?.isGroupAdmin, active?.roomId],
  );

  const toggleExpandPanel = useCallback(() => {
    setSidePanel((cur) => (cur ? null : lastSidePanelRef.current));
  }, []);

  const selectSidePanelTab = useCallback((panel: ChatSidePanel) => {
    setSidePanel(panel);
  }, []);

  useEffect(() => {
    canvasBridge.ingestCommentNotice = (message) => {
      setThreads((prev) =>
        prev.map((t) => {
          if (t.roomId !== active?.roomId) return t;
          const messages = reconcileChatMessage(t.messages, message);
          return {
            ...t,
            messages,
            preview: message.body.trim() || t.preview,
            lastAt: message.sentAt || t.lastAt,
          };
        }),
      );
    };
    return () => {
      canvasBridge.ingestCommentNotice = null;
    };
  }, [active?.roomId]);

  const sendableImages = pendingImages.filter((image) => !image.error);
  const rawPendingCard = active?.roomId
    ? pendingCardByRoom[active.roomId] ?? null
    : null;
  const cardAlreadyInThread = Boolean(
    rawPendingCard &&
      active?.messages.some(
        (m) =>
          m.nguCanh != null &&
          m.nguCanh.loai === rawPendingCard.loai &&
          m.nguCanh.id === rawPendingCard.id,
      ),
  );
  const activePendingCard = cardAlreadyInThread ? null : rawPendingCard;
  const canSend =
    Boolean(active) &&
    !isPendingRoom &&
    !connecting &&
    (draft.trim().length > 0 ||
      sendableImages.length > 0 ||
      activePendingCard != null);

  const activePinnedMessages = useMemo(
    () =>
      (active?.roomId ? pinnedByRoom[active.roomId] ?? [] : []).filter(
        (msg) => !msg.deleted,
      ),
    [active?.roomId, pinnedByRoom],
  );

  const patchActiveThreadMessages = useCallback(
    (updater: (messages: ChatMessage[]) => ChatMessage[]) => {
      if (!active) return;
      setThreads((prev) => patchThreadMessages(prev, active.id, updater));
    },
    [active],
  );

  const openCanvasComments = useCallback(
    (nodeIds: string[], messageId: string) => {
      const ids = nodeIds.filter(Boolean);
      if (sidePanel === "canvas" && canvasBridge.highlightNodes) {
        canvasBridge.highlightNodes(ids);
      } else {
        canvasBridge.pendingHighlightNodeIds = ids.length > 0 ? ids : null;
      }
      setSidePanel("canvas");

      if (!active?.roomId || !messageId) return;
      const roomId = active.roomId;
      const removed = active.messages.find((m) => m.id === messageId);
      patchActiveThreadMessages((msgs) => msgs.filter((m) => m.id !== messageId));
      void patchChatMessage(roomId, messageId, {
        action: "dismiss_canvas_notice",
      }).then((res) => {
        if (res.error && removed) {
          patchActiveThreadMessages((msgs) =>
            msgs.some((m) => m.id === messageId)
              ? msgs
              : [...msgs, removed].sort(
                  (a, b) =>
                    new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime(),
                ),
          );
        }
      });
    },
    [active, patchActiveThreadMessages, sidePanel],
  );

  const handlePollUpdated = useCallback(
    (messageId: string, poll: ChatPollSummary) => {
      setThreads((prev) =>
        prev.map((t) =>
          t.roomId !== active?.roomId
            ? t
            : {
                ...t,
                messages: updateMessageInList(t.messages, messageId, { poll }),
              },
        ),
      );
    },
    [active?.roomId],
  );

  const handleComposeAddMoc = useCallback(() => {
    setSidePanel("mocs");
    setMocFormOpenKey((k) => k + 1);
  }, []);

  const handleCreatePoll = useCallback(
    async (input: {
      question: string;
      options: string[];
    }): Promise<{ ok: true } | { ok: false; error: string }> => {
      if (!active?.roomId || isPendingRoomId(active.roomId)) {
        return { ok: false, error: "Phòng chưa sẵn sàng." };
      }
      const roomId = active.roomId;
      try {
        const res = await fetch(`/api/chat/rooms/${roomId}/polls`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cau_hoi: input.question,
            lua_chon: input.options,
          }),
        });
        const json = (await res.json().catch(() => null)) as {
          message?: ChatMessage;
          error?: string;
        } | null;
        if (!res.ok || !json?.message) {
          return {
            ok: false,
            error: json?.error ?? "Không tạo được bình chọn.",
          };
        }
        const message = applyChatViewerPerspective(
          [json.message],
          viewerProfileId,
        )[0]!;
        setThreads((prev) =>
          prev.map((t) => {
            if (t.roomId !== roomId) return t;
            const enriched = t.isGroup
              ? applyKnownGroupSender(message, t.memberAvatars)
              : message;
            return {
              ...t,
              preview: messagePreviewText(enriched),
              lastAt: enriched.sentAt,
              unread: 0,
              unreadMentions: 0,
              messages: appendChatMessageIfNew(t.messages, enriched),
            };
          }),
        );
        shouldScrollToBottomRef.current = true;
        requestAnimationFrame(() => scrollMessagesToBottomRef.current("smooth"));
        return { ok: true };
      } catch {
        return { ok: false, error: "Không tạo được bình chọn." };
      }
    },
    [active?.roomId, viewerProfileId],
  );

  const refreshPinnedForRoom = useCallback(async (roomId: string) => {
    const pinned = await fetchPinnedMessages(roomId);
    setPinnedByRoom((prev) => ({ ...prev, [roomId]: pinned }));
  }, []);

  const highlightMessage = useCallback((messageId: string) => {
    const el = document.getElementById(`cins-chat-msg-${messageId}`);
    if (!el) return false;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("is-msg-highlight");
    if (highlightTimerRef.current) {
      window.clearTimeout(highlightTimerRef.current);
    }
    highlightTimerRef.current = window.setTimeout(() => {
      el.classList.remove("is-msg-highlight");
      highlightTimerRef.current = null;
    }, 1800);
    return true;
  }, []);

  const scrollToMessage = useCallback(
    async (messageId: string) => {
      if (!active) return;
      shouldScrollToBottomRef.current = false;

      const roomId = active.roomId;
      if (isPendingRoomId(roomId)) return;

      if (active.messages.some((m) => m.id === messageId)) {
        requestAnimationFrame(() => highlightMessage(messageId));
        return;
      }

      let msgs = active.messages;
      let hasMore = hasMoreByRoomRef.current.get(roomId) ?? false;

      while (hasMore) {
        const before = msgs[0]?.id;
        if (!before) break;

        const page = await fetchRoomMessagesPage(roomId, { before });
        if (!page?.messages.length) break;

        msgs = [...page.messages, ...msgs];
        hasMore = page.hasMore;
        hasMoreByRoomRef.current.set(roomId, hasMore);
        setHasMoreByRoom((prev) => ({ ...prev, [roomId]: hasMore }));
        setThreads((prev) =>
          prev.map((t) => (t.roomId === roomId ? { ...t, messages: msgs } : t)),
        );

        if (msgs.some((m) => m.id === messageId)) {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => highlightMessage(messageId));
          });
          return;
        }
      }

      setLoadError("Không tìm thấy tin nhắn trong hội thoại.");
    },
    [active, highlightMessage],
  );

  const messageActionHandlers = useMemo<ChatMessageActionHandlers>(
    () => ({
      onReply: (msg) => {
        setReplyTarget(msg);
        setEditingMessageId(null);
        inputRef.current?.focus();
      },
      onRecall: (msg) => {
        if (!active) return;
        const snapshot = { ...msg };
        patchActiveThreadMessages((msgs) =>
          updateMessageInList(msgs, msg.id, { deleted: true, body: "" }),
        );
        void patchChatMessage(active.roomId, msg.id, { action: "recall" }).then(
          (res) => {
            if (res.error) {
              patchActiveThreadMessages((msgs) =>
                updateMessageInList(msgs, msg.id, snapshot),
              );
              setLoadError(res.error);
              return;
            }
            if (res.message) {
              patchActiveThreadMessages((msgs) =>
                msgs.map((m) => (m.id === msg.id ? { ...m, ...res.message! } : m)),
              );
            }
          },
        );
      },
      onEdit: (msg) => {
        setEditingMessageId(msg.id);
        setEditingDraft(msg.body);
        setReplyTarget(null);
      },
      onPin: (msg, pinned) => {
        if (!active) return;
        const roomId = active.roomId;
        const prevPinned = pinnedByRoom[roomId] ?? [];
        patchActiveThreadMessages((msgs) =>
          updateMessageInList(msgs, msg.id, { pinned }),
        );
        setPinnedByRoom((prev) => {
          const roomPins = prev[roomId] ?? [];
          if (pinned) {
            return {
              ...prev,
              [roomId]: [{ ...msg, pinned: true }, ...roomPins.filter((p) => p.id !== msg.id)],
            };
          }
          return {
            ...prev,
            [roomId]: roomPins.filter((p) => p.id !== msg.id),
          };
        });
        void patchChatMessage(roomId, msg.id, { action: "pin", pinned }).then((res) => {
          if (res.error) {
            patchActiveThreadMessages((msgs) =>
              updateMessageInList(msgs, msg.id, { pinned: !pinned }),
            );
            setPinnedByRoom((prev) => ({ ...prev, [roomId]: prevPinned }));
            setLoadError(res.error);
            return;
          }
          void refreshPinnedForRoom(roomId);
        });
      },
      onReaction: (msg, emoji, activeReaction) => {
        if (!active) return;
        const prevReactions = msg.reactions;
        const nextReactions = applyOptimisticReaction(msg.reactions, emoji, activeReaction);
        patchActiveThreadMessages((msgs) =>
          updateMessageInList(msgs, msg.id, { reactions: nextReactions }),
        );
        void toggleChatReaction(active.roomId, msg.id, emoji, activeReaction).then((res) => {
          if (res.error) {
            patchActiveThreadMessages((msgs) =>
              updateMessageInList(msgs, msg.id, { reactions: prevReactions }),
            );
            setLoadError(res.error);
            return;
          }
          if (res.reactions) {
            patchActiveThreadMessages((msgs) =>
              updateMessageInList(msgs, msg.id, { reactions: res.reactions }),
            );
          }
        });
      },
      onAddToCanvas: (msg) => {
        if (!active?.roomId) return;
        const roomId = active.roomId;
        void addChatMessageToCanvas(roomId, msg.id).then((res) => {
          if ("error" in res) {
            setLoadError(res.error);
            setCanvasNotice(res.error);
            return;
          }
          // Luôn mở canvas + focus node — kể cả khi đã có sẵn trên board.
          canvasBridge.pendingFocusNodeId = res.node.id;
          if (canvasBridge.ingestNode) {
            canvasBridge.ingestNode(res.node);
          } else {
            canvasBridge.pendingIngestNode = res.node;
          }
          canvasBridge.pendingOpenCanvas = true;
          setSidePanel("canvas");
          // Board vừa mount: thử ingest lại sau 1 nhịp.
          window.setTimeout(() => {
            canvasBridge.ingestNode?.(res.node);
            canvasBridge.highlightNodes?.([res.node.id]);
          }, 120);
          setCanvasNotice(
            res.created ? "Đã thêm lên canvas." : "Đã mở trên canvas.",
          );
        });
      },
    }),
    [active, patchActiveThreadMessages, pinnedByRoom, refreshPinnedForRoom],
  );

  const handleSaveEdit = useCallback(
    (msg: ChatMessage) => {
      if (!active) return;
      const body = editingDraft.trim();
      if (!body || body === msg.body) {
        setEditingMessageId(null);
        return;
      }
      const snapshot = { body: msg.body, edited: msg.edited, editedAt: msg.editedAt };
      const now = new Date().toISOString();
      patchActiveThreadMessages((msgs) =>
        updateMessageInList(msgs, msg.id, {
          body,
          edited: true,
          editedAt: now,
        }),
      );
      setEditingMessageId(null);
      setEditingDraft("");
      void patchChatMessage(active.roomId, msg.id, {
        action: "edit",
        noi_dung: body,
      }).then((res) => {
        if (res.error) {
          patchActiveThreadMessages((msgs) =>
            updateMessageInList(msgs, msg.id, snapshot),
          );
          setLoadError(res.error);
          return;
        }
        if (res.message) {
          patchActiveThreadMessages((msgs) =>
            msgs.map((m) => (m.id === msg.id ? { ...m, ...res.message! } : m)),
          );
        }
      });
    },
    [active, editingDraft, patchActiveThreadMessages],
  );

  const appendOptimisticMessages = useCallback(
    (thread: ChatThread, optimistics: ChatMessage[]) => {
      if (optimistics.length === 0) return;
      const last = optimistics[optimistics.length - 1]!;
      setThreads((prev) =>
        prev.map((t) =>
          t.id === thread.id
            ? {
                ...t,
                messages: [...t.messages, ...optimistics],
                preview: messagePreviewText(last),
                lastAt: last.sentAt,
              }
            : t,
        ),
      );

      if (shouldScrollToBottomRef.current) {
        requestAnimationFrame(() => scrollMessagesToBottom("smooth"));
      }
    },
    [scrollMessagesToBottom],
  );

  const submitRoomMessage = useCallback(
    async (
      thread: ChatThread,
      payload: ChatSendPayload,
      optimisticId: string,
    ) => {
      try {
        const res = await fetch(`/api/chat/rooms/${thread.roomId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = (await res.json()) as {
          message?: ChatThread["messages"][number];
          error?: string;
        };
        if (!res.ok || !json.message) {
          throw new Error(json.error ?? "Không gửi được tin nhắn.");
        }

        const confirmed = applyChatViewerPerspective(
          [json.message],
          viewerProfileId,
        )[0]!;

        setThreads((prev) =>
          prev.map((t) => {
            if (t.id !== thread.id) return t;
            const messages = reconcileChatMessage(t.messages, confirmed);
            if (viewerProfileId) {
              writeRoomMessagesCache(viewerProfileId, t.roomId, messages);
            }
            return {
              ...t,
              messages,
              preview: messagePreviewText(confirmed),
              lastAt: confirmed.sentAt,
            };
          }),
        );
        return true;
      } catch (error) {
        setThreads((prev) =>
          prev.map((t) =>
            t.id === thread.id
              ? {
                  ...t,
                  messages: t.messages.filter((m) => m.id !== optimisticId),
                }
              : t,
          ),
        );
        setLoadError(
          error instanceof Error ? error.message : "Không gửi được tin nhắn.",
        );
        return false;
      }
    },
    [viewerProfileId],
  );

  /** Thả nội dung chia sẻ (post/ảnh) vào một thread — gửi ngay vào phòng đó. */
  const handleShareDrop = useCallback(
    (thread: ChatThread, payload: CinsSharePayload) => {
      completeShareDrop();
      selectThread(thread);

      if (payload.kind === "image") {
        const imageUrl =
          chatImageDeliveryUrl(payload.imageId) ?? payload.url ?? null;
        const optimistic: ChatMessage = {
          ...createOptimisticChatMessage({
            body: "",
            kind: "media",
            imageId: payload.imageId,
            imageUrl,
          }),
          senderUserId: viewerProfileId ?? undefined,
        };
        appendOptimisticMessages(thread, [optimistic]);
        void submitRoomMessage(
          thread,
          { cloudflare_image_id: payload.imageId },
          optimistic.id,
        );
        return;
      }

      const optimistic: ChatMessage = {
        ...createOptimisticChatMessage({ body: payload.url, kind: "text" }),
        senderUserId: viewerProfileId ?? undefined,
      };
      appendOptimisticMessages(thread, [optimistic]);
      void submitRoomMessage(thread, { noi_dung: payload.url }, optimistic.id);
    },
    [
      appendOptimisticMessages,
      completeShareDrop,
      selectThread,
      submitRoomMessage,
      viewerProfileId,
    ],
  );

  const submitAlbumBatch = useCallback(
    async (
      thread: ChatThread,
      albumOptimisticId: string,
      payloads: ChatSendPayload[],
    ) => {
      const realMessages: ChatMessage[] = [];
      try {
        for (const payload of payloads) {
          const res = await fetch(`/api/chat/rooms/${thread.roomId}/messages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          const json = (await res.json()) as {
            message?: ChatMessage;
            error?: string;
          };
          if (!res.ok || !json.message) {
            throw new Error(json.error ?? "Không gửi được ảnh.");
          }
          realMessages.push(json.message);
        }

        setThreads((prev) =>
          prev.map((t) => {
            if (t.id !== thread.id) return t;
            const messages = replaceOptimisticAlbumWithRealMessages(
              t.messages,
              albumOptimisticId,
              realMessages,
            );
            if (viewerProfileId) {
              writeRoomMessagesCache(viewerProfileId, t.roomId, messages);
            }
            const last = realMessages[realMessages.length - 1]!;
            return {
              ...t,
              messages,
              preview: messagePreviewText(last),
              lastAt: last.sentAt,
            };
          }),
        );
        pendingAlbumByRoomRef.current.delete(thread.roomId);
        return true;
      } catch (error) {
        pendingAlbumByRoomRef.current.delete(thread.roomId);
        setThreads((prev) =>
          prev.map((t) =>
            t.id === thread.id
              ? {
                  ...t,
                  messages: t.messages.filter((m) => m.id !== albumOptimisticId),
                }
              : t,
          ),
        );
        setLoadError(
          error instanceof Error ? error.message : "Không gửi được ảnh.",
        );
        return false;
      }
    },
    [viewerProfileId],
  );

  const sendSticker = useCallback(
    async (thread: ChatThread, item: UserEmojiMuc) => {
      const optimistic = createOptimisticChatMessage({
        body: "",
        kind: "sticker",
        imageId: item.cloudflareId,
        imageUrl:
          item.url ?? userEmojiDeliveryUrl(item.cloudflareId, "thumbnail"),
      });
      appendOptimisticMessages(thread, [optimistic]);
      await submitRoomMessage(
        thread,
        { id_emoji_muc: item.id },
        optimistic.id,
      );
    },
    [appendOptimisticMessages, submitRoomMessage],
  );

  const sendPendingCard = useCallback(
    (thread: ChatThread, card: ChatContextCard): Promise<boolean> => {
      setPendingCardByRoom((prev) => {
        if (!prev[thread.roomId]) return prev;
        const next = { ...prev };
        delete next[thread.roomId];
        return next;
      });

      const optimistic: ChatMessage = {
        ...createOptimisticChatMessage({ body: "", kind: "context" }),
        senderUserId: viewerProfileId ?? undefined,
        nguCanh: card,
      };
      appendOptimisticMessages(thread, [optimistic]);

      return (async () => {
        try {
          const res = await fetch(`/api/chat/rooms/${thread.roomId}/messages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ngu_canh: card }),
          });
          const json = (await res.json()) as {
            message?: ChatMessage;
            error?: string;
          };
          if (!res.ok || !json.message) {
            throw new Error(json.error ?? "Không gửi được thẻ nội dung.");
          }
          const message = applyChatViewerPerspective(
            [json.message],
            viewerProfileId,
          )[0]!;
          setThreads((prev) =>
            prev.map((t) => {
              if (t.id !== thread.id) return t;
              const messages = reconcileChatMessage(t.messages, message);
              if (viewerProfileId) {
                writeRoomMessagesCache(viewerProfileId, t.roomId, messages);
              }
              return { ...t, messages };
            }),
          );
          return true;
        } catch {
          setThreads((prev) =>
            prev.map((t) =>
              t.id === thread.id
                ? {
                    ...t,
                    messages: t.messages.filter((m) => m.id !== optimistic.id),
                  }
                : t,
            ),
          );
          setPendingCardByRoom((prev) =>
            prev[thread.roomId] ? prev : { ...prev, [thread.roomId]: card },
          );
          return false;
        }
      })();
    },
    [appendOptimisticMessages, viewerProfileId],
  );

  /* Tự gửi card đơn (+ biên lai ảnh) khi openChat({ autoSendNguCanh: true }). */
  useEffect(() => {
    if (!launch?.autoSendNguCanh) return;
    if (launch.resolving) return;
    const card = launch.nguCanh;
    const launchThread = launch.thread;
    if (!card || !launchThread || !active) return;
    const roomId = active.roomId;
    if (!roomId || isPendingRoomId(roomId)) return;
    const sameThread =
      active.id === launchThread.id ||
      (active.orgId != null && active.orgId === launchThread.orgId) ||
      (active.peerUserId != null &&
        active.peerUserId === launchThread.peerUserId);
    if (!sameThread) return;

    const pending = pendingCardByRoom[roomId];
    if (!pending || pending.loai !== card.loai || pending.id !== card.id) {
      return;
    }

    const key = `${roomId}:${card.loai}:${card.id}`;
    if (autoSentNguCanhRef.current === key) return;
    autoSentNguCanhRef.current = key;

    const imageId = launch.autoSendImageId?.trim() || null;
    const imageUrl = launch.autoSendImageUrl?.trim() || null;
    const thread = active;

    void (async () => {
      await sendPendingCard(thread, pending);
      if (!imageId) return;

      const optimistic = {
        ...createOptimisticChatMessage({
          body: "",
          kind: "media",
          imageId,
          imageUrl,
        }),
        senderUserId: viewerProfileId ?? undefined,
      };
      appendOptimisticMessages(thread, [optimistic]);
      await submitRoomMessage(
        thread,
        { cloudflare_image_id: imageId },
        optimistic.id,
      );
    })();
  }, [
    launch?.autoSendNguCanh,
    launch?.resolving,
    launch?.nguCanh,
    launch?.thread,
    launch?.autoSendImageId,
    launch?.autoSendImageUrl,
    active,
    pendingCardByRoom,
    sendPendingCard,
    appendOptimisticMessages,
    submitRoomMessage,
    viewerProfileId,
  ]);

  const sendMessage = useCallback(() => {
    if (!active || !canSend) return;

    const pendingCard = activePendingCard;
    const text = draft.trim();
    const snapshotText = draft;
    const snapshotImages = sendableImages;
    const snapshotReply = replyTarget;
    const thread = active;

    const replyPreview = snapshotReply
      ? messageToReplyPreview(snapshotReply)
      : null;

    const mentionMembers = thread.isGroup
      ? (groupMembersByRoom[thread.roomId] ?? []).map((m) => ({
          userId: m.userId,
          slug: m.slug,
          tenHienThi: m.tenHienThi,
        }))
      : [];
    const mentions = resolveMentionsAgainstMembers(text, mentionMembers, {
      excludeUserId: viewerProfileId,
    });

    const plan = buildChatSendPlan({
      text,
      images: snapshotImages.map((image) => ({
        localId: image.localId,
        imageId: image.imageId,
        previewUrl: image.previewUrl,
      })),
      replyTo: replyPreview,
      mentions,
    });
    const optimistics = optimisticMessagesFromPlan(plan);

    if (!pendingCard && optimistics.length === 0) return;

    setDraft("");
    setAtMentionTrigger(null);
    setAtMentionIndex(0);
    setPendingImages([]);
    pendingImagesRef.current = [];
    setReplyTarget(null);
    composeByRoomRef.current.set(thread.roomId, { text: "", images: [] });
    inputRef.current?.focus();

    void (async () => {
      if (pendingCard) {
        await sendPendingCard(thread, pendingCard);
      }

      if (optimistics.length === 0) return;

      appendOptimisticMessages(thread, optimistics);
      const optimisticIds = new Set(optimistics.map((item) => item.id));

      if (plan.album) {
        pendingAlbumByRoomRef.current.set(thread.roomId, plan.album.optimistic.id);
      }

      void executeComposeSendPlanInBackground({
        plan,
        imageSnapshots: snapshotImages,
        filesByLocalId: pendingFilesByLocalIdRef.current,
        inFlightUploads: inFlightUploadsRef.current,
        hasText: Boolean(text),
        replyToId: snapshotReply?.id ?? null,
        sendText: plan.text
          ? () =>
              submitRoomMessage(
                thread,
                plan.text!.payload,
                plan.text!.optimistic.id,
              )
          : undefined,
        sendAlbum: plan.album
          ? (payloads) =>
              submitAlbumBatch(thread, plan.album!.optimistic.id, payloads)
          : undefined,
        onFailure: () => {
          pendingAlbumByRoomRef.current.delete(thread.roomId);
          setLoadError("Không gửi được tin nhắn. Hãy thử lại.");
          setThreads((prev) =>
            prev.map((t) =>
              t.id === thread.id
                ? {
                    ...t,
                    messages: t.messages.filter((m) => !optimisticIds.has(m.id)),
                  }
                : t,
            ),
          );
          setDraft(snapshotText);
          setPendingImages(snapshotImages);
          pendingImagesRef.current = snapshotImages;
          setReplyTarget(snapshotReply);
          composeByRoomRef.current.set(thread.roomId, {
            text: snapshotText,
            images: snapshotImages,
          });
          if (pendingCard) {
            setPendingCardByRoom((prev) =>
              prev[thread.roomId]
                ? prev
                : { ...prev, [thread.roomId]: pendingCard },
            );
          }
        },
        onFinally: () => {
          for (const image of snapshotImages) {
            pendingFilesByLocalIdRef.current.delete(image.localId);
          }
        },
      }).then((ok) => {
        if (ok) revokeDraftImageUrls(snapshotImages);
      });
    })();
  }, [
    active,
    activePendingCard,
    appendOptimisticMessages,
    canSend,
    draft,
    replyTarget,
    sendableImages,
    sendPendingCard,
    submitAlbumBatch,
    submitRoomMessage,
    groupMembersByRoom,
  ]);

  const activeAtMembers = useMemo(() => {
    if (!active?.isGroup || !active.roomId) return [];
    return groupMembersByRoom[active.roomId] ?? [];
  }, [active?.isGroup, active?.roomId, groupMembersByRoom]);

  const filteredAtMembers = useMemo(() => {
    if (!atMentionTrigger || atMentionTrigger.char !== "@") return [];
    return filterChatAtMembers(activeAtMembers, atMentionTrigger.query);
  }, [activeAtMembers, atMentionTrigger]);

  const syncAtMentionFromTextarea = useCallback(() => {
    const ta = inputRef.current;
    if (!ta || !active?.isGroup) {
      setAtMentionTrigger(null);
      return;
    }
    const trigger = getAtHashTrigger(ta.value, ta.selectionStart);
    if (!trigger || trigger.char !== "@") {
      setAtMentionTrigger(null);
      return;
    }
    setAtMentionTrigger(trigger);
    setAtMentionIndex(0);
  }, [active?.isGroup]);

  const insertAtMention = useCallback(
    (member: ChatGroupMember) => {
      const ta = inputRef.current;
      if (!ta || !atMentionTrigger) return;
      const slug = isChatAtMentionAll(member) ? "all" : member.slug;
      const insert = `@${slug} `;
      const next =
        draft.slice(0, atMentionTrigger.start) +
        insert +
        draft.slice(atMentionTrigger.end);
      setDraft(next);
      setAtMentionTrigger(null);
      setAtMentionIndex(0);
      requestAnimationFrame(() => {
        const caret = atMentionTrigger.start + insert.length;
        ta.focus();
        ta.setSelectionRange(caret, caret);
      });
    },
    [atMentionTrigger, draft],
  );

  if (!portalReady) return null;

  const panel = (
    <div
      ref={chatRootRef}
      className={`cins-chat-root${shareDropMode ? " is-share-drop-root" : ""}${chatFullscreen ? " is-chat-fullscreen" : ""}`}
      role="presentation"
      onClick={(e) => {
        // Chỉ đóng khi click đúng vùng ngoài panel — tránh nút header
        // (ghim bubble, …) bị coi là click backdrop khi layout sát mép.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="cins-chat-backdrop" aria-hidden="true" />

      <section
        className={`cins-chat-panel${sidePanel && active ? " has-side-panel" : ""}${sidePanel === "canvas" && active ? " has-canvas" : ""}${shareDropMode ? " is-share-drop" : ""}${chatFullscreen ? " is-chat-fullscreen" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Tin nhắn"
        onClick={(e) => e.stopPropagation()}
      >
        <aside
          className={`cins-chat-list${mobileShowThread && !shareDropMode ? " is-hidden-mobile" : ""}`}
        >
          {shareDropMode ? (
            <p className="cins-chat-share-drop-hint" role="status">
              Thả vào một hội thoại để gửi
            </p>
          ) : null}
          <header className="cins-chat-list-head">
            <div>
              <h2 className="cins-chat-title">Tin nhắn</h2>
              {totalUnread > 0 ? (
                <p className="cins-chat-subtitle">{totalUnread} chưa đọc</p>
              ) : null}
            </div>
            <div className="cins-chat-list-head-actions">
              {activeTab === "ban_be" ? (
                <button
                  type="button"
                  className="cins-chat-icon-btn is-plain"
                  aria-label="Tin nhắn mới"
                  title="Tin nhắn mới"
                  onClick={() => setGroupModalOpen(true)}
                >
                  <Plus size={22} strokeWidth={2} aria-hidden />
                </button>
              ) : null}
            </div>
          </header>

          <label className="cins-chat-search">
            <Search size={16} strokeWidth={1.8} aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm hội thoại"
            />
          </label>

          {activeTab === "ban_be" ? (
            <div
              className="cins-chat-banbe-filters"
              role="tablist"
              aria-label="Lọc bạn bè"
            >
              {BAN_BE_FILTER_ORDER.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  role="tab"
                  aria-selected={banBeFilter === filter}
                  className={`cins-chat-banbe-filter${banBeFilter === filter ? " is-active" : ""}`}
                  onClick={() => setBanBeFilter(filter)}
                >
                  {BAN_BE_FILTER_LABEL[filter]}
                  {banBeFilterCounts[filter] > 0 ? (
                    <span className="cins-chat-banbe-filter-count">
                      {banBeFilterCounts[filter]}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          ) : null}

          <div
            className="cins-chat-thread-tabs"
            role="tablist"
            aria-label="Nhóm hội thoại"
          >
            {CHAT_THREAD_GROUP_ORDER.map((group) => (
              <button
                key={group}
                type="button"
                role="tab"
                id={`cins-chat-tab-${group}`}
                aria-selected={activeTab === group}
                aria-controls={`cins-chat-tabpanel-${group}`}
                className={`cins-chat-thread-tab${activeTab === group ? " is-active" : ""}`}
                onClick={() => setActiveTab(group)}
              >
                {CHAT_THREAD_GROUP_LABEL[group]}
                {tabUnread[group] > 0 ? (
                  <span className="cins-chat-thread-tab-unread">{tabUnread[group]}</span>
                ) : null}
              </button>
            ))}
          </div>

          <div
            className="cins-chat-threads"
            role="tabpanel"
            id={`cins-chat-tabpanel-${activeTab}`}
            aria-labelledby={`cins-chat-tab-${activeTab}`}
            onDragOver={
              shareDropMode
                ? (event) => {
                    // Auto-scroll danh sách khi kéo sát mép trên/dưới.
                    const el = event.currentTarget;
                    const rect = el.getBoundingClientRect();
                    const zone = 48;
                    if (event.clientY < rect.top + zone) {
                      el.scrollTop -= 12;
                    } else if (event.clientY > rect.bottom - zone) {
                      el.scrollTop += 12;
                    }
                  }
                : undefined
            }
          >
            {loadingThreads ? (
              <p className="cins-chat-threads-empty">Đang tải hội thoại…</p>
            ) : loadError ? (
              <p className="cins-chat-threads-empty">{loadError}</p>
            ) : filtered.length > 0 ? (
              <ul role="list">
                {filtered.map((thread) => {
                  const projectCount = thread.parentRoomId
                    ? 0
                    : (projectCountByParent.get(thread.roomId) ?? 0);
                  return (
                  <ChatThreadRow
                    key={thread.id}
                    thread={thread}
                    isActive={thread.id === activeId}
                    isListPinned={isListPinned(thread.roomId)}
                    isMuted={isRoomMuted(thread.roomId)}
                    canShowMenu={!thread.isSelf && !isPendingRoomId(thread.roomId)}
                    isMenuOpen={threadMenuRoomId === thread.roomId}
                    onMenuOpenChange={(open) =>
                      setThreadMenuRoomId(open ? thread.roomId : null)
                    }
                    onSelect={selectThread}
                    onViewProfile={handleViewProfile}
                    onToggleListPin={(t) => toggleListPin(t.roomId)}
                    onToggleMute={(t) => toggleMuteRoom(t.roomId)}
                    onManageGroup={handleManageGroup}
                    onRenameGroup={handleRenameGroupQuick}
                    onCreateProject={handleCreateProjectQuick}
                    onLeaveGroup={handleLeaveGroup}
                    onDeleteGroup={handleDeleteGroup}
                    onHideThread={handleHideThread}
                    onBlockUser={handleBlockUser}
                    activeProjectCount={projectCount}
                    projectsExpanded={expandedProjectParentIds.has(thread.roomId)}
                    onToggleProjects={
                      projectCount > 0
                        ? () => toggleProjectParentExpanded(thread.roomId)
                        : undefined
                    }
                    shareDropActive={shareDropMode}
                    onShareDrop={handleShareDrop}
                  />
                  );
                })}
              </ul>
            ) : (
              <p className="cins-chat-threads-empty">
                {query.trim()
                  ? "Không tìm thấy hội thoại phù hợp."
                  : activeTab === "ban_be" && banBeFilter === "nhom"
                    ? "Chưa có nhóm chat nào."
                    : activeTab === "ban_be" && banBeFilter === "ca_nhan"
                      ? "Chưa có chat cá nhân nào."
                      : "Chưa có hội thoại trong nhóm này."}
              </p>
            )}
          </div>
        </aside>

        <div
          className={`cins-chat-main${mobileShowThread ? " is-visible-mobile" : ""}`}
        >
          {active ? (
          <div className="cins-chat-convo">
          <header className="cins-chat-convo-head">
            <button
              type="button"
              className="cins-chat-back-mobile"
              aria-label="Quay lại danh sách"
              onClick={() => setMobileShowThread(false)}
            >
              ←
            </button>
            {active.isGroup ? (
              <span className="cins-chat-avatar-wrap">
                <ChatGroupAvatar
                  size={36}
                  avatarUrl={active.avatarUrl}
                  members={active.memberAvatars ?? []}
                  editable={Boolean(active.isGroupAdmin)}
                  uploading={uploadingGroupAvatar}
                  onEditClick={() => groupAvatarInputRef.current?.click()}
                />
                <input
                  ref={groupAvatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="cins-chat-sr-only"
                  tabIndex={-1}
                  aria-hidden
                  onChange={(e) => void handleGroupAvatarFile(e)}
                />
              </span>
            ) : (
              <ChatAvatar
                initial={active.avatarInitial}
                hue={active.avatarHue}
                size={36}
                kind={active.kind}
                verified={active.verified}
                avatarUrl={active.avatarUrl}
              />
            )}
            <div className="cins-chat-convo-meta">
              <span className="cins-chat-convo-title">
                <strong>{active.name}</strong>
                {active.isGroup ? (
                  <span className="cins-chat-kind-pill is-group">
                    {active.parentRoomId ? "Project" : "Nhóm"}
                  </span>
                ) : active.kind === "org" ? (
                  <ChatKindPill thread={active} />
                ) : null}
              </span>
              {active.isGroup && active.memberCount ? (
                <div className="cins-chat-convo-members-wrap">
                  <button
                    type="button"
                    className="cins-chat-convo-members-btn"
                    aria-expanded={membersPopoverOpen}
                    aria-haspopup="dialog"
                    onClick={() => setMembersPopoverOpen((v) => !v)}
                  >
                    {active.memberCount} thành viên
                  </button>
                  <ChatGroupMembersPopover
                    open={membersPopoverOpen}
                    members={activeAtMembers}
                    onClose={() => setMembersPopoverOpen(false)}
                  />
                </div>
              ) : active.online ? (
                <span>
                  <span className="cins-chat-online-dot" aria-hidden />
                  Đang hoạt động
                </span>
              ) : active.kind === "org" && active.role ? (
                <span>{active.role}</span>
              ) : null}
            </div>
            <div className="cins-chat-convo-actions">
              {active.isGroup &&
              active.isGroupAdmin &&
              active.roomId &&
              !isPendingRoomId(active.roomId) ? (
                <button
                  type="button"
                  className="cins-chat-icon-btn"
                  aria-label="Quản lý nhóm"
                  title="Quản lý nhóm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleManageGroup(active);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <Settings2 size={18} strokeWidth={1.9} />
                </button>
              ) : null}
              {active.roomId && !isPendingRoomId(active.roomId) ? (
                <button
                  type="button"
                  className={`cins-chat-icon-btn cins-chat-bubble-pin${isRoomPinned(active.roomId) ? " is-active" : ""}`}
                  aria-label={
                    isRoomPinned(active.roomId) ? "Bỏ ghim bubble" : "Ghim bubble"
                  }
                  aria-pressed={isRoomPinned(active.roomId)}
                  title={
                    isRoomPinned(active.roomId) ? "Bỏ ghim bubble" : "Ghim bubble"
                  }
                  onClick={(e) => {
                    // Không để click “xuyên” ra backdrop (đóng panel).
                    e.preventDefault();
                    e.stopPropagation();
                    if (isRoomPinned(active.roomId)) {
                      togglePinRoom(active.roomId, active);
                      return;
                    }
                    // Ghim → đóng bảng → mở bubble mini của hội thoại này.
                    const parentId = active.parentRoomId?.trim();
                    const parentThread = parentId
                      ? threads.find((t) => t.roomId === parentId)
                      : undefined;
                    popOutRoomToBubble(
                      active,
                      parentThread ? [parentThread] : undefined,
                    );
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <PictureInPicture2
                    size={16}
                    strokeWidth={1.9}
                    strokeDasharray="3.5 2.5"
                    aria-hidden
                  />
                </button>
              ) : null}
              <button
                type="button"
                className={`cins-chat-icon-btn${chatFullscreen ? " is-active" : ""}`}
                aria-label={
                  chatFullscreen
                    ? "Thu nhỏ bảng chat"
                    : "Toàn màn hình bảng chat"
                }
                title={
                  chatFullscreen
                    ? "Thu nhỏ bảng chat"
                    : "Toàn màn hình bảng chat"
                }
                aria-pressed={chatFullscreen}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setChatFullscreen((v) => !v);
                }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                {chatFullscreen ? (
                  <Minimize2 size={16} strokeWidth={1.8} aria-hidden />
                ) : (
                  <Maximize2 size={16} strokeWidth={1.8} aria-hidden />
                )}
              </button>
              <button
                type="button"
                className={`cins-chat-icon-btn${sidePanel ? " is-active" : ""}`}
                aria-label="Mở rộng"
                aria-pressed={Boolean(sidePanel)}
                aria-expanded={Boolean(sidePanel)}
                title="Mở rộng"
                onClick={toggleExpandPanel}
              >
                <PanelRightOpen size={16} strokeWidth={1.8} aria-hidden />
              </button>
              {!sidePanel ? (
                <button
                  type="button"
                  className="cins-chat-icon-btn"
                  aria-label="Đóng"
                  title="Đóng"
                  onClick={onClose}
                >
                  <X size={18} strokeWidth={1.8} aria-hidden />
                </button>
              ) : null}
            </div>
          </header>

          <div
            className="cins-chat-messages"
            ref={messagesContainerRef}
            onScroll={handleMessagesScroll}
          >
            {canvasNotice ? (
              <div className="cins-chat-canvas-notice" role="status">
                <span>{canvasNotice}</span>
                <button
                  type="button"
                  className="cins-chat-mention-banner-dismiss"
                  aria-label="Đóng"
                  onClick={() => setCanvasNotice(null)}
                >
                  <X size={14} strokeWidth={2.2} aria-hidden />
                </button>
              </div>
            ) : null}
            {mentionBanner &&
            mentionBanner.roomId === active.roomId ? (
              <div className="cins-chat-mention-banner" role="status">
                <span>
                  <strong>{mentionBanner.senderName}</strong> đã nhắc bạn
                </span>
                <span className="cins-chat-mention-banner-actions">
                  <button
                    type="button"
                    className="cins-chat-mention-banner-jump"
                    onClick={() => {
                      void scrollToMessage(mentionBanner.messageId);
                      setMentionBanner(null);
                    }}
                  >
                    Xem tin
                  </button>
                  <button
                    type="button"
                    className="cins-chat-mention-banner-dismiss"
                    aria-label="Đóng"
                    onClick={() => setMentionBanner(null)}
                  >
                    <X size={14} strokeWidth={2.2} aria-hidden />
                  </button>
                </span>
              </div>
            ) : null}
            {loadingOlder ? (
              <p className="cins-chat-messages-empty">Đang tải tin cũ hơn…</p>
            ) : null}
            {connecting ? (
              <p className="cins-chat-messages-empty">Đang kết nối hội thoại…</p>
            ) : loadingMessages ? (
              <p className="cins-chat-messages-empty">Đang tải tin nhắn…</p>
            ) : messagesLoadError ? (
              <p className="cins-chat-messages-empty">
                {loadError ?? "Không tải được tin nhắn."}
              </p>
            ) : messagesLoaded && active.messages.length === 0 ? (
              <p className="cins-chat-messages-empty">
                Chưa có tin nhắn nào. Hãy bắt đầu cuộc trò chuyện với{" "}
                <strong>{active.name}</strong>…
              </p>
            ) : null}
            {active.messages.length > 0 ? (
              <ChatMessageThreadItems
                messages={active.messages}
                roomId={active.roomId}
                viewerUserId={viewerProfileId}
                onPollUpdated={handlePollUpdated}
                onJumpToMessage={(id) => void scrollToMessage(id)}
                onOpenCanvasComments={openCanvasComments}
                readCursors={
                  active.roomId
                    ? (readCursorsByRoom[active.roomId] ?? [])
                    : []
                }
                showSenderNames={Boolean(active.isGroup)}
                actionHandlers={messageActionHandlers}
                editingMessageId={editingMessageId}
                editingDraft={editingDraft}
                onEditingDraftChange={setEditingDraft}
                onSaveEdit={handleSaveEdit}
                onCancelEdit={() => {
                  setEditingMessageId(null);
                  setEditingDraft("");
                }}
                renderTheirAvatar={(msg) => (
                  <ChatAvatar
                    initial={
                      active.isGroup && msg.senderAvatarInitial
                        ? msg.senderAvatarInitial
                        : active.avatarInitial
                    }
                    hue={
                      active.isGroup && msg.senderAvatarHue != null
                        ? msg.senderAvatarHue
                        : active.avatarHue
                    }
                    size={active.isGroup ? 32 : 28}
                    kind={active.kind}
                    verified={active.verified}
                    avatarUrl={
                      active.isGroup ? (msg.senderAvatarUrl ?? null) : active.avatarUrl
                    }
                  />
                )}
              />
            ) : null}
            <div ref={messagesEndRef} />
          </div>

          <footer className="cins-chat-compose">
            {replyTarget ? (
              <ChatReplyComposeBar
                target={replyTarget}
                onCancel={() => setReplyTarget(null)}
              />
            ) : null}
            {activePendingCard ? (
              <div className="cins-chat-compose-ctx">
                <span className="cins-chat-compose-ctx-media" aria-hidden>
                  {activePendingCard.anh ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      className="cins-chat-compose-ctx-thumb"
                      src={activePendingCard.anh}
                      alt=""
                    />
                  ) : (
                    <MessageSquareQuote size={16} strokeWidth={2} />
                  )}
                </span>
                <div className="cins-chat-compose-ctx-text">
                  <span className="cins-chat-compose-ctx-note">Trao đổi về</span>
                  <strong>{activePendingCard.tieuDe}</strong>
                  {activePendingCard.orgTen ? (
                    <span className="cins-chat-compose-ctx-sub">
                      {activePendingCard.orgTen}
                    </span>
                  ) : activePendingCard.moTa ? (
                    <span className="cins-chat-compose-ctx-sub">
                      {activePendingCard.moTa}
                    </span>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="cins-chat-compose-ctx-remove"
                  aria-label="Bỏ thẻ nội dung"
                  onClick={() =>
                    active
                      ? setPendingCardByRoom((prev) => {
                          if (!prev[active.roomId]) return prev;
                          const next = { ...prev };
                          delete next[active.roomId];
                          return next;
                        })
                      : undefined
                  }
                >
                  <X size={14} strokeWidth={2.2} aria-hidden />
                </button>
              </div>
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
                disabled={connecting || isPendingRoom}
                onSend={(item) => {
                  if (!active) return;
                  setStickerPickerOpen(false);
                  void sendSticker(active, item);
                }}
              />
            ) : null}
            <div className="cins-chat-compose-row">
            <div className="cins-chat-input-wrap">
              {atMentionTrigger && active.isGroup ? (
                <ChatAtMentionMenu
                  members={activeAtMembers}
                  query={atMentionTrigger.query}
                  activeIndex={atMentionIndex}
                  onHoverIndex={setAtMentionIndex}
                  onSelect={insertAtMention}
                />
              ) : null}
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
                  if (files.length > 0) addImageFiles(files);
                  e.target.value = "";
                }}
              />
              <ChatComposeToolsMenu
                open={composeToolsOpen}
                onOpenChange={setComposeToolsOpen}
                disabled={connecting || isPendingRoom}
                canAddMoc={Boolean(active.isGroup && active.isGroupAdmin)}
                onAddMoc={handleComposeAddMoc}
                onAttachImage={() => fileInputRef.current?.click()}
                onCreatePoll={handleCreatePoll}
              />
              <button
                type="button"
                className="cins-chat-attach cins-chat-attach-meme"
                data-sticker-trigger
                aria-label="Meme của tôi"
                aria-expanded={stickerPickerOpen}
                disabled={connecting || isPendingRoom}
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
              <textarea
                ref={inputRef}
                rows={1}
                value={draft}
                disabled={connecting || isPendingRoom}
                onChange={(e) => {
                  setDraft(e.target.value);
                  requestAnimationFrame(() => syncAtMentionFromTextarea());
                }}
                onSelect={() => syncAtMentionFromTextarea()}
                onClick={() => syncAtMentionFromTextarea()}
                placeholder={
                  connecting || isPendingRoom
                    ? "Đang kết nối hội thoại…"
                    : "Soạn tin..."
                }
                onFocus={() => {
                  // Tránh browser đẩy cả overlay; giữ khung theo visualViewport.
                  window.scrollTo(0, 0);
                  window.setTimeout(() => {
                    window.scrollTo(0, 0);
                    scrollMessagesToBottom("auto");
                  }, 50);
                  window.setTimeout(() => {
                    scrollMessagesToBottom("auto");
                  }, 300);
                }}
                onPaste={handleComposePaste}
                onKeyDown={(e) => {
                  if (atMentionTrigger && filteredAtMembers.length > 0) {
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setAtMentionIndex(
                        (i) => (i + 1) % filteredAtMembers.length,
                      );
                      return;
                    }
                    if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setAtMentionIndex(
                        (i) =>
                          (i - 1 + filteredAtMembers.length) %
                          filteredAtMembers.length,
                      );
                      return;
                    }
                    if (e.key === "Enter" || e.key === "Tab") {
                      e.preventDefault();
                      const pick =
                        filteredAtMembers[
                          Math.min(atMentionIndex, filteredAtMembers.length - 1)
                        ];
                      if (pick) insertAtMention(pick);
                      return;
                    }
                    if (e.key === "Escape") {
                      e.preventDefault();
                      setAtMentionTrigger(null);
                      return;
                    }
                  }
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void sendMessage();
                  }
                }}
              />
            </div>
            <button
              type="button"
              className="cins-chat-send"
              aria-label="Gửi"
              disabled={!canSend}
              onClick={() => void sendMessage()}
            >
              <Send size={16} strokeWidth={2} aria-hidden />
            </button>
            </div>
          </footer>
          </div>
          ) : (
            <div className="cins-chat-convo cins-chat-convo-empty">
              <p>Chọn hội thoại để bắt đầu nhắn tin.</p>
            </div>
          )}

          {sidePanel && active ? (
            <aside
              className={`cins-chat-side${sidePanel === "canvas" ? " is-canvas" : ""}`}
              aria-label={SIDE_PANEL_LABEL[sidePanel]}
            >
              <header className="cins-chat-side-head">
                <div
                  className="cins-chat-side-tabs"
                  role="tablist"
                  aria-label="Panel mở rộng"
                >
                  {SIDE_PANEL_ORDER.map((panel) => {
                    const TabIcon = sidePanelIcon(panel);
                    return (
                      <button
                        key={panel}
                        type="button"
                        role="tab"
                        className={`cins-chat-side-tab${sidePanel === panel ? " is-active" : ""}`}
                        aria-selected={sidePanel === panel}
                        aria-controls={`cins-chat-side-panel-${panel}`}
                        id={`cins-chat-side-tab-${panel}`}
                        aria-label={SIDE_PANEL_LABEL[panel]}
                        title={SIDE_PANEL_LABEL[panel]}
                        onClick={() => selectSidePanelTab(panel)}
                      >
                        <TabIcon size={16} strokeWidth={1.9} aria-hidden />
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  className="cins-chat-icon-btn"
                  aria-label="Đóng panel"
                  onClick={() => {
                    setChatFullscreen(false);
                    setSidePanel(null);
                  }}
                >
                  <X size={16} strokeWidth={1.8} aria-hidden />
                </button>
              </header>

              <div
                className="cins-chat-side-body"
                role="tabpanel"
                id={`cins-chat-side-panel-${sidePanel}`}
                aria-labelledby={`cins-chat-side-tab-${sidePanel}`}
              >
                {sidePanel === "pin" ? (
                  <ul className="cins-chat-side-list" role="list">
                    {activePinnedMessages.map((msg) => (
                      <li key={msg.id} className="cins-chat-side-pin">
                        <button
                          type="button"
                          className="cins-chat-side-pin-body"
                          onClick={() => void scrollToMessage(msg.id)}
                        >
                          <div className="cins-chat-side-pin-meta">
                            <span className="cins-chat-side-pin-sender">
                              {msg.from === "me" ? "Bạn" : active.name}
                            </span>
                            <time dateTime={msg.sentAt}>
                              {formatChatTime(msg.sentAt)}
                            </time>
                          </div>
                          <p>
                            {msg.body.trim() ||
                              (msg.imageUrl ? "Ảnh đính kèm" : "Tin nhắn")}
                          </p>
                        </button>
                        <button
                          type="button"
                          className="cins-chat-side-pin-unpin"
                          aria-label="Bỏ ghim tin nhắn"
                          onClick={() => messageActionHandlers.onPin(msg, false)}
                        >
                          <PinOff size={15} strokeWidth={2} aria-hidden />
                        </button>
                      </li>
                    ))}
                    {activePinnedMessages.length === 0 ? (
                      <p className="cins-chat-side-empty">Chưa có tin ghim.</p>
                    ) : null}
                  </ul>
                ) : null}

                {sidePanel === "mocs" && active.roomId ? (
                  <ChatRoomMocsPanel
                    roomId={active.roomId}
                    canManage={Boolean(active.isGroup && active.isGroupAdmin)}
                    openFormKey={mocFormOpenKey}
                    onNotice={(message) => {
                      const roomId = active.roomId;
                      const enriched = applyChatViewerPerspective(
                        [message],
                        viewerProfileId,
                      )[0]!;
                      setThreads((prev) =>
                        prev.map((t) => {
                          if (t.roomId !== roomId) return t;
                          const withSender = t.isGroup
                            ? applyKnownGroupSender(enriched, t.memberAvatars)
                            : enriched;
                          return {
                            ...t,
                            preview: messagePreviewText(withSender),
                            lastAt: withSender.sentAt,
                            messages: appendChatMessageIfNew(
                              t.messages,
                              withSender,
                            ),
                          };
                        }),
                      );
                      shouldScrollToBottomRef.current = true;
                      requestAnimationFrame(() =>
                        scrollMessagesToBottomRef.current("smooth"),
                      );
                    }}
                    onNoticesRemoved={(ids) => {
                      if (!ids.length) return;
                      const roomId = active.roomId;
                      const removeSet = new Set(ids);
                      setThreads((prev) =>
                        prev.map((t) =>
                          t.roomId !== roomId
                            ? t
                            : {
                                ...t,
                                messages: t.messages.filter(
                                  (m) => !removeSet.has(m.id),
                                ),
                              },
                        ),
                      );
                    }}
                  />
                ) : null}

                {sidePanel === "canvas" && active.roomId ? (
                  <ChatCanvasBoard
                    key={active.roomId}
                    roomId={active.roomId}
                    onJumpToMessage={(id) => void scrollToMessage(id)}
                  />
                ) : null}
              </div>
            </aside>
          ) : null}
        </div>
      </section>

      <ChatCreateGroupModal
        open={groupModalOpen}
        onClose={() => setGroupModalOpen(false)}
        onCreated={handleGroupCreated}
      />

      <ChatRenameGroupModal
        open={Boolean(renameGroupThread)}
        thread={renameGroupThread}
        onClose={() => setRenameGroupThread(null)}
        onRenamed={handleGroupManaged}
      />

      {manageGroupThread ? (
        <ChatGroupManageModal
          open
          roomId={manageGroupThread.roomId}
          threadName={manageGroupThread.name}
          avatarUrl={manageGroupThread.avatarUrl}
          memberAvatars={manageGroupThread.memberAvatars}
          canHaveProjects={!manageGroupThread.parentRoomId}
          parentRoomId={manageGroupThread.parentRoomId ?? null}
          initialSection={manageGroupSection}
          initialDeleteConfirm={manageDeleteConfirm}
          onClose={() => {
            setManageGroupThread(null);
            setManageGroupSection("thong_tin");
            setManageDeleteConfirm(false);
          }}
          onThreadUpdated={handleGroupManaged}
          onLeaveGroup={() => handleLeaveGroup(manageGroupThread)}
          onOpenProject={(thread) => {
            const parentId = thread.parentRoomId?.trim();
            if (parentId) {
              setExpandedProjectParents((prev) => ({
                ...prev,
                [parentId]: true,
              }));
            }
            setManageGroupThread(null);
            void selectThread(thread);
          }}
          onDeleteGroup={
            manageGroupThread.isGroupOwner
              ? () => void handleDeleteGroup(manageGroupThread, { confirmed: true })
              : undefined
          }
        />
      ) : null}
    </div>
  );

  return createPortal(panel, document.body);
}
