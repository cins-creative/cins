import "server-only";

import { getAvatarUrl } from "@/lib/journey/profile";
import {
  isVisibilityNgoaiLeLoai,
  sanitizeVisibilityCustomPeopleIds,
  type VisibilityNgoaiLeEntry,
  type VisibilityNgoaiLeLoai,
} from "@/lib/journey/milestone-visibility-custom.shared";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type {
  VisibilityNgoaiLeEntry,
  VisibilityNgoaiLeLoai,
} from "@/lib/journey/milestone-visibility-custom.shared";
export {
  applyVisibilityNgoaiLe,
  isVisibilityNgoaiLeLoai,
  sanitizeVisibilityCustomPeopleIds,
  VISIBILITY_CUSTOM_BASE,
} from "@/lib/journey/milestone-visibility-custom.shared";

export type VisibilityCustomPerson = {
  id: string;
  name: string;
  slug: string;
  avatarUrl?: string | null;
};

export type VisibilityCustomState = {
  mode: VisibilityNgoaiLeLoai;
  people: VisibilityCustomPerson[];
};

/** Map id_cot_moc → ngoại lệ (một mode / cột mốc). */
export type VisibilityNgoaiLeIndex = Map<string, VisibilityNgoaiLeEntry>;

type NgoaiLeRow = {
  id_cot_moc: string;
  id_nguoi_dung: string;
  loai: string;
};

function buildIndexFromRows(rows: NgoaiLeRow[]): VisibilityNgoaiLeIndex {
  const map: VisibilityNgoaiLeIndex = new Map();
  for (const row of rows) {
    if (!isVisibilityNgoaiLeLoai(row.loai)) continue;
    const existing = map.get(row.id_cot_moc);
    if (!existing) {
      map.set(row.id_cot_moc, {
        mode: row.loai,
        userIds: new Set([row.id_nguoi_dung]),
      });
      continue;
    }
    /* Cột mốc lệch mode (data cũ) — giữ mode đầu, bỏ dòng khác loại. */
    if (existing.mode !== row.loai) continue;
    existing.userIds.add(row.id_nguoi_dung);
  }
  return map;
}

export async function loadVisibilityNgoaiLeIndex(
  cotMocIds: ReadonlyArray<string>,
): Promise<VisibilityNgoaiLeIndex> {
  const ids = [...new Set(cotMocIds.map((id) => id.trim()).filter(Boolean))];
  if (ids.length === 0) return new Map();

  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("content_cot_moc_hien_thi_ngoai_le")
    .select("id_cot_moc, id_nguoi_dung, loai")
    .in("id_cot_moc", ids)
    .returns<NgoaiLeRow[]>();

  if (error) {
    console.error("[loadVisibilityNgoaiLeIndex]", error.message);
    return new Map();
  }
  return buildIndexFromRows(data ?? []);
}

/** Cột mốc `cho_phep` mà viewer được phép xem — bổ sung pool World feed. */
export async function listChoPhepCotMocIdsForViewer(
  viewerId: string,
): Promise<string[]> {
  const id = viewerId.trim();
  if (!id) return [];

  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("content_cot_moc_hien_thi_ngoai_le")
    .select("id_cot_moc")
    .eq("id_nguoi_dung", id)
    .eq("loai", "cho_phep")
    .limit(120)
    .returns<Array<{ id_cot_moc: string }>>();

  if (error) {
    console.error("[listChoPhepCotMocIdsForViewer]", error.message);
    return [];
  }
  return [...new Set((data ?? []).map((r) => r.id_cot_moc).filter(Boolean))];
}

