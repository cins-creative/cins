import "server-only";

import { unstable_cache } from "next/cache";

import { cfDeliveryUrl } from "@/lib/editor/resolve-image-seed-url";
import { shopLoaiHref, shopSlugFromTen } from "@/lib/shop/cua-hang-href";
import { shopImageUrl } from "@/lib/shop/settings";
import {
  extractPhotoGridImagesFromBlocks,
  isPortraitGridImage,
} from "@/lib/journey/image-grid";
import { journeyImageFields } from "@/lib/journey/images";
import { parseServerBlocks } from "@/lib/journey/parse-server-blocks";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { studioBaiDangPostPath } from "@/lib/to-chuc/studio-routes";
import {
  isCfImageUuid,
  isExternalHttpImageRef,
  isTemporaryImageRef,
} from "@/lib/truong/image-ref";

/** Pool cố định — client infinite-loop các ô này, không kéo hết gallery/shop. */
const STAGE_ART_USER_SLUGS = ["basakila"] as const;
const STAGE_ART_CAP = 4;
const STAGE_ART_USER_CAP = 3;
const STAGE_ART_USER_SCAN = 8;
const STAGE_ART_STUDIO_CAP = 2;
const STAGE_ART_STUDIO_SCAN = 4;
const STAGE_PRODUCT_CAP = 4;
const STAGE_PRODUCT_SCAN = 8;
const STAGE_MIX_CAP = 8;
const STAGE_PRIORITY_IMAGES = 2;
const PORTRAIT_FALLBACK_RATIO = "3 / 4";
const PRODUCT_FALLBACK_RATIO = "1 / 1";
const STAGE_IMAGE_SIZES = "(max-width: 1099px) 32vw, 18vw";

export type GuestHomeStageKeywordTone =
  | "blue"
  | "mint"
  | "orange"
  | "violet"
  | "yellow";

export type GuestHomeStageMasonryItem = {
  id: string;
  kind: "art" | "product" | "keyword";
  title: string;
  imageSrc: string | null;
  imageSrcSet?: string | null;
  imageSizes?: string | null;
  href: string | null;
  aspectRatio: string;
  priceLabel?: string | null;
  tone?: GuestHomeStageKeywordTone;
  kicker?: string | null;
  /** 1–2 ảnh above-the-fold — eager + fetchpriority high. */
  priority?: boolean;
};

type ArtCandidate = {
  id: string;
  title: string;
  imageSrc: string;
  href: string | null;
  width: number;
  height: number;
  portrait: boolean;
  imageSrcSet?: string;
};

function aspectRatioCss(
  width: number,
  height: number,
  fallback: string,
): string {
  if (width > 0 && height > 0) return `${width} / ${height}`;
  return fallback;
}

function formatStagePrice(gia: number | null | undefined): string | null {
  if (gia == null || !Number.isFinite(gia) || gia < 0) return null;
  return `${Math.round(gia).toLocaleString("vi-VN")} ₫`;
}

