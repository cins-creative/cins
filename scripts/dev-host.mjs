/**
 * Dev server ổn định cho test LAN (iPad): clean .next → kill :3001 → next dev.
 *
 * Usage:
 *   node scripts/dev-host.mjs           # Turbopack (mặc định Next 16)
 *   node scripts/dev-host.mjs --webpack # So sánh HMR webpack khi Turbopack desync
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");
const port = "3001";
const hostname = "0.0.0.0";
const useWebpack = process.argv.includes("--webpack");

function runNodeScript(name, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [join(__dirname, name), ...args], {
      cwd: projectRoot,
      stdio: "inherit",
    });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${name} exited with code ${code}`));
    });
  });
}

await runNodeScript("clean-next.mjs");
await runNodeScript("kill-port.mjs", [port]);

const nextArgs = ["dev", "-H", hostname, "-p", port];
if (useWebpack) nextArgs.push("--webpack");

console.log(`[host] next ${nextArgs.join(" ")}`);
console.log(
  `[host] Mở http://localhost:${port} (không dùng http://0.0.0.0:${port} — OAuth PKCE lệch origin).`,
);

const nextBin = join(projectRoot, "node_modules", "next", "dist", "bin", "next");
const dev = spawn(process.execPath, [nextBin, ...nextArgs], {
  cwd: projectRoot,
  stdio: "inherit",
  env: process.env,
});

dev.on("exit", (code) => process.exit(code ?? 0));

process.on("SIGINT", () => dev.kill("SIGINT"));
process.on("SIGTERM", () => dev.kill("SIGTERM"));
