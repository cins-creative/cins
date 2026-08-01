import "server-only";

import {
  ARTSTATION_ALBUM_MAX_ANH,
  moTaArtstationTuJson,
  parseArtstationProjectJson,
} from "@/lib/autopilot/artstation-assets";
import {
  BEHANCE_ALBUM_MAX_ANH,
  laTieuDeThoBehance,
  parseBehanceProjectHtml,
  tieuDeTuSlugUrlBehance,
} from "@/lib/autopilot/behance-assets";
import { uploadCloudflareImageFromUrlChiTiet } from "@/lib/cloudflare/upload-image-from-url";
import {
  dangBaiJourneyChoUser,
  type DangBaiJourneyResult,
} from "@/lib/editor/dang-bai-journey";
import {
  gopMoTaVoiDongNguon,
  taoDongGhiNguon,
  taoKhoiBaiAlbumNguon,
  taoKhoiBaiBehanceNguon,
} from "@/lib/editor/khoi-bai-nguon";
import type { Block } from "@/lib/editor/types";
import { POST_MOTA_MAX, POST_TITLE_MAX } from "@/lib/journey/post-content-kind";
import { lyDoBoQua, taoBoQuaRong, type PortImportBoQua } from "@/lib/port/bo-qua";
import {
  CARRD_ALBUM_MAX_ANH,
  parseCarrdPageHtml,
} from "@/lib/port/carrd-assets";

export type PortPlatform = "behance" | "artstation" | "carrd";

/** Preview 1 project — round-trip client → apply (JSON-serializable). */
export type PortImportPreview = {
  platform: PortPlatform;
  sourceUrl: string;
  tieuDe: string;
  moTa: string;
  coverId: string | null;
  /** URL Cloudflare của cover — cho UI hiển thị thumbnail. */
  coverUrl: string | null;
  blocks: Block[];
  soAnh: number;
  soVideo: number;
  /** Media rơi rụng — modal hỏi user trước khi tạo nháp. */
  boQua: PortImportBoQua;
  warnings: string[];
};

const MOTA_PREVIEW_MAX = 400;
const IMAGE_CONCURRENCY = 4;

function excerptFromText(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= MOTA_PREVIEW_MAX) return clean;
  return `${clean.slice(0, MOTA_PREVIEW_MAX - 1).trimEnd()}…`;
}

type KetQuaMirror = {
  daTai: Map<string, { imageId: string; url: string }>;
  /** Ảnh vượt trần dung lượng Cloudflare Images (không nén nổi). */
  quaLon: number;
  /** Ảnh đã nén rồi upload thành công. */
  daNen: number;
  /** Ảnh hỏng vì lý do khác (mạng, mime, lưu trữ). */
  loi: number;
};

/** Tải song song (giới hạn concurrency) danh sách URL ảnh → Cloudflare Images. */
async function mirrorImages(urls: string[]): Promise<KetQuaMirror> {
  const daTai = new Map<string, { imageId: string; url: string }>();
  let quaLon = 0;
  let daNen = 0;
  let loi = 0;
  for (let i = 0; i < urls.length; i += IMAGE_CONCURRENCY) {
    const chunk = urls.slice(i, i + IMAGE_CONCURRENCY);
    const uploaded = await Promise.all(
      chunk.map(async (u) => ({
        u,
        res: await uploadCloudflareImageFromUrlChiTiet(u),
      })),
    );
    for (const { u, res } of uploaded) {
      if (res.ok) {
        daTai.set(u, res.data);
        if (res.daNen) daNen += 1;
      } else if (res.lyDo === "qua_lon") quaLon += 1;
      else loi += 1;
    }
  }
  return { daTai, quaLon, daNen, loi };
}

function chuanHoaTieuDe(raw: string | null | undefined, fallback: string): string {
  const t = (raw || "").trim();
  return (t || fallback).slice(0, POST_TITLE_MAX);
}

/**
 * Dựng preview cho 1 project Behance từ HTML (extension gửi về).
 * Kết quả = bài viết dài: chữ + ảnh + video xen kẽ theo thứ tự trang.
 */
