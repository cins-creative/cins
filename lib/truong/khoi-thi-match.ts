import type { MonThiCatalogItem } from "@/lib/truong/calc-draft";
import type { KhoiThiCatalogItem } from "@/lib/truong/mon-thi-catalog";
import {
  inferSlotLoai,
  monThiItemsForKhoiPreset,
} from "@/lib/truong/to-hop-mon-catalog";

function monIdSet(
  configuredMonIds: Iterable<string>,
  catalog: MonThiCatalogItem[],
): { ids: Set<string>; byId: Map<string, MonThiCatalogItem> } {
  const ids = new Set<string>();
  for (const id of configuredMonIds) {
    const trimmed = id?.trim();
    if (trimmed) ids.add(trimmed);
  }
  return { ids, byId: new Map(catalog.map((c) => [c.id, c])) };
}

function slotSatisfiedByMonSet(
  slot: KhoiThiCatalogItem["slots"][number],
  ids: Set<string>,
  byId: Map<string, MonThiCatalogItem>,
): boolean {
  if (slot.id_mon_thi) {
    return ids.has(slot.id_mon_thi);
  }

  const slotLoai = inferSlotLoai(slot.ten_slot, slot.loai);
  if (slotLoai) {
    return [...ids].some(
      (id) => (byId.get(id)?.loai?.trim().toLowerCase() ?? "") === slotLoai,
    );
  }

  return true;
}

/** Khối thi được coi là phù hợp khi mọi slot đều có môn tương ứng trong tập môn đã cấu hình. */
export function khoiThiMatchesMonSet(
  khoi: KhoiThiCatalogItem,
  configuredMonIds: Iterable<string>,
  catalog: MonThiCatalogItem[],
): boolean {
  const { ids, byId } = monIdSet(configuredMonIds, catalog);
  if (!ids.size) return false;

  const slots =
    khoi.slots?.length > 0
      ? [...khoi.slots].sort((a, b) => a.so_thu_tu - b.so_thu_tu)
      : khoi.mon_ids.map((id, idx) => ({
          so_thu_tu: idx + 1,
          ten_slot: byId.get(id)?.ten ?? "Môn",
          loai: byId.get(id)?.loai ?? null,
          id_mon_thi: id,
        }));

  if (!slots.length) return false;

  return slots.every((slot) => slotSatisfiedByMonSet(slot, ids, byId));
}

export function findKhoiThiMatchingMonSet(
  khoiCatalog: KhoiThiCatalogItem[],
  configuredMonIds: Iterable<string>,
  catalog: MonThiCatalogItem[],
): KhoiThiCatalogItem[] {
  return khoiCatalog.filter((k) =>
    khoiThiMatchesMonSet(k, configuredMonIds, catalog),
  );
}

/** Hợp môn preset từ nhiều khối — mỗi môn chỉ xuất hiện một lần. */
export function unionMonItemsForKhoiList(
  khoiList: KhoiThiCatalogItem[],
  catalog: MonThiCatalogItem[],
): MonThiCatalogItem[] {
  const out: MonThiCatalogItem[] = [];
  const used = new Set<string>();

  for (const khoi of khoiList) {
    for (const item of monThiItemsForKhoiPreset(khoi, catalog)) {
      if (used.has(item.id)) continue;
      used.add(item.id);
      out.push(item);
    }
  }

  return out;
}

/** Môn được phép chọn khi đang áp dụng một hoặc nhiều khối. */
export function catalogAllowedForKhoiList(
  khoiList: KhoiThiCatalogItem[],
  catalog: MonThiCatalogItem[],
): MonThiCatalogItem[] {
  if (!khoiList.length) return catalog;

  const allowed = new Set<string>();
  for (const khoi of khoiList) {
    for (const item of monThiItemsForKhoiPreset(khoi, catalog)) {
      allowed.add(item.id);
    }
    for (const slot of khoi.slots) {
      const loai = inferSlotLoai(slot.ten_slot, slot.loai);
      if (loai) {
        for (const c of catalog) {
          if ((c.loai?.trim().toLowerCase() ?? "") === loai) {
            allowed.add(c.id);
          }
        }
      }
    }
  }

  return catalog.filter((c) => allowed.has(c.id));
}
