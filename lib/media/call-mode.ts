export type MediaCallMode = "audio" | "video" | "screen";

export function mediaCallLabel(mode: MediaCallMode): string {
  if (mode === "audio") return "Cuộc gọi";
  if (mode === "screen") return "Chia sẻ màn hình";
  return "Gọi video";
}
