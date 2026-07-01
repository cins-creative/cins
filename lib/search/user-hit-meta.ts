import "server-only";

import {
  formatTinhThanh,
  getAvatarUrl,
  getGiaiDoanLabel,
  getProfileCoverUrl,
} from "@/lib/journey/profile";
import { userJourneyHref } from "@/lib/search/helpers";
import type { ScoredSearchItem } from "@/lib/search/ranking";
import type { SearchHit, SearchUserMeta } from "@/lib/search/types";
import { loadUserSocialStatsByIds } from "@/lib/social/follow";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { GiaiDoan } from "@/lib/auth/session";

export type RawUserSearchRow = {
  id: string;
  slug: string;
  ten_hien_thi: string | null;
  avatar_id: string | null;
  cover_id: string | null;
  bio: string | null;
  ai_summary_journey: string | null;
  giai_doan: GiaiDoan | null;
  tinh_thanh: string | null;
};

export const USER_SEARCH_SELECT = `
  id,
  slug,
  ten_hien_thi,
  avatar_id,
  cover_id,
  bio,
  ai_summary_journey,
  giai_doan,
  tinh_thanh
`;

export function buildUserSearchMeta(
  row: RawUserSearchRow,
  stats: { cotMoc: number; tacPham: number; banBe: number },
): SearchUserMeta {
  const bio = row.bio ? String(row.bio).trim() : null;

  return {
    coverUrl: getProfileCoverUrl(row.cover_id),
    giaiDoanLabel: getGiaiDoanLabel(row.giai_doan),
    locationLabel: formatTinhThanh(row.tinh_thanh),
    bio,
    stats: {
      cotMoc: stats.cotMoc,
      tacPham: stats.tacPham,
      banBe: stats.banBe,
    },
  };
}

export async function fetchUserSearchStats(
  admin: ReturnType<typeof createServiceRoleClient>,
  userIds: string[],
) {
  return loadUserSocialStatsByIds(admin, userIds);
}

export function buildUserSearchItem(
  row: RawUserSearchRow,
  trigramSim: number,
  stats: { cotMoc: number; tacPham: number; banBe: number },
): ScoredSearchItem {
  const slug = String(row.slug ?? "").trim();
  const name = String(row.ten_hien_thi ?? "").trim() || slug || "Người dùng";
  const bio = row.bio ? String(row.bio).trim() : null;
  const aiSummary = row.ai_summary_journey
    ? String(row.ai_summary_journey).trim()
    : null;
  const userMeta = buildUserSearchMeta(row, stats);

  const hit: SearchHit = {
    id: String(row.id),
    kind: "user",
    title: name,
    subtitle: slug ? `@${slug}` : null,
    snippet: bio ? bio.slice(0, 160) : null,
    href: userJourneyHref(slug),
    avatarUrl: getAvatarUrl(row.avatar_id),
    badge: "Người dùng",
    entityLoai: null,
    slug: slug || null,
    userMeta,
  };

  return {
    trigramSim,
    fields: {
      title: name,
      slug,
      summary: bio,
      content: aiSummary,
    },
    hit,
  };
}
