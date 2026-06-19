/** Sidebar + topbar home v2 — bỏ hero/sections phía dưới. */
export function extractHomeV2Shell(markup: string): string {
  const sidebarMarker = '<aside class="sidebar"';
  const topbarMarker = '<nav class="topbar" id="topbar">';
  const topbarStart = markup.indexOf(topbarMarker);
  if (topbarStart === -1) return markup;
  const topbarEnd = markup.indexOf("</nav>", topbarStart);
  if (topbarEnd === -1) return markup;
  const shellEnd = topbarEnd + "</nav>".length;
  const sidebarStart = markup.indexOf(sidebarMarker);
  const start = sidebarStart === -1 ? topbarStart : sidebarStart;
  return markup.slice(start, shellEnd);
}
