export const UPLOAD_IMAGE_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

/** Windows đôi khi trả `file.type` rỗng — suy MIME từ đuôi tên. */
export function inferImageMime(file: Pick<File, "type" | "name">): string {
  const declared = file.type?.trim().toLowerCase();
  if (declared && declared !== "application/octet-stream") return declared;

  const name = file.name.toLowerCase();
  if (/\.jpe?g$/i.test(name)) return "image/jpeg";
  if (/\.png$/i.test(name)) return "image/png";
  if (/\.webp$/i.test(name)) return "image/webp";
  if (/\.gif$/i.test(name)) return "image/gif";

  return declared || "application/octet-stream";
}

export function isAllowedUploadImageFile(
  file: Pick<File, "type" | "name">,
): boolean {
  return UPLOAD_IMAGE_MIMES.has(inferImageMime(file));
}
