import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@core/infrastructure/prisma";
import { writeAudit } from "@core/control/audit";
import { authConfig } from "@/auth.config";
import { bypassOwnerSession, isAuthBypass } from "@core/auth/dev-auth";
import { loadLiveAuthFields } from "@core/auth/load-live-auth";
import { resolveUserPermissions } from "@core/rbac/permissions";
import { isValidPhone, normalizePhone } from "@core/shared/phone";
import {
  assertLoginAllowed,
  recordLoginFailure,
  recordLoginSuccess,
} from "@core/auth/login-guard";
import { takeLoginRequestIp } from "@core/auth/login-context";

const userInclude = {
  role: {
    include: {
      permissions: { include: { permission: true } },
    },
  },
  permissions: { include: { permission: true } },
} as const;

async function loadAuthUser(user: {
  id: string;
  email: string;
  name: string;
  role: { code: string; name: string; permissions: { permission: { code: string } }[] };
  permissions?: { permission: { code: string } }[];
}) {
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    roleCode: user.role.code,
    roleName: user.role.name,
    permissions: resolveUserPermissions(user),
  };
}

const nextAuth = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.name = user.name;
        token.email = user.email;
      }
      if (!token.sub) return token;
      const live = await loadLiveAuthFields(token.sub);
      token.roleCode = live.roleCode;
      token.roleName = live.roleName;
      token.permissions = live.permissions;
      token.name = live.name || token.name;
      token.email = live.email || token.email;
      return token;
    },
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        phone: { label: "Phone", type: "tel" },
      },
      async authorize(credentials) {
        const ip = takeLoginRequestIp();
        const phoneRaw = String(credentials?.phone ?? "").trim();
        const phonePassword = String(credentials?.password ?? "").trim();

        if (phoneRaw && phonePassword) {
          if (!isValidPhone(phoneRaw)) return null;
          const phone = normalizePhone(phoneRaw);
          const guard = assertLoginAllowed(ip, phone);
          if (!guard.ok) return null;

          const user = await prisma.user.findFirst({
            where: { phone, archivedAt: null, isActive: true },
            include: userInclude,
          });
          if (!user) {
            await recordLoginFailure(ip, phone);
            return null;
          }

          const valid = await bcrypt.compare(phonePassword, user.passwordHash);
          if (!valid) {
            await recordLoginFailure(ip, phone);
            return null;
          }

          recordLoginSuccess(phone);
          return loadAuthUser(user);
        }

        // Email path kept for demo quick-login / e2e only.
        const email = String(credentials?.email ?? "")
          .trim()
          .toLowerCase();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        const guard = assertLoginAllowed(ip, email);
        if (!guard.ok) return null;

        const user = await prisma.user.findUnique({
          where: { email },
          include: userInclude,
        });

        if (!user || user.archivedAt || !user.isActive) {
          await recordLoginFailure(ip, email);
          return null;
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
          await recordLoginFailure(ip, email);
          return null;
        }

        recordLoginSuccess(email);
        return loadAuthUser(user);
      },
    }),
  ],
  events: {
    async signIn({ user }) {
      if (!user.id) return;
      await writeAudit({
        userId: user.id,
        action: "auth.sign_in",
        entityType: "user",
        entityId: user.id,
        newValue: { email: user.email },
      });
    },
  },
});

export const { handlers, signIn, signOut } = nextAuth;

export async function auth() {
  const session = await nextAuth.auth();
  if (session?.user) {
    return session;
  }
  if (isAuthBypass()) {
    return bypassOwnerSession();
  }
  return session;
}
