import "server-only";

import { CHE_DO_MOC_CONG_DONG } from "@/lib/journey/journey-visible-clause";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type CongDongOrgStats = {
  memberCount: number;
  postCount: number;
};

/** Đếm thành viên + bài cộng đồng (content_cot_moc che_do_hien_thi=cong_dong). */
export async function loadCongDongStatsByOrgIds(
  orgIds: string[],
): Promise<Map<string, CongDongOrgStats>> {
  const out = new Map<string, CongDongOrgStats>();
  const unique = [...new Set(orgIds.filter(Boolean))];
  if (unique.length === 0) return out;

  for (const id of unique) {
    out.set(id, { memberCount: 0, postCount: 0 });
  }

  const admin = createServiceRoleClient();
  const [{ data: memberRows }, { data: postRows }] = await Promise.all([
    admin
      .from("user_thanh_vien_to_chuc")
      .select("id_to_chuc")
      .in("id_to_chuc", unique),
    admin
      .from("content_cot_moc")
      .select("id_to_chuc")
      .eq("che_do_hien_thi", CHE_DO_MOC_CONG_DONG)
      .in("id_to_chuc", unique),
  ]);

  for (const row of memberRows ?? []) {
    const id = row.id_to_chuc as string;
    const cur = out.get(id);
    if (cur) cur.memberCount += 1;
  }
  for (const row of postRows ?? []) {
    const id = row.id_to_chuc as string;
    const cur = out.get(id);
    if (cur) cur.postCount += 1;
  }

  return out;
}

export async function countCongDongPosts(orgId: string): Promise<number> {
  const admin = createServiceRoleClient();
  const { count } = await admin
    .from("content_cot_moc")
    .select("id", { count: "exact", head: true })
    .eq("id_to_chuc", orgId)
    .eq("che_do_hien_thi", CHE_DO_MOC_CONG_DONG);
  return count ?? 0;
}

export type AuthorOrgPostMeta = {
  count: number;
  lastPostAt: string | null;
};

/** Số bài + thời điểm bài gần nhất mỗi user trong cộng đồng. */
export async function loadAuthorOrgPostMetaInOrg(
  orgId: string,
  userIds: string[],
): Promise<Map<string, AuthorOrgPostMeta>> {
  const out = new Map<string, AuthorOrgPostMeta>();
  const unique = [...new Set(userIds.filter(Boolean))];
  if (unique.length === 0) return out;

  const admin = createServiceRoleClient();
  const { data: rows } = await admin
    .from("content_cot_moc")
    .select("id_nguoi_dung, tao_luc")
    .eq("id_to_chuc", orgId)
    .eq("che_do_hien_thi", CHE_DO_MOC_CONG_DONG)
    .in("id_nguoi_dung", unique)
    .returns<Array<{ id_nguoi_dung: string; tao_luc: string }>>();

  for (const row of rows ?? []) {
    const prev = out.get(row.id_nguoi_dung) ?? { count: 0, lastPostAt: null };
    prev.count += 1;
    if (!prev.lastPostAt || row.tao_luc > prev.lastPostAt) {
      prev.lastPostAt = row.tao_luc;
    }
    out.set(row.id_nguoi_dung, prev);
  }
  return out;
}

/** @deprecated Dùng `loadAuthorOrgPostMetaInOrg` */
export async function loadAuthorPostCountsInOrg(
  orgId: string,
  userIds: string[],
): Promise<Map<string, number>> {
  const meta = await loadAuthorOrgPostMetaInOrg(orgId, userIds);
  const out = new Map<string, number>();
  for (const [userId, value] of meta) {
    out.set(userId, value.count);
  }
  return out;
}
