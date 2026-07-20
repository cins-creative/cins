import type { ChatCanvasNode } from "@/lib/chat/canvas/types";

export async function addChatMessageToCanvas(
  roomId: string,
  messageId: string,
): Promise<{ node: ChatCanvasNode; created: boolean } | { error: string }> {
  try {
    const res = await fetch(`/api/chat/rooms/${roomId}/canvas/from-message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId }),
    });
    const data = (await res.json().catch(() => null)) as
      | { node: ChatCanvasNode; created: boolean }
      | { error: string }
      | null;
    if (!res.ok || !data || !("node" in data)) {
      return { error: (data && "error" in data && data.error) || "Không thêm được lên canvas." };
    }
    return { node: data.node, created: data.created };
  } catch {
    return { error: "Không thêm được lên canvas." };
  }
}
