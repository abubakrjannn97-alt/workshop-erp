import { handlers } from "@/auth";
import { headers } from "next/headers";
import { rateLimit } from "@core/shared/rate-limit";
import { setLoginRequestIp } from "@/lib/login-context";

function clientIp(h: Headers) {
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

async function guardAuthPost(req: Request) {
  const h = await headers();
  const ip = clientIp(h);
  setLoginRequestIp(ip);
  const limited = rateLimit(`login-ip:${ip}`, 10, 60 * 1000);
  if (!limited.ok) {
    return new Response("Too Many Requests", { status: 429 });
  }
  return handlers.POST(req);
}

export const GET = handlers.GET;
export const POST = guardAuthPost;
