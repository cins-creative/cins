import "server-only";

import { openSelfRoom, sendRoomMessage } from "@/lib/chat/direct-message";
import { getBillingJourneyPin } from "@/lib/billing/journey-ghim";
import {
  resolveEmailNhanHoaDon,
  sendResendEmail,
} from "@/lib/billing/send-email-resend";

export type NotifyHoaDonKetQua = {
  email: "ok" | "failed" | "skipped";
  journeyGhim: "ok" | "skipped";
  chatHeThong: "ok" | "failed" | "skipped";
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Kênh thông báo hoá đơn mới (P2 §5.6).
 *
 * - Social noti: caller gửi riêng.
 * - Chat hệ thống: tin `system` vào phòng «Gửi riêng cho tôi».
 * - Email: Resend (`RESEND_API_KEY`).
 * - Journey ghim: live debt pin (chỉ owner thấy trên Journey) — không ghi bảng riêng.
 */
export async function notifyHoaDonMoi(input: {
  userId: string;
  soTienVnd: number;
  hanTra: string;
  maThamChieu: string | null;
  loai: "csdt_phi" | "shop_phi";
  kyLabel: string;
}): Promise<NotifyHoaDonKetQua> {
  const site =
    process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") ||
    "https://cins.vn";
  const payUrl = `${site}/tai-khoan/thanh-toan`;
  const loaiNhan =
    input.loai === "shop_phi" ? "phí shop" : "phí cơ sở đào tạo";
  const so = input.soTienVnd.toLocaleString("vi-VN");
  const ma = input.maThamChieu?.trim();
  const lines = [
    `Hoá đơn ${loaiNhan} kỳ ${input.kyLabel}: ${so} VND.`,
    `Hạn trả: ${input.hanTra}.`,
    ma ? `Mã CK: ${ma}.` : null,
    `Thanh toán: ${payUrl}`,
  ].filter(Boolean) as string[];
  const body = lines.join(" ");

  let chatHeThong: NotifyHoaDonKetQua["chatHeThong"] = "skipped";
  try {
    const opened = await openSelfRoom(input.userId);
    if (!opened.ok || !opened.thread.roomId) {
      console.error("[billing] notifyHoaDonMoi self-room", opened);
      chatHeThong = "failed";
    } else {
      const sent = await sendRoomMessage(opened.thread.roomId, input.userId, {
        body,
        loaiTin: "system",
      });
      chatHeThong = sent.ok ? "ok" : "failed";
      if (!sent.ok) {
        console.error("[billing] notifyHoaDonMoi chat", sent.error);
      }
    }
  } catch (e) {
    chatHeThong = "failed";
    console.error(
      "[billing] notifyHoaDonMoi chat",
      e instanceof Error ? e.message : e,
    );
  }

  let email: NotifyHoaDonKetQua["email"] = "skipped";
  try {
    const to = await resolveEmailNhanHoaDon(input.userId);
    if (!to) {
      email = "skipped";
      console.info("[billing] notifyHoaDonMoi email skipped — không có địa chỉ");
    } else {
      const subject = `CINs — Hoá đơn ${loaiNhan} kỳ ${input.kyLabel}`;
      const html = `
        <div style="font-family:system-ui,sans-serif;line-height:1.5;color:#111">
          <p>Xin chào,</p>
          <p>Bạn có hoá đơn <strong>${escapeHtml(loaiNhan)}</strong> kỳ <strong>${escapeHtml(input.kyLabel)}</strong>.</p>
          <ul>
            <li>Số tiền: <strong>${escapeHtml(so)} VND</strong></li>
            <li>Hạn trả: <strong>${escapeHtml(input.hanTra)}</strong></li>
            ${ma ? `<li>Mã chuyển khoản: <strong>${escapeHtml(ma)}</strong></li>` : ""}
          </ul>
          <p><a href="${escapeHtml(payUrl)}">Mở trang thanh toán CINs</a></p>
          <p style="color:#666;font-size:13px">Email tự động từ CINs — không trả lời thư này.</p>
        </div>
      `.trim();
      const sent = await sendResendEmail({
        to,
        subject,
        html,
        text: body,
      });
      if (sent.ok) {
        email = "ok";
      } else if (sent.skipped) {
        email = "skipped";
      } else {
        email = "failed";
      }
    }
  } catch (e) {
    email = "failed";
    console.error(
      "[billing] notifyHoaDonMoi email",
      e instanceof Error ? e.message : e,
    );
  }

  let journeyGhim: NotifyHoaDonKetQua["journeyGhim"] = "skipped";
  try {
    const pin = await getBillingJourneyPin(input.userId);
    journeyGhim = pin ? "ok" : "skipped";
  } catch (e) {
    console.error(
      "[billing] notifyHoaDonMoi journeyGhim",
      e instanceof Error ? e.message : e,
    );
  }

  console.info("[billing] notifyHoaDonMoi", {
    userId: input.userId,
    loai: input.loai,
    soTienVnd: input.soTienVnd,
    hanTra: input.hanTra,
    ma: input.maThamChieu,
    ky: input.kyLabel,
    chatHeThong,
    email,
    journeyGhim,
  });

  try {
    const { firePushHoaDon } = await import("@/lib/push/su-kien");
    firePushHoaDon({
      userId: input.userId,
      title: `Hoá đơn ${loaiNhan}`,
      body: `Kỳ ${input.kyLabel}: ${so} VND · hạn ${input.hanTra}`,
    });
  } catch (e) {
    console.error(
      "[billing] notifyHoaDonMoi push",
      e instanceof Error ? e.message : e,
    );
  }

  return {
    email,
    journeyGhim,
    chatHeThong,
  };
}
