import "server-only";

import type { MilestoneItem } from "@/components/journey/milestone-types";
import { loadPersonalFiltersForCotMocs } from "@/lib/filter/gan";
import type { PersonalFilterRef } from "@/lib/filter/types";

function collectCotMocIds(
  items: ReadonlyArray<{ cotMocId?: string | null; id?: string | null }>,
) {
  return [
    ...new Set(
      items
        .map((item) => item.cotMocId ?? item.id)
        .filter(
          (id): id is string =>
            typeof id === "string" && /^[0-9a-f-]{36}$/i.test(id),
        ),
    ),
  ];
}

/** Gắn slug + metadata nhãn lên milestone — badge hiển thị ngay cả khi visitor chưa fetch context. */
export async function attachPersonalFiltersToMilestones(
  milestones: MilestoneItem[],
): Promise<MilestoneItem[]> {
  const cotMocIds = collectCotMocIds(milestones);
  if (cotMocIds.length === 0) return milestones;

  const refsMap = await loadPersonalFiltersForCotMocs(cotMocIds);
  return milestones.map((item) => {
    const id = item.cotMocId ?? item.id;
    const personalFilters = refsMap.get(id) ?? [];
    return {
      ...item,
      personalFilters,
      personalFilterSlugs: personalFilters.map((f) => f.slug),
    };
  });
}

/** Gallery items — cùng shape slug + ref. */
export async function attachPersonalFiltersToGalleryItems<
  T extends { cotMocId: string; personalFilterSlugs?: string[]; personalFilters?: PersonalFilterRef[] },
>(items: T[]): Promise<T[]> {
  const cotMocIds = collectCotMocIds(items);
  if (cotMocIds.length === 0) return items;

  const refsMap = await loadPersonalFiltersForCotMocs(cotMocIds);
  return items.map((item) => {
    const personalFilters = refsMap.get(item.cotMocId) ?? [];
    return {
      ...item,
      personalFilters,
      personalFilterSlugs: personalFilters.map((f) => f.slug),
    };
  });
}
