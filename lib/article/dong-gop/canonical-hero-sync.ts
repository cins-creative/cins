import "server-only";

import { stripHtmlForPreview } from "@/lib/admin/article-preview";
import { stripArticleWrapper } from "@/lib/article/blocks/compile-html";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

import {
  unpackContribNoiDung,
  type ContribHeroMeta,
} from "./contrib-document";

const TOM_TAT_MAX = 280;

/**
 * `tom_tat` trên `article_bai_viet` nuôi hero entity + tooltip tag Journey
 * (`JourneyArticleTagLink` đọc `tom_tat` / `thumb_url`).
 */
export function resolveTomTatForCanonical(
  hero: ContribHeroMeta,
  canonicalBody: string,
): string | null {
  const fromHero = hero.tom_tat.trim().slice(0, TOM_TAT_MAX);
  if (fromHero) return fromHero;
  const plain = stripHtmlForPreview(canonicalBody)
    .slice(0, TOM_TAT_MAX)
    .trim();
  return plain || null;
}

/** Patch cột bài chính từ hero đóng góp — luôn ghi tom_tat khi resolve được. */
export function buildCanonicalArticlePatchFromHero(input: {
  hero: ContribHeroMeta;
  canonicalBody: string;
  idTacGiaChinh: string;
  soNguoiDongGop: number;
  currentMeta: Record<string, unknown> | null;
  ts: string;
}): Record<string, unknown> {
  const {
    hero,
    canonicalBody,
    idTacGiaChinh,
    soNguoiDongGop,
    currentMeta,
    ts,
  } = input;

  const patch: Record<string, unknown> = {
    noi_dung: canonicalBody,
    id_tac_gia_chinh: idTacGiaChinh,
    so_nguoi_dong_gop: soNguoiDongGop,
    cap_nhat_luc: ts,
  };

  if (hero.tieu_de) patch.tieu_de = hero.tieu_de;
  if (hero.tieu_de_viet) patch.tieu_de_viet = hero.tieu_de_viet;
  if (hero.tieu_de_eng) patch.tieu_de_eng = hero.tieu_de_eng;

  const tomTat = resolveTomTatForCanonical(hero, canonicalBody);
  if (tomTat) patch.tom_tat = tomTat;

  if (hero.thumbnail) patch.thumbnail = hero.thumbnail;

  if (hero.video_url) {
    patch.main_video = hero.video_url;
    const prevMeta =
      currentMeta && typeof currentMeta === "object" ? { ...currentMeta } : {};
    patch.meta = { ...prevMeta, video_url: hero.video_url };
  }

  return patch;
}

/**
 * Đồng bộ lại hero + body bài chính từ bản `la_hien_tai`
 * (sửa bài đã promote trước khi sync hero).
 */
export async function syncCanonicalArticleFromCurrentDongGop(
  idBaiViet: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const admin = createServiceRoleClient();

  const { data: current } = await admin
    .from("article_tac_gia")
    .select("id_dong_gop, id_nguoi_dung")
    .eq("id_bai_viet", idBaiViet)
    .eq("la_hien_tai", true)
    .maybeSingle<{ id_dong_gop: string | null; id_nguoi_dung: string }>();

  if (!current?.id_dong_gop) {
    return { ok: false, message: "Không có bản đóng góp hiện tại." };
  }

  const { data: dongGop } = await admin
    .from("article_dong_gop")
    .select("id, id_nguoi_dong_gop, noi_dung")
    .eq("id", current.id_dong_gop)
    .maybeSingle<{
      id: string;
      id_nguoi_dong_gop: string;
      noi_dung: string | null;
    }>();

  if (!dongGop) {
    return { ok: false, message: "Không tìm thấy bản đóng góp." };
  }

  const unpacked = unpackContribNoiDung(dongGop.noi_dung ?? "");
  const canonicalBody = stripArticleWrapper(unpacked.bodyHtml).trim();
  if (!canonicalBody) {
    return { ok: false, message: "Bản không có nội dung." };
  }

  const { data: tacGiaRows } = await admin
    .from("article_tac_gia")
    .select("id_nguoi_dung")
    .eq("id_bai_viet", idBaiViet)
    .returns<Array<{ id_nguoi_dung: string }>>();

  const soNguoiDongGop = new Set(
    (tacGiaRows ?? []).map((r) => r.id_nguoi_dung),
  ).size;

  const { data: currentArticle } = await admin
    .from("article_bai_viet")
    .select("meta")
    .eq("id", idBaiViet)
    .maybeSingle<{ meta: Record<string, unknown> | null }>();

  const patch = buildCanonicalArticlePatchFromHero({
    hero: unpacked.hero,
    canonicalBody,
    idTacGiaChinh: dongGop.id_nguoi_dong_gop,
    soNguoiDongGop,
    currentMeta: currentArticle?.meta ?? null,
    ts: new Date().toISOString(),
  });

  const { error } = await admin
    .from("article_bai_viet")
    .update(patch)
    .eq("id", idBaiViet);

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

/** Backfill mọi bài có bản `la_hien_tai` gắn đóng góp. */
export async function syncAllCanonicalArticlesFromCurrentDongGop(): Promise<{
  synced: number;
  failed: Array<{ idBaiViet: string; message: string }>;
}> {
  const admin = createServiceRoleClient();
  const { data: rows, error } = await admin
    .from("article_tac_gia")
    .select("id_bai_viet")
    .eq("la_hien_tai", true)
    .not("id_dong_gop", "is", null)
    .returns<Array<{ id_bai_viet: string }>>();

  if (error) {
    return {
      synced: 0,
      failed: [{ idBaiViet: "*", message: error.message }],
    };
  }

  const ids = [...new Set((rows ?? []).map((r) => r.id_bai_viet))];
  let synced = 0;
  const failed: Array<{ idBaiViet: string; message: string }> = [];

  for (const idBaiViet of ids) {
    const result = await syncCanonicalArticleFromCurrentDongGop(idBaiViet);
    if (result.ok) synced += 1;
    else failed.push({ idBaiViet, message: result.message });
  }

  return { synced, failed };
}
