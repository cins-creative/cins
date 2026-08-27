"use client";

import {
  BellOff,
  Bookmark,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Frame,
  MessageSquareQuote,
  Phone,
  PictureInPicture2,
  PanelRightOpen,
  Pin,
  PinOff,
  Plus,
  Search,
  SmilePlus,
  Building2,
  Users,
  Video,
  Camera,
  Image as ImageIcon,
  X,
  Minimize2,
} from "lucide-react";
import {
  type ChangeEvent,
  type CSSProperties,
  type ReactElement,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type DragEvent as ReactDragEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { CinsChatListBrand } from "@/components/cins/CinsChatListBrand";

const PhongHocMeeting = dynamic(
  () =>
    import("@/components/media/PhongHocMeeting").then((m) => m.PhongHocMeeting),
  { ssr: false },
);

const ChatCanvasBoard = dynamic(
  () => import("@/components/cins/canvas/ChatCanvasBoard"),
  {
    ssr: false,
    loading: () => <p className="cins-chat-side-empty">Đang tải canvas…</p>,
  },
);

import {
  ChatCreateGroupModal,
  type ChatCreateGroupPresetMember,
} from "@/components/cins/ChatCreateGroupModal";
import { ChatForwardPicker } from "@/components/cins/ChatForwardPicker";
import { ChatGroupMembersPopover } from "@/components/cins/ChatGroupMembersPopover";
import {
  ChatAtMentionMenu,
  filterChatAtMembers,
  isChatAtMentionAll,
} from "@/components/cins/ChatAtMentionMenu";
import { ChatCaptureEditOverlay } from "@/components/cins/ChatCaptureEditOverlay";
import { ChatComposeToolsMenu } from "@/components/cins/ChatComposeToolsMenu";
import { EmojiPickerPopover } from "@/components/editor/compose/EmojiPickerPopover";
import { replaceChatEmoticons } from "@/lib/chat/emoticon-to-emoji";
import { useChatConvoSwipe } from "@/lib/chat/use-chat-convo-swipe";
import { insertAt } from "@/lib/editor/textarea-format";
import type { MediaCallMode } from "@/lib/media/call-mode";
import { ChatGroupAvatar } from "@/components/cins/ChatGroupAvatar";
import { ChatGroupManageModal } from "@/components/cins/ChatGroupManageModal";
import { ChatKhachHangTagPopover } from "@/components/cins/ChatKhachHangTagPopover";
import { ChatRenameGroupModal } from "@/components/cins/ChatRenameGroupModal";
import { ChatMessageThreadItems } from "@/components/cins/ChatMessageThreadItems";
import { ChatRoomMocsPanel } from "@/components/cins/ChatRoomWorkspacePanels";
import { ChatQuanLyHocVienPanel } from "@/components/cins/ChatQuanLyHocVienPanel";
import { ChatStickerPicker } from "@/components/cins/ChatStickerPicker";
import { importGifToCloudflare } from "@/lib/gif/client";
import { ChatReplyComposeBar } from "@/components/cins/ChatReplyComposeBar";
import {
  buildThreadMenuActions,
  ChatThreadRowMenu,
  useThreadLongPress,
} from "@/components/cins/ChatThreadRowMenu";
import { OrgNotifySettingsMenu } from "@/components/cins/OrgNotifySettingsMenu";
import type { ChatMessageActionHandlers } from "@/components/cins/ChatMessageActions";
import {
  canvasBridge,
  ingestAddedCanvasNode,
} from "@/components/cins/canvas/canvas-bridge";
import { addChatMessageToCanvas } from "@/lib/chat/canvas/add-message-client";
import { useCinsChat } from "@/components/cins/CinsChatProvider";
import { useShopReadyGate } from "@/lib/shop/use-shop-ready-gate";
import type { ShopKhachHangTag } from "@/lib/shop/khach-hang-types";
import {
  resolveRoomTagColor,
  roomTagChipStyle,
} from "@/lib/chat/tag-colors";
import { subscribePendingPhongHoc, takePendingPhongHoc } from "@/components/cins/ChatIncomingCallHost";
import {
  beginCallTrace,
  callTraceAttachServerTiming,
  callTraceMark,
  callTraceRingSent,
} from "@/lib/media/call-trace";
import { prefetchPhongHocMeeting } from "@/lib/media/prefetch-phong-hoc";
import {
  presentCallUi,
  updateCallWindowSession,
} from "@/lib/media/call-window";
import {
  avatarBg,
  avatarHueFromSeed,
  avatarInitialFromName,
  formatChatTime,
} from "@/lib/chat/avatar";
import { patchChatThreadUnreadInCache, writeChatThreadsCache, writeRoomMessagesCache } from "@/lib/chat/chat-session-cache";
import { formatUnreadTabCount } from "@/lib/chat/document-unread-badge";
import {
  groupToChucThreads,
  type ToChucOrgNode,
} from "@/lib/chat/group-to-chuc-threads";
import {
  nestGroupThreads,
  sortChatThreadsByFamilyActivity,
} from "@/lib/chat/nest-group-threads";
import {
  expandedParentIdsFromRecord,
  expandedParentsRecordFromIds,
  readExpandedProjectParentIds,
  writeExpandedProjectParentIds,
} from "@/lib/chat/expanded-project-parents-storage";
import {
  orgQuanLyPath,
  type OrgQuanLyKind,
} from "@/lib/to-chuc/org-quan-ly-routes";
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
import {
  captureVideoPoster,
  CHAT_VIDEO_ACCEPT,
  CHAT_VIDEO_MAX_UPLOAD_BYTES,
  probeVideoMetadata,
  uploadChatVideo,
} from "@/lib/chat/compose-video";
import { executeComposeSendPlanInBackground } from "@/lib/chat/execute-compose-send-plan";
import {
  fetchPinnedMessages,
  patchChatMessage,
  toggleChatReaction,
} from "@/lib/chat/message-actions-client";
import { fetchRoomMessagesPage, markRoomReadClient } from "@/lib/chat/messages-client";
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
import { useRoomPresence } from "@/lib/chat/use-room-presence";
import {
  patchThreadMessages,
  updateMessageInList,
} from "@/lib/chat/patch-thread-messages";
import {
  preserveThreadMessages,
  threadLikelyHasMessages,
  threadMessagesAreStale,
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
  CHAT_THREAD_VIEW_ORDER,
  type ChatContextCard,
  type ChatGroupMember,
  type ChatMessage,
  type ChatMessageReplyPreview,
  type ChatLaunchState,
  type ChatMuaBanSub,
  type ChatParticipantKind,
  type ChatPollSummary,
  type ChatReadCursor,
  type ChatThread,
  type ChatThreadView,
  CHAT_MUA_BAN_SUB_ORDER,
} from "@/lib/chat/types";
import { tChatMuaBanSub, tChatSide, tChatView, tOrgLoai } from "@/lib/i18n/home-modules";
import type { TFn } from "@/lib/i18n/t";
import { useT } from "@/lib/i18n/use-t";

type Props = {
  launch: ChatLaunchState | null;
  /** Đóng panel; truyền `nextHref` khi rời chat sang trang khác (vd. Journey). */
  onClose: (nextHref?: string) => void;
  onUnreadChange: (count: number) => void;
  /** Fill vùng shell (giữ topbar/sidebar) — gắn URL `/chat`. */
  shellFill?: boolean;
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

/** Cùng «slot» org trên tab Tổ chức — không gộp hub / tư vấn / lớp. */
function isSameOrgThreadSlot(a: ChatThread, b: ChatThread): boolean {
  if (a.kind !== "org" || b.kind !== "org") return false;
  if (!a.orgId || a.orgId !== b.orgId) return false;
  if (a.roomId && b.roomId && a.roomId === b.roomId) return true;
  if (a.lopHocId || b.lopHocId) {
    return Boolean(a.lopHocId && a.lopHocId === b.lopHocId);
  }
  if (a.isOrgHub || b.isOrgHub) {
    return Boolean(a.isOrgHub && b.isOrgHub);
  }
  if (a.isOrgAdvisory || b.isOrgAdvisory) {
    return Boolean(a.isOrgAdvisory && b.isOrgAdvisory);
  }
  // Legacy 1_org không gắn flag — chỉ khớp khi không phải hub/lớp.
  return !a.isOrgHub && !b.isOrgHub && !a.lopHocId && !b.lopHocId;
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
      isSameOrgThreadSlot(incoming, thread) ||
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
    if (isSameOrgThreadSlot(merged, thread)) {
      return false;
    }
    return true;
  });
  return [merged, ...rest];
}

type ChatSidePanel = "pin" | "mocs" | "canvas" | "hoc_vien";

/** Launch compat — map sang expand/collapse hub org (project parent), không còn sub-tab UI. */
type ToChucListFilter = "all" | "cua_toi" | "tham_gia";

/** Realtime org advisory: khách không được giữ identity staff. */
function redactOrgAdvisoryRealtimeMessage(
  message: ChatMessage,
  thread: ChatThread | undefined,
): ChatMessage {
  if (!thread?.isOrgAdvisory) return message;
  if (thread.viewerIsOrgMember || thread.isOrgStaffInbox) return message;
  if (message.from !== "them") return message;
  if (message.orgReplyHint) return message;
  return {
    ...message,
    senderUserId: undefined,
    senderSlug: undefined,
    senderName: undefined,
    senderAvatarInitial: undefined,
    senderAvatarHue: undefined,
    senderAvatarUrl: undefined,
    senderRole: undefined,
    orgReplyHint: undefined,
  };
}

/**
 * Trạng thái hộp thư staff theo tin cuối — khớp `listOrgStaffInboxThreadsForViewer`:
 * chỉ «open» khi tin cuối do chính học viên/khách (peer) gửi.
 */
function nextOrgInboxStatus(
  thread: ChatThread,
  last: ChatMessage,
): ChatThread["orgInboxStatus"] {
  if (!thread.isOrgStaffInbox) return thread.orgInboxStatus;
  if (last.from === "me") return "replied";
  if (thread.peerUserId && last.senderUserId) {
    return last.senderUserId === thread.peerUserId ? "open" : "replied";
  }
  return "open";
}

function sidePanelLabel(t: TFn, panel: ChatSidePanel): string {
  return tChatSide(t, panel);
}

const SIDE_PANEL_BASE: ChatSidePanel[] = ["pin", "mocs", "canvas"];

function sidePanelIcon(panel: ChatSidePanel) {
  switch (panel) {
    case "pin":
      return Pin;
    case "mocs":
      return CalendarDays;
    case "canvas":
      return Frame;
    case "hoc_vien":
      return Users;
  }
}

/** Số con đang hoạt động (không ẩn) theo id phòng cha — project nhóm hoặc lớp dưới hub. */
function countActiveProjectsByParent(
  threads: ChatThread[],
): Map<string, number> {
  const map = new Map<string, number>();
  for (const t of threads) {
    const parentId = t.parentRoomId?.trim();
    if (!parentId) continue;
    if (t.roomTrangThai === "an") continue;
    map.set(parentId, (map.get(parentId) ?? 0) + 1);
  }
  return map;
}

function threadKindLabel(t: TFn, thread: ChatThread): string {
  if (thread.isOrgHub) return t("chat.kind.hub");
  if (thread.lopHocId) return t("chat.kind.class");
  if (thread.isOrgAdvisory) return t("chat.kind.advisory");
  if (thread.kind === "org" && thread.orgKind) {
    return tOrgLoai(t, thread.orgKind);
  }
  return thread.kind === "org" ? t("org.loai.org") : t("chat.kind.person");
}

function threadDisplayName(t: TFn, thread: ChatThread): string {
  return thread.isSelf ? t("chat.selfThread") : thread.name;
}

/** Khớp tên hội thoại hoặc tên/slug thành viên nhóm (khi nhóm đổi tên riêng). */
function threadMatchesQuery(thread: ChatThread, q: string, t: TFn): boolean {
  if (!q) return true;
  if (
    thread.name.toLowerCase().includes(q) ||
    (thread.isSelf && t("chat.selfThread").toLowerCase().includes(q)) ||
    thread.preview.toLowerCase().includes(q) ||
    thread.role.toLowerCase().includes(q) ||
    (thread.orgTen?.toLowerCase().includes(q) ?? false) ||
    threadKindLabel(t, thread).toLowerCase().includes(q)
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
  if (thread.isOrgHub) return " is-org is-org-hub";
  if (thread.lopHocId) return " is-org is-org-lop";
  if (thread.isOrgAdvisory) return " is-org is-org-advisory";
  if (thread.kind === "org" && thread.orgKind) {
    return ` is-org is-${thread.orgKind}`;
  }
  return thread.kind === "org" ? " is-org" : " is-user";
}

/** Presence toàn CINs — set các id_nguoi_dung đang online. */
const ChatPresenceContext = createContext<Set<string>>(new Set());

function useIsUserOnline(userId?: string | null): boolean {
  const online = useContext(ChatPresenceContext);
  return Boolean(userId && online.has(userId));
}

function ChatAvatar({
  initial,
  hue,
  size = 40,
  kind = "user",
  verified = false,
  avatarUrl = null,
  userId = null,
}: {
  initial: string;
  hue: number;
  size?: number;
  kind?: ChatParticipantKind;
  verified?: boolean;
  avatarUrl?: string | null;
  /** id_nguoi_dung — hiện chấm online toàn CINs nếu đang hoạt động. */
  userId?: string | null;
}) {
  const t = useT();
  const online = useIsUserOnline(userId);

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
      {online ? (
        <span
          className="cins-chat-avatar-online"
          aria-label={t("chat.online")}
          title={t("chat.online")}
          style={{
            width: Math.max(9, Math.round(size * 0.28)),
            height: Math.max(9, Math.round(size * 0.28)),
          }}
        />
      ) : null}
      {kind === "org" && verified ? (
        <span className="cins-chat-avatar-verified" aria-label="Verified">
          ✓
        </span>
      ) : null}
    </span>
  );
}

