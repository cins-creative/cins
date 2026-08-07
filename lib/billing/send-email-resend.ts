import "server-only";

import { Resend } from "resend";

import { createServiceRoleClient } from "@/lib/supabase/service-role";

const DEFAULT_FROM = "CINs <noreply@cins.vn>";

function resendClient(): Resend | null {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return null;
  return new Resend(key);
}

export function resendFromAddress(): string {
  return process.env.RESEND_FROM?.trim() || DEFAULT_FROM;
}

/**
 * Địa chỉ nhận thông báo hoá đơn: email HĐ trên tk thanh toán →
 * email liên hệ profile → email Auth.
 */
export async function resolveEmailNhanHoaDon(
  userId: string,
): Promise<string | null> {
  const admin = createServiceRoleClient();

  const { data: tk } = await admin
    .from("cins_tk_thanh_toan")
    .select("email_hoa_don")
    .eq("id_nguoi_dung", userId)
    .maybeSingle<{ email_hoa_don: string | null }>();
  const hd = tk?.email_hoa_don?.trim();
  if (hd && hd.includes("@")) return hd;

  const { data: profile } = await admin
    .from("user_nguoi_dung")
    .select("email_lien_he, auth_user_id")
    .eq("id", userId)
    .maybeSingle<{
      email_lien_he: string | null;
      auth_user_id: string | null;
    }>();

  const lienHe = profile?.email_lien_he?.trim();
  if (lienHe && lienHe.includes("@")) return lienHe;

  const authId = profile?.auth_user_id?.trim();
  if (!authId) return null;

  const { data: authData, error } = await admin.auth.admin.getUserById(authId);
  if (error || !authData.user?.email) return null;
  const authEmail = authData.user.email.trim();
  return authEmail.includes("@") ? authEmail : null;
}

export type SendResendResult =
  | { ok: true; id: string | null }
  | { ok: false; error: string; skipped?: boolean };

/** Gửi email transactional qua Resend. Thiếu key → skipped. */
export async function sendResendEmail(input: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  /** Chống gửi trùng (Resend Idempotency-Key). */
  idempotencyKey?: string;
}): Promise<SendResendResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, error: "Thiếu RESEND_API_KEY", skipped: true };
  }

  const to = input.to.trim();
  if (!to.includes("@")) {
    return { ok: false, error: "Email người nhận không hợp lệ" };
  }

  /* REST + Idempotency-Key — SDK không luôn expose header ổn định. */
  if (input.idempotencyKey?.trim()) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": input.idempotencyKey.trim().slice(0, 256),
        },
        body: JSON.stringify({
          from: resendFromAddress(),
          to: [to],
          subject: input.subject,
          html: input.html,
          text: input.text,
        }),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        console.error("[billing] Resend REST", res.status, errText.slice(0, 200));
        return {
          ok: false,
          error: errText.trim().slice(0, 200) || `HTTP ${res.status}`,
        };
      }
      const json = (await res.json().catch(() => null)) as { id?: string } | null;
      return { ok: true, id: json?.id ?? null };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[billing] Resend network", msg);
      return { ok: false, error: msg };
    }
  }

  const client = resendClient();
  if (!client) {
    return { ok: false, error: "Thiếu RESEND_API_KEY", skipped: true };
  }

  const { data, error } = await client.emails.send({
    from: resendFromAddress(),
    to: [to],
    subject: input.subject,
    html: input.html,
    text: input.text,
  });

  if (error) {
    console.error("[billing] Resend", error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true, id: data?.id ?? null };
}
