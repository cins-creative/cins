import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";

/** Mức thông báo khi theo dõi org cộng đồng (`user_theo_doi.muc_thong_bao`). */
export type OrgNotifyLevel = "tat_ca" | "chi_noi_bat" | "tat";

export const ORG_NOTIFY_DEFAULT: OrgNotifyLevel = "chi_noi_bat";

export type OrgFollowSettings = {
  muc_thong_bao: OrgNotifyLevel;
};

function parseMucThongBao(raw: string | null | undefined): OrgNotifyLevel {
  if (raw === "tat_ca" || raw === "chi_noi_bat" || raw === "tat") return raw;
  return ORG_NOTIFY_DEFAULT;
}

export async function getOrgFollowSettings(
  followerId: string,
  orgId: string,
): Promise<OrgFollowSettings> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("user_theo_doi")
    .select("muc_thong_bao")
    .eq("id_nguoi_theo_doi", followerId)
    .eq("id_doi_tuong", orgId)
    .eq("loai_doi_tuong", "to_chuc")
    .maybeSingle<{ muc_thong_bao: string | null }>();

  if (!data) return { muc_thong_bao: "tat" };
  return { muc_thong_bao: parseMucThongBao(data.muc_thong_bao) };
}

export async function setOrgFollowLevel(
  followerId: string,
  orgId: string,
  mucThongBao: OrgNotifyLevel,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createServiceRoleClient();

  if (mucThongBao === "tat") {
    const { error } = await admin
      .from("user_theo_doi")
      .delete()
      .eq("id_nguoi_theo_doi", followerId)
      .eq("id_doi_tuong", orgId)
      .eq("loai_doi_tuong", "to_chuc");
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  const { data: existing } = await admin
    .from("user_theo_doi")
    .select("id_nguoi_theo_doi")
    .eq("id_nguoi_theo_doi", followerId)
    .eq("id_doi_tuong", orgId)
    .eq("loai_doi_tuong", "to_chuc")
    .maybeSingle();

  if (existing) {
    const { error } = await admin
      .from("user_theo_doi")
      .update({ muc_thong_bao: mucThongBao })
      .eq("id_nguoi_theo_doi", followerId)
      .eq("id_doi_tuong", orgId)
      .eq("loai_doi_tuong", "to_chuc");
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  const { error } = await admin.from("user_theo_doi").insert({
    id_nguoi_theo_doi: followerId,
    id_doi_tuong: orgId,
    loai_doi_tuong: "to_chuc",
    muc_thong_bao: mucThongBao,
  });
  if (error) {
    if (error.code === "23505") {
      const { error: updateErr } = await admin
        .from("user_theo_doi")
        .update({ muc_thong_bao: mucThongBao })
        .eq("id_nguoi_theo_doi", followerId)
        .eq("id_doi_tuong", orgId)
        .eq("loai_doi_tuong", "to_chuc");
      if (updateErr) return { ok: false, error: updateErr.message };
      return { ok: true };
    }
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
