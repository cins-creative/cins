/**
 * Xóa thư mục .next — dùng trước khi dev nếu HMR/cache bị lệch.
 */
import { rmSync } from "node:fs";
import { join } from "node:path";

const dir = join(process.cwd(), ".next");

try {
  rmSync(dir, { recursive: true, force: true });
  console.log("[clean] Removed .next");
} catch (error) {
  if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
    console.log("[clean] .next not found (already clean)");
  } else {
    throw error;
  }
}
