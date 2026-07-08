import "server-only";

import { createHash } from "crypto";

import { getBunnyStreamConfig } from "@/lib/bunny/config";
import { buildBunnyEmbedUrl } from "@/lib/bunny/embed";

export async function createBunnyStreamVideo(
  title: string,
): Promise<{ ok: true; videoId: string } | { ok: false; error: string }> {
  const config = getBunnyStreamConfig();
  if (!config) {
    return { ok: false, error: "Bunny Stream chưa được cấu hình." };
  }

  const res = await fetch(
    `https://video.bunnycdn.com/library/${config.libraryId}/videos`,
    {
      method: "POST",
      headers: {
        AccessKey: config.apiKey,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: title.slice(0, 200) || "CINS Journey video",
      }),
    },
  );

  if (!res.ok) {
    return { ok: false, error: "Không tạo được video trên Bunny Stream." };
  }

  const data = (await res.json()) as { guid?: string };
  if (!data.guid?.trim()) {
    return { ok: false, error: "Bunny Stream không trả về video ID." };
  }

  return { ok: true, videoId: data.guid.trim() };
}

export function buildBunnyTusAuth(params: {
  libraryId: string;
  apiKey: string;
  videoId: string;
  expireSeconds?: number;
}): { authorizationSignature: string; authorizationExpire: number } {
  const authorizationExpire =
    Math.floor(Date.now() / 1000) + (params.expireSeconds ?? 3600);
  const raw = `${params.libraryId}${params.apiKey}${authorizationExpire}${params.videoId}`;
  const authorizationSignature = createHash("sha256")
    .update(raw)
    .digest("hex");
  return { authorizationSignature, authorizationExpire };
}

export type BunnyVideoPreparePayload = {
  videoId: string;
  libraryId: string;
  embedUrl: string;
  authorizationSignature: string;
  authorizationExpire: number;
};

export async function prepareBunnyVideoUpload(
  title: string,
): Promise<
  { ok: true; data: BunnyVideoPreparePayload } | { ok: false; error: string }
> {
  const config = getBunnyStreamConfig();
  if (!config) {
    return { ok: false, error: "Bunny Stream chưa được cấu hình." };
  }

  const created = await createBunnyStreamVideo(title);
  if (!created.ok) return created;

  const auth = buildBunnyTusAuth({
    libraryId: config.libraryId,
    apiKey: config.apiKey,
    videoId: created.videoId,
  });

  return {
    ok: true,
    data: {
      videoId: created.videoId,
      libraryId: config.libraryId,
      embedUrl: buildBunnyEmbedUrl(config.libraryId, created.videoId),
      authorizationSignature: auth.authorizationSignature,
      authorizationExpire: auth.authorizationExpire,
    },
  };
}

/** Bunny Stream encode status — 4 = Finished. */
const BUNNY_VIDEO_STATUS_FINISHED = 4;

type BunnyVideoApiRow = {
  status?: number;
  encodeProgress?: number;
  length?: number;
  width?: number;
  height?: number;
};

async function fetchBunnyVideoRow(
  videoId: string,
): Promise<
  | { ok: true; data: BunnyVideoApiRow }
  | { ok: false; error: string }
> {
  const config = getBunnyStreamConfig();
  if (!config) {
    return { ok: false, error: "Bunny Stream chưa được cấu hình." };
  }

  const res = await fetch(
    `https://video.bunnycdn.com/library/${config.libraryId}/videos/${encodeURIComponent(videoId)}`,
    {
      headers: {
        AccessKey: config.apiKey,
        Accept: "application/json",
      },
      cache: "no-store",
    },
  );

  if (!res.ok) {
    return { ok: false, error: "Không đọc được trạng thái video." };
  }

  return { ok: true, data: (await res.json()) as BunnyVideoApiRow };
}

function bunnyVideoReadyFromRow(data: BunnyVideoApiRow): {
  ready: boolean;
  status: number;
} {
  const status = typeof data.status === "number" ? data.status : -1;
  const encodeProgress =
    typeof data.encodeProgress === "number" ? data.encodeProgress : 0;
  const length = typeof data.length === "number" ? data.length : 0;
  const ready =
    status === BUNNY_VIDEO_STATUS_FINISHED ||
    (encodeProgress >= 100 && length > 0) ||
    (status >= 3 && length > 0);
  return { ready, status };
}

export async function getBunnyVideoStatus(
  videoId: string,
): Promise<
  { ok: true; ready: boolean; status: number } | { ok: false; error: string }
> {
  const row = await fetchBunnyVideoRow(videoId);
  if (!row.ok) return row;
  const { ready, status } = bunnyVideoReadyFromRow(row.data);
  return { ok: true, ready, status };
}

/** Kích thước gốc từ Bunny Stream API — dùng resolve canvas trước khi client probe. */
export async function getBunnyVideoDimensions(
  videoId: string,
): Promise<{ width: number; height: number } | null> {
  const row = await fetchBunnyVideoRow(videoId);
  if (!row.ok) return null;
  const width = typeof row.data.width === "number" ? row.data.width : 0;
  const height = typeof row.data.height === "number" ? row.data.height : 0;
  if (width <= 0 || height <= 0) return null;
  return { width, height };
}

/** Xóa video khỏi Bunny Stream (best-effort — không throw). */
export async function deleteBunnyStreamVideo(
  videoId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const id = videoId.trim();
  const config = getBunnyStreamConfig();
  if (!id || !config) {
    return { ok: false, error: "Bunny Stream chưa được cấu hình." };
  }

  try {
    const res = await fetch(
      `https://video.bunnycdn.com/library/${config.libraryId}/videos/${encodeURIComponent(id)}`,
      {
        method: "DELETE",
        headers: {
          AccessKey: config.apiKey,
          Accept: "application/json",
        },
      },
    );

    if (res.ok || res.status === 404) return { ok: true };

    return { ok: false, error: "Không xóa được video trên Bunny Stream." };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Không xóa được video.",
    };
  }
}
