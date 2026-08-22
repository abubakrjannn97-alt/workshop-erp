import fs from "fs";

for (const f of [".env.production.local", ".env.local", ".env"]) {
  if (!fs.existsSync(f)) continue;
  for (const line of fs.readFileSync(f, "utf8").split(/\r?\n/)) {
    if (!line.startsWith("DATABASE_URL=")) continue;
    let v = line.slice("DATABASE_URL=".length).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    const m = v.match(/@([^/:?]+)/);
    console.log(`${f}: host=${m?.[1] ?? "?"} len=${v.length} prisma=${v.includes("prisma")}`);
  }
}
