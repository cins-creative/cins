export type CropPanState = {
  zoom: number;
  offsetX: number;
  offsetY: number;
};

export type NaturalSize = { width: number; height: number };

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Không tải được ảnh"));
    img.src = src;
  });
}

/** Pan/zoom trong viewport cố định → vùng crop trên ảnh gốc (pixel). */
export function computeViewportCropPixels(
  natural: NaturalSize,
  state: CropPanState,
  viewportW: number,
  viewportH: number,
): { x: number; y: number; width: number; height: number } {
  const { width: nw, height: nh } = natural;
  const baseScale = Math.max(viewportW / nw, viewportH / nh);
  const scale = baseScale * state.zoom;
  const renderedW = nw * scale;
  const renderedH = nh * scale;
  const left = (viewportW - renderedW) / 2 + state.offsetX;
  const top = (viewportH - renderedH) / 2 + state.offsetY;

  let cropX = (0 - left) / scale;
  let cropY = (0 - top) / scale;
  let cropW = viewportW / scale;
  let cropH = viewportH / scale;

  if (cropX < 0) {
    cropW += cropX;
    cropX = 0;
  }
  if (cropY < 0) {
    cropH += cropY;
    cropY = 0;
  }
  if (cropX + cropW > nw) cropW = nw - cropX;
  if (cropY + cropH > nh) cropH = nh - cropY;

  return {
    x: cropX,
    y: cropY,
    width: Math.max(1, cropW),
    height: Math.max(1, cropH),
  };
}

export async function cropImageInViewport(
  imageSrc: string,
  state: CropPanState,
  natural: NaturalSize,
  viewportW: number,
  viewportH: number,
  outputW: number,
  outputH: number,
  fileName: string,
): Promise<{ file: File; previewUrl: string }> {
  const crop = computeViewportCropPixels(
    natural,
    state,
    viewportW,
    viewportH,
  );
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = outputW;
  canvas.height = outputH;
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
    outputW,
    outputH,
  );

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Xuất ảnh thất bại"))),
      "image/webp",
      0.9,
    );
  });

  const file = new File([blob], fileName, { type: blob.type });
  return { file, previewUrl: URL.createObjectURL(blob) };
}
