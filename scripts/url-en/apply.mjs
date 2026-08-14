/**
 * Áp mapping URL tiếng Anh: đổi tên folder `app/**` + rewrite URL literal.
 *
 *   node scripts/url-en/apply.mjs                 # dry-run, chỉ báo cáo
 *   node scripts/url-en/apply.mjs --folders       # git mv folder app/**
 *   node scripts/url-en/apply.mjs --literals      # rewrite URL literal
 *
 * Không tự chạy cả hai cùng lúc: đổi folder rồi build, sau đó mới rewrite literal.
 */
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import { translatePath } from "./map-routes.mjs";

const DRY = !process.argv.includes("--folders") && !process.argv.includes("--literals");
const DO_FOLDERS = process.argv.includes("--folders");
const DO_LITERALS = process.argv.includes("--literals");

/**
 * Không rewrite literal trong các file này: tool, tài liệu, từ điển, và 2 file
 * **phải** giữ path tiếng Việt để redirect legacy còn hoạt động.
 */
const SKIP_FILES =
  /^(scripts|docs|supabase|public)\/|^middleware\.ts$|^lib\/navigation\/legacy-url-map\.ts$/;

/** Literal trỏ tới asset tĩnh trong `public/` — namespace khác, không đổi. */
const ASSET_EXT =
  /\.(png|jpe?g|gif|svg|webp|avif|ico|mp4|webm|mp3|wav|json|css|txt|xml|woff2?|riv|lottie|pdf)$/i;

function git(cmd) {
  return execSync(`git ${cmd}`, { encoding: "utf8", maxBuffer: 1 << 28 });
}

/** `git mv` từng file tracked từ `from` sang `to`, tạo thư mục đích khi cần. */
function moveContents(from, to) {
  const files = git(`ls-files "${from}"`).split("\n").filter(Boolean);
  for (const file of files) {
    const target = to + file.slice(from.length);
    mkdirSync(dirname(target), { recursive: true });
    git(`mv "${file}" "${target}"`);
  }
}

function rmdirIfEmpty(dir) {
  try {
    rmSync(dir, { recursive: true, force: true });
  } catch {
    /* Còn handle mở — thư mục rỗng không ảnh hưởng build, dọn sau. */
  }
}

/* ────────────────────────── 1. Đổi tên folder app/** ────────────────────────── */

/** Mọi thư mục dưới `app/` (suy ra từ danh sách file), sâu nhất trước. */
function appDirectories() {
  const files = git('ls-files "app/**"').split("\n").filter(Boolean);
  const dirs = new Set();
  /* Chỉ đổi tên thư mục thuộc một route. `app/nganh` chỉ có `actions.ts`
   * (server action, không phải URL) → giữ nguyên để không vỡ import. */
  const routeDirs = new Set();
  for (const f of files) {
    const parts = f.split("/");
    for (let i = 1; i < parts.length; i += 1) {
      dirs.add(parts.slice(0, i).join("/"));
    }
    if (/\/(page|route)\.tsx?$/.test(f)) {
      for (let i = 1; i < parts.length; i += 1) {
        routeDirs.add(parts.slice(0, i).join("/"));
      }
    }
  }
  return [...dirs]
    .filter((d) => routeDirs.has(d))
    .filter((d) => d !== "app")
    .filter((d) => !d.startsWith("app/admin") && !d.startsWith("app/api/admin"))
    .sort((a, b) => b.split("/").length - a.split("/").length);
}

/** Tên mới của một thư mục — dịch **chỉ segment cuối**, theo ngữ cảnh path đầy đủ. */
function renamedDirectory(dir) {
  const urlPath = "/" + dir
    .replace(/^app\//, "")
    .split("/")
    .filter((s) => s && !/^\([^)]*\)$/.test(s) && !s.startsWith("@"))
    .map((s) => s.replace(/^\(\.{1,3}\)/, ""))
    .join("/");
  if (urlPath === "/") return null;

  const { path: next } = translatePath(urlPath);
  if (next === null || next === urlPath) return null;

  const oldLast = urlPath.split("/").filter(Boolean).at(-1);
  const newLast = next.split("/").filter(Boolean).at(-1);
  if (oldLast === newLast) return null;

  const base = dir.split("/").slice(0, -1).join("/");
  const leaf = dir.split("/").at(-1);
  /* Giữ tiền tố route group / intercepting marker của folder. */
  const marker = leaf.match(/^\(\.{1,3}\)/)?.[0] ?? "";
  return `${base}/${marker}${newLast}`;
}

