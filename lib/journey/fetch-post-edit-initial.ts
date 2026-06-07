import "server-only";

import type { EditorInitial } from "@/components/editor/EditorView";
import type { ArticleTagRef } from "@/lib/editor/article-tag";
import type { Block, LoaiMoc, Visibility } from "@/lib/editor/types";
import { loadCoAuthorsForTacPham } from "@/lib/social/co-author";
import { loadPersonalFilterIdsForCotMoc } from "@/lib/filter/gan";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type TacPhamRow = {
  id: string;
  id_nguoi_dung: string;
  slug: string;
  tieu_de: string | null;
  mo_ta: string | null;
  cover_id: string | null;
  che_do_hien_thi: Visibility | null;
  noi_dung_blocks: unknown;
};

type CotMocRow = {
  id: string;
  id_nguoi_dung: string;
  loai_moc: LoaiMoc;
  che_do_hien_thi: Visibility | null;
  thoi_diem: string | null;
};

export type PostEditInitialResult =
  | {
      ok: true;
      postSlug: string;
      initial: EditorInitial;
    }
  | {
      ok: false;
      error: "not_found" | "forbidden";
    };

function sanitizeBlocks(raw: unknown): Block[] {
  if (!Array.isArray(raw)) return [];
  const out: Block[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const obj = item as Record<string, unknown>;
    if (typeof obj.loai !== "string") continue;
    out.push({
      id: typeof obj.id === "string" ? obj.id : `b-${out.length}`,
      loai: obj.loai as Block["loai"],
      thu_tu: typeof obj.thu_tu === "number" ? obj.thu_tu : out.length,
      config:
        obj.config && typeof obj.config === "object"
          ? (obj.config as Record<string, unknown>)
          : {},
    });
  }
  return out;
}

function isoToday(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export async function fetchPostEditInitial(params: {
  ownerId: string;
  postSlug: string;
}): Promise<PostEditInitialResult> {
  const { ownerId, postSlug } = params;
  const admin = createServiceRoleClient();

  const { data: tp, error: tpErr } = await admin
    .from("content_tac_pham")
    .select(
      "id, id_nguoi_dung, slug, tieu_de, mo_ta, cover_id, che_do_hien_thi, noi_dung_blocks",
    )
    .eq("id_nguoi_dung", ownerId)
    .eq("slug", postSlug)
    .maybeSingle<TacPhamRow>();

  if (tpErr || !tp) return { ok: false, error: "not_found" };
  if (tp.slug !== postSlug) return { ok: false, error: "not_found" };

  const { data: links } = await admin
    .from("content_tac_pham_thuoc_moc")
    .select("id_cot_moc, thu_tu")
    .eq("id_tac_pham", tp.id)
    .order("thu_tu", { ascending: true })
    .limit(1);

  const firstCotMocId = links?.[0]?.id_cot_moc as string | undefined;
  if (!firstCotMocId) return { ok: false, error: "not_found" };

  const { data: cm, error: cmErr } = await admin
    .from("content_cot_moc")
    .select("id, id_nguoi_dung, loai_moc, che_do_hien_thi, thoi_diem")
    .eq("id", firstCotMocId)
    .maybeSingle<CotMocRow>();

  if (cmErr || !cm || cm.id_nguoi_dung !== ownerId) {
    return { ok: false, error: "not_found" };
  }

  const { data: tagRows } = await admin
    .from("article_gan_tac_pham")
    .select("article_bai_viet ( id, slug, tieu_de, loai_bai_viet )")
    .eq("id_tac_pham", tp.id);

  const tags: ArticleTagRef[] = [];
  for (const row of (tagRows ?? []) as Array<{
    article_bai_viet?: {
      id?: string | null;
      slug?: string | null;
      tieu_de?: string | null;
      loai_bai_viet?: string | null;
    } | null;
  }>) {
    const a = row.article_bai_viet;
    if (!a?.id || !a.slug) continue;
    tags.push({
      id: String(a.id),
      slug: String(a.slug),
      tieu_de: String(a.tieu_de ?? "").trim() || "Không tiêu đề",
      loai_bai_viet: String(a.loai_bai_viet ?? "").trim() || "blog",
    });
  }

  const tacGiaRows = await loadCoAuthorsForTacPham(tp.id);
  const personalFilterIds = await loadPersonalFilterIdsForCotMoc(cm.id);
  const ownerRow = tacGiaRows.find((r) => r.laChuSoHuu);
  const coAuthors = tacGiaRows
    .filter((r) => !r.laChuSoHuu && r.trangThai !== "declined")
    .map((r) => ({
      idNguoiDung: r.idNguoiDung,
      slug: r.slug,
      tenHienThi: r.tenHienThi,
      avatarId: r.avatarId,
      vaiTro: r.vaiTro,
    }));

  return {
    ok: true,
    postSlug,
    initial: {
      tacPhamId: tp.id,
      cotMocId: cm.id,
      tieuDe: tp.tieu_de ?? "",
      moTa: tp.mo_ta,
      coverSeed: tp.cover_id,
      tags,
      visibility: (tp.che_do_hien_thi ?? cm.che_do_hien_thi ?? "public") as Visibility,
      loaiMoc: cm.loai_moc,
      thoiDiem: cm.thoi_diem ?? isoToday(),
      blocks: sanitizeBlocks(tp.noi_dung_blocks),
      ownerVaiTro: ownerRow?.vaiTro ?? "",
      coAuthors,
      personalFilterIds,
    },
  };
}
