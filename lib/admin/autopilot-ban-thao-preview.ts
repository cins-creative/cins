/**
 * Ghép blocks xem trước bản thảo Autopilot — giống lúc đăng nhưng seed = URL https
 * (không upload Cloudflare).
 */
import "server-only";

import { layAnhArtstationTuUrl } from "@/lib/autopilot/artstation-assets";
import { layAnhBehanceTuUrl } from "@/lib/autopilot/behance-assets";
import {
  layAnhPixivTuUrl,
  pixivAdminProxyUrl,
} from "@/lib/autopilot/pixiv-assets";
import {
  doanNenTangTuUrl,
  taoKhoiBaiAlbumNguon,
  taoKhoiBaiBehanceNguon,
  taoKhoiBaiNguon,
  type AnhAlbumNguon,
  type NenTangNguon,
} from "@/lib/editor/khoi-bai-nguon";
import type { Block } from "@/lib/editor/types";

export type BanThaoPreviewInput = {
  urlNguon: string;
  nenTang?: string | null;
  moTa?: string | null;
  dongGhiNguon?: string | null;
  tenTacGia?: string | null;
  anhBiaUrl?: string | null;
};

export type BanThaoPreviewResult = {
  blocks: Block[];
  /** URL bìa (https) — dùng làm coverSeed preview; null nếu không có. */
  coverSeed: string | null;
  /** Ghi chú admin (nguồn album / fallback). */
  previewNote: string;
};

function resolveNenTang(
  urlNguon: string,
  nenTang?: string | null,
): NenTangNguon {
  const raw = nenTang?.trim().toLowerCase();
  if (
    raw === "artstation" ||
    raw === "behance" ||
    raw === "pixiv" ||
    raw === "khac"
  ) {
    return raw;
  }
  return doanNenTangTuUrl(urlNguon);
}

function fallbackBlocks(params: BanThaoPreviewInput & { nenTang: NenTangNguon }): {
  blocks: Block[];
  coverSeed: string | null;
  previewNote: string;
} {
  const url = params.urlNguon.trim();
  let blocks = taoKhoiBaiNguon({
    moTa: params.moTa,
    urlNguon: url,
    nenTang: params.nenTang,
    tenTacGiaNguon: params.tenTacGia,
    dongGhiNguon: params.dongGhiNguon,
  });

  const cover = params.anhBiaUrl?.trim() || null;
  if (cover && /^https?:\/\//i.test(cover)) {
    /* Chèn cover làm ảnh đầu album-ish — sau body (nếu có), trước embed. */
    const coverBlock: Block = {
      id: "b-preview-cover",
      loai: "imgs",
      thu_tu: 0,
      config: {
        layout: "full",
        rounded: false,
        gap: 2,
        cap: "",
        imgs: [cover],
        albumGridCell: true,
      },
    };
    const rest = blocks.map((b, i) => ({ ...b, thu_tu: i + 1, id: `b-${i + 1}` }));
    blocks = [coverBlock, ...rest];
  }

  return {
    blocks,
    coverSeed: cover && /^https?:\/\//i.test(cover) ? cover : null,
    previewNote:
      "Fallback embed + nguồn (không lấy được album) · chưa upload CF",
  };
}

async function previewArtstation(
  params: BanThaoPreviewInput & { nenTang: NenTangNguon },
): Promise<BanThaoPreviewResult | null> {
  const fetched = await layAnhArtstationTuUrl(params.urlNguon);
  if (!fetched.ok || !fetched.data.anh.length) return null;

  const anh: AnhAlbumNguon[] = fetched.data.anh.map((item) => ({
    seed: item.imageUrl,
    width: item.width,
    height: item.height,
  }));

  /* Khớp publish: caption ở milestone.moTa — khối chỉ imgs + dòng nguồn. */
  const blocks = taoKhoiBaiAlbumNguon({
    anh,
    moTa: null,
    urlNguon: params.urlNguon,
    nenTang: "artstation",
    tenTacGiaNguon: params.tenTacGia,
    dongGhiNguon: params.dongGhiNguon,
  });

  const coverSeed =
    fetched.data.coverUrl ||
    params.anhBiaUrl?.trim() ||
    anh[0]?.seed ||
    null;

  return {
    blocks,
    coverSeed,
    previewNote: `Album ArtStation · ${anh.length} ảnh · seed URL nguồn (chưa CF)`,
  };
}