function renameFolders() {
  const dirs = appDirectories();
  const moves = [];
  for (const dir of dirs) {
    const next = renamedDirectory(dir);
    if (next) moves.push([dir, next]);
  }

  console.log(`=== folder rename: ${moves.length} thư mục ===`);
  for (const [from, to] of moves) console.log(`  ${from}\n    → ${to}`);

  /* Hai folder khác nhau không được đổi về cùng một đích. */
  const targets = new Map();
  const existing = new Set(dirs);
  const collisions = [];
  /* Đích đã tồn tại và không tự đổi tên → gộp nội dung, không mv cả thư mục. */
  const merges = new Map();
  for (const [from, to] of moves) {
    if (targets.has(to)) collisions.push(`${to} <= ${targets.get(to)} + ${from}`);
    targets.set(to, from);
    if (existing.has(to) && !moves.some(([f]) => f === to)) merges.set(from, to);
  }
  if (collisions.length > 0) {
    console.error(`\n!!! ${collisions.length} XUNG DOT - dung:`);
    for (const c of collisions) console.error(`  ${c}`);
    process.exitCode = 1;
    return;
  }
  if (merges.size > 0) {
    console.log(`\n${merges.size} thu muc GOP vao dich da ton tai:`);
    for (const [from, to] of merges) console.log(`  ${from} -> ${to}`);
  }

  if (!DO_FOLDERS) return;
  for (const [from, to] of moves) {
    /* Sâu nhất trước nên path cha vẫn còn nguyên khi tới lượt con. */
    if (merges.has(from)) {
      moveContents(from, to);
      continue;
    }
    try {
      git(`mv "${from}" "${to}"`);
    } catch (err) {
      /* Windows: watcher giữ handle thư mục → rename bị chặn, nhưng chuyển
       * từng file vẫn được. Xem docs/PLAN_URL_ENGLISH.md §5. */
      if (!/Permission denied/i.test(String(err.stderr ?? err.message))) throw err;
      console.log(`  (fallback từng file) ${from}`);
      moveContents(from, to);
      rmdirIfEmpty(from);
    }
  }
  console.log(`\nDa git mv ${moves.length} thu muc.`);
}

/* ────────────────────────── 2. Rewrite URL literal ────────────────────────── */

/** Segment template `${...}` được coi là động (giữ nguyên). */
function translateLiteral(raw) {
  /* Tách query/hash, chỉ dịch phần path. */
  const m = raw.match(/^([^?#]*)([?#].*)?$/);
  const pathPart = m[1];
  const rest = m[2] ?? "";
  if (!pathPart.startsWith("/")) return raw;
  if (ASSET_EXT.test(pathPart)) return raw;
  /* `/admin/*` giữ tiếng Việt — ngoài phạm vi đổi URL. */
  if (
    pathPart === "/admin" ||
    pathPart.startsWith("/admin/") ||
    pathPart.startsWith("/api/admin/")
  ) {
    return raw;
  }

  const { path: next } = translatePath(pathPart);
  if (next === null) return raw;

  const oldSegs = pathPart.split("/").filter(Boolean);
  const newSegs = next.split("/").filter(Boolean);
  if (oldSegs.join("/") === newSegs.join("/")) return raw;

  /* Ghép lại theo cấu trúc gốc để giữ nguyên `//`, slash cuối, v.v. */
  let i = 0;
  const rebuilt = pathPart
    .split("/")
    .map((p) => (p === "" ? p : newSegs[i++]))
    .join("/");
  return rebuilt + rest;
}

function rewriteLiterals() {
  const files = git("ls-files")
    .split("\n")
    .map((f) => f.trim())
    .filter(Boolean)
    .filter((f) => /\.(ts|tsx|js|jsx|mjs)$/.test(f))
    .filter((f) => !SKIP_FILES.test(f))
    .filter((f) => !f.startsWith("app/admin/") && !f.startsWith("app/api/admin/"));

  let changedFiles = 0;
  let changedLiterals = 0;
  const report = [];

  for (const file of files) {
    const before = readFileSync(file, "utf8");
    const seen = [];
    /* Literal path: mở nháy/backtick + "/" ngay sau. Cho phép `${...}` bên trong. */
    const after = before.replace(
      /(["'`])(\/(?:[A-Za-z0-9\-_./[\]:*]|\$\{[^}]*\})*)/g,
      (whole, quote, path) => {
        const next = translateLiteral(path);
        if (next === path) return whole;
        seen.push([path, next]);
        return quote + next;
      },
    );

    if (after === before) continue;
    changedFiles += 1;
    changedLiterals += seen.length;
    report.push({ file, seen });
    if (DO_LITERALS) writeFileSync(file, after, "utf8");
  }

  console.log(`\n=== URL literal: ${changedLiterals} literal trong ${changedFiles} file ===`);
  for (const r of report) {
    console.log(`\n${r.file}`);
    const uniq = new Map(r.seen.map(([a, b]) => [a, b]));
    for (const [a, b] of uniq) console.log(`  ${a}\n    → ${b}`);
  }
  if (DO_LITERALS) console.log(`\nĐã ghi ${changedFiles} file.`);
}

if (DRY || DO_FOLDERS) renameFolders();
if (DRY || DO_LITERALS) rewriteLiterals();
if (DRY) console.log("\n(dry-run — chưa ghi gì. Dùng --folders rồi --literals.)");
