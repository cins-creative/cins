import "server-only";

import type { MediaProviderId } from "@/lib/media/types";

/** Free tier Cloudflare Realtime SFU+TURN (GB egress / tháng). */
export const CF_REALTIME_FREE_GB = 1000;

export const MEDIA_ALERT_THRESHOLDS = [70, 85, 95] as const;

export function getActiveMediaProvider(): MediaProviderId {
  const raw = (process.env.MEDIA_PROVIDER ?? "cloudflare").trim().toLowerCase();
  if (raw === "livekit") return "livekit";
  return "cloudflare";
}

export function getCloudflareRealtimeKitConfig(): {
  accountId: string;
  appId: string;
  apiToken: string;
  presetStaff: string;
  presetStudent: string;
} | null {
  const accountId = (process.env.CLOUDFLARE_ACCOUNT_ID ?? "").trim();
  const appId = (process.env.CLOUDFLARE_REALTIMEKIT_APP_ID ?? "").trim();
  const apiToken = (
    process.env.CLOUDFLARE_REALTIMEKIT_API_TOKEN ??
    process.env.CLOUDFLARE_API_TOKEN ??
    ""
  ).trim();
  if (!accountId || !appId || !apiToken) return null;
  return {
    accountId,
    appId,
    apiToken,
    presetStaff: (
      process.env.CLOUDFLARE_REALTIMEKIT_PRESET_STAFF ?? "group_call_host"
    ).trim(),
    presetStudent: (
      process.env.CLOUDFLARE_REALTIMEKIT_PRESET_STUDENT ??
      "group_call_participant"
    ).trim(),
  };
}

export function isMediaConfigured(): boolean {
  const provider = getActiveMediaProvider();
  if (provider === "cloudflare") {
    return getCloudflareRealtimeKitConfig() != null;
  }
  // Phase B — LiveKit env (chưa bắt buộc Phase A).
  return Boolean(
    (process.env.LIVEKIT_URL ?? "").trim() &&
      (process.env.LIVEKIT_API_KEY ?? "").trim() &&
      (process.env.LIVEKIT_API_SECRET ?? "").trim(),
  );
}
