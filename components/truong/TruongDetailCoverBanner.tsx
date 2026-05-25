import Image from "next/image";
import type { ReactNode } from "react";

import { TruongOrgBrandMark } from "@/components/truong/TruongOrgBrandMark";
import type { TruongListItem } from "@/lib/truong/types";

type Props = {
  coverUrl?: string | null;
  coverPending?: boolean;
  overlay?: ReactNode;
  /** Logo trường watermark trên overlay (cùng nguồn avatar identity). */
  school?: Pick<
    TruongListItem,
    "avatar_id" | "logo_id" | "ten" | "avatar_src"
  > | null;
  avatarPreviewUrl?: string | null;
  layout?: "legacy" | "v6";
};

export function TruongDetailCoverBanner({
  coverUrl,
  coverPending = false,
  overlay,
  school,
  avatarPreviewUrl,
  layout = "legacy",
}: Props) {
  const isRemote =
    coverUrl?.includes("imagedelivery.net") || coverUrl?.startsWith("blob:");

  const wrapClass =
    layout === "v6"
      ? `cover-frame fade f1${coverPending ? " cover-banner--pending" : ""}`
      : `cover-banner${coverPending ? " cover-banner--pending" : ""}`;

  return (
    <section
      className={wrapClass}
      aria-label={layout === "v6" ? "Ảnh bìa trường" : undefined}
    >
      <div className="cover-banner-bg">
        {coverUrl ? (
          <Image
            key={coverUrl}
            src={coverUrl}
            alt=""
            fill
            priority
            sizes="100vw"
            style={{ objectFit: "cover" }}
            unoptimized={Boolean(isRemote)}
          />
        ) : null}
      </div>
      {!coverUrl ? (
        <div className="cover-banner-art">
          <svg
            viewBox="0 0 1200 280"
            preserveAspectRatio="xMidYMid slice"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <radialGradient id="truong-sg1" cx="60%" cy="40%" r="50%">
                <stop offset="0%" stopColor="rgba(187,137,248,0.22)" />
                <stop offset="100%" stopColor="rgba(0,0,0,0)" />
              </radialGradient>
              <radialGradient id="truong-sg2" cx="20%" cy="60%" r="40%">
                <stop offset="0%" stopColor="rgba(31,116,201,0.18)" />
                <stop offset="100%" stopColor="rgba(0,0,0,0)" />
              </radialGradient>
              <radialGradient id="truong-sg3" cx="90%" cy="80%" r="30%">
                <stop offset="0%" stopColor="rgba(253,232,89,0.1)" />
                <stop offset="100%" stopColor="rgba(0,0,0,0)" />
              </radialGradient>
            </defs>
            <rect width="1200" height="280" fill="url(#truong-sg1)" />
            <rect width="1200" height="280" fill="url(#truong-sg2)" />
            <rect width="1200" height="280" fill="url(#truong-sg3)" />
            <rect
              x="350"
              y="115"
              width="500"
              height="135"
              fill="rgba(255,255,255,0.05)"
              rx="2"
            />
            <polygon
              points="330,115 600,68 870,115"
              fill="rgba(255,255,255,0.08)"
            />
            <line
              x1="330"
              y1="115"
              x2="870"
              y2="115"
              stroke="rgba(255,255,255,0.12)"
              strokeWidth="1"
            />
            <rect
              x="390"
              y="115"
              width="7"
              height="135"
              fill="rgba(255,255,255,0.08)"
            />
            <rect
              x="430"
              y="115"
              width="7"
              height="135"
              fill="rgba(255,255,255,0.08)"
            />
            <rect
              x="470"
              y="115"
              width="7"
              height="135"
              fill="rgba(255,255,255,0.08)"
            />
            <rect
              x="510"
              y="115"
              width="7"
              height="135"
              fill="rgba(255,255,255,0.08)"
            />
            <rect
              x="683"
              y="115"
              width="7"
              height="135"
              fill="rgba(255,255,255,0.08)"
            />
            <rect
              x="560"
              y="155"
              width="80"
              height="95"
              rx="40"
              fill="rgba(0,0,0,0.22)"
              stroke="rgba(255,255,255,0.12)"
              strokeWidth="0.5"
            />
            <ellipse
              cx="120"
              cy="210"
              rx="40"
              ry="56"
              fill="rgba(110,254,192,0.18)"
            />
            <ellipse
              cx="1080"
              cy="210"
              rx="40"
              ry="56"
              fill="rgba(110,254,192,0.18)"
            />
            <rect
              x="0"
              y="234"
              width="1200"
              height="2"
              fill="rgba(253,232,89,0.16)"
            />
          </svg>
        </div>
      ) : null}
      <div
        className={`cover-overlay${coverUrl ? " cover-overlay--photo" : ""}`}
        aria-hidden
      >
        {school && !coverUrl ? (
          <TruongOrgBrandMark
            school={school}
            previewUrl={avatarPreviewUrl}
            variant="banner-cover"
          />
        ) : null}
      </div>
      <div className="cover-noise" aria-hidden />
      {layout === "v6" ? <div className="cover-fade" aria-hidden /> : null}
      {overlay ? <div className="tdh-cover-overlay-slot">{overlay}</div> : null}
    </section>
  );
}