export async function buildBehancePortPreview(params: {
  url: string;
  html: string;
  fallbackTitle?: string | null;
}): Promise<PortImportPreview> {
  const sourceUrl = String(params.url || "").trim();
  const html = String(params.html || "");
  if (!html) {
    throw new Error("Thiếu nội dung HTML project.");
  }

  const parsed = parseBehanceProjectHtml(html, { gioiHan: BEHANCE_ALBUM_MAX_ANH });

  const imageUrls = Array.from(
    new Set(
      parsed.modules
        .filter((m): m is Extract<typeof m, { kind: "image" }> => m.kind === "image")
        .map((m) => m.anh.imageUrl),
    ),
  );

  const mirrored = await mirrorImages(imageUrls);
  let soAnh = 0;
  let soVideo = 0;

  const modules: Parameters<typeof taoKhoiBaiBehanceNguon>[0]["modules"] = [];
  for (const mod of parsed.modules) {
    if (mod.kind === "text") {
      if (mod.text.trim()) modules.push({ kind: "text", text: mod.text });
    } else if (mod.kind === "image") {
      const cf = mirrored.daTai.get(mod.anh.imageUrl);
      if (cf) {
        modules.push({
          kind: "image",
          seed: cf.imageId,
          width: mod.anh.width,
          height: mod.anh.height,
        });
        soAnh += 1;
      }
    } else if (mod.kind === "video") {
      modules.push({ kind: "video", url: mod.url });
      soVideo += 1;
    }
  }

  const boQua: PortImportBoQua = {
    tongAnhNguon: imageUrls.length + parsed.soAnhVuotGioiHan,
    daLay: soAnh,
    quaLon: mirrored.quaLon,
    daNen: mirrored.daNen,
    vuotTran: parsed.soAnhVuotGioiHan,
    loi: mirrored.loi,
  };
  const warnings = lyDoBoQua(boQua);

  const blocks = taoKhoiBaiBehanceNguon({ modules, urlNguon: sourceUrl });

  const firstCover = imageUrls
    .map((u) => mirrored.daTai.get(u))
    .find((x): x is { imageId: string; url: string } => Boolean(x));

  let tieuDe = (parsed.title || "").trim();
  if (!tieuDe || laTieuDeThoBehance(tieuDe)) {
    tieuDe = tieuDeTuSlugUrlBehance(sourceUrl) || params.fallbackTitle?.trim() || "";
  }
  tieuDe = chuanHoaTieuDe(tieuDe, "Tác phẩm Behance");

  const firstText = parsed.modules.find(
    (m): m is Extract<typeof m, { kind: "text" }> => m.kind === "text",
  );
  const moTa = gopMoTaVoiDongNguon(
    firstText ? excerptFromText(firstText.text) : "",
    taoDongGhiNguon({ urlNguon: sourceUrl, nenTang: "behance" }),
  ).slice(0, POST_MOTA_MAX);

  return {
    platform: "behance",
    sourceUrl,
    tieuDe,
    moTa,
    coverId: firstCover?.imageId ?? null,
    coverUrl: firstCover?.url ?? null,
    blocks,
    soAnh,
    soVideo,
    boQua,
    warnings,
  };
}

/**
 * Dựng preview cho 1 project ArtStation từ JSON (`/projects/{hash}.json`).
 * Kết quả = album ảnh (mỗi ảnh 1 block imgs, layout album liền mạch).
 */
export async function buildArtstationPortPreview(params: {
  url: string;
  html: string;
  fallbackTitle?: string | null;
}): Promise<PortImportPreview> {
  const sourceUrl = String(params.url || "").trim();
  const json = String(params.html || "");
  if (!json) {
    throw new Error("Thiếu dữ liệu JSON project ArtStation.");
  }

  const parsed = parseArtstationProjectJson(json, {
    gioiHan: ARTSTATION_ALBUM_MAX_ANH,
  });
  if (!parsed.ok) {
    throw new Error(parsed.error);
  }

  const imageUrls = Array.from(new Set(parsed.data.anh.map((a) => a.imageUrl)));
  const mirrored = await mirrorImages(imageUrls);

  const anhAlbum = parsed.data.anh
    .map((a) => {
      const cf = mirrored.daTai.get(a.imageUrl);
      if (!cf) return null;
      return { seed: cf.imageId, width: a.width, height: a.height };
    })
    .filter((x): x is { seed: string; width: number | null; height: number | null } =>
      Boolean(x),
    );

  const soAnh = anhAlbum.length;
  const boQua: PortImportBoQua = {
    ...taoBoQuaRong(imageUrls.length, soAnh),
    quaLon: mirrored.quaLon,
    daNen: mirrored.daNen,
    loi: mirrored.loi,
  };
  const warnings = lyDoBoQua(boQua);

  const blocks = taoKhoiBaiAlbumNguon({
    anh: anhAlbum,
    urlNguon: sourceUrl,
    nenTang: "artstation",
  });

  const firstCover = imageUrls
    .map((u) => mirrored.daTai.get(u))
    .find((x): x is { imageId: string; url: string } => Boolean(x));

  const tieuDe = chuanHoaTieuDe(
    parsed.data.title || params.fallbackTitle,
    "Tác phẩm ArtStation",
  );

  const moTa = gopMoTaVoiDongNguon(
    moTaArtstationTuJson(json)?.slice(0, MOTA_PREVIEW_MAX) || "",
    taoDongGhiNguon({ urlNguon: sourceUrl, nenTang: "artstation" }),
  ).slice(0, POST_MOTA_MAX);

  return {
    platform: "artstation",
    sourceUrl,
    tieuDe,
    moTa,
    coverId: firstCover?.imageId ?? null,
    coverUrl: firstCover?.url ?? null,
    blocks,
    soAnh,
    soVideo: 0,
    boQua,
    warnings,
  };
}

