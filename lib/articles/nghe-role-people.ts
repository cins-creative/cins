import "server-only";

import { cache } from "react";

import {
  extractNgheRoleShort,
  parseStoredCoAuthorRole,
} from "@/lib/articles/nghe-role-label";
import { scoreNgheRoleTitleMatch } from "@/lib/articles/nghe-role-preview";
import type { NgheRolePerson } from "@/lib/articles/nghe-role-people-types";
import { getAvatarUrl } from "@/lib/journey/profile";
import { parseVaiTroPositions } from "@/lib/social/vai-tro";
import {
  createServiceRoleClient,
  hasServiceRoleEnv,
} from "@/lib/supabase/service-role";

export type { NgheRolePerson } from "@/lib/articles/nghe-role-people-types";

type NgheTitleSource = {
  id: string;
  tieu_de: string;
  tieu_de_viet?: string | null;
  tieu_de_eng?: string | null;
  linh_vuc?: { ten?: string | null } | null;
};

const PEOPLE_LIMIT = 24;
const CANDIDATE_ROW_LIMIT = 120;

function escapeIlikePattern(value: string): string {
  return value.replace(/[%_,]/g, "\\$&");
}

function uniqueStrings(values: Iterable<string>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const value = raw.trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

function collectNgheTitles(
  article: NgheTitleSource,
  aliases: string[],
): string[] {
  const base = [
    article.tieu_de,
    article.tieu_de_viet,
    article.tieu_de_eng,
    ...aliases,
  ];
  const shorts = base
    .map((t) => (t ? extractNgheRoleShort(t) : ""))
    .filter(Boolean);
  return uniqueStrings([...base.filter(Boolean) as string[], ...shorts]);
}

/** Needle cho ILIKE — ưu tiên chuỗi ngắn/đặc trưng. */
function buildSearchNeedles(titles: string[]): string[] {
  return uniqueStrings(
    titles
      .map((t) => t.trim())
      .filter((t) => t.length >= 3)
      .sort((a, b) => a.length - b.length),
  ).slice(0, 8);
}

function matchingRolesForCredit(
  vaiTro: string | null | undefined,
  titles: string[],
  linhVucTen: string | null,
): string[] {
  const matched: string[] = [];
  for (const pos of parseVaiTroPositions(vaiTro)) {
    const { linhVucHint, rolePart } = parseStoredCoAuthorRole(pos);
    if (
      linhVucHint &&
      linhVucTen &&
      linhVucHint.toLowerCase() !== linhVucTen.toLowerCase()
    ) {
      continue;
    }
    const query = rolePart || pos;
    const score = Math.max(
      scoreNgheRoleTitleMatch(query, titles),
      scoreNgheRoleTitleMatch(pos, titles),
    );
    if (score >= 50) matched.push(pos);
  }
  return matched;
}

type CreditRow = {
  id_nguoi_dung: string;
  vai_tro: string | null;
};

async function loadAliasNames(
  admin: ReturnType<typeof createServiceRoleClient>,
  articleId: string,
): Promise<string[]> {
  const { data } = await admin
    .from("article_alias")
    .select("ten_alias")
    .eq("id_bai_viet", articleId)
    .limit(20);
  return (data ?? [])
    .map((r) => String(r.ten_alias ?? "").trim())
    .filter(Boolean);
}

async function queryCreditCandidates(
  admin: ReturnType<typeof createServiceRoleClient>,
  table: "content_tac_pham_tac_gia" | "org_bai_dang_tac_gia",
  needles: string[],
): Promise<CreditRow[]> {
  if (needles.length === 0) return [];

  const orFilter = needles
    .map((n) => `vai_tro.ilike.%${escapeIlikePattern(n)}%`)
    .join(",");

  const { data } = await admin
    .from(table)
    .select("id_nguoi_dung, vai_tro")
    .eq("trang_thai", "accepted")
    .not("vai_tro", "is", null)
    .or(orFilter)
    .limit(CANDIDATE_ROW_LIMIT);

  return (data ?? []) as CreditRow[];
}

/**
 * Người có `vai_tro` đồng tác giả khớp bài nghề (accepted).
 * Dùng cho mục «Những người đang làm nghề này» dưới hero trang nghề.
 */
export const fetchNgheRolePeople = cache(
  async (article: NgheTitleSource): Promise<NgheRolePerson[]> => {
    if (!hasServiceRoleEnv()) return [];

    const admin = createServiceRoleClient();
    const aliases = await loadAliasNames(admin, article.id);
    const titles = collectNgheTitles(article, aliases);
    if (titles.length === 0) return [];

    const needles = buildSearchNeedles(titles);
    const linhVucTen = article.linh_vuc?.ten?.trim() || null;

    const [tacPhamRows, orgRows] = await Promise.all([
      queryCreditCandidates(admin, "content_tac_pham_tac_gia", needles),
      queryCreditCandidates(admin, "org_bai_dang_tac_gia", needles),
    ]);

    const rolesByUser = new Map<string, string[]>();
    for (const row of [...tacPhamRows, ...orgRows]) {
      const userId = row.id_nguoi_dung;
      if (!userId) continue;
      const matched = matchingRolesForCredit(row.vai_tro, titles, linhVucTen);
      if (matched.length === 0) continue;
      const prev = rolesByUser.get(userId) ?? [];
      rolesByUser.set(userId, uniqueStrings([...prev, ...matched]));
    }

    const userIds = [...rolesByUser.keys()];
    if (userIds.length === 0) return [];

    const { data: profiles } = await admin
      .from("user_nguoi_dung")
      .select("id, slug, ten_hien_thi, avatar_id")
      .in("id", userIds);

    const people: NgheRolePerson[] = [];
    for (const p of profiles ?? []) {
      const id = p.id as string;
      const slug = String(p.slug ?? "").trim();
      if (!slug) continue;
      const roles = rolesByUser.get(id) ?? [];
      if (roles.length === 0) continue;
      const tenHienThi =
        (p.ten_hien_thi as string | null)?.trim() || slug;
      people.push({
        id,
        slug,
        tenHienThi,
        avatarUrl: getAvatarUrl((p.avatar_id as string) || null) ?? null,
        roles,
      });
    }

    people.sort((a, b) =>
      a.tenHienThi.localeCompare(b.tenHienThi, "vi"),
    );
    return people.slice(0, PEOPLE_LIMIT);
  },
);
