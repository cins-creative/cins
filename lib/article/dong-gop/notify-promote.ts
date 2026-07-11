import "server-only";

import { articlePublicHref } from "@/lib/articles/article-href";
import { insertSocialThongBao } from "@/lib/social/thong-bao-insert";
import type { ArticleDongGopPromotedNotification } from "@/lib/social/types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

import { SOCIAL_LOAI_ARTICLE_DONG_GOP_PROMOTED } from "./types";

type PromoteNotifyPayload = {
  entityTitle: string;
  entityHref: string;
};

function parsePayload(raw: string | null | undefined): PromoteNotifyPayload | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PromoteNotifyPayload>;
    if (!parsed.entityTitle || !parsed.entityHref) return null;
    return {
      entityTitle: parsed.entityTitle,
      entityHref: parsed.entityHref,
    };
  } catch {
    return null;
  }
}

/** Contributor nhận thông báo khi bản được promote thành nội dung chính. */
export async function notifyContributorOnDongGopPromote(input: {
  idNguoiDung: string;
  idDongGop: string;
  idBaiViet: string;
}): Promise<void> {
  const admin = createServiceRoleClient();
  const { data: article } = await admin
    .from("article_bai_viet")
    .select("slug, tieu_de, loai_bai_viet")
    .eq("id", input.idBaiViet)
    .maybeSingle<{ slug: string; tieu_de: string; loai_bai_viet: string }>();

  if (!article?.slug) return;

  const payload: PromoteNotifyPayload = {
    entityTitle: article.tieu_de,
    entityHref: articlePublicHref(article.loai_bai_viet, article.slug),
  };

  const { data: existing } = await admin
    .from("social_thong_bao")
    .select("id")
    .eq("nguoi_nhan", input.idNguoiDung)
    .eq("loai_doi_tuong", SOCIAL_LOAI_ARTICLE_DONG_GOP_PROMOTED)
    .eq("id_doi_tuong", input.idDongGop)
    .maybeSingle<{ id: string }>();

  if (existing?.id) {
    await admin
      .from("social_thong_bao")
      .update({
        noi_dung: JSON.stringify(payload),
        da_doc: false,
        tao_luc: new Date().toISOString(),
      })
      .eq("id", existing.id);
    return;
  }

  const result = await insertSocialThongBao(admin, {
    nguoi_nhan: input.idNguoiDung,
    loai: "thong_tin",
    noi_dung: JSON.stringify(payload),
    loai_doi_tuong: SOCIAL_LOAI_ARTICLE_DONG_GOP_PROMOTED,
    id_doi_tuong: input.idDongGop,
  });
  if (!result.ok) {
    console.error("[notifyContributorOnDongGopPromote]", result.error);
  }
}

export async function listDongGopPromotedNotifications(
  viewerId: string,
  options: { unreadOnly?: boolean; historyOnly?: boolean; limit?: number } = {},
): Promise<ArticleDongGopPromotedNotification[]> {
  const rowLimit = options.limit ?? 10;
  const admin = createServiceRoleClient();
  let query = admin
    .from("social_thong_bao")
    .select("id, id_doi_tuong, noi_dung, tao_luc, da_doc")
    .eq("nguoi_nhan", viewerId)
    .eq("loai_doi_tuong", SOCIAL_LOAI_ARTICLE_DONG_GOP_PROMOTED)
    .order("tao_luc", { ascending: false })
    .limit(rowLimit);

  if (options.unreadOnly) {
    query = query.eq("da_doc", false);
  } else if (options.historyOnly) {
    query = query.eq("da_doc", true);
  }

  const { data: rows } = await query;
  const out: ArticleDongGopPromotedNotification[] = [];
  for (const row of rows ?? []) {
    const parsed = parsePayload(row.noi_dung as string | null);
    const idDongGop = row.id_doi_tuong as string | null;
    if (!parsed || !idDongGop) continue;
    out.push({
      notificationId: (row.id as string) ?? idDongGop,
      idDongGop,
      entityTitle: parsed.entityTitle,
      entityHref: parsed.entityHref,
      taoLuc: (row.tao_luc as string | null) ?? undefined,
      daDoc: Boolean(row.da_doc),
    });
  }
  return out;
}


/** Đánh dấu thông báo curator đã xử lý sau promote. */
export async function markCuratorDongGopNotificationsResolved(
  idDongGop: string,
): Promise<void> {
  const admin = createServiceRoleClient();
  const ts = new Date().toISOString();
  const { error } = await admin
    .from("social_thong_bao")
    .update({ da_doc: true, xu_ly_luc: ts })
    .eq("loai_doi_tuong", "article_dong_gop")
    .eq("id_doi_tuong", idDongGop)
    .eq("da_doc", false);

  if (error) {
    console.error("[markCuratorDongGopNotificationsResolved]", error.message);
  }
}
