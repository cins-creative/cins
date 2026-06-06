import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type AuthorBadgeRow = {
  id: string;
  slug: string;
  tenHienThi: string;
  avatarId: string | null;
  ngheLabel: string | null;
  verifiedCount: number;
};

export async function loadAuthorBadges(
  userIds: string[],
): Promise<Map<string, AuthorBadgeRow>> {
  const out = new Map<string, AuthorBadgeRow>();
  if (userIds.length === 0) return out;

  const admin = createServiceRoleClient();
  const uniqueIds = [...new Set(userIds)];

  const { data: profiles } = await admin
    .from("user_nguoi_dung")
    .select("id, slug, ten_hien_thi, avatar_id")
    .in("id", uniqueIds)
    .returns<
      Array<{
        id: string;
        slug: string;
        ten_hien_thi: string | null;
        avatar_id: string | null;
      }>
    >();

  const { data: linhVucRows } = await admin
    .from("user_linh_vuc")
    .select("id_nguoi_dung, id_bai_viet")
    .in("id_nguoi_dung", uniqueIds)
    .returns<Array<{ id_nguoi_dung: string; id_bai_viet: string | null }>>();

  const baiVietIds = [
    ...new Set(
      (linhVucRows ?? [])
        .map((r) => r.id_bai_viet)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const ngheByArticleId = new Map<string, string>();
  if (baiVietIds.length > 0) {
    const { data: articles } = await admin
      .from("article_bai_viet")
      .select("id, tieu_de")
      .in("id", baiVietIds)
      .eq("loai_bai_viet", "nghe")
      .returns<Array<{ id: string; tieu_de: string | null }>>();
    for (const article of articles ?? []) {
      const label = article.tieu_de?.trim();
      if (label) ngheByArticleId.set(article.id, label);
    }
  }

  const ngheByUser = new Map<string, string>();
  for (const row of linhVucRows ?? []) {
    if (ngheByUser.has(row.id_nguoi_dung) || !row.id_bai_viet) continue;
    const label = ngheByArticleId.get(row.id_bai_viet);
    if (label) ngheByUser.set(row.id_nguoi_dung, label);
  }

  const { data: milestones } = await admin
    .from("content_cot_moc")
    .select("id, id_nguoi_dung")
    .in("id_nguoi_dung", uniqueIds)
    .returns<Array<{ id: string; id_nguoi_dung: string }>>();

  const milestoneIds = (milestones ?? []).map((m) => m.id);
  const verifiedByUser = new Map<string, number>();

  if (milestoneIds.length > 0) {
    const { data: verifyRows } = await admin
      .from("verify_xac_nhan")
      .select("id_cot_moc")
      .in("id_cot_moc", milestoneIds)
      .not("xu_ly_luc", "is", null)
      .returns<Array<{ id_cot_moc: string }>>();

    const ownerByMilestone = new Map(
      (milestones ?? []).map((m) => [m.id, m.id_nguoi_dung]),
    );
    for (const row of verifyRows ?? []) {
      const uid = ownerByMilestone.get(row.id_cot_moc);
      if (!uid) continue;
      verifiedByUser.set(uid, (verifiedByUser.get(uid) ?? 0) + 1);
    }
  }

  for (const profile of profiles ?? []) {
    out.set(profile.id, {
      id: profile.id,
      slug: profile.slug,
      tenHienThi: profile.ten_hien_thi?.trim() || profile.slug,
      avatarId: profile.avatar_id,
      ngheLabel: ngheByUser.get(profile.id) ?? null,
      verifiedCount: verifiedByUser.get(profile.id) ?? 0,
    });
  }

  return out;
}
