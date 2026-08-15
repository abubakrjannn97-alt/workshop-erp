import fs from "fs";
import path from "path";

const markers = ["Р—Р°", "РџСЂ", "РЎС‚", "РљР»", "в„–", "вЂ”", "РќРѕРІ"];
const bad = [];

function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) {
      if (["node_modules", ".next", ".data"].includes(e.name)) continue;
      walk(p);
    } else if (/\.(tsx|ts)$/.test(e.name)) {
      const c = fs.readFileSync(p, "utf8");
      if (markers.some((m) => c.includes(m))) bad.push(p);
    }
  }
}
walk("src");
console.log(bad.length ? bad.join("\n") : "none");

const tealFiles = [];
function walk2(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) {
      if (["node_modules", ".next"].includes(e.name)) continue;
      walk2(p);
    } else if (/\.(tsx|ts)$/.test(e.name)) {
      let c = fs.readFileSync(p, "utf8");
      if (!/teal-\d/.test(c)) continue;
      tealFiles.push(p);
      c = c
        .replace(/bg-teal-800/g, "bg-[var(--titan-dark)]")
        .replace(/text-teal-800/g, "text-[var(--titan-dark)]")
        .replace(/hover:bg-teal-900/g, "hover:bg-[var(--foreground)]")
        .replace(/hover:bg-teal-700/g, "hover:bg-[var(--titan-2)]")
        .replace(/bg-teal-700/g, "bg-[var(--titan-2)]")
        .replace(/text-teal-700/g, "text-[var(--titan-2)]")
        .replace(/hover:border-teal-700/g, "hover:border-[var(--titan)]")
        .replace(/border-teal-700/g, "border-[var(--titan)]")
        .replace(/ring-teal-700/g, "ring-[var(--titan-2)]")
        .replace(/focus:ring-teal-\d+/g, "focus:ring-[var(--titan-2)]")
        .replace(/teal-\d+/g, "[var(--titan-dark)]");
      fs.writeFileSync(p, c, "utf8");
    }
  }
}
walk2("src");
console.log("fixed teal", tealFiles);
