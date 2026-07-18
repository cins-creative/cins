import "server-only";

import { assertBanHangEnabled } from "@/lib/shop/settings";
import type { ShopEvidence, ShopQuaySuKien, ShopTrangThaiQuay } from "@/lib/shop/types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { canViewerManageSuKien } from "@/lib/to-chuc/su-kien";

type QuayRow = {
  id: string;
  id_su_kien: string;
  id_nguoi_dung: string;
  id_cot_moc: string | null;
  bang_chung: unknown;
  trang_thai: ShopTrangThaiQuay;
  ly_do_tu_choi: string | null;
  tao_luc: string;
};

function parseEvidence(raw: unknown): ShopEvidence[] {
  if (!Array.isArray(raw)) return [];
  const out: ShopEvidence[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const label = typeof o.label === "string" ? o.label : "";
    const kind = o.kind;
    if (!label || (kind !== "link" && kind !== "file" && kind !== "text")) {
      continue;
    }
    const row: ShopEvidence = { label, kind };
    if (typeof o.href === "string") row.href = o.href;
    if (typeof o.detail === "string") row.detail = o.detail;
    out.push(row);
  }
  return out;
}

async function mapQuay(rows: QuayRow[]): Promise<ShopQuaySuKien[]> {
  if (rows.length === 0) return [];
  const admin = createServiceRoleClient();
  const userIds = [...new Set(rows.map((r) => r.id_nguoi_dung))];
  const { data: users } = await admin
    .from("user_nguoi_dung")
    .select("id, ten_hien_thi, slug")
    .in("id", userIds);
  const umap = new Map(
    (
      (users ?? []) as Array<{
        id: string;
        ten_hien_thi: string | null;
        slug: string | null;
      }>
    ).map((u) => [u.id, u]),
  );
  return rows.map((r) => {
    const u = umap.get(r.id_nguoi_dung);
    return {
      id: r.id,
      idSuKien: r.id_su_kien,
      idNguoiDung: r.id_nguoi_dung,
      idCotMoc: r.id_cot_moc,
      bangChung: parseEvidence(r.bang_chung),
      trangThai: r.trang_thai,
      lyDoTuChoi: r.ly_do_tu_choi,
      nguoiDungTen: u?.ten_hien_thi ?? null,
      nguoiDungSlug: u?.slug ?? null,
      taoLuc: r.tao_luc,
    };
  });
}

export async function listQuaySuKien(
  suKienId: string,
  opts?: { includePending?: boolean; actorId?: string },
): Promise<ShopQuaySuKien[]> {
  const admin = createServiceRoleClient();
  let q = admin
    .from("shop_quay_su_kien")
    .select(
      "id, id_su_kien, id_nguoi_dung, id_cot_moc, bang_chung, trang_thai, ly_do_tu_choi, tao_luc",
    )
    .eq("id_su_kien", suKienId)
    .order("tao_luc", { ascending: false })
    .limit(100);

  if (!opts?.includePending) {
    q = q.eq("trang_thai", "da_duyet");
  }

  const { data, error } = await q;
  if (error) {
    console.error("[shop] listQuay", error);
    return [];
  }
  return mapQuay((data ?? []) as QuayRow[]);
}

export async function xinLamQuay(
  userId: string,
  input: {
    suKienId: string;
    cotMocId?: string | null;
    bangChung: ShopEvidence[];
  },
): Promise<ShopQuaySuKien> {
  await assertBanHangEnabled(userId);
  if (!input.bangChung.length) throw new Error("EVIDENCE_REQUIRED");

  const admin = createServiceRoleClient();
  const { data: sk } = await admin
    .from("org_su_kien")
    .select("id")
    .eq("id", input.suKienId)
    .maybeSingle();
  if (!sk) throw new Error("SU_KIEN_NOT_FOUND");

  if (input.cotMocId) {
    const { data: moc } = await admin
      .from("content_cot_moc")
      .select("id, id_nguoi_dung")
      .eq("id", input.cotMocId)
      .maybeSingle<{ id: string; id_nguoi_dung: string }>();
    if (!moc || moc.id_nguoi_dung !== userId) throw new Error("FORBIDDEN");
  }

  const payload = {
    id_su_kien: input.suKienId,
    id_nguoi_dung: userId,
    id_cot_moc: input.cotMocId ?? null,
    bang_chung: input.bangChung,
    trang_thai: "cho_xu_ly" as const,
    ly_do_tu_choi: null,
    cap_nhat_luc: new Date().toISOString(),
  };

  let existingQ = admin
    .from("shop_quay_su_kien")
    .select("id")
    .eq("id_su_kien", input.suKienId)
    .eq("id_nguoi_dung", userId);
  existingQ = input.cotMocId
    ? existingQ.eq("id_cot_moc", input.cotMocId)
    : existingQ.is("id_cot_moc", null);
  const { data: existing } = await existingQ.maybeSingle<{ id: string }>();

  const { data, error } = existing
    ? await admin
        .from("shop_quay_su_kien")
        .update(payload)
        .eq("id", existing.id)
        .select(
          "id, id_su_kien, id_nguoi_dung, id_cot_moc, bang_chung, trang_thai, ly_do_tu_choi, tao_luc",
        )
        .single<QuayRow>()
    : await admin
        .from("shop_quay_su_kien")
        .insert(payload)
        .select(
          "id, id_su_kien, id_nguoi_dung, id_cot_moc, bang_chung, trang_thai, ly_do_tu_choi, tao_luc",
        )
        .single<QuayRow>();

  if (error || !data) {
    console.error("[shop] xinLamQuay", error);
    throw new Error("CREATE_FAILED");
  }
  const [mapped] = await mapQuay([data]);
  return mapped!;
}

export async function duyetQuay(
  actorId: string,
  quayId: string,
  action: "approve" | "reject",
  lyDoTuChoi?: string | null,
): Promise<ShopQuaySuKien> {
  const admin = createServiceRoleClient();
  const { data: quay } = await admin
    .from("shop_quay_su_kien")
    .select(
      "id, id_su_kien, id_nguoi_dung, id_cot_moc, bang_chung, trang_thai, ly_do_tu_choi, tao_luc",
    )
    .eq("id", quayId)
    .maybeSingle<QuayRow>();
  if (!quay) throw new Error("NOT_FOUND");

  const { data: sk } = await admin
    .from("org_su_kien")
    .select("id_to_chuc")
    .eq("id", quay.id_su_kien)
    .maybeSingle<{ id_to_chuc: string }>();
  if (!sk) throw new Error("SU_KIEN_NOT_FOUND");
  if (!(await canViewerManageSuKien(actorId, sk.id_to_chuc))) {
    throw new Error("FORBIDDEN");
  }

  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("shop_quay_su_kien")
    .update({
      trang_thai: action === "approve" ? "da_duyet" : "tu_choi",
      ly_do_tu_choi:
        action === "reject" ? lyDoTuChoi?.trim() || "Từ chối" : null,
      duyet_boi: actorId,
      duyet_luc: now,
      cap_nhat_luc: now,
    })
    .eq("id", quayId)
    .select(
      "id, id_su_kien, id_nguoi_dung, id_cot_moc, bang_chung, trang_thai, ly_do_tu_choi, tao_luc",
    )
    .single<QuayRow>();
  if (error || !data) throw new Error("UPDATE_FAILED");
  const [mapped] = await mapQuay([data]);
  return mapped!;
}
