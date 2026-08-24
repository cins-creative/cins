/**
 * Park / restore thư mục `app/` theo bề mặt deploy.
 *  - web: ẩn admin + seller + subtree manage + API quản lý khỏi bundle cins.vn
 *  - manage: giữ admin, seller, subtree manage, API quản lý; ẩn trang công khai nặng
 * Luôn gọi restore trong finally — workspace không được để dở.
 */
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const APP = join(ROOT, "app");
const API = join(APP, "api");
const PARK = join(ROOT, ".cins-surface-park");
const MANIFEST = join(PARK, "manifest.json");
const STUB_MARK = "/* CINS_SURFACE_STUB */";

/** Park cả cây khỏi manage — trừ seller / academy / studio / university (xử lý nested). */
const MANAGE_PARK_APP_DIRS = new Set([
  "majors",
  "guidance",
  "shopping",
  "community",
  "events",
  "find-courses",
  "jobs",
  "careers",
  "organizations",
  "chat",
  "create-organization",
  "fandom",
  "explore",
  "draft",
  "about",
  "account",
  "software",
  "support",
  "terms",
  "policies",
  "onboarding",
  "keyword",
  "s",
]);

const MANAGE_KEEP_API_DIRS = new Set([
  "admin",
  "auth",
  "academy",
  "studio",
  "shop",
  "org",
  "user",
]);

const MANAGE_KEEP_APP_FILES = new Set([
  "layout.tsx",
  "loading.tsx",
  "error.tsx",
  "not-found.tsx",
  "robots.ts",
]);

const ORG_APP_DIRS = ["academy", "studio", "university"];

const WEB_KEEP_ADMIN_FILES = [
  ["actions.ts"],
  ["huong-dan", "actions.ts"],
];

/** @typedef {{ kind: "app" | "api", parts: string[] }} ParkItem */

/** @type {ParkItem[]} */
let manifest = [];

function ensureParkRoot() {
  mkdirSync(PARK, { recursive: true });
}

function parkEntry(from, destDir, name) {
  mkdirSync(destDir, { recursive: true });
  const dest = join(destDir, name);
  try {
    renameSync(from, dest);
  } catch (err) {
    if (err.code !== "EPERM" && err.code !== "EACCES" && err.code !== "EXDEV") {
      throw err;
    }
    cpSync(from, dest, { recursive: true });
    rmSync(from, { recursive: true, force: true });
  }
}

/**
 * @param {"app" | "api"} kind
 * @param {string[]} parts
 */
function parkRel(kind, parts) {
  const root = kind === "app" ? APP : API;
  const from = join(root, ...parts);
  if (!existsSync(from)) return;
  const destDir = join(PARK, kind, ...parts.slice(0, -1));
  parkEntry(from, destDir, parts[parts.length - 1]);
  manifest.push({ kind, parts });
}

function writeManifest() {
  writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2), "utf8");
}

function restoreFromManifest() {
  if (!existsSync(MANIFEST)) return;
  /** @type {ParkItem[]} */
  const items = JSON.parse(readFileSync(MANIFEST, "utf8"));
  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i];
    const destRoot = item.kind === "app" ? APP : API;
    const destDir = join(destRoot, ...item.parts.slice(0, -1));
    const dest = join(destDir, item.parts[item.parts.length - 1]);
    const parked = join(PARK, item.kind, ...item.parts);
    if (!existsSync(parked)) continue;
    mkdirSync(destDir, { recursive: true });
    rmSync(dest, { recursive: true, force: true });
    try {
      renameSync(parked, dest);
    } catch (err) {
      if (err.code !== "EPERM" && err.code !== "EACCES" && err.code !== "EXDEV") {
        throw err;
      }
      cpSync(parked, dest, { recursive: true });
      rmSync(parked, { recursive: true, force: true });
    }
  }
}

function restoreDir(parkedDir, destDir) {
  let names;
  try {
    names = readdirSync(parkedDir);
  } catch {
    return;
  }
  mkdirSync(destDir, { recursive: true });
  for (const name of names) {
    if (name === "manifest.json") continue;
    const dest = join(destDir, name);
    const parked = join(parkedDir, name);
    if (!existsSync(parked)) continue;
    rmSync(dest, { recursive: true, force: true });
    renameSync(parked, dest);
  }
}

