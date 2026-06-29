/**
 * Pre-flight verification for the Cloudflare Images migration.
 * - Confirms old & new account credentials work via the CF API.
 * - Confirms the delivery account hash for each account.
 * - Reports image counts in both accounts.
 * Usage: node scripts/cf-migrate/verify.mjs
 */
import { loadConfig, cfImageStats, cfListImages, downloadImageBlob } from "./lib.mjs";

const cfg = loadConfig();

function mask(v) {
  if (!v) return "(missing)";
  if (v.length <= 8) return v;
  return `${v.slice(0, 6)}…${v.slice(-4)}`;
}

console.log("== Config ==");
console.log("DATABASE_URL:", cfg.databaseUrl ? "(present)" : "(MISSING)");
console.log("OLD accountId:", cfg.old.accountId, "token:", mask(cfg.old.token), "hash:", cfg.old.hash);
console.log("NEW accountId:", cfg.new.accountId, "token:", mask(cfg.new.token), "hash:", cfg.new.hash);
console.log("");

for (const [label, acct] of [["OLD", cfg.old], ["NEW", cfg.new]]) {
  try {
    const stats = await cfImageStats(acct);
    console.log(`== ${label} account API OK ==`);
    console.log(`   count:`, JSON.stringify(stats.count));
    const page1 = await cfListImages(acct, { page: 1, perPage: 3 });
    const sample = page1.images?.[0];
    if (sample) {
      console.log(`   sample id:`, sample.id);
      console.log(`   sample variant url:`, sample.variants?.[0]);
    }
  } catch (err) {
    console.error(`== ${label} account API FAILED ==`, err.message);
  }
  console.log("");
}

// Confirm we can actually download an old image via the delivery hash.
try {
  const page1 = await cfListImages(cfg.old, { page: 1, perPage: 1 });
  const sample = page1.images?.[0];
  if (sample) {
    const dl = await downloadImageBlob(cfg.old.hash, sample.id, [
      "public",
      "thumbnail",
    ]);
    console.log("== OLD delivery download test ==");
    console.log(
      dl.ok
        ? `   OK: ${dl.bytes.length} bytes, ${dl.contentType}, variant=${dl.variant}`
        : `   FAILED: ${dl.error}`,
    );
  }
} catch (err) {
  console.error("download test failed:", err.message);
}
