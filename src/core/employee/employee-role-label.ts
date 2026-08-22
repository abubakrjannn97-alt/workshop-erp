import { hasPermission } from "@core/rbac/permissions";
import { hasWorkerShell } from "@core/worker/worker-shell";

type EmployeeRoleUser = {
  role: { code: string; name: string };
  payScheme: { kind: string } | null;
  permissions?: { permission: { code: string } }[];
};

export function resolveEmployeeRoleLabel(
  user: EmployeeRoleUser,
  labels: {
    roleName: (code: string, fallback: string) => string;
    salesManager: string;
    workshopWorker: string;
  },
): string {
  const roleCode = user.role.code;
  if (roleCode !== "employee") {
    return labels.roleName(roleCode, user.role.name);
  }

  const permissions = user.permissions?.map((row) => row.permission.code) ?? [];

  if (
    hasPermission(permissions, roleCode, "crm.view") ||
    hasPermission(permissions, roleCode, "orders.view")
  ) {
    return labels.salesManager;
  }

  if (hasWorkerShell(roleCode, permissions)) {
    return labels.workshopWorker;
  }

  if (user.payScheme?.kind === "SALES_COMMISSION") {
    return labels.salesManager;
  }

  if (user.payScheme?.kind === "PRODUCTION_PIECE") {
    return labels.workshopWorker;
  }

  return labels.roleName(roleCode, user.role.name);
}
