import { userEmojiDeliveryUrl } from "@/lib/user-emoji/delivery-url";
import type { UserEmojiMuc } from "@/lib/user-emoji/types";

export function boThumbnailUrl(
  cloudflareIdAnhBia: string | null | undefined,
  items: UserEmojiMuc[],
): string | null {
  const cover = cloudflareIdAnhBia?.trim();
  if (cover) {
    return userEmojiDeliveryUrl(cover, "public");
  }
  return items[0]?.url ?? null;
}
