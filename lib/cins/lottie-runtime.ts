const DOTLOTTIE_WC_SRC =
  "https://unpkg.com/@lottiefiles/dotlottie-wc@0.7.1/dist/dotlottie-wc.js";

let loadPromise: Promise<void> | null = null;

/** Load `<dotlottie-wc>` web component một lần (CDN, không thêm npm dep). */
export function ensureDotLottieWc(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (customElements.get("dotlottie-wc")) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[data-cins-dotlottie-wc]`,
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Không tải được Lottie player.")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.type = "module";
    script.src = DOTLOTTIE_WC_SRC;
    script.dataset.cinsDotlottieWc = "1";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Không tải được Lottie player."));
    document.head.appendChild(script);
  }).catch((err) => {
    loadPromise = null;
    throw err;
  });

  return loadPromise;
}
