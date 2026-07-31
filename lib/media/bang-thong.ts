import "server-only";

import {
  CF_REALTIME_FREE_GB,
  getActiveMediaProvider,
  MEDIA_ALERT_THRESHOLDS,
} from "@/lib/media/config";
import type { MediaBangThongSnapshot } from "@/lib/media/types";

function monthBoundsUtc(d = new Date()): { from: string; to: string; ky: string } {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const from = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
  const to = new Date(Date.UTC(y, m + 1, 0)).toISOString().slice(0, 10);
  const ky = `${y}-${String(m + 1).padStart(2, "0")}`;
  return { from, to, ky };
}

function alertLevel(percent: number): 70 | 85 | 95 | null {
  if (percent >= 95) return 95;
  if (percent >= 85) return 85;
  if (percent >= 70) return 70;
  return null;
}

/**
 * Egress Realtime (TURN analytics GraphQL — proxy chỉ số gần free tier).
 * Cần token có quyền Account Analytics.
 * Manual override: MEDIA_EGRESS_USED_GB (số) khi GraphQL chưa có.
 */
export async function fetchMediaBangThong(): Promise<MediaBangThongSnapshot> {
  const provider = getActiveMediaProvider();
  const { from, to, ky } = monthBoundsUtc();
  const freeGb = CF_REALTIME_FREE_GB;
  const fetchedAt = new Date().toISOString();

  const manualRaw = (process.env.MEDIA_EGRESS_USED_GB ?? "").trim();
  if (manualRaw !== "" && Number.isFinite(Number(manualRaw))) {
    const usedGb = Math.max(0, Number(manualRaw));
    const percent = freeGb > 0 ? (usedGb / freeGb) * 100 : 0;
    return {
      provider,
      ky,
      freeGb,
      usedGb,
      percent,
      alertLevel: alertLevel(percent),
      source: "manual",
      note: "Đang dùng MEDIA_EGRESS_USED_GB (nhập tay / sync ops).",
      fetchedAt,
    };
  }

  const accountId = (process.env.CLOUDFLARE_ACCOUNT_ID ?? "").trim();
  const apiToken = (
    process.env.CLOUDFLARE_ANALYTICS_API_TOKEN ??
    process.env.CLOUDFLARE_REALTIMEKIT_API_TOKEN ??
    process.env.CLOUDFLARE_API_TOKEN ??
    ""
  ).trim();

  if (!accountId || !apiToken) {
    return {
      provider,
      ky,
      freeGb,
      usedGb: 0,
      percent: 0,
      alertLevel: null,
      source: "unavailable",
      note: "Thiếu CLOUDFLARE_ACCOUNT_ID hoặc token analytics — đặt MEDIA_EGRESS_USED_GB tạm thời.",
      fetchedAt,
    };
  }

  const query = `
    query RealtimeEgress($accountTag: string!, $dateFrom: Date!, $dateTo: Date!) {
      viewer {
        accounts(filter: { accountTag: $accountTag }) {
          callsTurnUsageAdaptiveGroups(
            filter: { date_geq: $dateFrom, date_leq: $dateTo }
            limit: 1
          ) {
            sum { egressBytes }
          }
        }
      }
    }
  `;

  try {
    const res = await fetch("https://api.cloudflare.com/client/v4/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        variables: {
          accountTag: accountId,
          dateFrom: from,
          dateTo: to,
        },
      }),
    });
    const json = (await res.json().catch(() => null)) as {
      data?: {
        viewer?: {
          accounts?: Array<{
            callsTurnUsageAdaptiveGroups?: Array<{
              sum?: { egressBytes?: number };
            }>;
          }>;
        };
      };
      errors?: Array<{ message?: string }>;
    } | null;

    if (!res.ok || json?.errors?.length) {
      const msg =
        json?.errors?.map((e) => e.message).filter(Boolean).join("; ") ||
        `GraphQL HTTP ${res.status}`;
      return {
        provider,
        ky,
        freeGb,
        usedGb: 0,
        percent: 0,
        alertLevel: null,
        source: "unavailable",
        note: `GraphQL lỗi: ${msg}. Có thể dùng MEDIA_EGRESS_USED_GB.`,
        fetchedAt,
      };
    }

    const groups =
      json?.data?.viewer?.accounts?.[0]?.callsTurnUsageAdaptiveGroups ?? [];
    const bytes = Number(groups[0]?.sum?.egressBytes ?? 0);
    const usedGb = bytes / (1024 * 1024 * 1024);
    const percent = freeGb > 0 ? (usedGb / freeGb) * 100 : 0;

    return {
      provider,
      ky,
      freeGb,
      usedGb,
      percent,
      alertLevel: alertLevel(percent),
      source: "cloudflare_graphql",
      note:
        "Egress TURN analytics (tháng UTC). Free tier 1 TB dùng chung SFU+TURN — đối chiếu thêm Cloudflare Dashboard khi cắt sang Hetzner.",
      fetchedAt,
    };
  } catch (e) {
    return {
      provider,
      ky,
      freeGb,
      usedGb: 0,
      percent: 0,
      alertLevel: null,
      source: "unavailable",
      note: e instanceof Error ? e.message : "Không lấy được analytics.",
      fetchedAt,
    };
  }
}

export function bangThongHint(snapshot: MediaBangThongSnapshot): string {
  if (snapshot.alertLevel === 95) {
    return "Gần hết free tier — chuẩn bị cutover LiveKit / Hetzner SIN.";
  }
  if (snapshot.alertLevel === 85) {
    return "Đã vượt 85% free — lên lịch provision Hetzner.";
  }
  if (snapshot.alertLevel === 70) {
    return "Đã vượt 70% free — theo dõi sát hơn.";
  }
  if (snapshot.percent < MEDIA_ALERT_THRESHOLDS[0]) {
    return "Còn dư địa free tier — giữ Cloudflare Realtime.";
  }
  return "";
}
