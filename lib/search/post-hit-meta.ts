import "server-only";

import { getCoverUrl } from "@/lib/articles/cover";
import { getAvatarUrl } from "@/lib/journey/profile";
import {
  orgLoaiLabel,
  orgPostHref,
  stripHtmlToPlainText,
  userPostHref,
} from "@/lib/search/helpers";
import type { ScoredSearchItem } from "@/lib/search/ranking";
import type { SearchHit, SearchPostMeta } from "@/lib/search/types";
import { getCfImageUrlWithFallbacks } from "@/lib/truong/images";
import { resolveTruongImageSrcSync } from "@/lib/truong/media-url";

export type SearchPostOrgEmbed = {
  slug?: string;
  ten?: string;
  loai_to_chuc?: string;
  avatar_id?: string | null;
  logo_id?: string | null;
};

export type SearchPostUserEmbed = {
  slug?: string;
  ten_hien_thi?: string | null;
  avatar_id?: string | null;
};

function pickEmbed<T>(embed: T | T[] | null | undefined): T | null {
  if (!embed) return null;
  if (Array.isArray(embed)) return embed[0] ?? null;
  return embed;
}

export function resolveOrgPostCoverUrl(
  coverId: string | null | undefined,
): string | null {
  const id = coverId?.trim();
  if (!id) return null;
  return (
    getCfImageUrlWithFallbacks(id, ["public", "cover", "medium"]) ??
    getCoverUrl(id, "public")
  );
}

export function resolveUserPostCoverUrl(
  coverId: string | null | undefined,
): string | null {
  const id = coverId?.trim();
  if (!id) return null;
  return getCoverUrl(id, "public") ?? getCoverUrl(id, "thumbnail");
}

function resolveOrgAuthorAvatar(
  avatarId: string | null | undefined,
  logoId: string | null | undefined,
): string | null {
  const imageId = avatarId ?? logoId;
  return imageId
    ? resolveTruongImageSrcSync(imageId, ["public", "avatar"])
    : null;
}

export function buildOrgPostSearchItem(
  row: Record<string, unknown>,
  trigramSim: number,
): ScoredSearchItem | null {
  const orgRow = pickEmbed(row.org_to_chuc as SearchPostOrgEmbed | SearchPostOrgEmbed[] | null);
  const orgSlug = String(orgRow?.slug ?? "").trim();
  const orgLoai = String(orgRow?.loai_to_chuc ?? "").trim();
  if (!orgSlug || !orgLoai) return null;

  const orgTen = orgRow?.ten ? String(orgRow.ten).trim() : null;
  const title = String(row.tieu_de ?? "").trim() || "Bài đăng";
  const tomTat = row.tom_tat ? String(row.tom_tat).trim() : null;
  const bodyPlain =
    stripHtmlToPlainText(row.noi_dung ? String(row.noi_dung) : null) ??
    (row.noi_dung ? String(row.noi_dung).trim() : null);
  const coverUrl = resolveOrgPostCoverUrl(
    row.cover_id ? String(row.cover_id) : null,
  );
  const authorAvatarUrl = resolveOrgAuthorAvatar(
    orgRow?.avatar_id ?? null,
    orgRow?.logo_id ?? null,
  );

  const postMeta: SearchPostMeta = {
    coverUrl,
    authorName: orgTen || orgSlug,
    authorAvatarUrl,
    authorHandle: orgSlug ? `@${orgSlug}` : null,
  };

  const hit: SearchHit = {
    id: String(row.id),
    kind: "org_post",
    title,
    subtitle: orgTen,
    snippet: tomTat ? tomTat.slice(0, 160) : null,
    href: orgPostHref(orgLoai, orgSlug, String(row.id)),
    avatarUrl: authorAvatarUrl,
    badge: orgLoaiLabel(orgLoai),
    entityLoai: orgLoai || null,
    slug: orgSlug || null,
    postMeta,
  };

  return {
    trigramSim,
    fields: {
      title,
      summary: tomTat,
      content: bodyPlain,
    },
    hit,
  };
}

export function buildUserPostSearchItem(
  row: Record<string, unknown>,
  trigramSim: number,
): ScoredSearchItem | null {
  const user = pickEmbed(
    row.user_nguoi_dung as SearchPostUserEmbed | SearchPostUserEmbed[] | null,
  );
  const userSlug = String(user?.slug ?? "").trim();
  if (!userSlug) return null;

  const postSlug = row.slug ? String(row.slug).trim() : null;
  const authorName =
    String(user?.ten_hien_thi ?? "").trim() || userSlug || "Người dùng";
  const title = String(row.tieu_de ?? "").trim() || "Bài viết";
  const moTa = row.mo_ta ? String(row.mo_ta).trim() : null;
  const bodyPlain = stripHtmlToPlainText(
    row.noi_dung_html ? String(row.noi_dung_html) : null,
  );
  const coverUrl = resolveUserPostCoverUrl(
    row.cover_id ? String(row.cover_id) : null,
  );
  const authorAvatarUrl = getAvatarUrl(user?.avatar_id ?? null);

  const postMeta: SearchPostMeta = {
    coverUrl,
    authorName,
    authorAvatarUrl,
    authorHandle: `@${userSlug}`,
  };

  const hit: SearchHit = {
    id: String(row.id),
    kind: "user_post",
    title,
    subtitle: authorName,
    snippet: moTa ? moTa.slice(0, 160) : null,
    href: userPostHref(userSlug, postSlug),
    avatarUrl: authorAvatarUrl,
    badge: "Journey",
    entityLoai: null,
    slug: postSlug,
    postMeta,
  };

  return {
    trigramSim,
    fields: {
      title,
      slug: postSlug,
      summary: moTa,
      content: bodyPlain,
    },
    hit,
  };
}

export const USER_POST_SEARCH_SELECT = `
  id,
  slug,
  tieu_de,
  mo_ta,
  cover_id,
  noi_dung_html,
  id_nguoi_dung,
  user_nguoi_dung!inner ( slug, ten_hien_thi, avatar_id )
`;

export const ORG_POST_SEARCH_SELECT = `
  id,
  tieu_de,
  tom_tat,
  noi_dung,
  cover_id,
  org_to_chuc!inner ( slug, ten, loai_to_chuc, avatar_id, logo_id )
`;
