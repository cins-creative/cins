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
   ║ Pure render — không state, không event. Có thể chạy server hoặc  ║
   ║ client. Nhận `blocks` đã sort theo `thu_tu`.                     ║
   ╚══════════════════════════════════════════════════════════════════╝ */

import { getCfAccountHash } from "@/lib/cloudflare/account-hash";
import {
  bunnyIframeSrc,
  classifyBunnyVideoUrl,
} from "@/lib/bunny/embed";
import { VideoProcessingPlaceholder } from "@/components/journey/VideoProcessingPlaceholder";
import type { Block } from "@/lib/editor/types";
import { getYoutubeId } from "@/lib/youtube";

const PICSUM = "https://picsum.photos/seed/";
const CF_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Build URL từ seed (giống `EditorView.ph`).
 * - UUID Cloudflare → `imagedelivery.net/{hash}/{id}/public`.
 * - Khác → picsum (placeholder).
 */
function ph(seed: string, w = 900, h = 600): string {
  if (!seed) return "";
  const trimmed = seed.trim();
  if (CF_UUID_RE.test(trimmed)) {
    const hash = getCfAccountHash();
    if (hash) {
      return `https://imagedelivery.net/${hash}/${trimmed}/public`;
    }
  }
  return `${PICSUM}${encodeURIComponent(trimmed)}/${w}/${h}`;
}

/* Embed URL classifier (client-safe; duplicate of `sanitize.ts` vì file đó
   bị `server-only`). Chỉ whitelist YouTube / Figma / Behance — khớp với
   serializer của `blocksToHtml`. */
const EMBED_HOSTS: Array<{
  host: RegExp;
  provider: "youtube" | "figma" | "behance";
}> = [
  {
    host: /^(www\.|m\.)?(youtube\.com|youtube-nocookie\.com|youtu\.be)$/i,
    provider: "youtube",
  },
  { host: /^(www\.)?figma\.com$/i, provider: "figma" },
  { host: /^(www\.)?behance\.net$/i, provider: "behance" },
];

function classifyEmbed(rawUrl: string): {
  provider: "youtube" | "figma" | "behance";
  url: string;
} | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
  for (const e of EMBED_HOSTS) {
    if (e.host.test(parsed.host)) {
      return { provider: e.provider, url: parsed.toString() };
    }
  }
  return null;
}

function resolveEmbedUrl(cfg: Record<string, unknown>): string {
  if (typeof cfg.url === "string" && cfg.url.trim()) return cfg.url.trim();
  if (typeof cfg.embedUrl === "string" && cfg.embedUrl.trim()) {
    return cfg.embedUrl.trim();
  }
  return "";
}

/* Figma embed URL — bọc URL gốc qua proxy embed của Figma. */
function figmaEmbedUrl(originalUrl: string): string {
  return `https://www.figma.com/embed?embed_host=cins&url=${encodeURIComponent(originalUrl)}`;
}

type ImgLayout = "full" | "boxed" | "duo" | "trio" | "grid4" | "mosaic";

/* ─── Cover image (read-only) ──────────────────────────────────── */

