import "server-only";

import { createSign } from "node:crypto";

import { listFcmThietBiActive } from "@/lib/push/dang-ky";
import { danhDauMatHieuLuc } from "@/lib/push/don-dep";

export type PushPayload = {
  title: string;
  body: string;
  /** Deep link path hoặc URL app mở khi tap (vd /chat?phong=...). */
  deepLink?: string;
  data?: Record<string, string>;
};

export type GuiPushKetQua = {
  sent: number;
  failed: number;
  skipped: number;
  errors: string[];
};

type FcmCreds = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
};

function loadFcmCreds(): FcmCreds | null {
  const projectId =
    process.env.FCM_PROJECT_ID?.trim() ||
    process.env.FIREBASE_PROJECT_ID?.trim() ||
    "";
  const clientEmail = process.env.FCM_CLIENT_EMAIL?.trim() || "";
  let privateKey = process.env.FCM_PRIVATE_KEY?.trim() || "";

  const jsonRaw = process.env.FCM_SERVICE_ACCOUNT_JSON?.trim();
  if (jsonRaw) {
    try {
      const parsed = JSON.parse(jsonRaw) as {
        project_id?: string;
        client_email?: string;
        private_key?: string;
      };
      return {
        projectId: projectId || parsed.project_id?.trim() || "",
        clientEmail: clientEmail || parsed.client_email?.trim() || "",
        privateKey: privateKey || parsed.private_key?.trim() || "",
      };
    } catch {
      return null;
    }
  }

  if (!projectId || !clientEmail || !privateKey) return null;
  // .env thường escape \n
  privateKey = privateKey.replace(/\\n/g, "\n");
  return { projectId, clientEmail, privateKey };
}

function b64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

let cachedToken: { value: string; expMs: number } | null = null;

async function getAccessToken(creds: FcmCreds): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expMs > now + 60_000) {
    return cachedToken.value;
  }

  const iat = Math.floor(now / 1000);
  const exp = iat + 3600;
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(
    JSON.stringify({
      iss: creds.clientEmail,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat,
      exp,
    }),
  );
  const unsigned = `${header}.${claim}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const sig = b64url(signer.sign(creds.privateKey));
  const assertion = `${unsigned}.${sig}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const json = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
  };
  if (!res.ok || !json.access_token) {
    throw new Error(
      `FCM OAuth thất bại: ${json.error ?? res.status} — kiểm tra FCM_* env.`,
    );
  }
  const expiresIn = Number(json.expires_in ?? 3600);
  cachedToken = {
    value: json.access_token,
    expMs: now + expiresIn * 1000,
  };
  return json.access_token;
}

function isUnregisteredStatus(httpStatus: number, body: string): boolean {
  if (httpStatus === 404) return true;
  // FCM v1: UNREGISTERED / NOT_FOUND trong error details
  return /UNREGISTERED|NOT_FOUND|registration-token-not-registered/i.test(body);
}

/**
 * Gửi FCM HTTP v1 tới mọi thiết bị ios/android còn hiệu lực của user.
 * Web Push (endpoint+keys) — không gửi ở A1 (đã bỏ PWA).
 * Thiếu FCM_* → skipped (không throw) để web vẫn chạy khi chưa cấu hình.
 */
export async function guiPushToiUser(
  userId: string,
  payload: PushPayload,
): Promise<GuiPushKetQua> {
  const out: GuiPushKetQua = { sent: 0, failed: 0, skipped: 0, errors: [] };
  const creds = loadFcmCreds();
  if (!creds?.projectId || !creds.clientEmail || !creds.privateKey) {
    out.skipped = 1;
    out.errors.push(
      "Thiếu FCM_PROJECT_ID / FCM_CLIENT_EMAIL / FCM_PRIVATE_KEY (hoặc FCM_SERVICE_ACCOUNT_JSON).",
    );
    return out;
  }

  const devices = await listFcmThietBiActive(userId);
  if (devices.length === 0) {
    out.skipped = 1;
    return out;
  }

  let accessToken: string;
  try {
    accessToken = await getAccessToken(creds);
  } catch (e) {
    out.failed = devices.length;
    out.errors.push(e instanceof Error ? e.message : String(e));
    return out;
  }

  const url = `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(creds.projectId)}/messages:send`;

  for (const d of devices) {
    const token = d.token?.trim();
    if (!token) {
      out.skipped += 1;
      continue;
    }

    const data: Record<string, string> = {
      ...(payload.data ?? {}),
    };
    if (payload.deepLink) data.deepLink = payload.deepLink;

    const body = {
      message: {
        token,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data,
        android: {
          priority: "HIGH" as const,
        },
        apns: {
          headers: { "apns-priority": "10" },
          payload: {
            aps: { sound: "default" },
          },
        },
      },
    };

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      if (res.ok) {
        out.sent += 1;
        continue;
      }
      if (isUnregisteredStatus(res.status, text)) {
        await danhDauMatHieuLuc(d.id);
        out.skipped += 1;
        out.errors.push(`token chết → đánh dấu mất hiệu lực (${d.id})`);
        continue;
      }
      out.failed += 1;
      out.errors.push(`FCM ${res.status}: ${text.slice(0, 200)}`);
    } catch (e) {
      out.failed += 1;
      out.errors.push(e instanceof Error ? e.message : String(e));
    }
  }

  return out;
}
