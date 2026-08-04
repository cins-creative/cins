import { avatarHueFromSeed, avatarInitialFromName } from "@/lib/chat/avatar";
import type { ChatThread } from "@/lib/chat/types";
import {
  isOrgQuanLyKind,
  type OrgQuanLyKind,
} from "@/lib/to-chuc/org-quan-ly-routes";

/** Thread thuộc «Tổ chức của tôi» (staff inbox / hub / lớp quản trị). */
export function isManagedOrgThread(thread: ChatThread): boolean {
  if (thread.isOrgStaffInbox) return true;
  const isManagedHubOrLop =
    Boolean(thread.viewerIsOrgMember) &&
    (Boolean(thread.isOrgHub) || Boolean(thread.lopHocId));
  return isManagedHubOrLop;
}

export type ToChucOrgInboxSummary = {
  count: number;
  unread: number;
  chuaTraLoi: number;
};

export type ToChucOrgNode = {
  orgId: string;
  orgSlug?: string;
  orgTen: string;
  orgKind?: ChatThread["orgKind"];
  /** Kind có route `/quan-ly` — hiện nút «Mở». */
  quanLyKind?: OrgQuanLyKind;
  avatarUrl?: string | null;
  avatarInitial: string;
  avatarHue: number;
  /** Tổng unread = inbox.unread + rooms unread. */
  unread: number;
  lastAt: string;
  /** Toàn bộ thread managed — giữ để search / realtime; không xổ inbox trong UI. */
  threads: ChatThread[];
  /** Hộp thư staff — chỉ hiện số trên item inbox layer-1 (không list từng thread). */
  inbox: ToChucOrgInboxSummary;
  /** Hub + phòng lớp — nest như project parent/child trong overlay. */
  rooms: ChatThread[];
  /**
   * Viewer là owner/admin org — hiện menu «Quản lý thông báo».
   * Suy từ `viewerOrgVaiTroLabel` / staff inbox membership.
   */
  canManageNotify?: boolean;
};

export type ToChucGroupedThreads = {
  /** Nhóm 1: user nhắn với org khác (không phải staff/managed). */
  nhanVoi: ChatThread[];
  /** Nhóm 2: org của viewer — gom theo orgId. */
  cuaToi: ToChucOrgNode[];
};

function compareLastAtDesc(a: string, b: string): number {
  return new Date(b).getTime() - new Date(a).getTime();
}

function emptyInbox(): ToChucOrgInboxSummary {
  return { count: 0, unread: 0, chuaTraLoi: 0 };
}

/** Logo org cho node — ưu tiên hub / orgAvatarUrl, không lấy avatar HV staff inbox. */
function resolveOrgNodeAvatar(thread: ChatThread): {
  url: string | null;
  initial: string;
  hue: number;
} | null {
  const orgTen =
    thread.orgTen?.trim() ||
    (thread.kind === "org" ? thread.name.trim() : "") ||
    null;
  const fromOrgField = thread.orgAvatarUrl?.trim() || null;
  const fromOrgKind =
    thread.kind === "org" && thread.avatarUrl?.trim()
      ? thread.avatarUrl.trim()
      : null;
  const url = fromOrgField || fromOrgKind;
  if (!url && !orgTen && !thread.orgId) return null;
  const seed = thread.orgId?.trim() || thread.id;
  return {
    url,
    initial: orgTen
      ? avatarInitialFromName(orgTen)
      : thread.kind === "org"
        ? thread.avatarInitial
        : avatarInitialFromName("Tổ chức"),
    hue:
      thread.kind === "org" && !fromOrgField
        ? thread.avatarHue
        : avatarHueFromSeed(seed),
  };
}

