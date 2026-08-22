import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";
import { hasWorkerShell, workerShellAllowsPath } from "@core/worker/worker-shell";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const user = req.auth?.user;
  if (user?.roleCode && user.permissions) {
    const roleCode = user.roleCode;
    const permissions = user.permissions as string[];
    if (hasWorkerShell(roleCode, permissions)) {
      const { pathname } = req.nextUrl;
      if (!workerShellAllowsPath(pathname)) {
        return NextResponse.redirect(new URL("/me", req.url));
      }
    }
  }
  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api/auth|api/health|api/admin/wipe-test-data|api/admin/bootstrap|api/admin/reseed-catalog|api/admin/ensure-schema|api/locale|_next|favicon.ico|sw.js|offline.html|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|html)$).*)",
  ],
};
