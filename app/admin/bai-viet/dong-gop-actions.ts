"use server";

import {
  canUserCurateArticle,
  promoteDongGopToCanonical,
  rejectDongGop,
  requestDongGopEdit,
} from "@/lib/article/dong-gop/curator";
import {
  grantCuratorQuyen,
  resolveArticleIdBySlug,
  resolveUserIdBySlug,
  revokeCuratorQuyenById,
} from "@/lib/article/dong-gop/admin-curator";
import { listDongGopForAdmin } from "@/lib/article/dong-gop/admin-list";
import {
  syncCanonicalArticleFromCurrentDongGop,
  syncAllCanonicalArticlesFromCurrentDongGop,
} from "@/lib/article/dong-gop/canonical-hero-sync";
import { fetchDongGopById } from "@/lib/article/dong-gop/fetch";
import {
  revalidateAfterDongGopMutation,
  revalidateEntityArticlePaths,
} from "@/lib/article/dong-gop/revalidate-entity";
import type {
  AdminDongGopRow,
  PhamViThamDinh,
} from "@/lib/article/dong-gop/types";
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

async function assertCuratorGrantAdmin(): Promise<
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

  return { ok: true, profileId: session.profile.id };
}

export async function adminGrantCuratorQuyen(input: {
  userSlug: string;
  phamVi: PhamViThamDinh;
  idLinhVuc?: string | null;
  articleSlug?: string | null;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const gate = await assertCuratorGrantAdmin();
  if (!gate.ok) return gate;

  const user = await resolveUserIdBySlug(input.userSlug);
  if (!user) {
    return { ok: false, message: "Không tìm thấy user theo slug." };
  }

  let idBaiViet: string | null = null;
  if (input.phamVi === "bai_viet") {
    const article = await resolveArticleIdBySlug(input.articleSlug ?? "");
    if (!article) {
      return { ok: false, message: "Không tìm thấy entity theo slug." };
    }
    idBaiViet = article.id;
  }

  const result = await grantCuratorQuyen({
    idNguoiDung: user.id,
    phamVi: input.phamVi,
    idLinhVuc: input.idLinhVuc ?? null,
    idBaiViet,
    capBoi: gate.profileId,
  });

  if (!result.ok) return result;
  return { ok: true };
}

export async function adminRevokeCuratorQuyen(input: {
  id: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const gate = await assertCuratorGrantAdmin();
  if (!gate.ok) return gate;

  const result = await revokeCuratorQuyenById(input.id);
  if (!result.ok) return result;
  return { ok: true };
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

  await revalidateAfterDongGopMutation(input.id);
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

  await revalidateAfterDongGopMutation(input.id);
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

  await revalidateAfterDongGopMutation(input.id);
  return { ok: true };
}

export async function adminListDongGopForBaiViet(input: {
  idBaiViet: string;
}): Promise<
  | { ok: true; items: AdminDongGopRow[] }
  | { ok: false; message: string }
> {
  const gate = await assertAdminCurator(input.idBaiViet);
  if (!gate.ok) return gate;

  const items = await listDongGopForAdmin({ idBaiViet: input.idBaiViet });
  return { ok: true, items };
}

/** Đồng bộ lại hero bài chính từ bản đóng góp hiện tại (tooltip Journey + ent-hero). */
export async function adminResyncCanonicalHero(input: {
  idBaiViet: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const gate = await assertAdminCurator(input.idBaiViet);
  if (!gate.ok) return gate;

  const result = await syncCanonicalArticleFromCurrentDongGop(input.idBaiViet);
  if (!result.ok) return result;

  await revalidateEntityArticlePaths(input.idBaiViet);
  return { ok: true };
}

/** Backfill mọi bài có la_hien_tai — chỉ CINS admin. */
export async function adminResyncAllCanonicalHero(): Promise<
  | { ok: true; synced: number; failed: number }
  | { ok: false; message: string }
> {
  if (!hasServiceRoleEnv()) {
    return { ok: false, message: "Thiếu SUPABASE_SERVICE_ROLE_KEY trên server." };
  }
  if (!(await getCurrentUserIsCinsAdmin())) {
    return { ok: false, message: "Chỉ CINS admin được chạy backfill." };
  }

  const { synced, failed } = await syncAllCanonicalArticlesFromCurrentDongGop();
  return { ok: true, synced, failed: failed.length };
}
