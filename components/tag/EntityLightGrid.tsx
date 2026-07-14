"use client";

import Image from "next/image";
import Link from "next/link";
import { Users } from "lucide-react";

import type { MilestoneItem } from "@/components/journey/milestone-types";
import { getCoverUrl } from "@/lib/articles/cover";
import { resolvePostGridEntry } from "@/lib/journey/post-content-kind";

type GridLayout = "grid" | "masonry";

type Props = {
  milestones: ReadonlyArray<MilestoneItem>;
  layout?: GridLayout;
};

type Preview = {
  src: string;
  width: number;
  height: number;
};

function gridHref(m: MilestoneItem): string {
  const postSlug = m.postSlug?.trim();
  const ownerSlug = m.lensOwnerSlug ?? m.postOwnerSlug ?? "";
  if (ownerSlug && postSlug && postSlug !== m.id) {
    return `/${encodeURIComponent(ownerSlug)}/p/${encodeURIComponent(postSlug)}`;
  }
  if (m.congDongOrg?.href) return m.congDongOrg.href;
  if (ownerSlug) return `/${encodeURIComponent(ownerSlug)}/journey`;
  return "#";
}

/**
 * Thumb lưới entity: ưu tiên `media` (cover/video), rồi ảnh đầu album như Gallery
 * — `milestonePreviewMedia` cố ý để trống album không cover (Journey render blocks).
 */
function gridPreview(m: MilestoneItem): Preview | null {
  const media = m.media?.[0];
  const fromMedia = media?.src?.trim();
  if (fromMedia) {
    return {
      src: fromMedia,
      width: media?.width && media.width > 0 ? media.width : 4,
      height: media?.height && media.height > 0 ? media.height : 3,
    };
  }

  const entry = resolvePostGridEntry({
    moTa: m.tacPhamMoTa ?? m.body,
    coverId: m.tacPhamCoverId,
    blocks: m.noiDungBlocks ?? [],
  });
  if (!entry) return null;

  const coverSrc = entry.coverSrc?.trim() || getCoverUrl(entry.coverId, "public");
  if (!coverSrc) return null;
  return { src: coverSrc, width: 4, height: 3 };
}

export function EntityLightGrid({ milestones, layout = "grid" }: Props) {
  if (milestones.length === 0) {
    return <p className="entity-light-empty">Chưa có tác phẩm nào gắn tag này.</p>;
  }

  const isMasonry = layout === "masonry";

  return (
    <div
      className={
        "entity-light-grid" + (isMasonry ? " entity-light-grid--masonry" : "")
      }
    >
      {milestones.map((m) => {
        const preview = gridPreview(m);
        const author =
          m.congDongOrg?.name ??
          m.lensOwnerName ??
          (m.lensOwnerSlug ? `@${m.lensOwnerSlug}` : "—");
        const thumbStyle =
          isMasonry && preview
            ? { aspectRatio: `${preview.width} / ${preview.height}` }
            : undefined;
        return (
          <Link key={m.id} href={gridHref(m)} className="entity-gcard">
            <div
              className={
                "entity-gcard-thumb" + (preview ? " has-img" : " is-empty")
              }
              style={thumbStyle}
            >
              {preview ? (
                <Image
                  src={preview.src}
                  alt=""
                  width={isMasonry ? preview.width * 100 : 400}
                  height={isMasonry ? preview.height * 100 : 300}
                  sizes="(max-width: 640px) 50vw, 220px"
                  loading="lazy"
                  unoptimized
                />
              ) : (
                <span aria-hidden>{m.title.slice(0, 2).toUpperCase()}</span>
              )}
            </div>
            <div className="entity-gcard-info">
              <p className="entity-gcard-title">
                {m.title?.trim() || "Không tiêu đề"}
              </p>
              <p className="entity-gcard-author">{author}</p>
              {m.congDongOrg ? (
                <span className="entity-gcard-src">
                  <Users size={11} strokeWidth={2} aria-hidden />
                  {m.congDongOrg.name}
                </span>
              ) : null}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