/**
 * Dựng preview trang Carrd (HTML) → album ảnh + dòng nguồn.
 */
export async function buildCarrdPortPreview(params: {
  url: string;
  html: string;
  fallbackTitle?: string | null;
}): Promise<PortImportPreview> {
  const sourceUrl = String(params.url || "").trim();
  const html = String(params.html || "");
  if (!html) {
    throw new Error("Thiếu HTML trang Carrd.");
  }

  const parsed = parseCarrdPageHtml(html, {
    baseUrl: sourceUrl || "https://carrd.co",
    gioiHan: CARRD_ALBUM_MAX_ANH,
  });

  const mirrored = await mirrorImages(parsed.imageUrls);
  const anhAlbum = parsed.imageUrls
    .map((u) => {
      const cf = mirrored.daTai.get(u);
      if (!cf) return null;
      return { seed: cf.imageId, width: null as number | null, height: null };
    })
    .filter((x): x is { seed: string; width: number | null; height: number | null } =>
      Boolean(x),
    );

  const soAnh = anhAlbum.length;
  const boQua: PortImportBoQua = {
    tongAnhNguon: parsed.imageUrls.length + parsed.soAnhVuotGioiHan,
    daLay: soAnh,
    quaLon: mirrored.quaLon,
    daNen: mirrored.daNen,
    vuotTran: parsed.soAnhVuotGioiHan,
    loi: mirrored.loi,
  };
  const warnings = lyDoBoQua(boQua);

  const blocks = taoKhoiBaiAlbumNguon({
    anh: anhAlbum,
    urlNguon: sourceUrl,
    nenTang: "carrd",
  });

  const firstCover = parsed.imageUrls
    .map((u) => mirrored.daTai.get(u))
    .find((x): x is { imageId: string; url: string } => Boolean(x));

  const tieuDe = chuanHoaTieuDe(
    parsed.title || params.fallbackTitle,
    "Portfolio Carrd",
  );
  const moTa = gopMoTaVoiDongNguon(
    excerptFromText(parsed.excerpt),
    taoDongGhiNguon({ urlNguon: sourceUrl, nenTang: "carrd" }),
  ).slice(0, POST_MOTA_MAX);

  return {
    platform: "carrd",
    sourceUrl,
    tieuDe,
    moTa,
    coverId: firstCover?.imageId ?? null,
    coverUrl: firstCover?.url ?? null,
    blocks,
    soAnh,
    soVideo: 0,
    boQua,
    warnings,
  };
}

/** Dựng preview theo nền tảng. */
export async function buildPortPreview(params: {
  platform: PortPlatform;
  url: string;
  html: string;
  fallbackTitle?: string | null;
}): Promise<PortImportPreview> {
  if (params.platform === "artstation") {
    return buildArtstationPortPreview(params);
  }
  if (params.platform === "carrd") {
    return buildCarrdPortPreview(params);
  }
  return buildBehancePortPreview(params);
}

/** Tạo bài Journey từ preview đã dựng. */
export async function applyPortImport(params: {
  idNguoiDung: string;
  slugChu: string;
  preview: PortImportPreview;
  /** Mặc định nháp (PortImport user). Admin clone seeding → `public`. */
  cheDoHienThi?: "public" | "feature" | "chi_minh" | "ban_be";
}): Promise<DangBaiJourneyResult> {
  const { preview } = params;
  if (!Array.isArray(preview.blocks) || preview.blocks.length === 0) {
    return { ok: false, error: "Preview không có nội dung để đăng." };
  }

  return dangBaiJourneyChoUser({
    idNguoiDung: params.idNguoiDung,
    slugChu: params.slugChu,
    tieuDe: preview.tieuDe,
    moTa: preview.moTa,
    coverId: preview.coverId,
    cheDoHienThi: params.cheDoHienThi ?? "chi_minh",
    loaiMoc: "du_an",
    blocks: preview.blocks,
  });
}
