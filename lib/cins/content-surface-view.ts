/** Ba chế độ xem nội dung cơ bản — timeline · lưới thẻ · masonry. */
export type ContentSurfaceView = "timeline" | "grid" | "masonry";

export const CONTENT_SURFACE_VIEWS = [
  "timeline",
  "grid",
  "masonry",
] as const satisfies ReadonlyArray<ContentSurfaceView>;

export function isContentSurfaceView(value: string): value is ContentSurfaceView {
  return (
    value === "timeline" || value === "grid" || value === "masonry"
  );
}
