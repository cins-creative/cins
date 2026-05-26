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

import type { Block } from "@/lib/editor/types";

const PICSUM = "https://picsum.photos/seed/";

function ph(seed: string, w = 900, h = 600): string {
  if (!seed) return "";
  return `${PICSUM}${encodeURIComponent(seed)}/${w}/${h}`;
}

/* Embed URL classifier (client-safe; duplicate of `sanitize.ts` vì file đó
   bị `server-only`). Chỉ whitelist YouTube / Figma / Behance — khớp với
   serializer của `blocksToHtml`. */
const EMBED_HOSTS: Array<{
  host: RegExp;
  provider: "youtube" | "figma" | "behance";
}> = [
  { host: /^(www\.)?(youtube\.com|youtu\.be)$/i, provider: "youtube" },
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

type ImgLayout = "full" | "boxed" | "duo" | "trio" | "grid4" | "mosaic";

/* ─── Cover image (read-only) ──────────────────────────────────── */

export function PostCover({ seed }: { seed: string | null | undefined }) {
  if (!seed) return null;
  return (
    <div className="cover-add has cover-readonly">
      <img src={ph(seed, 1400, 560)} alt="Ảnh bìa" />
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

function ReadOnlyBlock({ block }: { block: Block }) {
  const cfg = block.config || {};
  const text = typeof cfg.html === "string" ? cfg.html : "";

  if (block.loai === "h2") {
    return <div className="b-text h2 b-text-ro">{renderMultiline(text)}</div>;
  }
  if (block.loai === "h3") {
    return <div className="b-text h3 b-text-ro">{renderMultiline(text)}</div>;
  }
  if (block.loai === "body") {
    return <div className="b-text b-text-ro">{renderMultiline(text)}</div>;
  }
  if (block.loai === "quote") {
    return (
      <div className="b-quote">
        <div className="b-quote-ro">{renderMultiline(text)}</div>
      </div>
    );
  }
  if (block.loai === "divider") {
    return (
      <div className="b-divider">
        <span />
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
    const url = typeof cfg.url === "string" ? cfg.url : "";
    const cls = classifyEmbed(url);
    if (!cls) return null;
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
