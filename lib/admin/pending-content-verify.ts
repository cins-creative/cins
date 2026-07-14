import "server-only";

import type { PendingContentVerifyItem } from "@/lib/admin/pending-content-verify-types";
import {
  orgPublicPath,
  parseOrgMilestoneTagPayload,
} from "@/lib/journey/org-milestone-tag";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type { PendingContentVerifyItem } from "@/lib/admin/pending-content-verify-types";

type YeuCauRow = {
  id: string;
  id_cot_moc: string;
  id_to_chuc: string;
  noi_dung: string | null;
  tao_luc: string;
};

function rowToItem(row: YeuCauRow): PendingContentVerifyItem | null {
  const payload = parseOrgMilestoneTagPayload(row.noi_dung);
  if (!payload) return null;

  const postUrl =
    payload.album?.href?.trim() ||
    (payload.studentSlug
      ? `/${encodeURIComponent(payload.studentSlug)}`
      : null);

  const orgUrl = orgPublicPath(payload.orgLoai, payload.orgSlug);

  return {
    requestId: row.id,
    cotMocId: row.id_cot_moc,
    orgId: row.id_to_chuc,
    studentName: payload.studentName,
    studentSlug: payload.studentSlug,
    projectTitle: payload.projectTitle || payload.milestoneTitle,
    milestoneTitle: payload.milestoneTitle,
    orgTen: payload.orgTen,
    orgSlug: payload.orgSlug,
    orgLoai: payload.orgLoai,
    nganhLabel: payload.nganhLabel ?? null,
    monHocLabel: payload.monHocLabel ?? null,
    nam: payload.nam,
    thumbUrl: payload.album?.coverSrc ?? null,
    submittedAt: row.tao_luc,
    postUrl,
    orgUrl,
  };
}

/** Mỗi trang Supabase — tránh một query quá lớn. */
const PAGE_SIZE = 500;
const MAX_ROWS = 5000;

async function loadPendingOrgTagItems(): Promise<PendingContentVerifyItem[]> {
  const admin = createServiceRoleClient();
  const items: PendingContentVerifyItem[] = [];
  let from = 0;

  for (;;) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await admin
      .from("verify_yeu_cau")
      .select("id, id_cot_moc, id_to_chuc, noi_dung, tao_luc")
      .eq("trang_thai", "cho_xu_ly")
      .order("tao_luc", { ascending: false })
      .range(from, to)
      .returns<YeuCauRow[]>();

    if (error) throw new Error(error.message);

    const rows = data ?? [];
    for (const row of rows) {
      const item = rowToItem(row);
      if (item) items.push(item);
    }

    if (rows.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
    if (from >= MAX_ROWS) break;
  }

  return items;
}

export async function countPendingOrgMilestoneTagVerifies(): Promise<number> {
  const items = await loadPendingOrgTagItems();
  return items.length;
}

export async function listPendingOrgMilestoneTagVerifies(options?: {
  offset?: number;
  limit?: number;
}): Promise<{
  items: PendingContentVerifyItem[];
  total: number;
  hasMore: boolean;
}> {
  const offset = Math.max(0, options?.offset ?? 0);
  const limit = Math.min(100, Math.max(1, options?.limit ?? 60));
  const all = await loadPendingOrgTagItems();
  const sliced = all.slice(offset, offset + limit);
  return {
    items: sliced,
    total: all.length,
    hasMore: offset + limit < all.length,
  };
}
