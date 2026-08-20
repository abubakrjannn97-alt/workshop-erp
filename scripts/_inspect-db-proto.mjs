import fs from "fs";

function parseEnv(path) {
  const o = {};
  if (!fs.existsSync(path)) return o;
  for (const line of fs.readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    o[m[1]] = v;
  }
  return o;
}

function proto(u) {
  if (!u) return null;
  const i = u.indexOf("://");
  return i > 0 ? u.slice(0, i) : "no-proto";
}

const prod = parseEnv(".env.production.local");
const vercel = parseEnv(".env.vercel");
console.log(
  JSON.stringify(
    {
      prodDbProto: proto(prod.DATABASE_URL),
      prodDbLen: (prod.DATABASE_URL || "").length,
      prodDirectProto: proto(prod.DIRECT_URL),
      vercelDbProto: proto(vercel.DATABASE_URL),
      vercelDbLen: (vercel.DATABASE_URL || "").length,
      vercelDirectProto: proto(vercel.DIRECT_URL),
      sameDb: prod.DATABASE_URL === vercel.DATABASE_URL,
    },
    null,
    2,
  ),
);
