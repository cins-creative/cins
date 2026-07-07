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
