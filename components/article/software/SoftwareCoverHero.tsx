"use client";

import { SwInlineField } from "@/components/article/software/inline/SwInlineField";
import { useSoftwareInlineEdit } from "@/components/article/software/inline/SoftwareInlineEditContext";
import { parseLeadVideoUrl } from "@/lib/articles/lead-video-url";
import { relGradient, relInitials } from "@/lib/articles/rel-visual";

type Props = {
  title: string;
  slug: string;
  videoUrl?: string | null;
  publisher?: string | null;
};

export function SoftwareCoverHero({
  title,
  slug,
  videoUrl,
  publisher,
}: Props) {
  const ctx = useSoftwareInlineEdit();
  const displayTitle = ctx?.isEditing
    ? ctx.tieu_de.trim() || title
    : title;
  const displayPublisher = ctx?.isEditing
    ? ctx.nha_phat_hanh.trim() || null
    : publisher;
  const displayVideo = ctx?.isEditing
    ? ctx.main_video.trim() || null
    : videoUrl?.trim() || null;

  const grad = relGradient(slug);
  const ini = relInitials(displayTitle);
  const parsed = displayVideo ? parseLeadVideoUrl(displayVideo) : null;

  return (
    <header
      className={[
        "sw-cover",
        parsed ? "sw-cover--has-video" : "",
        ctx?.isEditing ? "sw-cover--editing" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label="Showreel phần mềm"
    >
      <div className="sw-cover-media">
        {parsed?.kind === "iframe" ? (
          <iframe
            src={parsed.src}
            title={`Showreel ${displayTitle}`}
            className="sw-cover-video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            loading="lazy"
          />
        ) : parsed?.kind === "video" ? (
          <video
            className="sw-cover-video"
            controls
            playsInline
            preload="metadata"
            src={parsed.src}
          />
        ) : (
          <div
            className="sw-cover-ph"
            style={{ background: grad }}
            aria-hidden
          >
            <span className="mascot-ph">{ini}</span>
          </div>
        )}
        {!parsed ? <div className="sw-cover-scrim" aria-hidden /> : null}
      </div>

      {ctx?.isEditing ? (
        <div className="sw-cover-edit-panel">
          <SwInlineField label="Tiêu đề (H1)">
            <input
              className="nct-inline-input nct-inline-input--title"
              value={ctx.tieu_de}
              onChange={(e) => ctx.setTieuDe(e.target.value)}
            />
          </SwInlineField>
          <SwInlineField label="Nhà phát hành (showreel)">
            <input
              className="nct-inline-input"
              value={ctx.nha_phat_hanh}
              onChange={(e) => ctx.setNhaPhatHanh(e.target.value)}
            />
          </SwInlineField>
          <SwInlineField label="Video showreel (YouTube URL)">
            <input
              className="nct-inline-input"
              value={ctx.main_video}
              onChange={(e) => ctx.setMainVideo(e.target.value)}
              placeholder="https://youtu.be/… hoặc YouTube / Vimeo"
            />
          </SwInlineField>
        </div>
      ) : !parsed ? (
        <div className="sw-cover-title-bar">
          <h1 className="h-disp sw-cover-title">{displayTitle}</h1>
          {displayPublisher ? (
            <p className="sw-cover-publisher">{displayPublisher}</p>
          ) : null}
        </div>
      ) : displayPublisher ? (
        <p className="sw-cover-publisher sw-cover-publisher--overlay">
          {displayPublisher}
        </p>
      ) : null}
    </header>
  );
}
