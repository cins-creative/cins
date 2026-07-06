/**
 * Xóa thư mục .next — dùng trước khi dev nếu HMR/cache bị lệch.
 * Windows: retry khi ENOTEMPTY/EBUSY (process vừa chết, file còn lock).
 */
import { rmSync } from "node:fs";
import { join } from "node:path";

const dir = join(process.cwd(), ".next");
const RETRYABLE = new Set(["ENOTEMPTY", "EBUSY", "EPERM"]);
const MAX_ATTEMPTS = 5;
const RETRY_MS = 400;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function removeNextDir() {
  rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
}

let lastError = null;
for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
  try {
    removeNextDir();
    console.log("[clean] Removed .next");
    process.exit(0);
  } catch (error) {
    lastError = error;
    const code =
      error && typeof error === "object" && "code" in error
        ? String(error.code)
        : "";
    if (code === "ENOENT") {
      console.log("[clean] .next not found (already clean)");
      process.exit(0);
    }
    if (RETRYABLE.has(code) && attempt < MAX_ATTEMPTS) {
      console.log(`[clean] Retry ${attempt}/${MAX_ATTEMPTS - 1} (${code})…`);
      await sleep(RETRY_MS * attempt);
      continue;
    }
    throw error;
  }
}

throw lastError;
