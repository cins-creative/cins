import {
  GRID_IMAGE_DEFAULT_HEIGHT,
  GRID_IMAGE_DEFAULT_WIDTH,
} from "@/lib/journey/image-grid";

/** Đọc kích thước file ảnh trước upload (editor / compose). */
export function readImageFileDimensions(
  file: File,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const width =
        img.naturalWidth > 0 ? img.naturalWidth : GRID_IMAGE_DEFAULT_WIDTH;
      const height =
        img.naturalHeight > 0 ? img.naturalHeight : GRID_IMAGE_DEFAULT_HEIGHT;
      URL.revokeObjectURL(url);
      resolve({ width, height });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({
        width: GRID_IMAGE_DEFAULT_WIDTH,
        height: GRID_IMAGE_DEFAULT_HEIGHT,
      });
    };
    img.src = url;
  });
}

/** Đọc naturalWidth/naturalHeight — dùng masonry gallery khi preset CF không đúng tỉ lệ. */
export function probeImageDimensions(
  src: string,
): Promise<{ width: number; height: number } | null> {
  const trimmed = src.trim();
  if (!trimmed) return Promise.resolve(null);

  return new Promise((resolve) => {
    const img = new Image();
    const done = (result: { width: number; height: number } | null) => {
      img.onload = null;
      img.onerror = null;
      resolve(result);
    };
    img.onload = () => {
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        done({ width: img.naturalWidth, height: img.naturalHeight });
      } else {
        done(null);
      }
    };
    img.onerror = () => done(null);
    img.src = trimmed;
  });
}
