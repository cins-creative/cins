import type { ComposePickerEntry } from "@/lib/article/compose/types";

/** Catalog picker đóng góp — giống Journey, thay palette bằng danh sách + bảng. */
export const ARTICLE_COMPOSE_PICKER: ComposePickerEntry[] = [
  { t: "h2", ico: "H₂", name: "Tiêu đề lớn", desc: "Heading section" },
  { t: "h3", ico: "H₃", name: "Tiêu đề nhỏ", desc: "Sub-heading" },
  { t: "body", ico: "¶", name: "Đoạn văn", desc: "Văn bản thường" },
  { t: "quote", ico: "❝", name: "Trích dẫn", desc: "Pull-quote nổi bật" },
  { t: "imgs", ico: "▥", name: "Ảnh / Album", desc: "Gợi ý tìm ảnh" },
  {
    t: "embed",
    ico: "▶",
    name: "Nhúng",
    desc: "YouTube · Vimeo · Figma · Sketchfab · Rive",
  },
  { t: "list-ul", ico: "•", name: "Danh sách", desc: "Gạch đầu dòng" },
  { t: "table", ico: "⊞", name: "Bảng", desc: "Bảng nội dung" },
  { t: "divider", ico: "—", name: "Ngăn cách", desc: "Divider" },
  { t: "spacer", ico: "↕", name: "Khoảng trống", desc: "Thêm khoảng cách" },
];
