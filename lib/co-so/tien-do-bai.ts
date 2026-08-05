import "server-only";

import { assertBaiTapThuocKhoa } from "@/lib/co-so/nop-bai";
import { guiTinHeThongLopBai } from "@/lib/co-so/lop-he-thong-tin";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { LoaiBaiGiaoTrinh } from "@/lib/to-chuc/khoa-hoc-types";
import { isLoaiBaiGiaoTrinh } from "@/lib/to-chuc/khoa-hoc-types";

export type GiaoTrinhBaiChoHv = {
  id: string;
  tenBaiTap: string;
  moTa: string | null;
  yeuCau: string | null;
  videoYoutubeUrl: string | null;
  thumbnailUrl: string | null;
  thuocTinh: LoaiBaiGiaoTrinh;
  thuTu: number;
  daMo: boolean;
  moLuc: string | null;
  nopBai: {
    id: string;
    trangThai: string;
    diem: number | null;
    ghiChu: string | null;
    luuLuc: string | null;
    cotMocId: string | null;
    taoLuc: string;
  } | null;
};

export type TienDoLopHocVien = {
  hocVienLopId: string;
  userId: string;
  tenHienThi: string;
  avatarId: string | null;
  baiHienTaiId: string | null;
  baiDaMoIds: string[];
  soChoDuyet: number;
};

const NOP_CO_THE_NOP = new Set([
  "bai_tap",
  "kiem_tra",
  "du_an",
  "on_tap",
]);

export function thuocTinhCoTheNop(t: LoaiBaiGiaoTrinh): boolean {
  return NOP_CO_THE_NOP.has(t);
}

async function loadBaiTrongBo(
  khoaId: string,
): Promise<
  Array<{
    id: string;
    tenBaiTap: string;
    moTa: string | null;
    yeuCau: string | null;
    videoYoutubeUrl: string | null;
    thumbnailUrl: string | null;
    thuocTinh: LoaiBaiGiaoTrinh;
    thuTu: number;
  }>
> {
  const admin = createServiceRoleClient();
  const { data: khoa } = await admin
    .from("org_khoa_hoc")
    .select("id_bo_giao_trinh")
    .eq("id", khoaId)
    .maybeSingle();

  if (khoa?.id_bo_giao_trinh) {
    const { data } = await admin
      .from("org_giao_trinh_bai")
      .select(
        "thu_tu, thuoc_tinh, org_bai_tap!inner(id, ten_bai_tap, mo_ta, yeu_cau, video_youtube_url, thumbnail_url)",
      )
      .eq("id_bo", khoa.id_bo_giao_trinh as string)
      .order("thu_tu", { ascending: true });
    return (data ?? []).map((row) => {
      const bt = row.org_bai_tap as unknown as {
        id: string;
        ten_bai_tap: string;
        mo_ta: string | null;
        yeu_cau: string | null;
        video_youtube_url: string | null;
        thumbnail_url: string | null;
      };
      const thuocTinh: LoaiBaiGiaoTrinh = isLoaiBaiGiaoTrinh(row.thuoc_tinh)
        ? row.thuoc_tinh
        : "bai_tap";
      return {
        id: bt.id,
        tenBaiTap: bt.ten_bai_tap,
        moTa: bt.mo_ta,
        yeuCau: bt.yeu_cau,
        videoYoutubeUrl: bt.video_youtube_url,
        thumbnailUrl: bt.thumbnail_url,
        thuocTinh,
        thuTu: (row.thu_tu as number) ?? 0,
      };
    });
  }

  const { data } = await admin
    .from("org_bai_tap")
    .select(
      "id, ten_bai_tap, mo_ta, yeu_cau, video_youtube_url, thumbnail_url, thu_tu",
    )
    .eq("id_khoa_hoc", khoaId)
    .order("thu_tu");
  return (data ?? []).map((b) => ({
    id: b.id as string,
    tenBaiTap: b.ten_bai_tap as string,
    moTa: (b.mo_ta as string | null) ?? null,
    yeuCau: (b.yeu_cau as string | null) ?? null,
    videoYoutubeUrl: (b.video_youtube_url as string | null) ?? null,
    thumbnailUrl: (b.thumbnail_url as string | null) ?? null,
    thuocTinh: "bai_tap" as LoaiBaiGiaoTrinh,
    thuTu: (b.thu_tu as number) ?? 0,
  }));
}

