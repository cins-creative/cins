/**
 * Kiểm thử thuần (không cần framework) cho logic quyết định vuốt drawer
 * cột trái–phải World Journey.
 *
 *   node --experimental-strip-types scripts/test-aside-swipe.mts
 *
 * Repo chưa có test runner; file này chạy độc lập bằng Node ≥ 22 để bảo vệ
 * hồi quy cho `resolveAsideSwipe` / `isHorizontalSwipe`.
 */
import assert from "node:assert/strict";

import {
  isHorizontalSwipe,
  resolveAsideSwipe,
  WJ_ASIDE_SWIPE_MIN_DX,
  type OpenAside,
} from "../lib/cins/worldJourneyAsideSwipe.ts";

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`  ok - ${name}`);
}

const mobile = { canOpenLeft: true, canOpenRight: true } as const;
const tablet = { canOpenLeft: false, canOpenRight: true } as const;
const desktop = { canOpenLeft: false, canOpenRight: false } as const;

function swipe(
  dx: number,
  open: OpenAside,
  caps: { canOpenLeft: boolean; canOpenRight: boolean },
  lockedHorizontal = true,
): OpenAside | undefined {
  return resolveAsideSwipe({ dx, open, lockedHorizontal, ...caps });
}

console.log("isHorizontalSwipe");
check("ngang rõ ràng → true", () => {
  assert.equal(isHorizontalSwipe(80, 10), true);
});
check("dọc rõ ràng → false", () => {
  assert.equal(isHorizontalSwipe(10, 80), false);
});
check("chéo (dx ~ dy) → false", () => {
  assert.equal(isHorizontalSwipe(50, 50), false);
});

console.log("resolveAsideSwipe · mở từ giữa màn hình (không cần mép)");
check("vuốt phải trên mobile → mở trái", () => {
  assert.equal(swipe(120, null, mobile), "left");
});
check("vuốt trái trên mobile → mở phải", () => {
  assert.equal(swipe(-120, null, mobile), "right");
});
check("vuốt phải trên tablet (cột trái in-flow) → không mở", () => {
  assert.equal(swipe(120, null, tablet), undefined);
});
check("vuốt trái trên tablet → mở phải", () => {
  assert.equal(swipe(-120, null, tablet), "right");
});
check("desktop → không mở gì", () => {
  assert.equal(swipe(120, null, desktop), undefined);
  assert.equal(swipe(-120, null, desktop), undefined);
});

console.log("resolveAsideSwipe · đóng khi vuốt ngược");
check("đang mở trái, vuốt trái → đóng", () => {
  assert.equal(swipe(-120, "left", mobile), null);
});
check("đang mở trái, vuốt phải → giữ nguyên", () => {
  assert.equal(swipe(120, "left", mobile), undefined);
});
check("đang mở phải, vuốt phải → đóng", () => {
  assert.equal(swipe(120, "right", mobile), null);
});
check("đang mở phải, vuốt trái → giữ nguyên", () => {
  assert.equal(swipe(-120, "right", mobile), undefined);
});

console.log("resolveAsideSwipe · ngưỡng & khóa hướng");
check("dưới ngưỡng dx → không hành động", () => {
  assert.equal(swipe(WJ_ASIDE_SWIPE_MIN_DX - 1, null, mobile), undefined);
});
check("đủ ngưỡng dx → mở", () => {
  assert.equal(swipe(WJ_ASIDE_SWIPE_MIN_DX + 1, null, mobile), "left");
});
check("chưa khóa hướng ngang → bỏ qua (coi như cuộn dọc)", () => {
  assert.equal(swipe(200, null, mobile, false), undefined);
});

console.log(`\nAll ${passed} assertions passed.`);
