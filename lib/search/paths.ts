export const TIM_KIEM_PATH = "/tim-kiem";

export function buildTimKiemUrl(options?: {
  q?: string;
  kind?: string;
}): string {
  const params = new URLSearchParams();
  const q = options?.q?.trim();
  const kind = options?.kind?.trim();
  if (q) params.set("q", q);
  if (kind && kind !== "all") params.set("kind", kind);
  const qs = params.toString();
  return qs ? `${TIM_KIEM_PATH}?${qs}` : TIM_KIEM_PATH;
}
