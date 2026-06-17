import type { ChatMessage, ChatReactionSummary } from "@/lib/chat/types";

export async function patchChatMessage(
  roomId: string,
  messageId: string,
  body: { action: "recall" | "edit" | "pin"; noi_dung?: string; pinned?: boolean },
): Promise<{ message?: ChatMessage; pinned?: boolean; error?: string }> {
  const res = await fetch(`/api/chat/rooms/${roomId}/messages/${messageId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as {
    message?: ChatMessage;
    pinned?: boolean;
    error?: string;
  };
  if (!res.ok) {
    return { error: json.error ?? "Không thực hiện được." };
  }
  return json;
}

export async function toggleChatReaction(
  roomId: string,
  messageId: string,
  emoji: string,
  active: boolean,
): Promise<{ reactions?: ChatReactionSummary[]; error?: string }> {
  const res = await fetch(
    `/api/chat/rooms/${roomId}/messages/${messageId}/reactions`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji, active }),
    },
  );
  const json = (await res.json()) as {
    reactions?: ChatReactionSummary[];
    error?: string;
  };
  if (!res.ok) {
    return { error: json.error ?? "Không thêm được reaction." };
  }
  return json;
}

export async function fetchPinnedMessages(
  roomId: string,
): Promise<ChatMessage[]> {
  const res = await fetch(`/api/chat/rooms/${roomId}/pins`, { cache: "no-store" });
  if (!res.ok) return [];
  const json = (await res.json()) as { pinnedMessages?: ChatMessage[] };
  return json.pinnedMessages ?? [];
}