function ChatKindPill({ thread }: { thread: ChatThread }) {
  const t = useT();
  if (thread.kind === "user") return null;
  return (
    <span className={`cins-chat-kind-pill${threadKindClass(thread)}`}>
      {threadKindLabel(t, thread)}
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
  onCreateGroup,
  activeProjectCount = 0,
  projectsExpanded = false,
  hasActiveProjectChild = false,
  onToggleProjects,
  shareDropActive = false,
  onShareDrop,
  khachHangListMode = false,
  muaHangListMode = false,
  khachHangTags = [],
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
  onCreateGroup: (thread: ChatThread) => void;
  /** Số project active dưới nhóm gốc. */
  activeProjectCount?: number;
  projectsExpanded?: boolean;
  /** Đang xem project con thuộc nhóm này (rail thu gọn highlight cha). */
  hasActiveProjectChild?: boolean;
  onToggleProjects?: () => void;
  /** Drop mode chia sẻ — row nhận thả để gửi vào phòng. */
  shareDropActive?: boolean;
  onShareDrop?: (thread: ChatThread, payload: CinsSharePayload) => void;
  /** Tab Khách hàng — hiện chip tag thay vì chữ «Khách hàng». */
  khachHangListMode?: boolean;
  /** Tab Mua hàng — ẩn chữ «Đã mua» (đã ở đúng tab). */
  muaHangListMode?: boolean;
  khachHangTags?: ShopKhachHangTag[];
}) {
  const t = useT();
  const [isShareTarget, setIsShareTarget] = useState(false);
  const preview = thread.typing ? "…" : thread.preview;
  const rowName = threadDisplayName(t, thread);
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

  const canCreateGroup = canBlock && !thread.isSelf;

  const canCreateProject =
    Boolean(thread.isGroup) &&
    Boolean(thread.isGroupAdmin) &&
    !thread.parentRoomId &&
    !thread.isOrgHub;

  const isProjectChild = Boolean(thread.parentRoomId);
  const isProjectParent =
    !thread.parentRoomId &&
    activeProjectCount > 0 &&
    (Boolean(thread.isGroup) || Boolean(thread.isOrgHub));
  const childUnitLabel = thread.isOrgHub
    ? t("chat.unit.class")
    : t("chat.unit.group");
  const groupAvatarSize = 44;
  const peerAvatarSize = 40;

  const khachHangTagChip = (() => {
    if (!thread.isKhachHang || !khachHangListMode) return null;
    const tagId = thread.khachHangTagIds?.[0];
    if (!tagId) return null;
    const tag = khachHangTags.find((t) => t.id === tagId);
    if (!tag) return null;
    const color = resolveRoomTagColor(tag.id, tag.mau);
    return (
      <span
        className="cins-chat-khach-tag-chip"
        style={{ color }}
        title={tag.ten}
      >
        {tag.ten}
      </span>
    );
  })();

  const muaHangKindLabel =
    thread.isMuaHang && !muaHangListMode && !thread.isKhachHang ? (
      <span
        className={`cins-chat-kind-pill is-mua${thread.muaHangChiDonHuy ? " is-cancelled-only" : ""}`}
      >
        Đã mua
      </span>
    ) : null;

  const khachTrailingExtra = khachHangTagChip ?? muaHangKindLabel;

  const menuActions = buildThreadMenuActions(t, {
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
    canCreateGroup,
    onCreateGroup: () => onCreateGroup(thread),
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

  const projectToggleButton =
    isProjectParent && onToggleProjects ? (
      <button
        type="button"
        className={`cins-chat-project-toggle${projectsExpanded ? " is-expanded" : ""}${thread.isOrgHub ? " is-org-hub-toggle" : ""}`}
        aria-expanded={projectsExpanded}
        title={
          projectsExpanded
            ? t("chat.collapseN", { n: activeProjectCount, unit: childUnitLabel })
            : t("chat.expandN", { n: activeProjectCount, unit: childUnitLabel })
        }
        aria-label={
          projectsExpanded
            ? t("chat.collapseN", { n: activeProjectCount, unit: childUnitLabel })
            : t("chat.expandN", { n: activeProjectCount, unit: childUnitLabel })
        }
        onClick={(event) => {
          event.stopPropagation();
          onToggleProjects();
        }}
      >
        <span className="cins-chat-project-toggle-count" aria-hidden>
          {thread.isOrgHub ? (
            <>
              <span className="cins-chat-project-toggle-num">
                {activeProjectCount}
              </span>
              <span className="cins-chat-project-toggle-unit">
                {childUnitLabel}
              </span>
            </>
          ) : (
            <>
              {activeProjectCount} {childUnitLabel}
            </>
          )}
          <ChevronDown
            size={10}
            strokeWidth={2.6}
            className="cins-chat-project-toggle-chevron"
          />
        </span>
      </button>
    ) : null;

  return (
    <li
      className={`cins-chat-thread-item${thread.isSelf ? " is-self-item" : ""}${isListPinned ? " is-list-pinned" : ""}${isMenuOpen ? " is-menu-open" : ""}${isMuted ? " is-muted" : ""}${isProjectChild ? " is-project-child" : ""}${isProjectParent ? " is-project-parent" : ""}${isProjectParent && projectsExpanded ? " is-projects-expanded" : ""}${hasActiveProjectChild ? " is-child-active-parent" : ""}${isShareTarget ? " is-share-target" : ""}`}
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
        className={`cins-chat-thread-row${(thread.isGroup || thread.isOrgHub) && !isProjectChild ? " is-group-row" : ""}${isProjectParent ? " has-project-toggle" : ""}${thread.isOrgHub ? " is-org-hub-row" : ""}${thread.isOrgAdvisory ? " is-org-advisory-row" : ""}${thread.lopHocId ? " is-org-lop-row" : ""}`}
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
          className={`cins-chat-thread${isActive ? " is-active" : ""}${thread.kind === "org" ? " is-org-thread" : " is-user-thread"}${thread.isSelf ? " is-self-thread" : ""}${thread.isGroup ? " is-group-thread" : ""}${thread.isOrgHub ? " is-org-hub-thread" : ""}${thread.isOrgAdvisory ? " is-org-advisory-thread" : ""}${isProjectChild ? " is-project-thread" : ""}${isProjectParent ? " is-project-parent-thread" : ""}`}
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
                <strong title={rowName}>{rowName}</strong>
              </span>
              {thread.unread > 0 && !isMuted ? (
                <span className="cins-chat-unread">{thread.unread}</span>
              ) : null}
              {(thread.unreadMentions ?? 0) > 0 && !isMuted ? (
                <span className="cins-chat-mention-badge" title={t("chat.mentionYou")}>
                  @
                </span>
              ) : null}
            </span>
          ) : thread.isGroup || thread.isOrgHub ? (
            <>
              {thread.isOrgHub ? (
                <ChatAvatar
                  initial={thread.avatarInitial}
                  hue={thread.avatarHue}
                  size={groupAvatarSize}
                  kind="org"
                  verified={thread.verified}
                  avatarUrl={thread.avatarUrl}
                />
              ) : (
                <ChatGroupAvatar
                  size={groupAvatarSize}
                  avatarUrl={thread.avatarUrl}
                  members={thread.memberAvatars ?? []}
                />
              )}
              <span
                className={`cins-chat-thread-main is-group-card${thread.isOrgHub ? " is-org-card" : ""}`}
              >
                <span className="cins-chat-thread-top">
                  <span className="cins-chat-thread-name">
                    {nameStatusIcons}
                    {thread.isOrgHub ? (
                      <Building2
                        size={13}
                        strokeWidth={2.3}
                        className="cins-chat-group-name-icon"
                        aria-hidden
                      />
                    ) : (
                      <Users
                        size={13}
                        strokeWidth={2.3}
                        className="cins-chat-group-name-icon"
                        aria-hidden
                      />
                    )}
                    <strong title={rowName}>{rowName}</strong>
                  </span>
                  <time dateTime={thread.lastAt}>
                    {formatChatTime(thread.lastAt)}
                  </time>
                </span>
                <span className="cins-chat-thread-bottom">
                  {thread.isOrgHub ? <ChatKindPill thread={thread} /> : null}
                  <span className="cins-chat-thread-preview">{preview}</span>
                  <span className="cins-chat-thread-badges">
                    {(thread.unreadMentions ?? 0) > 0 && !isMuted ? (
                      <span
                        className="cins-chat-mention-badge"
                        title={t("chat.mentionYou")}
                      >
                        @
                      </span>
                    ) : null}
                    {thread.unread > 0 && !isMuted ? (
                      <span className="cins-chat-unread">{thread.unread}</span>
                    ) : null}
                  </span>
                  {projectToggleButton}
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
                  size={peerAvatarSize}
                  kind={thread.kind}
                  verified={thread.verified}
                  avatarUrl={thread.avatarUrl}
                  userId={thread.kind === "user" ? thread.peerUserId : null}
                />
              )}
              <span
                className={`cins-chat-thread-main${thread.kind === "org" ? " is-org-card" : ""}${thread.isKhachHang && khachHangListMode ? " is-khach-card" : ""}${thread.isMuaHang && !thread.isKhachHang ? " is-mua-card" : ""}`}
              >
                <span className="cins-chat-thread-top">
                  <span className="cins-chat-thread-name">
                    {nameStatusIcons}
                    <strong title={rowName}>{rowName}</strong>
                    {thread.isOrgStaffInbox && thread.orgTen ? (
                      <span
                        className="cins-chat-org-dest-badge"
                        title={
                          thread.viewerOrgVaiTroLabel
                            ? `${t("chat.msgToOrg", { name: thread.orgTen })} · ${t("chat.yourRole", { role: thread.viewerOrgVaiTroLabel })}`
                            : t("chat.msgToOrg", { name: thread.orgTen })
                        }
                      >
                        {thread.orgTen}
                      </span>
                    ) : thread.isOrgStaffInbox &&
                      thread.viewerOrgVaiTroLabel ? (
                      <span
                        className="cins-chat-org-role-badge"
                        title={t("chat.yourRole", { role: thread.viewerOrgVaiTroLabel })}
                      >
                        {thread.viewerOrgVaiTroLabel}
                      </span>
                    ) : null}
                  </span>
                  <time dateTime={thread.lastAt}>
                    {formatChatTime(thread.lastAt)}
                  </time>
                </span>
                <span className="cins-chat-thread-bottom">
                  {thread.kind === "org" &&
                  !thread.isOrgAdvisory &&
                  !thread.isOrgHub ? (
                    <ChatKindPill thread={thread} />
                  ) : null}
                  <span className="cins-chat-thread-preview">{preview}</span>
                  {((thread.isKhachHang || thread.isMuaHang) &&
                    (khachTrailingExtra || (thread.unread > 0 && !isMuted))) ? (
                    <span className="cins-chat-thread-trailing">
                      {thread.unread > 0 && !isMuted ? (
                        <span className="cins-chat-unread">{thread.unread}</span>
                      ) : null}
                      {khachTrailingExtra}
                    </span>
                  ) : thread.unread > 0 && !isMuted ? (
                    <span className="cins-chat-unread">{thread.unread}</span>
                  ) : null}
                </span>
              </span>
            </>
          )}
        </button>
        {canShowMenu ? (
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

export function CinsChatOverlay({
  launch,
  onClose,
  onUnreadChange,
  shellFill = false,
}: Props) {
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
    openChat,
  } = useCinsChat();
  const t = useT();
  const [threads, setThreads] = useState<ChatThread[]>(() =>
    launch?.thread && launch.thread.roomId !== "__open_list__"
      ? [launch.thread]
      : [],
  );
  const [activeId, setActiveId] = useState(() =>
    launch?.thread && launch.thread.roomId !== "__open_list__"
      ? launch.thread.id
      : "",
  );
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
  const [mobileShowThread, setMobileShowThread] = useState(
    () => Boolean(launch?.thread && launch.thread.roomId !== "__open_list__"),
  );
  const [mobileNarrow, setMobileNarrow] = useState(false);
  const [headerPullDy, setHeaderPullDy] = useState(0);
  const headerPullRef = useRef<{
    pointerId: number;
    startY: number;
    startX: number;
  } | null>(null);
  const [sidePanel, setSidePanel] = useState<ChatSidePanel | null>(null);
  const [membersPopoverOpen, setMembersPopoverOpen] = useState(false);
  const skipPersistSidePanelRef = useRef(true);
  /** Tab cuối khi panel đang mở — dùng khi bấm "Mở rộng" lại sau khi đóng. */
  const lastSidePanelRef = useRef<ChatSidePanel>("mocs");
  const hideConvoForMobileCanvas = mobileNarrow && sidePanel === "canvas";
  const chatMainRef = useRef<HTMLDivElement>(null);
  const sidePanelRef = useRef(sidePanel);
  sidePanelRef.current = sidePanel;
  const [composeToolsOpen, setComposeToolsOpen] = useState(false);
  const [mocFormOpenKey, setMocFormOpenKey] = useState(0);
  const [replyTarget, setReplyTarget] = useState<ChatMessage | null>(null);
  const [forwardTarget, setForwardTarget] = useState<ChatMessage | null>(null);
  const [stickerPickerOpen, setStickerPickerOpen] = useState(false);
  const [captureEditFile, setCaptureEditFile] = useState<File | null>(null);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const emojiBtnRef = useRef<HTMLButtonElement>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState("");
  const [pinnedByRoom, setPinnedByRoom] = useState<Record<string, ChatMessage[]>>({});
  const [readCursorsByRoom, setReadCursorsByRoom] = useState<
    Record<string, ChatReadCursor[]>
  >({});
  const [lopRoomAccess, setLopRoomAccess] = useState<{
    isLopRoom: boolean;
    frozen: boolean;
    canSend: boolean;
    soNgayConLai: number;
    ngayCuoiKy: string | null;
    orgId: string | null;
    orgTen: string | null;
    hocVienLopId: string | null;
    vaiTroLabel: string | null;
    giaoVienTenCongKhai: string | null;
    canQuanLyHocVien: boolean;
    canGanTienDo: boolean;
    dongBoTienDo: boolean;
  } | null>(null);
  const [phongHoc, setPhongHoc] = useState<{
    token: string;
    title: string;
    mode: "audio" | "video" | "screen";
    callMessageId?: string | null;
  } | null>(null);
  const [phongHocBusy, setPhongHocBusy] = useState(false);
  const [phongHocErr, setPhongHocErr] = useState<string | null>(null);
  const [outboundCallMessageId, setOutboundCallMessageId] = useState<
    string | null
  >(null);
  const [activeTab, setActiveTab] = useState<ChatThreadView>(
    () => launch?.tab ?? launch?.thread?.group ?? "ban_be",
  );
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [toChucFilter, setToChucFilter] = useState<ToChucListFilter>(
    () => launch?.toChucFilter ?? "all",
  );
  /** Hộp thư người lạ — org đang xổ danh sách hội thoại con (accordion). */
  const [expandedOrgInboxId, setExpandedOrgInboxId] = useState<string | null>(
    null,
  );
  /** Lớp 1 của hộp thư người lạ: card từng org mình quản trị. */
  const [orgInboxOverviewOpen, setOrgInboxOverviewOpen] = useState(false);
  const [khachHangTagFilter, setKhachHangTagFilter] = useState<string[]>([]);
  const [khachHangTags, setKhachHangTags] = useState<ShopKhachHangTag[]>([]);
  const [khachHangTagsLoaded, setKhachHangTagsLoaded] = useState(false);
  const [khachHangTagPopoverOpen, setKhachHangTagPopoverOpen] = useState(false);
  const [khachHangTagBusy, setKhachHangTagBusy] = useState(false);
  const { enabled: banHangBat } = useShopReadyGate();
  const hasMuaHangThreads = useMemo(
    () => threads.some((t) => t.isMuaHang),
    [threads],
  );
  const showMuaBanTab = banHangBat || hasMuaHangThreads;
  const visibleMuaBanSubs = useMemo(() => {
    return CHAT_MUA_BAN_SUB_ORDER.filter((sub) => {
      if (sub === "khach_hang") return banHangBat;
      if (sub === "mua_hang") return hasMuaHangThreads;
      return true;
    });
  }, [banHangBat, hasMuaHangThreads]);
  const [muaBanSub, setMuaBanSub] = useState<ChatMuaBanSub>(() =>
    banHangBat && !hasMuaHangThreads ? "khach_hang" : "mua_hang",
  );
  /** Tab không có hội thoại (sau ẩn) → không hiện. */
  const viewsWithContent = useMemo(() => {
    const has: Record<ChatThreadView, boolean> = {
      ban_be: false,
      nguoi_la: false,
      to_chuc: false,
      mua_ban: false,
    };
    for (const t of threads) {
      if (t.isSelf) {
        has.ban_be = true;
        continue;
      }
      if (hiddenRoomIds.includes(t.roomId)) continue;
      if (t.group === "ban_be" || t.group === "nguoi_la" || t.group === "to_chuc") {
        has[t.group] = true;
      }
      if (t.isKhachHang || t.isMuaHang) has.mua_ban = true;
    }
    if (banHangBat) has.mua_ban = true;
    return has;
  }, [threads, hiddenRoomIds, banHangBat]);
  const visibleThreadViews = useMemo(() => {
    const views = CHAT_THREAD_VIEW_ORDER.filter((v) => {
      if (v === "mua_ban") return showMuaBanTab || activeTab === "mua_ban";
      return viewsWithContent[v] || activeTab === v;
    });
    return views.length > 0 ? views : (["ban_be"] as ChatThreadView[]);
  }, [viewsWithContent, showMuaBanTab, activeTab]);
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [groupModalPreset, setGroupModalPreset] = useState<
    ChatCreateGroupPresetMember[] | null
  >(null);
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
  /** Lỗi đính kèm/gửi media — hiện ngay trên khung soạn (loadError chỉ hiện khi list lỗi). */
  const [composeError, setComposeError] = useState<string | null>(null);
  const [canvasNotice, setCanvasNotice] = useState<string | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023.98px)");
    const sync = () => setMobileNarrow(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!searchOpen) return;
    searchInputRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    if (!canvasNotice) return;
    const t = window.setTimeout(() => setCanvasNotice(null), 3200);
    return () => window.clearTimeout(t);
  }, [canvasNotice]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  /** clientHeight khung tin — dùng neo đáy khi bàn phím ảo đổi chiều cao. */
  const messagesBoxHeightRef = useRef<number | null>(null);
  const chatRootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [composeInputFocused, setComposeInputFocused] = useState(false);
  const syncComposeInputHeight = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useEffect(() => {
    syncComposeInputHeight();
  }, [draft, syncComposeInputHeight]);
  const groupAvatarInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoFileInputRef = useRef<HTMLInputElement>(null);
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
  const activeMessagesRef = useRef<ChatMessage[]>([]);
  const shouldScrollToBottomRef = useRef(true);

  const persistViewedRoom = useCallback(
    (roomId: string, lastMessageId?: string) => {
      if (!roomId || isPendingRoomId(roomId)) return;
      void markRoomReadClient(roomId, lastMessageId).then((ok) => {
        if (!ok) return;
        patchChatThreadUnreadInCache(viewerProfileId, roomId, 0);
      });
    },
    [viewerProfileId],
  );

  const scrollMessagesToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const top = el.scrollHeight;
    if (behavior === "smooth") {
      el.scrollTo({ top, behavior: "smooth" });
      return;
    }
    el.scrollTop = top;
  }, []);
  const scrollMessagesToBottomRef = useRef(scrollMessagesToBottom);
  scrollMessagesToBottomRef.current = scrollMessagesToBottom;
  const forcedEmptyReloadRef = useRef<Set<string>>(new Set());
  const highlightTimerRef = useRef<number | null>(null);
  /** Mobile: đóng overlay canvas/side rồi mới scroll tới tin. */
  const pendingJumpMessageIdRef = useRef<string | null>(null);

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

  const minimizeActiveToBubble = useCallback(() => {
    if (!active?.roomId || isPendingRoomId(active.roomId)) return;
    const parentId = active.parentRoomId?.trim();
    const parentThread = parentId
      ? threads.find((t) => t.roomId === parentId)
      : undefined;
    popOutRoomToBubble(active, parentThread ? [parentThread] : undefined);
  }, [active, popOutRoomToBubble, threads]);

  const onConvoHeadPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      if (!mobileNarrow) return;
      if (e.button !== 0) return;
      if (
        e.target instanceof Element &&
        e.target.closest("button, a, input, textarea, [role='dialog']")
      ) {
        return;
      }
      headerPullRef.current = {
        pointerId: e.pointerId,
        startY: e.clientY,
        startX: e.clientX,
      };
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    },
    [mobileNarrow],
  );

  const onConvoHeadPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      const pull = headerPullRef.current;
      if (!pull || e.pointerId !== pull.pointerId) return;
      const dy = e.clientY - pull.startY;
      const dx = e.clientX - pull.startX;
      /* Chỉ kéo xuống; hủy nếu lệch ngang rõ (tránh xung đột vuốt). */
      if (Math.abs(dx) > 28 && Math.abs(dx) > Math.abs(dy)) {
        headerPullRef.current = null;
        setHeaderPullDy(0);
        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
        return;
      }
      const down = Math.max(0, dy);
      if (down > 6) e.preventDefault();
      setHeaderPullDy(Math.min(200, down));
    },
    [],
  );

  const onConvoHeadPointerEnd = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      const pull = headerPullRef.current;
      if (!pull || e.pointerId !== pull.pointerId) return;
      headerPullRef.current = null;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      const dy = Math.max(0, e.clientY - pull.startY);
      if (dy >= 72) {
        /* Giữ offset tới khi unmount — tránh nhảy về 0 trước khi đóng. */
        setHeaderPullDy(Math.min(200, dy));
        onClose();
        return;
      }
      setHeaderPullDy(0);
    },
    [onClose],
  );

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

  activeRoomIdRef.current = active?.roomId ?? null;
  activeMessagesRef.current = active?.messages ?? [];

  /* Flush tin đang xem → session cache khi unmount (mini/bubble đọc lại). */
  useEffect(() => {
    return () => {
      const roomId = activeRoomIdRef.current;
      const messages = activeMessagesRef.current;
      if (!viewerProfileId || !roomId || !messages.length) return;
      writeRoomMessagesCache(viewerProfileId, roomId, messages);
    };
  }, [viewerProfileId]);

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
          t("chat.member");
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

  const roomOnlineUserIds = useRoomPresence(
    active?.roomId ?? null,
    viewerProfileId,
  );
  // Presence toàn CINs — mọi user mở chat cùng track 1 topic global.
  const globalOnlineUserIds = useRoomPresence(
    viewerProfileId ? "__cins_global__" : null,
    viewerProfileId,
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

  const filteredByView = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sortPinned = (list: ChatThread[]) =>
      sortChatThreadsByFamilyActivity(list, pinnedListRoomIds);

    const build = (view: ChatThreadView): ChatThread[] => {
      // «Gửi riêng cho tôi» — chỉ tab bạn bè; không lọc sub-filter/ẩn, luôn đầu danh sách.
      const selfThread =
        view === "ban_be"
          ? threads.find((th) => th.isSelf && threadMatchesQuery(th, q, t))
          : undefined;
      const list = threads.filter((th) => {
        if (th.isSelf) return false;
        if (view === "mua_ban") {
          // Chỉ DM cá nhân↔cá nhân — loại inbox tư vấn org / lớp.
          if (
            th.isOrgAdvisory ||
            th.isOrgStaffInbox ||
            th.orgId ||
            th.lopHocId ||
            th.isGroup
          ) {
            return false;
          }
          if (muaBanSub === "khach_hang") {
            if (!th.isKhachHang) return false;
            if (hiddenRoomIds.includes(th.roomId)) return false;
            if (khachHangTagFilter.length > 0) {
              const ids = th.khachHangTagIds ?? [];
              // OR: khớp bất kỳ thẻ đang lọc
              if (!khachHangTagFilter.some((id) => ids.includes(id))) {
                return false;
              }
            }
            return threadMatchesQuery(th, q, t);
          }
          // mua_hang
          if (!th.isMuaHang) return false;
          if (hiddenRoomIds.includes(th.roomId)) return false;
          return threadMatchesQuery(th, q, t);
        }
        if (th.group !== view) return false;
        if (hiddenRoomIds.includes(th.roomId)) return false;
        /* Tab Tổ chức: không còn sub-filter — gom nhóm trong UI. */
        return threadMatchesQuery(th, q, t);
      });

      const sorted = sortPinned(list);
      /* Tab Tổ chức / Mua bán: giữ flat — gom nhóm + nest trong UI section. */
      if (view === "to_chuc" || view === "mua_ban") return sorted;

      const nested = nestGroupThreads(sorted, {
        // Đang tìm kiếm → hiện hết project khớp query
        expandedParentIds: q ? undefined : expandedProjectParentIds,
        pinnedRoomIds: pinnedListRoomIds,
      });
      return selfThread ? [selfThread, ...nested] : nested;
    };

    const result = {} as Record<ChatThreadView, ChatThread[]>;
    for (const view of CHAT_THREAD_VIEW_ORDER) {
      result[view] = build(view);
    }
    return result;
  }, [
    threads,
    query,
    muaBanSub,
    khachHangTagFilter,
    pinnedListRoomIds,
    hiddenRoomIds,
    expandedProjectParentIds,
    t,
  ]);

  const toChucGrouped = useMemo(
    () => groupToChucThreads(filteredByView.to_chuc),
    [filteredByView.to_chuc],
  );

  const handleOpenOrgQuanLy = useCallback(
    (
      kind: OrgQuanLyKind,
      slug: string,
      opts?: { filter?: "unread" | "open" },
    ) => {
      const base = orgQuanLyPath(kind, slug, "tin-nhan");
      const href = opts?.filter ? `${base}?filter=${opts.filter}` : base;
      onClose(href);
    },
    [onClose],
  );
  const tabUnread = useMemo(() => {
    const counts = Object.fromEntries(
      CHAT_THREAD_VIEW_ORDER.map((view) => [view, 0]),
    ) as Record<ChatThreadView, number>;
    const subCounts: Record<ChatMuaBanSub, number> = {
      mua_hang: 0,
      khach_hang: 0,
    };

    for (const thread of threads) {
      if (thread.unread <= 0) continue;
      // Khớp list: ẩn / tắt thông báo → không đếm badge tab
      if (hiddenRoomIds.includes(thread.roomId)) continue;
      if (isRoomMuted(thread.roomId)) continue;

      /* Tab Tổ chức đếm riêng (số org/hội thoại, không cộng tin). */
      if (thread.group === "to_chuc") continue;

      counts[thread.group] += thread.unread;
      if (thread.isKhachHang) {
        subCounts.khach_hang += thread.unread;
        counts.mua_ban += thread.unread;
      }
      if (thread.isMuaHang) {
        subCounts.mua_hang += thread.unread;
        // Tránh đếm đôi nếu vừa khách vừa đã mua (đối chiều).
        if (!thread.isKhachHang) counts.mua_ban += thread.unread;
      }
    }

    /* Tổ chức: 1 org «Của tôi» có chờ = 1; «Nhắn với» = 1 / hội thoại chưa đọc. */
    const { nhanVoi, cuaToi } = groupToChucThreads(
      threads.filter((thread) => {
        if (thread.group !== "to_chuc") return false;
        if (hiddenRoomIds.includes(thread.roomId)) return false;
        if (isRoomMuted(thread.roomId)) return false;
        return true;
      }),
    );
    counts.to_chuc =
      cuaToi.filter(
        (node) => node.inbox.chuaTraLoi > 0 || node.unread > 0,
      ).length + nhanVoi.filter((t) => t.unread > 0).length;

    return { views: counts, subs: subCounts };
  }, [threads, hiddenRoomIds, isRoomMuted]);

  const ensureKhachHangTagsLoaded = useCallback(async () => {
    if (!banHangBat) return;
    if (khachHangTagsLoaded) return;
    try {
      const res = await fetch("/api/shop/customers/tags", {
        credentials: "include",
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        enabled?: boolean;
        tags?: ShopKhachHangTag[];
      };
      if (data.enabled === false) {
        setKhachHangTags([]);
        setKhachHangTagsLoaded(true);
        return;
      }
      setKhachHangTags(Array.isArray(data.tags) ? data.tags : []);
      setKhachHangTagsLoaded(true);
    } catch {
      /* ignore — UI vẫn dùng được không có thẻ */
    }
  }, [banHangBat, khachHangTagsLoaded]);

  useEffect(() => {
    if (loadingThreads) return;
    const currentHasContent =
      activeTab === "mua_ban" ? showMuaBanTab : viewsWithContent[activeTab];
    if (currentHasContent) return;
    /* Vào chat mặc định Bạn bè — không nhảy sang tab khác chỉ vì tab đó có hội thoại. */
    if (activeTab !== "ban_be") setActiveTab("ban_be");
  }, [loadingThreads, viewsWithContent, showMuaBanTab, activeTab]);

  useEffect(() => {
    if (visibleMuaBanSubs.length === 0) return;
    if (!visibleMuaBanSubs.includes(muaBanSub)) {
      setMuaBanSub(visibleMuaBanSubs[0]!);
    }
  }, [visibleMuaBanSubs, muaBanSub]);

  useEffect(() => {
    if (
      (activeTab === "mua_ban" && muaBanSub === "khach_hang") ||
      khachHangTagPopoverOpen ||
      active?.isKhachHang
    ) {
      void ensureKhachHangTagsLoaded();
    }
  }, [
    activeTab,
    muaBanSub,
    khachHangTagPopoverOpen,
    active?.isKhachHang,
    ensureKhachHangTagsLoaded,
  ]);

  useEffect(() => {
    if (!banHangBat) {
      setKhachHangTags([]);
      setKhachHangTagsLoaded(false);
      setKhachHangTagFilter([]);
    }
  }, [banHangBat]);

  const setKhachHangTagOnActive = useCallback(
    async (tagId: string | null) => {
      const buyerId = active?.peerUserId;
      if (!buyerId || !active?.isKhachHang) return;
      const prev = active.khachHangTagIds ?? [];
      const next = tagId ? [tagId] : [];
      if (
        prev.length === next.length &&
        prev.every((id, i) => id === next[i])
      ) {
        return;
      }
      setThreads((list) =>
        list.map((t) =>
          t.id === active.id ? { ...t, khachHangTagIds: next } : t,
        ),
      );
      setKhachHangTagBusy(true);
      try {
        const res = await fetch(`/api/shop/customers/${buyerId}/tags`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tagIds: next }),
        });
        if (!res.ok) {
          setThreads((list) =>
            list.map((t) =>
              t.id === active.id ? { ...t, khachHangTagIds: prev } : t,
            ),
          );
          const data = (await res.json().catch(() => null)) as {
            error?: string;
          } | null;
          window.alert(data?.error || "Không gắn được thẻ.");
        }
      } catch {
        setThreads((list) =>
          list.map((t) =>
            t.id === active.id ? { ...t, khachHangTagIds: prev } : t,
          ),
        );
        window.alert("Không gắn được thẻ.");
      } finally {
        setKhachHangTagBusy(false);
      }
    },
    [active],
  );

  const deleteKhachHangTag = useCallback(
    async (tagId: string): Promise<boolean> => {
      setKhachHangTagBusy(true);
      try {
        const res = await fetch(`/api/shop/customers/tags/${tagId}`, {
          method: "DELETE",
          credentials: "include",
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as {
            error?: string;
          } | null;
          window.alert(data?.error || "Không xóa được thẻ.");
          return false;
        }
        setKhachHangTags((prev) => prev.filter((t) => t.id !== tagId));
        setKhachHangTagFilter((prev) => prev.filter((id) => id !== tagId));
        setThreads((list) =>
          list.map((t) =>
            t.khachHangTagIds?.includes(tagId)
              ? {
                  ...t,
                  khachHangTagIds: (t.khachHangTagIds ?? []).filter(
                    (id) => id !== tagId,
                  ),
                }
              : t,
          ),
        );
        return true;
      } catch {
        window.alert("Không xóa được thẻ.");
        return false;
      } finally {
        setKhachHangTagBusy(false);
      }
    },
    [],
  );

  const updateKhachHangTag = useCallback(
    async (
      tagId: string,
      patch: { ten?: string; mau?: string | null },
    ): Promise<ShopKhachHangTag | null> => {
      setKhachHangTagBusy(true);
      try {
        const res = await fetch(`/api/shop/customers/tags/${tagId}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        const data = (await res.json()) as {
          tag?: ShopKhachHangTag;
          error?: string;
        };
        if (!res.ok || !data.tag) {
          window.alert(data.error || "Không cập nhật được thẻ.");
          return null;
        }
        setKhachHangTags((prev) =>
          prev.map((t) => (t.id === tagId ? data.tag! : t)),
        );
        return data.tag;
      } catch {
        window.alert("Không cập nhật được thẻ.");
        return null;
      } finally {
        setKhachHangTagBusy(false);
      }
    },
    [],
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

  /* Launch toChucFilter → expand/collapse hub (project parent), tương thích openChat. */
  useEffect(() => {
    if (toChucFilter === "all") return;
    const hubs = toChucGrouped.cuaToi.flatMap((node) =>
      node.rooms.filter((t) => t.isOrgHub).map((t) => t.roomId),
    );
    if (hubs.length === 0) return;
    if (toChucFilter === "cua_toi") {
      setExpandedProjectParents((prev) => {
        const next = { ...prev };
        for (const roomId of hubs) next[roomId] = true;
        return next;
      });
    } else if (toChucFilter === "tham_gia") {
      setExpandedProjectParents((prev) => {
        const next = { ...prev };
        for (const roomId of hubs) next[roomId] = false;
        return next;
      });
    }
  }, [toChucFilter, toChucGrouped.cuaToi]);

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
    setEmojiPickerOpen(false);
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
        const res = await fetch("/api/chat/milestones/tick", {
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

      // Q4: tin pedagogy cá nhân hóa — ẩn với HV khác (staff vẫn thấy)
      if (message.lopBai && viewerProfileId) {
        const forMe = message.lopBai.idNguoiDung === viewerProfileId;
        // Không có isStaff trong closure realtime — suy từ canQuanLyHocVien /
        // canGanTienDo trên phòng đang mở, hoặc tin không phải của phòng active.
        const staffHere =
          Boolean(lopRoomAccess?.canQuanLyHocVien) &&
          activeRoomIdRef.current === event.roomId;
        if (!forMe && !staffHere) {
          // Vẫn cập nhật preview? Không — HV khác không biết tin này tồn tại.
          return;
        }
      }

      // Chào lớp — chỉ HV được chào (sender) thấy
      if (
        message.chaoLop &&
        viewerProfileId &&
        message.senderUserId !== viewerProfileId
      ) {
        return;
      }

      let missingThread = false;

      setThreads((prev) => {
        let found = false;
        const next = prev.map((t) => {
          if (t.roomId !== event.roomId) return t;
          found = true;
          const perspectiveMsg = redactOrgAdvisoryRealtimeMessage(message, t);
          const enriched = t.isGroup
            ? applyKnownGroupSender(perspectiveMsg, t.memberAvatars)
            : perspectiveMsg;
          const isActive = t.roomId === activeRoomIdRef.current;
          const pendingAlbumId =
            pendingAlbumByRoomRef.current.get(event.roomId) ?? null;
          const donHangBump =
            event.event === "update" &&
            enriched.from === "them" &&
            enriched.nguCanh?.loai === "don_hang" &&
            event.lastAt > t.lastAt;
          const nextMessages = isActive
            ? event.event === "update"
              ? mergeChatMessageUpdate(t.messages, enriched)
              : appendChatMessageIfNew(t.messages, enriched, {
                  pendingAlbumOptimisticId: pendingAlbumId,
                })
            : t.messages;
          if (isActive && viewerProfileId) {
            writeRoomMessagesCache(viewerProfileId, event.roomId, nextMessages);
          }
          return {
            ...t,
            preview: event.preview,
            lastAt: event.lastAt,
            messages: nextMessages,
            orgInboxStatus:
              event.event === "insert"
                ? nextOrgInboxStatus(t, enriched)
                : t.orgInboxStatus,
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
        persistViewedRoom(event.roomId, message.id);
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
  }, [subscribeChatMessages, unhideRoom, viewerProfileId, persistViewedRoom]);

  useEffect(() => {
    if (!launch?.thread) return;

    const incoming = launch.thread;
    if (incoming.roomId === "__open_list__") {
      setActiveId("");
      setExpandedOrgInboxId(null);
      setOrgInboxOverviewOpen(false);
      setActiveTab(launch.tab ?? "ban_be");
      if (launch.toChucFilter) setToChucFilter(launch.toChucFilter);
      setMobileShowThread(false);
      return;
    }

    setExpandedOrgInboxId(null);
    setOrgInboxOverviewOpen(false);
    setThreads((prev) => mergeLaunchThread(prev, incoming));
    setActiveId(incoming.id);
    setActiveTab(launch.tab ?? incoming.group);
    if (launch.toChucFilter) setToChucFilter(launch.toChucFilter);
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
  }, [launch?.thread, launch?.tab, launch?.toChucFilter]);

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

  /** Share-drop: rail fixed (không reflow shell); gỡ class khi hết kéo. */
  useEffect(() => {
    if (!shareDropMode) return;
    const root = document.documentElement;
    root.classList.add("is-cins-share-dropping");
    return () => {
      root.classList.remove("is-cins-share-dropping");
    };
  }, [shareDropMode]);

  /**
   * Mobile keyboard: Chrome dùng env(keyboard-inset-height) (khớp animation native).
   * iOS không có VirtualKeyboard API → neo visualViewport.
   * ResizeObserver neo scroll đáy cùng frame với đổi chiều cao — tránh giật
   * vì scrollToBottom delay 50/300ms lệch nhịp bàn phím.
   */
  useEffect(() => {
    if (!portalReady) return;
    const root = chatRootRef.current;
    if (!root) return;

    const vk = (navigator as Navigator & {
      virtualKeyboard?: { overlaysContent: boolean };
    }).virtualKeyboard;
    if (vk) vk.overlaysContent = true;

    const pinMessagesToKeyboard = () => {
      const el = messagesContainerRef.current;
      if (!el) {
        messagesBoxHeightRef.current = null;
        return;
      }
      const next = el.clientHeight;
      const prev = messagesBoxHeightRef.current;
      messagesBoxHeightRef.current = next;
      if (prev == null) return;
      const delta = prev - next;
      if (Math.abs(delta) < 0.5) return;
      const fromBottom = el.scrollHeight - el.scrollTop - prev;
      if (fromBottom < 96) {
        el.scrollTop += delta;
      }
    };

    const syncVisualViewport = () => {
      const vv = window.visualViewport;
      const height = vv?.height ?? window.innerHeight;
      const offsetTop = Math.max(0, vv?.offsetTop ?? 0);
      const layoutH = window.innerHeight;
      const shrunk = height < layoutH - 60;
      /* Chrome + VirtualKeyboard: để CSS env() animate, không ghi px. */
      if (!vk && shrunk) {
        root.style.setProperty("--cins-chat-vv-height", `${height}px`);
        root.style.setProperty("--cins-chat-vv-top", `${offsetTop}px`);
      } else {
        root.style.removeProperty("--cins-chat-vv-height");
        root.style.removeProperty("--cins-chat-vv-top");
      }
      root.classList.toggle("is-vv-shrunk", shrunk);
    };

    syncVisualViewport();
    pinMessagesToKeyboard();

    const vv = window.visualViewport;
    vv?.addEventListener("resize", syncVisualViewport);
    vv?.addEventListener("scroll", syncVisualViewport);
    const ro = new ResizeObserver(pinMessagesToKeyboard);
    ro.observe(root);

    return () => {
      vv?.removeEventListener("resize", syncVisualViewport);
      vv?.removeEventListener("scroll", syncVisualViewport);
      ro.disconnect();
      if (vk) vk.overlaysContent = false;
      root.classList.remove("is-vv-shrunk");
      root.style.removeProperty("--cins-chat-vv-height");
      root.style.removeProperty("--cins-chat-vv-top");
      messagesBoxHeightRef.current = null;
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
      const lightbox = document.querySelector("dialog.cins-chat-lightbox");
      if (lightbox instanceof HTMLDialogElement && lightbox.open) return;
      if (sidePanel) {
        setSidePanel(null);
        return;
      }
      onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, sidePanel]);

  const loadMessages = useCallback(
    async (roomId: string, options?: { force?: boolean }) => {
      if (isPendingRoomId(roomId)) return;

      const status = roomStatusRef.current[roomId] ?? "idle";
      const cached = getCachedRoomMessages(roomId);
      if (!options?.force && status === "ready") {
        persistViewedRoom(roomId, cached?.at(-1)?.id);
        return;
      }
      if (!options?.force && status === "loading") {
        return;
      }

      setLoadError(null);
      shouldScrollToBottomRef.current = true;

      if (cached?.length) {
        patchRoomStatus(roomId, "ready");
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
      } else {
        patchRoomStatus(roomId, "loading");
      }

      try {
        const page = await fetchRoomMessagesPage(roomId, { markRead: true });
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
          const lastMsg = messages[messages.length - 1];
          const next = prev.map((t) =>
            t.roomId === roomId
              ? {
                  ...t,
                  messages,
                  unread: 0,
                  unreadMentions: 0,
                  ...(lastMsg
                    ? {
                        preview: messagePreviewText(lastMsg),
                        lastAt: lastMsg.sentAt,
                      }
                    : {}),
                }
              : t,
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

        if (activeRoomIdRef.current === roomId && page.messages.length > 0) {
          persistViewedRoom(roomId, page.messages.at(-1)?.id);
        }
      } catch (error) {
        if (cached?.length) {
          patchRoomStatus(roomId, "ready");
          if (activeRoomIdRef.current === roomId) {
            persistViewedRoom(roomId, cached.at(-1)?.id);
          }
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
      persistViewedRoom,
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
    const gap = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (shouldScrollToBottomRef.current) {
      if (gap <= 80) return;
      shouldScrollToBottomRef.current = false;
    }
    if (el.scrollTop > 72) return;
    void loadOlderMessages(roomId);
  }, [loadOlderMessages, loadingOlderRoomId]);

  useLayoutEffect(() => {
    if (!shouldScrollToBottomRef.current) return;
    const el = messagesContainerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [active?.roomId, active?.messages.length, active?.messages.at(-1)?.id]);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const snapIfPinned = () => {
      if (!shouldScrollToBottomRef.current) return;
      el.scrollTop = el.scrollHeight;
    };
    el.addEventListener("load", snapIfPinned, true);
    return () => el.removeEventListener("load", snapIfPinned, true);
  }, [active?.roomId]);

  useEffect(() => {
    const roomId = active?.roomId;
    if (!roomId || isPendingRoomId(roomId)) return;

    const status = roomStatusRef.current[roomId] ?? "idle";
    const staleEmpty =
      status === "ready" &&
      active.messages.length === 0 &&
      threadLikelyHasMessages(active) &&
      !forcedEmptyReloadRef.current.has(roomId);
    const staleBehind =
      status === "ready" &&
      threadMessagesAreStale(active.messages, active);

    if (staleEmpty || staleBehind) {
      if (staleEmpty) forcedEmptyReloadRef.current.add(roomId);
      void loadMessages(roomId, { force: true });
      return;
    }

    void loadMessages(roomId);
  }, [
    active?.lastAt,
    active?.messages.length,
    active?.preview,
    active?.roomId,
    loadMessages,
  ]);

  useEffect(() => {
    const roomId = active?.roomId;
    if (!roomId || isPendingRoomId(roomId)) return;
    persistViewedRoom(roomId, active.messages.at(-1)?.id);
  }, [active?.messages.at(-1)?.id, active?.roomId, persistViewedRoom]);

  /**
   * Phòng tư vấn org (staff inbox): Realtime phụ thuộc RLS `chat_thanh_vien`.
   * Poll nhẹ khi đang mở hội thoại để đồng bộ preview + tin mới nếu channel miss.
   */
  useEffect(() => {
    const roomId = active?.roomId;
    if (!roomId || isPendingRoomId(roomId)) return;
    if (!active.isOrgStaffInbox && !active.isOrgAdvisory) return;

    let cancelled = false;
    const tick = async () => {
      try {
        const page = await fetchRoomMessagesPage(roomId, { limit: 12 });
        if (!page || cancelled) return;
        const baseMessages = applyChatViewerPerspective(
          page.messages,
          viewerProfileId,
        );
        const lastMsg = baseMessages[baseMessages.length - 1];
        if (!lastMsg) return;
        const nextPreview = messagePreviewText(lastMsg);

        setThreads((prev) =>
          prev.map((t) => {
            if (t.roomId !== roomId) return t;
            const previewStale =
              t.lastAt < lastMsg.sentAt || t.preview !== nextPreview;
            let messages = t.messages;
            if (t.roomId === activeRoomIdRef.current) {
              for (const msg of baseMessages) {
                messages = appendChatMessageIfNew(messages, msg);
              }
            }
            if (!previewStale && messages === t.messages) return t;
            return {
              ...t,
              messages,
              preview: nextPreview,
              lastAt: lastMsg.sentAt > t.lastAt ? lastMsg.sentAt : t.lastAt,
              unread: t.roomId === activeRoomIdRef.current ? 0 : t.unread,
            };
          }),
        );
      } catch {
        /* ignore */
      }
    };

    void tick();
    const timer = window.setInterval(() => void tick(), 8_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [
    active?.roomId,
    active?.isOrgStaffInbox,
    active?.isOrgAdvisory,
    viewerProfileId,
  ]);

  useEffect(() => {
    const roomId = active?.roomId;
    if (!roomId || isPendingRoomId(roomId) || !active?.lopHocId) {
      setLopRoomAccess(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/chat/rooms/${roomId}/class-access`, {
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (cancelled) return;
        setLopRoomAccess({
          isLopRoom: Boolean(data.isLopRoom),
          frozen: Boolean(data.frozen),
          canSend: data.canSend !== false,
          soNgayConLai: Number(data.soNgayConLai) || 0,
          ngayCuoiKy:
            typeof data.ngayCuoiKy === "string" ? data.ngayCuoiKy : null,
          orgId: typeof data.orgId === "string" ? data.orgId : null,
          orgTen: typeof data.orgTen === "string" ? data.orgTen : null,
          hocVienLopId:
            typeof data.hocVienLopId === "string" ? data.hocVienLopId : null,
          vaiTroLabel:
            typeof data.vaiTroLabel === "string" ? data.vaiTroLabel : null,
          giaoVienTenCongKhai:
            typeof data.giaoVienTenCongKhai === "string"
              ? data.giaoVienTenCongKhai
              : null,
          canQuanLyHocVien: Boolean(data.canQuanLyHocVien),
          canGanTienDo: Boolean(data.canGanTienDo),
          dongBoTienDo: Boolean(data.dongBoTienDo),
        });
      } catch {
        if (!cancelled) setLopRoomAccess(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [active?.roomId, active?.lopHocId]);

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
      /* Mở từ hộp thư người lạ: giữ ngữ cảnh org để nút back về đúng danh sách. */
      if (!thread.isOrgStaffInbox) {
        setExpandedOrgInboxId(null);
        setOrgInboxOverviewOpen(false);
      } else if (thread.orgId) {
        setExpandedOrgInboxId(thread.orgId);
      }
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

      persistViewedRoom(thread.roomId, thread.messages.at(-1)?.id);
    },
    [
      draft,
      loadMessages,
      pendingImages,
      persistViewedRoom,
      restoreComposeForRoom,
      scrollMessagesToBottom,
    ],
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
      onClose(`/${slug}`);
    },
    [onClose],
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
        const res = await fetch(`/api/friends/${targetUserId}/block`, {
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

  const handleCreateGroupFromThread = useCallback((thread: ChatThread) => {
    const id = thread.peerUserId?.trim();
    if (!id || thread.isGroup || thread.isSelf) return;
    setGroupModalPreset([
      {
        id,
        slug: thread.peerSlug?.trim() || "",
        ten_hien_thi: thread.name,
        avatarUrl: thread.avatarUrl ?? null,
      },
    ]);
    setGroupModalOpen(true);
  }, []);

  const handleGroupCreated = useCallback(
    (thread: ChatThread) => {
      setGroupModalOpen(false);
      setGroupModalPreset(null);
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

  const onConvoSwipeLeft = useCallback(() => {
    if (sidePanelRef.current) return;
    toggleExpandPanel();
  }, [toggleExpandPanel]);

  const onConvoSwipeRight = useCallback(() => {
    if (sidePanelRef.current) setSidePanel(null);
  }, []);

  useChatConvoSwipe(chatMainRef, {
    onSwipeLeft: onConvoSwipeLeft,
    onSwipeRight: onConvoSwipeRight,
  });

  const selectSidePanelTab = useCallback((panel: ChatSidePanel) => {
    setSidePanel(panel);
  }, []);

  const availableSidePanels = useMemo((): ChatSidePanel[] => {
    const base: ChatSidePanel[] = [...SIDE_PANEL_BASE];
    if (!lopRoomAccess?.isLopRoom) return base;
    if (lopRoomAccess.canQuanLyHocVien) {
      return [...base, "hoc_vien"];
    }
    return base;
  }, [lopRoomAccess]);

  useEffect(() => {
    if (!sidePanel) return;
    if (!availableSidePanels.includes(sidePanel)) {
      setSidePanel("pin");
    }
  }, [availableSidePanels, sidePanel]);

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
  const lopFrozen =
    Boolean(lopRoomAccess?.isLopRoom) &&
    Boolean(lopRoomAccess?.frozen) &&
    lopRoomAccess?.canSend === false;
  const canJoinPhongHoc =
    Boolean(active?.roomId) &&
    !isPendingRoom &&
    !Boolean(active?.isSelf) &&
    !lopFrozen;

  useEffect(() => {
    if (!canJoinPhongHoc) return;
    prefetchPhongHocMeeting();
  }, [canJoinPhongHoc]);

  useEffect(() => {
    const roomId = active?.roomId;
    if (!roomId || isPendingRoomId(roomId) || !canJoinPhongHoc) return;
    const ac = new AbortController();
    void fetch(
      `/api/chat/rooms/${encodeURIComponent(roomId)}/classroom/ensure`,
      { method: "POST", signal: ac.signal },
    ).catch(() => {});
    return () => ac.abort();
  }, [active?.roomId, canJoinPhongHoc]);

  const canSend =
    Boolean(active) &&
    !isPendingRoom &&
    !connecting &&
    !lopFrozen &&
    (draft.trim().length > 0 ||
      sendableImages.length > 0 ||
      activePendingCard != null);

  const composeDirty =
    draft.trim().length > 0 ||
    pendingImages.length > 0 ||
    activePendingCard != null;

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

  const runHighlightWhenReady = useCallback(
    (messageId: string) => {
      const tryHighlight = (attempt: number) => {
        if (highlightMessage(messageId)) return;
        if (attempt >= 12) return;
        requestAnimationFrame(() => tryHighlight(attempt + 1));
      };
      requestAnimationFrame(() => tryHighlight(0));
    },
    [highlightMessage],
  );

  const scrollToMessage = useCallback(
    async (messageId: string) => {
      if (!active) return;
      shouldScrollToBottomRef.current = false;

      /* Mobile canvas/side overlay ẩn convo — đóng panel rồi nhảy sang tab tin. */
      if (mobileNarrow && sidePanel) {
        pendingJumpMessageIdRef.current = messageId;
        setMobileShowThread(true);
        setSidePanel(null);
        return;
      }

      const roomId = active.roomId;
      if (isPendingRoomId(roomId)) return;

      if (active.messages.some((m) => m.id === messageId)) {
        runHighlightWhenReady(messageId);
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
          runHighlightWhenReady(messageId);
          return;
        }
      }

      setLoadError("Không tìm thấy tin nhắn trong hội thoại.");
    },
    [active, mobileNarrow, runHighlightWhenReady, sidePanel],
  );

  useEffect(() => {
    const id = pendingJumpMessageIdRef.current;
    if (!id) return;
    if (mobileNarrow && sidePanel) return;
    pendingJumpMessageIdRef.current = null;
    void scrollToMessage(id);
  }, [mobileNarrow, sidePanel, scrollToMessage]);

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
      onForward: (msg) => {
        setForwardTarget(msg);
      },
      onNopBai:
        lopRoomAccess?.hocVienLopId && lopRoomAccess.canSend
          ? (msg) => {
              if (!active?.roomId) return;
              const roomId = active.roomId;
              void fetch(`/api/chat/rooms/${roomId}/submissions`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tinNhanId: msg.id }),
              }).then(async (res) => {
                const data = await res.json().catch(() => null);
                if (!res.ok) {
                  setLoadError(data?.error || "Không nộp được bài.");
                  return;
                }
                setLoadError(null);
                window.alert("Đã nộp bài — chờ giáo viên duyệt.");
              });
            }
          : undefined,
      onLuuBai: lopRoomAccess?.canGanTienDo
        ? (msg) => {
            if (!active?.roomId) return;
            const roomId = active.roomId;
            void fetch(`/api/chat/rooms/${roomId}/submissions`, {
              method: "PATCH",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "luu", tinNhanId: msg.id }),
            }).then(async (res) => {
              const data = await res.json().catch(() => null);
              if (!res.ok) {
                setLoadError(data?.error || "Không lưu được bài.");
                return;
              }
              setLoadError(null);
              window.alert("Đã lưu bài — học viên có thể Đăng Journey.");
            });
          }
        : undefined,
    }),
    [
      active,
      patchActiveThreadMessages,
      pinnedByRoom,
      refreshPinnedForRoom,
      lopRoomAccess?.hocVienLopId,
      lopRoomAccess?.canSend,
      lopRoomAccess?.canGanTienDo,
    ],
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
                orgInboxStatus: nextOrgInboxStatus(t, last),
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
            const withoutOptimistic = t.messages.filter(
              (m) => m.id !== optimisticId,
            );
            const messages = reconcileChatMessage(withoutOptimistic, confirmed);
            if (viewerProfileId) {
              writeRoomMessagesCache(viewerProfileId, t.roomId, messages);
            }
            return {
              ...t,
              messages,
              preview: messagePreviewText(confirmed),
              lastAt: confirmed.sentAt,
              orgInboxStatus: nextOrgInboxStatus(t, confirmed),
            };
          }),
        );
        return confirmed;
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
        return null;
      }
    },
    [viewerProfileId],
  );

  const pinChatImagesToCanvas = useCallback(
    (roomId: string, messages: ChatMessage[]) => {
      void (async () => {
        for (const msg of messages) {
          if (msg.kind === "sticker" || msg.deleted) continue;
          const res = await addChatMessageToCanvas(roomId, msg.id);
          if ("error" in res) continue;
          ingestAddedCanvasNode(res.node);
        }
      })();
    },
    [],
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
        ).then((confirmed) => {
          if (confirmed) pinChatImagesToCanvas(thread.roomId, [confirmed]);
        });
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
      pinChatImagesToCanvas,
      selectThread,
      submitRoomMessage,
      viewerProfileId,
    ],
  );

  const callWindowSidRef = useRef<string | null>(null);

  const presentPhongHocUi = useCallback(
    (payload: {
      roomId: string;
      token: string;
      mode: "audio" | "video" | "screen";
      title: string;
      callMessageId: string | null;
    }) => {
      const presented = presentCallUi({
        roomId: payload.roomId,
        token: payload.token,
        mode: payload.mode,
        title: payload.title,
        callMessageId: payload.callMessageId,
        sid: callWindowSidRef.current ?? undefined,
      });
      callWindowSidRef.current = presented.sid;
      if (presented.presentation === "window") {
        setPhongHoc(null);
        if (presented.sid && payload.token) {
          updateCallWindowSession(presented.sid, {
            token: payload.token,
            callMessageId: payload.callMessageId,
            mode: payload.mode,
            title: payload.title,
            roomId: payload.roomId,
          });
        }
        return;
      }
      if (presented.reason === "blocked") {
        setPhongHocErr(
          "Trình duyệt chặn cửa sổ gọi — đang mở toàn màn hình tại đây.",
        );
      }
      setPhongHoc({
        token: payload.token,
        title: payload.title,
        mode: payload.mode,
        callMessageId: payload.callMessageId,
      });
    },
    [],
  );

  const joinPhongHoc = useCallback(
    async (mode: MediaCallMode = "audio") => {
      const roomId = active?.roomId;
      if (!roomId || isPendingRoomId(roomId) || phongHocBusy) return;
      const title = active?.name?.trim() || t("chat.callTitle");
      beginCallTrace("caller", { roomId, mode, via: "overlay" });
      setPhongHocBusy(true);
      setPhongHocErr(null);
      presentPhongHocUi({
        roomId,
        token: "",
        mode,
        title,
        callMessageId: null,
      });
      try {
        const res = await fetch(
          `/api/chat/rooms/${encodeURIComponent(roomId)}/classroom/token`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mode, action: "start" }),
          },
        );
        callTraceAttachServerTiming(res.headers.get("Server-Timing"));
        callTraceMark("T0b", { status: res.status });
        const json = (await res.json().catch(() => null)) as {
          token?: string;
          callMessageId?: string | null;
          error?: string;
        } | null;
        if (!res.ok || !json?.token) {
          setPhongHoc(null);
          callWindowSidRef.current = null;
          setOutboundCallMessageId(null);
          setPhongHocErr(json?.error || "Không bắt đầu được cuộc gọi.");
          return;
        }
        if (json.callMessageId) {
          callTraceRingSent(json.callMessageId);
          setOutboundCallMessageId(json.callMessageId);
        }
        presentPhongHocUi({
          roomId,
          token: json.token,
          mode,
          title,
          callMessageId: json.callMessageId ?? null,
        });
      } catch {
        setPhongHoc(null);
        callWindowSidRef.current = null;
        setOutboundCallMessageId(null);
        setPhongHocErr("Lỗi mạng — thử lại.");
      } finally {
        setPhongHocBusy(false);
      }
    },
    [active?.name, active?.roomId, phongHocBusy, presentPhongHocUi],
  );

  useEffect(() => {
    const roomId = active?.roomId;
    if (!roomId) return;

    const applyPending = (pending: {
      roomId: string;
      token: string;
      mode: "audio" | "video" | "screen";
      callMessageId: string;
      title: string;
    }) => {
      if (pending.roomId !== roomId) return;
      takePendingPhongHoc(roomId);
      setPhongHocErr(null);
      presentPhongHocUi({
        roomId: pending.roomId,
        token: pending.token,
        mode: pending.mode,
        title: pending.title || active?.name?.trim() || t("chat.callTitle"),
        callMessageId: pending.callMessageId,
      });
    };

    const queued = takePendingPhongHoc(roomId);
    if (queued) applyPending(queued);

    return subscribePendingPhongHoc(applyPending);
  }, [active?.roomId, active?.name, presentPhongHocUi]);

  useEffect(() => {
    const callMessageId =
      phongHoc?.callMessageId ?? outboundCallMessageId;
    if (!callMessageId) return;
    const inlineOpen = phongHoc != null;
    return subscribeChatMessages((event) => {
      if (event.message.id !== callMessageId) return;
      const st = event.message.cuocGoi?.trangThai;
      if (st === "tu_choi" || st === "nho") {
        setPhongHoc(null);
        callWindowSidRef.current = null;
        setOutboundCallMessageId(null);
        setPhongHocErr(
          st === "tu_choi" ? "Người nhận đã từ chối." : "Không bắt máy.",
        );
        return;
      }
      /* Đối phương kết thúc → đóng UI thay vì ngồi lại phòng trống. */
      if (st === "ket_thuc") {
        callWindowSidRef.current = null;
        setOutboundCallMessageId(null);
        if (inlineOpen) {
          setPhongHoc(null);
          setPhongHocErr("Cuộc gọi đã kết thúc.");
        }
      }
    });
  }, [
    phongHoc,
    phongHoc?.callMessageId,
    outboundCallMessageId,
    subscribeChatMessages,
  ]);

  /** Đính kèm video chat: optimistic (poster/blob) → upload R2 → gửi media. */
  const attachVideoFile = useCallback(
    async (file: File) => {
      const thread = active;
      /* Không dùng `canSend` (đòi có draft/ảnh) — video gửi độc lập như đính kèm ảnh. */
      if (!thread || isPendingRoom || connecting || lopFrozen) {
        setComposeError(
          lopFrozen
            ? "Phòng lớp hết kỳ học — không gửi video được."
            : "Chưa sẵn sàng gửi video. Thử lại sau khi kết nối xong.",
        );
        return;
      }

      setComposeError(null);

      if (file.size > CHAT_VIDEO_MAX_UPLOAD_BYTES) {
        setComposeError(
          "Video quá nặng (tối đa 50MB) — hãy quay ngắn hoặc nén lại.",
        );
        return;
      }

      const [poster, meta] = await Promise.all([
        captureVideoPoster(file).catch(() => null),
        probeVideoMetadata(file).catch(() => ({
          durationS: null,
          width: null,
          height: null,
        })),
      ]);
      const objectUrl = URL.createObjectURL(file);
      const optimistic: ChatMessage = {
        ...createOptimisticChatMessage({
          body: "",
          kind: "media",
          videoUrl: objectUrl,
          imageUrl: poster,
          videoWidth: meta.width,
          videoHeight: meta.height,
          videoDurationS: meta.durationS,
        }),
        senderUserId: viewerProfileId ?? undefined,
      };
      appendOptimisticMessages(thread, [optimistic]);

      const uploaded = await uploadChatVideo(file);

      if (!uploaded.ok) {
        URL.revokeObjectURL(objectUrl);
        if (poster) URL.revokeObjectURL(poster);
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
        setComposeError(uploaded.error);
        return;
      }

      /* Giữ blob đến khi tin thật thay optimistic — revoke sớm → khung trống. */
      void submitRoomMessage(
        thread,
        { video_media_id: uploaded.mediaId },
        optimistic.id,
      )
        .then((confirmed) => {
          if (!confirmed || sidePanel !== "canvas") return;
          void addChatMessageToCanvas(thread.roomId, confirmed.id).then((res) => {
            if ("error" in res) return;
            ingestAddedCanvasNode(res.node);
          });
        })
        .finally(() => {
          URL.revokeObjectURL(objectUrl);
          if (poster) URL.revokeObjectURL(poster);
        });
    },
    [
      active,
      appendOptimisticMessages,
      isPendingRoom,
      connecting,
      lopFrozen,
      sidePanel,
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
        pinChatImagesToCanvas(thread.roomId, realMessages);
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
    [pinChatImagesToCanvas, viewerProfileId],
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

  const sendGif = useCallback(
    async (
      thread: ChatThread,
      payload: { previewUrl: string; url: string; id?: string },
    ) => {
      const optimistic = createOptimisticChatMessage({
        body: "",
        kind: "sticker",
        imageId: null,
        imageUrl: payload.previewUrl,
      });
      appendOptimisticMessages(thread, [optimistic]);
      try {
        const imported = await importGifToCloudflare({
          url: payload.url,
          id: payload.id,
        });
        await submitRoomMessage(
          thread,
          { cloudflare_image_id: imported.imageId, as_sticker: true },
          optimistic.id,
        );
      } catch (error) {
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
        setLoadError(
          error instanceof Error ? error.message : "Không gửi được GIF.",
        );
      }
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

  /* Tự gửi card đơn (biên lai trong ngu_canh.anh) khi openChat({ autoSendNguCanh: true }). */
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
    const imageUrl =
      launch.autoSendImageUrl?.trim() ||
      (imageId ? chatImageDeliveryUrl(imageId) : null) ||
      null;
    const cardWithBill =
      imageUrl && !pending.anh?.trim()
        ? { ...pending, anh: imageUrl }
        : pending;

    void sendPendingCard(active, cardWithBill);
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
          ? async () =>
              Boolean(
                await submitRoomMessage(
                  thread,
                  plan.text!.payload,
                  plan.text!.optimistic.id,
                ),
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

  const sendCapturedPhotos = useCallback(
    (files: File[]) => {
      const thread = active;
      if (!thread || isPendingRoom || connecting || lopFrozen) {
        setComposeError(
          lopFrozen
            ? "Phòng lớp hết kỳ học — không gửi ảnh được."
            : "Chưa sẵn sàng gửi ảnh. Thử lại sau khi kết nối xong.",
        );
        return;
      }

      const planned = planPendingImageAdditions(files, []);
      if (planned.length === 0) {
        setComposeError("Không đọc được ảnh vừa chụp.");
        return;
      }

      setComposeError(null);
      const snapshotImages = planned.map((item) => item.draft);
      for (const { file, draft } of planned) {
        pendingFilesByLocalIdRef.current.set(draft.localId, file);
        void uploadPendingImage(file, draft.localId, thread.roomId);
      }

      const plan = buildChatSendPlan({
        text: "",
        images: snapshotImages.map((image) => ({
          localId: image.localId,
          imageId: image.imageId,
          previewUrl: image.previewUrl,
        })),
      });
      const optimistics = optimisticMessagesFromPlan(plan);
      if (!plan.album || optimistics.length === 0) return;

      appendOptimisticMessages(thread, optimistics);
      pendingAlbumByRoomRef.current.set(thread.roomId, plan.album.optimistic.id);

      void executeComposeSendPlanInBackground({
        plan,
        imageSnapshots: snapshotImages,
        filesByLocalId: pendingFilesByLocalIdRef.current,
        inFlightUploads: inFlightUploadsRef.current,
        hasText: false,
        sendAlbum: (payloads) =>
          submitAlbumBatch(thread, plan.album!.optimistic.id, payloads),
        onFailure: () => {
          pendingAlbumByRoomRef.current.delete(thread.roomId);
          setLoadError("Không gửi được ảnh. Hãy thử lại.");
          const ids = new Set(optimistics.map((item) => item.id));
          setThreads((prev) =>
            prev.map((t) =>
              t.id === thread.id
                ? {
                    ...t,
                    messages: t.messages.filter((m) => !ids.has(m.id)),
                  }
                : t,
            ),
          );
        },
        onFinally: () => {
          for (const image of snapshotImages) {
            pendingFilesByLocalIdRef.current.delete(image.localId);
          }
        },
      }).then((ok) => {
        if (ok) revokeDraftImageUrls(snapshotImages);
      });
    },
    [
      active,
      appendOptimisticMessages,
      connecting,
      isPendingRoom,
      lopFrozen,
      submitAlbumBatch,
      uploadPendingImage,
    ],
  );

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

  const insertComposeEmoji = useCallback(
    (emoji: string) => {
      const ta = inputRef.current;
      const idx = ta?.selectionStart ?? draft.length;
      const result = insertAt(draft, idx, emoji);
      setDraft(result.value);
      requestAnimationFrame(() => {
        const el = inputRef.current;
        if (!el) return;
        el.focus();
        el.setSelectionRange(result.selectionStart, result.selectionEnd);
      });
    },
    [draft],
  );

  const toggleOrgInboxExpand = useCallback((orgId: string) => {
    setExpandedOrgInboxId((prev) => (prev === orgId ? null : orgId));
  }, []);

  const openOrgInboxOverview = useCallback(() => {
    setOrgInboxOverviewOpen(true);
    setActiveId("");
    setMobileShowThread(true);
    setActiveTab("to_chuc");
  }, []);

  /** Org mình quản trị có hội thoại người lạ — nguồn của lớp card. */
  const orgInboxNodes = useMemo(
    () => toChucGrouped.cuaToi.filter((node) => node.inbox.count > 0),
    [toChucGrouped.cuaToi],
  );

  const orgInboxTotals = useMemo(() => {
    let chuaTraLoi = 0;
    let hoiThoai = 0;
    for (const node of orgInboxNodes) {
      chuaTraLoi += node.inbox.tongChuaTraLoi;
      hoiThoai += node.inbox.tong;
    }
    return { chuaTraLoi, hoiThoai, orgs: orgInboxNodes.length };
  }, [orgInboxNodes]);

  const sortOrgInboxThreads = useCallback((threads: ChatThread[]) => {
    return threads
      .filter((t) => t.isOrgStaffInbox)
      .slice()
      .sort((a, b) => {
        const openA = a.orgInboxStatus === "open" ? 0 : 1;
        const openB = b.orgInboxStatus === "open" ? 0 : 1;
        if (openA !== openB) return openA - openB;
        return new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime();
      });
  }, []);

  if (!portalReady) return null;

  const toChucHasThreads =
    toChucGrouped.nhanVoi.length > 0 || toChucGrouped.cuaToi.length > 0;
  const toChucNestExpandedIds = {
    expandedParentIds: query.trim() ? undefined : expandedProjectParentIds,
    pinnedRoomIds: pinnedListRoomIds,
  };

  const renderThreadRow = (
    thread: ChatThread,
    view: ChatThreadView = activeTab,
  ) => {
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
        onCreateGroup={handleCreateGroupFromThread}
        activeProjectCount={projectCount}
        projectsExpanded={expandedProjectParentIds.has(thread.roomId)}
        hasActiveProjectChild={
          Boolean(active?.parentRoomId) &&
          active.parentRoomId === thread.roomId
        }
        onToggleProjects={
          projectCount > 0
            ? () => toggleProjectParentExpanded(thread.roomId)
            : undefined
        }
        shareDropActive={shareDropMode}
        onShareDrop={handleShareDrop}
        khachHangListMode={
          view === "mua_ban" && muaBanSub === "khach_hang"
        }
        muaHangListMode={
          view === "mua_ban" && muaBanSub === "mua_hang"
        }
        khachHangTags={khachHangTags}
      />
    );
  };

  /**
   * «Tổ chức của tôi»: layer 1 = hub (ChatThreadRow project-parent) +
   * item inbox «chưa trả lời» (admin); lớp học = is-project-child dưới hub.
   * Click inbox → browse danh sách trong pane convo (không rời overlay).
   */
  const renderToChucOrgEntries = (node: ToChucOrgNode) => {
    const nestedRooms = nestGroupThreads(node.rooms, toChucNestExpandedIds);
    return nestedRooms.map((thread) => renderThreadRow(thread, "to_chuc"));
  };

  /**
   * Một entry gom mọi org mình quản trị — vào rồi xổ accordion chat con
   * (không drill-down sang pane riêng).
   */
  const renderOrgInboxEntry = (): ReactElement | null => {
    if (orgInboxNodes.length === 0) return null;
    const { chuaTraLoi, orgs } = orgInboxTotals;
    const chuaTraLoiLabel =
      formatUnreadTabCount(chuaTraLoi) ?? String(chuaTraLoi);
    const entryActive =
      orgInboxOverviewOpen || Boolean(active?.isOrgStaffInbox);
    const moTa =
      chuaTraLoi > 0
        ? t("chat.inboxOpen", { n: chuaTraLoiLabel, orgs })
        : t("chat.inboxDone", { orgs });

    return (
      <li
        key="org-inbox-overview"
        className="cins-chat-thread-item is-org-inbox-entry"
      >
        <button
          type="button"
          className={`cins-chat-thread is-org-inbox-thread${entryActive ? " is-active" : ""}`}
          onClick={openOrgInboxOverview}
          aria-label={t("chat.inboxAria", { desc: moTa })}
          aria-pressed={entryActive}
        >
          <span className="cins-chat-self-avatar" aria-hidden>
            <MessageSquareQuote size={20} strokeWidth={2.2} />
          </span>
          <span className="cins-chat-thread-main">
            <span className="cins-chat-thread-top">
              <span className="cins-chat-thread-name">
                <strong>{t("chat.strangerInbox")}</strong>
              </span>
            </span>
            <span className="cins-chat-thread-bottom">
              <span className="cins-chat-thread-preview">{moTa}</span>
              {chuaTraLoi > 0 ? (
                <span
                  className="cins-chat-unread"
                  title={t("chat.unansweredN", { n: chuaTraLoiLabel })}
                >
                  {chuaTraLoiLabel}
                </span>
              ) : null}
            </span>
          </span>
        </button>
      </li>
    );
  };

  const handleThreadListDragOver = shareDropMode
    ? (event: ReactDragEvent<HTMLDivElement>) => {
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
    : undefined;

  const renderThreadPanelBody = (view: ChatThreadView) => {
    if (loadingThreads) {
      return <p className="cins-chat-threads-empty">{t("chat.loadingThreads")}</p>;
    }
    if (loadError) {
      return <p className="cins-chat-threads-empty">{loadError}</p>;
    }
    if (view === "to_chuc") {
      if (!toChucHasThreads) {
        return (
          <p className="cins-chat-threads-empty">
            {query.trim()
              ? t("chat.noThreadMatch")
              : t("chat.emptyOrgs")}
          </p>
        );
      }
      return (
        <>
          {toChucGrouped.cuaToi.length > 0 ? (
            <section
              className="cins-chat-thread-section"
              aria-label={t("chat.myOrgs")}
            >
              <div className="cins-chat-thread-section-head">
                <h3 className="cins-chat-thread-section-title">
                  {t("chat.myOrgs")}
                </h3>
                <OrgNotifySettingsMenu
                  orgs={toChucGrouped.cuaToi
                    .filter((n) => n.canManageNotify)
                    .map((n) => ({
                      orgId: n.orgId,
                      orgTen: n.orgTen,
                    }))}
                />
              </div>
              <ul role="list">
                {renderOrgInboxEntry()}
                {toChucGrouped.cuaToi.flatMap((node) =>
                  renderToChucOrgEntries(node),
                )}
              </ul>
            </section>
          ) : null}
          {toChucGrouped.nhanVoi.length > 0 ? (
            <section
              className="cins-chat-thread-section"
              aria-label={t("chat.msgOrgs")}
            >
              <h3 className="cins-chat-thread-section-title">
                {t("chat.msgOrgs")}
              </h3>
              <ul role="list">
                {nestGroupThreads(
                  toChucGrouped.nhanVoi,
                  toChucNestExpandedIds,
                ).map((thread) => renderThreadRow(thread, "to_chuc"))}
              </ul>
            </section>
          ) : null}
        </>
      );
    }
    const list = filteredByView[view] ?? [];
    if (list.length > 0) {
      return (
        <ul role="list">
          {list.map((thread) => renderThreadRow(thread, view))}
        </ul>
      );
    }
    return (
      <p className="cins-chat-threads-empty">
        {query.trim()
          ? t("chat.noThreadMatch")
          : view === "mua_ban" && muaBanSub === "khach_hang"
            ? khachHangTagFilter.length > 0
              ? t("chat.emptyTag")
              : t("chat.emptyCustomers")
            : view === "mua_ban" && muaBanSub === "mua_hang"
              ? t("chat.emptyBuy")
              : t("chat.emptyGroup")}
      </p>
    );
  };

  const activeTabIndex = Math.max(0, visibleThreadViews.indexOf(activeTab));
  const threadTabVars = {
    "--cins-chat-tab-i": String(activeTabIndex),
    "--cins-chat-tab-n": String(Math.max(1, visibleThreadViews.length)),
  } as CSSProperties;
  const showMuaBanChromeExtra =
    visibleThreadViews.includes("mua_ban") &&
    (visibleMuaBanSubs.length > 1 ||
      (muaBanSub === "khach_hang" && khachHangTags.length > 0));

  const panel = (
    <div
      ref={chatRootRef}
      className={`cins-chat-root${shareDropMode ? " is-share-drop-root" : ""}${shellFill ? " is-chat-fullscreen is-chat-page" : ""}`}
      role="presentation"
      onClick={(e) => {
        // Fill shell — không đóng bằng click ngoài.
        if (shellFill) return;
        // Chỉ đóng khi click đúng vùng ngoài panel — tránh nút header
        // (ghim bubble, …) bị coi là click backdrop khi layout sát mép.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {shellFill ? null : (
        <div className="cins-chat-backdrop" aria-hidden="true" />
      )}

      <section
        className={`cins-chat-panel${sidePanel && active ? " has-side-panel" : ""}${sidePanel === "canvas" && active ? " has-canvas" : ""}${shareDropMode ? " is-share-drop" : ""}${shellFill ? " is-chat-fullscreen is-chat-page" : ""}`}
        role="dialog"
        aria-modal={shellFill ? false : true}
        aria-label={t("chat.messages")}
        onClick={(e) => e.stopPropagation()}
      >
        <aside
          className={`cins-chat-list${mobileShowThread && !shareDropMode ? " is-hidden-mobile" : ""}${sidePanel === "canvas" ? " is-rail" : ""}`}
          style={threadTabVars}
        >
          <div className="cins-chat-list-chrome">
          {shareDropMode ? (
            <p className="cins-chat-share-drop-hint" role="status">
              {t("chat.shareDrop")}
            </p>
          ) : null}
          <header className="cins-chat-list-head">
            <CinsChatListBrand />
            <div className="cins-chat-list-head-actions">
              <button
                type="button"
                className={`cins-chat-icon-btn is-plain${searchOpen ? " is-active" : ""}`}
                aria-label={searchOpen ? t("chat.searchClose") : t("chat.search")}
                aria-expanded={searchOpen}
                title={t("chat.search")}
                onClick={() => {
                  setSearchOpen((wasOpen) => {
                    if (wasOpen) setQuery("");
                    return !wasOpen;
                  });
                }}
              >
                <Search size={18} strokeWidth={1.8} aria-hidden />
              </button>
              {activeTab === "ban_be" ? (
                <button
                  type="button"
                  className="cins-chat-icon-btn is-plain"
                  aria-label={t("chat.newMsg")}
                  title={t("chat.newMsg")}
                  onClick={() => {
                    setGroupModalPreset(null);
                    setGroupModalOpen(true);
                  }}
                >
                  <Plus size={22} strokeWidth={2} aria-hidden />
                </button>
              ) : null}
              <button
                type="button"
                className="cins-chat-icon-btn is-plain cins-chat-close-desktop"
                aria-label={t("chat.closePanel")}
                title={t("chat.close")}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onClose();
                }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <Minimize2 size={16} strokeWidth={1.8} aria-hidden />
              </button>
              <button
                type="button"
                className="cins-chat-icon-btn is-plain cins-chat-close-mobile"
                aria-label={t("chat.closePanel")}
                title={t("chat.close")}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onClose();
                }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <X size={18} strokeWidth={1.8} aria-hidden />
              </button>
            </div>
          </header>

          {searchOpen ? (
            <div className="cins-chat-search-row">
              <label className="cins-chat-search">
                <input
                  ref={searchInputRef}
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== "Escape") return;
                    setSearchOpen(false);
                    setQuery("");
                  }}
                  placeholder={t("chat.search")}
                />
              </label>
            </div>
          ) : null}

          {visibleThreadViews.length > 1 ? (
          <div
            className="cins-chat-thread-tabs"
            role="tablist"
            aria-label={t("chat.tabsAria")}
          >
            <span className="cins-chat-thread-tab-pill" aria-hidden />
            {visibleThreadViews.map((view) => {
              const unread = tabUnread.views[view];
              const unreadLabel = formatUnreadTabCount(unread);
              return (
              <button
                key={view}
                type="button"
                role="tab"
                id={`cins-chat-tab-${view}`}
                aria-selected={activeTab === view}
                aria-controls={`cins-chat-tabpanel-${view}`}
                className={`cins-chat-thread-tab${activeTab === view ? " is-active" : ""}${unreadLabel ? " has-unread" : ""}`}
                aria-label={
                  unreadLabel
                    ? view === "to_chuc"
                      ? t("chat.unreadOrgs", {
                          label: tChatView(t, view),
                          n: unreadLabel,
                        })
                      : t("chat.unreadMsgs", {
                          label: tChatView(t, view),
                          n: unreadLabel,
                        })
                    : tChatView(t, view)
                }
                onClick={() => {
                  setExpandedOrgInboxId(null);
                  setActiveTab(view);
                }}
              >
                <span className="cins-chat-thread-tab-label">
                  {tChatView(t, view)}
                </span>
                {unreadLabel ? (
                  <span className="cins-chat-thread-tab-unread" aria-hidden>
                    {unreadLabel}
                  </span>
                ) : null}
              </button>
              );
            })}
          </div>
          ) : null}

          {showMuaBanChromeExtra ? (
            <div
              className={`cins-chat-list-chrome-extra${activeTab === "mua_ban" ? " is-open" : ""}`}
              aria-hidden={activeTab !== "mua_ban"}
              inert={activeTab === "mua_ban" ? undefined : true}
            >
              <div className="cins-chat-list-chrome-extra-inner">
          {visibleMuaBanSubs.length > 1 ? (
            <div
              className="cins-chat-muaban-subs"
              role="tablist"
              aria-label={t("chat.muaBanAria")}
            >
              {visibleMuaBanSubs.map((sub) => {
                const unread = tabUnread.subs[sub];
                const unreadLabel = formatUnreadTabCount(unread);
                return (
                <button
                  key={sub}
                  type="button"
                  role="tab"
                  id={`cins-chat-muaban-${sub}`}
                  aria-selected={muaBanSub === sub}
                  className={`cins-chat-muaban-sub${muaBanSub === sub ? " is-active" : ""}${unreadLabel ? " has-unread" : ""}`}
                  aria-label={
                    unreadLabel
                      ? t("chat.unreadMsgs", {
                          label: tChatMuaBanSub(t, sub),
                          n: unreadLabel,
                        })
                      : tChatMuaBanSub(t, sub)
                  }
                  onClick={() => setMuaBanSub(sub)}
                >
                  <span className="cins-chat-thread-tab-label">
                    {tChatMuaBanSub(t, sub)}
                  </span>
                  {unreadLabel ? (
                    <span className="cins-chat-thread-tab-unread" aria-hidden>
                      {unreadLabel}
                    </span>
                  ) : null}
                </button>
                );
              })}
            </div>
          ) : null}

          {muaBanSub === "khach_hang" &&
          khachHangTags.length > 0 ? (
            <div
              className="cins-chat-khach-filters"
              role="group"
              aria-label={t("chat.filterTags")}
            >
              {khachHangTags.map((tag) => {
                const color = resolveRoomTagColor(tag.id, tag.mau);
                const active = khachHangTagFilter.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    className={`cins-chat-khach-filter${active ? " is-active" : ""}`}
                    style={roomTagChipStyle(color, { active })}
                    aria-pressed={active}
                    onClick={() => {
                      setKhachHangTagFilter((prev) =>
                        prev.includes(tag.id)
                          ? prev.filter((id) => id !== tag.id)
                          : [...prev, tag.id],
                      );
                    }}
                  >
                    <span
                      className="cins-chat-khach-tag-dot"
                      style={{ background: color }}
                      aria-hidden
                    />
                    {tag.ten}
                  </button>
                );
              })}
            </div>
          ) : null}
              </div>
            </div>
          ) : null}
          </div>

          <div className="cins-chat-threads-viewport">
            <div className="cins-chat-threads-track">
              {visibleThreadViews.map((view) => {
                const isActivePanel = view === activeTab;
                return (
                  <div
                    key={view}
                    className="cins-chat-threads"
                    role="tabpanel"
                    id={`cins-chat-tabpanel-${view}`}
                    aria-labelledby={`cins-chat-tab-${view}`}
                    aria-hidden={!isActivePanel}
                    inert={isActivePanel ? undefined : true}
                    onDragOver={
                      isActivePanel ? handleThreadListDragOver : undefined
                    }
                  >
                    {renderThreadPanelBody(view)}
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        <div
          ref={chatMainRef}
          className={`cins-chat-main${mobileShowThread ? " is-visible-mobile" : ""}${hideConvoForMobileCanvas ? " is-canvas-mobile-focus" : ""}`}
        >
          {active && !hideConvoForMobileCanvas ? (
          <div
            className={`cins-chat-convo${headerPullDy > 0 ? " is-header-pull" : ""}`}
            style={
              headerPullDy > 0
                ? {
                    transform: `translateY(${headerPullDy}px)`,
                    opacity: Math.max(0.45, 1 - headerPullDy / 280),
                  }
                : undefined
            }
          >
          <header
            className="cins-chat-convo-head"
            onPointerDown={onConvoHeadPointerDown}
            onPointerMove={onConvoHeadPointerMove}
            onPointerUp={onConvoHeadPointerEnd}
            onPointerCancel={onConvoHeadPointerEnd}
          >
            <button
              type="button"
              className="cins-chat-back-mobile"
              aria-label={t("chat.backList")}
              onClick={() => setMobileShowThread(false)}
            >
              <ChevronLeft size={24} strokeWidth={2.25} aria-hidden />
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
                userId={active.kind === "user" ? active.peerUserId : null}
              />
            )}
            <div className="cins-chat-convo-meta">
              {active.isGroup &&
              active.isGroupAdmin &&
              active.roomId &&
              !isPendingRoomId(active.roomId) ? (
                <button
                  type="button"
                  className="cins-chat-convo-title"
                  aria-label={t("chat.manageGroup")}
                  title={t("chat.manageGroup")}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleManageGroup(active);
                  }}
                >
                  <strong>{threadDisplayName(t, active)}</strong>
                </button>
              ) : (
                <span className="cins-chat-convo-title">
                  <strong>{threadDisplayName(t, active)}</strong>
                  {!active.isGroup && active.kind === "org" ? (
                    <ChatKindPill thread={active} />
                  ) : null}
                </span>
              )}
              {active.isGroup ? (
                <div className="cins-chat-convo-submeta">
                  <span className="cins-chat-kind-pill is-group">
                    {active.parentRoomId ? "Project" : t("chat.group")}
                  </span>
                  {active.memberCount ? (
                    <div className="cins-chat-convo-members-wrap">
                      <button
                        type="button"
                        className="cins-chat-convo-members-btn"
                        aria-expanded={membersPopoverOpen}
                        aria-haspopup="dialog"
                        onClick={() => setMembersPopoverOpen((v) => !v)}
                      >
                        {t("chat.membersN", { n: active.memberCount })}
                      </button>
                      <ChatGroupMembersPopover
                        open={membersPopoverOpen}
                        members={activeAtMembers}
                        onClose={() => setMembersPopoverOpen(false)}
                      />
                    </div>
                  ) : null}
                </div>
              ) : active.isOrgStaffInbox && active.orgTen ? (
                <span title={active.viewerOrgVaiTroLabel ?? undefined}>
                  {t("chat.msgToOrg", { name: active.orgTen })}
                  {active.viewerOrgVaiTroLabel
                    ? ` · ${active.viewerOrgVaiTroLabel}`
                    : ""}
                </span>
              ) : active.online ? (
                <span>
                  <span className="cins-chat-online-dot" aria-hidden />
                  {t("chat.online")}
                </span>
              ) : active.kind === "org" && active.role ? (
                <span>{active.role}</span>
              ) : null}
            </div>
            <div className="cins-chat-convo-actions">
              {active.isKhachHang && banHangBat ? (
                <ChatKhachHangTagPopover
                  open={khachHangTagPopoverOpen}
                  onOpenChange={(open) => {
                    setKhachHangTagPopoverOpen(open);
                    if (open) void ensureKhachHangTagsLoaded();
                  }}
                  tags={khachHangTags}
                  selectedTagId={active.khachHangTagIds?.[0] ?? null}
                  busy={khachHangTagBusy}
                  onSelectTag={(tagId) => {
                    void setKhachHangTagOnActive(tagId);
                  }}
                  onUpdateTag={updateKhachHangTag}
                  onDeleteTag={deleteKhachHangTag}
                />
              ) : null}
              {canJoinPhongHoc ? (
                <>
                  <button
                    type="button"
                    className="cins-chat-icon-btn"
                    aria-label={t("chat.callAudio")}
                    title={t("chat.callAudio")}
                    disabled={phongHocBusy}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      void joinPhongHoc("audio");
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <Phone size={18} strokeWidth={1.9} aria-hidden />
                  </button>
                  <button
                    type="button"
                    className="cins-chat-icon-btn"
                    aria-label={t("chat.callVideo")}
                    title={t("chat.callVideo")}
                    disabled={phongHocBusy}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      void joinPhongHoc("video");
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <Video size={18} strokeWidth={1.9} aria-hidden />
                  </button>
                </>
              ) : null}
              {active.roomId && !isPendingRoomId(active.roomId) && !mobileNarrow ? (
                <button
                  type="button"
                  className={`cins-chat-icon-btn cins-chat-bubble-pin${isRoomPinned(active.roomId) ? " is-active" : ""}`}
                  aria-label={
                    isRoomPinned(active.roomId)
                      ? t("chat.unpinBubble")
                      : t("chat.pinBubble")
                  }
                  aria-pressed={isRoomPinned(active.roomId)}
                  title={
                    isRoomPinned(active.roomId)
                      ? t("chat.unpinBubble")
                      : t("chat.pinBubble")
                  }
                  onClick={(e) => {
                    // Không để click “xuyên” ra backdrop (đóng panel).
                    e.preventDefault();
                    e.stopPropagation();
                    if (isRoomPinned(active.roomId)) {
                      togglePinRoom(active.roomId, active);
                      return;
                    }
                    minimizeActiveToBubble();
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
                className={`cins-chat-icon-btn${sidePanel ? " is-active" : ""}`}
                aria-label={t("chat.expand")}
                aria-pressed={Boolean(sidePanel)}
                aria-expanded={Boolean(sidePanel)}
                title={t("chat.expand")}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleExpandPanel();
                }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <PanelRightOpen size={16} strokeWidth={1.8} aria-hidden />
              </button>
              {!sidePanel ? (
                <button
                  type="button"
                  className="cins-chat-icon-btn cins-chat-close-desktop"
                  aria-label={t("chat.close")}
                  title="Đóng"
                  onClick={() => onClose()}
                >
                  <X size={18} strokeWidth={1.8} aria-hidden />
                </button>
              ) : null}
            </div>
          </header>

          {phongHocErr ? (
            <div className="cins-chat-lop-freeze-banner is-frozen" role="alert">
              <span>{phongHocErr}</span>
            </div>
          ) : null}

          {lopRoomAccess?.isLopRoom &&
          (lopRoomAccess.vaiTroLabel || lopRoomAccess.hocVienLopId) ? (
            <div
              className={`cins-chat-lop-freeze-banner${lopFrozen ? " is-frozen" : ""}`}
              role="status"
            >
              <span>
                {lopRoomAccess.vaiTroLabel ? (
                  <>
                    Vai trò của bạn:{" "}
                    <strong className="cins-chat-lop-role">
                      {lopRoomAccess.vaiTroLabel}
                    </strong>
                    {lopRoomAccess.giaoVienTenCongKhai ? (
                      <>
                        {" · "}
                        Giáo viên:{" "}
                        <strong className="cins-chat-lop-role">
                          {lopRoomAccess.giaoVienTenCongKhai}
                        </strong>
                      </>
                    ) : null}
                    {lopRoomAccess.hocVienLopId && !lopFrozen
                      ? `, bạn còn ${lopRoomAccess.soNgayConLai} ngày học`
                      : null}
                  </>
                ) : null}
                {lopRoomAccess.hocVienLopId && lopFrozen
                  ? `${lopRoomAccess.vaiTroLabel ? ". " : ""}Hết kỳ học — còn ${lopRoomAccess.soNgayConLai} ngày. Phòng lớp tạm khóa; tin trong khoảng nghỉ sẽ không hiện lại sau khi gia hạn.`
                  : null}
              </span>
              {lopFrozen && active.roomId ? (
                <button
                  type="button"
                  className="cins-chat-lop-freeze-cta"
                  onClick={() => {
                    void (async () => {
                      try {
                        const res = await fetch(
                          `/api/chat/rooms/${active.roomId}/renew`,
                          {
                            method: "POST",
                            credentials: "include",
                            headers: { "Content-Type": "application/json" },
                            body: "{}",
                          },
                        );
                        const data = await res.json();
                        if (!res.ok) {
                          window.alert(data.error || "Không tạo đơn gia hạn.");
                          if (lopRoomAccess.orgId) {
                            void openChat({ orgId: lopRoomAccess.orgId });
                          }
                          return;
                        }
                        void openChat({ orgId: data.orgId as string });
                      } catch {
                        window.alert("Không tạo đơn gia hạn.");
                      }
                    })();
                  }}
                >
                  Gia hạn VietQR
                </button>
              ) : null}
            </div>
          ) : null}

          <div
            className={`cins-chat-messages${lopFrozen ? " is-lop-frozen" : ""}`}
            ref={messagesContainerRef}
            onScroll={handleMessagesScroll}
          >
            {canvasNotice ? (
              <div className="cins-chat-canvas-notice" role="status">
                <span>{canvasNotice}</span>
                <button
                  type="button"
                  className="cins-chat-mention-banner-dismiss"
                  aria-label={t("chat.close")}
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
                    aria-label={t("chat.close")}
                    onClick={() => setMentionBanner(null)}
                  >
                    <X size={14} strokeWidth={2.2} aria-hidden />
                  </button>
                </span>
              </div>
            ) : null}
            {loadingOlder ? (
              <p className="cins-chat-messages-empty">{t("chat.loadingOlder")}</p>
            ) : null}
            {connecting ? (
              <p className="cins-chat-messages-empty">{t("chat.connecting")}</p>
            ) : loadingMessages && active.messages.length === 0 ? (
              <p className="cins-chat-messages-empty">{t("chat.loadingMsgs")}</p>
            ) : messagesLoadError && active.messages.length === 0 ? (
              <p className="cins-chat-messages-empty">
                {loadError ?? "Không tải được tin nhắn."}
              </p>
            ) : messagesLoaded && active.messages.length === 0 ? (
              <p className="cins-chat-messages-empty">
                {t("chat.emptyStart", { name: threadDisplayName(t, active) })}
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
                canConfirmHocPhi={Boolean(
                  active.isOrgStaffInbox || active.viewerIsOrgMember,
                )}
                orgBrand={
                  active.orgTen || active.orgId
                    ? {
                        ten: active.orgTen ?? active.name,
                        anh: active.isOrgStaffInbox
                          ? null
                          : active.avatarUrl,
                      }
                    : null
                }
                readCursors={
                  active.roomId
                    ? (readCursorsByRoom[active.roomId] ?? [])
                    : []
                }
                showSenderNames={Boolean(active.isGroup || active.isOrgHub)}
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
                    userId={
                      active.isGroup
                        ? (msg.senderUserId ?? null)
                        : active.kind === "user"
                          ? active.peerUserId
                          : null
                    }
                  />
                )}
              />
            ) : null}
            <div ref={messagesEndRef} />
          </div>

          <footer
            className={`cins-chat-compose${lopFrozen ? " is-lop-frozen" : ""}`}
            {...(composeDirty ? { "data-cins-compose-dirty": "" } : {})}
          >
            {composeError ? (
              <p className="cins-chat-compose-error" role="alert">
                <span>{composeError}</span>
                <button
                  type="button"
                  className="cins-chat-compose-error-dismiss"
                  aria-label={t("chat.close")}
                  onClick={() => setComposeError(null)}
                >
                  <X size={14} strokeWidth={2.2} aria-hidden />
                </button>
              </p>
            ) : null}
            {lopFrozen ? (
              <div className="cins-chat-lop-freeze-compose" role="status">
                <span>
                  Phòng lớp hết kỳ học — còn {lopRoomAccess?.soNgayConLai ?? 0}{" "}
                  ngày học; không gửi tin được.
                </span>
                {active.roomId ? (
                  <button
                    type="button"
                    className="cins-chat-lop-freeze-cta"
                    onClick={() => {
                      void (async () => {
                        try {
                          const res = await fetch(
                            `/api/chat/rooms/${active.roomId}/renew`,
                            {
                              method: "POST",
                              credentials: "include",
                              headers: { "Content-Type": "application/json" },
                              body: "{}",
                            },
                          );
                          const data = await res.json();
                          if (!res.ok) {
                            window.alert(data.error || "Không tạo đơn gia hạn.");
                            if (lopRoomAccess?.orgId) {
                              void openChat({ orgId: lopRoomAccess.orgId });
                            }
                            return;
                          }
                          void openChat({ orgId: data.orgId as string });
                        } catch {
                          window.alert("Không tạo đơn gia hạn.");
                        }
                      })();
                    }}
                  >
                    Gia hạn VietQR
                  </button>
                ) : null}
              </div>
            ) : null}
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
                  <span className="cins-chat-compose-ctx-note">{t("chat.about")}</span>
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
                  aria-label={t("chat.removeContent")}
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
                        aria-label={t("chat.removeAttach")}
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
                onSendGif={(payload) => {
                  if (!active) return;
                  setStickerPickerOpen(false);
                  void sendGif(active, payload);
                }}
              />
            ) : null}
            <div
              className={`cins-chat-compose-row${composeInputFocused ? " is-compose-focus" : ""}`}
            >
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
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                capture="environment"
                className="j-chat-mini-compose-file"
                tabIndex={-1}
                aria-hidden
                onChange={(e) => {
                  const files = [...(e.target.files ?? [])];
                  const shot = files[0];
                  if (shot) setCaptureEditFile(shot);
                  e.target.value = "";
                }}
              />
              <input
                ref={videoFileInputRef}
                type="file"
                accept={CHAT_VIDEO_ACCEPT}
                className="j-chat-mini-compose-file"
                tabIndex={-1}
                aria-hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void attachVideoFile(file);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                className="cins-chat-compose-icon-expand"
                aria-label={t("chat.openAttach")}
                tabIndex={composeInputFocused ? 0 : -1}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setComposeInputFocused(false)}
              >
                <ChevronRight size={18} strokeWidth={2.25} aria-hidden />
              </button>
              <div className="cins-chat-compose-icon-cluster">
              <ChatComposeToolsMenu
                open={composeToolsOpen}
                onOpenChange={(open) => {
                  setComposeToolsOpen(open);
                  if (open) setEmojiPickerOpen(false);
                }}
                disabled={connecting || isPendingRoom || lopFrozen}
                canAddMoc={Boolean(
                  active.roomId &&
                    (!active.isGroup || active.isGroupAdmin),
                )}
                onAddMoc={handleComposeAddMoc}
                onAttachVideo={() => videoFileInputRef.current?.click()}
                onShareScreen={
                  canJoinPhongHoc
                    ? () => void joinPhongHoc("screen")
                    : undefined
                }
                onCreatePoll={handleCreatePoll}
              />
              <button
                type="button"
                className="cins-chat-attach cins-chat-attach-image"
                aria-label={t("chat.attachImage")}
                title={t("chat.attachImage")}
                disabled={connecting || isPendingRoom || lopFrozen}
                onClick={() => fileInputRef.current?.click()}
              >
                <ImageIcon size={20} strokeWidth={2.25} aria-hidden />
              </button>
              <button
                type="button"
                className="cins-chat-attach cins-chat-attach-camera"
                aria-label={t("chat.capture")}
                disabled={connecting || isPendingRoom || lopFrozen}
                onClick={() => cameraInputRef.current?.click()}
              >
                <Camera size={20} strokeWidth={2.25} aria-hidden />
              </button>
              <button
                type="button"
                className="cins-chat-attach cins-chat-attach-meme"
                data-sticker-trigger
                aria-label={t("chat.myMeme")}
                aria-expanded={stickerPickerOpen}
                disabled={connecting || isPendingRoom || lopFrozen}
                onClick={() => {
                  setStickerPickerOpen((open) => !open);
                  setEmojiPickerOpen(false);
                }}
              >
                <span className="cins-chat-attach-meme-icon" aria-hidden />
              </button>
              </div>
              <textarea
                ref={inputRef}
                rows={1}
                value={draft}
                disabled={connecting || isPendingRoom || lopFrozen}
                onChange={(e) => {
                  const el = e.currentTarget;
                  const next = replaceChatEmoticons(
                    el.value,
                    el.selectionStart ?? el.value.length,
                  );
                  const replaced = next.value !== el.value;
                  setDraft(next.value);
                  requestAnimationFrame(() => {
                    if (replaced) {
                      inputRef.current?.setSelectionRange(
                        next.caret,
                        next.caret,
                      );
                    }
                    syncComposeInputHeight();
                    syncAtMentionFromTextarea();
                  });
                }}
                onSelect={() => syncAtMentionFromTextarea()}
                onClick={() => syncAtMentionFromTextarea()}
                placeholder={
                  lopFrozen
                    ? t("chat.composeFrozen")
                    : connecting || isPendingRoom
                      ? t("chat.connecting")
                      : t("chat.composeDraft")
                }
                onFocus={() => {
                  setComposeInputFocused(true);
                  setComposeToolsOpen(false);
                  setStickerPickerOpen(false);
                  const box = messagesContainerRef.current;
                  if (box) messagesBoxHeightRef.current = box.clientHeight;
                  window.scrollTo(0, 0);
                }}
                onBlur={() => {
                  window.setTimeout(() => {
                    if (inputRef.current !== document.activeElement) {
                      setComposeInputFocused(false);
                    }
                  }, 0);
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
              <div
                className={`cins-chat-emoji-wrap${emojiPickerOpen ? " is-open" : ""}`}
              >
                <button
                  ref={emojiBtnRef}
                  type="button"
                  className="cins-chat-attach cins-chat-attach-emoji"
                  title={t("chat.attachEmoji")}
                  aria-label={t("chat.attachEmoji")}
                  aria-expanded={emojiPickerOpen}
                  disabled={connecting || isPendingRoom || lopFrozen}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setEmojiPickerOpen((open) => !open);
                    setComposeToolsOpen(false);
                    setStickerPickerOpen(false);
                  }}
                >
                  <SmilePlus size={20} strokeWidth={2.25} aria-hidden />
                </button>
                <EmojiPickerPopover
                  open={emojiPickerOpen}
                  onClose={() => setEmojiPickerOpen(false)}
                  onPick={insertComposeEmoji}
                  anchorRef={emojiBtnRef}
                  placement="top-end"
                  closeOnPick={false}
                />
              </div>
            </div>
            <button
              type="button"
              className="cins-chat-send"
              aria-label={t("chat.send")}
              disabled={!canSend}
              onClick={() => void sendMessage()}
            >
              <span className="cins-chat-send-icon" aria-hidden />
            </button>
            </div>
          </footer>
          </div>
          ) : orgInboxOverviewOpen && orgInboxNodes.length > 0 ? (
            <div
              className="cins-chat-convo cins-chat-org-inbox-overview"
              role="region"
              aria-label={t("chat.orgInboxAria")}
            >
              <header className="cins-chat-convo-head cins-chat-org-inbox-browse-head">
                <button
                  type="button"
                  className="cins-chat-back-mobile"
                  aria-label={t("chat.backList")}
                  onClick={() => {
                    setOrgInboxOverviewOpen(false);
                    setExpandedOrgInboxId(null);
                    setMobileShowThread(false);
                  }}
                >
                  <ChevronLeft size={24} strokeWidth={2.25} aria-hidden />
                </button>
                <span className="cins-chat-self-avatar" aria-hidden>
                  <MessageSquareQuote size={20} strokeWidth={2.2} />
                </span>
                <div className="cins-chat-convo-meta">
                  <span className="cins-chat-convo-title">
                    <strong>{t("chat.strangerInbox")}</strong>
                  </span>
                  <span className="cins-chat-org-inbox-browse-sub">
                    {orgInboxTotals.orgs} tổ chức mình quản trị
                    {orgInboxTotals.chuaTraLoi > 0
                      ? ` · ${orgInboxTotals.chuaTraLoi} chưa trả lời`
                      : ""}
                  </span>
                </div>
              </header>
              <ul className="cins-chat-org-inbox-card-list" role="list">
                {orgInboxNodes.map((node) => {
                  const canOpenQuanLy = Boolean(
                    node.quanLyKind && node.orgSlug?.trim(),
                  );
                  const expanded = expandedOrgInboxId === node.orgId;
                  const childThreads = expanded
                    ? sortOrgInboxThreads(node.threads)
                    : [];
                  return (
                    <li
                      key={node.orgId}
                      className={
                        expanded
                          ? "cins-chat-org-inbox-card-item is-expanded"
                          : "cins-chat-org-inbox-card-item"
                      }
                    >
                      <div className="cins-chat-org-inbox-card">
                        <button
                          type="button"
                          className="cins-chat-org-inbox-card-main"
                          onClick={() => toggleOrgInboxExpand(node.orgId)}
                          aria-expanded={expanded}
                          aria-controls={`cins-org-inbox-children-${node.orgId}`}
                          aria-label={t("chat.orgInboxCount", {
                            name: node.orgTen,
                            n: node.inbox.tong,
                          })}
                        >
                          <ChatAvatar
                            initial={node.avatarInitial}
                            hue={node.avatarHue}
                            size={40}
                            kind="org"
                            avatarUrl={node.avatarUrl}
                          />
                          <span className="cins-chat-org-inbox-card-body">
                            <span className="cins-chat-org-inbox-card-top">
                              <strong title={node.orgTen}>{node.orgTen}</strong>
                              {node.inbox.tongChuaTraLoi > 0 ? (
                                <span className="cins-chat-org-inbox-status is-open">
                                  {node.inbox.tongChuaTraLoi} chưa trả lời
                                </span>
                              ) : null}
                            </span>
                            <span className="cins-chat-org-inbox-card-stats">
                              {t("chat.orgInboxN", { n: node.inbox.tong })}
                              {node.inbox.tongUnread > 0
                                ? ` · ${node.inbox.tongUnread} tin chưa đọc`
                                : ""}
                            </span>
                          </span>
                          <ChevronDown
                            size={18}
                            strokeWidth={2.2}
                            className={`cins-chat-org-inbox-card-chevron${expanded ? " is-open" : ""}`}
                            aria-hidden
                          />
                        </button>
                        {canOpenQuanLy ? (
                          <button
                            type="button"
                            className="cins-chat-org-inbox-quan-ly-btn"
                            title={t("chat.orgInboxManage", { name: node.orgTen })}
                            onClick={() =>
                              handleOpenOrgQuanLy(
                                node.quanLyKind!,
                                node.orgSlug!,
                                { filter: "open" },
                              )
                            }
                          >
                            {t("chat.orgInboxManage", { name: node.orgTen })}
                          </button>
                        ) : null}
                      </div>
                      {expanded ? (
                        <div
                          id={`cins-org-inbox-children-${node.orgId}`}
                          className="cins-chat-org-inbox-card-children"
                        >
                          {childThreads.length === 0 ? (
                            <p className="cins-chat-org-inbox-browse-empty">
                              Không có hội thoại trong hộp thư.
                            </p>
                          ) : (
                            <ul
                              className="cins-chat-org-inbox-browse-list is-nested"
                              role="list"
                            >
                              {childThreads.map((thread) => {
                                const isOpen =
                                  thread.orgInboxStatus === "open";
                                return (
                                  <li key={thread.id}>
                                    <button
                                      type="button"
                                      className="cins-chat-org-inbox-browse-item"
                                      onClick={() => selectThread(thread)}
                                    >
                                      <ChatAvatar
                                        initial={thread.avatarInitial}
                                        hue={thread.avatarHue}
                                        size={36}
                                        kind={thread.kind}
                                        verified={thread.verified}
                                        avatarUrl={thread.avatarUrl}
                                      />
                                      <span className="cins-chat-org-inbox-browse-item-main">
                                        <span className="cins-chat-org-inbox-browse-item-top">
                                          <strong title={thread.name}>
                                            {thread.name}
                                          </strong>
                                          <time dateTime={thread.lastAt}>
                                            {formatChatTime(thread.lastAt)}
                                          </time>
                                        </span>
                                        <span className="cins-chat-org-inbox-browse-item-bottom">
                                          <span className="cins-chat-org-inbox-browse-preview">
                                            {thread.preview ||
                                              t("chat.noMessages")}
                                          </span>
                                          {isOpen ? (
                                            <span className="cins-chat-org-inbox-status is-open">
                                              Chưa trả lời
                                            </span>
                                          ) : null}
                                          {thread.unread > 0 ? (
                                            <span className="cins-chat-unread">
                                              {thread.unread}
                                            </span>
                                          ) : null}
                                        </span>
                                      </span>
                                    </button>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                          {node.inbox.daCat &&
                          node.quanLyKind &&
                          node.orgSlug?.trim() ? (
                            <button
                              type="button"
                              className="cins-chat-org-inbox-more is-nested"
                              onClick={() =>
                                handleOpenOrgQuanLy(
                                  node.quanLyKind!,
                                  node.orgSlug!,
                                  { filter: "open" },
                                )
                              }
                            >
                              {t("chat.viewAll")}
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <div className="cins-chat-convo cins-chat-convo-empty">
              <p>{t("chat.emptyPick")}</p>
            </div>
          )}

          {sidePanel && active ? (
            <aside
              className={`cins-chat-side${sidePanel === "canvas" ? " is-canvas" : ""}`}
              aria-label={sidePanelLabel(t, sidePanel)}
            >
              <header className="cins-chat-side-head">
                <div
                  className="cins-chat-side-tabs"
                  role="tablist"
                  aria-label={t("chat.sideAria")}
                >
                  {availableSidePanels.map((panel) => {
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
                        aria-label={sidePanelLabel(t, panel)}
                        title={sidePanelLabel(t, panel)}
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
                  aria-label={t("chat.closeSide")}
                  onClick={() => {
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
                              {msg.from === "me"
                                ? t("chat.you")
                                : threadDisplayName(t, active)}
                            </span>
                            <time dateTime={msg.sentAt}>
                              {formatChatTime(msg.sentAt)}
                            </time>
                          </div>
                          <p>
                            {msg.body.trim() ||
                              (msg.imageUrl
                                ? t("chat.photoAttached")
                                : t("chat.message"))}
                          </p>
                        </button>
                        <button
                          type="button"
                          className="cins-chat-side-pin-unpin"
                          aria-label={t("chat.unpin")}
                          onClick={() => messageActionHandlers.onPin(msg, false)}
                        >
                          <PinOff size={15} strokeWidth={2} aria-hidden />
                        </button>
                      </li>
                    ))}
                    {activePinnedMessages.length === 0 ? (
                      <p className="cins-chat-side-empty">{t("chat.noPins")}</p>
                    ) : null}
                  </ul>
                ) : null}

                {sidePanel === "mocs" && active.roomId ? (
                  <ChatRoomMocsPanel
                    roomId={active.roomId}
                    isLopHocRoom={Boolean(active.lopHocId)}
                    canManage={Boolean(
                      active.roomId &&
                        (active.lopHocId
                          ? active.isGroupAdmin
                          : !active.isGroup || active.isGroupAdmin),
                    )}
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
                    viewerUserId={viewerProfileId}
                    isGroup={Boolean(active.isGroup)}
                  />
                ) : null}

                {sidePanel === "hoc_vien" && active.roomId ? (
                  <ChatQuanLyHocVienPanel
                    roomId={active.roomId}
                    canGanTienDo={Boolean(lopRoomAccess?.canGanTienDo)}
                    onlineUserIds={roomOnlineUserIds}
                  />
                ) : null}
              </div>
            </aside>
          ) : null}
        </div>
      </section>

      <ChatCreateGroupModal
        open={groupModalOpen}
        initialTab={groupModalPreset?.length ? "nhom" : "chat"}
        presetMembers={groupModalPreset ?? undefined}
        onClose={() => {
          setGroupModalOpen(false);
          setGroupModalPreset(null);
        }}
        onCreated={handleGroupCreated}
      />

      {forwardTarget ? (
        <ChatForwardPicker
          message={forwardTarget}
          excludeRoomId={active?.roomId}
          onClose={() => setForwardTarget(null)}
          onError={(error) => setLoadError(error)}
          onDone={(thread, messages) => {
            const last = messages.at(-1);
            setThreads((prev) => {
              const existing = prev.find((t) => t.roomId === thread.roomId);
              const base = existing?.messages ?? thread.messages ?? [];
              const ids = new Set(base.map((m) => m.id));
              const added = messages.filter((m) => !ids.has(m.id));
              const mergedMessages =
                added.length > 0 ? [...base, ...added] : base;
              const updated: ChatThread = {
                ...(existing ?? thread),
                messages: mergedMessages,
                preview: last
                  ? messagePreviewText(last)
                  : (existing ?? thread).preview,
                lastAt: last?.sentAt ?? (existing ?? thread).lastAt,
              };
              if (viewerProfileId) {
                writeRoomMessagesCache(
                  viewerProfileId,
                  thread.roomId,
                  mergedMessages,
                );
              }
              queueMicrotask(() => {
                selectThread(updated);
              });
              if (!existing) {
                return mergeLaunchThread(prev, updated);
              }
              return prev.map((t) =>
                t.roomId === thread.roomId ? updated : t,
              );
            });
          }}
        />
      ) : null}

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

  return (
    <ChatPresenceContext.Provider value={globalOnlineUserIds}>
      {createPortal(panel, document.body)}
      {captureEditFile ? (
        <ChatCaptureEditOverlay
          file={captureEditFile}
          onCancel={() => setCaptureEditFile(null)}
          onSend={(edited) => {
            setCaptureEditFile(null);
            sendCapturedPhotos([edited]);
          }}
        />
      ) : null}
      {phongHoc
        ? createPortal(
            <div
              className="cins-call-fullscreen"
              role="dialog"
              aria-label={t("chat.callTitle")}
              data-cins-call-active=""
            >
              <PhongHocMeeting
                authToken={phongHoc.token}
                mode={phongHoc.mode}
                title={phongHoc.title}
                roomId={active?.roomId}
                callMessageId={phongHoc.callMessageId}
                onClose={() => {
                  setPhongHoc(null);
                  callWindowSidRef.current = null;
                  setOutboundCallMessageId(null);
                  setPhongHocErr(null);
                }}
              />
            </div>,
            document.body,
          )
        : null}
    </ChatPresenceContext.Provider>
  );
}
