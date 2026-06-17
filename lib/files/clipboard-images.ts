import { isAllowedUploadImageFile } from "@/lib/files/infer-image-mime";

function imageFileKey(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}:${file.type}`;
}

/** Lấy file ảnh từ clipboard (Ctrl+V / bộ nhớ tạm). */
export function imageFilesFromClipboard(data: DataTransfer | null): File[] {
  if (!data) return [];

  const out: File[] = [];
  const seen = new Set<string>();

  for (const item of data.items) {
    if (item.kind !== "file") continue;
    const file = item.getAsFile();
    if (!file || !isAllowedUploadImageFile(file)) continue;
    const key = imageFileKey(file);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(file);
  }

  if (out.length > 0) return out;

  for (const file of data.files) {
    if (!isAllowedUploadImageFile(file)) continue;
    const key = imageFileKey(file);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(file);
  }

  return out;
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
