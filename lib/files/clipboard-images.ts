import { isAllowedUploadImageFile } from "@/lib/files/infer-image-mime";

function imageFileKey(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}:${file.type}`;
}

function pushUniqueFile(out: File[], seen: Set<string>, file: File) {
  if (!isAllowedUploadImageFile(file)) return;
  const key = imageFileKey(file);
  if (seen.has(key)) return;
  seen.add(key);
  out.push(file);
}

function fileFromImageBlob(blob: Blob, index: number, mimeHint?: string): File {
  const mime = (blob.type || mimeHint || "image/png").toLowerCase();
  const ext = mime.includes("jpeg")
    ? "jpg"
    : mime.includes("webp")
      ? "webp"
      : mime.includes("gif")
        ? "gif"
        : "png";
  return new File([blob], `clipboard-${index}.${ext}`, {
    type: mime.startsWith("image/") ? mime : "image/png",
  });
}

async function filesFromClipboardHtml(
  html: string,
  startIndex: number,
): Promise<File[]> {
  const out: File[] = [];
  const dataUriRe =
    /src\s*=\s*["'](data:image\/(?:png|jpeg|jpg|webp|gif);base64,[^"']+)["']/gi;
  let match: RegExpExecArray | null;
  let i = startIndex;
  while ((match = dataUriRe.exec(html)) != null) {
    const uri = match[1];
    if (!uri) continue;
    try {
      const res = await fetch(uri);
      const blob = await res.blob();
      out.push(fileFromImageBlob(blob, i));
      i += 1;
    } catch {
      /* ignore bad data uri */
    }
  }
  return out;
}

/** Lấy file ảnh từ clipboard (Ctrl+V / bộ nhớ tạm). */
export function imageFilesFromClipboard(data: DataTransfer | null): File[] {
  if (!data) return [];

  const out: File[] = [];
  const seen = new Set<string>();

  for (const item of data.items) {
    if (!item.type.startsWith("image/") && item.kind !== "file") continue;
    const file = item.getAsFile();
    if (!file) continue;
    pushUniqueFile(out, seen, file);
  }

  if (out.length > 0) return out;

  for (const file of data.files) {
    pushUniqueFile(out, seen, file);
  }

  return out;
}

/** Đọc một file ảnh từ clipboard sau user gesture (click nút Dán). */
export async function readImageFileFromClipboard(): Promise<File | null> {
  const files = await readImageFilesFromClipboard();
  return files[0] ?? null;
}

/** Đọc mọi ảnh từ clipboard sau user gesture (có thể nhiều file). */
export async function readImageFilesFromClipboard(): Promise<File[]> {
  const result = await readImageFilesFromClipboardDetailed();
  return result.files;
}

export type ClipboardImageReadResult = {
  files: File[];
  /** Lý do khi không có file — để UI hint đúng. */
  reason: "ok" | "empty" | "denied" | "unsupported" | "insecure";
};

const IMAGE_MIME_CANDIDATES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
] as const;

/**
 * Gọi trong `pointerdown` (trước `click`) để Clipboard API còn gắn user gesture.
 * Trả `null` nếu môi trường không hỗ trợ đọc clipboard.
 */
export function beginClipboardImageRead(): ReturnType<
  typeof readImageFilesFromClipboardDetailed
> | null {
  if (typeof window !== "undefined" && !window.isSecureContext) return null;
  if (typeof navigator === "undefined" || !navigator.clipboard?.read) {
    return null;
  }
  return readImageFilesFromClipboardDetailed();
}

/** Hint UI khi nút Dán không lấy được ảnh (permission / empty / Simple Browser). */
export function clipboardImageFailureMessage(
  reason: ClipboardImageReadResult["reason"],
): string {
  switch (reason) {
    case "ok":
      return "";
    case "denied":
    case "unsupported":
    case "insecure":
      return "Trình duyệt không đọc clipboard bằng nút. Copy ảnh rồi nhấn Ctrl+V vào khung ảnh — hoặc dùng Chọn ảnh.";
    case "empty":
    default:
      return "Chưa có ảnh trong bộ nhớ tạm. Copy ảnh rồi Ctrl+V vào khung ảnh, hoặc dùng Chọn ảnh.";
  }
}

/** Đọc clipboard kèm lý do thất bại (permission / không hỗ trợ). */
export async function readImageFilesFromClipboardDetailed(): Promise<ClipboardImageReadResult> {
  try {
    if (typeof window !== "undefined" && !window.isSecureContext) {
      return { files: [], reason: "insecure" };
    }
    if (typeof navigator === "undefined" || !navigator.clipboard?.read) {
      return { files: [], reason: "unsupported" };
    }

    const items = await navigator.clipboard.read();
    const out: File[] = [];
    const seen = new Set<string>();
    let i = 0;

    for (const item of items) {
      const typeSet = new Set<string>([
        ...item.types,
        ...IMAGE_MIME_CANDIDATES,
      ]);

      for (const type of typeSet) {
        if (!type.startsWith("image/")) continue;
        try {
          const blob = await item.getType(type);
          const file = fileFromImageBlob(blob, i, type);
          i += 1;
          pushUniqueFile(out, seen, file);
        } catch {
          /* type không có trong item */
        }
      }

      if (out.length > 0) continue;

      if (item.types.includes("text/html")) {
        try {
          const html = await (await item.getType("text/html")).text();
          const fromHtml = await filesFromClipboardHtml(html, i);
          i += fromHtml.length;
          for (const file of fromHtml) pushUniqueFile(out, seen, file);
        } catch {
          /* ignore */
        }
      }
    }

    return { files: out, reason: out.length > 0 ? "ok" : "empty" };
  } catch (err) {
    const name =
      err && typeof err === "object" && "name" in err
        ? String((err as { name?: string }).name)
        : "";
    if (name === "NotAllowedError" || name === "SecurityError") {
      return { files: [], reason: "denied" };
    }
    return { files: [], reason: "unsupported" };
  }
}
