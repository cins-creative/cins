/** Cell tối thiểu để pack masonry — cân bằng theo aspect (cột thấp nhất nhận item kế). */
export type MasonryPackCell<T> = {
  id: string;
  aspect: number;
  data: T;
};

/** Chia items vào N cột sao cho tổng chiều cao tương đối gần bằng nhau. */
export function packMasonryByAspect<T>(
  cells: readonly MasonryPackCell<T>[],
  columnCount: number,
): MasonryPackCell<T>[][] {
  const cols = Math.max(1, columnCount);
  const buckets: MasonryPackCell<T>[][] = Array.from({ length: cols }, () => []);
  const heights = new Array<number>(cols).fill(0);

  for (const cell of cells) {
    let target = 0;
    for (let c = 1; c < cols; c++) {
      if (heights[c]! < heights[target]!) target = c;
    }
    buckets[target]!.push(cell);
    heights[target]! += 1 / (cell.aspect > 0 ? cell.aspect : 1);
  }

  return buckets.filter((col) => col.length > 0);
}

export type MasonryColumnProfile = "gallery" | "world-journey";

/** Số cột masonry theo bề ngang container — khớp breakpoint CSS từng profile. */
export function resolveMasonryColumnCount(
  width: number,
  profile: MasonryColumnProfile = "gallery",
): number {
  if (profile === "world-journey") {
    if (width <= 480) return 2;
    if (width <= 640) return 3;
    if (width <= 900) return 4;
    return 5;
  }
  if (width <= 640) return 2;
  if (width <= 1000) return 3;
  return 4;
}
