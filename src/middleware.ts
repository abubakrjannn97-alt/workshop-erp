import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  matcher: [
    "/((?!api/auth|api/health|api/admin/wipe-test-data|api/admin/bootstrap|api/admin/reseed-catalog|api/admin/ensure-schema|api/locale|_next|favicon.ico|sw.js|offline.html|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|html)$).*)",
  ],
};
