import "server-only";

import { getCloudflareRealtimeKitConfig } from "@/lib/media/config";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type CfEnvelope<T> = {
  success?: boolean;
  errors?: Array<{ message?: string }>;
  data?: T;
  result?: T;
};

function kitBase(accountId: string, appId: string): string {
  return `https://api.cloudflare.com/client/v4/accounts/${accountId}/realtime/kit/${appId}`;
}

async function kitFetch<T>(
  path: string,
  init: RequestInit & { apiToken: string; accountId: string; appId: string },
): Promise<T> {
  const url = `${kitBase(init.accountId, init.appId)}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${init.apiToken}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const json = (await res.json().catch(() => null)) as CfEnvelope<T> | null;
  if (!res.ok || json?.success === false) {
    const detail =
      json?.errors?.map((e) => e.message).filter(Boolean).join("; ") ||
      `RealtimeKit HTTP ${res.status}`;
    const hint =
      res.status === 401
        ? " — kiểm tra CLOUDFLARE_REALTIMEKIT_APP_ID (phải là App RealtimeKit UUID, không phải App SFU) và token có quyền Realtime Admin."
        : "";
    throw new Error(`${detail}${hint}`);
  }
  const data = (json?.data ?? json?.result) as T | undefined;
  if (data == null) {
    throw new Error("RealtimeKit: thiếu data trong response.");
  }
  return data;
}

export async function ensureCloudflareMeetingForRoom(input: {
  chatPhongId: string;
  title: string;
}): Promise<string> {
  const cfg = getCloudflareRealtimeKitConfig();
  if (!cfg) {
    throw new Error(
      "Chưa cấu hình Cloudflare RealtimeKit (CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_REALTIMEKIT_APP_ID, CLOUDFLARE_REALTIMEKIT_API_TOKEN).",
    );
  }

  const admin = createServiceRoleClient();
  const { data: existing } = await admin
    .from("media_phong_hop")
    .select("id_external")
    .eq("id_chat_phong", input.chatPhongId)
    .eq("provider", "cloudflare")
    .maybeSingle();

  if (existing?.id_external) {
    return existing.id_external as string;
  }

  const created = await kitFetch<{ id: string }>("/meetings", {
    method: "POST",
    apiToken: cfg.apiToken,
    accountId: cfg.accountId,
    appId: cfg.appId,
    body: JSON.stringify({
      title: input.title.slice(0, 120),
    }),
  });

  const meetingId = created.id;
  const { error } = await admin.from("media_phong_hop").insert({
    id_chat_phong: input.chatPhongId,
    provider: "cloudflare",
    id_external: meetingId,
  });

  if (error) {
    // Race: row vừa được tạo bởi request khác.
    if (error.code === "23505") {
      const { data: again } = await admin
        .from("media_phong_hop")
        .select("id_external")
        .eq("id_chat_phong", input.chatPhongId)
        .eq("provider", "cloudflare")
        .maybeSingle();
      if (again?.id_external) return again.id_external as string;
    }
    throw new Error(error.message || "Không lưu media_phong_hop.");
  }

  return meetingId;
}

export async function createCloudflareParticipantToken(input: {
  meetingId: string;
  userId: string;
  displayName: string;
  role: "staff" | "student";
}): Promise<string> {
  const cfg = getCloudflareRealtimeKitConfig();
  if (!cfg) {
    throw new Error("Chưa cấu hình Cloudflare RealtimeKit.");
  }

  const preset =
    input.role === "staff" ? cfg.presetStaff : cfg.presetStudent;

  const participant = await kitFetch<{
    token?: string;
    authToken?: string;
    auth_token?: string;
  }>(`/meetings/${encodeURIComponent(input.meetingId)}/participants`, {
    method: "POST",
    apiToken: cfg.apiToken,
    accountId: cfg.accountId,
    appId: cfg.appId,
    body: JSON.stringify({
      name: input.displayName.slice(0, 80) || "Thành viên",
      preset_name: preset,
      custom_participant_id: input.userId,
    }),
  });

  const token =
    participant.token ??
    participant.authToken ??
    participant.auth_token;
  if (!token) {
    throw new Error("RealtimeKit không trả authToken cho participant.");
  }
  return token;
}
