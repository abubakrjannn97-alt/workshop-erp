import type { NextAuthConfig } from "next-auth";
import type { PermissionCode } from "@/lib/permissions";

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
      const isLoggedIn = Boolean(auth?.user);
      const { pathname } = request.nextUrl;
      if (pathname.startsWith("/login")) {
        return isLoggedIn ? Response.redirect(new URL("/", request.nextUrl)) : true;
      }
      return isLoggedIn;
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
