import type { Json } from "@/types/db";
import { cfImageUrl } from "@/lib/cloudflare";

export type Block =
  | { loai: "body"; noi_dung: string }
  | { loai: "h3"; noi_dung: string }
  | { loai: "imgs"; cloudflare_ids: string[] }
  | { loai: "spacer"; cao?: number }
  | { loai: "embed"; url: string };

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

function isValidEmbedUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const trusted = [
      "youtube.com",
      "www.youtube.com",
      "youtu.be",
      "vimeo.com",
      "player.vimeo.com",
    ];
    return trusted.some(
      (h) => u.hostname === h || u.hostname.endsWith("." + h),
    );
  } catch {
    return false;
  }
}

function toEmbedSrc(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;
    }
    if (u.hostname === "youtu.be") {
      const v = u.pathname.slice(1);
      if (v) return `https://www.youtube.com/embed/${v}`;
    }
    if (u.hostname.includes("vimeo.com")) {
      const v = u.pathname.split("/").filter(Boolean)[0];
      if (v) return `https://player.vimeo.com/video/${v}`;
    }
  } catch {
    // ignore
  }
  return null;
}

function parseBlocks(raw: Json): Block[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((b): b is Block => {
    if (typeof b !== "object" || !b || Array.isArray(b)) return false;
    const block = b as Record<string, unknown>;
    const whitelisted = ["body", "h3", "imgs", "spacer", "embed"];
    return typeof block.loai === "string" && whitelisted.includes(block.loai);
  });
}

export function renderBlocks(blocks: Json): React.ReactNode {
  const parsed = parseBlocks(blocks);
  if (!parsed.length) return null;

  return (
    <div className="blocks-renderer">
      {parsed.map((block, i) => {
        switch (block.loai) {
          case "body": {
            const safe = stripTags(block.noi_dung ?? "");
            if (!safe) return null;
            return (
              <p key={i} style={{ margin: "0 0 16px", lineHeight: 1.7 }}>
                {safe}
              </p>
            );
          }
          case "h3": {
            const safe = stripTags(block.noi_dung ?? "");
            if (!safe) return null;
            return (
              <h3
                key={i}
                style={{ margin: "24px 0 8px", fontSize: "1.1rem", fontWeight: 600 }}
              >
                {safe}
              </h3>
            );
          }
          case "imgs": {
            if (!Array.isArray(block.cloudflare_ids) || !block.cloudflare_ids.length)
              return null;
            return (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                  gap: 12,
                  margin: "16px 0",
                }}
              >
                {block.cloudflare_ids.map((cfId, j) => {
                  const src = cfImageUrl(cfId);
                  if (!src) return null;
                  return (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={j}
                      src={src}
                      alt=""
                      loading="lazy"
                      style={{
                        width: "100%",
                        borderRadius: "var(--radius-sm)",
                        display: "block",
                      }}
                    />
                  );
                })}
              </div>
            );
          }
          case "spacer":
            return (
              <div
                key={i}
                style={{ height: block.cao ?? 24 }}
                aria-hidden="true"
              />
            );
          case "embed": {
            if (!isValidEmbedUrl(block.url)) return null;
            const src = toEmbedSrc(block.url);
            if (!src) return null;
            return (
              <div
                key={i}
                style={{ position: "relative", paddingBottom: "56.25%", margin: "16px 0" }}
              >
                <iframe
                  src={src}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  sandbox="allow-scripts allow-same-origin allow-presentation"
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    border: 0,
                    borderRadius: "var(--radius-sm)",
                  }}
                />
              </div>
            );
          }
          default:
            return null;
        }
      })}
    </div>
  );
}
