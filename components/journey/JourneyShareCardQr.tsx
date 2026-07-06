"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";

/** Kích thước hiển thị trên thẻ — đủ lớn để quét bằng điện thoại. */
export const JOURNEY_SHARE_QR_DISPLAY_PX = 80;

type Props = {
  url: string;
  size?: number;
};

/** QR footer thẻ share — encode URL Journey/Gallery. */
export function JourneyShareCardQr({
  url,
  size = JOURNEY_SHARE_QR_DISPLAY_PX,
}: Props) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void QRCode.toDataURL(url, {
      width: size * 3,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#0f172a", light: "#fafbfc" },
    })
      .then((dataUrl) => {
        if (!cancelled) setSrc(dataUrl);
      })
      .catch(() => {
        if (!cancelled) setSrc(null);
      });
    return () => {
      cancelled = true;
    };
  }, [url, size]);

  if (!src) {
    return (
      <span
        className="j-share-card-qr j-share-card-qr--loading"
        style={{ width: size, height: size }}
        aria-hidden
      >
        …
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      className="j-share-card-qr"
      width={size}
      height={size}
      decoding="async"
    />
  );
}
