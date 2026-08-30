/**
 * PNG guideline watermark — canvas trong suốt + safe-zone 4 góc + giữa.
 * Khung khuyến nghị 512×512 @1x, xuất 2× (1024) để vẽ/logo.
 */

export const WATERMARK_TEMPLATE_BASE_PX = 512;
export const WATERMARK_TEMPLATE_SCALE = 2;

export function watermarkTemplateSizePx(
  scale = WATERMARK_TEMPLATE_SCALE,
): { canvas: number; margin: number; sizeHint: number } {
  const canvas = WATERMARK_TEMPLATE_BASE_PX * scale;
  return {
    canvas,
    margin: Math.round(canvas * 0.03),
    sizeHint: Math.round(canvas * 0.18),
  };
}

function drawCornerBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
): void {
  ctx.fillStyle = "rgba(31, 116, 201, 0.1)";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "rgba(31, 116, 201, 0.75)";
  ctx.lineWidth = Math.max(2, w / 40);
  ctx.setLineDash([w / 12, w / 16]);
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  ctx.setLineDash([]);

  ctx.fillStyle = "rgba(31, 116, 201, 0.85)";
  ctx.font = `600 ${Math.round(w / 7)}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x + w / 2, y + h / 2);
}

function drawGuides(
  ctx: CanvasRenderingContext2D,
  canvas: number,
  margin: number,
  sizeHint: number,
): void {
  /* Nền trong suốt + viền khung ảnh. */
  ctx.strokeStyle = "rgba(15, 23, 42, 0.35)";
  ctx.lineWidth = Math.max(2, canvas / 200);
  ctx.strokeRect(1, 1, canvas - 2, canvas - 2);

  /* Crosshair giữa. */
  ctx.strokeStyle = "rgba(15, 23, 42, 0.2)";
  ctx.setLineDash([canvas / 40, canvas / 50]);
  ctx.beginPath();
  ctx.moveTo(canvas / 2, margin);
  ctx.lineTo(canvas / 2, canvas - margin);
  ctx.moveTo(margin, canvas / 2);
  ctx.lineTo(canvas - margin, canvas / 2);
  ctx.stroke();
  ctx.setLineDash([]);

  const boxes: Array<{ x: number; y: number; label: string }> = [
    { x: margin, y: margin, label: "TL" },
    { x: canvas - margin - sizeHint, y: margin, label: "TR" },
    { x: margin, y: canvas - margin - sizeHint, label: "BL" },
    {
      x: canvas - margin - sizeHint,
      y: canvas - margin - sizeHint,
      label: "BR",
    },
    {
      x: (canvas - sizeHint) / 2,
      y: (canvas - sizeHint) / 2,
      label: "CENTER",
    },
  ];
  for (const b of boxes) {
    drawCornerBox(ctx, b.x, b.y, sizeHint, sizeHint, b.label);
  }

  const fontPx = Math.round(canvas / 28);
  ctx.fillStyle = "rgba(15, 23, 42, 0.55)";
  ctx.font = `600 ${fontPx}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(
    "WATERMARK SAFE ZONE — PNG trong suốt",
    canvas / 2,
    canvas - margin / 2,
  );
}

export async function buildWatermarkTemplatePng(
  scale = WATERMARK_TEMPLATE_SCALE,
): Promise<Blob> {
  const { canvas: size, margin, sizeHint } = watermarkTemplateSizePx(scale);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Không tạo được canvas.");

  ctx.clearRect(0, 0, size, size);
  drawGuides(ctx, size, margin, sizeHint);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error("Không xuất được PNG."));
        else resolve(blob);
      },
      "image/png",
    );
  });
}

export async function downloadWatermarkTemplate(): Promise<void> {
  const { canvas } = watermarkTemplateSizePx();
  const blob = await buildWatermarkTemplatePng();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `cins-watermark-guideline-${canvas}px.png`;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
