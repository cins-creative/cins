"use client";

import { NgheLeadVideo } from "@/components/article/nghe/NgheLeadVideo";
import { NganhEditorialBannerEditor } from "@/components/nganh/NganhEditorialBannerEditor";
import { NganhMediaEmpty } from "@/components/nganh/NganhMediaEmpty";
import { useNganhInlineEdit } from "@/components/nganh/inline/NganhInlineEditContext";
import { resolveNganhVideoUrl } from "@/lib/nganh/media-fields";
import type { NganhDetailArticle } from "@/lib/nganh/types";

type Props = {
  article: NganhDetailArticle;
  /** `video` — trên intro; `banner` — sau intro; `all` — cả hai (legacy). */
  part?: "video" | "banner" | "all";
};

export function NganhArticleMedia({ article, part = "all" }: Props) {
  const ctx = useNganhInlineEdit();

  const mainVideo = ctx?.isEditing ? ctx.main_video : article.main_video;
  const editorialImages = ctx?.isEditing
    ? ctx.editorial_images
    : (article.meta?.editorial_images ?? []);

  const videoUrl = resolveNganhVideoUrl({
    main_video: mainVideo,
    meta: ctx?.isEditing
      ? {
          ma_nganh: article.meta?.ma_nganh ?? "",
          khoi_thi: article.meta?.khoi_thi ?? [],
          video_url: ctx.video_url.trim() || null,
        }
      : article.meta,
  });

  const showVideoBlock =
    (part === "video" || part === "all") &&
    (Boolean(videoUrl) || Boolean(ctx?.isEditing));
  const showBannerBlock =
    (part === "banner" || part === "all") &&
    (editorialImages.length > 0 || Boolean(ctx?.isEditing));

  if (!showBannerBlock && !showVideoBlock) return null;

  const sectionLabel =
    part === "video"
      ? "Video bài ngành"
      : part === "banner"
        ? "Ảnh minh họa bài ngành"
        : "Media bài ngành";

  return (
    <section className="nct-article-media" aria-label={sectionLabel}>
      {showVideoBlock ? (
        <div className="nct-media-block">
          <h2 className="nct-media-block-label">Video YouTube / giới thiệu</h2>
          <div className="nct-lead-video-wrap nct-lead-video-wrap--16x9">
            {videoUrl ? (
              <NgheLeadVideo url={videoUrl} />
            ) : (
              <NganhMediaEmpty
                title="Chưa có video"
                hint="main_video hoặc meta.video_url"
              />
            )}
          </div>
          {ctx?.isEditing ? <NctVideoEditFields ctx={ctx} /> : null}
        </div>
      ) : null}

      {showBannerBlock ? (
        <div className="nct-media-block">
          <h2 className="nct-media-block-label">Ảnh minh họa (banner)</h2>
          <NganhEditorialBannerEditor editorialImages={editorialImages} />
        </div>
      ) : null}
    </section>
  );
}

function NctVideoEditFields({
  ctx,
}: {
  ctx: NonNullable<ReturnType<typeof useNganhInlineEdit>>;
}) {
  return (
    <div className="nct-media-edit-row">
      <label className="nct-inline-field">
        <span className="nct-inline-field-label">main_video</span>
        <input
          className="nct-inline-input"
          value={ctx.main_video}
          onChange={(e) => ctx.setMainVideo(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=…"
        />
      </label>
      <label className="nct-inline-field">
        <span className="nct-inline-field-label">meta.video_url (dự phòng)</span>
        <input
          className="nct-inline-input"
          value={ctx.video_url}
          onChange={(e) => ctx.setVideoUrl(e.target.value)}
          placeholder="https://youtu.be/…"
        />
      </label>
    </div>
  );
}
