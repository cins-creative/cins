import { RuntimeLoader } from "@rive-app/react-canvas";

let configured = false;

/** Self-host WASM — tránh CDN unpkg/jsdelivr fail trong dev/prod. */
export function ensureRiveRuntime(): void {
  if (configured || typeof window === "undefined") return;
  configured = true;
  RuntimeLoader.setWasmUrl("/rive/rive.wasm");
  RuntimeLoader.setWasmFallbackUrl("/rive/rive_fallback.wasm");
}
