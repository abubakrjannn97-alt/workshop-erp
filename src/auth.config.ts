import type { NextAuthConfig } from "next-auth";
import type { PermissionCode } from "@core/rbac/permissions";
import { isAuthBypassEnabled, assertSafeProductionEnv } from "@core/shared/env-guard";

assertSafeProductionEnv();

export const authConfig = {
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 12,
  },
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      if (isAuthBypassEnabled()) return true;
      const { pathname } = request.nextUrl;
      // Login must stay reachable; server page redirects when session is valid.
      if (pathname.startsWith("/login")) return true;
      return Boolean(auth?.user);
    },
    jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.roleCode = user.roleCode;
        token.roleName = user.roleName;
        token.permissions = user.permissions;
        token.name = user.name;
        token.email = user.email;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.sub ?? "";
      session.user.roleCode = String(token.roleCode ?? "");
      session.user.roleName = String(token.roleName ?? "");
      session.user.permissions = (token.permissions as PermissionCode[]) ?? [];
      session.user.name = token.name ?? "";
      session.user.email = token.email ?? "";
      return session;
    },
  },
} satisfies NextAuthConfig;
