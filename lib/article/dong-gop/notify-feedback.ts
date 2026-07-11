import "server-only";

import { articlePublicHref } from "@/lib/articles/article-href";
import { insertSocialThongBao } from "@/lib/social/thong-bao-insert";
import type { ArticleDongGopFeedbackNotification } from "@/lib/social/types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

import { SOCIAL_LOAI_ARTICLE_DONG_GOP_FEEDBACK } from "./types";

export type DongGopFeedbackAction = "can_sua" | "tu_choi";

export type DongGopFeedbackNotifyPayload = {
  action: DongGopFeedbackAction;
  entityTitle: string;
  entityHref: string;
  ghiChu: string;
};

export type { ArticleDongGopFeedbackNotification };

export type DongGopFeedbackBannerItem = {
  idDongGop: string;
  action: DongGopFeedbackAction;
  entityTitle: string;
  entityHref: string;
  ghiChu: string;
  capNhatLuc: string;
};

function parsePayload(raw: string | null | undefined): DongGopFeedbackNotifyPayload | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<DongGopFeedbackNotifyPayload>;
    if (
      (parsed.action !== "can_sua" && parsed.action !== "tu_choi") ||
      !parsed.entityTitle ||
      !parsed.entityHref
    ) {
      return null;
    }
    return {
      action: parsed.action,
      entityTitle: parsed.entityTitle,
      entityHref: parsed.entityHref,
      ghiChu: typeof parsed.ghiChu === "string" ? parsed.ghiChu : "",
    };
  } catch {
    return null;
  }
}

/** Contributor nhận thông báo khi curator yêu cầu sửa / từ chối. */
export async function notifyContributorOnDongGopFeedback(input: {
  idNguoiDung: string;
  idDongGop: string;
  idBaiViet: string;
  action: DongGopFeedbackAction;
  ghiChu: string;
}): Promise<void> {
  const admin = createServiceRoleClient();
  const { data: article } = await admin
    .from("article_bai_viet")
    .select("slug, tieu_de, loai_bai_viet")
    .eq("id", input.idBaiViet)
    .maybeSingle<{ slug: string; tieu_de: string; loai_bai_viet: string }>();

  if (!article?.slug) return;

  const payload: DongGopFeedbackNotifyPayload = {
    action: input.action,
    entityTitle: article.tieu_de,
    entityHref: `${articlePublicHref(article.loai_bai_viet, article.slug)}?tab=contribution`,
    ghiChu: input.ghiChu.trim(),
  };

  const { data: existing } = await admin
    .from("social_thong_bao")
    .select("id")
    .eq("nguoi_nhan", input.idNguoiDung)
    .eq("loai_doi_tuong", SOCIAL_LOAI_ARTICLE_DONG_GOP_FEEDBACK)
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
    loai_doi_tuong: SOCIAL_LOAI_ARTICLE_DONG_GOP_FEEDBACK,
    id_doi_tuong: input.idDongGop,
  });
  if (!result.ok) {
    console.error("[notifyContributorOnDongGopFeedback]", result.error);
  }
}

export async function listDongGopFeedbackNotifications(
  viewerId: string,
  options: { unreadOnly?: boolean; historyOnly?: boolean; limit?: number } = {},
): Promise<ArticleDongGopFeedbackNotification[]> {
  const rowLimit = options.limit ?? 10;
  const admin = createServiceRoleClient();
  let query = admin
    .from("social_thong_bao")
    .select("id, id_doi_tuong, noi_dung, tao_luc, da_doc")
    .eq("nguoi_nhan", viewerId)
    .eq("loai_doi_tuong", SOCIAL_LOAI_ARTICLE_DONG_GOP_FEEDBACK)
    .order("tao_luc", { ascending: false })
    .limit(rowLimit);

  if (options.unreadOnly) {
    query = query.eq("da_doc", false);
  } else if (options.historyOnly) {
    query = query.eq("da_doc", true);
  }

  const { data: rows } = await query;
  const out: ArticleDongGopFeedbackNotification[] = [];
  for (const row of rows ?? []) {
    const parsed = parsePayload(row.noi_dung as string | null);
    const idDongGop = row.id_doi_tuong as string | null;
    if (!parsed || !idDongGop) continue;
    out.push({
      notificationId: (row.id as string) ?? idDongGop,
      idDongGop,
      action: parsed.action,
      entityTitle: parsed.entityTitle,
      entityHref: parsed.entityHref,
      ghiChu: parsed.ghiChu,
      taoLuc: (row.tao_luc as string | null) ?? undefined,
      daDoc: Boolean(row.da_doc),
    });
  }
  return out;
}

/** Banner đầu Journey/Home — bản đang cần sửa (chưa gửi lại). */
export async function listPendingDongGopFeedbackBanners(
  viewerId: string,
  limit = 5,
): Promise<DongGopFeedbackBannerItem[]> {
  const admin = createServiceRoleClient();
  const { data: rows } = await admin
    .from("article_dong_gop")
    .select(
      `
      id,
      trang_thai,
      ghi_chu_duyet,
      cap_nhat_luc,
      bai_viet:article_bai_viet!article_dong_gop_id_bai_viet_fkey (
        slug,
        tieu_de,
        loai_bai_viet
      )
    `,
    )
    .eq("id_nguoi_dong_gop", viewerId)
    .eq("da_xoa", false)
    .in("trang_thai", ["can_sua", "tu_choi"])
    .order("cap_nhat_luc", { ascending: false })
    .limit(limit);

  type Row = {
    id: string;
    trang_thai: string;
    ghi_chu_duyet: string | null;
    cap_nhat_luc: string;
    bai_viet:
      | { slug: string; tieu_de: string; loai_bai_viet: string }
      | { slug: string; tieu_de: string; loai_bai_viet: string }[]
      | null;
  };

  const out: DongGopFeedbackBannerItem[] = [];
  for (const row of (rows ?? []) as Row[]) {
    const article = Array.isArray(row.bai_viet) ? row.bai_viet[0] : row.bai_viet;
    if (!article?.slug) continue;
    const action: DongGopFeedbackAction =
      row.trang_thai === "tu_choi" ? "tu_choi" : "can_sua";
    out.push({
      idDongGop: row.id,
      action,
      entityTitle: article.tieu_de,
      entityHref: `${articlePublicHref(article.loai_bai_viet, article.slug)}?tab=contribution`,
      ghiChu: row.ghi_chu_duyet?.trim() || "",
      capNhatLuc: row.cap_nhat_luc,
    });
  }
  return out;
}
