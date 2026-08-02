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
  unread: number;
  lastAt: string;
  threads: ChatThread[];
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

    const existing = byOrg.get(orgId);
    if (!existing) {
      const orgTen =
        thread.orgTen?.trim() ||
        (thread.kind === "org" ? thread.name.trim() : "") ||
        "Tổ chức";
      const quanLyKind = isOrgQuanLyKind(thread.orgKind)
        ? thread.orgKind
        : undefined;
      byOrg.set(orgId, {
        orgId,
        orgSlug: thread.orgSlug,
        orgTen,
        orgKind: thread.orgKind,
        quanLyKind,
        avatarUrl: thread.kind === "org" ? thread.avatarUrl : undefined,
        avatarInitial:
          thread.kind === "org"
            ? thread.avatarInitial
            : avatarInitialFromName(orgTen),
        avatarHue:
          thread.kind === "org"
            ? thread.avatarHue
            : avatarHueFromSeed(orgId),
        unread: thread.unread,
        lastAt: thread.lastAt,
        threads: [thread],
      });
      continue;
    }

    existing.threads.push(thread);
    existing.unread += thread.unread;
    if (compareLastAtDesc(existing.lastAt, thread.lastAt) > 0) {
      existing.lastAt = thread.lastAt;
    }
    if (!existing.orgSlug && thread.orgSlug) {
      existing.orgSlug = thread.orgSlug;
    }
    if (!existing.quanLyKind && isOrgQuanLyKind(thread.orgKind)) {
      existing.quanLyKind = thread.orgKind;
      existing.orgKind = thread.orgKind;
    }
    if (!existing.avatarUrl && thread.kind === "org" && thread.avatarUrl) {
      existing.avatarUrl = thread.avatarUrl;
      existing.avatarInitial = thread.avatarInitial;
      existing.avatarHue = thread.avatarHue;
    }
  }

  const cuaToi = [...byOrg.values()].sort((a, b) =>
    compareLastAtDesc(a.lastAt, b.lastAt),
  );
  for (const node of cuaToi) {
    node.threads.sort((a, b) => compareLastAtDesc(a.lastAt, b.lastAt));
  }
  nhanVoi.sort((a, b) => compareLastAtDesc(a.lastAt, b.lastAt));

  return { nhanVoi, cuaToi };
}
