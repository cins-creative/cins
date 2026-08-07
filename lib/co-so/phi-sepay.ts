import "server-only";

import { tienPhaiTra } from "@/lib/co-so/phi-config";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { insertSocialThongBao } from "@/lib/social/thong-bao-insert";

export const CSDT_PHI_DA_TRA_LOAI = "csdt_phi_da_tra" as const;

/** @deprecated Dùng `getSoNgayAnHanTuKhai` từ `@/lib/billing/an-han`. */
export const CSDT_PHI_TU_KHAI_AN_HAN_NGAY = 3;

/** Mã CK: `CINS` + 6 hex org + 4 YYMM ≈ `CINS7F3A9C2604`. */
const MA_THAM_CHIEU_RE = /CINS[A-Z0-9]{10}/i;

export type SepayWebhookPayload = {
  id?: number | string;
  gateway?: string;
  transactionDate?: string;
  accountNumber?: string;
  content?: string;
  code?: string | null;
  transferType?: string;
  transferAmount?: number | string;
  description?: string;
  referenceCode?: string;
};

export type XuLySepayResult = {
  ok: true;
  duplicate?: boolean;
  matched: boolean;
  kyId: string | null;
  daTraKy?: boolean;
  sepayId: string;
  phanBo?: number;
};

type KyNoRow = {
  id: string;
  id_to_chuc: string;
  phi_phai_tra_vnd: number | string;
  dieu_chinh_vnd: number | string;
  da_tra_vnd: number | string;
  trang_thai: string;
  ma_tham_chieu: string;
  han_tra: string;
  hoa_don_thong_tin?: unknown;
};

function maskTk(raw: string | null | undefined): string | null {
  const s = (raw ?? "").replace(/\s+/g, "").trim();
  if (!s) return null;
  if (s.length <= 4) return `****${s}`;
  return `****${s.slice(-4)}`;
}

/** Parse mã tham chiếu từ nội dung CK / code Sepay. */
export function parseMaThamChieuCsdt(
  ...texts: Array<string | null | undefined>
): string | null {
  for (const t of texts) {
    if (!t) continue;
    const m = t.toUpperCase().match(MA_THAM_CHIEU_RE);
    if (m?.[0]) return m[0].toUpperCase();
  }
  return null;
}

/** `2024-07-02 11:08:33` (VN) → ISO. */
function nhanLucFromSepay(transactionDate: string | undefined): string {
  if (!transactionDate?.trim()) return new Date().toISOString();
  const raw = transactionDate.trim().replace(" ", "T");
  /* Gắn +07 nếu chưa có offset */
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(raw)) {
    const d = new Date(`${raw}+07:00`);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  const d = new Date(transactionDate);
  if (!Number.isNaN(d.getTime())) return d.toISOString();
  return new Date().toISOString();
}

