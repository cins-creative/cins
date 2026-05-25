const COVER_CLASSES = [
  "cov-violet",
  "cov-blue",
  "cov-mint",
  "cov-orange",
  "cov-navy",
  "cov-dark",
  "cov-pink",
  "cov-yellow",
] as const;

export function truongCoverClass(index: number): string {
  return COVER_CLASSES[index % COVER_CLASSES.length]!;
}

export function splitSchoolDisplayName(ten: string): {
  lead: string;
  accent: string | null;
} {
  const trimmed = ten.trim();
  const cityMatch = trimmed.match(
    /^(.*?)\s+((?:TP\.?\s*)?(?:Hồ Chí Minh|HCM|Hà Nội|Đà Nẵng|Vietnam|TP\.HCM).*)$/i,
  );
  if (cityMatch?.[1] && cityMatch[2]) {
    return { lead: cityMatch[1].trim(), accent: cityMatch[2].trim() };
  }
  const words = trimmed.split(/\s+/);
  if (words.length >= 4) {
    return {
      lead: words.slice(0, -2).join(" "),
      accent: words.slice(-2).join(" "),
    };
  }
  if (words.length === 3) {
    return { lead: words.slice(0, 2).join(" "), accent: words[2]! };
  }
  return { lead: trimmed, accent: null };
}

/** Hiển thị học phí dạng triệu (sidebar / CTA tuyển sinh). */
export function formatHocPhiTriệu(
  tu: number | null,
  den: number | null,
): string | null {
  const toTriệu = (n: number) => {
    const v = n >= 1_000_000 ? n / 1_000_000 : n;
    return Number.isInteger(v) ? String(v) : v.toFixed(1).replace(/\.0$/, "");
  };
  if (tu == null && den == null) return null;
  if (tu != null && den != null && tu !== den) {
    return `~${toTriệu(tu)} – ${toTriệu(den)} triệu`;
  }
  const v = tu ?? den;
  return v != null ? `~${toTriệu(v)} triệu` : null;
}

export function formatHocPhiLabel(
  tu: number | null,
  den: number | null,
): string | null {
  if (tu == null && den == null) return null;
  const fmt = (n: number) =>
    new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(n);
  if (tu != null && den != null && tu !== den) {
    return `${fmt(tu)}–${fmt(den)} đ`;
  }
  const v = tu ?? den;
  return v != null ? `${fmt(v)} đ` : null;
}

export function truongFilterType(loai: string | null): "dh" | "csdt" {
  const c = (loai ?? "").toLowerCase();
  if (
    c.includes("csdt") ||
    c.includes("co_so") ||
    c.includes("cơ sở") ||
    c.includes("bootcamp")
  ) {
    return "csdt";
  }
  return "dh";
}
