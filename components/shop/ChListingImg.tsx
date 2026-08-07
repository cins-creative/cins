"use client";

import { swapCfImageVariant } from "@/lib/cloudflare/cf-variant-url";
import type { CfNamedVariant } from "@/lib/cloudflare/cf-image-variants";

type Props = {
  src: string | null | undefined;
  variant?: CfNamedVariant;
  className?: string;
  alt?: string;
};

/** Ảnh listing — variant CF nhỏ + lazy native. */
export function ChListingImg({
  src,
  variant = "thumbnail",
  className,
  alt = "",
}: Props) {
  if (!src) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={swapCfImageVariant(src, variant)}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
    />
  );
}
