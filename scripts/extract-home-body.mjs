import fs from "fs";

const s = fs.readFileSync("public/cins-home-v2.html", "utf8");
const bodyStart = s.indexOf("<body>");
const scriptStart = s.indexOf("<script>", s.indexOf("</footer>"));
if (bodyStart === -1 || scriptStart === -1) throw new Error("parse fail");
const inner = s.slice(bodyStart + 6, scriptStart).trim();
fs.mkdirSync("components/cins/home-v2", { recursive: true });
fs.writeFileSync("components/cins/home-v2/home-v2-body.html", inner);
console.log("ok bytes", inner.length);
