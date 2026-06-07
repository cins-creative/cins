import "server-only";

import { randomUUID } from "crypto";

import { isCongDongAdmin } from "@/lib/cong-dong/membership";
import type {
  CongDongEventRailConfig,
  CongDongEventRailDisplay,
  CongDongEventRailHistoryItem,
  CongDongEventRailScheduled,
} from "@/lib/cong-dong/types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const RAIL_KEY = "su_kien_rail";
const HISTORY_MAX = 24;

const DEFAULT_MAC_DINH = {
  coverId: null as string | null,
  tieuDe: "",
  moTa: null as string | null,
};

function asRecord(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as Record<string, unknown>;
}

function parseBanner(raw: unknown): {
  coverId: string | null;
  tieuDe: string;
  moTa: string | null;
} {
  const o = asRecord(raw);
  const coverId =
    typeof o.cover_id === "string" && o.cover_id.trim()
      ? o.cover_id.trim()
      : typeof o.coverId === "string" && o.coverId.trim()
        ? o.coverId.trim()
        : null;
  const tieuDeRaw =
    "tieu_de" in o
      ? o.tieu_de
      : "tieuDe" in o
        ? o.tieuDe
        : undefined;
  const tieuDe =
    typeof tieuDeRaw === "string"
      ? tieuDeRaw.trim()
      : DEFAULT_MAC_DINH.tieuDe;
  const moTaRaw =
    typeof o.mo_ta === "string"
      ? o.mo_ta
      : typeof o.moTa === "string"
        ? o.moTa
        : null;
  const moTa = moTaRaw?.trim() ? moTaRaw.trim() : null;
  return { coverId, tieuDe, moTa };
}

function parseScheduled(raw: unknown): CongDongEventRailScheduled | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === "string" && o.id.trim() ? o.id.trim() : null;
  const batDau =
    typeof o.bat_dau === "string"
      ? o.bat_dau
      : typeof o.batDau === "string"
        ? o.batDau
        : null;
  const ketThuc =
    typeof o.ket_thuc === "string"
      ? o.ket_thuc
      : typeof o.ketThuc === "string"
        ? o.ketThuc
        : null;
  if (!id || !batDau || !ketThuc) return null;
  const banner = parseBanner(raw);
  if (!banner.coverId) return null;
  return {
    id,
    ...banner,
    coverId: banner.coverId,
    batDau,
    ketThuc,
  };
}

function parseHistory(raw: unknown): CongDongEventRailHistoryItem[] {
  if (!Array.isArray(raw)) return [];
  const out: CongDongEventRailHistoryItem[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const scheduled = parseScheduled(item);
    const luuLuc =
      typeof o.luu_luc === "string"
        ? o.luu_luc
        : typeof o.luuLuc === "string"
          ? o.luuLuc
          : null;
    if (!scheduled || !luuLuc) continue;
    out.push({ ...scheduled, luuLuc });
  }
  return out;
}

export function parseEventRailFromCauHinh(
  cauHinh: unknown,
): CongDongEventRailConfig {
  const root = asRecord(cauHinh);
  const rail = asRecord(root[RAIL_KEY]);
  const macDinhRaw = rail.mac_dinh ?? rail.macDinh;
  const macDinh = macDinhRaw ? parseBanner(macDinhRaw) : { ...DEFAULT_MAC_DINH };
  return {
    macDinh,
    dangChay: parseScheduled(rail.dang_chay ?? rail.dangChay),
    lichSu: parseHistory(rail.lich_su ?? rail.lichSu),
  };
}

function serializeBanner(banner: {
  coverId: string | null;
  tieuDe: string;
  moTa: string | null;
}) {
  return {
    cover_id: banner.coverId,
    tieu_de: banner.tieuDe,
    mo_ta: banner.moTa,
  };
}

function serializeScheduled(item: CongDongEventRailScheduled) {
  return {
    id: item.id,
    cover_id: item.coverId,
    tieu_de: item.tieuDe,
    mo_ta: item.moTa,
    bat_dau: item.batDau,
    ket_thuc: item.ketThuc,
  };
}

function serializeRail(config: CongDongEventRailConfig) {
  return {
    mac_dinh: serializeBanner(config.macDinh),
    dang_chay: config.dangChay ? serializeScheduled(config.dangChay) : null,
    lich_su: config.lichSu.map((item) => ({
      ...serializeScheduled(item),
      luu_luc: item.luuLuc,
    })),
  };
}

/** Chuyển chiến dịch hết hạn vào lịch sử. */
export function archiveExpiredEventRail(
  config: CongDongEventRailConfig,
  now = Date.now(),
): CongDongEventRailConfig {
  const scheduled = config.dangChay;
  if (!scheduled?.ketThuc) return config;
  if (new Date(scheduled.ketThuc).getTime() > now) return config;
  return {
    macDinh: config.macDinh,
    dangChay: null,
    lichSu: [
      {
        ...scheduled,
        luuLuc: new Date(now).toISOString(),
      },
      ...config.lichSu,
    ].slice(0, HISTORY_MAX),
  };
}

