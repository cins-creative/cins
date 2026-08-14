/* ╔══════════════════════════════════════════════════════════════════╗
   ║ PostRenderer — read-only render bài viết theo đúng layout của    ║
   ║ `EditorView` (`.editor-canvas`).                                 ║
   ║                                                                  ║
   ║ Mục tiêu: 3 nơi (Trang tạo · Trang sửa · Trang xem) phải đồng    ║
   ║ bộ 100% về cấu trúc DOM + class — copy markup từ EditorView,    ║
   ║ bỏ side controls (`block-side`, `add-zone`, `lay-bar`, `ph-     ║
   ║ change`, picker, ...) — phần còn lại style bằng cùng `editor.   ║
   ║ css`. Override read-only spacing trong `post-view.css`.         ║
   ║                                                                  ║
   ║ Gần như pure render. Block `imgs` giao client `PostReadOnlyImgs` ║
   ║ (lightbox). Nhận `blocks` đã sort theo `thu_tu`.                  ║
   ╚══════════════════════════════════════════════════════════════════╝ */

import { VideoProcessingPlaceholder } from "@/components/journey/VideoProcessingPlaceholder";
import { PostVimeoEmbed } from "@/components/journey/PostVimeoEmbed";
import { PostRiveFileEmbed } from "@/components/journey/PostRiveFileEmbed";
import { PostLottieFileEmbed } from "@/components/journey/PostLottieFileEmbed";
import { ViewportGatedEmbed } from "@/components/journey/ViewportGatedEmbed";
import { PlayCanvasScaleFit } from "@/components/journey/PlayCanvasScaleFit";
import {
  handleBlockImageError,
  resolveImageSeedUrl,
} from "@/lib/editor/resolve-image-seed-url";
import type { Block } from "@/lib/editor/types";
import {
  parseTableConfig,
  tableBlockClassName,
  visibleCellsInRow,
} from "@/lib/editor/table-block";
import {
  buildStreamIframeUrl,
  buildStreamThumbnailUrl,
  classifyStreamVideoUrl,
  isStreamUid,
} from "@/lib/cloudflare/stream-embed";
import {
  parseVideoCanvasRatio,
  videoCanvasRatioClass,
} from "@/lib/journey/video-canvas-ratio";
import {
  buildEmbedIframeSrc,
  classifyEmbedUrl,
  embedIframeAllowAttr,
  embedIframeTitle,
} from "@/lib/editor/embed-providers";
import { MoTaMarkdown } from "@/components/editor/compose/MoTaMarkdown";
import { PostReadOnlyImgs } from "@/components/editor/PostReadOnlyImgs";
import {
  coverThumbAspectCss,
  coverThumbImageStyle,
  coverThumbLayoutSize,
  resolveCoverThumbDeliveryUrl,
  type CoverThumbMeta,
} from "@/lib/journey/cover-thumb";

import { getYoutubeId } from "@/lib/youtube";

/**
 * Build URL từ seed (giống `EditorView.ph`).
 * - URL http(s) / UUID Cloudflare / blob — xem `resolveImageSeedUrl`.
 */
function ph(seed: string, w = 900, h = 600): string {
  return resolveImageSeedUrl(seed, w, h);
}

function resolveEmbedUrl(cfg: Record<string, unknown>): string {
  if (typeof cfg.url === "string" && cfg.url.trim()) return cfg.url.trim();
  if (typeof cfg.embedUrl === "string" && cfg.embedUrl.trim()) {
    return cfg.embedUrl.trim();
  }
  return "";
}

/** Uid Stream từ cfg (provider tường minh) hoặc từ URL Stream. */
function resolveEmbedStreamUid(
  cfg: Record<string, unknown>,
  url: string,
): string | null {
  const videoId =
    (typeof cfg.videoId === "string" ? cfg.videoId.trim() : "") ||
    (typeof cfg.bunnyVideoId === "string" ? cfg.bunnyVideoId.trim() : "");
  if (isStreamUid(videoId)) return videoId;
  return classifyStreamVideoUrl(url)?.uid ?? null;
}

function resolveEmbedCanvasClass(cfg: Record<string, unknown>): string {
  const ratio = cfg.videoCanvasRatio;
  if (ratio === "16:9" || ratio === "1:1" || ratio === "3:4") {
    return videoCanvasRatioClass(ratio);
  }
  return "";
}

/* ─── Cover image (read-only) ──────────────────────────────────── */

