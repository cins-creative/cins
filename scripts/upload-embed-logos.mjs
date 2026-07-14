/**
 * Resize logos từ Downloads/Logo → 64×64 PNG, upload Cloudflare Images,
 * ghi tmp-embed-logo-urls.json + public/assets/embed-platforms/*.png
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function loadEnvLocal() {
  const envPath = path.join(root, ".env.local");
  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2] ?? "";
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvLocal();

const account = process.env.CLOUDFLARE_ACCOUNT_ID;
const token = process.env.CLOUDFLARE_IMAGES_API_TOKEN;
const hash = process.env.NEXT_PUBLIC_CF_IMAGES_ACCOUNT_HASH;
if (!account || !token || !hash) {
  console.error("Missing CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_IMAGES_API_TOKEN / NEXT_PUBLIC_CF_IMAGES_ACCOUNT_HASH");
  process.exit(1);
}

const logoDir = "C:/Users/DELL/Downloads/Logo";
const outDir = path.join(root, "public/assets/embed-platforms");
fs.mkdirSync(outDir, { recursive: true });

const map = [
  ["Youtube.png", "youtube"],
  ["Vimeo.png", "vimeo"],
  ["Figma.png", "figma"],
  ["Canva logo.png", "canva"],
  ["../sketchfab.png", "sketchfab"],
  ["Spline 3d.jpg", "spline"],
  ["PlayCanvas.png", "playcanvas"],
  ["Rive logo.png", "rive"],
  ["lottiefiles.jpg", "lottie"],
  ["Codepen.png", "codepen"],
  ["soundclouds.jpg", "soundcloud"],
  ["Framer.png", "framer"],
];

const results = {};

for (const [srcName, id] of map) {
  const src = path.join(logoDir, srcName);
  if (!fs.existsSync(src)) {
    console.error("missing", srcName);
    continue;
  }

  const pngBuf = await sharp(src)
    .resize(64, 64, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  const localPath = path.join(outDir, `${id}.png`);
  fs.writeFileSync(localPath, pngBuf);
  console.log("resized", id, pngBuf.length, "bytes");

  const imageId = `cins-embed-logo-${id}`;
  await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${account}/images/v1/${imageId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    },
  ).catch(() => null);

  const form = new FormData();
  form.append(
    "file",
    new Blob([pngBuf], { type: "image/png" }),
    `embed-${id}.png`,
  );
  form.append("id", imageId);
  form.append(
    "metadata",
    JSON.stringify({ kind: "embed-platform-logo", platform: id }),
  );

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${account}/images/v1`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    },
  );
  const json = await res.json();
  if (!json.success) {
    console.error("upload fail", id, JSON.stringify(json.errors));
    continue;
  }

  const url = `https://imagedelivery.net/${hash}/${json.result.id}/public`;
  results[id] = { imageId: json.result.id, url };
  console.log("uploaded", id, url);
}

const outJson = path.join(root, "tmp-embed-logo-urls.json");
fs.writeFileSync(outJson, JSON.stringify(results, null, 2));
console.log("DONE", Object.keys(results).length, "→", outJson);
