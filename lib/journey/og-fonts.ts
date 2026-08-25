import { readFile } from "node:fs/promises";
import { join } from "node:path";
import "server-only";

type OgFont = {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 600 | 700;
  style: "normal";
};

const FONT_FILES: Array<{ weight: 400 | 600 | 700; rel: string }> = [
  { weight: 400, rel: "lib/journey/fonts/BeVietnamPro-Regular.ttf" },
  { weight: 600, rel: "lib/journey/fonts/BeVietnamPro-SemiBold.ttf" },
  { weight: 700, rel: "lib/journey/fonts/BeVietnamPro-Bold.ttf" },
];

function toArrayBuffer(buf: Buffer): ArrayBuffer {
  const copy = new Uint8Array(buf.byteLength);
  copy.set(buf);
  return copy.buffer;
}

let fontsPromise: Promise<OgFont[]> | null = null;

export function loadOgFonts(): Promise<OgFont[]> {
  if (!fontsPromise) {
    fontsPromise = Promise.all(
      FONT_FILES.map(async ({ weight, rel }) => {
        const buf = await readFile(join(process.cwd(), rel));
        return {
          name: "Be Vietnam Pro",
          data: toArrayBuffer(buf),
          weight,
          style: "normal" as const,
        };
      }),
    );
  }
  return fontsPromise;
}
