import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { guiBienNhanThanhToan } from "@/lib/billing/bien-nhan";
import {
  getHoaDonByIdForPoll,
  trySyncHoaDonFromSepayLog,
} from "@/lib/billing/sepay-giao-dich";
import { canSuaTk } from "@/lib/billing/tk";
import {
  createServiceRoleClient,
  hasServiceRoleEnv,
} from "@/lib/supabase/service-role";

export const runtime = "nodejs";

/**
 * Rate limit in-memory theo instance + TTL eviction (Nhóm C).
 * Serverless: mỗi isolate một Map — client cũng hạ 10s và dừng sau MAX_MS.
 */
const lastPollAt = new Map<string, number>();
const POLL_MIN_MS = 8_000;
const POLL_ENTRY_TTL_MS = 15 * 60_000;
const POLL_EVICT_EVERY = 32;
let pollWriteCount = 0;

function touchPollRate(key: string, now: number): number {
  const prev = lastPollAt.get(key) ?? 0;
  lastPollAt.set(key, now);
  pollWriteCount += 1;
  if (pollWriteCount % POLL_EVICT_EVERY === 0) {
    const cutoff = now - POLL_ENTRY_TTL_MS;
    for (const [k, t] of lastPollAt) {
      if (t < cutoff) lastPollAt.delete(k);
    }
  }
  return prev;
}

type BienNhanJson =
  | { sent: true }
  | { sent: false; reason: string; hint?: string }
  | null;