export async function listGiaoTrinhChoHocVien(
  hocVienLopId: string,
): Promise<{
  bai: GiaoTrinhBaiChoHv[];
  dongBoTienDo: boolean;
  khoaId: string;
  lopId: string | null;
} | null> {
  const admin = createServiceRoleClient();
  const { data: hvl } = await admin
    .from("user_hoc_vien_lop")
    .select("id, id_khoa_hoc, id_lop_hoc")
    .eq("id", hocVienLopId)
    .maybeSingle();
  if (!hvl) return null;

  const khoaId = hvl.id_khoa_hoc as string;
  const { data: khoa } = await admin
    .from("org_khoa_hoc")
    .select("dong_bo_tien_do")
    .eq("id", khoaId)
    .maybeSingle();

  const baiList = await loadBaiTrongBo(khoaId);
  const baiIds = baiList.map((b) => b.id);

  type NopBaiRow = {
    id: string;
    id_bai_tap: string;
    trang_thai: string;
    diem: number | null;
    ghi_chu: string | null;
    luu_luc: string | null;
    id_cot_moc: string | null;
    tao_luc: string;
  };

  const [{ data: moRows }, { data: nopRows }] = await Promise.all([
    admin
      .from("org_tien_do_bai_mo")
      .select("id_bai_tap, mo_luc")
      .eq("id_hoc_vien_lop", hocVienLopId),
    baiIds.length
      ? admin
          .from("org_nop_bai")
          .select(
            "id, id_bai_tap, trang_thai, diem, ghi_chu, luu_luc, id_cot_moc, tao_luc",
          )
          .eq("id_hoc_vien_lop", hocVienLopId)
          .in("id_bai_tap", baiIds)
          .order("tao_luc", { ascending: false })
      : Promise.resolve({ data: [] as NopBaiRow[] }),
  ]);

  const moMap = new Map<string, string>(
    (moRows ?? []).map((r) => [
      r.id_bai_tap as string,
      r.mo_luc as string,
    ]),
  );

  // Nộp mới nhất / bài
  const nopMap = new Map<
    string,
    {
      id: string;
      trangThai: string;
      diem: number | null;
      ghiChu: string | null;
      luuLuc: string | null;
      cotMocId: string | null;
      taoLuc: string;
    }
  >();
  for (const n of (nopRows ?? []) as NopBaiRow[]) {
    const bid = n.id_bai_tap;
    if (nopMap.has(bid)) continue;
    nopMap.set(bid, {
      id: n.id,
      trangThai: n.trang_thai,
      diem: n.diem != null ? Number(n.diem) : null,
      ghiChu: n.ghi_chu ?? null,
      luuLuc: n.luu_luc ?? null,
      cotMocId: n.id_cot_moc ?? null,
      taoLuc: n.tao_luc,
    });
  }

  return {
    khoaId,
    lopId: (hvl.id_lop_hoc as string | null) ?? null,
    dongBoTienDo: Boolean(khoa?.dong_bo_tien_do),
    bai: baiList.map((b) => ({
      ...b,
      daMo: moMap.has(b.id),
      moLuc: moMap.get(b.id) ?? null,
      nopBai: nopMap.get(b.id) ?? null,
    })),
  };
}

async function upsertMoVaConTro(input: {
  hocVienLopId: string;
  baiTapId: string;
  actorId: string;
  tinNhanId?: string | null;
}): Promise<{ moiMo: boolean }> {
  const admin = createServiceRoleClient();
  const now = new Date().toISOString();

  const { data: existing } = await admin
    .from("org_tien_do_bai_mo")
    .select("id")
    .eq("id_hoc_vien_lop", input.hocVienLopId)
    .eq("id_bai_tap", input.baiTapId)
    .maybeSingle();

  let moiMo = false;
  if (!existing?.id) {
    const { error } = await admin.from("org_tien_do_bai_mo").insert({
      id_hoc_vien_lop: input.hocVienLopId,
      id_bai_tap: input.baiTapId,
      id_nguoi_gan: input.actorId,
      mo_luc: now,
      id_tin_nhan: input.tinNhanId ?? null,
    });
    if (!error) moiMo = true;
  }

  await admin.from("org_tien_do_bai").upsert(
    {
      id_hoc_vien_lop: input.hocVienLopId,
      id_bai_tap: input.baiTapId,
      id_nguoi_gan: input.actorId,
      cap_nhat_luc: now,
    },
    { onConflict: "id_hoc_vien_lop" },
  );

  return { moiMo };
}

