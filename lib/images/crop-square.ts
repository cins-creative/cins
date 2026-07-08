export type SquareCropState = {
  zoom: number;
  offsetX: number;
  offsetY: number;
};

export type NaturalSize = { width: number; height: number };

const VIEWPORT = 320;
const OUTPUT = 512;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!src.startsWith("blob:")) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Không tải được ảnh"));
    img.src = src;
  });
}

/** Map viewport pan/zoom to a square crop in natural image pixels. */
export function computeSquareCropPixels(
  natural: NaturalSize,
  state: SquareCropState,
  viewportSize = VIEWPORT,
): { x: number; y: number; width: number; height: number } {
  const { width: nw, height: nh } = natural;
  const baseScale = Math.max(viewportSize / nw, viewportSize / nh);
  const scale = baseScale * state.zoom;
  const renderedW = nw * scale;
  const renderedH = nh * scale;
  const left = (viewportSize - renderedW) / 2 + state.offsetX;
  const top = (viewportSize - renderedH) / 2 + state.offsetY;

  let cropX = (0 - left) / scale;
  let cropY = (0 - top) / scale;
  let cropSize = viewportSize / scale;

  if (cropX < 0) {
    cropSize += cropX;
    cropX = 0;
  }
  if (cropY < 0) {
    cropSize += cropY;
    cropY = 0;
  }
  if (cropX + cropSize > nw) cropSize = nw - cropX;
  if (cropY + cropSize > nh) cropSize = nh - cropY;

  const side = Math.max(1, Math.min(cropSize, nw - cropX, nh - cropY));
  return { x: cropX, y: cropY, width: side, height: side };
}

export async function cropImageToSquareFile(
  imageSrc: string,
  state: SquareCropState,
  natural: NaturalSize,
  fileName = "avatar.webp",
): Promise<{ file: File; previewUrl: string }> {
  const crop = computeSquareCropPixels(natural, state);
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT;
  canvas.height = OUTPUT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas không khả dụng");
  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    OUTPUT,
    OUTPUT,
  );

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Xuất ảnh thất bại"))),
      "image/webp",
      0.92,
    );
  });

  const file = new File([blob], fileName, { type: blob.type });
  const previewUrl = URL.createObjectURL(blob);
  return { file, previewUrl };
}

export const AVATAR_CROP_VIEWPORT = VIEWPORT;
