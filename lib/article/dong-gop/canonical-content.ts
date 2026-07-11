import { buildContentPreview } from "@/lib/admin/article-preview";
import { contribBodyHtml } from "@/lib/article/dong-gop/contrib-document";

/** Có nội dung canonical hiển thị trên tab Nội dung. */
export function hasEntityCanonicalContent(
  noiDung: string | null | undefined,
): boolean {
  return buildContentPreview({
    noi_dung: contribBodyHtml(noiDung),
  }).hasData;
}

/** HTML lead canonical — bỏ wrapper hero đóng góp nếu còn sót. */
export function entityCanonicalLeadHtml(
  noiDung: string | null | undefined,
): string | null {
  const body = contribBodyHtml(noiDung).trim();
  return body || null;
}
