/** Tách markup home v2 guest: sidebar + topbar | phần nội dung chính (hero → footer). */
export function splitGuestHomeMarkup(markup: string): {
  chrome: string;
  main: string;
} {
  const topbarStart = markup.indexOf('<nav class="topbar"');
  if (topbarStart === -1) {
    return { chrome: markup, main: "" };
  }

  const navEnd = markup.indexOf("</nav>", topbarStart);
  if (navEnd === -1) {
    return { chrome: markup, main: "" };
  }

  const splitAt = navEnd + "</nav>".length;
  return {
    chrome: markup.slice(0, splitAt),
    main: markup.slice(splitAt),
  };
}
