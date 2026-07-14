import "server-only";

import type { MilestoneItem } from "@/components/journey/milestone-types";
import type { GalleryMainItem } from "@/lib/journey/gallery-page-fetch";
import { applyAdminDayBaiDiemFeed } from "@/lib/cins/feed-scoring-write";
import type { FeedScoringLoai } from "@/lib/cins/feed-scoring";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

/** TTL một chu kỳ boost (L29). */
export const WORLD_BOOST_TTL_MS = 3 * 24 * 60 * 60 * 1000;

/** Cap số item boost ảnh hưởng thứ tự trong 1 pool World. */
export const WORLD_BOOST_RANK_CAP = 15;

export type WorldBoostLoai = "cot_moc" | "org_bai_dang" | "org_su_kien";

export type WorldBoostTarget = {
  loai: WorldBoostLoai;
  id: string;
};

export type WorldBoostRow = {
  id: string;
  loai_doi_tuong: WorldBoostLoai;
  id_doi_tuong: string;
  dang_bat: boolean;
  bat_dau_luc: string;
  het_han_luc: string;
  gia_han_luc: string | null;
  cap_boi: string | null;
  tat_boi: string | null;
};

const BOOST_SELECT =
  "id, loai_doi_tuong, id_doi_tuong, dang_bat, bat_dau_luc, het_han_luc, gia_han_luc, cap_boi, tat_boi";

export function worldBoostKey(loai: WorldBoostLoai, id: string): string {
  return `${loai}:${id}`;
}

export function parseWorldBoostLoai(raw: string | null | undefined): WorldBoostLoai | null {
  if (raw === "cot_moc" || raw === "org_bai_dang" || raw === "org_su_kien") {
    return raw;
  }
  return null;
}

export function worldBoostTargetFromMilestone(
  m: MilestoneItem,
): WorldBoostTarget | null {
  if (m.orgSuKienRef?.suKienId) {
    return { loai: "org_su_kien", id: m.orgSuKienRef.suKienId };
  }
  if (m.orgBaiDangRef?.postId) {
    return { loai: "org_bai_dang", id: m.orgBaiDangRef.postId };
  }
  const cotMocId = m.cotMocId?.trim();
  if (cotMocId) return { loai: "cot_moc", id: cotMocId };
  return null;
}

export function worldBoostTargetFromGalleryItem(
  item: GalleryMainItem,
): WorldBoostTarget | null {
  const id = item.cotMocId?.trim();
  if (!id) return null;
  if (item.id.startsWith("showcase-") || item.id.startsWith("org-post-")) {
    return { loai: "org_bai_dang", id };
  }
  return { loai: "cot_moc", id };
}

function addHoursIso(baseMs: number, ttlMs: number): string {
  return new Date(baseMs + ttlMs).toISOString();
}

/** Gia hạn hàng đã hết hạn nhưng vẫn `dang_bat`. */
export async function renewExpiredWorldBoosts(): Promise<number> {
  const admin = createServiceRoleClient();
  const nowIso = new Date().toISOString();
  const { data, error } = await admin
    .from("content_world_boost")
    .select("id, het_han_luc")
    .eq("dang_bat", true)
    .lt("het_han_luc", nowIso)
    .limit(200)
    .returns<Array<{ id: string; het_han_luc: string }>>();

  if (error || !data?.length) return 0;

  const now = Date.now();
  let renewed = 0;
  for (const row of data) {
    const base = Math.max(now, Date.parse(row.het_han_luc) || now);
    const { error: upErr } = await admin
      .from("content_world_boost")
      .update({
        het_han_luc: addHoursIso(base, WORLD_BOOST_TTL_MS),
        gia_han_luc: nowIso,
        cap_nhat_luc: nowIso,
      })
      .eq("id", row.id);
    if (!upErr) renewed += 1;
  }
  return renewed;
}

/** Tập key đang boost (sau renew lazy). */
export async function listActiveWorldBoostKeySet(): Promise<Set<string>> {
  await renewExpiredWorldBoosts();
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("content_world_boost")
    .select("loai_doi_tuong, id_doi_tuong, bat_dau_luc")
    .eq("dang_bat", true)
    .order("bat_dau_luc", { ascending: false })
    .limit(WORLD_BOOST_RANK_CAP * 4)
    .returns<
      Array<{
        loai_doi_tuong: WorldBoostLoai;
        id_doi_tuong: string;
        bat_dau_luc: string;
      }>
    >();

  const keys = new Set<string>();
  for (const row of data ?? []) {
    keys.add(worldBoostKey(row.loai_doi_tuong, row.id_doi_tuong));
    if (keys.size >= WORLD_BOOST_RANK_CAP) break;
  }
  return keys;
}

/**
 * Đưa item đang boost lên trước, giữ thứ tự gốc trong mỗi nhóm.
 * Gắn `worldBoosted` khi có trong active set (dùng UI admin; viewer không render).
 */
export function applyWorldBoostOrderToMilestones<T extends MilestoneItem>(
  items: ReadonlyArray<T>,
  boostKeys: ReadonlySet<string>,
): T[] {
  if (items.length === 0 || boostKeys.size === 0) {
    return items.map((m) => {
      const t = worldBoostTargetFromMilestone(m);
      const boosted = t
        ? boostKeys.has(worldBoostKey(t.loai, t.id))
        : false;
      return boosted ? { ...m, worldBoosted: true } : { ...m, worldBoosted: false };
    });
  }

  const boosted: T[] = [];
  const rest: T[] = [];
  for (const m of items) {
    const t = worldBoostTargetFromMilestone(m);
    const isBoost =
      t != null && boostKeys.has(worldBoostKey(t.loai, t.id));
    const next = { ...m, worldBoosted: isBoost } as T;
    if (isBoost) boosted.push(next);
    else rest.push(next);
  }
  return [...boosted, ...rest];
}

