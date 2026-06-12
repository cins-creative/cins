export const KTX_DIA_CHI_MAX = 240;

export function parseKtxDiaChiFromCauHinh(raw: unknown): string | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const value = (raw as { ktx_dia_chi?: unknown }).ktx_dia_chi;
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, KTX_DIA_CHI_MAX);
  return trimmed || null;
}

export function mergeKtxDiaChiIntoCauHinh(
  existing: unknown,
  ktxDiaChi: string | null,
): Record<string, unknown> {
  const base =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {};
  const trimmed = ktxDiaChi?.trim().slice(0, KTX_DIA_CHI_MAX) || null;
  if (trimmed) {
    base.ktx_dia_chi = trimmed;
  } else {
    delete base.ktx_dia_chi;
  }
  return base;
}
