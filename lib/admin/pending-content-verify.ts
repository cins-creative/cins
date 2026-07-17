import "server-only";

import type { PendingContentVerifyItem } from "@/lib/admin/pending-content-verify-types";
import {
  orgPublicPath,
  parseOrgMilestoneTagPayload,
  resolveLiveCoverSrcByCotMoc,
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

function rowToItem(
  row: YeuCauRow,
): { item: PendingContentVerifyItem; tacPhamId: string } | null {
  const payload = parseOrgMilestoneTagPayload(row.noi_dung);
  if (!payload) return null;

  const postUrl =
    payload.album?.href?.trim() ||
    (payload.studentSlug
      ? `/${encodeURIComponent(payload.studentSlug)}`
      : null);

  const orgUrl = orgPublicPath(payload.orgLoai, payload.orgSlug);

  return {
    item: {
      requestId: row.id,
      cotMocId: row.id_cot_moc,
      orgId: row.id_to_chuc,
      studentName: payload.studentName,
      studentSlug: payload.studentSlug,
      studentAvatarUrl: payload.studentAvatarUrl ?? null,
      projectTitle: payload.projectTitle || payload.milestoneTitle,
      milestoneTitle: payload.milestoneTitle,
      milestoneKind: payload.milestoneKind,
      orgTen: payload.orgTen,
      orgSlug: payload.orgSlug,
      orgAvatarUrl: payload.orgAvatarUrl?.trim() || null,
      orgLoai: payload.orgLoai,
      nganhLabel: payload.nganhLabel ?? null,
      monHocLabel: payload.monHocLabel ?? null,
      nam: payload.nam,
      thumbUrl: payload.album?.coverSrc?.trim() || null,
      submittedAt: row.tao_luc,
      postUrl,
      orgUrl,
      evidence: Array.isArray(payload.evidence) ? payload.evidence : [],
    },
    tacPhamId: payload.tacPhamId?.trim() || "",
  };
}

/** Mỗi trang Supabase — tránh một query quá lớn. */
const PAGE_SIZE = 500;
const MAX_ROWS = 5000;

async function loadPendingOrgTagItems(): Promise<PendingContentVerifyItem[]> {
  const admin = createServiceRoleClient();
  const items: PendingContentVerifyItem[] = [];
  const coverLookups: Array<{
    cotMocId: string;
    tacPhamId: string;
  }> = [];
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
      const parsed = rowToItem(row);
      if (!parsed) continue;
      items.push(parsed.item);
      if (!parsed.item.thumbUrl && parsed.tacPhamId) {
        coverLookups.push({
          cotMocId: row.id_cot_moc,
          tacPhamId: parsed.tacPhamId,
        });
      }
    }

    if (rows.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
    if (from >= MAX_ROWS) break;
  }

  if (coverLookups.length === 0) return items;

  const liveCovers = await resolveLiveCoverSrcByCotMoc(coverLookups);
  for (const item of items) {
    if (item.thumbUrl) continue;
    item.thumbUrl = liveCovers.get(item.cotMocId) ?? null;
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