/** Mở bài cho 1 HV (idempotent). Trả danh sách bài thực sự mới mở. */
export async function moBaiChoHocVien(input: {
  orgId: string;
  hocVienLopId: string;
  baiTapIds: string[];
  actorId: string;
  /** Nếu khóa đang dong_bo — vẫn chỉ mở cho HV này trừ khi gọi moBaiChoLop. */
  sendTinHeThong?: boolean;
}): Promise<
  | { ok: true; moiMoBaiIds: string[] }
  | { ok: false; error: string }
> {
  const admin = createServiceRoleClient();
  const { data: hvl } = await admin
    .from("user_hoc_vien_lop")
    .select("id, id_khoa_hoc, id_lop_hoc, id_nguoi_dung")
    .eq("id", input.hocVienLopId)
    .maybeSingle();
  if (!hvl) return { ok: false, error: "Không tìm thấy ghi danh." };

  const khoaId = hvl.id_khoa_hoc as string;
  const { data: khoa } = await admin
    .from("org_khoa_hoc")
    .select("id, id_to_chuc")
    .eq("id", khoaId)
    .maybeSingle();
  if (!khoa || khoa.id_to_chuc !== input.orgId) {
    return { ok: false, error: "Khóa không thuộc cơ sở." };
  }

  const uniqueIds = [...new Set(input.baiTapIds.filter(Boolean))];
  if (uniqueIds.length === 0) {
    return { ok: false, error: "Thiếu bài tập." };
  }

  const moiMoBaiIds: string[] = [];
  for (const baiTapId of uniqueIds) {
    const check = await assertBaiTapThuocKhoa(khoaId, baiTapId, input.orgId);
    if (!check.ok) return check;

    let tinId: string | null = null;
    if (input.sendTinHeThong !== false && hvl.id_lop_hoc) {
      // Chỉ gửi tin khi thực sự mới mở — check trước
      const { data: existed } = await admin
        .from("org_tien_do_bai_mo")
        .select("id")
        .eq("id_hoc_vien_lop", input.hocVienLopId)
        .eq("id_bai_tap", baiTapId)
        .maybeSingle();
      if (!existed?.id) {
        tinId = await guiTinHeThongLopBai({
          lopId: hvl.id_lop_hoc as string,
          actorId: input.actorId,
          loai: "mo_bai",
          idNguoiDung: hvl.id_nguoi_dung as string,
          idHocVienLop: hvl.id as string,
          idBaiTap: baiTapId,
          tenBai: check.tenBaiTap,
        });
      }
    }

    const { moiMo } = await upsertMoVaConTro({
      hocVienLopId: input.hocVienLopId,
      baiTapId,
      actorId: input.actorId,
      tinNhanId: tinId,
    });
    if (moiMo) moiMoBaiIds.push(baiTapId);
  }

  return { ok: true, moiMoBaiIds };
}

/** Fan-out mở bài cho mọi HV trong lớp. */
export async function moBaiChoLop(input: {
  orgId: string;
  lopId: string;
  baiTapIds: string[];
  actorId: string;
}): Promise<
  | { ok: true; soHocVien: number; moiMoPairs: number }
  | { ok: false; error: string }
> {
  const admin = createServiceRoleClient();
  const { data: lop } = await admin
    .from("org_lop_hoc")
    .select("id, id_khoa_hoc")
    .eq("id", input.lopId)
    .maybeSingle();
  if (!lop) return { ok: false, error: "Không tìm thấy lớp." };

  const { data: khoa } = await admin
    .from("org_khoa_hoc")
    .select("id, id_to_chuc")
    .eq("id", lop.id_khoa_hoc as string)
    .maybeSingle();
  if (!khoa || khoa.id_to_chuc !== input.orgId) {
    return { ok: false, error: "Lớp không thuộc cơ sở." };
  }

  const { data: hvls } = await admin
    .from("user_hoc_vien_lop")
    .select("id")
    .eq("id_lop_hoc", input.lopId);
  if (!hvls?.length) {
    return { ok: true, soHocVien: 0, moiMoPairs: 0 };
  }

  let moiMoPairs = 0;
  for (const h of hvls) {
    const r = await moBaiChoHocVien({
      orgId: input.orgId,
      hocVienLopId: h.id as string,
      baiTapIds: input.baiTapIds,
      actorId: input.actorId,
    });
    if (r.ok) moiMoPairs += r.moiMoBaiIds.length;
  }

  return { ok: true, soHocVien: hvls.length, moiMoPairs };
}

