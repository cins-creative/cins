import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getViewerCoSoVaiTro } from "@/lib/to-chuc/co-so-membership";
import {
  CO_SO_MODULE_KEYS,
  isCoSoFounderTier,
  isCoSoModuleKey,
  type CoSoModuleKey,
  type CoSoMucQuyen,
} from "@/lib/to-chuc/co-so-quan-ly-access";
import { isCoSoStaffRole } from "@/lib/to-chuc/co-so-vai-tro";

type Ctx = { params: Promise<{ id: string }> };

type StaffRow = {
  id: string;
  id_nguoi_dung: string;
  vai_tro: string;
  trang_thai: string;
  user_nguoi_dung:
    | { slug: string; ten_hien_thi: string | null; avatar_id: string | null }
    | { slug: string; ten_hien_thi: string | null; avatar_id: string | null }[]
    | null;
};

function profileOf(row: StaffRow) {
  const raw = row.user_nguoi_dung;
  return Array.isArray(raw) ? (raw[0] ?? null) : raw;
}

async function assertFounder(orgId: string, actorId: string) {
  const vaiTro = await getViewerCoSoVaiTro(actorId, orgId);
  return isCoSoFounderTier(vaiTro);
}

/** GET — danh sách staff dưới founder tier + quyền hiện tại theo module. */
export async function GET(_req: Request, ctx: Ctx) {
  const { id: orgId } = await ctx.params;
  const session = await getCurrentSessionAndProfile();
  const actorId = session?.profile?.id;
  if (!actorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await assertFounder(orgId, actorId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createServiceRoleClient();
  const { data: staffRows, error: staffError } = await admin
    .from("user_thanh_vien_to_chuc")
    .select(
      "id, id_nguoi_dung, vai_tro, trang_thai, user_nguoi_dung: id_nguoi_dung ( slug, ten_hien_thi, avatar_id )",
    )
    .eq("id_to_chuc", orgId)
    .eq("trang_thai", "active")
    .in("vai_tro", [
      "quan_ly_noi_dung",
      "quan_ly_tuyen_sinh",
      "giao_vien",
      "nhan_vien",
    ]);
  if (staffError) {
    return NextResponse.json({ error: staffError.message }, { status: 400 });
  }

  const { data: quyenRows, error: quyenError } = await admin
    .from("org_thanh_vien_quyen")
    .select("id_nguoi_dung, module, muc_quyen")
    .eq("id_to_chuc", orgId);
  if (quyenError) {
    return NextResponse.json({ error: quyenError.message }, { status: 400 });
  }

  const quyenByUser = new Map<string, Record<CoSoModuleKey, CoSoMucQuyen>>();
  for (const row of quyenRows ?? []) {
    const module = row.module as string;
    if (!isCoSoModuleKey(module)) continue;
    const map =
      quyenByUser.get(row.id_nguoi_dung as string) ??
      (Object.fromEntries(
        CO_SO_MODULE_KEYS.map((k) => [k, "an"]),
      ) as Record<CoSoModuleKey, CoSoMucQuyen>);
    map[module] = row.muc_quyen === "sua" ? "sua" : "xem";
    quyenByUser.set(row.id_nguoi_dung as string, map);
  }

  const staff = (staffRows ?? [])
    .filter((row) => isCoSoStaffRole(row.vai_tro))
    .map((row) => {
      const profile = profileOf(row as StaffRow);
      const emptyQuyen = Object.fromEntries(
        CO_SO_MODULE_KEYS.map((k) => [k, "an"]),
      ) as Record<CoSoModuleKey, CoSoMucQuyen>;
      return {
        userId: row.id_nguoi_dung,
        slug: profile?.slug ?? "",
        tenHienThi: profile?.ten_hien_thi?.trim() || profile?.slug || "—",
        avatarId: profile?.avatar_id ?? null,
        vaiTro: row.vai_tro,
        quyen: quyenByUser.get(row.id_nguoi_dung as string) ?? emptyQuyen,
      };
    })
    .filter((row) => row.slug);

  return NextResponse.json({ modules: CO_SO_MODULE_KEYS, staff });
}

/** PATCH — set quyền 1 ô (userId × module). mucQuyen: "an" | "xem" | "sua". "an" = xoá row. */
export async function PATCH(req: Request, ctx: Ctx) {
  const { id: orgId } = await ctx.params;
  const session = await getCurrentSessionAndProfile();
  const actorId = session?.profile?.id;
  if (!actorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await assertFounder(orgId, actorId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: {
    userId?: string;
    module?: string;
    mucQuyen?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { userId, module, mucQuyen } = body;
  if (!userId || !module || !isCoSoModuleKey(module)) {
    return NextResponse.json(
      { error: "Thiếu userId/module hợp lệ." },
      { status: 400 },
    );
  }
  if (mucQuyen !== "an" && mucQuyen !== "xem" && mucQuyen !== "sua") {
    return NextResponse.json({ error: "mucQuyen không hợp lệ." }, { status: 400 });
  }

  // Không cho set quyền cho chính founder tier (owner/admin) — họ luôn full quyền.
  const targetVaiTro = await getViewerCoSoVaiTro(userId, orgId);
  if (isCoSoFounderTier(targetVaiTro)) {
    return NextResponse.json(
      { error: "Owner/Admin luôn có toàn quyền, không cần đặt." },
      { status: 400 },
    );
  }

  const admin = createServiceRoleClient();

  if (mucQuyen === "an") {
    const { error } = await admin
      .from("org_thanh_vien_quyen")
      .delete()
      .eq("id_to_chuc", orgId)
      .eq("id_nguoi_dung", userId)
      .eq("module", module);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true, mucQuyen: "an" });
  }

  const { error } = await admin.from("org_thanh_vien_quyen").upsert(
    {
      id_to_chuc: orgId,
      id_nguoi_dung: userId,
      module,
      muc_quyen: mucQuyen,
      cap_nhat_boi: actorId,
      cap_nhat_luc: new Date().toISOString(),
    },
    { onConflict: "id_to_chuc,id_nguoi_dung,module" },
  );
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true, mucQuyen });
}
