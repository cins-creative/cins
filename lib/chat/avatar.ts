/** Màu avatar ổn định theo uuid/slug — dùng cho chat khi chưa có ảnh. */
export function avatarHueFromSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash % 360;
}

export function avatarInitialFromName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  return trimmed.slice(0, 1).toUpperCase();
}

export function avatarBg(hue: number): string {
  return `hsl(${hue} 62% 42%)`;
}

export function formatChatTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;

    const diffMs = Date.now() - d.getTime();
    if (diffMs >= 0 && diffMs < 6 * 60 * 60 * 1000) {
      const mins = Math.floor(diffMs / 60_000);
      if (mins < 1) return "vừa xong";
      if (mins < 60) return `${mins} phút trước`;
      const hours = Math.floor(mins / 60);
      return `${hours}h trước`;
    }

    const now = new Date();
    const sameDay =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();
    return new Intl.DateTimeFormat("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      ...(sameDay ? {} : { day: "2-digit", month: "2-digit" }),
    }).format(d);
  } catch {
    return iso;
  }
}
