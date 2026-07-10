import { JSDOM } from "jsdom";
import { createCanvas, Image } from "canvas";
import pkg from "@rive-app/canvas";
import fs from "fs";

const { Rive, Layout, Fit, Alignment } = pkg;

function setupDom() {
  const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.HTMLCanvasElement = createCanvas(1, 1).constructor;
  globalThis.Image = Image;
}

function readArtboardFromBuffer(buffer, label) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Rive load timeout")), 15000);
    const canvas = createCanvas(800, 600);
    const rive = new Rive({
      buffer,
      canvas,
      layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
      autoplay: false,
      onLoad: () => {
        clearTimeout(timer);
        try {
          rive.resetArtboardSize();
          const w = rive.artboardWidth;
          const h = rive.artboardHeight;
          resolve({
            file: label,
            artboardWidth: w,
            artboardHeight: h,
            ratio: w / h,
            ratioDecimal: Number((w / h).toFixed(6)),
          });
        } catch (err) {
          reject(err);
        } finally {
          rive.cleanup();
        }
      },
      onLoadError: (err) => {
        clearTimeout(timer);
        reject(err);
      },
    });
  });
}

setupDom();

const input = process.argv[2];
if (!input) {
  console.error("Usage: node scripts/read-rive-artboard.mjs <path-or-url>");
  process.exit(1);
}

let buffer;
let label = input;
if (input.startsWith("http://") || input.startsWith("https://")) {
  const res = await fetch(input);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  buffer = await res.arrayBuffer();
} else {
  buffer = fs.readFileSync(input).buffer;
}

const result = await readArtboardFromBuffer(buffer, label);
console.log(JSON.stringify(result, null, 2));
process.exit(0);
