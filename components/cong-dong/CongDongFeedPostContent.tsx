"use client";

import Link from "next/link";

import { ImageGrid } from "@/components/journey/ImageGrid";
import { JourneyCardVideo } from "@/components/journey/JourneyCardVideo";
import { JourneyCoverImage } from "@/components/journey/JourneyCoverImage";
import {
  congDongMirrorIsPhotoAlbum,
  congDongMirrorPhotoGrid,
} from "@/lib/cong-dong/feed-post-media";
import { congDongBannerImageUrl, congDongImageUrl } from "@/lib/cong-dong/images";
import type { CongDongJourneyMirror, CongDongPostMedia } from "@/lib/cong-dong/types";
import {
  detectMediaPostKind,
  extractVideoUrl,
  milestoneCardCaptionPlain,
  shouldShowMilestoneCardTitle,
} from "@/lib/journey/post-media";
import { extractVideoProcessingMeta } from "@/lib/journey/video-processing-meta";

type Props = {
  authorSlug: string;
  journeyMirror?: CongDongJourneyMirror | null;
  fallbackTitle?: string | null;
  fallbackBody: string;
  fallbackMedia?: CongDongPostMedia[];
};

export function CongDongFeedPostContent({
  authorSlug,
  journeyMirror,
  fallbackTitle,
  fallbackBody,
  fallbackMedia = [],
}: Props) {
  if (journeyMirror) {
    return (
      <JourneyMirrorBody
        authorSlug={authorSlug}
        mirror={journeyMirror}
        extraCloudflareIds={fallbackMedia.map((m) => m.cloudflareId)}
      />
    );
  }

  const coverMedia = fallbackMedia[0];
  const coverSrc = coverMedia
    ? congDongImageUrl(coverMedia.cloudflareId)
    : null;
  const isStatusPost = !fallbackTitle && fallbackMedia.length === 0;

  return (
    <>
      {fallbackTitle ? <h3 className="cd-v4-p-title">{fallbackTitle}</h3> : null}
      <p
        className={`cd-v4-p-text${isStatusPost ? " is-status-only" : ""}`}
      >
        {fallbackBody}
      </p>
      {coverSrc ? (
        <div className="cd-v4-p-cover">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={coverSrc} alt="" loading="lazy" />
        </div>
      ) : null}
      {fallbackMedia.length > 1 ? (
        <div className="cd-v4-p-media-grid">
          {fallbackMedia.slice(1).map((m) => {
            const src = congDongImageUrl(m.cloudflareId);
            if (!src) return null;
            return (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img key={m.id} src={src} alt="" loading="lazy" />
            );
          })}
        </div>
      ) : null}
    </>
  );
}

function JourneyMirrorBody({
  authorSlug,
  mirror,
  extraCloudflareIds,
}: {
  authorSlug: string;
  mirror: CongDongJourneyMirror;
  extraCloudflareIds: string[];
}) {
  const blocks = mirror.noiDungBlocks;
  const isVideoPost = detectMediaPostKind(blocks) === "video";
  const isPhotoAlbum = congDongMirrorIsPhotoAlbum(blocks, extraCloudflareIds);
  const photoGridImages = isPhotoAlbum
    ? congDongMirrorPhotoGrid(blocks, extraCloudflareIds)
    : null;
  const showTitle = shouldShowMilestoneCardTitle(mirror.tieuDe, blocks);
  const caption = milestoneCardCaptionPlain(mirror.moTa, blocks);
  const isArticle = !isPhotoAlbum && !isVideoPost;
  const videoEmbedUrl = isVideoPost ? extractVideoUrl(blocks) : null;
  const videoProcessingMeta = isVideoPost
    ? extractVideoProcessingMeta(blocks)
    : null;
  const postHref = `/${authorSlug}/p/${mirror.postSlug}`;

  const coverSrc =
    mirror.coverId && !isPhotoAlbum
      ? congDongBannerImageUrl(mirror.coverId)
      : null;

  return (
    <div className={`cd-v4-jcard-mirror jcard${isPhotoAlbum ? " jcard--photo" : isVideoPost ? " jcard--video" : " jcard--article"}`}>
      <div className="jcard-body">
        <div className="jcard-content">
          {showTitle ? (
            <h2 className="jcard-title">
              <Link href={postHref} prefetch={false}>
                {mirror.tieuDe}
              </Link>
            </h2>
          ) : null}

          {caption && !isArticle ? (
            <div className="jcard-lead">
              <p className="jcard-desc">{caption}</p>
            </div>
          ) : null}

          {caption && isArticle ? (
            <div className="jcard-lead">
              <p className="jcard-desc">{caption}</p>
            </div>
          ) : null}

          <div className="jcard-media-zone">
            {isVideoPost && videoEmbedUrl ? (
              <div className="preview preview--video">
                <JourneyCardVideo
                  url={videoEmbedUrl}
                  title={showTitle ? mirror.tieuDe : caption || mirror.tieuDe}
                  processing={videoProcessingMeta?.processing === true}
                  preview={
                    coverSrc
                      ? {
                          src: coverSrc,
                          width: 1280,
                          height: 720,
                          label: mirror.tieuDe,
                        }
                      : null
                  }
                  noiDungBlocks={blocks}
                />
              </div>
            ) : isPhotoAlbum && photoGridImages ? (
              <div className="preview preview--photo-grid">
                <ImageGrid
                  images={photoGridImages}
                  readOnly
                  timelineLightbox
                />
              </div>
            ) : coverSrc ? (
              <Link href={postHref} className="preview" prefetch={false}>
                <JourneyCoverImage
                  src={coverSrc}
                  width={800}
                  height={450}
                  alt={mirror.tieuDe}
                />
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
