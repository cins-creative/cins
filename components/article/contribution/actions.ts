"use server";

import { revalidatePath } from "next/cache";

import { fetchDongGopById } from "@/lib/article/dong-gop/fetch";
import { notifyCuratorsOnDongGopSubmit } from "@/lib/article/dong-gop/notify-curators";
import {
  unpackContribNoiDung,
  type ContribHeroMeta,
} from "@/lib/article/dong-gop/contrib-document";
import {
  hideDongGopByOwner,
  showDongGopByOwner,
  submitDongGopForReview,
  upsertDongGopDraft,
} from "@/lib/article/dong-gop/mutate";
import {
  canContributorEditDongGop,
  canContributorSubmitDongGop,
  type TrangThaiDongGop,
} from "@/lib/article/dong-gop/types";
import { articlePublicHref } from "@/lib/articles/article-href";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { hasServiceRoleEnv, createServiceRoleClient } from "@/lib/supabase/service-role";

async function assertContributor(): Promise<
  { ok: true; profileId: string } | { ok: false; message: string }
> {
  if (!hasServiceRoleEnv()) {
    return {
      ok: false,
      message: "Hệ thống chưa sẵn sàng lưu bản đóng góp.",
    };
  }

  const session = await getCurrentSessionAndProfile();
  if (!session?.profile?.id) {
    return { ok: false, message: "Cần đăng nhập để đóng góp." };
  }

  return { ok: true, profileId: session.profile.id };
}

async function revalidateEntityByBaiViet(idBaiViet: string) {
  const admin = createServiceRoleClient();
  const { data: article } = await admin
    .from("article_bai_viet")
    .select("slug, loai_bai_viet")
    .eq("id", idBaiViet)
    .maybeSingle<{ slug: string; loai_bai_viet: string }>();

  if (article?.slug) {
    revalidatePath(articlePublicHref(article.loai_bai_viet, article.slug));
  }
}

async function revalidateEntityByDongGop(idDongGop: string) {
  const row = await fetchDongGopById(idDongGop);
  if (!row) return;
  await revalidateEntityByBaiViet(row.id_bai_viet);
}

export async function saveContributionDraftAction(input: {
  idBaiViet: string;
  noiDung: string;
}): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const gate = await assertContributor();
  if (!gate.ok) return gate;

  const result = await upsertDongGopDraft({
    idBaiViet: input.idBaiViet,
    idNguoiDung: gate.profileId,
    noiDung: input.noiDung,
  });

  if (!result.ok) return result;

  await revalidateEntityByBaiViet(input.idBaiViet);
  return { ok: true, id: result.data!.id };
}

export async function submitContributionDraftAction(input: {
  idDongGop?: string;
  idBaiViet: string;
  noiDung: string;
}): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const gate = await assertContributor();
  if (!gate.ok) return gate;

  const saveResult = await upsertDongGopDraft({
    idBaiViet: input.idBaiViet,
    idNguoiDung: gate.profileId,
    noiDung: input.noiDung,
  });
  if (!saveResult.ok) return saveResult;

  const idDongGop = input.idDongGop ?? saveResult.data!.id;
  const submitResult = await submitDongGopForReview({
    idDongGop,
    idNguoiDung: gate.profileId,
  });
  if (!submitResult.ok) return submitResult;

  await notifyCuratorsOnDongGopSubmit(idDongGop);

  await revalidateEntityByDongGop(idDongGop);
  return { ok: true, id: idDongGop };
}

async function assertOwnerContribution(): Promise<
  { ok: true; profileId: string } | { ok: false; message: string }
> {
  const gate = await assertContributor();
  if (!gate.ok) return gate;
  return gate;
}

export async function hideContributionAction(input: {
  idDongGop: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const gate = await assertOwnerContribution();
  if (!gate.ok) return gate;

  const result = await hideDongGopByOwner({
    idDongGop: input.idDongGop,
    idNguoiDung: gate.profileId,
  });
  if (!result.ok) return result;

  await revalidateEntityByDongGop(input.idDongGop);
  return { ok: true };
}

export async function showContributionAction(input: {
  idDongGop: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const gate = await assertOwnerContribution();
  if (!gate.ok) return gate;

  const result = await showDongGopByOwner({
    idDongGop: input.idDongGop,
    idNguoiDung: gate.profileId,
  });
  if (!result.ok) return result;

  await revalidateEntityByDongGop(input.idDongGop);
  return { ok: true };
}

export type OwnContributionEditorPayload = {
  idBaiViet: string;
  idDongGop: string;
  articleTitle: string;
  loaiBaiViet: string;
  contributionCount: number;
  initialNoiDung: string;
  initialHero: ContribHeroMeta;
  trangThai: TrangThaiDongGop;
  ghiChuDuyet: string | null;
  canEdit: boolean;
  canSubmit: boolean;
};

/** Banner Journey/Home — mở popup soạn đóng góp của chính viewer. */
export async function loadOwnContributionEditorAction(input: {
  idDongGop: string;
}): Promise<
  | { ok: true; editor: OwnContributionEditorPayload }
  | { ok: false; message: string }
> {
  const gate = await assertContributor();
  if (!gate.ok) return gate;

  const row = await fetchDongGopById(input.idDongGop);
  if (!row || row.id_nguoi_dong_gop !== gate.profileId) {
    return { ok: false, message: "Không tìm thấy bản đóng góp của bạn." };
  }

  const admin = createServiceRoleClient();
  const [{ data: article }, { count }] = await Promise.all([
    admin
      .from("article_bai_viet")
      .select("slug, tieu_de, loai_bai_viet")
      .eq("id", row.id_bai_viet)
      .maybeSingle<{ slug: string; tieu_de: string; loai_bai_viet: string }>(),
    admin
      .from("article_dong_gop")
      .select("id", { count: "exact", head: true })
      .eq("id_bai_viet", row.id_bai_viet)
      .eq("da_xoa", false)
      .eq("hien_thi", true),
  ]);

  if (!article?.slug) {
    return { ok: false, message: "Không tìm thấy bài viết liên quan." };
  }

  const noiDung = row.noi_dung ?? "";
  const unpacked = unpackContribNoiDung(noiDung);

  return {
    ok: true,
    editor: {
      idBaiViet: row.id_bai_viet,
      idDongGop: row.id,
      articleTitle: article.tieu_de,
      loaiBaiViet: article.loai_bai_viet,
      contributionCount: count ?? 0,
      initialNoiDung: noiDung,
      initialHero: unpacked.hero,
      trangThai: row.trang_thai,
      ghiChuDuyet: row.ghi_chu_duyet?.trim() || null,
      canEdit: canContributorEditDongGop(row.trang_thai),
      canSubmit: canContributorSubmitDongGop(row.trang_thai),
    },
  };
}
