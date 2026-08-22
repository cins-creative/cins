/**
 * Park / restore thư mục `app/` theo bề mặt deploy.
 *  - web: ẩn `admin` + `api/admin` khỏi bundle cins.vn
 *  - manage: chỉ giữ admin, auth, login (+ api tương ứng)
 * Luôn gọi restore trong finally — workspace không được để dở.
 */
import {
  cpSync,
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
const STUB_MARK = "/* CINS_SURFACE_STUB */";

/** Chỉ park cụm nặng admin không import trực tiếp — tránh gãy CSS/action chéo. */
const MANAGE_PARK_APP_DIRS = new Set([
  "academy",
  "university",
  "majors",
  "guidance",
  "seller",
  "shopping",
  "community",
  "studio",
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
const MANAGE_KEEP_API_DIRS = new Set(["admin", "auth"]);
const MANAGE_KEEP_APP_FILES = new Set([
  "layout.tsx",
  "loading.tsx",
  "error.tsx",
  "not-found.tsx",
  "robots.ts",
]);

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

function restoreDir(parkedDir, destDir) {
  let names;
  try {
    names = readdirSync(parkedDir);
  } catch {
    return;
  }
  mkdirSync(destDir, { recursive: true });
  for (const name of names) {
    const dest = join(destDir, name);
    rmSync(dest, { recursive: true, force: true });
    renameSync(join(parkedDir, name), dest);
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
  restoreDir(join(PARK, "app"), APP);
  restoreDir(join(PARK, "api"), API);
  removeManageStubPage();
}

const WEB_KEEP_ADMIN_FILES = [
  ["actions.ts"],
  ["huong-dan", "actions.ts"],
];

export function parkWeb() {
  ensureParkRoot();
  parkEntry(join(APP, "admin"), join(PARK, "app"), "admin");
  parkEntry(join(API, "admin"), join(PARK, "api"), "admin");
  /* Server actions public UI vẫn import — không giữ page/layout (tránh compile /admin). */
  for (const parts of WEB_KEEP_ADMIN_FILES) {
    const from = join(PARK, "app", "admin", ...parts);
    const destDir = join(APP, "admin", ...parts.slice(0, -1));
    mkdirSync(destDir, { recursive: true });
    cpSync(from, join(APP, "admin", ...parts));
  }
}

export function parkManage() {
  ensureParkRoot();
  const appPark = join(PARK, "app");
  const apiPark = join(PARK, "api");

  for (const name of readdirSync(APP, { withFileTypes: true })) {
    if (name.isDirectory()) {
      if (!MANAGE_PARK_APP_DIRS.has(name.name)) continue;
      parkEntry(join(APP, name.name), appPark, name.name);
      continue;
    }
    if (name.name.endsWith(".css")) continue;
    if (MANAGE_KEEP_APP_FILES.has(name.name)) continue;
    parkEntry(join(APP, name.name), appPark, name.name);
  }

  for (const name of readdirSync(API, { withFileTypes: true })) {
    if (!name.isDirectory()) continue;
    if (MANAGE_KEEP_API_DIRS.has(name.name)) continue;
    parkEntry(join(API, name.name), apiPark, name.name);
  }

  writeFileSync(
    join(APP, "page.tsx"),
    `${STUB_MARK}\nimport { redirect } from "next/navigation";\n\nexport default function ManageHome() {\n  redirect("/admin");\n}\n`,
    "utf8",
  );
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
