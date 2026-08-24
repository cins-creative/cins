/**
 * Universal Links (iOS) + App Links (Android) — R16 / A5.
 *
 * Env (web `.env` / Cloudflare):
 *   APPLE_TEAM_ID=XXXXXXXXXX          — 10 ký tự Apple Developer Team ID
 *   ANDROID_CERT_SHA256=AA:BB:...     — fingerprint signing (EAS/Play), nhiều cái cách nhau bằng dấu phẩy
 *
 * Placeholder rỗng vẫn trả JSON hợp lệ — điền sau khi có Team ID / SHA256 từ EAS.
 */

export const APP_PACKAGE_ID = "vn.cins.app";

/** Path prefix app mở (khớp `lib/navigation.ts` ALLOWED_PREFIXES). */
export const APP_LINK_PATHS = [
  "/chat*",
  "/explore*",
  "/shop*",
  "/notifications*",
  "/account*",
  "/admin*",
  "/share*",
  "/search*",
  "/seller*",
  "/post*",
  "/profile*",
  "/gallery*",
  "/academy*",
  "/university*",
  "/community*",
  "/storybook*",
] as const;

function parseSha256List(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/[,;\s]+/)
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
}

export function buildAppleAppSiteAssociation() {
  const teamId = process.env.APPLE_TEAM_ID?.trim() ?? "";
  const appID = teamId
    ? `${teamId}.${APP_PACKAGE_ID}`
    : `TEAMID.${APP_PACKAGE_ID}`;

  return {
    applinks: {
      apps: [] as string[],
      details: [
        {
          appID,
          paths: [...APP_LINK_PATHS],
        },
      ],
    },
    webcredentials: {
      apps: teamId ? [`${teamId}.${APP_PACKAGE_ID}`] : [],
    },
  };
}

export function buildAssetLinks() {
  const fingerprints = parseSha256List(process.env.ANDROID_CERT_SHA256);
  /* Placeholder khi chưa có cert — file vẫn 200 để smoke; App Link verify fail đến khi điền. */
  const sha256 =
    fingerprints.length > 0
      ? fingerprints
      : ["00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00"];

  return [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: APP_PACKAGE_ID,
        sha256_cert_fingerprints: sha256,
      },
    },
  ];
}

export const WELL_KNOWN_CACHE =
  "public, max-age=3600, stale-while-revalidate=86400";
