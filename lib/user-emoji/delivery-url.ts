import { chatImageDeliveryUrl } from "@/lib/chat/image-url";

/** Thumbnail cho grid picker; sticker trong bubble chat. */
export function userEmojiDeliveryUrl(
  cloudflareId: string,
  variant: "thumbnail" | "public" = "thumbnail",
): string | null {
  return chatImageDeliveryUrl(cloudflareId, variant);
}
