type Props = {
  count: number;
};

/** Overlay "+N" trên ô thứ 6 khi album có >6 ảnh. */
export function ImageGridOverlay({ count }: Props) {
  if (count <= 0) return null;
  return (
    <span className="grid-overlay" aria-hidden>
      +{count}
    </span>
  );
}
