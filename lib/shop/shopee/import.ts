import "server-only";

import {
  createSanPham,
} from "@/lib/shop/catalog";
import {
  createNhom,
  syncNhomGiaMacDinhToMau,
  updateNhom,
} from "@/lib/shop/nhom";
import {
  SHOP_NHOM_ANH_PHU_MAX,
} from "@/lib/shop/types";
import type { ShopNhom, ShopSanPham } from "@/lib/shop/types";

import { claudeNormalizeShopee } from "./claude-normalize";
import {
  fetchShopeeProductDraft,
  parseShopeeRawPayload,
} from "./fetch-product";
import type {
  ShopeeImportPreview,
  ShopeeImportedImage,
  ShopeeProductDraft,
} from "./types";
import { uploadShopeeImageToCloudflare } from "./upload-image";

const MAX_MODELS = 80;

async function uploadImages(
  urls: string[],
): Promise<ShopeeImportedImage[]> {
  const settled = await Promise.all(
    urls.map(async (sourceUrl) => {
      const uploaded = await uploadShopeeImageToCloudflare(sourceUrl);
      if (!uploaded) return null;
      return {
        sourceUrl,
        imageId: uploaded.imageId,
        url: uploaded.url,
      } satisfies ShopeeImportedImage;
    }),
  );
  return settled.filter((x): x is ShopeeImportedImage => x != null);
}

export async function buildShopeeImportPreview(opts: {
  url?: string;
  raw?: unknown;
}): Promise<ShopeeImportPreview> {
  let draft: ShopeeProductDraft | null = null;

  if (opts.raw != null) {
    draft = parseShopeeRawPayload(opts.raw, opts.url);
    if (!draft) {
      throw new Error("JSON Shopee không hợp lệ (cần data.item từ get_pc).");
    }
  } else if (opts.url?.trim()) {
    draft = await fetchShopeeProductDraft(opts.url.trim());
  } else {
    throw new Error("Thiếu URL Shopee.");
  }

  const { nhan, moTa } = await claudeNormalizeShopee(draft);

  // Thumb + ảnh phụ (tối đa ANH_PHU_MAX phụ)
  const galleryUrls = draft.imageUrls.slice(0, 1 + SHOP_NHOM_ANH_PHU_MAX);
  const images = await uploadImages(galleryUrls);

  if (galleryUrls.length > 0 && images.length === 0) {
    draft.warnings.push(
      "Không tải được ảnh Shopee lên Cloudflare — kiểm tra lại link hoặc thử lại.",
    );
  } else if (images.length > 0 && images.length < galleryUrls.length) {
    draft.warnings.push(
      `Chỉ tải được ${images.length}/${galleryUrls.length} ảnh từ Shopee.`,
    );
  }

  const modelSrc = draft.models.slice(0, MAX_MODELS);
  const models: ShopeeImportPreview["models"] = [];

  for (const m of modelSrc) {
    let anhId: string | null = null;
    let anhUrl: string | null = null;
    if (m.imageUrl) {
      const existing = images.find((i) => i.sourceUrl === m.imageUrl);
      if (existing) {
        anhId = existing.imageId;
        anhUrl = existing.url;
      } else {
        const up = await uploadShopeeImageToCloudflare(m.imageUrl);
        if (up) {
          anhId = up.imageId;
          anhUrl = up.url;
        }
      }
    }
    models.push({
      ten: m.ten.slice(0, 80),
      anhId,
      anhUrl,
    });
  }

  return {
    draft,
    nhan,
    moTa,
    giaMacDinh: draft.priceMin,
    images,
    models,
  };
}

export async function applyShopeeImport(
  ownerId: string,
  preview: ShopeeImportPreview,
): Promise<{ nhom: ShopNhom; products: ShopSanPham[] }> {
  const thumb = preview.images[0] ?? null;
  const anhPhuIds = preview.images.slice(1).map((i) => i.imageId);

  const nhom = await createNhom(ownerId, {
    truc: 1,
    nhan: preview.nhan,
    moTa: preview.moTa || null,
    anhId: thumb?.imageId ?? null,
    giaMacDinh: preview.giaMacDinh,
  });

  // Luôn PATCH ảnh (kể cả khi ensureNhom trả bản cũ trùng tên)
  const finalNhom = await updateNhom(ownerId, nhom.id, {
    anhId: thumb?.imageId ?? null,
    anhPhuIds,
    moTa: preview.moTa || null,
    giaMacDinh: preview.giaMacDinh,
  });

  const products: ShopSanPham[] = [];
  const modelRows =
    preview.models.length > 0
      ? preview.models
      : [
          {
            ten: preview.nhan.slice(0, 80) || "Mẫu mặc định",
            anhId: thumb?.imageId ?? null,
            anhUrl: thumb?.url ?? null,
          },
        ];

  for (const m of modelRows) {
    const item = await createSanPham(ownerId, {
      ten: m.ten,
      anhId: m.anhId,
      phanLoai: finalNhom.nhan,
      phanLoai2: null,
      bienThe: [{ nhan: "Mặc định", soLuongTon: 0 }],
    });
    products.push(item);
  }

  if (preview.giaMacDinh != null && products.length > 0) {
    await syncNhomGiaMacDinhToMau(ownerId, finalNhom.id, preview.giaMacDinh);
  }

  return { nhom: finalNhom, products };
}
