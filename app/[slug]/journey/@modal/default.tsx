/**
 * Default cho parallel slot `@modal` của Journey route.
 *
 * Next.js bắt buộc parallel slot phải có `default.tsx` để render khi không
 * có route nào match (ví dụ: vào thẳng `/[slug]/journey` không có sub-url
 * bài viết). Trả `null` = không render gì → journey page hiển thị thuần,
 * không có modal đè.
 */
export default function ModalSlotDefault() {
  return null;
}
