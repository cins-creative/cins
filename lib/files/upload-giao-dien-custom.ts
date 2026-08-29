import type { ProfileCustomEntry } from "@/lib/journey/profile-theme";

export type GiaoDienCustomUploadResult = {
  imageId: string;
  customs?: ProfileCustomEntry[];
};

type UploadJson = {
  imageId?: string;
  customs?: ProfileCustomEntry[];
  error?: string;
};

/**
 * Upload ảnh custom giao diện (`/api/user/giao-dien/upload`) với progress XHR.
 * `fetch` không expose upload progress.
 */
export function uploadGiaoDienCustomWithProgress(
  file: File,
  onProgress?: (percent: number) => void,
  timeoutMs = 90_000,
): Promise<GiaoDienCustomUploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const timer = window.setTimeout(() => {
      xhr.abort();
      reject(new Error("Upload quá lâu — thử lại hoặc chọn ảnh nhỏ hơn."));
    }, timeoutMs);

    xhr.open("POST", "/api/user/giao-dien/upload");
    xhr.withCredentials = true;

    xhr.upload.onprogress = (event) => {
      if (!onProgress) return;
      if (!event.lengthComputable) {
        onProgress(1);
        return;
      }
      onProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)));
    };

    xhr.upload.onloadstart = () => {
      onProgress?.(1);
    };

    const finish = (fn: () => void) => {
      window.clearTimeout(timer);
      fn();
    };

    xhr.onload = () => {
      let json: UploadJson | null = null;
      try {
        json = JSON.parse(xhr.responseText) as UploadJson;
      } catch {
        json = null;
      }
      if (xhr.status < 200 || xhr.status >= 300 || !json?.imageId) {
        finish(() => reject(new Error(json?.error || "Upload thất bại.")));
        return;
      }
      onProgress?.(100);
      const imageId = json.imageId;
      const customs = json.customs;
      finish(() => resolve({ imageId, customs }));
    };

    xhr.onerror = () =>
      finish(() => reject(new Error("Không kết nối được máy chủ upload.")));
    xhr.onabort = () =>
      finish(() => reject(new Error("Upload bị huỷ hoặc quá thời gian chờ.")));

    const form = new FormData();
    form.append("file", file);
    xhr.send(form);
  });
}