export function PostCover({
  seed,
  coverThumb,
}: {
  seed: string | null | undefined;
  /** Tỉ lệ + điểm neo từ `noi_dung_blocks` — bài cũ không meta giữ layout cũ. */
  coverThumb?: CoverThumbMeta | null;
}) {
  if (!seed) return null;

  const meta = coverThumb ?? null;
  const layout = coverThumbLayoutSize(meta ?? undefined, "hero");
  const gravitySrc = meta
    ? resolveCoverThumbDeliveryUrl(seed, meta, "hero")
    : null;
  const src = gravitySrc ?? ph(seed, layout.width, layout.height);
  const wrapStyle = meta
    ? { aspectRatio: coverThumbAspectCss(meta) }
    : undefined;
  const imgStyle = meta ? coverThumbImageStyle(meta) : undefined;

  return (
    <div
      className={`cover-add has cover-readonly${meta ? " has-cover-thumb" : ""}`}
      style={wrapStyle}
    >
      <div className="cover-img-wrap" style={wrapStyle}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt="Ảnh bìa"
          width={layout.width}
          height={layout.height}
          loading="eager"
          fetchPriority="high"
          decoding="async"
          style={imgStyle}
          onError={handleBlockImageError}
        />
      </div>
    </div>
  );
}

/* ─── Block dispatch (read-only) ──────────────────────────────── */

