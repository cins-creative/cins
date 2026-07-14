import { chatImageDeliveryUrl } from "@/lib/chat/image-url";

/** URL meme — mặc định `public` (khớp chat media; tránh phụ thuộc variant vuông). */
export function userEmojiDeliveryUrl(
  cloudflareId: string,
  variant: "thumbnail" | "public" = "public",
): string | null {
  return chatImageDeliveryUrl(cloudflareId, variant);
}
