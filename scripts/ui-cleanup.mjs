import fs from "fs";
import path from "path";

function walk(d, acc = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (/\.(tsx|ts|css)$/.test(e.name)) acc.push(p);
  }
  return acc;
}

const files = walk("src");
let n = 0;
const phaseRe =
  /\s*<p className="text-xs font-medium uppercase tracking-\[0\.16em\] text-\[var\(--titan-dark\)\]">PHASE \d+<\/p>\s*/g;

for (const f of files) {
  let s = fs.readFileSync(f, "utf8");
  const o = s;
  s = s.replace(phaseRe, "\n");
  s = s.replace(/text-teal-900/g, "text-[var(--titan-dark)]");
  s = s.replace(/text-teal-800/g, "text-[var(--titan-dark)]");
  s = s.replace(/bg-teal-800/g, "bg-[var(--titan-dark)]");
  s = s.replace(/bg-teal-50/g, "bg-[var(--bg-secondary)]");
  s = s.replace(/hover:text-teal-800/g, "hover:text-[var(--foreground)]");
  s = s.replace(/border-teal-700/g, "border-[var(--titan-2)]");
  if (s !== o) {
    fs.writeFileSync(f, s);
    n++;
    console.log("updated", f);
  }
}
console.log("files", n);
