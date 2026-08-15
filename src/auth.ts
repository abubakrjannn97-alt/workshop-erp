import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";
import { authConfig } from "@/auth.config";
import { bypassOwnerSession, isAuthBypass } from "@/lib/dev-auth";

const nextAuth = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "")
          .trim()
          .toLowerCase();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({
          where: { email },
          include: {
            role: {
              include: {
                permissions: { include: { permission: true } },
              },
            },
          },
        });

        if (!user || user.archivedAt || !user.isActive) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

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
          permissions: user.role.permissions.map((rp) => rp.permission.code),
        };
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
