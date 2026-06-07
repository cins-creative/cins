import "server-only";

import { revalidatePath } from "next/cache";

import { articlePublicHref } from "@/lib/articles/article-href";
import { normalizeTagName } from "@/lib/tag/normalize";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const TAG_LOAI = new Set(["keyword", "phan_mem"]);

type TagRow = {
  id: string;
  tieu_de: string;
  slug: string;
  loai_bai_viet: string;
  trang_thai_noi_dung: string | null;
};

async function loadTag(
  admin: ReturnType<typeof createServiceRoleClient>,
  id: string,
): Promise<TagRow | null> {
  const { data } = await admin
    .from("article_bai_viet")
    .select("id, tieu_de, slug, loai_bai_viet, trang_thai_noi_dung")
    .eq("id", id)
    .maybeSingle<TagRow>();
  return data ?? null;
}

async function transferJunction(
  admin: ReturnType<typeof createServiceRoleClient>,
  table: "article_gan_cot_moc" | "article_gan_tac_pham" | "article_gan_du_an",
  idCol: "id_cot_moc" | "id_tac_pham" | "id_du_an",
  idGiu: string,
  idGop: string,
): Promise<void> {
  const { data: gopRows } = await admin
    .from(table)
    .select(idCol)
    .eq("id_bai_viet", idGop);

  if (!gopRows?.length) return;

  const { data: giuRows } = await admin
    .from(table)
    .select(idCol)
    .eq("id_bai_viet", idGiu);

  const giuKeys = new Set(
    (giuRows ?? []).map((r) =>
      String((r as Record<string, unknown>)[idCol] ?? ""),
    ),
  );

  for (const row of gopRows) {
    const key = String((row as Record<string, unknown>)[idCol] ?? "");
    if (!key) continue;
    if (giuKeys.has(key)) {
      await admin
        .from(table)
        .delete()
        .eq("id_bai_viet", idGop)
        .eq(idCol, key);
    } else {
      await admin
        .from(table)
        .update({ id_bai_viet: idGiu })
        .eq("id_bai_viet", idGop)
        .eq(idCol, key);
      giuKeys.add(key);
    }
  }

  await admin.from(table).delete().eq("id_bai_viet", idGop);
}

/**
 * Gộp tag `id_gop` vào `id_giu` — alias + chuyển junction + soft-archive.
 */
export async function mergeAdminTags(
  idGiu: string,
  idGop: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const giu = idGiu.trim();
  const gop = idGop.trim();
  if (!giu || !gop) {
    return { ok: false, error: "Thiếu id tag." };
  }
  if (giu === gop) {
    return { ok: false, error: "Không thể gộp tag vào chính nó." };
  }

  const admin = createServiceRoleClient();
  const [keep, merge] = await Promise.all([loadTag(admin, giu), loadTag(admin, gop)]);

  if (!keep || !merge) {
    return { ok: false, error: "Tag không tồn tại." };
  }
  if (!TAG_LOAI.has(keep.loai_bai_viet) || !TAG_LOAI.has(merge.loai_bai_viet)) {
    return { ok: false, error: "Chỉ gộp tag keyword/phan_mem." };
  }
  if (keep.loai_bai_viet !== merge.loai_bai_viet) {
    return { ok: false, error: "Chỉ gộp tag cùng loại." };
  }
  if (merge.trang_thai_noi_dung === "merged") {
    return { ok: false, error: "Tag nguồn đã được gộp trước đó." };
  }

  const alias = normalizeTagName(merge.tieu_de);
  if (alias) {
    const { error: aliasErr } = await admin.from("article_alias").upsert(
      {
        ten_alias: alias,
        id_bai_viet: giu,
      },
      { onConflict: "ten_alias" },
    );
    if (aliasErr) {
      console.error("[admin/tag/merge] alias:", aliasErr.message);
      return { ok: false, error: "Không thêm được alias." };
    }
  }

  await transferJunction(admin, "article_gan_cot_moc", "id_cot_moc", giu, gop);
  await transferJunction(admin, "article_gan_tac_pham", "id_tac_pham", giu, gop);
  await transferJunction(admin, "article_gan_du_an", "id_du_an", giu, gop);

  const now = new Date().toISOString();
  const { error: archiveErr } = await admin
    .from("article_bai_viet")
    .update({
      trang_thai_noi_dung: "merged",
      merged_vao_id: giu,
      cap_nhat_luc: now,
    })
    .eq("id", gop);

  if (archiveErr) {
    console.error("[admin/tag/merge] archive:", archiveErr.message);
    return { ok: false, error: "Không archive tag nguồn." };
  }

  revalidatePath(articlePublicHref(keep.loai_bai_viet, keep.slug));
  revalidatePath(articlePublicHref(merge.loai_bai_viet, merge.slug));

  return { ok: true };
}