/**
 * Khi khóa `dong_bo_tien_do`: copy mọi bài đã mở trong lớp sang HV mới.
 * Gọi sau khi ghi danh / join phòng lớp.
 */
export async function copyTienDoDongBoChoHocVienMoi(input: {
  orgId: string;
  lopId: string;
  hocVienLopId: string;
  actorId?: string | null;
}): Promise<{ copied: number }> {
  const admin = createServiceRoleClient();
  const { data: lop } = await admin
    .from("org_lop_hoc")
    .select("id_khoa_hoc")
    .eq("id", input.lopId)
    .maybeSingle();
  if (!lop) return { copied: 0 };

  const { data: khoa } = await admin
    .from("org_khoa_hoc")
    .select("id, id_to_chuc, dong_bo_tien_do")
    .eq("id", lop.id_khoa_hoc as string)
    .maybeSingle();
  if (!khoa || khoa.id_to_chuc !== input.orgId || !khoa.dong_bo_tien_do) {
    return { copied: 0 };
  }

  const { data: peers } = await admin
    .from("user_hoc_vien_lop")
    .select("id")
    .eq("id_lop_hoc", input.lopId)
    .neq("id", input.hocVienLopId);
  const peerIds = (peers ?? []).map((p) => p.id as string);
  if (peerIds.length === 0) return { copied: 0 };

  const { data: moRows } = await admin
    .from("org_tien_do_bai_mo")
    .select("id_bai_tap")
    .in("id_hoc_vien_lop", peerIds);
  const baiIds = [
    ...new Set((moRows ?? []).map((r) => r.id_bai_tap as string)),
  ];
  if (baiIds.length === 0) return { copied: 0 };

  // Không gửi tin chúc mừng từng bài khi copy hàng loạt — 1 tin tổng nếu cần
  const actorId = input.actorId ?? null;
  let copied = 0;
  for (const baiTapId of baiIds) {
    const { moiMo } = await upsertMoVaConTro({
      hocVienLopId: input.hocVienLopId,
      baiTapId,
      actorId: actorId ?? input.hocVienLopId,
    });
    if (moiMo) copied += 1;
  }

  if (copied > 0 && actorId) {
    const { data: hvl } = await admin
      .from("user_hoc_vien_lop")
      .select("id_nguoi_dung")
      .eq("id", input.hocVienLopId)
      .maybeSingle();
    if (hvl?.id_nguoi_dung) {
      // Tin 1 lần: mở đồng bộ
      const lastBai = baiIds[baiIds.length - 1]!;
      const { data: bai } = await admin
        .from("org_bai_tap")
        .select("ten_bai_tap")
        .eq("id", lastBai)
        .maybeSingle();
      await guiTinHeThongLopBai({
        lopId: input.lopId,
        actorId,
        loai: "mo_bai",
        idNguoiDung: hvl.id_nguoi_dung as string,
        idHocVienLop: input.hocVienLopId,
        idBaiTap: lastBai,
        tenBai: (bai?.ten_bai_tap as string) || "giáo trình lớp",
      });
    }
  }

  return { copied };
}

