import fs from "fs";

for (const f of [".env.production.local", ".env.local", ".env"]) {
  if (!fs.existsSync(f)) continue;
  console.log(`--- ${f}`);
  for (const line of fs.readFileSync(f, "utf8").split(/\r?\n/)) {
    if (!line.startsWith("OWNER_") && !line.startsWith("DATABASE_URL")) continue;
    const i = line.indexOf("=");
    const k = line.slice(0, i);
    let v = line.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (k.includes("PASSWORD")) console.log(`${k}: len=${v.length}`);
    else if (k.includes("PHONE")) console.log(`${k}=${v}`);
    else console.log(`${k} host=${v.match(/@([^/:?]+)/)?.[1] ?? "?"}`);
  }
}
