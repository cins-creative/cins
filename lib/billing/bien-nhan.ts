import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";

import {
  resolveEmailNhanHoaDon,
  sendResendEmail,
} from "./send-email-resend";

export type BienNhanKetQua =
  | { sent: true }
  | { sent: false; reason: string; hint?: string };

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtVnd(n: number): string {
  return new Intl.NumberFormat("vi-VN").format(Math.max(0, Math.round(n))) + "₫";
}

function fmtYmd(ymd: string | null | undefined): string {
  if (!ymd) return "—";
  const [y, m, d] = String(ymd).slice(0, 10).split("-");
  if (!y || !m || !d) return String(ymd);
  return `${d}/${m}/${y}`;
}

function fmtIsoVn(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return iso;
  return d.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
}

type PhanBoDong = {
  soTienVnd: number;
  tenDichVu: string;
  loai: string;
  tuNgay: string;
  denNgay: string;
  maThamChieu: string | null;
  conNoSau: number;
};

/**
 * Gửi email biên nhận sau khi Sepay phân bổ vào hoá đơn.
 * Neo `cins_thanh_toan.id` (một CK có thể trừ nhiều kỳ).
 * Idempotent qua Resend Idempotency-Key — gọi lại an toàn.
 *
 * Không gửi khi: chưa khớp mã / chưa phân bổ / thiếu email / thiếu RESEND_API_KEY.
 */
