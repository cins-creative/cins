/**
 * Variant `thumbnail` trên Cloudflare Images thường ~300×300 — khi hiển thị rộng sẽ mờ.
 * Thay bằng `public` (variant mặc định độ phân giải cao hơn trong dashboard).
 */
export function imagedeliveryPreferPublicInHtml(html: string): string {
  if (!html.includes("imagedelivery.net") || !html.includes("/thumbnail")) {
    return html;
  }
  return html.replace(
    /(https:\/\/imagedelivery\.net\/[^/]+\/[^/]+)\/thumbnail(\?[^"'>\s]*)?/gi,
    "$1/public$2",
  );
}
