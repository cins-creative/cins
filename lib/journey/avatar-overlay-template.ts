/**
 * PNG mockup overlay avatar — đồng bộ kích thước runtime
 * (avatar 96px + expand 15px mỗi phía → canvas 126×126 @1x).
 */

import { AVATAR_DISPLAY_PX } from "@/lib/cloudflare/cf-image-variants";
import { AVATAR_OVERLAY_EXPAND_PX } from "@/lib/journey/avatar-frame";

/** Hệ số xuất file — đủ nét khi vẽ/in. */
export const AVATAR_OVERLAY_TEMPLATE_SCALE = 4;

export function avatarOverlayTemplateSizePx(scale = AVATAR_OVERLAY_TEMPLATE_SCALE): {
  canvas: number;
  avatar: number;
  expand: number;
} {
  const avatar = AVATAR_DISPLAY_PX * scale;
  const expand = AVATAR_OVERLAY_EXPAND_PX * scale;
  return {
    canvas: avatar + expand * 2,
    avatar,
    expand,
  };
}

function drawGuides(
  ctx: CanvasRenderingContext2D,
  canvas: number,
  avatar: number,
): void {
  const cx = canvas / 2;
  const cy = canvas / 2;
  const innerR = avatar / 2;
  const pad = 1;
  const box = canvas - pad * 2;

  /* Vùng overlay = khung vuông đầy canvas trừ lỗ mặt tròn. */
  ctx.beginPath();
  ctx.rect(pad, pad, box, box);
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2, true);
  ctx.closePath();
  ctx.fillStyle = "rgba(31, 116, 201, 0.12)";
  ctx.fill("evenodd");

  /* Vùng mặt — gợi ý giữ trong suốt / không đè mặt. */
  ctx.beginPath();
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(15, 23, 42, 0.06)";
  ctx.fill();

  /* Viền ngoài = mép overlay vuông. */
  ctx.beginPath();
  ctx.rect(pad, pad, box, box);
  ctx.strokeStyle = "rgba(31, 116, 201, 0.85)";
  ctx.lineWidth = Math.max(2, canvas / 180);
  ctx.setLineDash([]);
  ctx.stroke();

  /* Viền trong = mép avatar tròn. */
  ctx.beginPath();
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(15, 23, 42, 0.45)";
  ctx.lineWidth = Math.max(2, canvas / 200);
  ctx.setLineDash([canvas / 40, canvas / 50]);
  ctx.stroke();
  ctx.setLineDash([]);

  /* Nhãn. */
  const fontPx = Math.round(canvas / 22);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `600 ${fontPx}px system-ui, sans-serif`;
  ctx.fillStyle = "rgba(15, 23, 42, 0.55)";
  ctx.fillText("AVATAR", cx, cy);

  ctx.font = `600 ${Math.round(fontPx * 0.85)}px system-ui, sans-serif`;
  ctx.fillStyle = "rgba(31, 116, 201, 0.9)";
  ctx.fillText("OVERLAY", cx, pad + (canvas - avatar) / 4);
}

/** Vẽ PNG trong suốt + guide; trả blob. */
export async function buildAvatarOverlayTemplatePng(
  scale = AVATAR_OVERLAY_TEMPLATE_SCALE,
): Promise<Blob> {
  const { canvas: size, avatar } = avatarOverlayTemplateSizePx(scale);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Không tạo được canvas.");

  ctx.clearRect(0, 0, size, size);
  drawGuides(ctx, size, avatar);

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

export async function downloadAvatarOverlayTemplate(): Promise<void> {
  const { canvas } = avatarOverlayTemplateSizePx();
  const blob = await buildAvatarOverlayTemplatePng();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `cins-avatar-overlay-${canvas}px.png`;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
