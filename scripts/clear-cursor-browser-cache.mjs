/**
 * Xóa cache trình duyệt nhúng Cursor (redirect 308 localhost bị kẹt).
 * Chạy khi ERR_TOO_MANY_REDIRECTS trên http://localhost:3001 dù server OK.
 *
 * Sau khi chạy: thoát hẳn Cursor (không chỉ Restart Browser) → mở lại → localhost:3001
 */
import { rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const appData =
  process.env.APPDATA ?? join(homedir(), "AppData", "Roaming");

const targets = [
  join(appData, "Cursor", "Partitions", "cursor-browser"),
  join(appData, "Cursor", "Network"),
  join(appData, "Cursor", "Cache"),
  join(appData, "Cursor", "Code Cache"),
  join(appData, "Cursor", "GPUCache"),
];

let cleared = 0;
for (const path of targets) {
  if (!existsSync(path)) continue;
  rmSync(path, { recursive: true, force: true });
  console.log(`[clear] ${path}`);
  cleared++;
}

if (cleared === 0) {
  console.log("[clear] Không tìm thấy thư mục cache Cursor — có thể đã xóa rồi.");
} else {
  console.log(
    `[clear] Xong ${cleared} thư mục. Thoát hẳn Cursor rồi mở lại http://localhost:3001`,
  );
}