export function PostBlocksRenderer({
  blocks,
}: {
  blocks: ReadonlyArray<Block>;
}) {
  if (blocks.length === 0) return null;
  return (
    <div className="blocks blocks-readonly">
      {blocks.map((b) => (
        <div key={b.id} className="block" data-block-type={b.loai}>
          <div className="block-inner">
            <ReadOnlyBlock block={b} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function PostReadOnlyBlock({
  block,
  mediaAutoplay = false,
}: {
  block: Block;
  mediaAutoplay?: boolean;
}) {
  return ReadOnlyBlock({ block, mediaAutoplay });
}

function textAlignClass(cfg: Record<string, unknown>): string {
  if (cfg.align === "center") return " is-align-center";
  if (cfg.align === "right") return " is-align-right";
  return "";
}

function ReadOnlyBlock({
  block,
  mediaAutoplay = false,
}: {
  block: Block;
  mediaAutoplay?: boolean;
}) {
  const cfg = block.config || {};
  const text = typeof cfg.html === "string" ? cfg.html : "";

  if (block.loai === "h2") {
    return (
      <MoTaMarkdown
        text={text}
        as="h2"
        className={`b-text h2 b-text-ro${textAlignClass(cfg)}`}
      />
    );
  }
  if (block.loai === "h3") {
    return (
      <MoTaMarkdown
        text={text}
        as="h3"
        className={`b-text h3 b-text-ro${textAlignClass(cfg)}`}
      />
    );
  }
  if (block.loai === "body") {
    return (
      <MoTaMarkdown
        text={text}
        as="div"
        className={`b-text b-text-ro${textAlignClass(cfg)}`}
      />
    );
  }
  if (block.loai === "quote") {
    return (
      <div className="b-quote">
        <MoTaMarkdown text={text} as="div" className="b-quote-ro" />
      </div>
    );
  }
  if (block.loai === "table") {
    const table = parseTableConfig(cfg);
    return (
      <div className={tableBlockClassName(table, "b-table-ro")}>
        <table>
          <colgroup>
            {table.colWidths.map((w, i) => (
              <col key={i} style={{ width: `${w}%` }} />
            ))}
          </colgroup>
          <tbody>
            {table.rows.map((row, ri) => (
              <tr
                key={ri}
                className={
                  table.header && ri === 0 ? "is-header-row" : "is-body-row"
                }
              >
                {visibleCellsInRow(table.rows, table.merges, ri).map((cell) => {
                  const Tag = table.header && ri === 0 ? "th" : "td";
                  return (
                    <Tag
                      key={`${ri}-${cell.col}`}
                      colSpan={cell.colspan > 1 ? cell.colspan : undefined}
                      rowSpan={cell.rowspan > 1 ? cell.rowspan : undefined}
                    >
                      <MoTaMarkdown
                        text={row[cell.col] ?? ""}
                        as="span"
                        className="b-table-cell-md"
                      />
                    </Tag>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  if (block.loai === "divider") {
    const lenRaw =
      typeof cfg.len === "number" && cfg.len >= 5 && cfg.len <= 100
        ? cfg.len
        : 8;
    const thick: "thin" | "med" | "thick" =
      cfg.thick === "thin" || cfg.thick === "thick" ? cfg.thick : "med";
    return (
      <div className={`b-divider thick-${thick}`}>
        <span style={{ width: `${lenRaw}%` }} />
      </div>
    );
  }
  if (block.loai === "spacer") {
    const size =
      cfg.size === "s" || cfg.size === "l" ? (cfg.size as "s" | "l") : "m";
    return (
      <div className={`b-spacer ${size}`}>
        <div className="sp-line" />
      </div>
    );
  }
  if (block.loai === "palette") {
    const colors = Array.isArray(cfg.colors)
      ? (cfg.colors as unknown[])
          .map((c) => (typeof c === "string" ? c : ""))
          .filter(Boolean)
      : [];
    if (colors.length === 0) return null;
    return (
      <div className="b-palette">
        {colors.map((c, i) => (
          <div key={`${c}-${i}`} className="sw" style={{ background: c }}>
            <span>{c}</span>
          </div>
        ))}
      </div>
    );
  }
  if (block.loai === "embed") {
    const url = resolveEmbedUrl(cfg);
    if (cfg.videoProcessing === true) {
      return <VideoProcessingPlaceholder />;
    }

    const youtubeId = getYoutubeId(url);
    if (youtubeId) {
      const canvasClass = resolveEmbedCanvasClass(cfg);
      const youtubeSrc = mediaAutoplay
        ? `https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&playsinline=1`
        : `https://www.youtube-nocookie.com/embed/${youtubeId}`;
      return (
        <ViewportGatedEmbed
          className={
            "b-embed b-embed-ro is-iframe" +
            (canvasClass ? ` ${canvasClass}` : "")
          }
          data-provider="youtube"
        >
          <iframe
            src={youtubeSrc}
            title="YouTube video player"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            loading="eager"
          />
        </ViewportGatedEmbed>
      );
    }

    const streamUid = resolveEmbedStreamUid(cfg, url);
    if (streamUid) {
      const canvasClass = resolveEmbedCanvasClass(cfg);
      const streamSrc = mediaAutoplay
        ? `${buildStreamIframeUrl(streamUid)}?autoplay=true&muted=true&poster=${encodeURIComponent(buildStreamThumbnailUrl(streamUid) ?? "")}`
        : buildStreamIframeUrl(streamUid);
      return (
        <ViewportGatedEmbed
          className={
            "b-embed b-embed-ro is-iframe" +
            (canvasClass ? ` ${canvasClass}` : "")
          }
          data-provider="stream"
        >
          <iframe
            src={streamSrc}
            title="Video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            loading="eager"
          />
        </ViewportGatedEmbed>
      );
    }

    const cls = classifyEmbedUrl(url);
    if (cls?.provider === "rive-file") {
      return (
        <ViewportGatedEmbed
          className="b-embed b-embed-ro is-rive-file-host"
          data-provider="rive-file"
        >
          <PostRiveFileEmbed src={cls.url} fit="native" />
        </ViewportGatedEmbed>
      );
    }
    if (cls?.provider === "lottie-file") {
      return (
        <ViewportGatedEmbed
          className="b-embed b-embed-ro is-lottie-file-host"
          data-provider="lottie-file"
        >
          <PostLottieFileEmbed src={cls.url} />
        </ViewportGatedEmbed>
      );
    }
    if (!cls) {
      if (url.trim()) {
        return (
          <div className="b-embed b-embed-ro" data-provider="link">
            <div className="em-ic" aria-hidden>
              ▶
            </div>
            <a
              className="em-link"
              href={url.trim()}
              target="_blank"
              rel="noopener noreferrer"
            >
              {url.trim()}
            </a>
          </div>
        );
      }
      return null;
    }

    const iframeSrc = buildEmbedIframeSrc(cls, { autoplay: mediaAutoplay });
    if (iframeSrc) {
      const canvasClass =
        cls.provider === "youtube" ? resolveEmbedCanvasClass(cfg) : "";
      const iframe = (
        <iframe
          src={iframeSrc}
          title={embedIframeTitle(cls.provider)}
          allow={embedIframeAllowAttr(cls.provider)}
          referrerPolicy={
            cls.provider === "youtube" || cls.provider === "vimeo"
              ? "strict-origin-when-cross-origin"
              : undefined
          }
          allowFullScreen
          loading={mediaAutoplay ? "eager" : "lazy"}
        />
      );
      if (cls.provider === "vimeo") {
        return (
          <PostVimeoEmbed
            url={cls.url}
            storedRatio={parseVideoCanvasRatio(cfg.videoCanvasRatio)}
          >
            {iframe}
          </PostVimeoEmbed>
        );
      }
      return (
        <ViewportGatedEmbed
          className={
            "b-embed b-embed-ro is-iframe" +
            (canvasClass ? ` ${canvasClass}` : "")
          }
          data-provider={cls.provider}
        >
          {cls.provider === "playcanvas" ? (
            <PlayCanvasScaleFit>{iframe}</PlayCanvasScaleFit>
          ) : (
            iframe
          )}
        </ViewportGatedEmbed>
      );
    }

    /* Behance: không inline iframe — fallback link. */
    return (
      <div className="b-embed b-embed-ro" data-provider={cls.provider}>
        <div className="em-ic" aria-hidden>
          ▶
        </div>
        <a
          className="em-link"
          href={cls.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          {cls.url}
        </a>
      </div>
    );
  }
  if (block.loai === "imgs") {
    return <PostReadOnlyImgs block={block} />;
  }

  return null;
}
