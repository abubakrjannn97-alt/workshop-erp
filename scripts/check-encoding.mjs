import fs from "fs";

function check(p) {
  const c = fs.readFileSync(p, "utf8");
  const hasZakazy = c.includes("Заказы");
  const hasMojibake = /Р—Р°РєР°Р·/.test(c);
  console.log(p, { hasZakazy, hasMojibake, len: c.length });
}

for (const p of [
  "src/app/(app)/orders/page.tsx",
  "src/lib/i18n.ts",
  "src/components/language-switcher.tsx",
  "src/lib/finance.ts",
  "src/lib/stock.ts",
]) {
  if (!fs.existsSync(p)) {
    console.log(p, "MISSING");
    continue;
  }
  check(p);
}

// remaining teal
import path from "path";
function walk(d, out = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === ".next") continue;
      walk(p, out);
    } else if (/\.(tsx|ts)$/.test(e.name)) {
      const c = fs.readFileSync(p, "utf8");
      if (/teal-\d/.test(c)) out.push(p);
    }
  }
  return out;
}
console.log("teal", walk("src"));