export async function listTienDoLop(lopId: string): Promise<{
  dongBoTienDo: boolean;
  khoaId: string;
  bai: Array<{
    id: string;
    ten: string;
    thuTu: number;
    thuocTinh: LoaiBaiGiaoTrinh;
    thumbnailUrl: string | null;
  }>;
  hocVien: TienDoLopHocVien[];
}> {
  const admin = createServiceRoleClient();
  const { data: lop } = await admin
    .from("org_lop_hoc")
    .select("id_khoa_hoc")
    .eq("id", lopId)
    .maybeSingle();
  if (!lop) {
    return { dongBoTienDo: false, khoaId: "", bai: [], hocVien: [] };
  }
  const khoaId = lop.id_khoa_hoc as string;
  const { data: khoa } = await admin
    .from("org_khoa_hoc")
    .select("dong_bo_tien_do")
    .eq("id", khoaId)
    .maybeSingle();

  const baiList = await loadBaiTrongBo(khoaId);
  const { data: hvls } = await admin
    .from("user_hoc_vien_lop")
    .select("id, id_nguoi_dung")
    .eq("id_lop_hoc", lopId);

  if (!hvls?.length) {
    return {
      dongBoTienDo: Boolean(khoa?.dong_bo_tien_do),
      khoaId,
      bai: baiList.map((b) => ({
        id: b.id,
        ten: b.tenBaiTap,
        thuTu: b.thuTu,
        thuocTinh: b.thuocTinh,
        thumbnailUrl: b.thumbnailUrl,
      })),
      hocVien: [],
    };
  }

  const hvlIds = hvls.map((h) => h.id as string);
  const userIds = hvls.map((h) => h.id_nguoi_dung as string);

  const [{ data: moRows }, { data: conTro }, { data: nops }, { data: users }] =
    await Promise.all([
      admin
        .from("org_tien_do_bai_mo")
        .select("id_hoc_vien_lop, id_bai_tap")
        .in("id_hoc_vien_lop", hvlIds),
      admin
        .from("org_tien_do_bai")
        .select("id_hoc_vien_lop, id_bai_tap")
        .in("id_hoc_vien_lop", hvlIds),
      admin
        .from("org_nop_bai")
        .select("id_hoc_vien_lop")
        .in("id_hoc_vien_lop", hvlIds)
        .eq("trang_thai", "cho_duyet"),
      admin
        .from("user_nguoi_dung")
        .select("id, ten_hien_thi, avatar_id")
        .in("id", userIds),
    ]);

  const moByHv = new Map<string, string[]>();
  for (const r of moRows ?? []) {
    const hid = r.id_hoc_vien_lop as string;
    const list = moByHv.get(hid) ?? [];
    list.push(r.id_bai_tap as string);
    moByHv.set(hid, list);
  }
  const conTroMap = new Map(
    (conTro ?? []).map((r) => [
      r.id_hoc_vien_lop as string,
      r.id_bai_tap as string,
    ]),
  );
  const choDuyetCount = new Map<string, number>();
  for (const n of nops ?? []) {
    const hid = n.id_hoc_vien_lop as string;
    choDuyetCount.set(hid, (choDuyetCount.get(hid) ?? 0) + 1);
  }
  const userMap = new Map(
    (users ?? []).map((u) => [
      u.id as string,
      {
        ten: (u.ten_hien_thi as string) || "HV",
        avatarId: (u.avatar_id as string | null) ?? null,
      },
    ]),
  );

  return {
    dongBoTienDo: Boolean(khoa?.dong_bo_tien_do),
    khoaId,
    bai: baiList.map((b) => ({
      id: b.id,
      ten: b.tenBaiTap,
      thuTu: b.thuTu,
      thuocTinh: b.thuocTinh,
      thumbnailUrl: b.thumbnailUrl,
    })),
    hocVien: hvls.map((h) => {
      const uid = h.id_nguoi_dung as string;
      const u = userMap.get(uid);
      return {
        hocVienLopId: h.id as string,
        userId: uid,
        tenHienThi: u?.ten ?? "HV",
        avatarId: u?.avatarId ?? null,
        baiHienTaiId: conTroMap.get(h.id as string) ?? null,
        baiDaMoIds: moByHv.get(h.id as string) ?? [],
        soChoDuyet: choDuyetCount.get(h.id as string) ?? 0,
      };
    }),
  };
}

export async function setDongBoTienDoKhoa(input: {
  orgId: string;
  khoaId: string;
  dongBo: boolean;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createServiceRoleClient();
  const { data: khoa } = await admin
    .from("org_khoa_hoc")
    .select("id, id_to_chuc")
    .eq("id", input.khoaId)
    .maybeSingle();
  if (!khoa || khoa.id_to_chuc !== input.orgId) {
    return { ok: false, error: "Khóa không thuộc cơ sở." };
  }
  const { error } = await admin
    .from("org_khoa_hoc")
    .update({ dong_bo_tien_do: input.dongBo })
    .eq("id", input.khoaId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
