/**
 * Stub thay cho @cloudflare/realtimekit* trong compilation SERVER (production).
 *
 * RealtimeKit chỉ chạy được trên browser (WebRTC, web component Stencil, HLS/DRM).
 * Mọi call site đều `dynamic(..., { ssr: false })` nên server không bao giờ render,
 * nhưng webpack vẫn emit ~2.8MB chunk vào `.next/server/chunks`, và OpenNext buộc
 * phải bundle toàn bộ `.next/server` vào Worker (Workers không có filesystem).
 *
 * Alias sang stub này ở `next.config.ts` (chỉ khi `isServer && !dev`).
 */

function StubComponent() {
  return null;
}

const known = {
  RealtimeKitProvider: (props) => (props && props.children) || null,
  useRealtimeKitClient: () => [null, () => {}],
  useRealtimeKitMeeting: () => null,
  useRealtimeKitSelector: () => undefined,
};

module.exports = new Proxy(known, {
  get(target, prop) {
    /* Buộc webpack coi đây là CJS → named import đọc property lúc runtime,
       không cảnh báo "export not found" lúc build. */
    if (prop === "__esModule") return false;
    if (prop === "default") return module.exports;
    if (prop in target) return target[prop];
    return StubComponent;
  },
  has() {
    return true;
  },
});
