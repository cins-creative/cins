import fs from "fs";

const listing = fs.readFileSync(
  "c:/Users/DELL/Desktop/OpenDesign/open-design/.od/projects/e82e3061-bb75-444e-ad56-6177ee0ce39c/cins-truong-listing.html",
  "utf8",
);
const detail = fs.readFileSync(
  "c:/Users/DELL/Desktop/OpenDesign/open-design/.od/projects/e82e3061-bb75-444e-ad56-6177ee0ce39c/cins-truong-chi-tiet-v2.html",
  "utf8",
);

function extractCss(html) {
  const m = html.match(/<style>([\s\S]*?)<\/style>/);
  if (!m) return "";
  return m[1]
    .replace(/:root\s*\{[\s\S]*?\}\s*/, "")
    .replace(/^html\s*\{[\s\S]*?\}\s*/m, "")
    .replace(/^body\s*\{[\s\S]*?\}\s*/m, "")
    .replace(/\.body\b/g, ".detail-body")
    .replace(/nav\.top/g, ".tdh-nav-top");
}

const header = `/* CINs — Trường đại học listing + chi tiết (OpenDesign v2) */

.tdh-page {
  --tdh-bg: var(--neutral-50, #f4f5f8);
  --tdh-surface: var(--bg-surface, #fff);
  background: var(--tdh-bg);
  color: var(--ink-body);
  font-size: 15px;
  line-height: 1.55;
  min-height: 100%;
}

.tdh-page a {
  color: inherit;
  text-decoration: none;
}

`;

const merged = header + extractCss(listing) + "\n\n" + extractCss(detail);
fs.writeFileSync("app/cins-truong-dai-hoc.css", merged);
console.log("bytes", merged.length);
