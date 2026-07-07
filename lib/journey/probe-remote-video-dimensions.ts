import { setCachedVideoAspect } from "@/lib/journey/gallery-video-dimension-cache";

const MP4_QUALITIES = ["360p", "480p", "720p", "1080p"] as const;

export function bunnyMp4FallbackUrls(primary: string): string[] {
  const trimmed = primary.trim();
  if (!trimmed) return [];
  const out: string[] = [trimmed];
  for (const quality of MP4_QUALITIES) {
    const variant = trimmed.replace(/play_[^/]+\.mp4$/i, `play_${quality}.mp4`);
    if (variant !== trimmed && !out.includes(variant)) out.push(variant);
  }
  const generic = trimmed.replace(/play_[^/]+\.mp4$/i, "play.mp4");
  if (generic !== trimmed && !out.includes(generic)) out.push(generic);
  return out;
}

/** Đọc videoWidth/videoHeight từ MP4 Bunny (metadata only). */
export function probeRemoteVideoDimensions(
  primary: string,
): Promise<{ width: number; height: number } | null> {
  const candidates = bunnyMp4FallbackUrls(primary);
  if (candidates.length === 0) return Promise.resolve(null);

  return new Promise((resolve) => {
    let index = 0;

    const tryNext = () => {
      if (index >= candidates.length) {
        resolve(null);
        return;
      }

      const video = document.createElement("video");
      video.preload = "metadata";
      video.muted = true;
      video.playsInline = true;
      const src = candidates[index]!;
      index += 1;

      const cleanup = () => {
        video.onloadedmetadata = null;
        video.onerror = null;
        video.removeAttribute("src");
        video.load();
      };

      video.onloadedmetadata = () => {
        const width = video.videoWidth;
        const height = video.videoHeight;
        cleanup();
        if (width > 0 && height > 0) {
          setCachedVideoAspect(src, width, height);
          resolve({ width, height });
        } else {
          tryNext();
        }
      };
      video.onerror = () => {
        cleanup();
        tryNext();
      };
      video.src = `${src}#t=0.001`;
    };

    tryNext();
  });
}
