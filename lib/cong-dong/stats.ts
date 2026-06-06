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
