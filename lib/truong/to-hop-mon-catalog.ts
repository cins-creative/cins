import type { MonThiCatalogItem } from "@/lib/truong/calc-draft";
import { khoiFormulaFromCatalog, type KhoiThiCatalogItem } from "@/lib/truong/mon-thi-catalog";

export type MonLookupRow = {
  id: string;
  ma: string | null;
  ten: string;
  loai: string | null;
};

export type RawToHopMonRow = {
  id?: string;
  ma_to_hop?: string;
  ten_to_hop?: string;
  mo_ta?: string | null;
  cac_mon?: string[] | null;
  edu_to_hop_mon_chi_tiet?:
    | {
        so_thu_tu?: number;
        ten_slot?: string;
        loai?: string;
        co_dinh?: boolean;
      }[]
    | {
        so_thu_tu?: number;
        ten_slot?: string;
        loai?: string;
        co_dinh?: boolean;
      }
    | null;
};

function normalizeKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Slot linh hoạt — ten_slot "Năng khiếu" thường thiếu loai trong DB seed. */
export function inferSlotLoai(
  tenSlot: string,
  loai: string | null | undefined,
): string | null {
  const fromDb = loai?.trim().toLowerCase();
  if (fromDb) return fromDb;

  const key = normalizeKey(tenSlot);
  if (!key) return null;
  if (key === "nang khieu" || key.includes("nang khieu")) return "nang_khieu";
  if (key === "ngoai ngu") return "ngoai_ngu";
  if (key === "van hoa") return "van_hoa";
  return null;
}

export function isArtsKhoiMa(ma: string): boolean {
  return /^[HVN]\d/i.test(ma.trim());
}

function buildMonLookups(monList: MonLookupRow[]) {
  const monByMa = new Map<string, MonLookupRow>();
  const monByTen = new Map<string, MonLookupRow>();
  const monById = new Map<string, MonLookupRow>();

  for (const mon of monList) {
    monById.set(mon.id, mon);
    if (mon.ma) monByMa.set(mon.ma, mon);
    const tenKey = normalizeKey(mon.ten);
    if (tenKey && !monByTen.has(tenKey)) monByTen.set(tenKey, mon);
  }

  return { monByMa, monByTen, monById };
}

function resolveMonIdForSlot(
  maOrId: string | null | undefined,
  tenSlot: string,
  lookups: ReturnType<typeof buildMonLookups>,
): string | null {
  const ma = maOrId?.trim();
  if (ma) {
    const byMa = lookups.monByMa.get(ma);
    if (byMa) return byMa.id;
    if (lookups.monById.has(ma)) return ma;
  }

  const tenKey = normalizeKey(tenSlot);
  if (tenKey) {
    const byTen = lookups.monByTen.get(tenKey);
    if (byTen) return byTen.id;
  }

  return null;
}