function removeManageStubPage() {
  const stubPage = join(APP, "page.tsx");
  try {
    const text = readFileSync(stubPage, "utf8");
    if (text.includes("CINS_SURFACE_STUB")) {
      rmSync(stubPage, { force: true });
    }
  } catch {
    /* chưa có stub */
  }
}

export function restore() {
  restoreFromManifest();
  /* Fallback bản park cũ (không manifest). */
  if (!existsSync(MANIFEST)) {
    restoreDir(join(PARK, "app"), APP);
    restoreDir(join(PARK, "api"), API);
  }
  removeManageStubPage();
  rmSync(PARK, { recursive: true, force: true });
}

function copyKept(kind, fromParts, destParts) {
  const from = join(PARK, kind, ...fromParts);
  if (!existsSync(from)) return;
  const destDir = join(kind === "app" ? APP : API, ...destParts.slice(0, -1));
  mkdirSync(destDir, { recursive: true });
  cpSync(from, join(kind === "app" ? APP : API, ...destParts), {
    recursive: true,
  });
}

export function parkWeb() {
  ensureParkRoot();
  manifest = [];

  parkRel("app", ["admin"]);
  parkRel("api", ["admin"]);
  for (const parts of WEB_KEEP_ADMIN_FILES) {
    copyKept("app", ["admin", ...parts], ["admin", ...parts]);
  }

  parkRel("app", ["seller"]);
  parkRel("api", ["user", "seller"]);

  for (const org of ORG_APP_DIRS) {
    parkRel("app", [org, "[slug]", "manage"]);
  }

  parkRel("api", ["academy"]);
  copyKept("api", ["academy", "preview"], ["academy", "preview"]);
  /* Tab/chi tiết khóa trên trang public — GET (+ CRUD từ trang CSĐT). */
  copyKept(
    "api",
    ["academy", "[id]", "courses"],
    ["academy", "[id]", "courses"],
  );

  parkRel("api", ["studio", "[id]"]);

  writeManifest();
}

export function parkManage() {
  ensureParkRoot();
  manifest = [];

  for (const name of readdirSync(APP, { withFileTypes: true })) {
    if (name.isDirectory()) {
      if (ORG_APP_DIRS.includes(name.name)) {
        parkRel("app", [name.name, "[slug]", "(public)"]);
        parkRel("app", [name.name, "[slug]", "opengraph-image.tsx"]);
        parkRel("app", [name.name, "[slug]", "twitter-image.tsx"]);
        continue;
      }
      if (name.name === "[slug]") {
        parkRel("app", ["[slug]"]);
        /* Seller/admin compose + preview import CSS/actions trong journey. */
        for (const file of [
          "actions.ts",
          "comment-actions.ts",
          "visibility-actions.ts",
          "image-grid.css",
          "journey.css",
        ]) {
          copyKept(
            "app",
            ["[slug]", "journey", file],
            ["[slug]", "journey", file],
          );
        }
        copyKept(
          "app",
          ["[slug]", "p", "new", "editor.css"],
          ["[slug]", "p", "new", "editor.css"],
        );
        copyKept(
          "app",
          ["[slug]", "p", "[postSlug]", "post-page.css"],
          ["[slug]", "p", "[postSlug]", "post-page.css"],
        );
        continue;
      }
      if (!MANAGE_PARK_APP_DIRS.has(name.name)) continue;
      parkRel("app", [name.name]);
    }
    if (name.name.endsWith(".css")) continue;
    if (MANAGE_KEEP_APP_FILES.has(name.name)) continue;
    parkRel("app", [name.name]);
  }

  for (const name of readdirSync(API, { withFileTypes: true })) {
    if (!name.isDirectory()) continue;
    if (MANAGE_KEEP_API_DIRS.has(name.name)) continue;
    parkRel("api", [name.name]);
  }

  writeFileSync(
    join(APP, "page.tsx"),
    `${STUB_MARK}\nimport { redirect } from "next/navigation";\n\nexport default function ManageHome() {\n  redirect("/admin");\n}\n`,
    "utf8",
  );

  writeManifest();
}

const invokedDirectly = /cins-surface\.mjs$/i.test(
  (process.argv[1] ?? "").replace(/\\/g, "/"),
);
if (invokedDirectly) {
  const cmd = process.argv[2];
  if (cmd === "web") parkWeb();
  else if (cmd === "manage") parkManage();
  else if (cmd === "restore") restore();
  else {
    console.error("Usage: node scripts/cins-surface.mjs <web|manage|restore>");
    process.exit(1);
  }
}
