/** Path mời nhóm — client + server, không phụ thuộc service role. */
const INVITE_PATH_RE = /^\/chat\/(?:groups\/invite|nhom\/moi)\/([^/]+)\/?$/i;

export function parseGroupInviteCodeFromUrl(raw: string): string | null {
  try {
    const path = new URL(raw).pathname;
    const match = path.match(INVITE_PATH_RE);
    const code = match?.[1] ? decodeURIComponent(match[1]).trim() : "";
    return code || null;
  } catch {
    return null;
  }
}

export function isGroupInviteUrl(raw: string): boolean {
  return Boolean(parseGroupInviteCodeFromUrl(raw));
}
