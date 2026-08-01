import "./meme-shapes-loader.css";

type Props = {
  size?: number;
  className?: string;
  label?: string;
};

/**
 * Loader chung CINs (meme shapes) — 4 hình luôn đổi chỗ theo vòng 2×2.
 */
export function MemeShapesLoader({
  size = 28,
  className = "",
  label = "Đang tải",
}: Props) {
  return (
    <span
      className={`meme-shapes-loader${className ? ` ${className}` : ""}`}
      style={{ width: size, height: size }}
      role="status"
      aria-label={label}
    >
      <span className="meme-shapes-loader-stage" aria-hidden>
        <span className="meme-shapes-loader-shape is-tri" />
        <span className="meme-shapes-loader-shape is-cir" />
        <span className="meme-shapes-loader-shape is-sq" />
        <span className="meme-shapes-loader-shape is-dia" />
      </span>
    </span>
  );
}
