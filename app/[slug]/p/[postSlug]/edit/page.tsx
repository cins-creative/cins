import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { EditorView, type EditorInitial } from "@/components/editor/EditorView";
import {
  MediaComposeView,
  type MediaComposeMode,
} from "@/components/editor/MediaComposeView";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import type { ArticleTagRef } from "@/lib/editor/article-tag";
import type {
  Block,
  LoaiMoc,
  Visibility,
} from "@/lib/editor/types";
import {
  buildMediaEditInitial,
  detectMediaPostKind,
} from "@/lib/journey/post-media";
import { loadCoAuthorsForTacPham } from "@/lib/social/co-author";
import { loadPersonalFilterIdsForCotMoc } from "@/lib/filter/gan";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { sanitizePersistableCoverId } from "@/lib/truong/image-ref";

import "../../new/editor.css";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string; postSlug: string }>;

export const metadata: Metadata = {
  title: "Sửa bài viết · CINS",
  description: "Chỉnh sửa bài viết / cột mốc trên CINs.",
  robots: { index: false, follow: false },
};

type OwnerRow = {
  id: string;
  auth_user_id: string;
  slug: string;
  ten_hien_thi: string | null;
  avatar_id: string | null;
};

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

type LinkRow = {
  id_cot_moc: string;
  thu_tu: number;
};

type CotMocRow = {
  id: string;
  id_nguoi_dung: string;
  loai_moc: LoaiMoc;
  che_do_hien_thi: Visibility | null;
  thoi_diem: string | null;
};

/**
 * Trình chỉnh sửa bài viết — `/[slug]/p/[postSlug]/edit`.
 *
 * Owner-only: load `content_tac_pham` theo `(slug, id_nguoi_dung)`, kèm
 * `content_cot_moc` đầu tiên qua `content_tac_pham_thuoc_moc` (thu_tu ASC).
 * Pass snapshot vào `EditorView` mode "edit" → reuse toàn bộ UI editor.
 */
export default async function EditPostPage({
  params,
}: {
  params: Params;
}) {
  const { slug, postSlug } = await params;

  const session = await getCurrentSessionAndProfile();
  if (!session) {
    redirect(
      `/login?next=${encodeURIComponent(`/${slug}/p/${postSlug}/edit`)}`,
    );
  }

  const admin = createServiceRoleClient();

  /* 1. Owner. */
  const { data: owner, error: ownerErr } = await admin
    .from("user_nguoi_dung")
    .select("id, auth_user_id, slug, ten_hien_thi, avatar_id")
    .eq("slug", slug)
    .maybeSingle<OwnerRow>();

  if (ownerErr || !owner) notFound();
  if (owner.auth_user_id !== session.authUserId) notFound();

  /* 2. Tac_pham theo (slug, id_nguoi_dung). */
  const { data: tp, error: tpErr } = await admin
    .from("content_tac_pham")
    .select(
      "id, id_nguoi_dung, slug, tieu_de, mo_ta, cover_id, che_do_hien_thi, noi_dung_blocks",
    )
    .eq("id_nguoi_dung", owner.id)
    .eq("slug", postSlug)
    .maybeSingle<TacPhamRow>();

  if (tpErr || !tp) notFound();

  /* 3. Cot_moc đầu tiên gắn vào bài (theo thu_tu ASC). */
  const { data: links } = await admin
    .from("content_tac_pham_thuoc_moc")
    .select("id_cot_moc, thu_tu")
    .eq("id_tac_pham", tp.id)
    .order("thu_tu", { ascending: true })
    .limit(1)
    .returns<LinkRow[]>();

  const firstCotMocId = links?.[0]?.id_cot_moc;
  if (!firstCotMocId) notFound();

  const { data: cm, error: cmErr } = await admin
    .from("content_cot_moc")
    .select("id, id_nguoi_dung, loai_moc, che_do_hien_thi, thoi_diem")
    .eq("id", firstCotMocId)
    .maybeSingle<CotMocRow>();

  if (cmErr || !cm) notFound();
  if (cm.id_nguoi_dung !== owner.id) notFound();

  /* 4. Tags = `article_bai_viet` đã gắn qua `article_gan_tac_pham`.
     Embed `article_bai_viet(...)` để 1 round-trip có đủ id/slug/tieu_de
     /loai_bai_viet, đỡ phải in() lần 2. */
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

  /* 5. Co-authors. */
  const tacGiaRows = await loadCoAuthorsForTacPham(tp.id);
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

  /* 6. Build EditorInitial. */
  const blocks = sanitizeBlocks(tp.noi_dung_blocks);
  const personalFilterIds = await loadPersonalFilterIdsForCotMoc(cm.id);

  const initial: EditorInitial = {
    tacPhamId: tp.id,
    cotMocId: cm.id,
    tieuDe: tp.tieu_de ?? "",
    moTa: tp.mo_ta,
    coverSeed: sanitizePersistableCoverId(tp.cover_id, blocks),
    tags,
    visibility: (tp.che_do_hien_thi ?? cm.che_do_hien_thi ?? "public") as Visibility,
    loaiMoc: cm.loai_moc,
    thoiDiem: cm.thoi_diem ?? isoToday(),
    blocks,
    ownerVaiTro: ownerRow?.vaiTro ?? "",
    coAuthors,
    personalFilterIds,
  };

  const mediaKind = detectMediaPostKind(blocks);
  const ownerName = owner.ten_hien_thi || `@${owner.slug}`;

  if (mediaKind === "photo" || mediaKind === "video") {
    const mediaEditInitial = buildMediaEditInitial({
      tacPhamId: tp.id,
      cotMocId: cm.id,
      postSlug,
      tieuDe: tp.tieu_de ?? "",
      visibility: initial.visibility,
      loaiMoc: initial.loaiMoc,
      thoiDiem: initial.thoiDiem,
      blocks,
      kind: mediaKind,
      articleTags: tags,
      personalFilterIds,
    });

    return (
      <MediaComposeView
        mode={mediaKind as MediaComposeMode}
        ownerId={owner.id}
        ownerSlug={owner.slug}
        ownerName={ownerName}
        ownerAvatarId={owner.avatar_id}
        editInitial={mediaEditInitial}
      />
    );
  }

  return (
    <EditorView
      ownerId={owner.id}
      ownerSlug={owner.slug}
      ownerName={ownerName}
      mode="edit"
      initial={initial}
      postSlug={postSlug}
    />
  );
}

/**
 * `noi_dung_blocks` từ DB là `jsonb` (`unknown`). Cast defensive về `Block[]`
 * — server action sẽ re-normalize lần nữa khi save nên không cần strict ở đây.
 */
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
