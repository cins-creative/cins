"use client";

import { ShopImageDecoy } from "@/components/shop/ShopImageProtect";
import { swapCfImageVariant } from "@/lib/cloudflare/cf-variant-url";
import type { CfNamedVariant } from "@/lib/cloudflare/cf-image-variants";
import {
  parseShopThumbFit,
  type ShopThumbFit,
} from "@/lib/shop/anh-thumb-fit";

type Props = {
  src: string | null | undefined;
  variant?: CfNamedVariant;
  className?: string;
  alt?: string;
  /** Ô vuông: contain giữ nguyên tỉ lệ; cover mặc định. */
  fit?: ShopThumbFit | string | null;
  /** Ảnh hàng khách — decoy trên cùng. Cover/avatar shop để false. */
  protect?: boolean;
};

/** Ảnh listing — variant CF nhỏ + lazy native. */
export function ChListingImg({
  src,
  variant = "thumbnail",
  className,
  alt = "",
  fit,
  protect = false,
}: Props) {
  if (!src) return null;

  const url = swapCfImageVariant(src, variant);
  const resolved = parseShopThumbFit(fit);

  if (resolved === "contain" || protect) {
    return (
      <span className="ch-listing-img-stack" data-shop-thumb-fit={resolved}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={alt}
          className={className}
          loading="lazy"
          decoding="async"
          draggable={false}
        />
        {protect ? <ShopImageDecoy /> : null}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
    />
  );
}
