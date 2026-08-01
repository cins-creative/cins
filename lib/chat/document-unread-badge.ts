/** Prefix tab title kiểu Facebook: `(4) CINs — …` */

const UNREAD_TITLE_RE = /^\(\d+\+?\)\s+/;

let cachedOriginalIconHref: string | null = null;
let faviconDrawToken = 0;

export function formatUnreadTabCount(unread: number): string | null {
  if (!Number.isFinite(unread) || unread <= 0) return null;
  const n = Math.floor(unread);
  return n > 99 ? "99+" : String(n);
}

export function stripUnreadTitlePrefix(title: string): string {
  return title.replace(UNREAD_TITLE_RE, "").trim();
}

/** Gắn / gỡ số unread trên `document.title` — giữ nguyên title trang. */
export function applyDocumentUnreadTitle(unread: number): void {
  if (typeof document === "undefined") return;
  const base = stripUnreadTitlePrefix(document.title) || "CINs";
  const label = formatUnreadTabCount(unread);
  const next = label ? `(${label}) ${base}` : base;
  if (document.title !== next) {
    document.title = next;
  }
}

function ensureIconLink(): HTMLLinkElement | null {
  if (typeof document === "undefined") return null;
  let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  if (cachedOriginalIconHref == null && link.href) {
    cachedOriginalIconHref = link.href;
  }
  return link;
}

function restoreOriginalFavicon(): void {
  const link = ensureIconLink();
  if (!link || !cachedOriginalIconHref) return;
  if (link.href !== cachedOriginalIconHref) {
    link.href = cachedOriginalIconHref;
  }
}

/** Badge đỏ trên favicon (số hoặc chấm khi quá nhỏ). */
export function applyDocumentUnreadFavicon(unread: number): void {
  if (typeof document === "undefined") return;
  const link = ensureIconLink();
  if (!link) return;

  const label = formatUnreadTabCount(unread);
  if (!label) {
    faviconDrawToken += 1;
    restoreOriginalFavicon();
    return;
  }

  const sourceHref =
    cachedOriginalIconHref || link.href || "/favicon.ico";
  const token = ++faviconDrawToken;

  const img = new Image();
  img.decoding = "async";
  img.onload = () => {
    if (token !== faviconDrawToken) return;
    try {
      const size = 32;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);

      const badgeR = label.length > 2 ? 9 : 8;
      const cx = size - badgeR - 1;
      const cy = badgeR + 1;
      ctx.beginPath();
      ctx.arc(cx, cy, badgeR, 0, Math.PI * 2);
      ctx.fillStyle = "#e11d48";
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.font =
        label.length > 2
          ? "bold 9px system-ui, sans-serif"
          : "bold 11px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, cx, cy + 0.5);

      link.href = canvas.toDataURL("image/png");
    } catch {
      /* canvas / CORS — bỏ badge, giữ title */
    }
  };
  img.onerror = () => {
    if (token !== faviconDrawToken) return;
    /* Không vẽ được — title vẫn đủ */
  };
  img.src = sourceHref;
}

/** Title + favicon; gọi lại khi Next đổi `<title>` (observer). */
export function applyDocumentUnreadBadge(unread: number): void {
  applyDocumentUnreadTitle(unread);
  applyDocumentUnreadFavicon(unread);
}
