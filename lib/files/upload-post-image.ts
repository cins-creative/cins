export type PostImageUploadResult = {
  imageId: string;
  url?: string;
};

type PostImageUploadJson = {
  imageId?: string;
  url?: string;
  error?: string;
};

/**
 * Upload ảnh bài viết qua `/api/post-image/upload` với progress (XHR).
 * `fetch` không expose upload progress — dùng XHR cho UX rõ ràng.
 */
export function uploadPostImageWithProgress(
  file: File,
  onProgress?: (percent: number) => void,
  timeoutMs = 90_000,
): Promise<PostImageUploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const timer = window.setTimeout(() => {
      xhr.abort();
      reject(new Error("Upload quá lâu — thử lại hoặc chọn ảnh nhỏ hơn."));
    }, timeoutMs);

    xhr.open("POST", "/api/post-image/upload");
    xhr.withCredentials = true;

    xhr.upload.onprogress = (event) => {
      if (!onProgress) return;
      if (!event.lengthComputable) {
        onProgress(1);
        return;
      }
      onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
    };

    xhr.upload.onloadstart = () => {
      onProgress?.(1);
    };

    const finish = (fn: () => void) => {
      window.clearTimeout(timer);
      fn();
    };

    xhr.onload = () => {
      let json: PostImageUploadJson | null = null;
      try {
        json = JSON.parse(xhr.responseText) as PostImageUploadJson;
      } catch {
        json = null;
      }
      if (xhr.status < 200 || xhr.status >= 300 || !json?.imageId) {
        finish(() => reject(new Error(json?.error || "Upload thất bại.")));
        return;
      }
      onProgress?.(100);
      const imageId = json!.imageId as string;
      finish(() => resolve({ imageId, url: json!.url }));
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
