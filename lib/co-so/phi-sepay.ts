import "server-only";

import { tienPhaiTra } from "@/lib/co-so/phi-config";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { insertSocialThongBao } from "@/lib/social/thong-bao-insert";

export const CSDT_PHI_DA_TRA_LOAI = "csdt_phi_da_tra" as const;

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
 * Cộng `soTien` vào kỳ — dùng chung webhook Sepay + gán tay admin.
 * Trả `daTraKy` khi đủ tiền.
 */
export async function apDungSoTienVaoKy(
  kyId: string,
  soTien: number,
  opts?: { notify?: boolean },
): Promise<{ ok: true; daTraKy: boolean; orgId: string } | { ok: false; error: string }> {
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

  const daTraMoi = (Number(kyFresh.da_tra_vnd) || 0) + soTien;
  const phaiTra = tienPhaiTra(
    Number(kyFresh.phi_phai_tra_vnd) || 0,
    Number(kyFresh.dieu_chinh_vnd) || 0,
  );
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
      soTien,
      kyFresh.ma_tham_chieu,
    ).catch((e) => console.error("[csdt-phi] notify da_tra", e));
  }

  return { ok: true, daTraKy, orgId: kyFresh.id_to_chuc };
}

/**
 * Xử lý webhook Sepay — idempotent theo `sepay_id`.
 * Chỉ xử lý `transferType === "in"`.
 */
export async function xuLyWebhookSepay(
  payload: SepayWebhookPayload,
): Promise<XuLySepayResult | { ok: false; error: string }> {
  const sepayId = payload.id != null ? String(payload.id).trim() : "";
  if (!sepayId) {
    return { ok: false, error: "Thiếu id giao dịch Sepay." };
  }

  const transferType = (payload.transferType ?? "").toLowerCase();
  if (transferType && transferType !== "in") {
    /* Bỏ qua tiền ra — vẫn 200 để Sepay không retry */
    return {
      ok: true,
      matched: false,
      kyId: null,
      sepayId,
      duplicate: false,
    };
  }

  const soTien = Math.round(Number(payload.transferAmount) || 0);
  if (!Number.isFinite(soTien) || soTien <= 0) {
    return { ok: false, error: "transferAmount không hợp lệ." };
  }

  const admin = createServiceRoleClient();

  /* Idempotent */
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

  const noiDung = [payload.content, payload.code, payload.description]
    .filter(Boolean)
    .join(" ");
  const ma = parseMaThamChieuCsdt(payload.code, payload.content, payload.description);
  const nhanLuc = nhanLucFromSepay(payload.transactionDate);
  const tkMask = maskTk(payload.accountNumber);

  let kyId: string | null = null;
  let orgId: string | null = null;
  let daTraKy = false;

  if (ma) {
    const { data: ky } = await admin
      .from("org_phi_ky")
      .select(
        "id, id_to_chuc, phi_phai_tra_vnd, dieu_chinh_vnd, da_tra_vnd, trang_thai, ma_tham_chieu",
      )
      .eq("ma_tham_chieu", ma)
      .maybeSingle<{
        id: string;
        id_to_chuc: string;
        phi_phai_tra_vnd: number | string;
        dieu_chinh_vnd: number | string;
        da_tra_vnd: number | string;
        trang_thai: string;
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
    noi_dung: noiDung.slice(0, 1000) || null,
    tai_khoan_nguon: tkMask,
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
    return { ok: false, error: insErr.message };
  }

  if (kyId && orgId) {
    const applied = await apDungSoTienVaoKy(kyId, soTien);
    if (applied.ok) daTraKy = applied.daTraKy;
  }

  return {
    ok: true,
    matched: Boolean(kyId),
    kyId,
    daTraKy,
    sepayId,
    duplicate: false,
  };
}
