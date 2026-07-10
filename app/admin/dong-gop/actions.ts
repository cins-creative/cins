"use server";

import { revalidatePath } from "next/cache";

import {
  canUserCurateArticle,
  promoteDongGopToCanonical,
  rejectDongGop,
  requestDongGopEdit,
} from "@/lib/article/dong-gop/curator";
import { fetchDongGopById } from "@/lib/article/dong-gop/fetch";
import { articlePublicHref } from "@/lib/articles/article-href";
import { getCurrentUserIsCinsAdmin } from "@/lib/auth/cins-admin-server";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  canAccessAdminPanel,
  getCurrentUserSystemRole,
} from "@/lib/auth/system-role";
import { hasServiceRoleEnv } from "@/lib/supabase/service-role";

async function assertAdminCurator(
  idBaiViet: string,
): Promise<
  | { ok: true; profileId: string }
  | { ok: false; message: string }
> {
  if (!hasServiceRoleEnv()) {
    return { ok: false, message: "Thiếu SUPABASE_SERVICE_ROLE_KEY trên server." };
  }

  const role = await getCurrentUserSystemRole();
  if (!canAccessAdminPanel(role)) {
    return { ok: false, message: "Không có quyền truy cập admin." };
  }

  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return { ok: false, message: "Cần đăng nhập." };
  }

  const isCinsAdmin = await getCurrentUserIsCinsAdmin();
  const canCurate = await canUserCurateArticle(session.profile.id, idBaiViet);
  if (!isCinsAdmin && !canCurate && role !== "curator") {
    return { ok: false, message: "Bạn không có quyền thẩm định bài này." };
  }

  return { ok: true, profileId: session.profile.id };
}

async function revalidateAfterDongGop(idDongGop: string) {
  const row = await fetchDongGopById(idDongGop);
  if (!row) return;

  revalidatePath("/admin/dong-gop");

  const { createServiceRoleClient } = await import("@/lib/supabase/service-role");
  const admin = createServiceRoleClient();
  const { data: article } = await admin
    .from("article_bai_viet")
    .select("slug, loai_bai_viet")
    .eq("id", row.id_bai_viet)
    .maybeSingle<{ slug: string; loai_bai_viet: string }>();

  if (article?.slug) {
    revalidatePath(articlePublicHref(article.loai_bai_viet, article.slug));
  }
}

export async function adminPromoteDongGop(input: {
  id: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const row = await fetchDongGopById(input.id);
  if (!row) return { ok: false, message: "Không tìm thấy bản đóng góp." };

  const gate = await assertAdminCurator(row.id_bai_viet);
  if (!gate.ok) return gate;

  const result = await promoteDongGopToCanonical({
    idDongGop: input.id,
    idNguoiDuyet: gate.profileId,
  });
  if (!result.ok) return result;

  await revalidateAfterDongGop(input.id);
  return { ok: true };
}

export async function adminRejectDongGop(input: {
  id: string;
  ghiChu: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const row = await fetchDongGopById(input.id);
  if (!row) return { ok: false, message: "Không tìm thấy bản đóng góp." };

  const gate = await assertAdminCurator(row.id_bai_viet);
  if (!gate.ok) return gate;

  const result = await rejectDongGop({
    idDongGop: input.id,
    idNguoiDuyet: gate.profileId,
    ghiChu: input.ghiChu,
  });
  if (!result.ok) return result;

  await revalidateAfterDongGop(input.id);
  return { ok: true };
}

export async function adminRequestDongGopEdit(input: {
  id: string;
  ghiChu: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const row = await fetchDongGopById(input.id);
  if (!row) return { ok: false, message: "Không tìm thấy bản đóng góp." };

  const gate = await assertAdminCurator(row.id_bai_viet);
  if (!gate.ok) return gate;

  const result = await requestDongGopEdit({
    idDongGop: input.id,
    idNguoiDuyet: gate.profileId,
    ghiChu: input.ghiChu,
  });
  if (!result.ok) return result;

  await revalidateAfterDongGop(input.id);
  return { ok: true };
}