async function snapshotThanhToan(idThanhToan: string | null): Promise<{
  idThanhToan: string | null;
  soTienVnd: number | null;
  conLaiVnd: number | null;
  nhanLucTt: string | null;
  kyDaTru: Array<{
    tenDichVu: string;
    soTienVnd: number;
    tuNgay: string;
    denNgay: string;
    maThamChieu: string | null;
    conNoSau: number;
  }>;
}> {
  const empty = {
    idThanhToan: null as string | null,
    soTienVnd: null as number | null,
    conLaiVnd: null as number | null,
    nhanLucTt: null as string | null,
    kyDaTru: [] as Array<{
      tenDichVu: string;
      soTienVnd: number;
      tuNgay: string;
      denNgay: string;
      maThamChieu: string | null;
      conNoSau: number;
    }>,
  };
  if (!idThanhToan) return empty;

  const admin = createServiceRoleClient();
  const { data: tt } = await admin
    .from("cins_thanh_toan")
    .select("id, so_tien_vnd, con_lai_vnd, nhan_luc")
    .eq("id", idThanhToan)
    .maybeSingle<{
      id: string;
      so_tien_vnd: number | string;
      con_lai_vnd: number | string;
      nhan_luc: string;
    }>();
  if (!tt) return { ...empty, idThanhToan };

  const { data: pbRows } = await admin
    .from("cins_phan_bo")
    .select("so_tien_vnd, id_hoa_don")
    .eq("id_thanh_toan", idThanhToan);

  const phanBo = (pbRows ?? []) as Array<{
    so_tien_vnd: number | string;
    id_hoa_don: string;
  }>;
  const hdIds = [...new Set(phanBo.map((p) => p.id_hoa_don))];
  const kyDaTru: typeof empty.kyDaTru = [];

  if (hdIds.length) {
    const { data: hdRows } = await admin
      .from("cins_hoa_don")
      .select(
        "id, id_dich_vu, tu_ngay, den_ngay, ma_tham_chieu, so_tien_vnd, dieu_chinh_vnd, da_tra_vnd, trang_thai",
      )
      .in("id", hdIds);

    type Hd = {
      id: string;
      id_dich_vu: string;
      tu_ngay: string;
      den_ngay: string;
      ma_tham_chieu: string | null;
      so_tien_vnd: number | string;
      dieu_chinh_vnd: number | string;
      da_tra_vnd: number | string;
      trang_thai: string;
    };
    const hdMap = new Map(((hdRows ?? []) as Hd[]).map((h) => [h.id, h]));
    const dvIds = [
      ...new Set([...hdMap.values()].map((h) => h.id_dich_vu).filter(Boolean)),
    ];
    const { data: dvRows } = await admin
      .from("cins_dich_vu")
      .select("id, loai, tham_chieu_id")
      .in("id", dvIds.length ? dvIds : ["00000000-0000-0000-0000-000000000000"]);
    type Dv = { id: string; loai: string; tham_chieu_id: string };
    const dvMap = new Map(((dvRows ?? []) as Dv[]).map((d) => [d.id, d]));

    const shopIds = [...dvMap.values()]
      .filter((d) => d.loai === "shop_phi")
      .map((d) => d.tham_chieu_id);
    const orgIds = [...dvMap.values()]
      .filter((d) => d.loai === "csdt_phi")
      .map((d) => d.tham_chieu_id);
    const tenMap = new Map<string, string>();
    if (shopIds.length) {
      const { data } = await admin
        .from("shop_cua_hang")
        .select("id_nguoi_dung, ten")
        .in("id_nguoi_dung", shopIds);
      for (const r of (data ?? []) as Array<{
        id_nguoi_dung: string;
        ten: string | null;
      }>) {
        tenMap.set(`shop:${r.id_nguoi_dung}`, r.ten?.trim() || "Shop");
      }
    }
    if (orgIds.length) {
      const { data } = await admin
        .from("org_to_chuc")
        .select("id, ten")
        .in("id", orgIds);
      for (const r of (data ?? []) as Array<{
        id: string;
        ten: string | null;
      }>) {
        tenMap.set(`org:${r.id}`, r.ten?.trim() || "Cơ sở");
      }
    }

    for (const p of phanBo) {
      const hd = hdMap.get(p.id_hoa_don);
      if (!hd) continue;
      const dv = dvMap.get(hd.id_dich_vu);
      let ten = "Dịch vụ";
      if (dv?.loai === "shop_phi") {
        ten = tenMap.get(`shop:${dv.tham_chieu_id}`) || "Shop";
      } else if (dv?.loai === "csdt_phi") {
        ten = tenMap.get(`org:${dv.tham_chieu_id}`) || "Cơ sở";
      } else if (dv?.loai === "ads") {
        ten = "Ads";
      }
      const phai =
        Math.max(0, Math.round(Number(hd.so_tien_vnd) || 0)) +
        Math.round(Number(hd.dieu_chinh_vnd) || 0);
      const daTra = Math.max(0, Math.round(Number(hd.da_tra_vnd) || 0));
      const conNoSau =
        hd.trang_thai === "da_tra" || hd.trang_thai === "mien"
          ? 0
          : Math.max(0, phai - daTra);
      kyDaTru.push({
        tenDichVu: ten,
        soTienVnd: Math.max(0, Math.round(Number(p.so_tien_vnd) || 0)),
        tuNgay: hd.tu_ngay,
        denNgay: hd.den_ngay,
        maThamChieu: hd.ma_tham_chieu,
        conNoSau,
      });
    }
  }

  return {
    idThanhToan: tt.id,
    soTienVnd: Math.max(0, Math.round(Number(tt.so_tien_vnd) || 0)),
    conLaiVnd: Math.max(0, Math.round(Number(tt.con_lai_vnd) || 0)),
    nhanLucTt: tt.nhan_luc,
    kyDaTru,
  };
}

/**
 * POST /api/tai-khoan/thanh-toan/poll
 * Body: { hoaDonId }
 * Đối soát lại từ cins_sepay_giao_dich khi webhook đã ghi / vừa khớp.
 */
