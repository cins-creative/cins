import type { UserEmojiPackResponse } from "@/lib/user-emoji/types";

export async function fetchUserEmojiPack(): Promise<UserEmojiPackResponse> {
  const res = await fetch("/api/user-emoji", { credentials: "same-origin" });
  const data = (await res.json()) as UserEmojiPackResponse & { error?: string };
  if (!res.ok) {
    throw new Error(data.error ?? "Không tải được bộ meme.");
  }
  return data;
}

export async function createUserEmojiBoClient(ten: string) {
  const res = await fetch("/api/user-emoji", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ ten }),
  });
  const data = (await res.json()) as { bo?: UserEmojiPackResponse["boList"][number]; error?: string };
  if (!res.ok || !data.bo) {
    throw new Error(data.error ?? "Không tạo được bộ meme.");
  }
  return data.bo;
}

export async function deleteUserEmojiBoClient(boId: string) {
  const res = await fetch(`/api/user-emoji/${boId}`, {
    method: "DELETE",
    credentials: "same-origin",
  });
  const data = (await res.json()) as { error?: string };
  if (!res.ok) {
    throw new Error(data.error ?? "Không xóa được bộ meme.");
  }
}

export async function addUserEmojiMucClient(boId: string, cloudflareId: string) {
  const res = await fetch(`/api/user-emoji/${boId}/items`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ cloudflare_id: cloudflareId }),
  });
  const data = (await res.json()) as {
    item?: UserEmojiPackResponse["boList"][number]["items"][number];
    error?: string;
  };
  if (!res.ok || !data.item) {
    throw new Error(data.error ?? "Không thêm được meme.");
  }
  return data.item;
}

export async function updateUserEmojiBoCoverClient(
  boId: string,
  cloudflareIdAnhBia: string | null,
) {
  const res = await fetch(`/api/user-emoji/${boId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ cloudflare_id_anh_bia: cloudflareIdAnhBia }),
  });
  const data = (await res.json()) as {
    bo?: UserEmojiPackResponse["boList"][number];
    error?: string;
  };
  if (!res.ok || !data.bo) {
    throw new Error(data.error ?? "Không cập nhật được ảnh bìa.");
  }
  return data.bo;
}

export async function deleteUserEmojiMucClient(boId: string, itemId: string) {
  const res = await fetch(`/api/user-emoji/${boId}/items/${itemId}`, {
    method: "DELETE",
    credentials: "same-origin",
  });
  const data = (await res.json()) as { error?: string };
  if (!res.ok) {
    throw new Error(data.error ?? "Không xóa được meme.");
  }
}
