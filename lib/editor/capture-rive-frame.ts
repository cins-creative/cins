/**
 * Chụp frame đầu từ file .riv (canvas Rive) → File JPEG cho thumbnail.
 * Chỉ chạy trên browser.
 */

import { Rive, Layout, Fit, Alignment } from "@rive-app/canvas";

import { ensureRiveRuntime } from "@/lib/cins/rive-runtime";
import { startInteractiveRivePlayback } from "@/lib/cins/rive-embed";

const CAPTURE_SIZE = 640;
const READY_TIMEOUT_MS = 12_000;

function waitForPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

function canvasToJpegFile(
  canvas: HTMLCanvasElement,
  filename: string,
): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Không xuất được ảnh từ canvas Rive."));
          return;
        }
        resolve(new File([blob], filename, { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.88,
    );
  });
}

/** Load .riv ẩn, chờ frame đầu, chụp JPEG. */
export async function captureRiveFrameAsFile(
  src: string,
): Promise<File> {
  const url = src.trim();
  if (!url) throw new Error("Thiếu URL file Rive.");
  if (typeof window === "undefined") {
    throw new Error("Capture Rive chỉ chạy trên trình duyệt.");
  }

  await ensureRiveRuntime();

  const host = document.createElement("div");
  host.style.cssText =
    "position:fixed;left:-9999px;top:0;width:640px;height:640px;opacity:0;pointer-events:none;";
  const canvas = document.createElement("canvas");
  canvas.width = CAPTURE_SIZE;
  canvas.height = CAPTURE_SIZE;
  host.appendChild(canvas);
  document.body.appendChild(host);

  let rive: Rive | null = null;
  try {
    rive = await new Promise<Rive>((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        reject(new Error("Rive tải quá lâu — thử upload thumbnail riêng."));
      }, READY_TIMEOUT_MS);

      const instance = new Rive({
        src: url,
        canvas,
        autoplay: true,
        layout: new Layout({
          fit: Fit.Contain,
          alignment: Alignment.Center,
        }),
        onLoad: () => {
          window.clearTimeout(timeout);
          try {
            startInteractiveRivePlayback(instance);
            instance.resizeDrawingSurfaceToCanvas();
          } catch {
            /* vẫn thử chụp */
          }
          resolve(instance);
        },
        onLoadError: () => {
          window.clearTimeout(timeout);
          reject(new Error("Không tải được file Rive để chụp thumbnail."));
        },
      });
    });

    await waitForPaint();
    await new Promise((r) => window.setTimeout(r, 120));

    return await canvasToJpegFile(canvas, "rive-thumb.jpg");
  } finally {
    try {
      rive?.cleanup();
    } catch {
      /* ignore */
    }
    host.remove();
  }
}
