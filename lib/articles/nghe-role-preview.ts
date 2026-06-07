import "server-only";

import { cache } from "react";

import { resolveHubArticleThumbSync } from "@/lib/bai-viet/thumbnail";
import {
  formatNgheRoleLabel,
  parseStoredCoAuthorRole,
} from "@/lib/articles/nghe-role-label";
import type { NgheRolePreview } from "@/lib/articles/nghe-role-preview-types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { hasSupabaseEnv } from "@/lib/supabase/server";

export {
  formatNgheRoleLabel,
  parseStoredCoAuthorRole,
} from "@/lib/articles/nghe-role-label";

export type { NgheRolePreview } from "@/lib/articles/nghe-role-preview-types";

type LinhVucEmbed = {
  ten?: string | null;
};

type NgheRoleRow = {
  slug: string;
  tieu_de: string;
  tieu_de_viet: string | null;
  tieu_de_eng: string | null;
  tom_tat: string | null;
  cover_id: string | null;
  thumbnail: string | null;
  linh_vuc?: LinhVucEmbed | LinhVucEmbed[] | null;
};

const NGHE_ROLE_SELECT =
  "slug, tieu_de, tieu_de_viet, tieu_de_eng, tom_tat, cover_id, thumbnail, linh_vuc:id_linh_vuc(ten)";

function parseLinhVucTen(raw: NgheRoleRow["linh_vuc"]): string | null {
  const node = Array.isArray(raw) ? raw[0] : raw;
  if (!node || typeof node !== "object") return null;
  const ten = String(node.ten ?? "").trim();
  return ten || null;
}

function linhVucMatchBoost(
  hint: string | null,
  rowLinhVuc: string | null,
): number {
  if (!hint || !rowLinhVuc) return 0;
  return hint.trim().toLowerCase() === rowLinhVuc.trim().toLowerCase() ? 12 : 0;
}

