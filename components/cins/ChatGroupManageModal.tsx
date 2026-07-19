"use client";

import {
  AlertTriangle,
  Archive,
  Check,
  ChevronDown,
  Copy,
  EyeOff,
  FolderKanban,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  Shield,
  User,
  UserMinus,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

import { ChatGroupAvatar } from "@/components/cins/ChatGroupAvatar";
import { avatarBg, avatarInitialFromName } from "@/lib/chat/avatar";
import { MAX_GROUP_MEMBERS } from "@/lib/chat/constants";
import {
  canKickGroupMember,
  canManageGroupChat,
  canManageGroupRoles,
  groupRoleLabel,
} from "@/lib/chat/group-roles";
import type {
  ChatGroupJoinRequest,
  ChatGroupMember,
  ChatGroupMemberAvatar,
  ChatGroupVaiTro,
  ChatThread,
} from "@/lib/chat/types";
import { isAllowedUploadImageFile } from "@/lib/files/infer-image-mime";
import { getAvatarUrl } from "@/lib/journey/profile";

type FriendRow = {
  id: string;
  slug: string;
  ten_hien_thi: string;
  avatar_id: string | null;
};

type ManageSection = "thong_tin" | "thanh_vien" | "project";

type ProjectRow = {
  roomId: string;
  name: string;
  trangThai: "active" | "an";
  lastAt: string;
  idle: boolean;
  memberCount: number;
  avatarUrl?: string | null;
};

function ProjectListMark({
  name,
  avatarUrl,
  muted = false,
  editable = false,
  onEditClick,
}: {
  name: string;
  avatarUrl?: string | null;
  muted?: boolean;
  editable?: boolean;
  onEditClick?: () => void;
}) {
  const content = avatarUrl ? (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={avatarUrl} alt="" />
    </>
  ) : (
    <span aria-hidden>#</span>
  );

  const className = `cins-chat-project-card-mark${avatarUrl ? " has-image" : " is-hash"}${muted ? " is-muted" : ""}`;

  if (editable && onEditClick) {
    return (
      <button
        type="button"
        className={className}
        title={`Đổi ảnh project · ${name}`}
        aria-label={`Đổi ảnh project ${name}`}
        onClick={(e) => {
          e.stopPropagation();
          onEditClick();
        }}
      >
        {content}
      </button>
    );
  }

  return (
    <span className={className} aria-hidden>
      {content}
    </span>
  );
}

type Props = {
  open: boolean;
  roomId: string;
  threadName: string;
  avatarUrl?: string | null;
  memberAvatars?: ChatGroupMemberAvatar[];
  /** false nếu đây đã là phòng project con. */
  canHaveProjects?: boolean;
  /** Nhóm cha — khi đang quản lý project con (để thêm thành viên ⊆ cha). */
  parentRoomId?: string | null;
  /** Tab mở khi modal mount (vd. «Tạo project» từ menu thread). */
  initialSection?: ManageSection;
  /** Mở luôn bước xác nhận xóa nhóm chính (vd. từ menu thread). */
  initialDeleteConfirm?: boolean;
  onClose: () => void;
  onThreadUpdated: (thread: ChatThread) => void;
  onLeaveGroup: () => void;
  onDeleteGroup?: () => void | Promise<void>;
  onOpenProject?: (thread: ChatThread) => void;
};

function MemberAvatar({
  name,
  avatarUrl,
  avatarId,
}: {
  name: string;
  avatarUrl?: string | null;
  avatarId?: string | null;
}) {
  const url = avatarUrl ?? getAvatarUrl(avatarId ?? null);
  const initial = avatarInitialFromName(name);

  return (
    <span
      className={`cins-chat-group-pick-avatar${url ? " has-image" : ""}`}
      style={{ background: url ? "transparent" : avatarBg(name.length * 17) }}
      aria-hidden
    >
      {url ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={url} alt="" />
      ) : (
        initial
      )}
    </span>
  );
}

function roleLabel(vaiTro: ChatGroupVaiTro): string {
  return groupRoleLabel(vaiTro);
}

