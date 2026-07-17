type Props = {
  className?: string;
  /** Chiều rộng cờ (px). Chiều cao scale theo tỉ lệ ribbon. */
  size?: number;
};

/**
 * Ribbon cờ nổi bật — swallowtail vàng, gắn góc trên card gallery.
 * Thay chip chữ "Nổi bật" để đồng bộ visual Journey / Gallery aside.
 */
export function FeaturedFlagBadge({ className, size = 20 }: Props) {
  const height = Math.round(size * 1.35);
  return (
    <span
      className={className ? `j-featured-flag ${className}` : "j-featured-flag"}
      role="img"
      aria-label="Feature"
    >
      <svg
        width={size}
        height={height}
        viewBox="0 0 20 27"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <path
          d="M1.5 0H18.5C19.05 0 19.5 0.45 19.5 1V4H0.5V1C0.5 0.45 0.95 0 1.5 0Z"
          fill="#E8940F"
        />
        <path
          d="M0.5 4H19.5V19.8C19.5 20.06 19.39 20.31 19.2 20.51L10.2 26.51C9.81 26.83 9.19 26.83 8.8 26.51L0.3 20.36C0.11 20.16 0 19.91 0 19.65V4H0.5Z"
          fill="#F5A623"
        />
        <path
          d="M2.5 5.5H17.5V18.5L10 23.5L2.5 18.5V5.5Z"
          fill="#FBBF24"
          fillOpacity="0.28"
        />
      </svg>
    </span>
  );
}
