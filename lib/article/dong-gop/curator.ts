import "server-only";

import { stripArticleWrapper } from "@/lib/article/blocks/compile-html";
import { getCurrentUserIsCinsAdmin } from "@/lib/auth/cins-admin-server";
import { getCurrentUserSystemRole } from "@/lib/auth/system-role";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

import { buildCanonicalArticlePatchFromHero } from "./canonical-hero-sync";
import { unpackContribNoiDung } from "./contrib-document";
import { fetchDongGopById } from "./fetch";
import { notifyContributorOnDongGopFeedback } from "./notify-feedback";
import {
  markCuratorDongGopNotificationsResolved,
  notifyContributorOnDongGopPromote,
} from "./notify-promote";
import type { ArticleQuyenThamDinhRow, PhamViThamDinh, TrangThaiDongGop } from "./types";

export type CuratorMutateResult =
  | { ok: true }
  | { ok: false; message: string };

function nowIso(): string {
  return new Date().toISOString();
}

/** CINS admin/curator toàn cục hoặc scoped row trong article_quyen_tham_dinh. */
export async function canUserCurateArticle(
  idNguoiDung: string,
  idBaiViet: string,
): Promise<boolean> {
  if (await getCurrentUserIsCinsAdmin()) return true;

  const role = await getCurrentUserSystemRole();
  if (role === "curator") {
    const admin = createServiceRoleClient();
    const hasGlobal = await admin
      .from("article_quyen_tham_dinh")
      .select("id")
      .eq("id_nguoi_dung", idNguoiDung)
      .eq("pham_vi", "toan_cuc")
      .eq("da_xoa", false)
      .maybeSingle();
    if (!hasGlobal.error && hasGlobal.data) return true;
  }

  const admin = createServiceRoleClient();

  const { data: byArticle } = await admin
    .from("article_quyen_tham_dinh")
    .select("id")
    .eq("id_nguoi_dung", idNguoiDung)
    .eq("pham_vi", "bai_viet")
    .eq("id_bai_viet", idBaiViet)
    .eq("da_xoa", false)
    .limit(1);
  if ((byArticle?.length ?? 0) > 0) return true;

  const { data: article } = await admin
    .from("article_bai_viet")
    .select("id_linh_vuc")
    .eq("id", idBaiViet)
    .maybeSingle<{ id_linh_vuc: string | null }>();

  if (article?.id_linh_vuc) {
    const { data: byLinhVuc } = await admin
      .from("article_quyen_tham_dinh")
      .select("id")
      .eq("id_nguoi_dung", idNguoiDung)
      .eq("pham_vi", "linh_vuc")
      .eq("id_linh_vuc", article.id_linh_vuc)
      .eq("da_xoa", false)
      .limit(1);
    if ((byLinhVuc?.length ?? 0) > 0) return true;
  }

  return false;
}

export async function resolveCuratorIdsForArticle(
  idBaiViet: string,
): Promise<string[]> {
  const admin = createServiceRoleClient();
  const { data: article } = await admin
    .from("article_bai_viet")
    .select("id, id_linh_vuc")
    .eq("id", idBaiViet)
    .maybeSingle<{ id: string; id_linh_vuc: string | null }>();

  if (!article) return [];

  const ids = new Set<string>();

  const { data: globalRows } = await admin
    .from("article_quyen_tham_dinh")
    .select("id_nguoi_dung")
    .eq("pham_vi", "toan_cuc")
    .eq("da_xoa", false);
  for (const r of globalRows ?? []) ids.add(r.id_nguoi_dung);

  const { data: articleRows } = await admin
    .from("article_quyen_tham_dinh")
    .select("id_nguoi_dung")
    .eq("pham_vi", "bai_viet")
    .eq("id_bai_viet", idBaiViet)
    .eq("da_xoa", false);
  for (const r of articleRows ?? []) ids.add(r.id_nguoi_dung);

  if (article.id_linh_vuc) {
    const { data: lvRows } = await admin
      .from("article_quyen_tham_dinh")
      .select("id_nguoi_dung")
      .eq("pham_vi", "linh_vuc")
      .eq("id_linh_vuc", article.id_linh_vuc)
      .eq("da_xoa", false);
    for (const r of lvRows ?? []) ids.add(r.id_nguoi_dung);
  }

  const { data: sysCurators } = await admin
    .from("user_quyen_he_thong")
    .select("id_nguoi_dung")
    .eq("vai_tro", "curator");
  for (const r of sysCurators ?? []) ids.add(r.id_nguoi_dung);

  const { data: sysAdmins } = await admin
    .from("user_quyen_he_thong")
    .select("id_nguoi_dung")
    .eq("vai_tro", "admin");
  for (const r of sysAdmins ?? []) ids.add(r.id_nguoi_dung);

  return [...ids];
}