export function PostCover({ seed }: { seed: string | null | undefined }) {
  if (!seed) return null;

  return (
    <div className="cover-add has cover-readonly">
      <div className="cover-img-wrap">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ph(seed, 1400, 560)}
          alt="Ảnh bìa"
          width={1400}
          height={560}
          loading="eager"
          fetchPriority="high"
          decoding="async"
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

export function PostReadOnlyBlock({ block }: { block: Block }) {
  return ReadOnlyBlock({ block });
}

function ReadOnlyBlock({ block }: { block: Block }) {
  const cfg = block.config || {};
  const text = typeof cfg.html === "string" ? cfg.html : "";

  if (block.loai === "h2") {
    return <h2 className="b-text h2 b-text-ro">{renderMultiline(text)}</h2>;
  }
  if (block.loai === "h3") {
    return <h3 className="b-text h3 b-text-ro">{renderMultiline(text)}</h3>;
  }
  if (block.loai === "body") {
    return <p className="b-text b-text-ro">{renderMultiline(text)}</p>;
  }
  if (block.loai === "quote") {
    return (
      <div className="b-quote">
        <div className="b-quote-ro">{renderMultiline(text)}</div>
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
      return (
        <div
          className="b-embed b-embed-ro is-iframe"
          data-provider="youtube"
        >
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${youtubeId}`}
            title="YouTube video player"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            loading="eager"
          />
        </div>
      );
    }

    const bunny = classifyBunnyVideoUrl(url);
    if (bunny) {
      return (
        <div className="b-embed b-embed-ro is-iframe" data-provider="bunny">
          <iframe
            src={bunnyIframeSrc(bunny)}
            title="Video"
            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
            allowFullScreen
            loading="lazy"
          />
        </div>
      );
    }

    const cls = classifyEmbed(url);
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

    /* Figma → iframe qua proxy embed_host. Figma không yêu cầu tách ID. */
    if (cls.provider === "figma") {
      return (
        <div className="b-embed b-embed-ro is-iframe" data-provider="figma">
          <iframe
            src={figmaEmbedUrl(cls.url)}
            title="Figma file"
            allowFullScreen
            loading="lazy"
          />
        </div>
      );
    }

    /* Behance (hoặc YouTube không extract được ID): fallback anchor link
       — Behance dùng project ID không có trong public URL, không inline
       được. User vẫn mở được tab mới qua link. */
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
    const layout: ImgLayout =
      typeof cfg.layout === "string"
        ? (cfg.layout as ImgLayout)
        : "full";
    const rounded = !!cfg.rounded;
    const cap = typeof cfg.cap === "string" ? cfg.cap : "";

    if (layout === "mosaic") {
      // Lưới tùy chỉnh: cells chứa col/row span riêng, render bằng grid
      // theo `cols`. Cell rỗng (seed bắt đầu bằng `m-` hoặc `extra-`)
      // bị bỏ qua trong read-only view.
      const cols =
        typeof cfg.cols === "number" && cfg.cols >= 2 && cfg.cols <= 4
          ? cfg.cols
          : 3;
      const gap =
        typeof cfg.gap === "number" && cfg.gap >= 0 && cfg.gap <= 32
          ? cfg.gap
          : 0;
      const pad =
        typeof cfg.pad === "number" && cfg.pad >= 0 && cfg.pad <= 48
          ? cfg.pad
          : 0;
      const rawCells = Array.isArray(cfg.cells) ? (cfg.cells as unknown[]) : [];
      const cells = rawCells
        .map((raw) => {
          const c = raw as
            | {
                seed?: unknown;
                c?: unknown;
                r?: unknown;
                kind?: unknown;
                text?: unknown;
                align?: unknown;
                font?: unknown;
                size?: unknown;
              }
            | null;
          if (!c || typeof c.seed !== "string") return null;
          const kind = c.kind === "text" ? "text" : "image";
          if (kind === "image" && (!c.seed || /^m-|^extra-/.test(c.seed))) {
            return null;
          }
          return {
            seed: c.seed,
            c:
              typeof c.c === "number" && c.c >= 1 && c.c <= 4 ? c.c : 1,
            r:
              typeof c.r === "number" && c.r >= 1 && c.r <= 4 ? c.r : 1,
            kind,
            text: typeof c.text === "string" ? c.text : "",
            align:
              c.align === "left" || c.align === "right" || c.align === "center"
                ? c.align
                : "center",
            font: c.font === "sans" || c.font === "serif" ? c.font : "serif",
            size:
              c.size === "sm" || c.size === "lg" || c.size === "md"
                ? c.size
                : "md",
          };
        })
        .filter(
          (
            x,
          ): x is {
            seed: string;
            c: number;
            r: number;
            kind: "image" | "text";
            text: string;
            align: "left" | "center" | "right";
            font: "serif" | "sans";
            size: "sm" | "md" | "lg";
          } => x !== null,
        );
      if (cells.length === 0) return null;
      return (
        <div className="b-imgs b-imgs-ro mosaic-mode">
          <div
            className={`mosaic${rounded ? " rounded" : ""}`}
            style={{
              gridTemplateColumns: `repeat(${cols}, 1fr)`,
              gap,
              padding: pad,
            }}
          >
            {cells.map((cell, i) => (
              <div
                key={`${cell.seed}-${i}`}
                className="mz"
                style={{
                  gridColumn: `span ${cell.c}`,
                  gridRow: `span ${cell.r}`,
                }}
              >
                {cell.kind === "text" ? (
                  <div
                    className={`mz-text mz-align-${cell.align} mz-font-${cell.font} mz-size-${cell.size}`}
                  >
                    <p>{cell.text}</p>
                  </div>
                ) : (
                  <img src={ph(cell.seed, 900, 900)} alt="" loading="lazy" />
                )}
              </div>
            ))}
          </div>
          {cap ? <div className="img-cap img-cap-ro">{cap}</div> : null}
        </div>
      );
    }

    const imgs = Array.isArray(cfg.imgs)
      ? (cfg.imgs as unknown[])
          .map((s) => (typeof s === "string" ? s : ""))
          .filter(Boolean)
      : [];
    if (imgs.length === 0) return null;

    return (
      <div className="b-imgs b-imgs-ro">
        <div className={`imgwrap ${layout}${rounded ? " rounded" : ""}`}>
          {imgs.map((seed, i) => (
            <div key={`${seed}-${i}`} className="ph">
              <img src={ph(seed, 900, 900)} alt="" loading="lazy" />
            </div>
          ))}
        </div>
        {cap ? <div className="img-cap img-cap-ro">{cap}</div> : null}
      </div>
    );
  }

  return null;
}

/* Plain text từ textarea có thể nhiều dòng → render `\n` thành `<br>`. */
function renderMultiline(text: string) {
  if (!text) return null;
  const lines = text.split("\n");
  return lines.map((line, i) => (
    <span key={i}>
      {line}
      {i < lines.length - 1 ? <br /> : null}
    </span>
  ));
}
