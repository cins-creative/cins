import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { kAnonCount, K_ANON_NGUONG } from "./su-kien-constants.ts";

describe("kAnonCount", () => {
  it("ẩn dưới ngưỡng 5", () => {
    assert.equal(K_ANON_NGUONG, 5);
    assert.equal(kAnonCount(0), 0);
    assert.equal(kAnonCount(4), 0);
    assert.equal(kAnonCount(4.9), 0);
  });
  it("giữ nguyên từ 5 trở lên", () => {
    assert.equal(kAnonCount(5), 5);
    assert.equal(kAnonCount(12), 12);
  });
  it("NaN / nullish → 0", () => {
    assert.equal(kAnonCount(Number.NaN), 0);
  });
});
