/**
 * Giải phóng port dev (mặc định 3001) trước khi bind lại — tránh EADDRINUSE / process treo.
 */
import { execSync } from "node:child_process";

const port = process.argv[2] ?? "3001";

function killOnWindows() {
  let out = "";
  try {
    out = execSync(`netstat -ano | findstr :${port} | findstr LISTENING`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return;
  }

  const pids = new Set();
  for (const line of out.split(/\r?\n/)) {
    const match = line.trim().match(/\s(\d+)\s*$/);
    if (match) pids.add(match[1]);
  }

  for (const pid of pids) {
    try {
      execSync(`taskkill /PID ${pid} /F /T`, { stdio: "ignore" });
      console.log(`[kill-port] Stopped PID ${pid} on :${port}`);
    } catch {
      // process may already be gone
    }
  }
}

function killOnUnix() {
  try {
    execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null; true`, {
      shell: "/bin/sh",
      stdio: "inherit",
    });
  } catch {
    // nothing listening
  }
}

if (process.platform === "win32") {
  killOnWindows();
} else {
  killOnUnix();
}
