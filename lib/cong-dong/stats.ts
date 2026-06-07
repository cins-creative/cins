import "server-only";

import { THAO_LUAN_LOAI_CONTEXT } from "@/lib/cong-dong/constants";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type CongDongOrgStats = {
  memberCount: number;
  postCount: number;
};

/** Đếm thành viên + bài thảo luận theo org — batch 1 query mỗi loại. */
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
      .from("content_thao_luan")
      .select("id_context")
      .eq("loai_context", THAO_LUAN_LOAI_CONTEXT.CONG_DONG)
      .in("id_context", unique)
      .eq("da_xoa", false),
  ]);

  for (const row of memberRows ?? []) {
    const id = row.id_to_chuc as string;
    const cur = out.get(id);
    if (cur) cur.memberCount += 1;
  }
  for (const row of postRows ?? []) {
    const id = row.id_context as string;
    const cur = out.get(id);
    if (cur) cur.postCount += 1;
  }

  return out;
}

export async function countCongDongPosts(orgId: string): Promise<number> {
  const admin = createServiceRoleClient();
  const { count } = await admin
    .from("content_thao_luan")
    .select("id", { count: "exact", head: true })
    .eq("loai_context", THAO_LUAN_LOAI_CONTEXT.CONG_DONG)
    .eq("id_context", orgId)
    .eq("da_xoa", false);
  return count ?? 0;
}

/** Thống kê bài đăng của user trong một cộng đồng. */
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
    .from("content_thao_luan")
    .select("nguoi_dang, tao_luc")
    .eq("loai_context", THAO_LUAN_LOAI_CONTEXT.CONG_DONG)
    .eq("id_context", orgId)
    .eq("da_xoa", false)
    .in("nguoi_dang", unique)
    .returns<Array<{ nguoi_dang: string; tao_luc: string }>>();

  for (const row of rows ?? []) {
    const prev = out.get(row.nguoi_dang) ?? { count: 0, lastPostAt: null };
    prev.count += 1;
    if (!prev.lastPostAt || row.tao_luc > prev.lastPostAt) {
      prev.lastPostAt = row.tao_luc;
    }
    out.set(row.nguoi_dang, prev);
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