export function resolveEventRailDisplay(
  config: CongDongEventRailConfig,
  now = Date.now(),
): CongDongEventRailDisplay {
  const scheduled = config.dangChay;
  if (scheduled) {
    const start = new Date(scheduled.batDau).getTime();
    const end = new Date(scheduled.ketThuc).getTime();
    if (now >= start && now <= end) {
      return {
        source: "scheduled",
        coverId: scheduled.coverId,
        tieuDe: scheduled.tieuDe,
        moTa: scheduled.moTa,
        batDau: scheduled.batDau,
        ketThuc: scheduled.ketThuc,
      };
    }
  }
  return {
    source: "default",
    coverId: config.macDinh.coverId,
    tieuDe: config.macDinh.tieuDe,
    moTa: config.macDinh.moTa,
    batDau: null,
    ketThuc: null,
  };
}

export async function loadCongDongEventRail(orgId: string): Promise<{
  config: CongDongEventRailConfig;
  display: CongDongEventRailDisplay;
}> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("org_to_chuc")
    .select("cau_hinh")
    .eq("id", orgId)
    .eq("loai_to_chuc", "cong_dong")
    .maybeSingle<{ cau_hinh: unknown }>();

  let config = parseEventRailFromCauHinh(data?.cau_hinh);
  const archived = archiveExpiredEventRail(config);
  if (archived !== config) {
    config = archived;
    await persistEventRail(orgId, config, data?.cau_hinh);
  }
  return { config, display: resolveEventRailDisplay(config) };
}

async function persistEventRail(
  orgId: string,
  config: CongDongEventRailConfig,
  existingCauHinh: unknown,
) {
  const admin = createServiceRoleClient();
  const merged = {
    ...asRecord(existingCauHinh),
    [RAIL_KEY]: serializeRail(config),
  };
  await admin
    .from("org_to_chuc")
    .update({ cau_hinh: merged })
    .eq("id", orgId)
    .eq("loai_to_chuc", "cong_dong");
}

function parseIso(value: string, label: string): string | { error: string } {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return { error: `${label} không hợp lệ.` };
  }
  return d.toISOString();
}

export async function updateCongDongEventRail(params: {
  orgId: string;
  adminId: string;
  kind: "default" | "scheduled" | "cancel_scheduled";
  tieuDe?: string;
  moTa?: string | null;
  coverId?: string | null;
  batDau?: string;
  ketThuc?: string;
}): Promise<
  | { ok: true; config: CongDongEventRailConfig; display: CongDongEventRailDisplay }
  | { ok: false; error: string }
> {
  if (!(await isCongDongAdmin(params.adminId, params.orgId))) {
    return { ok: false, error: "Chỉ admin mới chỉnh banner sự kiện." };
  }

  const admin = createServiceRoleClient();
  const { data: row } = await admin
    .from("org_to_chuc")
    .select("cau_hinh")
    .eq("id", params.orgId)
    .eq("loai_to_chuc", "cong_dong")
    .maybeSingle<{ cau_hinh: unknown }>();

  if (!row) return { ok: false, error: "Không tìm thấy cộng đồng." };

  let config = archiveExpiredEventRail(parseEventRailFromCauHinh(row.cau_hinh));

  if (params.kind === "default") {
    config = {
      ...config,
      macDinh: {
        coverId: params.coverId?.trim() || config.macDinh.coverId,
        tieuDe: params.tieuDe?.trim() ?? "",
        moTa: params.moTa?.trim() ? params.moTa.trim() : null,
      },
    };
  } else if (params.kind === "scheduled") {
    const tieuDe = params.tieuDe?.trim();
    const coverId = params.coverId?.trim();
    if (!tieuDe) return { ok: false, error: "Cần tiêu đề chiến dịch." };
    if (!coverId) {
      return {
        ok: false,
        error: "Ảnh chiến dịch bắt buộc — mỗi banner mới phải có ảnh riêng.",
      };
    }
    if (!params.batDau?.trim() || !params.ketThuc?.trim()) {
      return {
        ok: false,
        error: "Chiến dịch mới cần thời gian bắt đầu và kết thúc.",
      };
    }
    const batDau = parseIso(params.batDau, "Thời gian bắt đầu");
    if (typeof batDau !== "string") return { ok: false, error: batDau.error };
    const ketThuc = parseIso(params.ketThuc, "Thời gian kết thúc");
    if (typeof ketThuc !== "string") return { ok: false, error: ketThuc.error };
    if (new Date(ketThuc).getTime() <= new Date(batDau).getTime()) {
      return { ok: false, error: "Thời gian kết thúc phải sau thời gian bắt đầu." };
    }

    config = {
      ...config,
      dangChay: {
        id: randomUUID(),
        coverId,
        tieuDe,
        moTa: params.moTa?.trim() ? params.moTa.trim() : null,
        batDau,
        ketThuc,
      },
    };
  } else if (params.kind === "cancel_scheduled") {
    if (config.dangChay) {
      config = {
        ...config,
        dangChay: null,
      };
    }
  }

  await persistEventRail(params.orgId, config, row.cau_hinh);
  return {
    ok: true,
    config,
    display: resolveEventRailDisplay(config),
  };
}
