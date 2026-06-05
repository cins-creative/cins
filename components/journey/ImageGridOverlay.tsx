type Props = {
  count: number;
};

/** Overlay "+N" trên ảnh thứ 5 khi album có >5 ảnh. */
export function ImageGridOverlay({ count }: Props) {
  if (count <= 0) return null;
  return (
    <span className="grid-overlay" aria-hidden>
      +{count}
    </span>
  );
}
