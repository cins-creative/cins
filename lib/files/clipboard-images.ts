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
