const base = "https://workshop-erp-zeta.vercel.app";
const passwords = ["1", "Workshop2026!", "ChangeMeNow!"];

async function tryLogin(password) {
  const csrfRes = await fetch(`${base}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();
  const jar = new Map();
  for (const c of csrfRes.headers.getSetCookie?.() ?? []) {
    const [kv] = c.split(";");
    const i = kv.indexOf("=");
    jar.set(kv.slice(0, i), kv.slice(i + 1));
  }
  const body = new URLSearchParams({
    csrfToken,
    phone: "+992900000001",
    password,
    callbackUrl: `${base}/`,
    json: "true",
  });
  const cookie = [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  const res = await fetch(`${base}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookie,
    },
    body,
    redirect: "manual",
  });
  const cookies = res.headers.getSetCookie?.() ?? [];
  const ok = cookies.some((c) => c.includes("session-token"));
  return { password, status: res.status, ok, location: res.headers.get("location") };
}

for (const p of passwords) {
  const r = await tryLogin(p);
  console.log(JSON.stringify({ passLen: p.length, ok: r.ok, status: r.status, location: r.location }));
}
