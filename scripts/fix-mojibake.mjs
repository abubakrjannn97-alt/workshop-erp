import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const root = path.resolve("src");
const bad = [];

function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === ".next") continue;
      walk(p);
    } else if (/\.(tsx|ts|jsx|js|css)$/.test(e.name)) {
      const c = fs.readFileSync(p, "utf8");
      // Double-encoded UTF-8 Cyrillic typically starts with U+0420 (Р)
      // followed by another Cyrillic letter that should have been a byte.
      if (/Р[А-Яа-яЁё]{2,}/.test(c) || c.includes("в„–") || c.includes("вЂ”")) {
        bad.push(p);
      }
    }
  }
}

walk(root);
console.log("Corrupted files:", bad.length);
for (const f of bad) console.log(f);

const replacements = [
  [/bg-teal-800/g, "bg-[var(--titan-dark)]"],
  [/text-teal-800/g, "text-[var(--titan-dark)]"],
  [/hover:border-teal-700/g, "hover:border-[var(--titan)]"],
  [/ring-teal-700/g, "ring-[var(--titan-2)]"],
  [/border-teal-700/g, "border-[var(--titan)]"],
  [/text-teal-700/g, "text-[var(--titan-2)]"],
  [/bg-teal-700/g, "bg-[var(--titan-2)]"],
  [/hover:bg-teal-700/g, "hover:bg-[var(--titan-2)]"],
  [/hover:bg-teal-900/g, "hover:bg-[var(--foreground)]"],
  [/focus:ring-teal-700/g, "focus:ring-[var(--titan-2)]"],
];

for (const abs of bad) {
  const rel = path.relative(process.cwd(), abs).replace(/\\/g, "/");
  try {
    execSync(`git checkout HEAD -- "${rel}"`, { stdio: "pipe" });
  } catch (e) {
    console.error("checkout failed", rel, e.message);
    continue;
  }
  let c = fs.readFileSync(abs, "utf8");
  for (const [re, to] of replacements) c = c.replace(re, to);
  fs.writeFileSync(abs, c, "utf8");
  console.log("restored+retinted", rel);
}