export async function grantQuyenThamDinh(input: {
  idNguoiDung: string;
  phamVi: PhamViThamDinh;
  idLinhVuc?: string | null;
  idBaiViet?: string | null;
  capBoi: string;
}): Promise<CuratorMutateResult> {
  const admin = createServiceRoleClient();
  const { error } = await admin.from("article_quyen_tham_dinh").insert({
    id_nguoi_dung: input.idNguoiDung,
    pham_vi: input.phamVi,
    id_linh_vuc: input.idLinhVuc ?? null,
    id_bai_viet: input.idBaiViet ?? null,
    cap_boi: input.capBoi,
  });

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function revokeQuyenThamDinh(
  id: string,
): Promise<CuratorMutateResult> {
  const admin = createServiceRoleClient();
  const { error } = await admin
    .from("article_quyen_tham_dinh")
    .update({ da_xoa: true })
    .eq("id", id);

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function rejectDongGop(input: {
  idDongGop: string;
  idNguoiDuyet: string;
  ghiChu: string;
}): Promise<CuratorMutateResult> {
  const ghiChu = input.ghiChu.trim();
  if (!ghiChu) return { ok: false, message: "Cần ghi chú khi từ chối." };

  const row = await fetchDongGopById(input.idDongGop);
  if (!row || row.trang_thai !== "cho_duyet") {
    return { ok: false, message: "Bản không ở trạng thái chờ duyệt." };
  }

  const allowed = await canUserCurateArticle(input.idNguoiDuyet, row.id_bai_viet);
  if (!allowed) return { ok: false, message: "Bạn không có quyền thẩm định." };

  const admin = createServiceRoleClient();
  const ts = nowIso();
  const { error } = await admin
    .from("article_dong_gop")
    .update({
      trang_thai: "tu_choi" satisfies TrangThaiDongGop,
      ghi_chu_duyet: ghiChu,
      id_nguoi_duyet: input.idNguoiDuyet,
      duyet_luc: ts,
      cap_nhat_luc: ts,
    })
    .eq("id", input.idDongGop);

  if (error) return { ok: false, message: error.message };

  await notifyContributorOnDongGopFeedback({
    idNguoiDung: row.id_nguoi_dong_gop,
    idDongGop: input.idDongGop,
    idBaiViet: row.id_bai_viet,
    action: "tu_choi",
    ghiChu,
  });

  return { ok: true };
}

export async function requestDongGopEdit(input: {
  idDongGop: string;
  idNguoiDuyet: string;
  ghiChu: string;
}): Promise<CuratorMutateResult> {
  const ghiChu = input.ghiChu.trim();
  if (!ghiChu) return { ok: false, message: "Cần ghi chú phản hồi." };

  const row = await fetchDongGopById(input.idDongGop);
  if (!row || row.trang_thai !== "cho_duyet") {
    return { ok: false, message: "Bản không ở trạng thái chờ duyệt." };
  }

  const allowed = await canUserCurateArticle(input.idNguoiDuyet, row.id_bai_viet);
  if (!allowed) return { ok: false, message: "Bạn không có quyền thẩm định." };

  const admin = createServiceRoleClient();
  const ts = nowIso();
  const { error } = await admin
    .from("article_dong_gop")
    .update({
      trang_thai: "can_sua" satisfies TrangThaiDongGop,
      ghi_chu_duyet: ghiChu,
      id_nguoi_duyet: input.idNguoiDuyet,
      duyet_luc: ts,
      cap_nhat_luc: ts,
    })
    .eq("id", input.idDongGop);

  if (error) return { ok: false, message: error.message };

  await notifyContributorOnDongGopFeedback({
    idNguoiDung: row.id_nguoi_dong_gop,
    idDongGop: input.idDongGop,
    idBaiViet: row.id_bai_viet,
    action: "can_sua",
    ghiChu,
  });

  return { ok: true };
}

export type PromoteDongGopResult = CuratorMutateResult;

export async function promoteDongGopToCanonical(input: {
  idDongGop: string;
  idNguoiDuyet: string;
}): Promise<PromoteDongGopResult> {
  const row = await fetchDongGopById(input.idDongGop);
  if (!row || row.trang_thai !== "cho_duyet") {
    return { ok: false, message: "Bản không ở trạng thái chờ duyệt." };
  }

  const unpacked = unpackContribNoiDung(row.noi_dung ?? "");
  const canonicalBody = stripArticleWrapper(unpacked.bodyHtml).trim();
  if (!canonicalBody) {
    return { ok: false, message: "Bản không có nội dung." };
  }

  const allowed = await canUserCurateArticle(input.idNguoiDuyet, row.id_bai_viet);
  if (!allowed) return { ok: false, message: "Bạn không có quyền thẩm định." };

  const admin = createServiceRoleClient();
  const ts = nowIso();

  const { data: prevCurrent } = await admin
    .from("article_tac_gia")
    .select("id, id_dong_gop")
    .eq("id_bai_viet", row.id_bai_viet)
    .eq("la_hien_tai", true)
    .maybeSingle<{ id: string; id_dong_gop: string | null }>();

  if (prevCurrent?.id) {
    await admin
      .from("article_tac_gia")
      .update({ la_hien_tai: false })
      .eq("id", prevCurrent.id);

    if (prevCurrent.id_dong_gop && prevCurrent.id_dong_gop !== row.id) {
      await admin
        .from("article_dong_gop")
        .update({
          trang_thai: "duoc_duyet" satisfies TrangThaiDongGop,
          cap_nhat_luc: ts,
          hien_thi: true,
        })
        .eq("id", prevCurrent.id_dong_gop);
    }
  }

  const { error: dongGopErr } = await admin
    .from("article_dong_gop")
    .update({
      trang_thai: "duoc_duyet",
      id_nguoi_duyet: input.idNguoiDuyet,
      duyet_luc: ts,
      cap_nhat_luc: ts,
      hien_thi: true,
    })
    .eq("id", input.idDongGop);

  if (dongGopErr) return { ok: false, message: dongGopErr.message };

  const { error: tacGiaErr } = await admin.from("article_tac_gia").insert({
    id_bai_viet: row.id_bai_viet,
    id_nguoi_dung: row.id_nguoi_dong_gop,
    id_dong_gop: row.id,
    vai_tro: "tac_gia_chinh",
    la_hien_tai: true,
  });

  if (tacGiaErr) return { ok: false, message: tacGiaErr.message };

  const { data: tacGiaRows } = await admin
    .from("article_tac_gia")
    .select("id_nguoi_dung")
    .eq("id_bai_viet", row.id_bai_viet)
    .returns<Array<{ id_nguoi_dung: string }>>();

  const soNguoiDongGop = new Set(
    (tacGiaRows ?? []).map((r) => r.id_nguoi_dung),
  ).size;

  const { data: currentArticle } = await admin
    .from("article_bai_viet")
    .select("meta")
    .eq("id", row.id_bai_viet)
    .maybeSingle<{ meta: Record<string, unknown> | null }>();

  /** Hero (tom_tat / thumbnail / tiêu đề) → article_bai_viet — nuôi ent-hero + tooltip tag Journey. */
  const articlePatch = buildCanonicalArticlePatchFromHero({
    hero: unpacked.hero,
    canonicalBody,
    idTacGiaChinh: row.id_nguoi_dong_gop,
    soNguoiDongGop,
    currentMeta: currentArticle?.meta ?? null,
    ts,
  });

  const { error: articleErr } = await admin
    .from("article_bai_viet")
    .update(articlePatch)
    .eq("id", row.id_bai_viet);

  if (articleErr) return { ok: false, message: articleErr.message };

  await markCuratorDongGopNotificationsResolved(row.id);
  await notifyContributorOnDongGopPromote({
    idNguoiDung: row.id_nguoi_dong_gop,
    idDongGop: row.id,
    idBaiViet: row.id_bai_viet,
  });

  return { ok: true };
}

export async function listQuyenThamDinh(): Promise<ArticleQuyenThamDinhRow[]> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("article_quyen_tham_dinh")
    .select(
      "id, id_nguoi_dung, pham_vi, id_linh_vuc, id_bai_viet, cap_boi, tao_luc, da_xoa",
    )
    .eq("da_xoa", false)
    .order("tao_luc", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as ArticleQuyenThamDinhRow[];
}
