import type { PermissionCode } from "@/lib/permissions";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    roleCode: string;
    roleName: string;
    permissions: PermissionCode[] | string[];
  }

  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      roleCode: string;
      roleName: string;
      permissions: PermissionCode[] | string[];
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    roleCode?: string;
    roleName?: string;
    permissions?: string[];
  }
}