function escapeIlikePattern(value: string): string {
  return value.replace(/[%_,]/g, "\\$&");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Điểm khớp vai trò ↔ tiêu đề bài nghề (cao hơn = ưu tiên). */
export function scoreNgheRoleTitleMatch(
  role: string,
  titles: (string | null | undefined)[],
): number {
  const normalized = role.trim().toLowerCase();
  if (!normalized) return 0;

  let best = 0;
  for (const raw of titles) {
    if (!raw) continue;
    const title = raw.trim();
    const lower = title.toLowerCase();

    if (lower === normalized) {
      best = Math.max(best, 100);
      continue;
    }

    const beforeParen = lower.split("(")[0]?.trim() ?? "";
    if (beforeParen === normalized) {
      best = Math.max(best, 95);
      continue;
    }

    if (lower.startsWith(`${normalized} `) || lower.startsWith(`${normalized}(`)) {
      best = Math.max(best, 90);
      continue;
    }

    const wordRe = new RegExp(`\\b${escapeRegExp(normalized)}\\b`, "i");
    if (wordRe.test(title)) {
      best = Math.max(best, 80);
      continue;
    }

    if (lower.includes(normalized)) {
      best = Math.max(best, 50);
    }
  }

  return best;
}

function pickBestNgheRow(
  role: string,
  rows: NgheRoleRow[],
  linhVucHint: string | null = null,
): NgheRoleRow | null {
  let bestRow: NgheRoleRow | null = null;
  let bestScore = 0;
  let bestTitleLen = Number.POSITIVE_INFINITY;

  for (const row of rows) {
    const score =
      scoreNgheRoleTitleMatch(role, [
        row.tieu_de,
        row.tieu_de_viet,
        row.tieu_de_eng,
      ]) + linhVucMatchBoost(linhVucHint, parseLinhVucTen(row.linh_vuc));
    if (score < 50) continue;

    const displayLen = Math.min(
      row.tieu_de?.length ?? 999,
      row.tieu_de_viet?.length ?? 999,
      row.tieu_de_eng?.length ?? 999,
    );

    if (
      score > bestScore ||
      (score === bestScore && displayLen < bestTitleLen)
    ) {
      bestRow = row;
      bestScore = score;
      bestTitleLen = displayLen;
    }
  }

  return bestRow;
}

async function findNgheRowViaAlias(
  admin: ReturnType<typeof createServiceRoleClient>,
  normalized: string,
): Promise<NgheRoleRow | null> {
  const { data: aliasRow } = await admin
    .from("article_alias")
    .select("id_bai_viet")
    .ilike("ten_alias", normalized)
    .limit(1)
    .maybeSingle<{ id_bai_viet: string }>();

  if (!aliasRow?.id_bai_viet) return null;

  const { data } = await admin
    .from("article_bai_viet")
    .select(NGHE_ROLE_SELECT)
    .eq("id", aliasRow.id_bai_viet)
    .eq("loai_bai_viet", "nghe")
    .eq("trang_thai_noi_dung", "published")
    .maybeSingle<NgheRoleRow>();

  return data?.slug ? data : null;
}

async function findNgheRowsFuzzy(
  admin: ReturnType<typeof createServiceRoleClient>,
  normalized: string,
): Promise<NgheRoleRow[]> {
  const pattern = `%${escapeIlikePattern(normalized)}%`;
  const { data } = await admin
    .from("article_bai_viet")
    .select(NGHE_ROLE_SELECT)
    .eq("loai_bai_viet", "nghe")
    .eq("trang_thai_noi_dung", "published")
    .or(
      `tieu_de.ilike.${pattern},tieu_de_viet.ilike.${pattern},tieu_de_eng.ilike.${pattern}`,
    )
    .limit(40);

  return (data ?? []) as NgheRoleRow[];
}

async function findNgheRowExact(
  admin: ReturnType<typeof createServiceRoleClient>,
  normalized: string,
): Promise<NgheRoleRow | null> {
  const columns = ["tieu_de", "tieu_de_viet", "tieu_de_eng"] as const;

  for (const col of columns) {
    const { data } = await admin
      .from("article_bai_viet")
      .select(NGHE_ROLE_SELECT)
      .eq("loai_bai_viet", "nghe")
      .eq("trang_thai_noi_dung", "published")
      .ilike(col, normalized)
      .limit(1)
      .maybeSingle<NgheRoleRow>();
    if (data?.slug) return data;
  }

  return null;
}

function rowToPreview(row: NgheRoleRow, roleTitle: string): NgheRolePreview {
  const { linhVucHint, rolePart } = parseStoredCoAuthorRole(roleTitle);
  const roleShort = rolePart || roleTitle.trim();
  const tieuDe =
    row.tieu_de_viet?.trim() ||
    row.tieu_de_eng?.trim() ||
    row.tieu_de?.trim() ||
    roleShort;
  const linhVucTen = parseLinhVucTen(row.linh_vuc) ?? linhVucHint;

  return {
    slug: row.slug,
    tieuDe,
    roleShort,
    linhVucTen,
    roleLabel: formatNgheRoleLabel(linhVucTen, roleShort),
    tomTat: row.tom_tat?.trim() || null,
    thumbUrl: resolveHubArticleThumbSync(row),
  };
}

/** Khớp `vai_tro` đồng tác giả với bài nghề đã publish. */
export const findNgheRolePreview = cache(
  async (roleTitle: string): Promise<NgheRolePreview | null> => {
    const normalized = roleTitle.trim();
    if (!normalized || !hasSupabaseEnv()) return null;

    const { linhVucHint, rolePart } = parseStoredCoAuthorRole(normalized);
    const roleQuery = rolePart || normalized;

    const admin = createServiceRoleClient();

    const exact = await findNgheRowExact(admin, roleQuery);
    if (exact) {
      const exactLv = parseLinhVucTen(exact.linh_vuc);
      if (
        !linhVucHint ||
        !exactLv ||
        linhVucHint.toLowerCase() === exactLv.toLowerCase()
      ) {
        return rowToPreview(exact, normalized);
      }
    }

    const aliasRow = await findNgheRowViaAlias(admin, roleQuery);
    if (aliasRow) {
      const aliasLv = parseLinhVucTen(aliasRow.linh_vuc);
      if (
        !linhVucHint ||
        !aliasLv ||
        linhVucHint.toLowerCase() === aliasLv.toLowerCase()
      ) {
        return rowToPreview(aliasRow, normalized);
      }
    }

    const fuzzyRows = await findNgheRowsFuzzy(admin, roleQuery);
    const best = pickBestNgheRow(roleQuery, fuzzyRows, linhVucHint);
    if (!best) return null;

    return rowToPreview(best, normalized);
  },
);
