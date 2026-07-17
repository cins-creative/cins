import "server-only";

import { cache } from "react";

import { getConfiguredSiteUrl } from "@/lib/auth/auth-origin";
import { deleteCloudflareImage } from "@/lib/cloudflare/delete-image";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const TOKEN_RE = /^[A-Za-z0-9_-]{10,24}$/;
const MAX_TARGET_LENGTH = 600;

export type ShareLinkRecord = {
  token: string;
  creatorId: string;
  orgId: string | null;
  targetPath: string;
  title: string;
  description: string | null;
  imageId: string;
  imageUrl: string;
  createdAt: string;
};

type ShareLinkRow = {
  token: string;
  id_nguoi_tao: string;
  id_to_chuc: string | null;
  target_path: string;
  tieu_de: string;
  mo_ta: string | null;
  image_id: string;
  image_url: string;
  tao_luc: string;
};

function randomShareToken(): string {
  const bytes = new Uint8Array(9);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function allowedOrigins(): Set<string> {
  const origins = new Set(["https://cins.vn", "https://www.cins.vn"]);
  const configured = getConfiguredSiteUrl();
  if (configured) origins.add(configured.origin);
  return origins;
}

/** Chỉ chấp nhận URL nội bộ CINs/dev; trả pathname + search, bỏ hash. */
export function normalizeShareTargetPath(raw: string): string | null {
  const input = raw.trim();
  if (!input || input.length > MAX_TARGET_LENGTH || input.startsWith("//")) {
    return null;
  }
  try {
    const url = new URL(input, "https://cins.vn");
    if (!allowedOrigins().has(url.origin)) return null;
    if (!url.pathname.startsWith("/") || url.pathname.startsWith("/s/")) {
      return null;
    }
    return `${url.pathname}${url.search}`;
  } catch {
    return null;
  }
}

function mapShareLink(row: ShareLinkRow): ShareLinkRecord {
  return {
    token: row.token,
    creatorId: row.id_nguoi_tao,
    orgId: row.id_to_chuc,
    targetPath: row.target_path,
    title: row.tieu_de,
    description: row.mo_ta,
    imageId: row.image_id,
    imageUrl: row.image_url,
    createdAt: row.tao_luc,
  };
}

export async function createShareLink(input: {
  creatorId: string;
  orgId?: string | null;
  targetPath: string;
  title: string;
  description?: string | null;
  imageId: string;
  imageUrl: string;
}): Promise<ShareLinkRecord | null> {
  const targetPath = normalizeShareTargetPath(input.targetPath);
  const creatorId = input.creatorId.trim();
  const orgId = input.orgId?.trim() || null;
  const title = input.title.trim().slice(0, 180);
  const description = input.description?.trim().slice(0, 320) || null;
  const imageId = input.imageId.trim();
  const imageUrl = input.imageUrl.trim();
  if (
    !targetPath ||
    !creatorId ||
    !title ||
    !imageId ||
    !imageUrl.startsWith("https://")
  ) {
    return null;
  }

  const admin = createServiceRoleClient();
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const token = randomShareToken();
    const { data, error } = await admin
      .from("content_share_link")
      .insert({
        token,
        id_nguoi_tao: creatorId,
        id_to_chuc: orgId,
        target_path: targetPath,
        tieu_de: title,
        mo_ta: description,
        image_id: imageId,
        image_url: imageUrl,
      })
      .select(
        "token, id_nguoi_tao, id_to_chuc, target_path, tieu_de, mo_ta, image_id, image_url, tao_luc",
      )
      .maybeSingle<ShareLinkRow>();
    if (data) return mapShareLink(data);
    if (error?.code !== "23505") return null;
  }
  return null;
}

async function resolveShareLinkUncached(
  token: string,
): Promise<ShareLinkRecord | null> {
  const normalized = token.trim();
  if (!TOKEN_RE.test(normalized)) return null;
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("content_share_link")
    .select(
      "token, id_nguoi_tao, id_to_chuc, target_path, tieu_de, mo_ta, image_id, image_url, tao_luc",
    )
    .eq("token", normalized)
    .maybeSingle<ShareLinkRow>();
  return data ? mapShareLink(data) : null;
}

/** Dedupe generateMetadata + page trong cùng request. */
export const resolveShareLink = cache(resolveShareLinkUncached);

export async function isShareImageReferenced(imageId: string): Promise<boolean> {
  const id = imageId.trim();
  if (!id) return false;
  const admin = createServiceRoleClient();
  const { count, error } = await admin
    .from("content_share_link")
    .select("token", { count: "exact", head: true })
    .eq("image_id", id);
  if (error) {
    // Khi không xác minh được, giữ ảnh để tránh làm hỏng short-link cũ.
    return true;
  }
  return (count ?? 0) > 0;
}

/** Xóa best-effort chỉ khi không có short-link bất biến nào đang dùng ảnh. */
export async function deleteUnreferencedShareImage(imageId: string): Promise<void> {
  const id = imageId.trim();
  if (!id || (await isShareImageReferenced(id))) return;
  await deleteCloudflareImage(id);
}
