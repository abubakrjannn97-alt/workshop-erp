import { writeFileSync } from "fs";

const base = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const routes = [
  "/",
  "/products",
  "/materials",
  "/sales",
  "/crm",
  "/orders",
  "/orders/new",
  "/orders/quick",
  "/production",
  "/warehouse",
  "/warehouse/finished",
  "/warehouse/movements",
  "/purchasing",
  "/finance",
  "/finance/expenses",
  "/employees",
  "/analytics",
  "/notifications",
  "/settings",
  "/settings/users",
  "/settings/roles",
  "/settings/units",
  "/settings/audit",
  "/settings/approvals",
  "/settings/backups",
  "/search",
  "/more",
  "/me",
];

async function login() {
  const csrfRes = await fetch(`${base}/api/auth/csrf`);
  const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };
  const cookies = csrfRes.headers.getSetCookie?.() ?? [];
  const cookieJar = new Map<string, string>();
  for (const c of cookies) {
    const [kv] = c.split(";");
    const i = kv.indexOf("=");
    cookieJar.set(kv.slice(0, i), kv.slice(i + 1));
  }
  const usePhone = process.env.SMOKE_USE_PHONE === "1" || base.includes("vercel.app");
  const body = new URLSearchParams({
    csrfToken,
    password: process.env.OWNER_PASSWORD ?? "ChangeMeNow!",
    callbackUrl: `${base}/`,
    json: "true",
    ...(usePhone
      ? { phone: process.env.OWNER_PHONE ?? "+992900000001" }
      : { email: process.env.OWNER_EMAIL ?? "owner@workshop.local" }),
  });
  const cookieHeader = [...cookieJar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  const res = await fetch(`${base}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookieHeader,
    },
    body,
    redirect: "manual",
  });
  if (res.status >= 300 && res.headers.get("location")?.includes("error=Configuration")) {
    throw new Error("Auth Configuration error — check AUTH_SECRET (min 32 chars) and AUTH_URL on server.");
  }
  for (const c of res.headers.getSetCookie?.() ?? []) {
    const [kv] = c.split(";");
    const i = kv.indexOf("=");
    cookieJar.set(kv.slice(0, i), kv.slice(i + 1));
  }
  const session = [...cookieJar.keys()].some((k) => k.includes("session-token"));
  if (!session) {
    throw new Error(`Login failed (HTTP ${res.status}, location=${res.headers.get("location") ?? "none"})`);
  }
  return [...cookieJar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

async function main() {
  const cookie = await login();
  const rows: { path: string; status: number; error?: string }[] = [];
  for (const path of routes) {
    try {
      const res = await fetch(`${base}${path}`, {
        headers: { Cookie: cookie },
        redirect: "manual",
      });
      let error: string | undefined;
      if (res.status >= 400) {
        const text = await res.text();
        error = text.slice(0, 200).replace(/\s+/g, " ");
      } else if (res.status >= 300) {
        error = `redirect ${res.headers.get("location")}`;
      } else {
        const text = await res.text();
        if (/Application error|Internal Server Error|Unhandled Runtime Error|digest=|error\.generic|Хатои ногаҳонӣ/i.test(text)) {
          error = "page contains error markup";
        }
      }
      rows.push({ path, status: res.status, error });
      console.log(res.status, path, error ?? "ok");
    } catch (e) {
      rows.push({ path, status: 0, error: String(e) });
      console.log("ERR", path, e);
    }
  }
  const bad = rows.filter((r) => r.status !== 200 || r.error);
  writeFileSync("scripts/smoke-http-report.json", JSON.stringify({ ok: bad.length === 0, rows }, null, 2));
  console.log("\nbad=", bad.length);
  if (bad.length) process.exitCode = 1;
}

main();