/** Map raw Supabase rows → catalog items (logic khớp admin `enrichRow`). */
export function buildToHopMonCatalogItems(
  hopRows: RawToHopMonRow[],
  monList: MonLookupRow[],
): KhoiThiCatalogItem[] {
  const lookups = buildMonLookups(monList);
  const items: KhoiThiCatalogItem[] = [];

  for (const raw of hopRows) {
    const hopId = raw.id?.trim();
    const ma_to_hop = raw.ma_to_hop?.trim();
    const ten_to_hop = raw.ten_to_hop?.trim();
    if (!hopId || !ma_to_hop || !ten_to_hop) continue;

    const cac_mon = Array.isArray(raw.cac_mon)
      ? raw.cac_mon.map((m) => String(m ?? "").trim()).filter(Boolean)
      : [];

    const chiEmbed = raw.edu_to_hop_mon_chi_tiet;
    const chiRaw = Array.isArray(chiEmbed)
      ? chiEmbed
      : chiEmbed
        ? [chiEmbed]
        : [];

    const slots = chiRaw
      .map((slot) => {
        const so_thu_tu = Number(slot.so_thu_tu ?? 0);
        if (!so_thu_tu) return null;
        const ten_slot = String(slot.ten_slot ?? "").trim() || "Môn";
        const loaiRaw = String(slot.loai ?? "").trim() || null;
        const loai = inferSlotLoai(ten_slot, loaiRaw);
        const idx = Math.max(0, so_thu_tu - 1);
        const id_mon_thi = resolveMonIdForSlot(
          cac_mon[idx] ?? null,
          ten_slot,
          lookups,
        );
        return { so_thu_tu, ten_slot, loai, id_mon_thi };
      })
      .filter((x): x is NonNullable<typeof x> => x != null)
      .sort((a, b) => a.so_thu_tu - b.so_thu_tu);

    const mon_ids = slots
      .map((s) => s.id_mon_thi)
      .filter((id): id is string => Boolean(id));

    if (!slots.length && cac_mon.length) {
      for (const ma of cac_mon) {
        const id = resolveMonIdForSlot(ma, ma, lookups);
        if (id) mon_ids.push(id);
      }
    }

    const catalogSlice = mon_ids.map((mid) => {
      const m = lookups.monById.get(mid);
      return {
        id: mid,
        ten: m?.ten ?? mid,
        loai: m?.loai ?? null,
      };
    });

    const formula =
      slots.length > 0
        ? slots
            .map((s) => {
              if (s.id_mon_thi) {
                return lookups.monById.get(s.id_mon_thi)?.ten ?? s.ten_slot;
              }
              return s.ten_slot;
            })
            .join(" · ")
        : khoiFormulaFromCatalog(catalogSlice, mon_ids);

    items.push({
      id: hopId,
      ma_to_hop,
      ten_to_hop,
      mo_ta: raw.mo_ta?.trim() || null,
      mon_ids,
      slots,
      formula,
    });
  }

  return items;
}

/** Điền preset môn từ khối — gồm slot linh hoạt (vd. Năng khiếu). */
export function monThiItemsForKhoiPreset(
  khoi: KhoiThiCatalogItem,
  catalog: MonThiCatalogItem[],
): MonThiCatalogItem[] {
  const byId = new Map(catalog.map((c) => [c.id, c]));
  const used = new Set<string>();
  const out: MonThiCatalogItem[] = [];

  const slots =
    khoi.slots?.length > 0
      ? [...khoi.slots].sort((a, b) => a.so_thu_tu - b.so_thu_tu)
      : khoi.mon_ids.map((id, idx) => ({
          so_thu_tu: idx + 1,
          ten_slot: byId.get(id)?.ten ?? "Môn",
          loai: byId.get(id)?.loai ?? null,
          id_mon_thi: id,
        }));

  for (const slot of slots) {
    let item: MonThiCatalogItem | undefined;
    const slotLoai = inferSlotLoai(slot.ten_slot, slot.loai);

    if (slot.id_mon_thi) {
      item = byId.get(slot.id_mon_thi);
    }

    if (!item && slotLoai) {
      item = catalog.find(
        (c) =>
          (c.loai?.trim().toLowerCase() ?? "") === slotLoai && !used.has(c.id),
      );
    }

    if (!item) {
      const tenKey = normalizeKey(slot.ten_slot);
      item = catalog.find(
        (c) => normalizeKey(c.ten) === tenKey && !used.has(c.id),
      );
    }

    if (item) {
      out.push(item);
      used.add(item.id);
      continue;
    }

    // Slot linh hoạt (Năng khiếu) — vẫn thêm dòng nếu có bất kỳ môn loại đó
    if (slotLoai === "nang_khieu") {
      const nk = catalog.find(
        (c) =>
          (c.loai?.trim().toLowerCase() ?? "") === "nang_khieu" &&
          !used.has(c.id),
      );
      if (nk) {
        out.push(nk);
        used.add(nk.id);
      }
    }
  }

  if (!out.length && khoi.mon_ids.length) {
    for (const id of khoi.mon_ids) {
      const item = byId.get(id);
      if (item && !used.has(item.id)) {
        out.push(item);
        used.add(item.id);
      }
    }
  }

  return out;
}
