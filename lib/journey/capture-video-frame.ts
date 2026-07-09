/** Tải video ẩn để seek + chụp frame làm thumbnail. */
function loadVideoElement(
  src: string,
  crossOrigin: boolean,
): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    if (crossOrigin) video.crossOrigin = "anonymous";
    const onLoaded = () => {
      cleanup();
      resolve(video);
    };
    const onError = () => {
      cleanup();
      reject(new Error("Không tải được video để chọn frame."));
    };
    const cleanup = () => {
      video.removeEventListener("loadedmetadata", onLoaded);
      video.removeEventListener("error", onError);
    };
    video.addEventListener("loadedmetadata", onLoaded);
    video.addEventListener("error", onError);
    video.src = src;
  });
}

function seekVideo(video: HTMLVideoElement, time: number): Promise<void> {
  const duration = Number.isFinite(video.duration) ? video.duration : time;
  const target = Math.min(Math.max(0, time), Math.max(0, duration - 0.05));
  if (video.readyState >= 2 && Math.abs(video.currentTime - target) < 0.05) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("Không tìm được frame video — thử tải ảnh thumbnail riêng."));
    }, 12_000);
    const cleanup = () => {
      window.clearTimeout(timeout);
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
    };
    const onSeeked = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("Không đọc được frame video."));
    };
    video.addEventListener("seeked", onSeeked);
    video.addEventListener("error", onError);
    try {
      video.currentTime = target;
    } catch (e) {
      cleanup();
      reject(
        e instanceof Error ? e : new Error("Không seek được vị trí trong video."),
      );
    }
  });
}

function disposeVideo(video: HTMLVideoElement) {
  video.pause();
  video.removeAttribute("src");
  video.load();
}

/** Chụp frame tại `timeSeconds` — blob JPEG. */
export async function captureVideoFrameAsBlob(
  src: string,
  timeSeconds: number,
): Promise<Blob> {
  const trimmed = src.trim();
  if (!trimmed) {
    throw new Error("Chưa có video để chọn frame.");
  }
  const isBlob = trimmed.startsWith("blob:");
  const video = await loadVideoElement(trimmed, !isBlob);
  try {
    await seekVideo(video, timeSeconds);
    const width = video.videoWidth;
    const height = video.videoHeight;
    if (width <= 0 || height <= 0) {
      throw new Error("Video chưa sẵn sàng — thử lại sau khi encode xong.");
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Không xuất được ảnh thumbnail.");
    ctx.drawImage(video, 0, 0, width, height);
    return await new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) =>
          blob
            ? resolve(blob)
            : reject(
                new Error(
                  "Không xuất được frame — hãy tải ảnh thumbnail riêng.",
                ),
              ),
        "image/jpeg",
        0.92,
      );
    });
  } finally {
    disposeVideo(video);
  }
}

export async function captureVideoFrameAsFile(
  src: string,
  timeSeconds: number,
  fileName = "video-thumbnail.jpg",
): Promise<File> {
  const blob = await captureVideoFrameAsBlob(src, timeSeconds);
  return new File([blob], fileName, { type: blob.type || "image/jpeg" });
}
