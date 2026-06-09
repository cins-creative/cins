import { isAllowedUploadImageFile } from "@/lib/files/infer-image-mime";

/** Lấy file ảnh từ clipboard (Ctrl+V / bộ nhớ tạm). */
export function imageFilesFromClipboard(data: DataTransfer | null): File[] {
  if (!data) return [];

  const out: File[] = [];
  const seen = new Set<File>();

  for (const item of data.items) {
    if (item.kind !== "file") continue;
    const file = item.getAsFile();
    if (!file || seen.has(file)) continue;
    seen.add(file);
    out.push(file);
  }

  for (const file of data.files) {
    if (seen.has(file)) continue;
    seen.add(file);
    out.push(file);
  }

  return out.filter(isAllowedUploadImageFile);
}

/** Đọc một file ảnh từ clipboard sau user gesture (click nút Dán). */
export async function readImageFileFromClipboard(): Promise<File | null> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.read) {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        for (const type of item.types) {
          if (!type.startsWith("image/")) continue;
          const blob = await item.getType(type);
          const file = new File([blob], "clipboard.png", {
            type: blob.type || type,
          });
          if (isAllowedUploadImageFile(file)) return file;
        }
      }
    }
  } catch {
    /* Permission denied hoặc trình duyệt không hỗ trợ. */
  }
  return null;
}
