/** Fit card video file (media + footer "Video") — dùng server sync/add + client board. */

export const CANVAS_VIDEO_MAX_W = 360;
export const CANVAS_VIDEO_MAX_H = 360;
export const CANVAS_LINK_INFO_H = 48;
export const CANVAS_MIN_NODE = 60;

export function fitCanvasVideoMediaSize(
  naturalW: number,
  naturalH: number,
): { w: number; h: number } {
  const nw = Math.max(1, naturalW);
  const nh = Math.max(1, naturalH);
  const scale = Math.min(CANVAS_VIDEO_MAX_W / nw, CANVAS_VIDEO_MAX_H / nh, 1);
  return {
    w: Math.max(CANVAS_MIN_NODE, Math.round(nw * scale)),
    h: Math.max(CANVAS_MIN_NODE, Math.round(nh * scale)),
  };
}

/** Khung node link video = media fit + footer info. */
export function fitCanvasVideoLinkSize(
  naturalW: number,
  naturalH: number,
): { w: number; h: number } {
  const media = fitCanvasVideoMediaSize(naturalW, naturalH);
  return { w: media.w, h: media.h + CANVAS_LINK_INFO_H };
}