export function applyWorldBoostOrderToGalleryItems<T extends GalleryMainItem>(
  items: ReadonlyArray<T>,
  boostKeys: ReadonlySet<string>,
): T[] {
  if (items.length === 0) {
    return [...items];
  }
  if (boostKeys.size === 0) {
    return items.map((item) => {
      const t = worldBoostTargetFromGalleryItem(item);
      const boosted = t
        ? boostKeys.has(worldBoostKey(t.loai, t.id))
        : false;
      return { ...item, worldBoosted: boosted };
    });
  }

  const boosted: T[] = [];
  const rest: T[] = [];
  for (const item of items) {
    const t = worldBoostTargetFromGalleryItem(item);
    const isBoost =
      t != null && boostKeys.has(worldBoostKey(t.loai, t.id));
    const next = { ...item, worldBoosted: isBoost };
    if (isBoost) boosted.push(next);
    else rest.push(next);
  }
  return [...boosted, ...rest];
}

export async function withWorldBoostMilestones<T extends MilestoneItem>(
  items: ReadonlyArray<T>,
): Promise<T[]> {
  try {
    const keys = await listActiveWorldBoostKeySet();
    return applyWorldBoostOrderToMilestones(items, keys);
  } catch {
    return [...items];
  }
}

export async function withWorldBoostGalleryItems<T extends GalleryMainItem>(
  items: ReadonlyArray<T>,
): Promise<T[]> {
  try {
    const keys = await listActiveWorldBoostKeySet();
    return applyWorldBoostOrderToGalleryItems(items, keys);
  } catch {
    return [...items];
  }
}

export async function getWorldBoostRow(
  loai: WorldBoostLoai,
  id: string,
): Promise<WorldBoostRow | null> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("content_world_boost")
    .select(BOOST_SELECT)
    .eq("loai_doi_tuong", loai)
    .eq("id_doi_tuong", id)
    .maybeSingle<WorldBoostRow>();
  return data ?? null;
}

async function syncDiemFeedAfterBoostWrite(input: {
  loai: WorldBoostLoai;
  id: string;
  actorProfileId: string;
  dangBat: boolean;
}): Promise<void> {
  if (input.loai !== "cot_moc" && input.loai !== "org_bai_dang") return;
  await applyAdminDayBaiDiemFeed({
    loai: input.loai as FeedScoringLoai,
    id: input.id,
    actorProfileId: input.actorProfileId,
    dangBat: input.dangBat,
  });
}

export async function toggleWorldBoost(input: {
  loai: WorldBoostLoai;
  id: string;
  dangBat: boolean;
  actorProfileId: string;
}): Promise<{ ok: true; row: WorldBoostRow } | { ok: false; message: string }> {
  const admin = createServiceRoleClient();
  const now = Date.now();
  const nowIso = new Date().toISOString();
  const existing = await getWorldBoostRow(input.loai, input.id);

  if (input.dangBat) {
    const payload = {
      loai_doi_tuong: input.loai,
      id_doi_tuong: input.id,
      dang_bat: true,
      bat_dau_luc: nowIso,
      het_han_luc: addHoursIso(now, WORLD_BOOST_TTL_MS),
      gia_han_luc: null as string | null,
      cap_boi: input.actorProfileId,
      tat_boi: null as string | null,
      cap_nhat_luc: nowIso,
    };

    if (existing) {
      const { data, error } = await admin
        .from("content_world_boost")
        .update(payload)
        .eq("id", existing.id)
        .select(BOOST_SELECT)
        .single<WorldBoostRow>();
      if (error || !data) {
        return { ok: false, message: error?.message ?? "Không cập nhật được boost." };
      }
      await syncDiemFeedAfterBoostWrite({
        loai: input.loai,
        id: input.id,
        actorProfileId: input.actorProfileId,
        dangBat: data.dang_bat,
      });
      return { ok: true, row: data };
    }

    const { data, error } = await admin
      .from("content_world_boost")
      .insert({ ...payload, tao_luc: nowIso })
      .select(BOOST_SELECT)
      .single<WorldBoostRow>();
    if (error || !data) {
      return { ok: false, message: error?.message ?? "Không tạo được boost." };
    }
    await syncDiemFeedAfterBoostWrite({
      loai: input.loai,
      id: input.id,
      actorProfileId: input.actorProfileId,
      dangBat: data.dang_bat,
    });
    return { ok: true, row: data };
  }

  if (!existing) {
    /* Không có dòng boost — vẫn khôi phục điểm nếu còn sót mức đẩy. */
    await syncDiemFeedAfterBoostWrite({
      loai: input.loai,
      id: input.id,
      actorProfileId: input.actorProfileId,
      dangBat: false,
    });
    return {
      ok: true,
      row: {
        id: "",
        loai_doi_tuong: input.loai,
        id_doi_tuong: input.id,
        dang_bat: false,
        bat_dau_luc: nowIso,
        het_han_luc: nowIso,
        gia_han_luc: null,
        cap_boi: null,
        tat_boi: input.actorProfileId,
      },
    };
  }

  const { data, error } = await admin
    .from("content_world_boost")
    .update({
      dang_bat: false,
      tat_boi: input.actorProfileId,
      cap_nhat_luc: nowIso,
    })
    .eq("id", existing.id)
    .select(BOOST_SELECT)
    .single<WorldBoostRow>();

  if (error || !data) {
    return { ok: false, message: error?.message ?? "Không tắt được boost." };
  }
  await syncDiemFeedAfterBoostWrite({
    loai: input.loai,
    id: input.id,
    actorProfileId: input.actorProfileId,
    dangBat: data.dang_bat,
  });
  return { ok: true, row: data };
}
