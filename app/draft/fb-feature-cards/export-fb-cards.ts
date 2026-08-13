import { toBlob } from "html-to-image";

const EXPORT_SIZE = 1080;

const EXPORT_OPTS = {
  cacheBust: true,
  pixelRatio: 1,
  width: EXPORT_SIZE,
  height: EXPORT_SIZE,
  useCORS: true as const,
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

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function exportFbCardBlob(
  el: HTMLElement,
): Promise<Blob | null> {
  try {
    await awaitCardImages(el);
    const blob = await toBlob(el, EXPORT_OPTS);
    return blob ?? null;
  } catch {
    return null;
  }
}

export async function downloadAllFbCards(
  cards: { id: string; el: HTMLElement }[],
  onProgress?: (done: number, total: number) => void,
): Promise<{ ok: number; failed: string[] }> {
  const failed: string[] = [];
  let ok = 0;

  for (let i = 0; i < cards.length; i++) {
    const { id, el } = cards[i]!;
    const blob = await exportFbCardBlob(el);
    if (!blob) {
      failed.push(id);
    } else {
      downloadBlob(blob, `cins-fb-${id}.png`);
      ok += 1;
      if (i < cards.length - 1) await wait(350);
    }
    onProgress?.(i + 1, cards.length);
  }

  return { ok, failed };
}
