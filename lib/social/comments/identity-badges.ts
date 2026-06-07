import "server-only";

import type { GiaiDoan } from "@/lib/auth/session";
import { getGiaiDoanLabel } from "@/lib/journey/profile";
import type { CommentIdentityBadge } from "@/lib/social/comments/types";
import { commentVaiTroLabel } from "@/lib/social/comments/vai-tro-label";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type ProfileRow = {
  id: string;
  giai_doan: GiaiDoan | null;
};

/** Batch resolve badge — org active membership ưu tiên, fallback giai_doan. */
export async function loadCommentIdentityBadges(
  userIds: string[],
): Promise<Map<string, CommentIdentityBadge | null>> {
  const out = new Map<string, CommentIdentityBadge | null>();
  const unique = [...new Set(userIds.filter(Boolean))];
  if (unique.length === 0) return out;

  const admin = createServiceRoleClient();

  const [{ data: memberships }, { data: profiles }] = await Promise.all([
    admin
      .from("user_thanh_vien_to_chuc")
      .select(
        "id_nguoi_dung, vai_tro, nam_bat_dau, tu_ngay, org_to_chuc: id_to_chuc ( ten, slug )",
      )
      .in("id_nguoi_dung", unique)
      .eq("trang_thai", "active")
      .is("den_ngay", null)
      .order("nam_bat_dau", { ascending: false, nullsFirst: false })
      .order("tu_ngay", { ascending: false })
      .returns<
        Array<{
          id_nguoi_dung: string;
          vai_tro: string;
          org_to_chuc: { ten: string; slug: string } | null;
        }>
      >(),
    admin
      .from("user_nguoi_dung")
      .select("id, giai_doan")
      .in("id", unique)
      .returns<ProfileRow[]>(),
  ]);

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  const membershipByUser = new Map<string, (typeof memberships extends (infer U)[] | null ? U : never)>();

  for (const row of memberships ?? []) {
    if (!membershipByUser.has(row.id_nguoi_dung)) {
      membershipByUser.set(row.id_nguoi_dung, row);
    }
  }

  for (const uid of unique) {
    const membership = membershipByUser.get(uid);
    const org = membership?.org_to_chuc;
    if (membership && org?.ten && org?.slug) {
      out.set(uid, {
        kind: "org",
        vaiTroLabel: commentVaiTroLabel(membership.vai_tro),
        orgTen: org.ten,
        orgSlug: org.slug,
      });
      continue;
    }
    const profile = profileById.get(uid);
    if (profile?.giai_doan) {
      out.set(uid, {
        kind: "giai_doan",
        label: getGiaiDoanLabel(profile.giai_doan),
      });
      continue;
    }
    out.set(uid, null);
  }

  return out;
}