export function readTuKhaiDaTraLuc(
  hoaDonThongTin: unknown,
): string | null {
  if (!hoaDonThongTin || typeof hoaDonThongTin !== "object") return null;
  const v = (hoaDonThongTin as Record<string, unknown>).tu_khai_da_tra_luc;
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

/** @deprecated Dùng `anHanConHieuLuc` / `anHanChoNguon` từ `@/lib/billing/an-han`. */
export function tuKhaiConHieuLuc(
  hoaDonThongTin: unknown,
  now = new Date(),
  soNgay = CSDT_PHI_TU_KHAI_AN_HAN_NGAY,
): boolean {
  const iso = readTuKhaiDaTraLuc(hoaDonThongTin);
  if (!iso) return false;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return false;
  const ms = Math.max(0, soNgay) * 86_400_000;
  return now.getTime() - t <= ms;
}

export async function notifyFoundersDaTra(
  orgId: string,
  kyId: string,
  soTien: number,
  ma: string,
): Promise<void> {
  const admin = createServiceRoleClient();
  const { data: founders } = await admin
    .from("user_thanh_vien_to_chuc")
    .select("id_nguoi_dung")
    .eq("id_to_chuc", orgId)
    .in("vai_tro", ["owner", "admin"]);

  const msg = `Đã nhận phí nền tảng ${soTien.toLocaleString("vi-VN")}₫ (mã ${ma}) — kỳ đã thanh toán, ghi danh mở lại nếu đang khóa.`;
  for (const row of (founders ?? []) as Array<{ id_nguoi_dung: string }>) {
    await insertSocialThongBao(admin, {
      nguoi_nhan: row.id_nguoi_dung,
      loai: "thong_tin",
      loai_doi_tuong: CSDT_PHI_DA_TRA_LOAI,
      id_doi_tuong: kyId,
      noi_dung: msg,
    });
  }
}

/**
 * Cộng `soTien` vào một kỳ — trả số còn dư sau khi kỳ đủ tiền.
 */
export async function apDungSoTienVaoKy(
  kyId: string,
  soTien: number,
  opts?: { notify?: boolean },
): Promise<
  | { ok: true; daTraKy: boolean; orgId: string; conLai: number }
  | { ok: false; error: string }
> {
  const admin = createServiceRoleClient();
  const { data: kyFresh, error } = await admin
    .from("org_phi_ky")
    .select(
      "id, id_to_chuc, phi_phai_tra_vnd, dieu_chinh_vnd, da_tra_vnd, trang_thai, ma_tham_chieu",
    )
    .eq("id", kyId)
    .maybeSingle<{
      id: string;
      id_to_chuc: string;
      phi_phai_tra_vnd: number | string;
      dieu_chinh_vnd: number | string;
      da_tra_vnd: number | string;
      trang_thai: string;
      ma_tham_chieu: string;
    }>();

  if (error || !kyFresh) {
    return { ok: false, error: error?.message ?? "Không tìm thấy kỳ." };
  }

  const phaiTra = tienPhaiTra(
    Number(kyFresh.phi_phai_tra_vnd) || 0,
    Number(kyFresh.dieu_chinh_vnd) || 0,
  );
  const daTraCu = Number(kyFresh.da_tra_vnd) || 0;
  const conNo = Math.max(0, phaiTra - daTraCu);
  if (conNo <= 0) {
    const daTraKy = phaiTra > 0 && daTraCu >= phaiTra;
    return {
      ok: true,
      daTraKy,
      orgId: kyFresh.id_to_chuc,
      conLai: soTien,
    };
  }
  const apDung = Math.min(soTien, conNo);
  const daTraMoi = daTraCu + apDung;
  const conLai = Math.max(0, soTien - apDung);

  const patch: Record<string, unknown> = {
    da_tra_vnd: daTraMoi,
    cap_nhat_luc: new Date().toISOString(),
  };
  let daTraKy = false;
  if (phaiTra > 0 && daTraMoi >= phaiTra) {
    patch.trang_thai = "da_tra";
    daTraKy = true;
  } else if (kyFresh.trang_thai === "qua_han" && daTraMoi < phaiTra) {
    patch.trang_thai = "qua_han";
  }

  const { error: upErr } = await admin
    .from("org_phi_ky")
    .update(patch)
    .eq("id", kyId);
  if (upErr) {
    return { ok: false, error: upErr.message };
  }

  if (daTraKy && opts?.notify !== false) {
    await notifyFoundersDaTra(
      kyFresh.id_to_chuc,
      kyId,
      apDung,
      kyFresh.ma_tham_chieu,
    ).catch((e) => console.error("[csdt-phi] notify da_tra", e));
  }

  return {
    ok: true,
    daTraKy,
    orgId: kyFresh.id_to_chuc,
    conLai,
  };
}

/**
 * P0 A4: phân bổ số tiền vào các kỳ nợ của org theo hạn trả gần nhất.
 * `uuTienKyId` (kỳ khớp mã CK) được trừ trước, phần dư sang kỳ khác.
 */
export async function phanBoSoTienVaoKyNo(
  orgId: string,
  soTien: number,
  opts?: { uuTienKyId?: string | null; notify?: boolean },
): Promise<{
  ok: true;
  daTraKyIds: string[];
  conLai: number;
  kyDauId: string | null;
}> {
  if (soTien <= 0) {
    return { ok: true, daTraKyIds: [], conLai: 0, kyDauId: null };
  }

  const admin = createServiceRoleClient();
  const { data: openKys } = await admin
    .from("org_phi_ky")
    .select(
      "id, id_to_chuc, phi_phai_tra_vnd, dieu_chinh_vnd, da_tra_vnd, trang_thai, ma_tham_chieu, han_tra",
    )
    .eq("id_to_chuc", orgId)
    .in("trang_thai", ["chua_tra", "qua_han"])
    .order("han_tra", { ascending: true });

  const rows = (openKys ?? []) as KyNoRow[];
  const ordered: KyNoRow[] = [];
  const uuTien = opts?.uuTienKyId?.trim() || null;
  if (uuTien) {
    const first = rows.find((r) => r.id === uuTien);
    if (first) ordered.push(first);
  }
  for (const r of rows) {
    if (r.id === uuTien) continue;
    ordered.push(r);
  }

  let conLai = soTien;
  const daTraKyIds: string[] = [];
  let kyDauId: string | null = null;

  for (const ky of ordered) {
    if (conLai <= 0) break;
    const applied = await apDungSoTienVaoKy(ky.id, conLai, {
      notify: opts?.notify,
    });
    if (!applied.ok) continue;
    if (!kyDauId) kyDauId = ky.id;
    if (applied.daTraKy) daTraKyIds.push(ky.id);
    conLai = applied.conLai;
  }

  /* Phần dư không còn kỳ nợ — cộng vào kỳ đã ưu tiên / kỳ cuối đã đụng
   * để không mất tiền (credit sẽ hiện da_tra_vnd > phai_tra; kỳ sau P2 mới tách). */
  if (conLai > 0 && kyDauId) {
    const admin2 = createServiceRoleClient();
    const { data: ky } = await admin2
      .from("org_phi_ky")
      .select("da_tra_vnd")
      .eq("id", kyDauId)
      .maybeSingle<{ da_tra_vnd: number | string }>();
    if (ky) {
      await admin2
        .from("org_phi_ky")
        .update({
          da_tra_vnd: (Number(ky.da_tra_vnd) || 0) + conLai,
          cap_nhat_luc: new Date().toISOString(),
        })
        .eq("id", kyDauId);
      conLai = 0;
    }
  }

  return { ok: true, daTraKyIds, conLai, kyDauId };
}

/**
 * Founder tự khai đã chuyển khoản → ghi `tu_khai_da_tra_luc` vào
 * `hoa_don_thong_tin` (không ALTER — P0) → gate tạm mở 3 ngày.
 */
export async function tuKhaiDaTraKy(input: {
  orgId: string;
  kyId: string;
  actorId: string;
  /** Hub đã enforce `tu_khai_lan` — dual-write không chặn lại. */
  boQuaGioiHanLan?: boolean;
}): Promise<{ ok: true; anHanDen: string } | { ok: false; error: string }> {
  const admin = createServiceRoleClient();
  const { data: ky, error } = await admin
    .from("org_phi_ky")
    .select("id, id_to_chuc, trang_thai, hoa_don_thong_tin")
    .eq("id", input.kyId)
    .eq("id_to_chuc", input.orgId)
    .maybeSingle<{
      id: string;
      id_to_chuc: string;
      trang_thai: string;
      hoa_don_thong_tin: unknown;
    }>();

  if (error || !ky) {
    return { ok: false, error: "Không tìm thấy kỳ." };
  }
  if (ky.trang_thai !== "chua_tra" && ky.trang_thai !== "qua_han") {
    return { ok: false, error: "Kỳ không còn nợ." };
  }

  if (!input.boQuaGioiHanLan && readTuKhaiDaTraLuc(ky.hoa_don_thong_tin)) {
    return {
      ok: false,
      error: "Đã hết lượt tự khai. Gửi khiếu nại để được hỗ trợ.",
    };
  }

  const now = new Date();
  const base =
    ky.hoa_don_thong_tin &&
    typeof ky.hoa_don_thong_tin === "object" &&
    !Array.isArray(ky.hoa_don_thong_tin)
      ? { ...(ky.hoa_don_thong_tin as Record<string, unknown>) }
      : {};
  base.tu_khai_da_tra_luc = now.toISOString();
  base.tu_khai_boi = input.actorId;

  const { error: upErr } = await admin
    .from("org_phi_ky")
    .update({
      hoa_don_thong_tin: base,
      cap_nhat_luc: now.toISOString(),
    })
    .eq("id", ky.id);

  if (upErr) return { ok: false, error: upErr.message };

  const { getSoNgayAnHanTuKhai, anHanDenIso } = await import(
    "@/lib/billing/an-han"
  );
  const soNgay = await getSoNgayAnHanTuKhai();
  return {
    ok: true,
    anHanDen:
      anHanDenIso(now.toISOString(), soNgay) ??
      new Date(now.getTime() + soNgay * 86_400_000).toISOString(),
  };
}

export type XuLySepayOutcome =
  | XuLySepayResult
  | { ok: true; skipped: string; sepayId?: string }
  | { ok: false; error: string; transient?: boolean };

/**
 * Xử lý webhook Sepay — log thô trước, khớp sau. Idempotent theo `sepay_id`.
 * Plan: docs/PLAN_sepay_cins.md §4.1
 */
export async function xuLyWebhookSepay(
  payload: SepayWebhookPayload | Record<string, unknown>,
): Promise<XuLySepayOutcome> {
  const {
    normalizeSepayPayload,
    nhanLucFromSepay: nhanLucIso,
    parseMaTrichXuat,
    insertSepayGiaoDich,
    capNhatSepayGiaoDich,
  } = await import("@/lib/billing/sepay-giao-dich");

  const raw =
    payload && typeof payload === "object"
      ? (payload as Record<string, unknown>)
      : {};
  const n = normalizeSepayPayload(raw);
  const sepayId = n.id;
  if (!sepayId) {
    return { ok: true, skipped: "thieu_sepay_id" };
  }

  const soTien = Math.round(n.transferAmount);
  const loaiChuyen: "in" | "out" =
    n.transferType === "out" || n.transferType === "debit" ? "out" : "in";
  const noiDung = [n.content, n.code, n.description]
    .filter(Boolean)
    .join(" ")
    .slice(0, 1000);
  const { ma, maHe } = parseMaTrichXuat(n.code, n.content, n.description);
  const nhanLuc = nhanLucIso(n.transactionDate);

  const log = await insertSepayGiaoDich({
    sepayId,
    gateway: n.gateway,
    soTaiKhoan: n.accountNumber,
    loaiChuyen,
    soTienVnd: Number.isFinite(soTien) && soTien > 0 ? soTien : 0,
    noiDung: noiDung || null,
    maTrichXuat: ma,
    maHe,
    rawWebhook: n.raw,
    nhanLuc,
    trangThaiXuLy: "cho",
  });

  if (!log.ok) {
    return {
      ok: false,
      error: log.error,
      transient: log.transient ?? true,
    };
  }

  if (log.duplicate) {
    return {
      ok: true,
      duplicate: true,
      matched: log.row.trangThaiXuLy === "da_khop",
      kyId: null,
      sepayId,
    };
  }

  const logId = log.row.id;

  if (loaiChuyen !== "in") {
    await capNhatSepayGiaoDich({
      id: logId,
      trangThaiXuLy: "bo_qua",
      ghiChuXuLy: "not_incoming",
    });
    return {
      ok: true,
      matched: false,
      kyId: null,
      sepayId,
      duplicate: false,
    };
  }

  if (!Number.isFinite(soTien) || soTien <= 0) {
    await capNhatSepayGiaoDich({
      id: logId,
      trangThaiXuLy: "bo_qua",
      ghiChuXuLy: "transfer_amount_invalid",
    });
    return { ok: true, skipped: "transfer_amount_invalid", sepayId };
  }

  if (maHe === "sineart") {
    await capNhatSepayGiaoDich({
      id: logId,
      trangThaiXuLy: "bo_qua",
      ghiChuXuLy: "sineart_ma",
    });
    return {
      ok: true,
      matched: false,
      kyId: null,
      sepayId,
      duplicate: false,
    };
  }

  /* B1 / V3: chỉ phân bổ khi tiền vào đúng STK thu phí CINs.
   * Cấu hình trống hoặc webhook thiếu accountNumber → fail-open (không tự khoá mình).
   * Lệch STK → giữ log, bo_qua — admin vẫn gan-giao-dich được. */
  if (maHe === "cins" && ma) {
    const { getCinsTaiChinh, hasStkNhanPhi } = await import(
      "@/lib/cins/tai-chinh-config"
    );
    const cfg = await getCinsTaiChinh();
    if (hasStkNhanPhi(cfg)) {
      const expected = (cfg.bank.soTk ?? "").replace(/\D/g, "");
      const actual = (n.accountNumber ?? "").replace(/\D/g, "");
      if (actual && expected && actual !== expected) {
        await capNhatSepayGiaoDich({
          id: logId,
          trangThaiXuLy: "bo_qua",
          ghiChuXuLy: "stk_khong_khop",
        });
        return {
          ok: true,
          matched: false,
          kyId: null,
          sepayId,
          duplicate: false,
        };
      }
    }
  }

  /* P2: ưu tiên cins_hoa_don + cins_thanh_toan */
  if (maHe === "cins" && ma) {
    try {
      const { ghiThanhToanSepayVaPhanBo } = await import(
        "@/lib/billing/phan-bo"
      );
      const billing = await ghiThanhToanSepayVaPhanBo({
        sepayId,
        soTienVnd: soTien,
        noiDung: noiDung || null,
        taiKhoanNguon: n.accountNumber,
        nhanLuc,
        maThamChieu: ma,
      });
      if (billing.duplicate) {
        await capNhatSepayGiaoDich({
          id: logId,
          trangThaiXuLy: billing.idThanhToan ? "da_khop" : "khong_khop",
          idThanhToan: billing.idThanhToan || null,
          ghiChuXuLy: "duplicate_thanh_toan",
        });
        return {
          ok: true,
          duplicate: true,
          matched: billing.matched,
          kyId: billing.hoaDonId,
          sepayId,
        };
      }
      if (billing.matched) {
        await capNhatSepayGiaoDich({
          id: logId,
          trangThaiXuLy: "da_khop",
          idThanhToan: billing.idThanhToan,
        });
        return {
          ok: true,
          matched: true,
          kyId: billing.hoaDonId,
          sepayId,
          daTraKy: true,
          phanBo: soTien,
        };
      }
      await capNhatSepayGiaoDich({
        id: logId,
        trangThaiXuLy: "khong_khop",
        idThanhToan: billing.idThanhToan || null,
        ghiChuXuLy: "hoa_don_not_found",
      });
    } catch (e) {
      console.error(
        "[sepay] billing path",
        e instanceof Error ? e.message : e,
      );
      await capNhatSepayGiaoDich({
        id: logId,
        trangThaiXuLy: "loi",
        ghiChuXuLy: "billing_path_error",
      });
    }
  } else {
    await capNhatSepayGiaoDich({
      id: logId,
      trangThaiXuLy: "khong_khop",
      ghiChuXuLy: "no_cins_ma",
    });
  }

  /* Legacy fallback org_phi_ky — chỉ khi chưa có bản ghi billing khớp */
  const admin = createServiceRoleClient();

  const { data: existing } = await admin
    .from("org_phi_thanh_toan")
    .select("id, id_ky")
    .eq("sepay_id", sepayId)
    .maybeSingle<{ id: string; id_ky: string | null }>();
  if (existing) {
    return {
      ok: true,
      duplicate: true,
      matched: Boolean(existing.id_ky),
      kyId: existing.id_ky,
      sepayId,
    };
  }

  let kyId: string | null = null;
  let orgId: string | null = null;
  const maLegacy = maHe === "cins" ? ma : null;

  if (maLegacy) {
    const { data: ky } = await admin
      .from("org_phi_ky")
      .select("id, id_to_chuc, ma_tham_chieu")
      .eq("ma_tham_chieu", maLegacy)
      .maybeSingle<{
        id: string;
        id_to_chuc: string;
        ma_tham_chieu: string;
      }>();

    if (ky) {
      kyId = ky.id;
      orgId = ky.id_to_chuc;
    }
  }

  const { error: insErr } = await admin.from("org_phi_thanh_toan").insert({
    id_ky: kyId,
    id_to_chuc: orgId,
    sepay_id: sepayId,
    so_tien_vnd: soTien,
    noi_dung: noiDung || null,
    tai_khoan_nguon: maskTk(n.accountNumber),
    nhan_luc: nhanLuc,
  });

  if (insErr) {
    if (insErr.code === "23505") {
      return {
        ok: true,
        duplicate: true,
        matched: Boolean(kyId),
        kyId,
        sepayId,
      };
    }
    console.error("[csdt-phi] sepay insert", insErr.message);
    return { ok: false, error: insErr.message, transient: true };
  }

  let daTraKy = false;
  let phanBo = 0;

  if (kyId && orgId) {
    const allocated = await phanBoSoTienVaoKyNo(orgId, soTien, {
      uuTienKyId: kyId,
    });
    daTraKy = allocated.daTraKyIds.length > 0;
    phanBo = allocated.daTraKyIds.length;
    if (allocated.kyDauId && allocated.kyDauId !== kyId) {
      await admin
        .from("org_phi_thanh_toan")
        .update({ id_ky: allocated.kyDauId })
        .eq("sepay_id", sepayId);
      kyId = allocated.kyDauId;
    }
    if (daTraKy) {
      await capNhatSepayGiaoDich({
        id: logId,
        trangThaiXuLy: "da_khop",
        ghiChuXuLy: "legacy_org_phi_ky",
      });
    }
  }

  return {
    ok: true,
    matched: Boolean(kyId),
    kyId,
    daTraKy,
    sepayId,
    duplicate: false,
    phanBo,
  };
}
