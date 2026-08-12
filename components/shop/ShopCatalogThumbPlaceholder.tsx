/**
 * Placeholder thumb khi hàng chưa có ảnh.
 * Vector icon ảnh mặc định (khung · núi · mặt trời) — monochrome như mẫu Windows/Fluent.
 */

type Props = {
  /** Giữ prop để caller cũ không gãy. */
  seed?: string | null;
  className?: string;
};

/** Icon gallery/ảnh mặc định — xám, bo góc, núi + mặt trời. */
function ImagePlaceholderGlyph() {
  return (
    <svg
      className="shop-catalog-thumb-ph-glyph"
      viewBox="0 0 80 80"
      width="80"
      height="80"
      aria-hidden
      focusable="false"
    >
      <rect width="80" height="80" rx="16" fill="#efefef" />
      <rect
        x="11"
        y="13"
        width="58"
        height="54"
        rx="9"
        fill="none"
        stroke="#c9c9c9"
        strokeWidth="5.5"
      />
      <circle cx="54" cy="29" r="7" fill="#c9c9c9" />
      {/* Núi phải (nhỏ, sau) */}
      <path
        d="M42 58.5 L52 43 Q54.5 38.5 57 43 L66 58.5 Z"
        fill="#c9c9c9"
      />
      {/* Núi trái (lớn, trước) */}
      <path
        d="M16 58.5 L31 37 Q34.5 31 38 37 L50 58.5 Z"
        fill="#c9c9c9"
      />
    </svg>
  );
}

export function ShopCatalogThumbPlaceholder({ className }: Props) {
  return (
    <span
      className={`shop-catalog-thumb-ph${className ? ` ${className}` : ""}`}
      aria-hidden
    >
      <ImagePlaceholderGlyph />
    </span>
  );
}
