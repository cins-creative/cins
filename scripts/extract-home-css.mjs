import fs from "fs";

const s = fs.readFileSync("public/cins-home-v2.html", "utf8");
const start = s.indexOf("<style>");
const end = s.indexOf("</style>");
if (start === -1 || end === -1) throw new Error("no style block");
let css = s.slice(start + 7, end);
css = css.replace(/^body\{/m, ".cins-home-v2-page{");
css = css.replace(
  "@media (min-width:961px){body{padding-left:64px}}",
  "@media (min-width:961px){.cins-home-v2-page{padding-left:64px}}",
);
fs.writeFileSync("app/cins-home-v2-page.css", css);
console.log("ok", css.length);