function applyOrgAvatarToNode(node: ToChucOrgNode, thread: ChatThread): void {
  const resolved = resolveOrgNodeAvatar(thread);
  if (!resolved) return;
  /* Hub / có URL: ghi đè placeholder chữ; không ghi đè URL đã có bằng null. */
  if (resolved.url) {
    if (!node.avatarUrl || thread.isOrgHub) {
      node.avatarUrl = resolved.url;
      node.avatarInitial = resolved.initial;
      node.avatarHue = resolved.hue;
    }
    return;
  }
  if (!node.avatarUrl) {
    node.avatarInitial = resolved.initial;
    node.avatarHue = resolved.hue;
  }
}

function pushThreadIntoNode(node: ToChucOrgNode, thread: ChatThread): void {
  node.threads.push(thread);
  node.unread += thread.unread;
  if (compareLastAtDesc(node.lastAt, thread.lastAt) > 0) {
    node.lastAt = thread.lastAt;
  }
  if (!node.orgSlug && thread.orgSlug) {
    node.orgSlug = thread.orgSlug;
  }
  if (!node.quanLyKind && isOrgQuanLyKind(thread.orgKind)) {
    node.quanLyKind = thread.orgKind;
    node.orgKind = thread.orgKind;
  }
  applyOrgAvatarToNode(node, thread);
  const label = thread.viewerOrgVaiTroLabel?.trim();
  if (label === "Sáng lập" || label === "Quản trị") {
    node.canManageNotify = true;
  }

  if (thread.isOrgStaffInbox) {
    node.inbox.count += 1;
    node.inbox.unread += thread.unread;
    if (thread.orgInboxStatus === "open") {
      node.inbox.chuaTraLoi += 1;
    }
    return;
  }

  node.rooms.push(thread);
}

/**
 * Gom thread tab Tổ chức thành 2 nhóm + OrgNode theo orgId.
 * Predicate «của tôi» khớp filter cũ `toChucFilter === "cua_toi"`.
 */
export function groupToChucThreads(
  threads: ChatThread[],
): ToChucGroupedThreads {
  const nhanVoi: ChatThread[] = [];
  const byOrg = new Map<string, ToChucOrgNode>();

  for (const thread of threads) {
    if (!isManagedOrgThread(thread)) {
      nhanVoi.push(thread);
      continue;
    }

    const orgId = thread.orgId?.trim();
    if (!orgId) {
      /* Staff/managed nhưng thiếu orgId — giữ như nhắn với (không gãy list). */
      nhanVoi.push(thread);
      continue;
    }

    let node = byOrg.get(orgId);
    if (!node) {
      const orgTen =
        thread.orgTen?.trim() ||
        (thread.kind === "org" ? thread.name.trim() : "") ||
        "Tổ chức";
      const quanLyKind = isOrgQuanLyKind(thread.orgKind)
        ? thread.orgKind
        : undefined;
      const avatar = resolveOrgNodeAvatar(thread);
      node = {
        orgId,
        orgSlug: thread.orgSlug,
        orgTen,
        orgKind: thread.orgKind,
        quanLyKind,
        avatarUrl: avatar?.url ?? null,
        avatarInitial: avatar?.initial ?? avatarInitialFromName(orgTen),
        avatarHue: avatar?.hue ?? avatarHueFromSeed(orgId),
        unread: 0,
        lastAt: thread.lastAt,
        threads: [],
        inbox: emptyInbox(),
        rooms: [],
      };
      byOrg.set(orgId, node);
    }

    pushThreadIntoNode(node, thread);
  }

  const cuaToi = [...byOrg.values()].sort((a, b) =>
    compareLastAtDesc(a.lastAt, b.lastAt),
  );
  for (const node of cuaToi) {
    node.threads.sort((a, b) => compareLastAtDesc(a.lastAt, b.lastAt));
    node.rooms.sort((a, b) => compareLastAtDesc(a.lastAt, b.lastAt));
  }
  nhanVoi.sort((a, b) => compareLastAtDesc(a.lastAt, b.lastAt));

  return { nhanVoi, cuaToi };
}
