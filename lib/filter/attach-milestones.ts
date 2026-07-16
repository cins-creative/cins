import "server-only";

import type { MilestoneItem, MilestoneVariant } from "@/components/journey/milestone-types";
import { loadPersonalFiltersForObjects } from "@/lib/filter/gan";
import {
  resolveMilestonePersonalFilterObject,
} from "@/lib/filter/milestone-filter-object";
import {
  FILTER_LOAI_COT_MOC,
  FILTER_LOAI_ORG_BAI_DANG,
  type PersonalFilterRef,
} from "@/lib/filter/types";

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
  userId?: string | null,
): Promise<MilestoneItem[]> {
  if (!userId || milestones.length === 0) return milestones;

  const objects = milestones
    .map((item) => resolveMilestonePersonalFilterObject(item))
    .filter((o): o is NonNullable<typeof o> => o !== null);
  if (objects.length === 0) return milestones;

  const refsMap = await loadPersonalFiltersForObjects(userId, objects);
  return milestones.map((item) => {
    const target = resolveMilestonePersonalFilterObject(item);
    if (!target) return item;
    const personalFilters = refsMap.get(target.objectId) ?? [];
    return {
      ...item,
      personalFilters,
      personalFilterSlugs: personalFilters.map((f) => f.slug),
    };
  });
}

/** Gallery items — cùng shape slug + ref. */
export async function attachPersonalFiltersToGalleryItems<
  T extends {
    cotMocId: string;
    variant?: MilestoneVariant;
    postSlug?: string | null;
    personalFilterSlugs?: string[];
    personalFilters?: PersonalFilterRef[];
  },
>(items: T[], userId?: string | null): Promise<T[]> {
  if (!userId || items.length === 0) return items;

  const objects = items
    .map((item) => {
      if (item.variant === "verified" && !item.postSlug?.trim()) {
        return {
          objectId: item.cotMocId,
          loaiDoiTuong: FILTER_LOAI_ORG_BAI_DANG,
        };
      }
      return {
        objectId: item.cotMocId,
        loaiDoiTuong: FILTER_LOAI_COT_MOC,
      };
    })
    .filter((o) => /^[0-9a-f-]{36}$/i.test(o.objectId));

  if (objects.length === 0) return items;

  const refsMap = await loadPersonalFiltersForObjects(userId, objects);
  return items.map((item) => {
    const personalFilters = refsMap.get(item.cotMocId) ?? [];
    return {
      ...item,
      personalFilters,
      personalFilterSlugs: personalFilters.map((f) => f.slug),
    };
  });
}
