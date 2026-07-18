import { toBlob } from "html-to-image";

export type ShareCardImageResult = "copied" | "downloaded" | "failed";

type ExportOpts = {
  cacheBust: boolean;
  pixelRatio: number;
  useCORS: true;
  backgroundColor: string;
  filter?: (node: HTMLElement) => boolean;
};

const EXPORT_OPTS: ExportOpts = {
  cacheBust: true,
  pixelRatio: 2,
  /** Avatar/cover Cloudflare — cần CORS để rasterize. */
  useCORS: true,
  backgroundColor: "#ffffff",
};

async function awaitCardImages(el: HTMLElement): Promise<void> {
  const imgs = el.querySelectorAll("img");
  await Promise.all(
    Array.from(imgs).map(
      (img) =>
        img.complete
          ? Promise.resolve()
          : new Promise<void>((resolve) => {
              img.addEventListener("load", () => resolve(), { once: true });
              img.addEventListener("error", () => resolve(), { once: true });
            }),
    ),
  );
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/** Rasterize thẻ share → PNG blob (dùng cho clipboard + upload OG). */
export async function exportShareCardBlob(
  el: HTMLElement,
  overrides?: Partial<ExportOpts>,
): Promise<Blob | null> {
  try {
    await awaitCardImages(el);
    const blob = await toBlob(el, { ...EXPORT_OPTS, ...overrides });
    return blob ?? null;
  } catch {
    return null;
  }
}

/** Xuất thẻ share → copy PNG clipboard; fallback tải file. */
export async function copyShareCardImage(
  el: HTMLElement,
  filename = "cins-share-card.png",
  overrides?: Partial<ExportOpts>,
): Promise<ShareCardImageResult> {
  const blob = await exportShareCardBlob(el, overrides);
  if (!blob) return "failed";

  if (
    typeof navigator !== "undefined" &&
    navigator.clipboard &&
    typeof ClipboardItem !== "undefined"
  ) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      return "copied";
    } catch {
      /* HTTPS / quyền clipboard — fallback download. */
    }
  }

  try {
    downloadBlob(blob, filename);
    return "downloaded";
  } catch {
    return "failed";
  }
}
