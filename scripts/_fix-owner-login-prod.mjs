import fs from "fs";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

function parseEnv(path) {
  const o = {};
  if (!fs.existsSync(path)) return o;
  for (const line of fs.readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    o[m[1]] = v;
  }
  return o;
}

function isPgUrl(u) {
  return typeof u === "string" && /^(postgres|postgresql):\/\//i.test(u);
}

const pulled = parseEnv(".env.prod.pull");
const vercel = parseEnv(".env.vercel");
const local = parseEnv(".env");

const dbUrl = [pulled.DATABASE_URL, pulled.DIRECT_URL, vercel.DATABASE_URL, vercel.DIRECT_URL].find(isPgUrl);
const ownerEmail = pulled.OWNER_EMAIL || vercel.OWNER_EMAIL || "owner@workshop.local";
const ownerPhone = (local.OWNER_PHONE || "900000001").replace(/\D/g, "").slice(-12);
const ownerPassword = pulled.OWNER_PASSWORD || vercel.OWNER_PASSWORD;
const authUrl = pulled.AUTH_URL || vercel.AUTH_URL || "https://workshop-erp-zeta.vercel.app";

if (!dbUrl) {
  console.error("NO_PG_URL");
  process.exit(1);
}
if (!ownerPassword) {
  console.error("NO_OWNER_PASSWORD");
  process.exit(1);
}

console.log(
  JSON.stringify({
    authUrl,
    ownerEmail,
    ownerPhone,
    passLen: ownerPassword.length,
    dbProto: dbUrl.slice(0, dbUrl.indexOf("://")),
  }),
);

process.env.DATABASE_URL = dbUrl;
const prisma = new PrismaClient();

const before = await prisma.user.findUnique({
  where: { email: ownerEmail },
  select: { id: true, email: true, phone: true, isActive: true, passwordHash: true },
});

if (!before) {
  console.error("OWNER_NOT_FOUND", ownerEmail);
  await prisma.$disconnect();
  process.exit(1);
}

const matchedOld = {
  password1: await bcrypt.compare("1", before.passwordHash),
  vercelPassword: await bcrypt.compare(ownerPassword, before.passwordHash),
};

const passwordHash = await bcrypt.hash(ownerPassword, 12);
const after = await prisma.user.update({
  where: { email: ownerEmail },
  data: {
    phone: ownerPhone,
    passwordHash,
    isActive: true,
    archivedAt: null,
  },
  select: { id: true, email: true, phone: true, isActive: true },
});

const verify = await bcrypt.compare(ownerPassword, passwordHash);

console.log(
  "OWNER_UPDATED",
  JSON.stringify({
    beforePhone: before.phone,
    afterPhone: after.phone,
    isActive: after.isActive,
    matchedOld,
    newHashOk: verify,
  }),
);

fs.mkdirSync(".data", { recursive: true });
fs.writeFileSync(
  ".data/owner-login-report.txt",
  [
    "# Owner login — production",
    "Generated: " + new Date().toISOString(),
    "URL: " + authUrl,
    "Phone: " + after.phone,
    "Password: " + ownerPassword,
    "Email (internal only): " + after.email,
    "",
    "Use phone + password on /login",
    "",
  ].join("\n"),
  "utf8",
);
console.log("REPORT_WRITTEN");

await prisma.$disconnect();