export async function loadVisibilityCustomStates(
  cotMocIds: ReadonlyArray<string>,
): Promise<Map<string, VisibilityCustomState>> {
  const index = await loadVisibilityNgoaiLeIndex(cotMocIds);
  if (index.size === 0) return new Map();

  const allUserIds = new Set<string>();
  for (const entry of index.values()) {
    for (const uid of entry.userIds) allUserIds.add(uid);
  }

  const admin = createServiceRoleClient();
  const peopleById = new Map<string, VisibilityCustomPerson>();
  if (allUserIds.size > 0) {
    const { data: users } = await admin
      .from("user_nguoi_dung")
      .select("id, slug, ten_hien_thi, avatar_id")
      .in("id", [...allUserIds])
      .returns<
        Array<{
          id: string;
          slug: string;
          ten_hien_thi: string | null;
          avatar_id: string | null;
        }>
      >();

    for (const u of users ?? []) {
      const name = (u.ten_hien_thi ?? "").trim() || u.slug;
      peopleById.set(u.id, {
        id: u.id,
        name,
        slug: u.slug,
        avatarUrl: getAvatarUrl(u.avatar_id),
      });
    }
  }

  const out = new Map<string, VisibilityCustomState>();
  for (const [cotMocId, entry] of index) {
    const people: VisibilityCustomPerson[] = [];
    for (const uid of entry.userIds) {
      const person = peopleById.get(uid);
      if (person) people.push(person);
      else {
        people.push({ id: uid, name: "Người dùng", slug: "" });
      }
    }
    people.sort((a, b) => a.name.localeCompare(b.name, "vi"));
    out.set(cotMocId, { mode: entry.mode, people });
  }
  return out;
}

export async function clearVisibilityNgoaiLe(
  cotMocId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const id = cotMocId.trim();
  if (!id) return { ok: false, error: "Thiếu cột mốc." };

  const admin = createServiceRoleClient();
  const { error } = await admin
    .from("content_cot_moc_hien_thi_ngoai_le")
    .delete()
    .eq("id_cot_moc", id);

  if (error) {
    return { ok: false, error: "Không xoá được ngoại lệ: " + error.message };
  }
  return { ok: true };
}

export async function replaceVisibilityNgoaiLe(params: {
  cotMocId: string;
  mode: VisibilityNgoaiLeLoai;
  peopleIds: ReadonlyArray<string>;
  /** Không cho tự thêm chủ bài vào list. */
  ownerId?: string | null;
}): Promise<
  | { ok: true; state: VisibilityCustomState }
  | { ok: false; error: string }
> {
  const cotMocId = params.cotMocId.trim();
  if (!cotMocId) return { ok: false, error: "Thiếu cột mốc." };
  if (!isVisibilityNgoaiLeLoai(params.mode)) {
    return { ok: false, error: "Chế độ tùy chỉnh không hợp lệ." };
  }

  const ownerId = params.ownerId?.trim() || null;
  let peopleIds = sanitizeVisibilityCustomPeopleIds(params.peopleIds);
  if (ownerId) {
    peopleIds = peopleIds.filter((id) => id !== ownerId);
  }
  if (peopleIds.length === 0) {
    return {
      ok: false,
      error:
        params.mode === "chan"
          ? "Chọn ít nhất một người để chặn."
          : "Chọn ít nhất một người được xem.",
    };
  }

  const admin = createServiceRoleClient();
  const { data: users, error: userErr } = await admin
    .from("user_nguoi_dung")
    .select("id, slug, ten_hien_thi, avatar_id")
    .in("id", peopleIds)
    .returns<
      Array<{
        id: string;
        slug: string;
        ten_hien_thi: string | null;
        avatar_id: string | null;
      }>
    >();

  if (userErr) {
    return { ok: false, error: "Không kiểm tra được người dùng: " + userErr.message };
  }

  const found = new Map((users ?? []).map((u) => [u.id, u]));
  const validIds = peopleIds.filter((id) => found.has(id));
  if (validIds.length === 0) {
    return { ok: false, error: "Không tìm thấy người dùng đã chọn." };
  }

  const cleared = await clearVisibilityNgoaiLe(cotMocId);
  if (!cleared.ok) return cleared;

  const rows = validIds.map((id_nguoi_dung) => ({
    id_cot_moc: cotMocId,
    id_nguoi_dung,
    loai: params.mode,
  }));

  const { error: insertErr } = await admin
    .from("content_cot_moc_hien_thi_ngoai_le")
    .insert(rows);

  if (insertErr) {
    return {
      ok: false,
      error: "Không lưu được tùy chỉnh: " + insertErr.message,
    };
  }

  const people: VisibilityCustomPerson[] = validIds.map((id) => {
    const u = found.get(id)!;
    return {
      id: u.id,
      name: (u.ten_hien_thi ?? "").trim() || u.slug,
      slug: u.slug,
      avatarUrl: getAvatarUrl(u.avatar_id),
    };
  });
  people.sort((a, b) => a.name.localeCompare(b.name, "vi"));

  return { ok: true, state: { mode: params.mode, people } };
}
