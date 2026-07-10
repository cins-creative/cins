import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const input = process.argv[2];
if (!input) {
  console.error("Usage: node scripts/read-rive-artboard-browser.mjs <path-or-url>");
  process.exit(1);
}

let buffer;
let label = input;
if (input.startsWith("http://") || input.startsWith("https://")) {
  const res = await fetch(input);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  buffer = Buffer.from(await res.arrayBuffer());
} else {
  buffer = fs.readFileSync(input);
  label = path.basename(input);
}

const base64 = buffer.toString("base64");
const riveJs = fs.readFileSync(
  path.join("node_modules", "@rive-app", "canvas", "rive.js"),
  "utf8",
);

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto("about:blank");
await page.setContent(`<!doctype html><html><body><canvas id="c"></canvas></body></html>`);
await page.addScriptTag({ content: riveJs });

const result = await page.evaluate(async (b64) => {
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const canvas = document.getElementById("c");
  return await new Promise((resolve, reject) => {
    const r = new rive.Rive({
      buffer: bytes.buffer,
      canvas,
      autoplay: false,
      onLoad: () => {
        try {
          r.resetArtboardSize();
          resolve({
            artboardWidth: r.artboardWidth,
            artboardHeight: r.artboardHeight,
            ratio: r.artboardWidth / r.artboardHeight,
          });
        } catch (e) {
          reject(String(e));
        } finally {
          r.cleanup();
        }
      },
      onLoadError: (e) => reject(String(e)),
    });
  });
}, base64);

console.log(JSON.stringify({ file: label, ...result }, null, 2));
await browser.close();
