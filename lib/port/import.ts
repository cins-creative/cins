import "server-only";

import {
  BEHANCE_ALBUM_MAX_ANH,
  laTieuDeThoBehance,
  parseBehanceProjectHtml,
  tieuDeTuSlugUrlBehance,
} from "@/lib/autopilot/behance-assets";
import { uploadCloudflareImageFromUrl } from "@/lib/cloudflare/upload-image-from-url";
import {
  dangBaiJourneyChoUser,
  type DangBaiJourneyResult,
} from "@/lib/editor/dang-bai-journey";
import type { Block } from "@/lib/editor/types";
import { POST_MOTA_MAX, POST_TITLE_MAX } from "@/lib/journey/post-content-kind";

export type PortPlatform = "behance";

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
  warnings: string[];
};

const MOTA_PREVIEW_MAX = 400;
const IMAGE_CONCURRENCY = 4;

function excerptFromText(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= MOTA_PREVIEW_MAX) return clean;
  return `${clean.slice(0, MOTA_PREVIEW_MAX - 1).trimEnd()}…`;
}

/** Tải song song (giới hạn concurrency) danh sách URL ảnh → Cloudflare Images. */
async function mirrorImages(
  urls: string[],
): Promise<Map<string, { imageId: string; url: string }>> {
  const out = new Map<string, { imageId: string; url: string }>();
  for (let i = 0; i < urls.length; i += IMAGE_CONCURRENCY) {
    const chunk = urls.slice(i, i + IMAGE_CONCURRENCY);
    const uploaded = await Promise.all(
      chunk.map(async (u) => ({ u, res: await uploadCloudflareImageFromUrl(u) })),
    );
    for (const { u, res } of uploaded) {
      if (res) out.set(u, res);
    }
  }
  return out;
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

  const parsed = parseBehanceProjectHtml(html, {
    gioiHan: BEHANCE_ALBUM_MAX_ANH,
  });

  const imageUrls = Array.from(
    new Set(
      parsed.modules
        .filter((m): m is Extract<typeof m, { kind: "image" }> => m.kind === "image")
        .map((m) => m.anh.imageUrl),
    ),
  );

  const mirrored = await mirrorImages(imageUrls);

  const blocks: Block[] = [];
  const warnings: string[] = [];
  let soAnh = 0;
  let soVideo = 0;

  for (const mod of parsed.modules) {
    if (mod.kind === "text") {
      if (mod.text.trim()) {
        blocks.push({
          id: `p-txt-${blocks.length}`,
          loai: "body",
          thu_tu: blocks.length,
          config: { html: mod.text },
        });
      }
    } else if (mod.kind === "image") {
      const cf = mirrored.get(mod.anh.imageUrl);
      if (cf) {
        blocks.push({
          id: `p-img-${blocks.length}`,
          loai: "imgs",
          thu_tu: blocks.length,
          config: { imgs: [cf.imageId], layout: "single", rounded: true },
        });
        soAnh += 1;
      }
    } else if (mod.kind === "video") {
      blocks.push({
        id: `p-vid-${blocks.length}`,
        loai: "embed",
        thu_tu: blocks.length,
        config: { url: mod.url },
      });
      soVideo += 1;
    }
  }

  if (imageUrls.length > 0 && soAnh === 0) {
    warnings.push("Không tải được ảnh nào từ project lên Cloudflare.");
  } else if (soAnh < imageUrls.length) {
    warnings.push(`Chỉ tải được ${soAnh}/${imageUrls.length} ảnh.`);
  }

  const firstCover = imageUrls
    .map((u) => mirrored.get(u))
    .find((x): x is { imageId: string; url: string } => Boolean(x));

  /* Ghi nguồn gốc (attribution) cuối bài. */
  if (sourceUrl) {
    blocks.push({
      id: `p-src-${blocks.length}`,
      loai: "body",
      thu_tu: blocks.length,
      config: { html: `Nguồn gốc: ${sourceUrl}` },
    });
  }

  let tieuDe = (parsed.title || "").trim();
  if (!tieuDe || laTieuDeThoBehance(tieuDe)) {
    tieuDe = tieuDeTuSlugUrlBehance(sourceUrl) || params.fallbackTitle?.trim() || "";
  }
  if (!tieuDe) tieuDe = "Tác phẩm Behance";
  tieuDe = tieuDe.slice(0, POST_TITLE_MAX);

  const firstText = parsed.modules.find(
    (m): m is Extract<typeof m, { kind: "text" }> => m.kind === "text",
  );
  const moTa = firstText ? excerptFromText(firstText.text).slice(0, POST_MOTA_MAX) : "";

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
    warnings,
  };
}

/** Tạo bài Journey riêng tư (nháp để duyệt) từ preview đã dựng. */
export async function applyPortImport(params: {
  idNguoiDung: string;
  slugChu: string;
  preview: PortImportPreview;
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
    cheDoHienThi: "chi_minh",
    loaiMoc: "du_an",
    blocks: preview.blocks,
  });
}