export async function guiBienNhanThanhToan(
  idThanhToan: string,
): Promise<BienNhanKetQua> {
  const ttId = idThanhToan?.trim();
  if (!ttId) return { sent: false, reason: "no_id" };

  const admin = createServiceRoleClient();

  const { data: tt, error: ttErr } = await admin
    .from("cins_thanh_toan")
    .select(
      "id, id_tk, so_tien_vnd, con_lai_vnd, nhan_luc, nguon, tai_khoan_nguon",
    )
    .eq("id", ttId)
    .maybeSingle<{
      id: string;
      id_tk: string | null;
      so_tien_vnd: number | string;
      con_lai_vnd: number | string;
      nhan_luc: string;
      nguon: string;
      tai_khoan_nguon: string | null;
    }>();

  if (ttErr || !tt) {
    return { sent: false, reason: "tt_read", hint: ttErr?.message };
  }
  if (!tt.id_tk) {
    /* matched:false — không biết chủ, chỉ hiện admin */
    return { sent: false, reason: "unmatched" };
  }

  const soTien = Math.max(0, Math.round(Number(tt.so_tien_vnd) || 0));
  const conLai = Math.max(0, Math.round(Number(tt.con_lai_vnd) || 0));

  const { data: pbRows, error: pbErr } = await admin
    .from("cins_phan_bo")
    .select("so_tien_vnd, id_hoa_don")
    .eq("id_thanh_toan", ttId);

  if (pbErr) {
    return { sent: false, reason: "pb_read", hint: pbErr.message };
  }
  const phanBo = (pbRows ?? []) as Array<{
    so_tien_vnd: number | string;
    id_hoa_don: string;
  }>;
  if (phanBo.length === 0) {
    return { sent: false, reason: "no_phan_bo" };
  }

  const hdIds = [...new Set(phanBo.map((p) => p.id_hoa_don))];
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
  const hdMap = new Map((hdRows as Hd[] | null)?.map((h) => [h.id, h]) ?? []);

  const dvIds = [
    ...new Set(
      [...hdMap.values()].map((h) => h.id_dich_vu).filter(Boolean),
    ),
  ];
  const { data: dvRows } = await admin
    .from("cins_dich_vu")
    .select("id, loai, tham_chieu_id")
    .in("id", dvIds.length ? dvIds : ["00000000-0000-0000-0000-000000000000"]);

  type Dv = { id: string; loai: string; tham_chieu_id: string };
  const dvMap = new Map(
    ((dvRows ?? []) as Dv[]).map((d) => [d.id, d]),
  );

  /* Tên hiển thị: shop / org */
  const shopOwnerIds = [...dvMap.values()]
    .filter((d) => d.loai === "shop_phi")
    .map((d) => d.tham_chieu_id);
  const orgIds = [...dvMap.values()]
    .filter((d) => d.loai === "csdt_phi")
    .map((d) => d.tham_chieu_id);

  const shopTen = new Map<string, string>();
  if (shopOwnerIds.length) {
    const { data } = await admin
      .from("shop_cua_hang")
      .select("id_nguoi_dung, ten")
      .in("id_nguoi_dung", shopOwnerIds);
    for (const r of (data ?? []) as Array<{
      id_nguoi_dung: string;
      ten: string | null;
    }>) {
      shopTen.set(r.id_nguoi_dung, r.ten?.trim() || "Shop");
    }
  }
  const orgTen = new Map<string, string>();
  if (orgIds.length) {
    const { data } = await admin
      .from("org_to_chuc")
      .select("id, ten")
      .in("id", orgIds);
    for (const r of (data ?? []) as Array<{
      id: string;
      ten: string | null;
    }>) {
      orgTen.set(r.id, r.ten?.trim() || "Cơ sở");
    }
  }

  const dong: PhanBoDong[] = [];
  for (const p of phanBo) {
    const hd = hdMap.get(p.id_hoa_don);
    if (!hd) continue;
    const dv = dvMap.get(hd.id_dich_vu);
    let ten = "Dịch vụ";
    if (dv?.loai === "shop_phi") {
      ten = shopTen.get(dv.tham_chieu_id) || "Shop";
    } else if (dv?.loai === "csdt_phi") {
      ten = orgTen.get(dv.tham_chieu_id) || "Cơ sở";
    } else if (dv?.loai === "ads") {
      ten = "Ads";
    }
    const phai = Math.max(
      0,
      Math.round(Number(hd.so_tien_vnd) || 0) +
        Math.round(Number(hd.dieu_chinh_vnd) || 0),
    );
    const daTra = Math.max(0, Math.round(Number(hd.da_tra_vnd) || 0));
    const conNoSau =
      hd.trang_thai === "da_tra" || hd.trang_thai === "mien"
        ? 0
        : Math.max(0, phai - daTra);

    dong.push({
      soTienVnd: Math.max(0, Math.round(Number(p.so_tien_vnd) || 0)),
      tenDichVu: ten,
      loai: dv?.loai ?? "—",
      tuNgay: hd.tu_ngay,
      denNgay: hd.den_ngay,
      maThamChieu: hd.ma_tham_chieu,
      conNoSau,
    });
  }

  if (dong.length === 0) {
    return { sent: false, reason: "no_phan_bo" };
  }

  const { data: tk } = await admin
    .from("cins_tk_thanh_toan")
    .select("id_nguoi_dung")
    .eq("id", tt.id_tk)
    .maybeSingle<{ id_nguoi_dung: string }>();
  if (!tk?.id_nguoi_dung) {
    return { sent: false, reason: "tk_read" };
  }

  const to = await resolveEmailNhanHoaDon(tk.id_nguoi_dung);
  if (!to) {
    return { sent: false, reason: "bad_email" };
  }

  const daTru = dong.reduce((s, d) => s + d.soTienVnd, 0);
  const tongConNo = dong.reduce((s, d) => s + d.conNoSau, 0);
  const site =
    process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") ||
    "https://cins.vn";
  const payUrl = `${site}/tai-khoan/thanh-toan`;

  const rowsHtml = dong
    .map(
      (d) => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:14px;color:#0f172a;">${escapeHtml(d.tenDichVu)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#64748b;white-space:nowrap;">${escapeHtml(fmtYmd(d.tuNgay))} – ${escapeHtml(fmtYmd(d.denNgay))}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#64748b;font-family:ui-monospace,monospace;">${escapeHtml(d.maThamChieu || "—")}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:14px;font-weight:700;text-align:right;color:#0f172a;white-space:nowrap;">${escapeHtml(fmtVnd(d.soTienVnd))}</td>
    </tr>`,
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="vi">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Biên nhận thanh toán — CINs</title></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:28px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
        <tr>
          <td style="background:#1f74c9;padding:22px 28px;">
            <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:rgba(255,255,255,0.85);">CINs</p>
            <h1 style="margin:6px 0 0;font-size:22px;font-weight:800;color:#fff;">Đã nhận thanh toán</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 28px 8px;">
            <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#0f172a;">
              Xin chào,<br />
              CINs đã nhận chuyển khoản phí nền tảng của bạn. Đây là <strong>biên nhận xác nhận</strong> — không phải hoá đơn VAT.
            </p>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:18px;">
              <tr><td style="padding:12px 16px;background:#f1f5f9;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;color:#64748b;">Thông tin giao dịch</td></tr>
              <tr><td style="padding:14px 16px;">
                <table role="presentation" width="100%" style="font-size:14px;color:#0f172a;">
                  <tr><td style="padding:5px 0;color:#64748b;">Số tiền nhận</td><td style="padding:5px 0;font-weight:800;text-align:right;">${escapeHtml(fmtVnd(soTien))}</td></tr>
                  <tr><td style="padding:5px 0;color:#64748b;">Đã trừ vào kỳ</td><td style="padding:5px 0;font-weight:700;text-align:right;">${escapeHtml(fmtVnd(daTru))}</td></tr>
                  ${conLai > 0 ? `<tr><td style="padding:5px 0;color:#64748b;">Số dư giữ lại</td><td style="padding:5px 0;font-weight:700;text-align:right;color:#15803d;">${escapeHtml(fmtVnd(conLai))}</td></tr>` : ""}
                  <tr><td style="padding:5px 0;color:#64748b;">Còn nợ sau trừ</td><td style="padding:5px 0;font-weight:700;text-align:right;">${escapeHtml(fmtVnd(tongConNo))}</td></tr>
                  <tr><td style="padding:5px 0;color:#64748b;">Thời điểm</td><td style="padding:5px 0;text-align:right;">${escapeHtml(fmtIsoVn(tt.nhan_luc))}</td></tr>
                  ${tt.tai_khoan_nguon ? `<tr><td style="padding:5px 0;color:#64748b;">TK nguồn</td><td style="padding:5px 0;text-align:right;font-family:ui-monospace,monospace;">${escapeHtml(tt.tai_khoan_nguon)}</td></tr>` : ""}
                </table>
              </td></tr>
            </table>
            <p style="margin:0 0 8px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;color:#64748b;">Các kỳ đã trừ</p>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
              <thead>
                <tr style="background:#f8fafc;">
                  <th align="left" style="padding:8px 12px;font-size:11px;color:#64748b;">Dịch vụ</th>
                  <th align="left" style="padding:8px 12px;font-size:11px;color:#64748b;">Kỳ</th>
                  <th align="left" style="padding:8px 12px;font-size:11px;color:#64748b;">Mã CK</th>
                  <th align="right" style="padding:8px 12px;font-size:11px;color:#64748b;">Đã trừ</th>
                </tr>
              </thead>
              <tbody>${rowsHtml}</tbody>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 28px 24px;">
            <p style="margin:16px 0 0;text-align:center;">
              <a href="${escapeHtml(payUrl)}" style="display:inline-block;padding:12px 24px;background:#1f74c9;color:#fff !important;font-size:14px;font-weight:700;text-decoration:none;border-radius:10px;">Mở trang thanh toán</a>
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
            <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.5;">
              CINs · Biên nhận xác nhận — không phải hoá đơn VAT.<br />
              Email tự động, vui lòng không trả lời thư này.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = [
    `CINs đã nhận ${fmtVnd(soTien)}.`,
    `Đã trừ vào ${dong.length} kỳ: ${fmtVnd(daTru)}.`,
    conLai > 0 ? `Số dư giữ lại: ${fmtVnd(conLai)}.` : null,
    `Còn nợ sau trừ: ${fmtVnd(tongConNo)}.`,
    `Xem: ${payUrl}`,
  ]
    .filter(Boolean)
    .join("\n");

  const sent = await sendResendEmail({
    to,
    subject: `[CINs] Đã nhận thanh toán — ${fmtVnd(soTien)}`,
    html,
    text,
    idempotencyKey: `cins-bien-nhan-${ttId}`,
  });

  if (sent.ok) return { sent: true };
  if (sent.skipped) {
    return { sent: false, reason: "no_resend_key", hint: sent.error };
  }
  return { sent: false, reason: "resend_api", hint: sent.error };
}

/**
 * Fire-and-forget — không được làm webhook/poll fail.
 */
export function voidGuiBienNhanThanhToan(idThanhToan: string): void {
  void guiBienNhanThanhToan(idThanhToan)
    .then((r) => {
      if (r.sent) {
        console.info("[billing] bien-nhan sent", { idThanhToan });
      } else if (r.reason !== "unmatched" && r.reason !== "no_phan_bo") {
        console.info("[billing] bien-nhan skipped", {
          idThanhToan,
          reason: r.reason,
          hint: r.hint,
        });
      }
    })
    .catch((e) => {
      console.error(
        "[billing] bien-nhan",
        idThanhToan,
        e instanceof Error ? e.message : e,
      );
    });
}