function parseGia(raw: number | string | null | undefined): number | null {
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function isPortraitThumb(width: number, height: number): boolean {
  if (width > 0 && height > 0) return height > width;
  return false;
}

/** Ô stage nhỏ — `gridsm`/`grid`, không `/public`. */
function stageArtDelivery(seed: string): { src: string; srcSet?: string } | null {
  const trimmed = seed.trim();
  if (!trimmed) return null;
  if (isTemporaryImageRef(trimmed) || isExternalHttpImageRef(trimmed)) {
    return { src: trimmed };
  }
  if (!isCfImageUuid(trimmed)) return null;

  const gridsm = cfDeliveryUrl(trimmed, "gridsm");
  const grid = cfDeliveryUrl(trimmed, "grid");
  const thumbnail = cfDeliveryUrl(trimmed, "thumbnail");
  const src = gridsm ?? grid ?? thumbnail;
  if (!src) return null;

  const srcSetParts: string[] = [];
  if (gridsm) srcSetParts.push(`${gridsm} 400w`);
  if (grid) srcSetParts.push(`${grid} 640w`);
  return {
    src,
    srcSet: srcSetParts.length > 1 ? srcSetParts.join(", ") : undefined,
  };
}

function artFromPost(input: {
  id: string;
  title: string;
  href: string | null;
  coverId: string | null;
  blocksRaw: unknown;
}): ArtCandidate | null {
  const blocks = parseServerBlocks(input.blocksRaw) ?? [];
  const images = extractPhotoGridImagesFromBlocks(blocks);
  const portraitImg = images.find((img) => isPortraitGridImage(img));
  const firstImg = portraitImg ?? images[0];
  if (firstImg) {
    const asset = stageArtDelivery(firstImg.id);
    const src = asset?.src?.trim();
    if (src) {
      return {
        id: input.id,
        title: input.title,
        imageSrc: src,
        href: input.href,
        width: firstImg.width,
        height: firstImg.height,
        portrait: isPortraitGridImage(firstImg),
        imageSrcSet: asset?.srcSet,
      };
    }
  }

  const coverId = input.coverId?.trim();
  if (!coverId) return null;
  const fromStage = stageArtDelivery(coverId);
  const img = fromStage
    ? { src: fromStage.src, srcSet: fromStage.srcSet, width: 0, height: 0 }
    : journeyImageFields(coverId, "gallery-grid");
  if (!img?.src) return null;
  return {
    id: input.id,
    title: input.title,
    imageSrc: img.src,
    href: input.href,
    width: img.width ?? 0,
    height: img.height ?? 0,
    portrait: isPortraitThumb(img.width ?? 0, img.height ?? 0),
    imageSrcSet: img.srcSet,
  };
}

function candidatesToArtItems(
  candidates: ArtCandidate[],
): GuestHomeStageMasonryItem[] {
  const seen = new Set<string>();
  const unique: ArtCandidate[] = [];
  for (const item of candidates) {
    if (seen.has(item.id) || seen.has(item.imageSrc)) continue;
    seen.add(item.id);
    seen.add(item.imageSrc);
    unique.push(item);
  }

  const portrait = unique.filter((item) => item.portrait);
  const landscape = unique.filter((item) => !item.portrait);
  return [...portrait, ...landscape].map((item) => ({
    id: item.id,
    kind: "art" as const,
    title: item.title,
    imageSrc: item.imageSrc,
    imageSrcSet: item.imageSrcSet,
    imageSizes: item.imageSrcSet ? STAGE_IMAGE_SIZES : null,
    href: item.href,
    aspectRatio: aspectRatioCss(
      item.width,
      item.height,
      PORTRAIT_FALLBACK_RATIO,
    ),
  }));
}

async function fetchUserStageArt(
  admin: ReturnType<typeof createServiceRoleClient>,
  slug: string,
): Promise<ArtCandidate[]> {
  const { data: owner, error } = await admin
    .from("user_nguoi_dung")
    .select("id, slug")
    .eq("slug", slug)
    .maybeSingle<{ id: string; slug: string | null }>();

  if (error || !owner?.id) return [];

  const ownerSlug = owner.slug?.trim() || slug;
  const { data: posts } = await admin
    .from("content_tac_pham")
    .select("id, slug, tieu_de, cover_id, noi_dung_blocks")
    .eq("id_nguoi_dung", owner.id)
    .eq("che_do_hien_thi", "public")
    .order("tao_luc", { ascending: false })
    .limit(STAGE_ART_USER_SCAN)
    .returns<
      Array<{
        id: string;
        slug: string | null;
        tieu_de: string | null;
        cover_id: string | null;
        noi_dung_blocks: unknown;
      }>
    >();

  const out: ArtCandidate[] = [];
  for (const post of posts ?? []) {
    const art = artFromPost({
      id: `art-${ownerSlug}-${post.id}`,
      title: post.tieu_de?.trim() || "Tác phẩm",
      href:
        post.slug?.trim()
          ? `/${encodeURIComponent(ownerSlug)}/p/${encodeURIComponent(post.slug.trim())}`
          : null,
      coverId: post.cover_id,
      blocksRaw: post.noi_dung_blocks,
    });
    if (!art) continue;
    out.push(art);
    if (out.length >= STAGE_ART_USER_CAP) break;
  }
  return out;
}

function scoreTreeStudio(ten: string, slug: string): number {
  const t = ten.toLowerCase();
  const s = slug.toLowerCase();
  if (s === "tree" || s === "tree-studio" || t === "tree" || t === "tree studio") {
    return 4;
  }
  if (
    (s.includes("tree") && s.includes("studio")) ||
    (t.includes("tree") && t.includes("studio"))
  ) {
    return 3;
  }
  if (s.includes("tree") || t.includes("tree")) return 2;
  return 0;
}

async function fetchTreeStudioStageArt(
  admin: ReturnType<typeof createServiceRoleClient>,
): Promise<ArtCandidate[]> {
  const { data: orgs } = await admin
    .from("org_to_chuc")
    .select("id, slug, ten")
    .eq("loai_to_chuc", "studio")
    .or("slug.ilike.%tree%,ten.ilike.%tree%")
    .limit(8)
    .returns<Array<{ id: string; slug: string; ten: string | null }>>();

  if (!orgs?.length) return [];

  const studio = [...orgs]
    .map((org) => ({
      ...org,
      score: scoreTreeStudio(org.ten?.trim() || "", org.slug),
    }))
    .sort((a, b) => b.score - a.score)[0];
  if (!studio || studio.score <= 0) return [];

  const { data: posts } = await admin
    .from("org_bai_dang")
    .select("id, tieu_de, cover_id, noi_dung_blocks")
    .eq("id_to_chuc", studio.id)
    .eq("trang_thai", "da_dang")
    .order("tao_luc", { ascending: false })
    .limit(STAGE_ART_STUDIO_SCAN)
    .returns<
      Array<{
        id: string;
        tieu_de: string | null;
        cover_id: string | null;
        noi_dung_blocks: unknown;
      }>
    >();

  const out: ArtCandidate[] = [];
  for (const post of posts ?? []) {
    const art = artFromPost({
      id: `art-studio-${post.id}`,
      title: post.tieu_de?.trim() || studio.ten?.trim() || "Tác phẩm",
      href: studioBaiDangPostPath(studio.slug, post.id),
      coverId: post.cover_id,
      blocksRaw: post.noi_dung_blocks,
    });
    if (!art) continue;
    out.push(art);
    if (out.length >= STAGE_ART_STUDIO_CAP) break;
  }
  return out;
}

async function fetchStageArtworks(): Promise<GuestHomeStageMasonryItem[]> {
  if (!hasSupabaseEnv()) return [];

  try {
    const admin = createServiceRoleClient();
    const [userBatches, studio] = await Promise.all([
      Promise.all(
        STAGE_ART_USER_SLUGS.map((slug) => fetchUserStageArt(admin, slug)),
      ),
      fetchTreeStudioStageArt(admin),
    ]);

    return candidatesToArtItems([...userBatches.flat(), ...studio]).slice(
      0,
      STAGE_ART_CAP,
    );
  } catch {
    return [];
  }
}

async function fetchStageProducts(): Promise<GuestHomeStageMasonryItem[]> {
  if (!hasSupabaseEnv()) return [];

  try {
    const admin = createServiceRoleClient();
    const { data: nhoms, error: nhomErr } = await admin
      .from("shop_nhom")
      .select("id, id_nguoi_dung, nhan, anh_id, gia_mac_dinh")
      .eq("da_xoa", false)
      .eq("truc", 1)
      .not("anh_id", "is", null)
      .order("noi_bat", { ascending: false })
      .limit(STAGE_PRODUCT_SCAN)
      .returns<
        Array<{
          id: string;
          id_nguoi_dung: string;
          nhan: string | null;
          anh_id: string | null;
          gia_mac_dinh: number | string | null;
        }>
      >();

    if (nhomErr || !nhoms?.length) return [];

    const ownerIds = [...new Set(nhoms.map((r) => r.id_nguoi_dung))];
    const { data: owners } = await admin
      .from("user_nguoi_dung")
      .select("id, slug")
      .in("id", ownerIds)
      .eq("ban_hang_bat", true)
      .eq("shop_hien_thi", true)
      .not("slug", "is", null)
      .returns<Array<{ id: string; slug: string | null }>>();

    const ownerById = new Map(
      (owners ?? [])
        .filter((o) => o.slug?.trim())
        .map((o) => [o.id, o.slug!.trim()] as const),
    );
    if (ownerById.size === 0) return [];

    const { data: shops } = await admin
      .from("shop_cua_hang")
      .select("id_nguoi_dung, ten")
      .eq("da_xoa", false)
      .in("id_nguoi_dung", [...ownerById.keys()])
      .returns<Array<{ id_nguoi_dung: string; ten: string | null }>>();

    const shopNameByOwner = new Map(
      (shops ?? []).map((s) => [s.id_nguoi_dung, s.ten?.trim() || ""] as const),
    );

    const out: GuestHomeStageMasonryItem[] = [];
    for (const row of nhoms) {
      const ownerSlug = ownerById.get(row.id_nguoi_dung);
      if (!ownerSlug) continue;
      const imageSrc = shopImageUrl(row.anh_id, "thumbnail");
      if (!imageSrc) continue;

      const shopSlug = shopSlugFromTen(
        shopNameByOwner.get(row.id_nguoi_dung) || "",
        ownerSlug,
      );

      out.push({
        id: `product-${row.id}`,
        kind: "product",
        title: row.nhan?.trim() || "Sản phẩm",
        imageSrc,
        href: shopLoaiHref(ownerSlug, shopSlug, row.id),
        aspectRatio: PRODUCT_FALLBACK_RATIO,
        priceLabel: formatStagePrice(parseGia(row.gia_mac_dinh)),
      });
      if (out.length >= STAGE_PRODUCT_CAP) break;
    }

    return out;
  } catch {
    return [];
  }
}

function mixStageItems(
  art: GuestHomeStageMasonryItem[],
  products: GuestHomeStageMasonryItem[],
): GuestHomeStageMasonryItem[] {
  const artPicked = art.slice(0, STAGE_ART_CAP);
  const productPicked = products.slice(0, STAGE_PRODUCT_CAP);
  const out: GuestHomeStageMasonryItem[] = [];
  let ai = 0;
  let pi = 0;

  while (ai < artPicked.length || pi < productPicked.length) {
    if (ai < artPicked.length) out.push(artPicked[ai++]!);
    if (pi < productPicked.length) out.push(productPicked[pi++]!);
  }

  return markPriorityImages(out.slice(0, STAGE_MIX_CAP));
}

function markPriorityImages(
  items: GuestHomeStageMasonryItem[],
): GuestHomeStageMasonryItem[] {
  let marked = 0;
  return items.map((item) => {
    if (!item.imageSrc || marked >= STAGE_PRIORITY_IMAGES) return item;
    marked += 1;
    return { ...item, priority: true };
  });
}

async function loadGuestHomeStageMasonryUncached(): Promise<
  GuestHomeStageMasonryItem[]
> {
  const [art, products] = await Promise.all([
    fetchStageArtworks(),
    fetchStageProducts(),
  ]);

  const mixed = mixStageItems(art, products);
  if (mixed.length > 0) return mixed;

  return Array.from({ length: 6 }, (_, index) => ({
    id: `placeholder-${index + 1}`,
    kind: "art" as const,
    title: "Tác phẩm",
    imageSrc: null,
    href: null,
    aspectRatio: PORTRAIT_FALLBACK_RATIO,
  }));
}

export const loadGuestHomeStageMasonry = unstable_cache(
  loadGuestHomeStageMasonryUncached,
  ["guest-home-stage-masonry-v9"],
  { revalidate: 300, tags: ["guest-home"] },
);
