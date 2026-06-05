type Props = {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  srcSet?: string;
  sizes?: string;
  /** Above-the-fold — eager + fetchPriority high. */
  priority?: boolean;
  className?: string;
};

/**
 * `<img>` chuẩn Journey — lazy mặc định, dimensions chống CLS, srcset CF.
 */
export function JourneyCoverImage({
  src,
  alt,
  width,
  height,
  srcSet,
  sizes,
  priority = false,
  className,
}: Props) {
  if (!src) return null;

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={src}
      srcSet={srcSet}
      sizes={srcSet ? sizes : undefined}
      width={width}
      height={height}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      decoding={priority ? "sync" : "async"}
      className={className}
    />
  );
}
