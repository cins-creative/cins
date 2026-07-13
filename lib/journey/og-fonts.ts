import "server-only";

type OgFont = {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 600 | 700;
  style: "normal";
};

const FONT_SOURCES: Array<{ weight: 400 | 600 | 700; url: string }> = [
  {
    weight: 400,
    url: "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/bevietnampro/BeVietnamPro-Regular.ttf",
  },
  {
    weight: 600,
    url: "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/bevietnampro/BeVietnamPro-SemiBold.ttf",
  },
  {
    weight: 700,
    url: "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/bevietnampro/BeVietnamPro-Bold.ttf",
  },
];

let fontsPromise: Promise<OgFont[]> | null = null;

export function loadOgFonts(): Promise<OgFont[]> {
  if (!fontsPromise) {
    fontsPromise = Promise.all(
      FONT_SOURCES.map(async ({ weight, url }) => {
        const res = await fetch(url, { next: { revalidate: 60 * 60 * 24 * 7 } });
        if (!res.ok) {
          throw new Error(`OG font fetch failed (${weight}): ${res.status}`);
        }
        const data = await res.arrayBuffer();
        return {
          name: "Be Vietnam Pro",
          data,
          weight,
          style: "normal" as const,
        };
      }),
    );
  }
  return fontsPromise;
}
