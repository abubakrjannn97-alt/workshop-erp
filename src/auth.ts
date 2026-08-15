import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";
import { authConfig } from "@/auth.config";
import { bypassOwnerSession, isAuthBypass } from "@/lib/dev-auth";
import { resolveUserPermissions } from "@/lib/permissions";
import { isValidPhone, normalizePhone } from "@/lib/phone";

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
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        phone: { label: "Phone", type: "tel" },
        pin: { label: "PIN", type: "password" },
      },
      async authorize(credentials) {
        const phoneRaw = String(credentials?.phone ?? "").trim();
        const pin = String(credentials?.pin ?? "").trim();

        if (phoneRaw && pin) {
          if (!isValidPhone(phoneRaw)) return null;
          const phone = normalizePhone(phoneRaw);

          const user = await prisma.user.findFirst({
            where: { phone, archivedAt: null, isActive: true },
            include: userInclude,
          });
          if (!user) return null;

          const valid = await bcrypt.compare(pin, user.passwordHash);
          if (!valid) return null;

          return loadAuthUser(user);
        }

        const email = String(credentials?.email ?? "")
          .trim()
          .toLowerCase();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({
          where: { email },
          include: userInclude,
        });

        if (!user || user.archivedAt || !user.isActive) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

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