export async function POST(request: Request) {
  if (!hasServiceRoleEnv()) {
    return NextResponse.json({ error: "Thiếu service role." }, { status: 503 });
  }
  const session = await getCurrentSessionAndProfile();
  const actorId = session?.profile?.id;
  if (!actorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON không hợp lệ." }, { status: 400 });
  }

  const hoaDonId =
    typeof body.hoaDonId === "string" ? body.hoaDonId.trim() : "";
  if (!hoaDonId) {
    return NextResponse.json({ error: "Thiếu hoaDonId." }, { status: 400 });
  }

  const rateKey = `${actorId}:${hoaDonId}`;
  const now = Date.now();
  const prev = touchPollRate(rateKey, now);
  if (now - prev < POLL_MIN_MS) {
    /* Rate-limited: không ghi đè timestamp — trả snapshot, không sync Sepay. */
    lastPollAt.set(rateKey, prev);
    const hdFast = await getHoaDonByIdForPoll(hoaDonId);
    if (!hdFast) {
      return NextResponse.json({ error: "Không tìm thấy hoá đơn." }, { status: 404 });
    }
    if (!(await canSuaTk(hdFast.idTk, actorId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({
      ok: true,
      trangThai: hdFast.trangThai,
      daTraVnd: hdFast.daTraVnd,
      conNoVnd: hdFast.conNoVnd,
      nhanLuc: null,
      rateLimited: true,
      bienNhan: null as BienNhanJson,
      idThanhToan: null,
      soTienVnd: null,
      conLaiVnd: null,
      kyDaTru: [],
    });
  }

  const hd = await getHoaDonByIdForPoll(hoaDonId);
  if (!hd) {
    return NextResponse.json({ error: "Không tìm thấy hoá đơn." }, { status: 404 });
  }
  if (!(await canSuaTk(hd.idTk, actorId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let nhanLuc: string | null = null;
  let idThanhToan: string | null = null;
  let bienNhan: BienNhanJson = null;

  if (hd.conNoVnd > 0 && hd.maThamChieu) {
    const synced = await trySyncHoaDonFromSepayLog({
      hoaDonId: hd.id,
      maThamChieu: hd.maThamChieu,
    });
    if (synced.synced) {
      nhanLuc = new Date().toISOString();
      idThanhToan = synced.idThanhToan;
      if (synced.idThanhToan) {
        try {
          const r = await guiBienNhanThanhToan(synced.idThanhToan);
          bienNhan = r.sent
            ? { sent: true }
            : { sent: false, reason: r.reason, hint: r.hint };
        } catch (e) {
          bienNhan = {
            sent: false,
            reason: "resend_api",
            hint: e instanceof Error ? e.message : String(e),
          };
        }
      }
    }
  }

  const after = await getHoaDonByIdForPoll(hd.id);
  if (!after) {
    return NextResponse.json({ error: "Không tìm thấy hoá đơn." }, { status: 404 });
  }

  if (after.conNoVnd <= 0 && !idThanhToan && after.maThamChieu) {
    const synced = await trySyncHoaDonFromSepayLog({
      hoaDonId: after.id,
      maThamChieu: after.maThamChieu,
    });
    if (synced.idThanhToan) {
      idThanhToan = synced.idThanhToan;
      if (!bienNhan) {
        try {
          const r = await guiBienNhanThanhToan(synced.idThanhToan);
          bienNhan = r.sent
            ? { sent: true }
            : { sent: false, reason: r.reason, hint: r.hint };
        } catch {
          /* ignore */
        }
      }
    }
  }

  const snap = await snapshotThanhToan(idThanhToan);

  return NextResponse.json({
    ok: true,
    trangThai: after.trangThai,
    daTraVnd: after.daTraVnd,
    conNoVnd: after.conNoVnd,
    nhanLuc: snap.nhanLucTt ?? nhanLuc,
    bienNhan,
    idThanhToan: snap.idThanhToan,
    soTienVnd: snap.soTienVnd,
    conLaiVnd: snap.conLaiVnd,
    kyDaTru: snap.kyDaTru,
  });
}
