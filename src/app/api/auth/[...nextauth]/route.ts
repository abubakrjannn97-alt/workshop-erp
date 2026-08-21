import { handlers } from "@/auth";
import { headers } from "next/headers";
import { setLoginRequestIp } from "@core/auth/login-context";

function clientIp(h: Headers) {
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

async function guardAuthPost(req: Request) {
  const h = await headers();
  const ip = clientIp(h);
  setLoginRequestIp(ip);
  return handlers.POST(req);
}

export const GET = handlers.GET;
export const POST = guardAuthPost;