export function ChatGroupManageModal({
  open,
  roomId,
  threadName,
  avatarUrl = null,
  memberAvatars = [],
  canHaveProjects = true,
  parentRoomId = null,
  initialSection = "thong_tin",
  initialDeleteConfirm = false,
  onClose,
  onThreadUpdated,
  onLeaveGroup,
  onDeleteGroup,
  onOpenProject,
}: Props) {
  const titleId = useId();
  const deleteTitleId = useId();
  const deleteNameInputId = useId();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const projectAvatarInputRef = useRef<HTMLInputElement>(null);
  const projectAvatarTargetRef = useRef<string | null>(null);
  const [section, setSection] = useState<ManageSection>(initialSection);
  const [members, setMembers] = useState<ChatGroupMember[]>([]);
  const [joinRequests, setJoinRequests] = useState<ChatGroupJoinRequest[]>([]);
  const [isGroupAdmin, setIsGroupAdmin] = useState(false);
  const [isGroupOwner, setIsGroupOwner] = useState(false);
  const [tenPhong, setTenPhong] = useState("");
  const [nameDraft, setNameDraft] = useState("");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [projectName, setProjectName] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [friendQuery, setFriendQuery] = useState("");
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [addFriendsOpen, setAddFriendsOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteNameDraft, setDeleteNameDraft] = useState("");
  const [pending, startTransition] = useTransition();

  const mosaicMembers = useMemo(() => {
    if (memberAvatars.length > 0) return memberAvatars;
    return members.map((m) => ({
      userId: m.userId,
      initial: avatarInitialFromName(m.tenHienThi),
      hue: m.tenHienThi.length * 17,
      avatarUrl: m.avatarUrl,
      slug: m.slug,
      name: m.tenHienThi,
    }));
  }, [memberAvatars, members]);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/chat/rooms/${roomId}/members`, {
        cache: "no-store",
      });
      const json = (await res.json().catch(() => null)) as {
        members?: ChatGroupMember[];
        isGroupAdmin?: boolean;
        isGroupOwner?: boolean;
        tenPhong?: string | null;
        error?: string;
      } | null;
      if (!res.ok) {
        setError(json?.error ?? "Không tải được thành viên.");
        setMembers([]);
        return;
      }
      setMembers(json?.members ?? []);
      const canManage = Boolean(json?.isGroupAdmin);
      const owner = Boolean(json?.isGroupOwner);
      setIsGroupAdmin(canManage);
      setIsGroupOwner(owner);
      const name = json?.tenPhong?.trim() ?? "";
      setTenPhong(name);
      setNameDraft(name);

      if (canManage) {
        const [inviteRes, reqRes] = await Promise.all([
          fetch(`/api/chat/rooms/${roomId}/invite`, { cache: "no-store" }),
          fetch(`/api/chat/rooms/${roomId}/join-requests`, {
            cache: "no-store",
          }),
        ]);
        const inviteJson = (await inviteRes.json().catch(() => null)) as {
          inviteUrl?: string;
          error?: string;
        } | null;
        if (inviteRes.ok && inviteJson?.inviteUrl) {
          const url = inviteJson.inviteUrl;
          try {
            const parsed = new URL(url);
            parsed.protocol = window.location.protocol;
            parsed.host = window.location.host;
            setInviteUrl(parsed.toString());
          } catch {
            setInviteUrl(url);
          }
        } else {
          setInviteUrl(null);
          setError(
            inviteJson?.error ??
              "Không tạo được link mời. Thử nút làm mới bên cạnh.",
          );
        }
        const reqJson = (await reqRes.json().catch(() => null)) as {
          requests?: ChatGroupJoinRequest[];
        } | null;
        if (reqRes.ok) {
          setJoinRequests(reqJson?.requests ?? []);
        }
      } else {
        setInviteUrl(null);
        setJoinRequests([]);
      }
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  const loadProjects = useCallback(async () => {
    if (!canHaveProjects) {
      setProjects([]);
      return;
    }
    const res = await fetch(`/api/chat/rooms/${roomId}/projects`, {
      cache: "no-store",
    });
    const json = (await res.json().catch(() => null)) as {
      projects?: ProjectRow[];
    } | null;
    if (res.ok) {
      setProjects(json?.projects ?? []);
    }
  }, [canHaveProjects, roomId]);

  useEffect(() => {
    if (!open) return;
    const nextSection =
      initialSection === "project" && !canHaveProjects
        ? "thong_tin"
        : initialSection;
    setSection(nextSection);
    setFriendQuery("");
    setAddFriendsOpen(false);
    setCopied(false);
    setError(null);
    setProjectName("");
    setShowHistory(false);
    void loadMembers();
    void loadProjects();
  }, [open, loadMembers, loadProjects, initialSection, canHaveProjects]);

  useEffect(() => {
    if (!open) {
      setDeleteConfirmOpen(false);
      setDeleteNameDraft("");
      return;
    }
    if (initialDeleteConfirm && canHaveProjects) {
      setDeleteConfirmOpen(true);
      setDeleteNameDraft("");
    }
  }, [open, roomId, initialDeleteConfirm, canHaveProjects]);

  useEffect(() => {
    if (section !== "thanh_vien") setAddFriendsOpen(false);
  }, [section]);

  useEffect(() => {
    if (!open || !isGroupAdmin) return;
    setLoadingFriends(true);
    void (async () => {
      try {
        if (parentRoomId) {
          const res = await fetch(`/api/chat/rooms/${parentRoomId}/members`, {
            cache: "no-store",
          });
          if (!res.ok) throw new Error("Không tải được thành viên nhóm cha.");
          const json = (await res.json()) as {
            members?: Array<{
              userId: string;
              tenHienThi: string;
              slug: string;
              avatarId?: string | null;
            }>;
          };
          setFriends(
            (json.members ?? []).map((m) => ({
              id: m.userId,
              ten_hien_thi: m.tenHienThi,
              slug: m.slug,
              avatar_id: m.avatarId ?? null,
            })),
          );
        } else {
          const res = await fetch("/api/users/search?friends_only=true", {
            cache: "no-store",
          });
          if (!res.ok) throw new Error("Không tải được danh sách bạn bè.");
          const json = (await res.json()) as { users?: FriendRow[] };
          setFriends(json.users ?? []);
        }
      } catch (e) {
        setFriends([]);
        setError(
          e instanceof Error
            ? e.message
            : parentRoomId
              ? "Không tải được thành viên nhóm cha."
              : "Không tải được danh sách bạn bè.",
        );
      } finally {
        setLoadingFriends(false);
      }
    })();
  }, [open, isGroupAdmin, parentRoomId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (deleteConfirmOpen) {
        e.preventDefault();
        setDeleteConfirmOpen(false);
        setDeleteNameDraft("");
        return;
      }
      onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, deleteConfirmOpen]);

  const memberIdSet = useMemo(
    () => new Set(members.map((m) => m.userId)),
    [members],
  );

  const addableFriends = useMemo(() => {
    const q = friendQuery.trim().toLowerCase();
    return friends
      .filter((f) => !memberIdSet.has(f.id))
      .filter(
        (f) =>
          !q ||
          f.ten_hien_thi.toLowerCase().includes(q) ||
          f.slug.toLowerCase().includes(q),
      );
  }, [friendQuery, friends, memberIdSet]);

  const viewerRole: ChatGroupVaiTro = isGroupOwner
    ? "owner"
    : isGroupAdmin
      ? "admin"
      : "thanh_vien";
  const canManage = canManageGroupChat(viewerRole);
  const canRoles = canManageGroupRoles(viewerRole);
  const canAddMore = members.length < MAX_GROUP_MEMBERS;
  const nameDirty = nameDraft.trim() !== tenPhong.trim();
  const displayAvatarUrl =
    (typeof avatarUrl === "string" ? avatarUrl : null) ?? null;

  const applyThread = useCallback(
    (thread: ChatThread, nextMembers?: ChatGroupMember[]) => {
      onThreadUpdated(thread);
      if (nextMembers) setMembers(nextMembers);
      setIsGroupAdmin(Boolean(thread.isGroupAdmin));
      setIsGroupOwner(Boolean(thread.isGroupOwner));
    },
    [onThreadUpdated],
  );

  const saveName = useCallback(() => {
    if (!isGroupAdmin || !nameDirty || pending) return;
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/chat/rooms/${roomId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenPhong: nameDraft.trim() || null }),
      });
      const json = (await res.json().catch(() => null)) as {
        thread?: ChatThread;
        error?: string;
      } | null;
      if (!res.ok || !json?.thread) {
        setError(json?.error ?? "Không lưu được tên nhóm.");
        return;
      }
      setTenPhong(nameDraft.trim());
      onThreadUpdated(json.thread);
    });
  }, [
    isGroupAdmin,
    nameDirty,
    nameDraft,
    onThreadUpdated,
    pending,
    roomId,
  ]);

  const handleAvatarFile = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file || !isGroupAdmin) return;
      if (!isAllowedUploadImageFile(file)) {
        setError("Chỉ nhận ảnh JPEG, PNG, WebP hoặc GIF.");
        return;
      }

      setUploadingAvatar(true);
      setError(null);
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
        onThreadUpdated(patchJson.thread);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Không đổi được ảnh nhóm.");
      } finally {
        setUploadingAvatar(false);
      }
    },
    [isGroupAdmin, onThreadUpdated, roomId],
  );

  const clearAvatar = useCallback(() => {
    if (!isGroupAdmin || pending) return;
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/chat/rooms/${roomId}/avatar`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarId: null }),
      });
      const json = (await res.json().catch(() => null)) as {
        thread?: ChatThread;
        error?: string;
      } | null;
      if (!res.ok || !json?.thread) {
        setError(json?.error ?? "Không gỡ được ảnh nhóm.");
        return;
      }
      onThreadUpdated(json.thread);
    });
  }, [isGroupAdmin, onThreadUpdated, pending, roomId]);

  const pickProjectAvatar = useCallback((projectRoomId: string) => {
    if (!isGroupAdmin || pending) return;
    projectAvatarTargetRef.current = projectRoomId;
    projectAvatarInputRef.current?.click();
  }, [isGroupAdmin, pending]);

  const handleProjectAvatarFile = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      const targetRoomId = projectAvatarTargetRef.current;
      projectAvatarTargetRef.current = null;
      if (!file || !isGroupAdmin || !targetRoomId) return;
      if (!isAllowedUploadImageFile(file)) {
        setError("Chỉ nhận ảnh JPEG, PNG, WebP hoặc GIF.");
        return;
      }

      setUploadingAvatar(true);
      setError(null);
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

        const patchRes = await fetch(`/api/chat/rooms/${targetRoomId}/avatar`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ avatarId: uploadJson.imageId }),
        });
        const patchJson = (await patchRes.json()) as {
          thread?: ChatThread;
          error?: string;
        };
        if (!patchRes.ok || !patchJson.thread) {
          throw new Error(patchJson.error ?? "Không lưu được ảnh project.");
        }
        const nextUrl = patchJson.thread.avatarUrl ?? null;
        setProjects((prev) =>
          prev.map((p) =>
            p.roomId === targetRoomId ? { ...p, avatarUrl: nextUrl } : p,
          ),
        );
        onThreadUpdated(patchJson.thread);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Không đổi được ảnh project.");
      } finally {
        setUploadingAvatar(false);
      }
    },
    [isGroupAdmin, onThreadUpdated],
  );

  const copyInvite = useCallback(async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Không sao chép được link. Hãy chọn và copy thủ công.");
    }
  }, [inviteUrl]);

  const rotateInvite = useCallback(() => {
    if (!isGroupAdmin || pending) return;
    if (
      inviteUrl &&
      !window.confirm("Tạo link mới? Link cũ sẽ không còn dùng được.")
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/chat/rooms/${roomId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rotate: Boolean(inviteUrl) }),
      });
      const json = (await res.json().catch(() => null)) as {
        inviteUrl?: string;
        error?: string;
      } | null;
      if (!res.ok || !json?.inviteUrl) {
        setError(json?.error ?? "Không tạo được link mới.");
        return;
      }
      try {
        const parsed = new URL(json.inviteUrl);
        parsed.protocol = window.location.protocol;
        parsed.host = window.location.host;
        setInviteUrl(parsed.toString());
      } catch {
        setInviteUrl(json.inviteUrl);
      }
      setCopied(false);
    });
  }, [inviteUrl, isGroupAdmin, pending, roomId]);

  const respondRequest = useCallback(
    (request: ChatGroupJoinRequest, action: "approve" | "reject") => {
      if (!isGroupAdmin || pending) return;
      setError(null);
      startTransition(async () => {
        const res = await fetch(`/api/chat/rooms/${roomId}/join-requests`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ requestId: request.id, action }),
        });
        const json = (await res.json().catch(() => null)) as {
          thread?: ChatThread;
          members?: ChatGroupMember[];
          requests?: ChatGroupJoinRequest[];
          error?: string;
        } | null;
        if (!res.ok || !json?.thread) {
          setError(json?.error ?? "Không xử lý được yêu cầu.");
          return;
        }
        applyThread(json.thread, json.members);
        setJoinRequests(json.requests ?? []);
      });
    },
    [applyThread, isGroupAdmin, pending, roomId],
  );

  const addFriend = useCallback(
    (friend: FriendRow) => {
      if (!isGroupAdmin || !canAddMore || pending) return;
      setError(null);
      startTransition(async () => {
        const res = await fetch(`/api/chat/rooms/${roomId}/members`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userIds: [friend.id] }),
        });
        const json = (await res.json().catch(() => null)) as {
          thread?: ChatThread;
          members?: ChatGroupMember[];
          error?: string;
        } | null;
        if (!res.ok || !json?.thread) {
          setError(json?.error ?? "Không thêm được thành viên.");
          return;
        }
        applyThread(json.thread, json.members);
        setFriendQuery("");
      });
    },
    [applyThread, canAddMore, isGroupAdmin, pending, roomId],
  );

  const kickMember = useCallback(
    (member: ChatGroupMember) => {
      if (!canManageGroupChat(viewerRole) || member.isViewer || pending) return;
      if (!canKickGroupMember(viewerRole, member.vaiTro)) return;
      if (
        !window.confirm(
          `Xóa ${member.tenHienThi} khỏi nhóm? Người này sẽ không còn nhận tin nhắn.`,
        )
      ) {
        return;
      }
      setError(null);
      startTransition(async () => {
        const res = await fetch(
          `/api/chat/rooms/${roomId}/members/${member.userId}`,
          { method: "DELETE" },
        );
        const json = (await res.json().catch(() => null)) as {
          thread?: ChatThread;
          members?: ChatGroupMember[];
          error?: string;
        } | null;
        if (!res.ok || !json?.thread) {
          setError(json?.error ?? "Không xóa được thành viên.");
          return;
        }
        applyThread(json.thread, json.members);
      });
    },
    [applyThread, pending, roomId, viewerRole],
  );

  const setRole = useCallback(
    (member: ChatGroupMember, vaiTro: ChatGroupVaiTro) => {
      if (!canManageGroupRoles(viewerRole) || pending || member.vaiTro === vaiTro) {
        return;
      }
      if (member.vaiTro === "owner" || member.isViewer) return;
      setError(null);
      startTransition(async () => {
        const res = await fetch(
          `/api/chat/rooms/${roomId}/members/${member.userId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ vaiTro }),
          },
        );
        const json = (await res.json().catch(() => null)) as {
          thread?: ChatThread;
          members?: ChatGroupMember[];
          error?: string;
        } | null;
        if (!res.ok || !json?.thread) {
          setError(json?.error ?? "Không đổi được vai trò.");
          return;
        }
        applyThread(json.thread, json.members);
      });
    },
    [applyThread, pending, roomId, viewerRole],
  );

  const createProject = useCallback(() => {
    if (!isGroupAdmin || !canHaveProjects || pending) return;
    const ten = projectName.trim();
    if (!ten) return;
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/chat/rooms/${roomId}/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ten_phong: ten }),
      });
      const json = (await res.json().catch(() => null)) as {
        thread?: ChatThread;
        error?: string;
      } | null;
      if (!res.ok || !json?.thread) {
        setError(json?.error ?? "Không tạo được project.");
        return;
      }
      setProjectName("");
      await loadProjects();
      onThreadUpdated(json.thread);
      onOpenProject?.(json.thread);
    });
  }, [
    canHaveProjects,
    isGroupAdmin,
    loadProjects,
    onOpenProject,
    onThreadUpdated,
    pending,
    projectName,
    roomId,
  ]);

  const setProjectVisibility = useCallback(
    (project: ProjectRow, trangThai: "active" | "an") => {
      if (!isGroupAdmin || pending) return;
      setError(null);
      startTransition(async () => {
        const res = await fetch(
          `/api/chat/rooms/${project.roomId}/visibility`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ trang_thai: trangThai }),
          },
        );
        const json = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        if (!res.ok) {
          setError(json?.error ?? "Không cập nhật được project.");
          return;
        }
        await loadProjects();
      });
    },
    [isGroupAdmin, loadProjects, pending],
  );

  const activeProjects = useMemo(
    () => projects.filter((p) => p.trangThai === "active"),
    [projects],
  );
  const hiddenProjects = useMemo(
    () => projects.filter((p) => p.trangThai === "an"),
    [projects],
  );

  const deleteExpectedName = (tenPhong.trim() || threadName.trim());
  const deleteNameMatches =
    deleteExpectedName.length > 0 &&
    deleteNameDraft.trim() === deleteExpectedName;

  const openDeleteConfirm = () => {
    if (!onDeleteGroup || pending) return;
    if (canHaveProjects) {
      setDeleteNameDraft("");
      setDeleteConfirmOpen(true);
      return;
    }
    onDeleteGroup();
  };

  const confirmDeleteGroup = () => {
    if (!onDeleteGroup || pending || !deleteNameMatches) return;
    startTransition(async () => {
      await onDeleteGroup();
    });
  };

  if (!open) return null;

  return (
    <div className="cins-chat-group-modal-root" role="presentation">
      <button
        type="button"
        className="cins-chat-group-modal-backdrop"
        aria-label="Đóng"
        onClick={onClose}
      />
      <div
        className="cins-chat-group-manage-modal cins-chat-group-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="cins-chat-group-modal-head">
          <span className="cins-chat-group-modal-icon" aria-hidden>
            <Settings2 size={18} strokeWidth={1.8} />
          </span>
          <div>
            <h3 id={titleId}>Quản lý nhóm</h3>
            <p>{threadName}</p>
          </div>
          <button
            type="button"
            className="cins-chat-icon-btn"
            aria-label="Đóng"
            onClick={onClose}
          >
            <X size={18} strokeWidth={2} />
          </button>
        </header>

        <nav className="cins-chat-group-manage-nav" aria-label="Mục quản lý">
          <button
            type="button"
            className={section === "thong_tin" ? "is-active" : undefined}
            onClick={() => setSection("thong_tin")}
          >
            Thông tin
          </button>
          <button
            type="button"
            className={section === "thanh_vien" ? "is-active" : undefined}
            onClick={() => setSection("thanh_vien")}
          >
            <Users size={14} strokeWidth={2.1} aria-hidden />
            Thành viên ({members.length}
            {joinRequests.length > 0 ? ` · ${joinRequests.length} chờ` : ""})
          </button>
          {canHaveProjects ? (
            <button
              type="button"
              className={section === "project" ? "is-active" : undefined}
              onClick={() => setSection("project")}
            >
              Project ({activeProjects.length})
            </button>
          ) : null}
        </nav>

        {error ? <p className="cins-chat-group-error">{error}</p> : null}

        {section === "thong_tin" ? (
          <div className="cins-chat-group-manage-body">
            <div className="cins-chat-group-manage-avatar-block">
              <ChatGroupAvatar
                size={72}
                avatarUrl={displayAvatarUrl}
                members={mosaicMembers}
                editable={isGroupAdmin}
                uploading={uploadingAvatar}
                onEditClick={() => avatarInputRef.current?.click()}
              />
              <div className="cins-chat-group-manage-avatar-copy">
                <strong>Ảnh nhóm</strong>
                {isGroupAdmin ? (
                  <div className="cins-chat-group-manage-avatar-actions">
                    <button
                      type="button"
                      className="cins-chat-group-cancel"
                      disabled={uploadingAvatar || pending}
                      onClick={() => avatarInputRef.current?.click()}
                    >
                      {uploadingAvatar ? "Đang tải…" : "Đổi ảnh"}
                    </button>
                    {displayAvatarUrl ? (
                      <button
                        type="button"
                        className="cins-chat-group-cancel"
                        disabled={uploadingAvatar || pending}
                        onClick={clearAvatar}
                      >
                        Dùng mosaic
                      </button>
                    ) : null}
                  </div>
                ) : (
                  <p className="cins-chat-group-manage-hint">
                    Chỉ chủ nhóm hoặc admin mới đổi được ảnh.
                  </p>
                )}
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="cins-chat-sr-only"
                tabIndex={-1}
                aria-hidden
                onChange={(e) => void handleAvatarFile(e)}
              />
            </div>

            <div className="cins-chat-group-name">
              <span>Tên nhóm</span>
              <div className="cins-chat-group-name-row">
                <input
                  type="text"
                  value={nameDraft}
                  maxLength={80}
                  disabled={!isGroupAdmin || pending}
                  placeholder="Để trống = tên từ thành viên"
                  aria-label="Tên nhóm"
                  onChange={(e) => setNameDraft(e.target.value)}
                />
                {isGroupAdmin ? (
                  <button
                    type="button"
                    className="cins-chat-group-submit"
                    disabled={!nameDirty || pending}
                    onClick={saveName}
                  >
                    {pending ? <Loader2 size={14} className="spin" /> : null}
                    Lưu
                  </button>
                ) : null}
              </div>
              {!isGroupAdmin ? (
                <p className="cins-chat-group-manage-hint is-inline">
                  Chỉ chủ nhóm hoặc admin mới đổi được tên.
                </p>
              ) : null}
            </div>

            {isGroupAdmin ? (
              <div className="cins-chat-group-manage-invite">
                <p className="cins-chat-group-manage-add-title">
                  Link xin gia nhập
                </p>
                <p className="cins-chat-group-manage-hint">
                  Gửi cho bạn bè của thành viên nhóm. Họ mở link rồi bấm xin
                  gia nhập — bạn duyệt trong tab Thành viên.
                </p>
                <div className="cins-chat-group-manage-invite-row">
                  <input
                    type="text"
                    readOnly
                    value={
                      inviteUrl ??
                      (loading ? "Đang tạo link…" : "Chưa có link — bấm làm mới")
                    }
                    aria-label="Link mời nhóm"
                    onFocus={(e) => e.currentTarget.select()}
                  />
                  <button
                    type="button"
                    className="cins-chat-icon-btn"
                    title="Sao chép"
                    aria-label="Sao chép link mời"
                    disabled={!inviteUrl || pending}
                    onClick={() => void copyInvite()}
                  >
                    {copied ? (
                      <Check size={15} strokeWidth={2.2} />
                    ) : (
                      <Copy size={15} strokeWidth={2.1} />
                    )}
                  </button>
                  <button
                    type="button"
                    className="cins-chat-icon-btn"
                    title={inviteUrl ? "Tạo link mới" : "Tạo link mời"}
                    aria-label={inviteUrl ? "Tạo link mời mới" : "Tạo link mời"}
                    disabled={pending}
                    onClick={rotateInvite}
                  >
                    <RefreshCw size={15} strokeWidth={2.1} />
                  </button>
                </div>
              </div>
            ) : null}

            <div className="cins-chat-group-manage-danger">
              <button
                type="button"
                className="cins-chat-group-cancel"
                disabled={pending}
                onClick={onLeaveGroup}
              >
                Rời nhóm
              </button>
              {isGroupOwner && onDeleteGroup ? (
                <button
                  type="button"
                  className="cins-chat-group-danger"
                  disabled={pending}
                  onClick={openDeleteConfirm}
                >
                  Xóa nhóm chat
                </button>
              ) : null}
            </div>
          </div>
        ) : section === "project" && canHaveProjects ? (
          <div className="cins-chat-group-manage-body is-projects">
            <div className="cins-chat-project-intro">
              <span className="cins-chat-project-intro-icon" aria-hidden>
                <FolderKanban size={18} strokeWidth={1.9} />
              </span>
              <div>
                <strong>Kênh theo project</strong>
                <p>
                  Chỉ chủ/admin tạo và thêm thành viên. Ai chưa được thêm sẽ
                  không thấy project. Project im lâu có thể ẩn và lấy lại trong
                  lịch sử.
                </p>
              </div>
            </div>

            {isGroupAdmin ? (
              <div className="cins-chat-project-create">
                <label className="cins-chat-project-create-label" htmlFor="cins-chat-project-name">
                  Tạo project mới
                </label>
                <div className="cins-chat-project-create-row">
                  <input
                    id="cins-chat-project-name"
                    type="text"
                    value={projectName}
                    maxLength={80}
                    disabled={pending}
                    placeholder="VD. Spot TVC tháng 8"
                    aria-label="Tên project"
                    autoFocus
                    onChange={(e) => setProjectName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        createProject();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="cins-chat-project-create-btn"
                    disabled={pending || !projectName.trim()}
                    onClick={createProject}
                  >
                    {pending ? (
                      <Loader2 size={15} className="spin" aria-hidden />
                    ) : (
                      <Plus size={15} strokeWidth={2.2} aria-hidden />
                    )}
                    Tạo
                  </button>
                </div>
              </div>
            ) : (
              <p className="cins-chat-project-locked">
                Chỉ chủ nhóm hoặc admin mới tạo được project.
              </p>
            )}

            {isGroupAdmin ? (
              <input
                ref={projectAvatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="cins-chat-sr-only"
                tabIndex={-1}
                aria-hidden
                onChange={(e) => void handleProjectAvatarFile(e)}
              />
            ) : null}

            <div className="cins-chat-project-section">
              <div className="cins-chat-project-section-head">
                <span>Đang mở</span>
                <em>{activeProjects.length}</em>
              </div>

              {activeProjects.length > 0 ? (
                <ul className="cins-chat-project-list" role="list">
                  {activeProjects.map((project) => (
                    <li key={project.roomId} className="cins-chat-project-card">
                      <div className="cins-chat-project-card-main">
                        <ProjectListMark
                          name={project.name}
                          avatarUrl={project.avatarUrl}
                          editable={isGroupAdmin && !pending && !uploadingAvatar}
                          onEditClick={() => pickProjectAvatar(project.roomId)}
                        />
                        <div className="cins-chat-project-card-meta">
                          <strong>{project.name}</strong>
                          <span>
                            {project.memberCount} thành viên
                            {project.idle ? (
                              <em className="cins-chat-project-idle">Im lâu</em>
                            ) : null}
                          </span>
                        </div>
                      </div>
                      {isGroupAdmin ? (
                        <button
                          type="button"
                          className="cins-chat-project-action"
                          disabled={pending}
                          title="Ẩn khỏi danh sách chat"
                          onClick={() => setProjectVisibility(project, "an")}
                        >
                          <EyeOff size={14} strokeWidth={2} aria-hidden />
                          Ẩn
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            <div className="cins-chat-project-history">
              <button
                type="button"
                className={`cins-chat-project-history-toggle${showHistory ? " is-open" : ""}`}
                aria-expanded={showHistory}
                onClick={() => setShowHistory((v) => !v)}
              >
                <Archive size={15} strokeWidth={1.9} aria-hidden />
                <span>Lịch sử đã ẩn</span>
                <em>{hiddenProjects.length}</em>
                <ChevronDown size={15} strokeWidth={2} aria-hidden />
              </button>

              {showHistory ? (
                hiddenProjects.length === 0 ? (
                  <p className="cins-chat-project-history-empty">
                    Chưa có project đã ẩn.
                  </p>
                ) : (
                  <ul className="cins-chat-project-list is-archived" role="list">
                    {hiddenProjects.map((project) => (
                      <li
                        key={project.roomId}
                        className="cins-chat-project-card is-archived"
                      >
                        <div className="cins-chat-project-card-main">
                          <ProjectListMark
                            name={project.name}
                            avatarUrl={project.avatarUrl}
                            muted
                            editable={isGroupAdmin && !pending && !uploadingAvatar}
                            onEditClick={() => pickProjectAvatar(project.roomId)}
                          />
                          <div className="cins-chat-project-card-meta">
                            <strong>{project.name}</strong>
                            <span>Ẩn khỏi danh sách chat</span>
                          </div>
                        </div>
                        {isGroupAdmin ? (
                          <button
                            type="button"
                            className="cins-chat-project-action is-primary"
                            disabled={pending}
                            onClick={() =>
                              setProjectVisibility(project, "active")
                            }
                          >
                            Khôi phục
                          </button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )
              ) : null}
            </div>
          </div>
        ) : (
          <div className="cins-chat-group-manage-body is-members">
            {addFriendsOpen && isGroupAdmin ? (
              <div className="cins-chat-group-manage-add is-panel">
                <header className="cins-chat-group-manage-add-head">
                  <div>
                    <h4>Thêm thành viên</h4>
                    <p>
                      {!canAddMore
                        ? `Đã đủ ${MAX_GROUP_MEMBERS} người`
                        : `Còn ${MAX_GROUP_MEMBERS - members.length} chỗ`}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="cins-chat-icon-btn"
                    aria-label="Đóng tìm bạn"
                    onClick={() => {
                      setAddFriendsOpen(false);
                      setFriendQuery("");
                    }}
                  >
                    <X size={18} strokeWidth={2} />
                  </button>
                </header>
                <label className="cins-chat-group-name cins-chat-group-search">
                  <span className="cins-chat-sr-only">Tìm bạn bè</span>
                  <span className="cins-chat-group-search-wrap">
                    <Search size={14} strokeWidth={2.1} aria-hidden />
                    <input
                      type="search"
                      value={friendQuery}
                      disabled={!canAddMore || pending}
                      placeholder="Tìm theo tên hoặc slug…"
                      autoFocus
                      onChange={(e) => setFriendQuery(e.target.value)}
                    />
                  </span>
                </label>
                <div className="cins-chat-group-list cins-chat-group-manage-add-list">
                  {loadingFriends ? (
                    <p className="cins-chat-group-list-empty">
                      <Loader2 size={16} className="spin" />{" "}
                      {parentRoomId
                        ? "Đang tải thành viên nhóm cha…"
                        : "Đang tải bạn bè…"}
                    </p>
                  ) : addableFriends.length === 0 ? (
                    <p className="cins-chat-group-list-empty">
                      {!canAddMore
                        ? "Nhóm đã đủ thành viên."
                        : parentRoomId
                          ? "Không còn thành viên nhóm cha để thêm."
                          : "Không còn bạn bè nào để thêm."}
                    </p>
                  ) : (
                    <ul role="list">
                      {addableFriends.slice(0, 40).map((friend) => {
                        const name =
                          friend.ten_hien_thi?.trim() || friend.slug;
                        return (
                          <li key={friend.id}>
                            <button
                              type="button"
                              className="cins-chat-group-pick"
                              disabled={!canAddMore || pending}
                              onClick={() => addFriend(friend)}
                            >
                              <MemberAvatar
                                name={name}
                                avatarId={friend.avatar_id}
                              />
                              <span className="cins-chat-group-pick-label">
                                {name}
                              </span>
                              <span className="cins-chat-group-pick-check">
                                +
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            ) : (
              <div className="cins-chat-group-manage-scroll">
                <div className="cins-chat-group-manage-section-head">
                  <p className="cins-chat-group-manage-section-title">
                    Trong nhóm ({members.length})
                  </p>
                  {isGroupAdmin ? (
                    <button
                      type="button"
                      className="cins-chat-icon-btn"
                      title="Thêm thành viên"
                      aria-label="Thêm thành viên"
                      disabled={!canAddMore}
                      onClick={() => setAddFriendsOpen(true)}
                    >
                      <UserPlus size={16} strokeWidth={2.1} />
                    </button>
                  ) : null}
                </div>
                {isGroupAdmin && joinRequests.length > 0 ? (
                  <div className="cins-chat-group-manage-requests">
                    <p className="cins-chat-group-manage-add-title">
                      Yêu cầu xin gia nhập ({joinRequests.length})
                    </p>
                    <ul className="cins-chat-group-manage-list" role="list">
                      {joinRequests.map((req) => (
                        <li key={req.id} className="cins-chat-group-manage-row">
                          <MemberAvatar
                            name={req.tenHienThi}
                            avatarUrl={req.avatarUrl}
                            avatarId={req.avatarId}
                          />
                          <div className="cins-chat-group-manage-meta">
                            <span className="cins-chat-group-manage-name">
                              {req.tenHienThi}
                            </span>
                            <span className="cins-chat-group-manage-role">
                              @{req.slug}
                            </span>
                          </div>
                          <div className="cins-chat-group-manage-row-actions">
                            <button
                              type="button"
                              className="cins-chat-group-submit"
                              disabled={pending}
                              onClick={() => respondRequest(req, "approve")}
                            >
                              Duyệt
                            </button>
                            <button
                              type="button"
                              className="cins-chat-group-cancel"
                              disabled={pending}
                              onClick={() => respondRequest(req, "reject")}
                            >
                              Từ chối
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {loading ? (
                  <p className="cins-chat-group-list-empty">
                    <Loader2 size={16} className="spin" /> Đang tải…
                  </p>
                ) : (
                  <ul className="cins-chat-group-manage-list" role="list">
                    {members.map((member) => (
                      <li
                        key={member.userId}
                        className="cins-chat-group-manage-row"
                      >
                        <MemberAvatar
                          name={member.tenHienThi}
                          avatarUrl={member.avatarUrl}
                          avatarId={member.avatarId}
                        />
                        <div className="cins-chat-group-manage-meta">
                          <span className="cins-chat-group-manage-name">
                            {member.tenHienThi}
                            {member.isViewer ? " (bạn)" : null}
                          </span>
                          <span className="cins-chat-group-manage-role">
                            {roleLabel(member.vaiTro)}
                          </span>
                        </div>
                        {canManage && !member.isViewer ? (
                          <div className="cins-chat-group-manage-row-actions">
                            {canRoles && member.vaiTro !== "owner" ? (
                              member.vaiTro === "admin" ? (
                                <button
                                  type="button"
                                  className="cins-chat-icon-btn is-role-admin"
                                  title="Hạ thành thành viên"
                                  aria-label={`Hạ quyền admin của ${member.tenHienThi}`}
                                  disabled={pending}
                                  onClick={() => setRole(member, "thanh_vien")}
                                >
                                  <Shield size={15} strokeWidth={2.2} fill="currentColor" />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="cins-chat-icon-btn is-role-member"
                                  title="Thăng admin"
                                  aria-label={`Thăng ${member.tenHienThi} làm admin`}
                                  disabled={pending}
                                  onClick={() => setRole(member, "admin")}
                                >
                                  <User size={15} strokeWidth={2.1} />
                                </button>
                              )
                            ) : null}
                            {canKickGroupMember(viewerRole, member.vaiTro) ? (
                              <button
                                type="button"
                                className="cins-chat-icon-btn is-danger"
                                title="Xóa khỏi nhóm"
                                aria-label={`Xóa ${member.tenHienThi} khỏi nhóm`}
                                disabled={pending}
                                onClick={() => kickMember(member)}
                              >
                                <UserMinus size={15} strokeWidth={2.1} />
                              </button>
                            ) : null}
                          </div>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}

        {deleteConfirmOpen ? (
          <div
            className="cins-chat-group-delete-confirm"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={deleteTitleId}
            aria-describedby={`${deleteTitleId}-desc`}
          >
            <span className="cins-chat-group-delete-confirm-icon" aria-hidden>
              <AlertTriangle size={22} strokeWidth={2} />
            </span>
            <h4 id={deleteTitleId}>Xóa nhóm chat vĩnh viễn?</h4>
            <p id={`${deleteTitleId}-desc`}>
              Không thể khôi phục. Mọi tin nhắn, project và thành viên trong
              nhóm <strong>{deleteExpectedName || threadName}</strong> sẽ mất
              hết.
            </p>
            <label
              className="cins-chat-group-delete-confirm-label"
              htmlFor={deleteNameInputId}
            >
              Nhập đúng tên nhóm để xác nhận
            </label>
            <input
              id={deleteNameInputId}
              type="text"
              autoFocus
              autoComplete="off"
              spellCheck={false}
              disabled={pending}
              placeholder={deleteExpectedName || "Tên nhóm"}
              value={deleteNameDraft}
              onChange={(e) => setDeleteNameDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  confirmDeleteGroup();
                }
              }}
            />
            <div className="cins-chat-group-delete-confirm-actions">
              <button
                type="button"
                className="cins-chat-group-cancel"
                disabled={pending}
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  setDeleteNameDraft("");
                }}
              >
                Hủy
              </button>
              <button
                type="button"
                className="cins-chat-group-danger is-solid"
                disabled={pending || !deleteNameMatches}
                onClick={confirmDeleteGroup}
              >
                {pending ? "Đang xóa…" : "Xóa vĩnh viễn"}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
