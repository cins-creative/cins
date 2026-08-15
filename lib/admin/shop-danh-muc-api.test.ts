/**
 * Unit test path API admin danh mục — chạy:
 *   node --experimental-strip-types --test lib/admin/shop-danh-muc-api.test.ts
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { rewriteLegacyPath } from "../navigation/legacy-url-map.ts";
import {
  ADMIN_SHOP_DANH_MUC_API,
  ADMIN_SHOP_DANH_MUC_HANG_CHO_API,
  adminShopDanhMucItemApi,
} from "./shop-danh-muc-api.ts";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

describe("admin shop danh mục API paths", () => {
  it("giữ tiếng Việt — middleware không 308 /api/admin/*", () => {
    assert.equal(rewriteLegacyPath(ADMIN_SHOP_DANH_MUC_API), null);
    assert.equal(rewriteLegacyPath(ADMIN_SHOP_DANH_MUC_HANG_CHO_API), null);
    assert.equal(rewriteLegacyPath("/api/admin/shop/catalog/queue"), null);
    assert.equal(rewriteLegacyPath("/admin/danh-muc"), null);
  });

  it("trỏ đúng file route tiếng Việt", () => {
    assert.equal(ADMIN_SHOP_DANH_MUC_API, "/api/admin/shop/danh-muc");
    assert.equal(
      ADMIN_SHOP_DANH_MUC_HANG_CHO_API,
      "/api/admin/shop/danh-muc/hang-cho",
    );
    assert.equal(
      adminShopDanhMucItemApi("abc/def"),
      "/api/admin/shop/danh-muc/abc%2Fdef",
    );
    assert.ok(
      existsSync(path.join(repoRoot, "app/api/admin/shop/danh-muc/route.ts")),
    );
    assert.ok(
      existsSync(
        path.join(repoRoot, "app/api/admin/shop/danh-muc/hang-cho/route.ts"),
      ),
    );
    assert.ok(
      existsSync(
        path.join(repoRoot, "app/api/admin/shop/danh-muc/[id]/route.ts"),
      ),
    );
    assert.equal(
      existsSync(path.join(repoRoot, "app/api/admin/shop/catalog")),
      false,
    );
  });

  it("UI admin không gọi path tiếng Anh /catalog", () => {
    const screen = readFileSync(
      path.join(repoRoot, "components/admin/AdminShopDanhMucScreen.tsx"),
      "utf8",
    );
    assert.equal(screen.includes("/api/admin/shop/catalog"), false);
    assert.match(screen, /ADMIN_SHOP_DANH_MUC_HANG_CHO_API/);
    assert.match(screen, /adminShopDanhMucItemApi/);
  });
});
