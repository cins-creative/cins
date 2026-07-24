import type { ChatMessage } from "@/lib/chat/types";

export type ForwardPayload = {
  noi_dung?: string;
  cloudflare_image_id?: string;
  ngu_canh?: { chuyenTiep: true };
};

const FORWARD_NGU_CANH = { chuyenTiep: true as const };

/** Tách tin nguồn thành các payload gửi lại (album → nhiều tin ảnh). */
export function buildForwardPayloads(msg: ChatMessage): ForwardPayload[] {
  if (msg.deleted) return [];

  const body = msg.body.trim();
  const album = msg.albumImages?.filter((img) => img.imageId) ?? [];
  if (album.length > 0) {
    return album.map((img, index) => ({
      ...(index === 0 && body ? { noi_dung: body } : {}),
      cloudflare_image_id: img.imageId,
      ngu_canh: FORWARD_NGU_CANH,
    }));
  }

  if (msg.imageId) {
    return [
      {
        ...(body ? { noi_dung: body } : {}),
        cloudflare_image_id: msg.imageId,
        ngu_canh: FORWARD_NGU_CANH,
      },
    ];
  }

  if (body) return [{ noi_dung: body, ngu_canh: FORWARD_NGU_CANH }];
  return [];
}

export function canForwardMessage(msg: ChatMessage): boolean {
  if (msg.deleted) return false;
  if (msg.kind === "binh_chon" || msg.kind === "moc_nhac" || msg.kind === "canvas_binh_luan") {
    return false;
  }
  return buildForwardPayloads(msg).length > 0;
}

export async function forwardMessageToRoom(
  targetRoomId: string,
  msg: ChatMessage,
): Promise<
  { ok: true; messages: ChatMessage[] } | { ok: false; error: string }
> {
  const payloads = buildForwardPayloads(msg);
  if (payloads.length === 0) {
    return { ok: false, error: "Không chuyển tiếp được tin này." };
  }

  const messages: ChatMessage[] = [];
  for (const payload of payloads) {
    const res = await fetch(`/api/chat/rooms/${targetRoomId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      let error = "Không gửi được tin chuyển tiếp.";
      try {
        const json = (await res.json()) as { error?: string };
        if (json.error) error = json.error;
      } catch {
        /* ignore */
      }
      return { ok: false, error };
    }
    try {
      const json = (await res.json()) as { message?: ChatMessage };
      if (json.message) {
        messages.push({ ...json.message, forwarded: true, from: "me" });
      }
    } catch {
      /* ignore parse — vẫn coi là gửi thành công */
    }
  }

  return { ok: true, messages };
}
