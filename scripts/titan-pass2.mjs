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

const replacements = [
  [/text-slate-600/g, "text-[var(--text-muted)]"],
  [/text-slate-500/g, "text-[var(--muted)]"],
  [/text-slate-400/g, "text-[var(--muted)]"],
  [/bg-slate-50/g, "bg-[var(--surface-muted)]"],
  [/border-slate-200/g, "border-[var(--border)]"],
  [/divide-slate-100/g, "divide-[var(--border)]"],
  [/disabled:bg-slate-50/g, "disabled:bg-[var(--surface-muted)]"],
  [/rounded-2xl border border-\[var\(--line\)\] bg-white/g, "ui-card"],
  [/rounded-2xl border border-amber-200 bg-amber-50/g, "rounded-[var(--radius-md)] border border-[var(--warning)]/40 bg-[var(--warning)]/10"],
  [/bg-amber-50/g, "bg-[var(--warning)]/10"],
  [/text-red-800/g, "text-[var(--danger)]"],
  [/text-red-700/g, "text-[var(--danger)]"],
  [/border-red-200/g, "border-[var(--danger)]/30"],
  [/bg-red-800/g, "bg-[var(--danger)]"],
  [/hover:bg-red-50/g, "hover:bg-[var(--danger)]/10"],
  [/<p className="text-xs text-\[var\(--muted\)\]">TZ §44 — что реально приносит деньги<\/p>\s*/g, ""],
];

let n = 0;
for (const f of walk("src")) {
  let s = fs.readFileSync(f, "utf8");
  const o = s;
  for (const [re, to] of replacements) s = s.replace(re, to);
  if (s !== o) {
    fs.writeFileSync(f, s);
    n++;
    console.log("updated", f);
  }
}
console.log("files", n);