async function previewBehance(
  params: BanThaoPreviewInput & { nenTang: NenTangNguon },
): Promise<BanThaoPreviewResult | null> {
  const fetched = await layAnhBehanceTuUrl(params.urlNguon);
  if (!fetched.ok) return null;

  const seedByUrl = new Map<string, AnhAlbumNguon>();
  for (const item of fetched.data.anh) {
    seedByUrl.set(item.imageUrl, {
      seed: item.imageUrl,
      width: item.width,
      height: item.height,
    });
  }

  let modules = fetched.data.modules
    .map((mod) => {
      if (mod.kind === "text") return mod;
      if (mod.kind === "video") return mod;
      const mapped = seedByUrl.get(mod.anh.imageUrl);
      if (!mapped) return null;
      return {
        kind: "image" as const,
        seed: mapped.seed,
        width: mapped.width,
        height: mapped.height,
      };
    })
    .filter((m): m is NonNullable<typeof m> => Boolean(m));

  if (!modules.some((m) => m.kind === "image") && seedByUrl.size) {
    const anhMods = [...seedByUrl.values()].map((a) => ({
      kind: "image" as const,
      seed: a.seed,
      width: a.width,
      height: a.height,
    }));
    const rest = modules.filter((m) => m.kind !== "image");
    modules = [...rest.filter((m) => m.kind === "text"), ...anhMods, ...rest.filter((m) => m.kind === "video")];
  }

  if (
    !modules.some((m) => m.kind === "image") &&
    !modules.some((m) => m.kind === "video")
  ) {
    return null;
  }

  const coverSeed =
    fetched.data.coverUrl ||
    params.anhBiaUrl?.trim() ||
    fetched.data.anh[0]?.imageUrl ||
    null;

  const nVideo = modules.filter((m) => m.kind === "video").length;
  return {
    blocks: taoKhoiBaiBehanceNguon({
      modules,
      urlNguon: params.urlNguon,
      tenTacGiaNguon: params.tenTacGia,
      dongGhiNguon: params.dongGhiNguon,
    }),
    coverSeed,
    previewNote: `Behance bài dài · ${modules.filter((m) => m.kind === "image").length} ảnh · ${nVideo} video · seed URL nguồn (chưa CF)`,
  };
}

async function previewPixiv(
  params: BanThaoPreviewInput & { nenTang: NenTangNguon },
): Promise<BanThaoPreviewResult | null> {
  /* Preview: vẫn hiện ảnh dù strip cao — đăng thật vẫn reject anh_qua_dai. */
  const fetched = await layAnhPixivTuUrl(params.urlNguon, {
    choPhepAnhQuaDai: true,
  });
  if (!fetched.ok || !fetched.data.anh.length) return null;

  /* i.pximg.net cần Referer — browser không gửi → proxy admin. */
  const anh: AnhAlbumNguon[] = fetched.data.anh.map((item) => ({
    seed: pixivAdminProxyUrl(item.imageUrl),
    width: item.width,
    height: item.height,
  }));

  const tenTacGia = params.tenTacGia?.trim() || fetched.data.userName || null;
  const moTaKhoi = fetched.data.descriptionPlain?.slice(0, 2000) || null;

  const blocks = taoKhoiBaiAlbumNguon({
    anh,
    moTa: moTaKhoi,
    urlNguon: params.urlNguon,
    nenTang: "pixiv",
    tenTacGiaNguon: tenTacGia,
    dongGhiNguon: params.dongGhiNguon,
  });

  const coverRaw =
    fetched.data.coverUrl ||
    params.anhBiaUrl?.trim() ||
    fetched.data.anh[0]?.imageUrl ||
    null;
  const coverSeed = coverRaw ? pixivAdminProxyUrl(coverRaw) : null;

  return {
    blocks,
    coverSeed,
    previewNote:
      `Album Pixiv · ${anh.length} ảnh · proxy i.pximg` +
      (fetched.anhQuaDai
        ? " · ⚠ ảnh cao (đăng có thể bị lọc anh_qua_dai)"
        : "") +
      " · chưa upload CF",
  };
}

/**
 * Xây blocks xem trước — không ghi DB, không upload CF.
 */
export async function xayBlocksXemTruocBanThao(
  input: BanThaoPreviewInput,
): Promise<BanThaoPreviewResult> {
  const urlNguon = input.urlNguon?.trim() || "";
  if (!urlNguon) {
    return {
      blocks: [],
      coverSeed: null,
      previewNote: "Thiếu URL nguồn",
    };
  }

  const nenTang = resolveNenTang(urlNguon, input.nenTang);
  const base = { ...input, urlNguon, nenTang };

  try {
    if (nenTang === "artstation") {
      const built = await previewArtstation(base);
      if (built) return built;
    } else if (nenTang === "behance") {
      const built = await previewBehance(base);
      if (built) return built;
    } else if (nenTang === "pixiv") {
      const built = await previewPixiv(base);
      if (built) return built;
    }
  } catch {
    /* fallback bên dưới */
  }

  return fallbackBlocks(base);
}
