import "server-only";

import { resolveCuratorIdsForArticle } from "@/lib/article/dong-gop/curator";
import { fetchDongGopById } from "@/lib/article/dong-gop/fetch";
import { SOCIAL_LOAI_ARTICLE_DONG_GOP } from "@/lib/article/dong-gop/types";
import { articlePublicHref } from "@/lib/articles/article-href";
import { getAvatarUrl } from "@/lib/journey/profile";
import { insertSocialThongBao } from "@/lib/social/thong-bao-insert";
import type { ArticleDongGopCuratorNotification } from "@/lib/social/types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type NotifyPayload = {
  contributorName: string;
  contributorSlug: string | null;
  entityTitle: string;
  entityHref: string;
  adminHref: string;
};

function parseNotifyPayload(raw: string | null | undefined): NotifyPayload | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as NotifyPayload;
    if (!parsed?.entityTitle || !parsed?.contributorName) return null;
    return parsed;
  } catch {
    return null;
  }
}

function buildNotifyPayload(input: NotifyPayload): string {
  return JSON.stringify(input);
}

/** Curator nhận thông báo khi contributor gửi bản `cho_duyet`. */
export async function notifyCuratorsOnDongGopSubmit(
  idDongGop: string,
): Promise<void> {
  const row = await fetchDongGopById(idDongGop);
  if (!row || row.trang_thai !== "cho_duyet") return;

  const admin = createServiceRoleClient();

  const { data: article } = await admin
    .from("article_bai_viet")
    .select("slug, tieu_de, loai_bai_viet")
    .eq("id", row.id_bai_viet)
    .maybeSingle<{ slug: string; tieu_de: string; loai_bai_viet: string }>();

  if (!article?.slug) return;

  const { data: contributor } = await admin
    .from("user_nguoi_dung")
    .select("slug, ten_hien_thi")
    .eq("id", row.id_nguoi_dong_gop)
    .maybeSingle<{ slug: string | null; ten_hien_thi: string | null }>();

  const contributorName =
    contributor?.ten_hien_thi?.trim() ||
    (contributor?.slug ? `@${contributor.slug}` : "Một thành viên");

  const payload: NotifyPayload = {
    contributorName,
    contributorSlug: contributor?.slug ?? null,
    entityTitle: article.tieu_de,
    entityHref: articlePublicHref(article.loai_bai_viet, article.slug),
    adminHref: "/admin/bai-viet?tab=dong-gop",
  };

  const curatorIds = await resolveCuratorIdsForArticle(row.id_bai_viet);
  const recipients = curatorIds.filter((id) => id !== row.id_nguoi_dong_gop);
  if (recipients.length === 0) return;

  const body = buildNotifyPayload(payload);
  const ts = new Date().toISOString();

  await Promise.all(
    recipients.map(async (nguoiNhan) => {
      const { data: existing } = await admin
        .from("social_thong_bao")
        .select("id")
        .eq("nguoi_nhan", nguoiNhan)
        .eq("loai_doi_tuong", SOCIAL_LOAI_ARTICLE_DONG_GOP)
        .eq("id_doi_tuong", idDongGop)
        .eq("da_doc", false)
        .maybeSingle<{ id: string }>();

      if (existing?.id) {
        const { error } = await admin
          .from("social_thong_bao")
          .update({ noi_dung: body, tao_luc: ts })
          .eq("id", existing.id);
        if (error) {
          console.error("[notifyCuratorsOnDongGopSubmit] update", error.message);
        }
        return;
      }

      const result = await insertSocialThongBao(admin, {
        nguoi_nhan: nguoiNhan,
        loai: "hanh_dong",
        noi_dung: body,
        loai_doi_tuong: SOCIAL_LOAI_ARTICLE_DONG_GOP,
        id_doi_tuong: idDongGop,
        noi_dung_ai: row.id_nguoi_dong_gop,
        da_doc: false,
      });
      if (!result.ok) {
        console.error("[notifyCuratorsOnDongGopSubmit]", result.error);
      }
    }),
  );
}

export async function listArticleDongGopCuratorNotifications(
  viewerId: string,
  options: { unreadOnly?: boolean; historyOnly?: boolean; limit?: number } = {},
): Promise<ArticleDongGopCuratorNotification[]> {
  const rowLimit = options.limit ?? 10;
  const admin = createServiceRoleClient();

  let query = admin
    .from("social_thong_bao")
    .select("id, id_doi_tuong, noi_dung, noi_dung_ai, tao_luc, da_doc")
    .eq("nguoi_nhan", viewerId)
    .eq("loai_doi_tuong", SOCIAL_LOAI_ARTICLE_DONG_GOP)
    .order("tao_luc", { ascending: false })
    .limit(rowLimit);

  if (options.unreadOnly) {
    query = query.eq("da_doc", false);
  } else if (options.historyOnly) {
    query = query.eq("da_doc", true);
  }

  const { data: rows } = await query;
  if (!rows?.length) return [];

  const contributorIds = [
    ...new Set(
      rows
        .map((row) => row.noi_dung_ai as string | null)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const { data: contributors } = contributorIds.length
    ? await admin
        .from("user_nguoi_dung")
        .select("id, slug, ten_hien_thi, avatar_id")
        .in("id", contributorIds)
        .returns<
          Array<{
            id: string;
            slug: string | null;
            ten_hien_thi: string | null;
            avatar_id: string | null;
          }>
        >()
    : { data: [] };

  const contributorById = new Map((contributors ?? []).map((c) => [c.id, c]));

  return rows.flatMap((row): ArticleDongGopCuratorNotification[] => {
      const idDongGop = row.id_doi_tuong as string | null;
      if (!idDongGop) return [];

      const parsed = parseNotifyPayload(row.noi_dung as string | null);
      const contributorId = row.noi_dung_ai as string | null;
      const contributor = contributorId
        ? contributorById.get(contributorId)
        : null;

      const contributorName =
        parsed?.contributorName ||
        contributor?.ten_hien_thi?.trim() ||
        (contributor?.slug ? `@${contributor.slug}` : "Một thành viên");

      return [
        {
          notificationId: row.id as string,
          idDongGop,
          entityTitle: parsed?.entityTitle ?? "Bài entity",
          entityHref: parsed?.entityHref ?? "#",
          adminHref: parsed?.adminHref ?? "/admin/bai-viet?tab=dong-gop",
          contributorName,
          contributorSlug: parsed?.contributorSlug ?? contributor?.slug ?? null,
          contributorAvatarUrl: getAvatarUrl(contributor?.avatar_id ?? null),
          taoLuc: (row.tao_luc as string | null) ?? undefined,
          daDoc: Boolean(row.da_doc),
        },
      ];
    });
}
